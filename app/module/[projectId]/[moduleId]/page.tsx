'use client';

import { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBOSStore, selectProject } from '@/lib/store';
import { MODULE_META, MODULE_ORDER } from '@/lib/types';
import type { ModuleKey, ModuleSuggestion } from '@/lib/types';
import { buildModuleHTML } from '@/lib/render';
import type { GenerateModuleResponse } from '@/lib/types';

// ─── Module Input forms (simplified — expandable per module) ──────────────────

function GenericInputForm({ moduleKey, inputs, onUpdate }: {
  moduleKey: ModuleKey;
  inputs: Record<string, unknown>;
  onUpdate: (k: string, v: unknown) => void;
}) {
  const fields = getModuleFields(moduleKey);
  return (
    <div className="space-y-4">
      {fields.map(field => (
        <div key={field.key}>
          <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={String(inputs[field.key] ?? '')}
              onChange={e => onUpdate(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows ?? 4}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white shadow-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          ) : (
            <input
              type="text"
              value={String(inputs[field.key] ?? '')}
              onChange={e => onUpdate(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 bg-white shadow-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
          {field.hint && <p className="text-xs text-slate-400 mt-1">{field.hint}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Suggestion Panel ─────────────────────────────────────────────────────────

function SuggestionItem({ suggestion, onAccept, onDismiss }: {
  suggestion: ModuleSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const typeStyle: Record<string, string> = {
    improvement: 'bg-blue-50 border-blue-200 text-blue-800',
    risk:        'bg-red-50 border-red-200 text-red-800',
    gap:         'bg-amber-50 border-amber-200 text-amber-800',
    benchmark:   'bg-purple-50 border-purple-200 text-purple-800',
  };
  const typeLabel: Record<string, string> = {
    improvement: '💡 Improvement',
    risk:        '⚠️ Risk',
    gap:         '🔍 Gap',
    benchmark:   '📊 Benchmark',
  };

  if (suggestion.status !== 'pending') return null;

  return (
    <div className={`rounded-lg border p-3 text-xs ${typeStyle[suggestion.type] ?? 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold">{typeLabel[suggestion.type] ?? suggestion.type}</span>
        <span className="text-slate-400">{suggestion.section}</span>
      </div>
      <p className="mb-2 leading-relaxed">{suggestion.content}</p>
      <div className="flex gap-2">
        <button onClick={onAccept} className="px-2 py-1 bg-white border rounded text-xs font-medium hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 transition-all">✓ Accept</button>
        <button onClick={onDismiss} className="px-2 py-1 bg-white border rounded text-xs font-medium hover:bg-slate-100 transition-all">✕ Dismiss</button>
      </div>
    </div>
  );
}

// ─── Version Selector ─────────────────────────────────────────────────────────

function VersionSelector({ versions, selected, onSelect }: {
  versions: { label: string; createdAt: string }[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Version:</span>
      <div className="flex gap-1">
        {versions.map((v, i) => (
          <button key={i} onClick={() => onSelect(i)}
            className={`px-2 py-1 rounded text-xs font-semibold transition-all
              ${i === selected ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-brand-400'}`}>
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Module Editor Page ──────────────────────────────────────────────────

export default function ModulePage() {
  const { projectId, moduleId } = useParams<{ projectId: string; moduleId: string }>();
  const router = useRouter();
  const moduleKey = moduleId as ModuleKey;

  const project = useBOSStore(selectProject(projectId));
  const store = useBOSStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(-1); // -1 = latest
  const [activeTab, setActiveTab] = useState<'inputs' | 'preview' | 'suggestions'>('inputs');
  const previewRef = useRef<HTMLDivElement>(null);

  if (!project || !MODULE_META[moduleKey]) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Module not found.</p>
          <button onClick={() => router.back()} className="text-brand-600 hover:underline text-sm">← Go Back</button>
        </div>
      </div>
    );
  }

  const meta = MODULE_META[moduleKey];
  const moduleState = project.modules[moduleKey];
  const inputs = (moduleState?.inputs ?? {}) as Record<string, unknown>;
  const versions = moduleState?.versions ?? [];
  const suggestions = moduleState?.suggestions ?? [];
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const displayVersion = selectedVersionIdx >= 0 && selectedVersionIdx < versions.length
    ? versions[selectedVersionIdx]
    : latestVersion;
  const markdown = displayVersion?.contentMarkdown ?? '';

  // Build upstream context (summaries of finalized upstream modules)
  const upstreamContext: Partial<Record<ModuleKey, string>> = {};
  for (const upKey of meta.requiredUpstream) {
    const upModule = project.modules[upKey];
    if (upModule?.versions?.length) {
      const latest = upModule.versions[upModule.versions.length - 1];
      // Pass first 2000 chars as context
      upstreamContext[upKey] = (latest.contentMarkdown ?? '').slice(0, 2000);
    }
  }

  const handleUpdateInput = useCallback((key: string, value: unknown) => {
    store.updateModuleInputs(projectId, moduleKey, { [key]: value });
  }, [store, projectId, moduleKey]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          moduleKey,
          inputs,
          upstreamContext,
          companyProfile: project.profile,
        }),
      });

      const data = await res.json() as (GenerateModuleResponse | { error: string });

      if (!res.ok) {
        setError((data as unknown as { error: string }).error ?? `Server error (${res.status})`);
        return;
      }

      store.saveModuleVersion(projectId, moduleKey, {
        label: versions.length === 0 ? 'v0' : `v${versions.length}`,
        contentMarkdown: data.markdown,
        contentJson: data.contentJson,
        tokensUsed: data.tokensUsed,
      });

      // Add suggestions
      for (const s of (data.suggestions ?? [])) {
        store.addModuleSuggestion(projectId, moduleKey, s);
      }

      // Clear stale
      if (moduleState?.isStale) store.clearStale(projectId, moduleKey);

      setSelectedVersionIdx(-1);
      setActiveTab('preview');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, moduleKey, inputs, upstreamContext, project.profile, store, versions.length, moduleState?.isStale]);

  const handleFinalize = useCallback(() => {
    store.finalizeModule(projectId, moduleKey, Object.keys(inputs));
    router.push(`/dashboard/${projectId}`);
  }, [store, projectId, moduleKey, inputs, router]);

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const handleDownloadMd = useCallback(() => {
    if (!markdown) return;
    const slug = `${project.clientName.replace(/\s+/g, '-').toLowerCase()}-${moduleKey}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${slug}.md` }).click();
    URL.revokeObjectURL(url);
  }, [markdown, project.clientName, moduleKey]);

  const handleDownloadHtml = useCallback(() => {
    if (!markdown) return;
    const html = buildModuleHTML(markdown, project.clientName, meta.title, displayVersion?.label ?? 'v1');
    const slug = `${project.clientName.replace(/\s+/g, '-').toLowerCase()}-${moduleKey}`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${slug}.html` }).click();
    URL.revokeObjectURL(url);
  }, [markdown, project.clientName, meta.title, displayVersion?.label, moduleKey]);

  const handlePrint = useCallback(() => {
    if (!markdown) return;
    const html = buildModuleHTML(markdown, project.clientName, meta.title, displayVersion?.label ?? 'v1');
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Pop-ups blocked. Please allow pop-ups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }, [markdown, project.clientName, meta.title, displayVersion?.label]);

  const hasOutput = markdown.trim().length > 0;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  // Next/prev module navigation
  const currentIdx = MODULE_ORDER.indexOf(moduleKey);
  const prevKey = currentIdx > 0 ? MODULE_ORDER[currentIdx - 1] : null;
  const nextKey = currentIdx < MODULE_ORDER.length - 1 ? MODULE_ORDER[currentIdx + 1] : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
          <Link href={`/dashboard/${projectId}`} className="text-slate-400 hover:text-white text-sm transition-colors flex-shrink-0">
            ← Dashboard
          </Link>
          <span className="text-slate-600 hidden sm:block">|</span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg">{meta.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{meta.title}</div>
              <div className="text-xs text-slate-400 leading-none truncate">{project.clientName}</div>
            </div>
          </div>
          {/* Status badge */}
          <div className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full border
            ${moduleState?.isStale ? 'status-stale' : moduleState?.status === 'finalized' ? 'status-finalized' : moduleState?.status === 'draft' ? 'status-draft' : 'status-in_progress'}`}>
            {moduleState?.isStale ? '⚠️ Stale' : moduleState?.status === 'finalized' ? '✓ Finalized' : moduleState?.status === 'draft' ? 'Draft' : 'In Progress'}
          </div>
        </div>
      </header>

      {/* Sub-toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
        {/* Tab switcher (mobile) */}
        <div className="flex gap-1 lg:hidden">
          {(['inputs', 'preview', 'suggestions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize
                ${activeTab === tab ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab} {tab === 'suggestions' && pendingSuggestions.length > 0 && `(${pendingSuggestions.length})`}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="ml-auto flex flex-wrap gap-2 items-center">
          {versions.length > 0 && (
            <VersionSelector
              versions={versions}
              selected={selectedVersionIdx < 0 ? versions.length - 1 : selectedVersionIdx}
              onSelect={setSelectedVersionIdx}
            />
          )}
          <button onClick={handleCopy} disabled={!hasOutput}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-40 transition-all">
            {copied ? '✓ Copied' : '📋 Copy .md'}
          </button>
          <button onClick={handleDownloadMd} disabled={!hasOutput}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-40 transition-all hidden sm:block">
            ↓ .md
          </button>
          <button onClick={handleDownloadHtml} disabled={!hasOutput}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-40 transition-all hidden sm:block">
            ↓ .html
          </button>
          <button onClick={handlePrint} disabled={!hasOutput}
            className="px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 rounded-md disabled:opacity-40 transition-all">
            🖨️ Print PDF
          </button>
          {hasOutput && moduleState?.status !== 'finalized' && (
            <button onClick={handleFinalize}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-all">
              ✓ Finalize
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Main content — 3 panel layout on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-screen-2xl mx-auto w-full">

        {/* ── LEFT: Inputs ── */}
        <aside className={`w-full lg:w-80 xl:w-96 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto
          ${activeTab !== 'inputs' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Module Inputs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Fill in details to generate a tailored draft.</p>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <GenericInputForm moduleKey={moduleKey} inputs={inputs} onUpdate={handleUpdateInput} />
          </div>
          <div className="p-4 border-t border-slate-100">
            <button onClick={handleGenerate} disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow flex items-center justify-center gap-2 transition-all">
              {loading
                ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>Generating…</>
                : <><span>⚡</span>{versions.length === 0 ? 'Generate Draft' : 'Regenerate'}</>}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">~30–60 seconds · Uses ~4K tokens</p>
          </div>
        </aside>

        {/* ── CENTER: Preview ── */}
        <main ref={previewRef} className={`flex-1 overflow-y-auto bg-slate-50
          ${activeTab !== 'preview' ? 'hidden lg:block' : 'block'}`}>
          {loading ? (
            <div className="p-8 space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full" />
                <span className="text-sm font-medium text-slate-600">Generating {meta.title}…</span>
              </div>
              {[55, 75, 40, 65, 80, 35, 60, 45].map((w, i) => (
                <div key={i} className="shimmer h-4 rounded" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
              <div className="shimmer h-28 rounded mt-4" />
            </div>
          ) : hasOutput ? (
            <div className="p-6 sm:p-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 bos-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ ...props }) => <div className="overflow-x-auto my-3"><table {...props} /></div>,
                  }}>
                  {markdown}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-96">
              <div className="text-4xl mb-4">{meta.icon}</div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">{meta.title}</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Fill in the inputs on the left and click <strong className="text-brand-600">Generate Draft</strong> to create an AI-powered first draft.
              </p>
              {moduleState?.isStale && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 max-w-sm">
                  ⚠️ <strong>This module is stale.</strong> {moduleState.staleReason}. Click Regenerate to refresh.
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT: Suggestions ── */}
        <aside className={`w-full lg:w-72 xl:w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto
          ${activeTab !== 'suggestions' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Claude Suggests</h3>
            {pendingSuggestions.length > 0 && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {pendingSuggestions.length} pending
              </span>
            )}
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Suggestions will appear here after generating a draft.</p>
              </div>
            ) : (
              suggestions.map(s => (
                <SuggestionItem key={s.id} suggestion={s}
                  onAccept={() => store.updateSuggestionStatus(projectId, moduleKey, s.id, 'accepted')}
                  onDismiss={() => store.updateSuggestionStatus(projectId, moduleKey, s.id, 'dismissed')}
                />
              ))
            )}
          </div>

          {/* Consultant tips */}
          <div className="p-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-600 mb-2">💡 Consultant Tip</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{getConsultantTip(moduleKey)}</p>
          </div>
        </aside>
      </div>

      {/* Module navigation */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
        {prevKey
          ? <Link href={`/module/${projectId}/${prevKey}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700 transition-colors">
              ← {MODULE_META[prevKey].icon} {MODULE_META[prevKey].title}
            </Link>
          : <div />}
        <Link href={`/dashboard/${projectId}`} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ⬡ Dashboard
        </Link>
        {nextKey
          ? <Link href={`/module/${projectId}/${nextKey}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700 transition-colors">
              {MODULE_META[nextKey].icon} {MODULE_META[nextKey].title} →
            </Link>
          : <div />}
      </footer>
    </div>
  );
}

// ─── Module field definitions (drives the input form) ────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  required?: boolean;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

function getModuleFields(key: ModuleKey): FieldDef[] {
  const fieldMap: Record<ModuleKey, FieldDef[]> = {
    m01: [
      { key: 'purpose_statement', label: 'Purpose Statement', type: 'textarea', required: true, rows: 3,
        placeholder: 'Why does this company exist beyond making profit? (e.g. "To make healthcare accessible to every Indian household")',
        hint: 'One powerful sentence. Must inspire, not just describe.' },
      { key: 'core_values_raw', label: 'Core Values (list them)', type: 'textarea', rows: 4,
        placeholder: 'e.g.\n1. Customer Obsession — we listen before we speak\n2. Integrity — we do what is right\n3. Excellence — good is never enough',
        hint: '3–6 values. For each, give a name and a one-line description.' },
      { key: 'non_negotiables', label: 'Non-Negotiables (what you will never do)', type: 'textarea', rows: 3,
        placeholder: 'e.g. We will never compromise on data privacy. We will never cut corners on quality.' },
    ],
    m02: [
      { key: 'vision_statement', label: 'Vision Statement', type: 'textarea', required: true, rows: 3,
        placeholder: 'Where do you want to be in 10 years? Make it big, specific, time-bound.',
        hint: 'Think BHAG (Big Hairy Audacious Goal). Should stretch the organisation.' },
      { key: 'mission_statement', label: 'Mission Statement', type: 'textarea', required: true, rows: 3,
        placeholder: 'What do you do, for whom, and how? Keep it to 1–2 sentences.' },
      { key: 'positioning_statement', label: 'Market Positioning', type: 'text',
        placeholder: 'e.g. The only SaaS platform built exclusively for Indian hospital chains' },
    ],
    m03: [
      { key: 'strategic_themes', label: '3-Year Strategic Themes (3–5)', type: 'textarea', required: true, rows: 5,
        placeholder: 'e.g.\n1. Build national distribution network\n2. Enter Tier-2 city markets\n3. Launch second product line',
        hint: 'Each theme should represent a major bet. Don\'t list too many — pick the ones that matter.' },
      { key: 'revenue_3yr', label: 'Revenue Targets (Year 1 / 2 / 3)', type: 'text', required: true,
        placeholder: 'e.g. ₹80 Cr / ₹130 Cr / ₹200 Cr' },
      { key: 'headcount_3yr', label: 'Headcount Targets (Year 1 / 2 / 3)', type: 'text',
        placeholder: 'e.g. 120 / 180 / 260' },
      { key: 'key_investments', label: 'Key Investments / Bets', type: 'textarea', rows: 3,
        placeholder: 'Technology, new markets, acquisitions, talent, etc.' },
    ],
    m04: [
      { key: 'annual_revenue_goal', label: 'Annual Revenue Goal', type: 'text', required: true,
        placeholder: 'e.g. ₹80 Cr' },
      { key: 'annual_priorities', label: 'Top 4–5 Annual Priorities', type: 'textarea', required: true, rows: 5,
        placeholder: '1. Expand to 3 new cities\n2. Reduce churn below 8%\n3. Launch mobile app\n4. Hire Head of Sales' },
      { key: 'quarterly_milestones', label: 'Key Quarterly Milestones', type: 'textarea', rows: 4,
        placeholder: 'Q1: ...\nQ2: ...\nQ3: ...\nQ4: ...' },
      { key: 'budget_notes', label: 'Budget Notes (optional)', type: 'textarea', rows: 3,
        placeholder: 'Major cost increases, new hires planned, capex, etc.' },
    ],
    m05: [
      { key: 'north_star', label: 'North Star Metric (the ONE metric)', type: 'text', required: true,
        placeholder: 'e.g. Net Revenue Retention, ARR, GMV, EBITDA' },
      { key: 'ceo_kpis', label: 'CEO-Level KPIs (5–7)', type: 'textarea', required: true, rows: 5,
        placeholder: 'Revenue, Gross Margin, Customer Count, NPS, Churn, EBITDA, Headcount' },
      { key: 'dept_kpis', label: 'Department-Level KPIs', type: 'textarea', rows: 6,
        placeholder: 'Sales: pipeline, win rate\nMarketing: CAC, MQLs\nOps: fulfillment rate, NPS\nFinance: burn rate, DSO' },
    ],
    m06: [
      { key: 'ceo_view_metrics', label: 'CEO Dashboard Metrics (top 7)', type: 'textarea', required: true, rows: 4,
        placeholder: 'Revenue vs plan, EBITDA %, Churn, NPS, Headcount, Pipeline, Cash' },
      { key: 'source_systems', label: 'Existing Data Sources / Tools', type: 'text',
        placeholder: 'e.g. Salesforce, Tally, Google Analytics, Zoho' },
      { key: 'refresh_cadence', label: 'Preferred Refresh Cadence', type: 'text',
        placeholder: 'Daily for sales, weekly for ops, monthly for finance' },
    ],
    m07: [
      { key: 'current_meetings', label: 'Current Meeting Cadence (describe)', type: 'textarea', rows: 3,
        placeholder: 'Weekly ops call, monthly leadership meeting... or "we have no structured reviews"' },
      { key: 'key_decisions', label: 'Key Decisions Made Monthly', type: 'textarea', rows: 3,
        placeholder: 'Pricing changes, hiring, customer escalations, budget reallocation...' },
      { key: 'review_attendees', label: 'Who Attends Leadership Reviews', type: 'text',
        placeholder: 'CEO, CFO, Head of Sales, Head of Ops, Head of HR' },
    ],
    m08: [
      { key: 'review_cycle', label: 'Performance Review Cycle', type: 'text', required: true,
        placeholder: 'Annual / Biannual / Quarterly' },
      { key: 'rating_preference', label: 'Rating Scale Preference', type: 'text',
        placeholder: '5-point (recommended) or 3-point or 4-point' },
      { key: 'kpi_behavior_split', label: 'KPI vs Behavior Weightage', type: 'text',
        placeholder: 'e.g. 70% KPIs, 30% behaviors (recommended)' },
      { key: 'roles_to_cover', label: 'Key Roles to Build Scorecards For', type: 'textarea', rows: 3,
        placeholder: 'Sales Manager, Operations Lead, Customer Success Manager...' },
    ],
    m09: [
      { key: 'eligible_bands', label: 'Eligible Employee Bands', type: 'text',
        placeholder: 'e.g. Middle management and above, or All employees' },
      { key: 'vp_pct', label: 'Variable Pay % of CTC (by band)', type: 'text',
        placeholder: 'e.g. Junior 10%, Middle 20%, Senior 30%, Leaders 40%' },
      { key: 'payout_frequency', label: 'Payout Frequency', type: 'text',
        placeholder: 'Annual / Biannual / Quarterly' },
      { key: 'company_gate', label: 'Company Performance Gate', type: 'text',
        placeholder: 'e.g. Company must achieve 80% of revenue target before individual payouts' },
    ],
    m10: [
      { key: 'sales_team_size', label: 'Sales Team Size & Structure', type: 'text',
        placeholder: 'e.g. 8 FTEs — 1 VP, 2 RSMs, 5 AEs across 3 regions' },
      { key: 'annual_sales_target', label: 'Annual Sales Target', type: 'text', required: true,
        placeholder: 'e.g. ₹60 Cr new business + ₹20 Cr renewals' },
      { key: 'pipeline_stages', label: 'Pipeline Stages', type: 'text',
        placeholder: 'Prospect → Qualified → Demo → Proposal → Negotiation → Closed Won' },
      { key: 'forecast_method', label: 'Forecast Method', type: 'text',
        placeholder: 'e.g. Weighted pipeline, historical trend, or commit-forecast model' },
    ],
    m11: [
      { key: 'org_structure_desc', label: 'Describe Your Org Structure', type: 'textarea', required: true, rows: 4,
        placeholder: 'CEO → CFO, COO, CTO, CHRO\nCOO → Head of Sales, Head of Ops, Head of CS\nDescribe key departments and reporting lines' },
      { key: 'key_roles', label: 'Key Roles to Document (JDs)', type: 'textarea', rows: 4,
        placeholder: 'List the roles you most need JDs for:\nSales Manager, Customer Success Lead, Finance Controller...' },
      { key: 'headcount_current', label: 'Current Headcount by Dept', type: 'text',
        placeholder: 'e.g. Sales 12, Ops 20, Tech 35, Finance 5, HR 3' },
      { key: 'open_roles', label: 'Open / Planned Roles (next 12 months)', type: 'text',
        placeholder: 'Head of Marketing, 3× AEs, 2× Engineers' },
    ],
  };
  return fieldMap[key] ?? [];
}

// ─── Consultant tips per module ───────────────────────────────────────────────

function getConsultantTip(key: ModuleKey): string {
  const tips: Record<ModuleKey, string> = {
    m01: 'Values work only when they are specific and observable. "Integrity" is generic — "We tell clients the truth even when it costs us" is memorable. Push for behavioral indicators.',
    m02: 'A vision statement fails if employees can\'t remember it. Test: can you say it without looking? If not, simplify it.',
    m03: '3-year plans fail when they have too many themes. 3 focused bets beaten well is better than 8 initiatives beaten poorly.',
    m04: 'The AOP is only as good as its KPIs. If you can\'t measure it, it\'s a wish, not a plan.',
    m05: 'The North Star metric aligns the whole company. For SaaS it\'s usually NRR or ARR. For D2C, GMV or repeat purchase rate. Choose one and defend it.',
    m06: 'The best MIS is one the CEO actually reads every week. Start with 7 metrics, not 70.',
    m07: 'A meeting system without a "who decides what" framework just creates more meetings. Build decision rights into the agenda.',
    m08: 'The most common PMS failure: KPI scores say 5/5 but the employee is clearly underperforming. Always include a calibration session.',
    m09: 'Variable pay motivates only when the payout is big enough to feel meaningful, the KPIs are clearly in the person\'s control, and the calculation is transparent.',
    m10: 'Forecast accuracy is more valuable than optimism. A 90% accurate forecast at 80% of target beats a wishful 100% forecast every time.',
    m11: 'Org charts become stale fast. Design the JD around the role, not the current person filling it.',
  };
  return tips[key] ?? 'Fill in all required inputs before generating to get the best draft.';
}
