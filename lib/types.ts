// ─────────────────────────────────────────────────────────────────────────────
// BOS Builder — Core Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleKey =
  | 'm01' | 'm02' | 'm03' | 'm04' | 'm05' | 'm06'
  | 'm07' | 'm08' | 'm09' | 'm10' | 'm11';

export type ModuleStatus = 'not_started' | 'in_progress' | 'draft' | 'finalized';
export type IndustryType = 'B2B_SERVICES' | 'D2C_ECOM' | 'SAAS' | 'MANUFACTURING' | 'OTHER';
export type CompanyStage = 'early' | 'growth' | 'scaling' | 'established';
export type OrgStructure = 'flat' | 'functional' | 'matrix' | 'divisional' | 'hybrid';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'OTHER';

// ─── Module metadata ──────────────────────────────────────────────────────────

export interface ModuleMeta {
  key: ModuleKey;
  title: string;
  subtitle: string;
  icon: string;               // emoji
  tier: 1 | 2 | 3 | 4 | 5;  // build order
  requiredUpstream: ModuleKey[];
  outputFormats: ('pdf' | 'docx' | 'xlsx' | 'csv')[];
  estimatedMinutes: number;
}

export const MODULE_META: Record<ModuleKey, ModuleMeta> = {
  m01: {
    key: 'm01', title: 'Purpose & Values', subtitle: 'Why we exist and how we behave',
    icon: '🧭', tier: 1, requiredUpstream: [],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 20,
  },
  m02: {
    key: 'm02', title: 'Vision & Mission', subtitle: 'Where we are going and what we do',
    icon: '🎯', tier: 1, requiredUpstream: ['m01'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 20,
  },
  m03: {
    key: 'm03', title: '3-Year Strategic Plan', subtitle: 'Our medium-term growth blueprint',
    icon: '📐', tier: 2, requiredUpstream: ['m02'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 40,
  },
  m04: {
    key: 'm04', title: '1-Year AOP', subtitle: 'Annual Operating Plan',
    icon: '📅', tier: 2, requiredUpstream: ['m03'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 60,
  },
  m05: {
    key: 'm05', title: 'KPI Framework', subtitle: 'What we measure and how',
    icon: '📊', tier: 3, requiredUpstream: ['m04'],
    outputFormats: ['pdf', 'docx', 'xlsx'], estimatedMinutes: 30,
  },
  m06: {
    key: 'm06', title: 'MIS Dashboard Blueprint', subtitle: 'Management information system design',
    icon: '🖥️', tier: 4, requiredUpstream: ['m05'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 25,
  },
  m07: {
    key: 'm07', title: 'Business Review System', subtitle: 'Meeting cadence & agenda templates',
    icon: '🔄', tier: 4, requiredUpstream: ['m05', 'm06'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 25,
  },
  m08: {
    key: 'm08', title: 'Performance Management', subtitle: 'How we evaluate and develop people',
    icon: '⭐', tier: 5, requiredUpstream: ['m01', 'm05', 'm11'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 45,
  },
  m09: {
    key: 'm09', title: 'Variable Pay Framework', subtitle: 'Pay-for-performance structure',
    icon: '💰', tier: 5, requiredUpstream: ['m05', 'm08'],
    outputFormats: ['pdf', 'docx', 'xlsx'], estimatedMinutes: 30,
  },
  m10: {
    key: 'm10', title: 'Sales Tracker', subtitle: 'Target vs actual + 2-month forecast',
    icon: '📈', tier: 4, requiredUpstream: ['m04', 'm05'],
    outputFormats: ['pdf', 'docx', 'xlsx', 'csv'], estimatedMinutes: 25,
  },
  m11: {
    key: 'm11', title: 'Org Chart + JD Mapping', subtitle: 'Structure, roles, and KPI ownership',
    icon: '🏢', tier: 3, requiredUpstream: ['m05'],
    outputFormats: ['pdf', 'docx'], estimatedMinutes: 45,
  },
};

export const MODULE_ORDER: ModuleKey[] = ['m01','m02','m03','m04','m05','m11','m06','m07','m10','m08','m09'];

// ─── Company Profile ──────────────────────────────────────────────────────────

export interface ProductLine {
  name: string;
  revenuePct: number;
  description: string;
}

export interface RevenueStream {
  name: string;
  type: 'recurring' | 'transactional' | 'project' | 'other';
  pct: number;
}

export interface CompanyProfile {
  companyName: string;
  sector: string;
  subSector?: string;
  industryType: IndustryType;
  stage: CompanyStage;
  headcount?: number;
  headcountNote?: string;
  revenueCurrent?: string;
  revenueTarget?: string;
  marginCurrent?: string;
  geographies: string[];
  orgStructure?: OrgStructure;
  orgLevels?: number;
  productLines: ProductLine[];
  channels: string[];
  keyCustomers?: string;
  revenueStreams: RevenueStream[];
  painPoints?: string;
  whatsWorking?: string;
  aspiration3yr?: string;
  strategicBets: string[];
  planningYear: string;
  currency: Currency;
}

// ─── Module State ─────────────────────────────────────────────────────────────

export interface ModuleVersion {
  id: string;
  label: string;         // v0, v1, v2, vFinal
  contentMarkdown: string;
  contentJson?: Record<string, unknown>;
  tokensUsed?: number;
  createdAt: string;
  createdBy?: string;
  diffFromPrev?: string;
}

export type SuggestionType = 'improvement' | 'risk' | 'gap' | 'benchmark';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export interface ModuleSuggestion {
  id: string;
  type: SuggestionType;
  section: string;
  content: string;
  status: SuggestionStatus;
  createdAt: string;
}

export interface ModuleState {
  key: ModuleKey;
  status: ModuleStatus;
  completionPct: number;
  inputs: Record<string, unknown>;
  versions: ModuleVersion[];
  suggestions: ModuleSuggestion[];
  isStale: boolean;
  staleReason?: string;
  generatedAt?: string;
  finalizedAt?: string;
}

// ─── Document Ingestion ───────────────────────────────────────────────────────

export type FieldMappingStatus = 'pending' | 'accepted' | 'rejected' | 'edited';
export type DocFileType = 'pdf' | 'docx' | 'txt' | 'paste';

export interface FieldMapping {
  id: string;
  documentId: string;
  moduleKey: string;
  fieldKey: string;
  extractedValue: string;
  mappedValue: string;
  confidence: number;   // 0–1
  status: FieldMappingStatus;
  conflictWith?: string[];
}

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileType: DocFileType;
  extractedText?: string;
  extractionStatus: 'pending' | 'complete' | 'failed';
  fieldMappings: FieldMapping[];
  createdAt: string;
}

export interface ConflictLog {
  id: string;
  fieldKey: string;
  sources: { docId: string; value: string; confidence: number }[];
  resolution?: 'chose_a' | 'chose_b' | 'blended' | 'manual';
  resolvedValue?: string;
  resolvedAt?: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  clientName: string;
  profile: Partial<CompanyProfile>;
  modules: Partial<Record<ModuleKey, ModuleState>>;
  documents: UploadedDocument[];
  conflictLogs: ConflictLog[];
  bosCompletionPct: number;
  createdAt: string;
  updatedAt: string;
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface GenerateModuleRequest {
  projectId: string;
  moduleKey: ModuleKey;
  inputs: Record<string, unknown>;
  upstreamContext: Partial<Record<ModuleKey, string>>; // markdown summaries
  companyProfile: Partial<CompanyProfile>;
}

export interface GenerateModuleResponse {
  markdown: string;
  contentJson?: Record<string, unknown>;
  suggestions: Array<{ type: SuggestionType; section: string; content: string }>;
  assumptions: string[];
  gaps: string[];
  tokensUsed?: number;
}

export interface IngestDocumentRequest {
  projectId: string;
  extractedText: string;
  fileName: string;
  companyProfile: Partial<CompanyProfile>;
}

export interface IngestDocumentResponse {
  fieldMappings: FieldMapping[];
  conflicts: ConflictLog[];
  overallConfidence: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
