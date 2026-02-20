import fs from 'fs';
import path from 'path';
import type { ModuleKey, CompanyProfile } from './types';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

function readPrompt(fileName: string): string {
  const filePath = path.join(PROMPTS_DIR, fileName);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
}

// Safely serialize to JSON without risk of prompt injection
function safeJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
    .replace(/\{\{/g, '{ {')   // neutralise any accidental template markers
    .replace(/\}\}/g, '} }');
}

function buildCompanyContext(profile: Partial<CompanyProfile>): string {
  return `
Company: ${profile.companyName ?? 'Not specified'}
Sector: ${profile.sector ?? 'Not specified'} — ${profile.industryType ?? ''}
Stage: ${profile.stage ?? 'Not specified'}
Headcount: ${profile.headcount ?? 'Not specified'} ${profile.headcountNote ?? ''}
Current Revenue: ${profile.revenueCurrent ?? 'Not specified'}
Revenue Target: ${profile.revenueTarget ?? 'Not specified'}
Geographies: ${(profile.geographies ?? []).join(', ') || 'Not specified'}
Planning Year: ${profile.planningYear ?? 'Not specified'}
Currency: ${profile.currency ?? 'INR'}
Org Structure: ${profile.orgStructure ?? 'Not specified'}
Product Lines: ${(profile.productLines ?? []).map(p => p.name).join(', ') || 'Not specified'}
Strategic Bets: ${(profile.strategicBets ?? []).join('; ') || 'Not specified'}
Pain Points: ${profile.painPoints ?? 'Not specified'}
3-Year Aspiration: ${profile.aspiration3yr ?? 'Not specified'}
`.trim();
}

export function buildModulePrompt(params: {
  moduleKey: ModuleKey;
  inputs: Record<string, unknown>;
  upstreamContext: Partial<Record<ModuleKey, string>>;
  companyProfile: Partial<CompanyProfile>;
}): string {
  const { moduleKey, inputs, upstreamContext, companyProfile } = params;

  const masterPrompt = readPrompt('master.txt');
  const modulePrompt = readPrompt(`${moduleKey}_${getModuleSlug(moduleKey)}.txt`);

  const upstreamSections = Object.entries(upstreamContext)
    .filter(([, v]) => v)
    .map(([k, v]) => `\n### Upstream ${k.toUpperCase()} Summary\n${v}`)
    .join('\n');

  return `${masterPrompt}

════════════════════════════════════════
MODULE: ${moduleKey.toUpperCase()} — ${getModuleName(moduleKey)}
════════════════════════════════════════

## COMPANY PROFILE
${buildCompanyContext(companyProfile)}

## MODULE-SPECIFIC INPUTS
${safeJSON(inputs)}

## UPSTREAM MODULE CONTEXT
${upstreamSections || 'No upstream modules completed yet.'}

## MODULE-SPECIFIC INSTRUCTIONS
${modulePrompt}

## OUTPUT INSTRUCTION
Generate the complete ${getModuleName(moduleKey)} now. Return ONLY valid JSON matching the schema defined in the master prompt. Begin immediately.
`;
}

export function buildConflictResolverPrompt(params: {
  fieldName: string;
  valueA: string;
  sourceA: string;
  valueB: string;
  sourceB: string;
  companyProfile: Partial<CompanyProfile>;
}): string {
  const { fieldName, valueA, sourceA, valueB, sourceB, companyProfile } = params;

  const conflictPrompt = readPrompt('conflict_resolver.txt');

  return `${conflictPrompt}

## CONFLICT DETAILS
Field: ${fieldName}
Company: ${companyProfile.companyName ?? 'Unknown'}

Value A (from ${sourceA}):
${valueA}

Value B (from ${sourceB}):
${valueB}

Company Context:
${buildCompanyContext(companyProfile)}

Resolve this conflict now.`;
}

export function buildIngestPrompt(params: {
  extractedText: string;
  companyProfile: Partial<CompanyProfile>;
}): string {
  const { extractedText, companyProfile } = params;

  // Truncate text to avoid token limits (keep first 6000 chars)
  const truncated = extractedText.length > 6000
    ? extractedText.slice(0, 6000) + '\n\n[... text truncated for length ...]'
    : extractedText;

  return `You are a senior business analyst. Your job is to read the following document and extract information that maps to a Business Operating System (BOS) framework.

## Company Context
${buildCompanyContext(companyProfile)}

## BOS Field Categories
Extract any information relevant to these categories:
- purpose_statement, core_values, non_negotiables (Module 1)
- vision_statement, mission_statement, positioning_statement (Module 2)
- strategic_themes, revenue_targets_3yr, key_risks (Module 3)
- annual_goals, priorities, budget_plan (Module 4)
- kpis, metrics, targets (Module 5)
- org_structure, roles, reporting_lines (Module 11)
- sales_targets, pipeline, actuals (Module 10)
- performance_criteria, review_cycles (Module 8)
- variable_pay_structure (Module 9)

## Extracted Document
${truncated}

## Output (JSON only, no preamble)
Return a JSON array of field mappings:
[
  {
    "moduleKey": "m01",
    "fieldKey": "purpose_statement",
    "extractedValue": "exact quote or paraphrase from doc",
    "confidence": 0.85,
    "sourceContext": "brief note on where in doc this came from"
  }
]

Include ONLY fields where you found relevant information. Omit fields not present in the document.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getModuleSlug(key: ModuleKey): string {
  const slugs: Record<ModuleKey, string> = {
    m01: 'purpose_values',
    m02: 'vision_mission',
    m03: 'three_year_plan',
    m04: 'aop',
    m05: 'kpi_framework',
    m06: 'mis_dashboard',
    m07: 'review_system',
    m08: 'pms',
    m09: 'variable_pay',
    m10: 'sales_tracker',
    m11: 'org_chart',
  };
  return slugs[key];
}

function getModuleName(key: ModuleKey): string {
  const names: Record<ModuleKey, string> = {
    m01: 'Purpose & Values',
    m02: 'Vision & Mission',
    m03: '3-Year Strategic Plan',
    m04: '1-Year AOP',
    m05: 'KPI Framework',
    m06: 'MIS Dashboard Blueprint',
    m07: 'Business Review System',
    m08: 'Performance Management Framework',
    m09: 'Variable Pay Framework',
    m10: 'Sales Tracker',
    m11: 'Org Chart + JD Mapping',
  };
  return names[key];
}
