import type { ModuleKey, ModuleState, ModuleStatus } from './types';

// ─── Dependency Rules ─────────────────────────────────────────────────────────

interface DependencyRule {
  upstream: ModuleKey;
  fields: string[];          // which upstream fields trigger stale
  downstream: ModuleKey;
  reason: string;
}

export const DEPENDENCY_RULES: DependencyRule[] = [
  // M01 → downstream
  { upstream: 'm01', fields: ['core_values'], downstream: 'm08', reason: 'Values updated — PMS behavioral indicators need refresh' },
  { upstream: 'm01', fields: ['core_values'], downstream: 'm09', reason: 'Values updated — Variable Pay gate conditions may change' },
  { upstream: 'm01', fields: ['core_values'], downstream: 'm11', reason: 'Values updated — JD competency tags need refresh' },
  // M02 → downstream
  { upstream: 'm02', fields: ['vision_statement'], downstream: 'm03', reason: 'Vision updated — 3-Year themes need realignment' },
  { upstream: 'm02', fields: ['mission_statement'], downstream: 'm04', reason: 'Mission updated — AOP priorities may change' },
  // M03 → downstream
  { upstream: 'm03', fields: ['strategic_themes', 'revenue_3yr'], downstream: 'm04', reason: '3-Year plan updated — AOP Year-1 targets need refresh' },
  { upstream: 'm03', fields: ['headcount_3yr'], downstream: 'm11', reason: '3-Year headcount plan updated — Org structure may change' },
  // M04 → downstream
  { upstream: 'm04', fields: ['annual_goals'], downstream: 'm05', reason: 'AOP goals updated — KPI framework needs to cover new goals' },
  { upstream: 'm04', fields: ['annual_goals'], downstream: 'm06', reason: 'AOP goals updated — MIS dashboard sections need update' },
  { upstream: 'm04', fields: ['annual_goals'], downstream: 'm07', reason: 'AOP priorities updated — Review meeting agendas need refresh' },
  { upstream: 'm04', fields: ['budget_plan'], downstream: 'm10', reason: 'AOP budget updated — Sales targets may change' },
  // M05 → downstream
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm06', reason: 'KPI library updated — MIS dashboard metrics need realignment' },
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm07', reason: 'KPI library updated — Review meeting metrics need update' },
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm08', reason: 'KPI library updated — Role KPIs in PMS need refresh' },
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm09', reason: 'KPI library updated — Variable Pay KPI linkage needs refresh' },
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm10', reason: 'KPI library updated — Sales KPIs may change' },
  { upstream: 'm05', fields: ['kpi_library'], downstream: 'm11', reason: 'KPI library updated — Role-level KPI assignments need refresh' },
  // M10 → downstream
  { upstream: 'm10', fields: ['product_targets'], downstream: 'm06', reason: 'Sales targets updated — MIS sales section needs refresh' },
  { upstream: 'm10', fields: ['actuals_to_date'], downstream: 'm07', reason: 'Sales actuals updated — Review meeting agenda needs latest data' },
  // M11 → downstream
  { upstream: 'm11', fields: ['org_nodes'], downstream: 'm05', reason: 'Org updated — KPI ownership assignments may change' },
  { upstream: 'm11', fields: ['org_nodes'], downstream: 'm08', reason: 'Org updated — Role scorecards in PMS need refresh' },
  { upstream: 'm11', fields: ['org_nodes'], downstream: 'm09', reason: 'Org updated — Variable Pay eligibility bands may change' },
];

// ─── Access control (which modules can be started) ────────────────────────────

/**
 * Returns modules that are locked (upstream not yet in draft/finalized).
 */
export function getLockedModules(
  modules: Partial<Record<ModuleKey, ModuleState>>
): Set<ModuleKey> {
  const locked = new Set<ModuleKey>();

  for (const [key, meta] of Object.entries(getModuleDeps())) {
    const moduleKey = key as ModuleKey;
    for (const dep of meta) {
      const depState = modules[dep];
      if (!depState || depState.status === 'not_started' || depState.status === 'in_progress') {
        locked.add(moduleKey);
        break;
      }
    }
  }

  return locked;
}

function getModuleDeps(): Record<ModuleKey, ModuleKey[]> {
  return {
    m01: [],
    m02: ['m01'],
    m03: ['m02'],
    m04: ['m03'],
    m05: ['m04'],
    m06: ['m05'],
    m07: ['m05', 'm06'],
    m08: ['m01', 'm05', 'm11'],
    m09: ['m05', 'm08'],
    m10: ['m04', 'm05'],
    m11: ['m05'],
  };
}

// ─── Stale propagation ────────────────────────────────────────────────────────

/**
 * When a module is finalized, compute which downstream modules become stale.
 * Returns a map of moduleKey → stale reason.
 */
export function computeStaleModules(
  finalizedKey: ModuleKey,
  changedFields: string[],
  currentModules: Partial<Record<ModuleKey, ModuleState>>
): Record<ModuleKey, string> {
  const staleMap: Record<ModuleKey, string> = {} as Record<ModuleKey, string>;

  const relevantRules = DEPENDENCY_RULES.filter(
    (r) =>
      r.upstream === finalizedKey &&
      r.fields.some((f) => changedFields.includes(f))
  );

  for (const rule of relevantRules) {
    const downstreamState = currentModules[rule.downstream];
    // Only mark stale if the module has at least a draft
    if (downstreamState && ['draft', 'finalized'].includes(downstreamState.status)) {
      staleMap[rule.downstream] = rule.reason;
    }
  }

  return staleMap;
}

/**
 * Apply stale flags to modules state.
 */
export function applyStaleFlags(
  modules: Partial<Record<ModuleKey, ModuleState>>,
  staleMap: Record<ModuleKey, string>
): Partial<Record<ModuleKey, ModuleState>> {
  const updated = { ...modules };

  for (const [key, reason] of Object.entries(staleMap)) {
    const moduleKey = key as ModuleKey;
    const current = updated[moduleKey];
    if (current) {
      updated[moduleKey] = {
        ...current,
        isStale: true,
        staleReason: reason,
        // Downgrade from finalized to draft so user must re-finalize
        status: current.status === 'finalized' ? 'draft' : current.status,
      };
    }
  }

  return updated;
}

// ─── Completion % ────────────────────────────────────────────────────────────

/**
 * Computes the overall BOS completion percentage.
 */
export function computeBosCompletion(
  modules: Partial<Record<ModuleKey, ModuleState>>
): number {
  const allKeys: ModuleKey[] = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11'];
  const weights: Partial<Record<ModuleKey, number>> = {
    m01: 8, m02: 8, m03: 10, m04: 12, m05: 10,
    m06: 8, m07: 8, m08: 10, m09: 8, m10: 10, m11: 8,
  }; // total = 100

  let total = 0;
  for (const key of allKeys) {
    const state = modules[key];
    const weight = weights[key] ?? 8;
    if (!state || state.status === 'not_started') continue;
    if (state.status === 'finalized') {
      total += weight;
    } else if (state.status === 'draft') {
      total += weight * 0.6;
    } else if (state.status === 'in_progress') {
      total += weight * 0.2;
    }
  }

  return Math.round(total);
}

// ─── Topological order for Master Pack Export ─────────────────────────────────

export const EXPORT_ORDER: ModuleKey[] = [
  'm01', 'm02', 'm03', 'm04', 'm05', 'm11', 'm06', 'm07', 'm10', 'm08', 'm09',
];
