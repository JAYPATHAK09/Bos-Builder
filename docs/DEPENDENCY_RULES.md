# BOS Builder — Dependency Rules & Interconnection Logic

---

## Dependency Graph

```
M01 (Purpose & Values)
  ↓ ─────────────────────────────────────────────────────────────
  │  Values → M08 (PMS behavioral indicators)
  │  Values → M09 (Variable Pay gate conditions)
  │  Values → M11 (JD competency tags, value alignment)

M02 (Vision & Mission)
  ↓ ─────────────────────────────────────────────────────────────
  │  Vision → M03 (3-year themes must align to vision)
  │  Mission → M04 (AOP priorities must serve mission)

M03 (3-Year Plan)
  ↓ ─────────────────────────────────────────────────────────────
  │  3-yr themes → M04 (Year-1 AOP must derive from theme[0])
  │  3-yr revenue targets → M04 (AOP revenue goal = Year-1 target)
  │  3-yr headcount plan → M11 (Org structure targets)

M04 (AOP)
  ↓ ─────────────────────────────────────────────────────────────
  │  AOP goals → M05 (KPI definitions must cover AOP goals)
  │  AOP KPIs → M06 (MIS must display all AOP KPIs)
  │  AOP priorities → M07 (Review agendas must include AOP priorities)
  │  AOP budget → M10 (Sales targets derive from revenue goal)

M05 (KPI Framework)
  ↓ ─────────────────────────────────────────────────────────────
  │  KPI library → M06 (MIS metrics = subset of KPI library)
  │  KPI library → M07 (Review metrics = subset of KPI library)
  │  KPI library → M08 (Role KPIs = subset of KPI library)
  │  KPI library → M09 (Variable pay linked KPIs from library)
  │  KPI library → M10 (Sales KPIs from library)
  │  KPI library → M11 (Role-level KPIs from library)

M10 (Sales Tracker)
  ↓ ─────────────────────────────────────────────────────────────
  │  Sales targets → M06 (MIS sales section)
  │  Sales actuals → M07 (Review meeting agenda)

M11 (Org Chart)
  ↓ ─────────────────────────────────────────────────────────────
  │  Roles/owners → M05 (KPI owner field in library)
  │  Roles/owners → M06 (MIS metric owners)
  │  Roles → M08 (Role scorecards in PMS)
  │  Roles → M09 (Eligibility bands)
```

---

## Dependency Rules Table

| Upstream Module | Field Changed | Downstream Module | Field Updated | Stale Trigger |
|---|---|---|---|---|
| M01 | core_values | M08 | behavioral_indicators | Yes |
| M01 | core_values | M09 | gate_conditions | Yes |
| M01 | core_values | M11 | jd_templates.competencies | Yes |
| M02 | vision_statement | M03 | strategic_themes (rationale) | Yes |
| M02 | mission_statement | M04 | executive_summary | Yes |
| M03 | strategic_themes | M04 | annual_goals | Yes |
| M03 | revenue_3yr (year 1) | M04 | budget_plan.revenue | Yes |
| M04 | annual_goals | M05 | kpi_library | Yes |
| M04 | annual_goals | M06 | dashboard_sections | Yes |
| M04 | annual_goals | M07 | meeting_agenda_items | Yes |
| M04 | budget_plan | M10 | product_targets | Yes |
| M05 | kpi_library | M06 | dashboard_metrics | Yes |
| M05 | kpi_library | M07 | review_metrics | Yes |
| M05 | kpi_library | M08 | role_scorecards.kpis | Yes |
| M05 | kpi_library | M09 | kpi_linkage | Yes |
| M05 | kpi_library | M10 | sales_kpis | Yes |
| M05 | kpi_library | M11 | org_nodes.kpis | Yes |
| M10 | product_targets | M06 | mis_sales_section | Yes |
| M10 | actuals_to_date | M07 | weekly_agenda | Yes |
| M11 | org_nodes | M05 | kpi_library.owner | Yes |
| M11 | org_nodes | M08 | role_scorecards | Yes |
| M11 | org_nodes | M09 | eligibility.bands | Yes |

---

## Dependency Engine — Pseudo Logic

```typescript
// Called whenever a module field is FINALIZED (not just saved)
function onModuleFinalized(projectId: string, moduleKey: ModuleKey, changedFields: string[]) {

  const affectedModules = resolveDownstream(moduleKey, changedFields);

  for (const { moduleKey: downstreamKey, reason } of affectedModules) {
    const downstreamModule = getModule(projectId, downstreamKey);

    // Only mark stale if the downstream module is at least in "draft" state
    if (['draft', 'finalized'].includes(downstreamModule.status)) {
      markStale(projectId, downstreamKey, reason);
      logDependencyEvent(projectId, moduleKey, downstreamKey, changedFields, reason);
    }
  }
}

function resolveDownstream(moduleKey: ModuleKey, changedFields: string[]): StaleTarget[] {
  const rules = DEPENDENCY_RULES.filter(r =>
    r.upstream === moduleKey && changedFields.includes(r.field)
  );
  return rules.map(r => ({ moduleKey: r.downstream, reason: r.reason }));
}

function markStale(projectId: string, moduleKey: ModuleKey, reason: string) {
  updateModule(projectId, moduleKey, {
    isStale: true,
    staleReason: reason,
    status: 'draft', // Revert from 'finalized' if it was finalized
  });
}

// Called when user clicks "Refresh Draft" on a stale module
async function refreshStaleDraft(projectId: string, moduleKey: ModuleKey) {
  const latestInputs = gatherLatestInputs(projectId, moduleKey); // Pulls from upstream modules
  const existingDraft = getLatestVersion(projectId, moduleKey);

  // Merge: new upstream data + existing user edits
  const mergedDraft = await callAI({
    prompt: getModulePrompt(moduleKey, 'refresh'),
    inputs: latestInputs,
    existingDraft: existingDraft.content_markdown,
    instruction: 'Update the draft with the latest upstream changes. Preserve user-edited sections. Show what changed.',
  });

  saveNewVersion(projectId, moduleKey, mergedDraft);
  clearStale(projectId, moduleKey);
}
```

---

## Topological Sort (Build Order)

Modules must be completed in this sequence for maximum interconnection quality:

```
Tier 1 (Foundation): M01, M02
Tier 2 (Strategy):   M03, M04
Tier 3 (KPIs):       M05, M11
Tier 4 (Operations): M06, M07, M10
Tier 5 (People):     M08, M09
```

Modules within the same tier can be worked on in any order.
Cross-tier: a module can be started before upstream is finalized, but draft will be labeled "[UPSTREAM PENDING — refresh after M0X is finalized]".

---

## Data Flow Diagram

```
[Company Profile]
       │
   ┌───┴─────────────────────────────────────────┐
   ▼                                             ▼
[M01 Values] ─────────────────► [M08 PMS]
[M02 Vision] ──► [M03 3-yr] ──► [M04 AOP] ──► [M05 KPIs]
                                     │               │
                                     ▼               ▼
                               [M10 Sales] ──► [M06 MIS]
                                     │               │
                                     └───────► [M07 Reviews]
                                                     │
                                               [M08 PMS] ──► [M09 VarPay]
                               [M11 OrgChart] ──────┘
```

---

## Conflict Resolution Rules

When document ingestion produces conflicting values for the same field from two sources:

```
Conflict Score = |semantic_similarity(value_A, value_B) - 1|

If Conflict Score < 0.2: Auto-merge (values are very similar, keep higher-confidence one)
If 0.2 ≤ Conflict Score < 0.5: Highlight amber, suggest blend, user decides
If Conflict Score ≥ 0.5: Hard conflict, block auto-fill, require user resolution
```

Resolution options:
1. **Choose A** — use source A's value
2. **Choose B** — use source B's value
3. **Blend** — AI blends both into a single coherent statement (user confirms blend)
4. **Write manually** — user types their own value

All resolutions logged in `conflict_logs` with rationale.
