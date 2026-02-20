import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateModuleSchema } from '@/lib/schema';
import { buildModulePrompt } from '@/lib/prompts';
import type { GenerateModuleResponse, ApiError } from '@/lib/types';

// Simple in-memory rate limit: 10 req/min per IP
const rl = new Map<string, { count: number; reset: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || now > e.reset) { rl.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++; return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRL(ip)) {
    return NextResponse.json<ApiError>(
      { error: 'Rate limit exceeded. Please wait a minute.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json<ApiError>({ error: 'Invalid JSON.' }, { status: 400 }); }

  const parsed = generateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: 'Validation failed', details: parsed.error.issues.map(i => `${i.path}: ${i.message}`).join('; ') },
      { status: 422 }
    );
  }

  const { moduleKey, inputs, upstreamContext, companyProfile } = parsed.data;

  let prompt: string;
  try {
    prompt = buildModulePrompt({ moduleKey, inputs, upstreamContext: upstreamContext as Record<string, string>, companyProfile });
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: 'Failed to build prompt', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiError>({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-5-20251101',
      max_tokens: 8192,
      system: 'You are a senior strategy and finance consultant. Output ONLY the requested JSON. No preamble, no markdown fences, no explanation. Start with {',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // Try to parse as JSON; fall back to treating as markdown
    let result: GenerateModuleResponse;
    try {
      const parsed = JSON.parse(raw);
      result = {
        markdown:    parsed.markdown ?? raw,
        contentJson: parsed,
        suggestions: parsed.suggestions ?? [],
        assumptions: parsed.assumptions ?? [],
        gaps:        parsed.gaps ?? [],
        tokensUsed:  message.usage?.output_tokens,
      };
    } catch {
      // AI returned markdown directly (non-JSON) — wrap it
      result = {
        markdown:    raw,
        suggestions: [],
        assumptions: [],
        gaps:        [],
        tokensUsed:  message.usage?.output_tokens,
      };
    }

    return NextResponse.json<GenerateModuleResponse>(result);

  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json<ApiError>(
        { error: `Anthropic error (${err.status}): ${err.message}` },
        { status: err.status ?? 500 }
      );
    }
    return NextResponse.json<ApiError>(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ message: 'BOS Generate API. Use POST.' }, { status: 405 });
}
