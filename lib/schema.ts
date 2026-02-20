import { z } from 'zod';

// ─── Company Profile Schema ───────────────────────────────────────────────────

export const companyProfileSchema = z.object({
  companyName:    z.string().min(2, 'Company name required'),
  sector:         z.string().min(2, 'Sector required'),
  subSector:      z.string().optional(),
  industryType:   z.enum(['B2B_SERVICES', 'D2C_ECOM', 'SAAS', 'MANUFACTURING', 'OTHER']),
  stage:          z.enum(['early', 'growth', 'scaling', 'established']),
  headcount:      z.number().positive().optional(),
  headcountNote:  z.string().optional(),
  revenueCurrent: z.string().optional(),
  revenueTarget:  z.string().optional(),
  marginCurrent:  z.string().optional(),
  geographies:    z.array(z.string()).min(1, 'At least one geography required'),
  orgStructure:   z.enum(['flat', 'functional', 'matrix', 'divisional', 'hybrid']).optional(),
  orgLevels:      z.number().int().min(1).max(10).optional(),
  productLines:   z.array(z.object({
    name:        z.string(),
    revenuePct:  z.number().min(0).max(100),
    description: z.string(),
  })).default([]),
  channels:       z.array(z.string()).default([]),
  keyCustomers:   z.string().optional(),
  revenueStreams:  z.array(z.object({
    name: z.string(),
    type: z.enum(['recurring', 'transactional', 'project', 'other']),
    pct:  z.number().min(0).max(100),
  })).default([]),
  painPoints:     z.string().optional(),
  whatsWorking:   z.string().optional(),
  aspiration3yr:  z.string().optional(),
  strategicBets:  z.array(z.string()).max(5).default([]),
  planningYear:   z.string().min(2),
  currency:       z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'OTHER']),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

// ─── Generate Module Request Schema ──────────────────────────────────────────

export const generateModuleSchema = z.object({
  projectId:       z.string().uuid(),
  moduleKey:       z.enum(['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11']),
  inputs:          z.record(z.unknown()),
  upstreamContext: z.record(z.string()).default({}),
  companyProfile:  companyProfileSchema.partial(),
});

// ─── Ingest Document Schema ───────────────────────────────────────────────────

export const ingestDocumentSchema = z.object({
  projectId:      z.string().uuid(),
  extractedText:  z.string().min(10, 'Extracted text too short'),
  fileName:       z.string(),
  companyProfile: companyProfileSchema.partial(),
});

// ─── Form option constants ────────────────────────────────────────────────────

export const INDUSTRY_OPTIONS = [
  { value: 'B2B_SERVICES',  label: 'B2B Services' },
  { value: 'D2C_ECOM',      label: 'D2C E-Commerce' },
  { value: 'SAAS',          label: 'SaaS / Software' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'OTHER',         label: 'Other' },
] as const;

export const STAGE_OPTIONS = [
  { value: 'early',       label: 'Early-Stage (< 2 yrs)' },
  { value: 'growth',      label: 'Growth (2–5 yrs)' },
  { value: 'scaling',     label: 'Scaling (5–10 yrs)' },
  { value: 'established', label: 'Established (10+ yrs)' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'AED', label: 'AED' },
  { value: 'SGD', label: 'SGD' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const ORG_STRUCTURE_OPTIONS = [
  { value: 'flat',       label: 'Flat' },
  { value: 'functional', label: 'Functional' },
  { value: 'matrix',     label: 'Matrix' },
  { value: 'divisional', label: 'Divisional' },
  { value: 'hybrid',     label: 'Hybrid' },
] as const;
