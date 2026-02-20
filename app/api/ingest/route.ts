import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ingestDocumentSchema } from '@/lib/schema';
import { buildIngestPrompt } from '@/lib/prompts';
import type { IngestDocumentResponse, FieldMapping, ApiError } from '@/lib/types';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiError>({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 });
  }

  // For file uploads, parse as FormData
  const contentType = req.headers.get('content-type') ?? '';
  let body: Record<string, unknown>;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const profileStr = formData.get('companyProfile') as string | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file) {
      return NextResponse.json<ApiError>({ error: 'No file provided.' }, { status: 400 });
    }

    // Extract text based on file type
    let extractedText = '';
    const fileType = file.type;
    const fileName = file.name;

    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      extractedText = await file.text();
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For PDF: use pdf-parse (requires server-side)
      try {
        const { default: pdfParse } = await import('pdf-parse');
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } catch {
        extractedText = '[PDF extraction failed — please paste the text manually]';
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // For DOCX: use mammoth
      try {
        const mammoth = await import('mammoth');
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch {
        extractedText = '[DOCX extraction failed — please paste the text manually]';
      }
    } else {
      extractedText = await file.text();
    }

    body = {
      projectId: projectId ?? '',
      extractedText,
      fileName,
      companyProfile: profileStr ? JSON.parse(profileStr) : {},
    };
  } else {
    body = await req.json();
  }

  const parsed = ingestDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: 'Validation failed', details: parsed.error.issues.map(i => `${i.path}: ${i.message}`).join('; ') },
      { status: 422 }
    );
  }

  const { extractedText, fileName, companyProfile } = parsed.data;
  const prompt = buildIngestPrompt({ extractedText, companyProfile });

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4096,
      system: 'You are a business analyst. Extract field mappings from documents. Return ONLY a valid JSON array. No preamble, no fences. Start with [',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    let rawMappings: Array<{
      moduleKey: string;
      fieldKey: string;
      extractedValue: string;
      confidence: number;
      sourceContext?: string;
    }> = [];

    try {
      rawMappings = JSON.parse(raw);
    } catch {
      return NextResponse.json<ApiError>(
        { error: 'AI returned unparseable response. Try a simpler document or paste text.' },
        { status: 500 }
      );
    }

    const docId = uuidv4();

    // Build FieldMapping objects
    const fieldMappings: FieldMapping[] = rawMappings.map(m => ({
      id: uuidv4(),
      documentId: docId,
      moduleKey: m.moduleKey,
      fieldKey: m.fieldKey,
      extractedValue: m.extractedValue,
      mappedValue: m.extractedValue, // default: accept extracted
      confidence: Math.min(1, Math.max(0, m.confidence ?? 0.5)),
      status: 'pending',
    }));

    // Detect conflicts: same moduleKey+fieldKey with multiple mappings
    const conflicts = detectConflicts(fieldMappings);

    const overallConfidence =
      fieldMappings.length > 0
        ? fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / fieldMappings.length
        : 0;

    const response: IngestDocumentResponse = {
      fieldMappings,
      conflicts,
      overallConfidence,
    };

    return NextResponse.json(response);

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

function detectConflicts(mappings: FieldMapping[]) {
  const grouped = new Map<string, FieldMapping[]>();
  for (const m of mappings) {
    const key = `${m.moduleKey}:${m.fieldKey}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const conflicts = [];
  for (const [, group] of Array.from(grouped)) {
    if (group.length > 1) {
      conflicts.push({
        id: uuidv4(),
        fieldKey: group[0].fieldKey,
        sources: group.map(m => ({
          docId: m.documentId,
          value: m.extractedValue,
          confidence: m.confidence,
        })),
      });
      // Mark all as conflicting
      group.forEach(m => { m.conflictWith = group.filter(o => o.id !== m.id).map(o => o.id); });
    }
  }

  return conflicts;
}
