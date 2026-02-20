'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBOSStore, selectProject } from '@/lib/store';
import { MODULE_META, MODULE_ORDER } from '@/lib/types';
import type { ModuleKey, ModuleState } from '@/lib/types';
import { getLockedModules } from '@/lib/dependency-engine';

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(state?: ModuleState | null, locked = false): {
  label: string; dot: string; badge: string;
} {
  if (locked) return { label: 'Locked', dot: 'bg-slate-400', badge: 'status-not_started' };
  if (!state || state.status === 'not_started') return { label: 'Not Started', dot: 'bg-slate-400', badge: 'status-not_started' };
  if (state.isStale) return { label: 'Needs Refresh', dot: 'bg-orange-400', badge: 'status-stale' };
  if (state.status === 'finalized') return { label: 'Finalized', dot: 'bg-emerald-500', badge: 'status-finalized' };
  if (state.status === 'draft') return { label: 'Draft', dot: 'bg-blue-500', badge: 'status-draft' };
  return { label: 'In Progress', dot: 'bg-amber-400', badge: 'status-in_progress' };
}

function ctaLabel(state?: ModuleState | null, locked = false): string {
  if (locked) return 'Locked';
  if (!state || state.status === 'not_started') return 'Start →';
  if (state.isStale) return 'Refresh Draft';
  if (state.status === 'finalized') return 'Review →';
  if (state.status === 'draft') return 'Continue →';
  return 'Continue →';
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 80, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke="#4f46e5" strokeWidth={stroke} fill="none"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="progress-ring__circle" strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em"
        className="text-xs font-bold fill-slate-800" style={{ fontSize: '14px', fontFamily: 'Inter,sans-serif' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ moduleKey, state, locked, projectId }: {
  moduleKey: ModuleKey;
  state?: ModuleState | null;
  locked: boolean;
  projectId: string;
}) {
  const meta = MODULE_META[moduleKey];
  const { label, dot, badge } = statusLabel(state, locked);
  const cta = ctaLabel(state, locked);
  const href = `/module/${projectId}/${moduleKey}`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all group
      ${locked ? 'opacity-60 cursor-not-allowed border-slate-200' : 'hover:border-brand-400 hover:shadow-md border-slate-200 cursor-pointer'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{meta.icon}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${badge}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
            {label}
          </span>
        </div>

        <h3 className="font-bold text-slate-800 text-sm group-hover:text-brand-700 leading-tight">
          {meta.title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>

        {/* Stale warning */}
        {state?.isStale && (
          <div className="mt-2 text-xs text-orange-700 bg-orange-50 rounded-md px-2 py-1.5 border border-orange-200">
            ⚠️ {state.staleReason}
          </div>
        )}

        {/* Completion progress */}
        {!locked && state && state.status !== 'not_started' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Inputs filled</span>
              <span>{state.completionPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1">
              <div className="bg-brand-600 h-1 rounded-full transition-all" style={{ width: `${state.completionPct}%` }} />
            </div>
          </div>
        )}

        {/* Upstream deps */}
        {locked && meta.requiredUpstream.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Requires: {meta.requiredUpstream.map(k => MODULE_META[k].title).join(', ')}
          </p>
        )}

        {/* Versions */}
        {state && state.versions.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {state.versions.length} version{state.versions.length !== 1 ? 's' : ''} · Latest: {state.versions[state.versions.length - 1].label}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-4">
        {locked
          ? <div className="w-full py-2 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-lg border border-slate-200">🔒 Complete upstream modules first</div>
          : (
            <Link href={href}
              className="block w-full py-2 text-center text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-all">
              {cta}
            </Link>
          )}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useBOSStore(selectProject(projectId));

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <p className="text-slate-500 mb-4">Project not found.</p>
        <button onClick={() => router.push('/')} className="text-brand-600 hover:underline text-sm">← Go Home</button>
      </div>
    );
  }

  const modules = project.modules as Partial<Record<ModuleKey, ModuleState>>;
  const locked = getLockedModules(modules);

  const tierGroups: Record<number, ModuleKey[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const key of MODULE_ORDER) {
    const tier = MODULE_META[key].tier;
    tierGroups[tier].push(key);
  }

  const tierLabels = ['Foundation', 'Strategy', 'KPIs & Structure', 'Operations', 'People'];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← All Projects</Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">B</div>
              <div>
                <div className="text-sm font-bold leading-tight">{project.clientName}</div>
                <div className="text-xs text-slate-400 leading-none">BOS Builder</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:block">
              {(project.profile as { planningYear?: string })?.planningYear ?? ''}
            </span>
            <Link href={`/export/${projectId}`}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow transition-all">
              📤 Master Pack Export
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* Overview bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 flex flex-wrap items-center gap-6">
          <ProgressRing pct={project.bosCompletionPct} size={72} stroke={6} />
          <div>
            <h2 className="text-base font-bold text-slate-800">BOS Progress</h2>
            <p className="text-sm text-slate-500">
              {Object.values(modules).filter(m => m?.status === 'finalized').length} / 11 modules finalized
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {Object.values(modules).filter(m => m?.isStale).length} module{Object.values(modules).filter(m => m?.isStale).length !== 1 ? 's' : ''} need refresh
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {[
              { label: 'Finalized', color: 'bg-emerald-500', count: Object.values(modules).filter(m => m?.status === 'finalized').length },
              { label: 'Draft', color: 'bg-blue-500', count: Object.values(modules).filter(m => m?.status === 'draft' && !m?.isStale).length },
              { label: 'Stale', color: 'bg-orange-400', count: Object.values(modules).filter(m => m?.isStale).length },
              { label: 'Not Started', color: 'bg-slate-300', count: Object.values(modules).filter(m => !m || m.status === 'not_started').length },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                {count} {label}
              </div>
            ))}
          </div>
        </div>

        {/* Tier groups */}
        {Object.entries(tierGroups).map(([tier, keys]) => (
          <div key={tier} className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Tier {tier} — {tierLabels[Number(tier) - 1]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {keys.map(key => (
                <ModuleCard
                  key={key}
                  moduleKey={key}
                  state={modules[key]}
                  locked={locked.has(key)}
                  projectId={projectId}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
