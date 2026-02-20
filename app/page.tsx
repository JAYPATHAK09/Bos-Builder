'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useBOSStore } from '@/lib/store';
import type { CompanyProfile, IndustryType, CompanyStage, Currency } from '@/lib/types';
import {
  INDUSTRY_OPTIONS, STAGE_OPTIONS, CURRENCY_OPTIONS, ORG_STRUCTURE_OPTIONS,
} from '@/lib/schema';

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Company Basics',      icon: '🏢' },
  { id: 2, title: 'Business Model',      icon: '💼' },
  { id: 3, title: 'Current State',       icon: '📍' },
  { id: 4, title: 'Aspirations',         icon: '🎯' },
  { id: 5, title: 'Review & Create',     icon: '✅' },
];

// ─── Input components (minimal, inline) ──────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white shadow-sm
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${className}`} />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white shadow-sm
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none cursor-pointer">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white shadow-sm
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y" />
  );
}

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT: Partial<CompanyProfile> = {
  companyName: '',
  sector: '',
  industryType: 'SAAS',
  stage: 'growth',
  geographies: ['India'],
  productLines: [],
  channels: [],
  revenueStreams: [],
  strategicBets: ['', '', ''],
  planningYear: 'FY 2025-26',
  currency: 'INR',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { projects, createProject, setActiveProject } = useBOSStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<CompanyProfile>>(DEFAULT);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const set = <K extends keyof CompanyProfile>(key: K, val: CompanyProfile[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const canProceed = () => {
    if (step === 1) return !!(form.companyName && form.sector && form.industryType);
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  };

  const handleCreate = () => {
    setCreating(true);
    const id = createProject(form.companyName ?? 'New Client', form);
    router.push(`/dashboard/${id}`);
  };

  const handleResumeProject = (id: string) => {
    setActiveProject(id);
    router.push(`/dashboard/${id}`);
  };

  // ── Project list (home screen) ──
  if (!showNew) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-lg">
          <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl shadow">B</div>
              <div>
                <h1 className="text-lg font-bold leading-tight">BOS Builder</h1>
                <p className="text-xs text-slate-400 leading-none">Business Operating System Generator</p>
              </div>
            </div>
            <button onClick={() => setShowNew(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center gap-2">
              <span>+</span> New Client Project
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-screen-xl mx-auto px-6 py-8 w-full">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-96 text-center">
              <div className="w-20 h-20 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-6 text-4xl">🏗️</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No Projects Yet</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                Create your first client project to start building a complete Business Operating System.
              </p>
              <button onClick={() => setShowNew(true)}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-lg transition-all">
                Create First Client Project
              </button>
              <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg">
                {[
                  { icon: '📋', label: '11 Interconnected Modules' },
                  { icon: '🤖', label: 'AI-Powered Drafts' },
                  { icon: '📤', label: 'PDF + DOCX Export' },
                ].map(({ icon, label }) => (
                  <div key={label} className="bg-white rounded-xl p-4 border border-slate-200 text-center shadow-sm">
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className="text-xs text-slate-600 font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Client Projects</h2>
                <span className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                  <button key={p.id} onClick={() => handleResumeProject(p.id)}
                    className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-brand-400 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-xl">🏢</div>
                      <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                        {p.bosCompletionPct}% complete
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-brand-700">{p.clientName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {(p.profile as CompanyProfile)?.sector ?? ''} · {(p.profile as CompanyProfile)?.planningYear ?? ''}
                    </p>
                    <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-brand-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${p.bosCompletionPct}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Updated {new Date(p.updatedAt).toLocaleDateString('en-IN')}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ── New project wizard ──
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white transition-colors">
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">B</div>
            <span className="font-bold">New Client Project</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-200 text-slate-500'}`}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.id ? 'text-brand-700' : 'text-slate-400'}`}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{STEPS[step-1].icon} {STEPS[step-1].title}</h2>

            {step === 1 && (
              <div className="space-y-4 mt-4">
                <div><Label required>Company Name</Label>
                  <Input value={form.companyName ?? ''} onChange={v => set('companyName', v)} placeholder="e.g. Acme Industries" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label required>Sector</Label>
                    <Input value={form.sector ?? ''} onChange={v => set('sector', v)} placeholder="e.g. Healthcare IT" /></div>
                  <div><Label required>Business Type</Label>
                    <Select value={form.industryType ?? 'SAAS'} onChange={v => set('industryType', v as IndustryType)} options={INDUSTRY_OPTIONS} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label required>Company Stage</Label>
                    <Select value={form.stage ?? 'growth'} onChange={v => set('stage', v as CompanyStage)} options={STAGE_OPTIONS} /></div>
                  <div><Label>Headcount</Label>
                    <Input value={String(form.headcount ?? '')} onChange={v => set('headcount', Number(v) || undefined)} placeholder="e.g. 120" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label required>Planning Year</Label>
                    <Input value={form.planningYear ?? ''} onChange={v => set('planningYear', v)} placeholder="e.g. FY 2025-26" /></div>
                  <div><Label required>Currency</Label>
                    <Select value={form.currency ?? 'INR'} onChange={v => set('currency', v as Currency)} options={CURRENCY_OPTIONS} /></div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Current Annual Revenue</Label>
                    <Input value={form.revenueCurrent ?? ''} onChange={v => set('revenueCurrent', v)} placeholder="e.g. ₹80 Cr" /></div>
                  <div><Label>Revenue Target</Label>
                    <Input value={form.revenueTarget ?? ''} onChange={v => set('revenueTarget', v)} placeholder="e.g. ₹140 Cr" /></div>
                </div>
                <div><Label>Geographies (comma-separated)</Label>
                  <Input value={(form.geographies ?? []).join(', ')} onChange={v => set('geographies', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="India, UAE, Singapore" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Org Structure</Label>
                    <Select value={form.orgStructure ?? 'functional'} onChange={v => set('orgStructure', v as CompanyProfile['orgStructure'])} options={ORG_STRUCTURE_OPTIONS} /></div>
                  <div><Label>Current Gross Margin</Label>
                    <Input value={form.marginCurrent ?? ''} onChange={v => set('marginCurrent', v)} placeholder="e.g. 42%" /></div>
                </div>
                <div><Label>Key Customers / Target Segments</Label>
                  <Input value={form.keyCustomers ?? ''} onChange={v => set('keyCustomers', v)} placeholder="e.g. Mid-market pharma, 200–2000 employees" /></div>
                <div><Label>Main Sales Channels</Label>
                  <Input value={(form.channels ?? []).join(', ')} onChange={v => set('channels', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Direct sales, Partners, Digital" /></div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 mt-4">
                <div><Label>What Are Your Biggest Pain Points?</Label>
                  <Textarea value={form.painPoints ?? ''} onChange={v => set('painPoints', v)}
                    placeholder="e.g. High churn, no structured sales process, no succession planning, founders doing everything" rows={4} /></div>
                <div><Label>What Is Currently Working Well?</Label>
                  <Textarea value={form.whatsWorking ?? ''} onChange={v => set('whatsWorking', v)}
                    placeholder="e.g. Strong product-market fit, loyal repeat customers, great engineering team" rows={3} /></div>
                <div><Label>Key Baseline Metrics (paste or type)</Label>
                  <Input value={form.subSector ?? ''} onChange={v => set('subSector', v)}
                    placeholder="e.g. Revenue ₹80 Cr, EBITDA 18%, NPS 42, Churn 9%, 120 FTE" /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 mt-4">
                <div><Label>3-Year Aspiration</Label>
                  <Textarea value={form.aspiration3yr ?? ''} onChange={v => set('aspiration3yr', v)}
                    placeholder="e.g. Become the #1 healthcare IT platform in India with ₹500 Cr revenue and 35% EBITDA by FY 2028" rows={3} /></div>
                <div>
                  <Label>Top 3 Strategic Bets for This Year</Label>
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                      <Input key={i}
                        value={(form.strategicBets ?? [])[i] ?? ''}
                        onChange={v => {
                          const bets = [...(form.strategicBets ?? ['', '', ''])];
                          bets[i] = v;
                          set('strategicBets', bets);
                        }}
                        placeholder={`Strategic bet ${i + 1} — e.g. Expand to South India market`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-4">Review your project details. You can update these at any time.</p>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 text-sm">
                  {[
                    ['Company', form.companyName],
                    ['Industry', form.industryType],
                    ['Stage', form.stage],
                    ['Planning Year', form.planningYear],
                    ['Currency', form.currency],
                    ['Revenue', form.revenueCurrent],
                    ['Target', form.revenueTarget],
                    ['Geographies', (form.geographies ?? []).join(', ')],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-4 px-4 py-2.5">
                      <span className="w-28 text-slate-500 font-medium flex-shrink-0">{k}</span>
                      <span className="text-slate-800 font-semibold">{v || <span className="text-slate-400 font-normal italic">Not specified</span>}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <strong>What happens next:</strong> We&apos;ll create your project and take you to the Module Dashboard. You can optionally upload existing documents for AI-assisted field mapping before generating each module.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              {step > 1
                ? <button onClick={() => setStep(s => s - 1)} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">← Previous</button>
                : <div />}
              {step < 5
                ? <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg shadow transition-all">
                    Continue →
                  </button>
                : <button onClick={handleCreate} disabled={creating}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center gap-2">
                    {creating ? <><span className="animate-spin">⟳</span> Creating…</> : '🚀 Create BOS Project'}
                  </button>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
