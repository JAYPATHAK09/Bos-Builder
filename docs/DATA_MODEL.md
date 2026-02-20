# BOS Builder — Data Model

---

## Entity Relationship Overview

```
Organisation
  └── Users (consultants)
  └── Clients
        └── Projects
              └── CompanyProfile
              └── Modules[11]
                    └── ModuleInputs
                    └── ModuleVersions
                    └── ModuleSuggestions
              └── Documents (uploaded)
              └── FieldMappings
              └── ConflictLogs
```

---

## Tables / Collections

### 1. `organisations`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Consultancy firm name |
| slug | string | URL-safe identifier |
| plan | enum: free/pro/enterprise | |
| created_at | timestamp | |

### 2. `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| org_id | uuid | FK → organisations |
| name | string | |
| email | string | Unique |
| role | enum: admin/consultant/client_viewer | |
| created_at | timestamp | |

### 3. `clients`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| org_id | uuid | FK → organisations |
| company_name | string | |
| sector | string | |
| stage | enum: early/growth/scaling/established | |
| created_at | timestamp | |
| created_by | uuid | FK → users |

### 4. `projects`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → clients |
| name | string | e.g. "BOS 2025-26" |
| status | enum: draft/active/completed/archived | |
| bos_completion_pct | int | 0–100, computed |
| created_at | timestamp | |
| updated_at | timestamp | |

### 5. `company_profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK → projects, unique |
| company_name | string | |
| sector | string | |
| sub_sector | string | |
| stage | enum | |
| headcount | int | |
| headcount_note | string | e.g. "inc. contract" |
| revenue_current | string | Free text, e.g. "₹120 Cr" |
| revenue_target | string | |
| margin_current | string | |
| geographies | string[] | Array of locations |
| org_structure | enum: flat/functional/matrix/divisional/hybrid | |
| org_levels | int | No. of hierarchy levels |
| product_lines | jsonb | [{name, revenue_pct, description}] |
| channels | string[] | |
| key_customers | string | |
| revenue_streams | jsonb | [{name, type, pct}] |
| pain_points | string | Free text |
| whats_working | string | |
| aspiration_3yr | string | |
| strategic_bets | string[] | Max 5 |
| planning_year | string | e.g. "FY 2025-26" |
| currency | string | INR/USD/etc. |
| created_at | timestamp | |
| updated_at | timestamp | |

### 6. `modules`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| module_key | enum | m01–m11 |
| module_name | string | Display name |
| status | enum: not_started/in_progress/draft/finalized | |
| completion_pct | int | Based on required inputs filled |
| is_stale | boolean | Upstream changed after finalization |
| stale_reason | string | Which upstream module changed |
| current_version | string | e.g. "v2" |
| finalized_at | timestamp | |
| finalized_by | uuid | FK → users |
| generated_at | timestamp | Last AI generation |
| created_at | timestamp | |
| updated_at | timestamp | |

### 7. `module_inputs`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| module_id | uuid | FK → modules |
| field_key | string | e.g. "purpose_statement" |
| field_value | text | Current value |
| is_assumed | boolean | Filled by AI assumption |
| assumption_note | string | What assumption was made |
| source | enum: manual/imported/ai_suggested | |
| source_document_id | uuid | FK → documents (if imported) |
| confidence | float | 0–1 (for imported fields) |
| updated_at | timestamp | |
| updated_by | uuid | FK → users |

### 8. `module_versions`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| module_id | uuid | FK → modules |
| version_label | string | v0, v1, v2, vFinal |
| content_markdown | text | Full draft markdown |
| content_json | jsonb | Structured JSON output from AI |
| tokens_used | int | |
| created_at | timestamp | |
| created_by | uuid | FK → users (null for v0) |
| diff_from_prev | text | Word-level diff |

### 9. `module_suggestions`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| module_id | uuid | FK → modules |
| suggestion_type | enum: improvement/risk/gap/benchmark | |
| section | string | Which section this applies to |
| content | text | The suggestion text |
| status | enum: pending/accepted/dismissed | |
| created_at | timestamp | |

### 10. `documents`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| file_name | string | |
| file_type | enum: pdf/docx/txt/paste | |
| file_url | string | Storage URL |
| extracted_text | text | Raw extracted text |
| extraction_status | enum: pending/complete/failed | |
| extraction_confidence | float | Overall extraction quality |
| created_at | timestamp | |

### 11. `field_mappings`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| document_id | uuid | FK → documents |
| module_key | string | e.g. "m01" |
| field_key | string | e.g. "purpose_statement" |
| extracted_value | text | What was extracted |
| mapped_value | text | After user confirmation |
| confidence | float | AI confidence score |
| status | enum: pending/accepted/rejected/edited | |
| conflict_with | uuid[] | Other field_mapping IDs that conflict |
| created_at | timestamp | |

### 12. `conflict_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| field_key | string | Which field had conflict |
| sources | jsonb | [{doc_id, value, confidence}] |
| resolution | enum: chose_a/chose_b/blended/manual | |
| resolved_value | text | Final chosen value |
| resolved_by | uuid | FK → users |
| resolved_at | timestamp | |

### 13. `dependency_events`
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| source_module | string | Which module changed |
| affected_modules | string[] | Which modules became stale |
| change_description | string | What changed |
| created_at | timestamp | |

---

## Module-Specific Input Fields

### M01 — Purpose & Values
| Field Key | Type | Required | Description |
|---|---|---|---|
| purpose_statement | text | Yes | Why the company exists beyond profit |
| core_values | jsonb | Yes | [{name, definition, behaviors[3]}] (3–6 values) |
| values_story | text | No | Origin story of the values |
| non_negotiables | text | No | What the company will never do |

### M02 — Vision & Mission
| Field Key | Type | Required | Description |
|---|---|---|---|
| vision_statement | text | Yes | BHAG / 10-year aspiration |
| mission_statement | text | Yes | What we do, for whom, how |
| positioning_statement | text | No | Unique market position |
| brand_promise | text | No | What customers can always expect |

### M03 — 3-Year Strategic Plan
| Field Key | Type | Required | Description |
|---|---|---|---|
| strategic_themes | jsonb | Yes | [{theme, rationale, initiatives[], owner, budget}] |
| revenue_3yr | string | Yes | Year 1/2/3 targets |
| headcount_3yr | string | No | Year 1/2/3 targets |
| market_expansion | text | No | Geographies, segments |
| key_risks_3yr | jsonb | No | [{risk, mitigation}] |

### M04 — AOP (1-Year Plan)
| Field Key | Type | Required | Description |
|---|---|---|---|
| annual_goals | jsonb | Yes | [{goal, kpi, target, owner, q_milestones[]}] |
| dept_plans | jsonb | Yes | Per department |
| budget_plan | jsonb | Yes | Revenue + expense by dept |
| quarterly_roadmap | jsonb | Yes | Q1–Q4 key activities |

### M05 — KPI Framework
| Field Key | Type | Required | Description |
|---|---|---|---|
| north_star_kpi | text | Yes | Single most important metric |
| kpi_library | jsonb | Yes | [{kpi, definition, formula, frequency, owner, target, threshold, source}] |
| kpi_hierarchy | jsonb | No | CEO → HOD → Team levels |

### M06 — MIS Dashboard Blueprint
| Field Key | Type | Required | Description |
|---|---|---|---|
| dashboard_sections | jsonb | Yes | [{name, metrics[], owner, frequency}] |
| ceo_view | jsonb | Yes | Top 5–7 CEO-level metrics |
| data_sources | jsonb | No | [{metric, source_system, pull_method}] |
| refresh_cadence | text | No | Daily/weekly/monthly per section |

### M07 — Business Review System
| Field Key | Type | Required | Description |
|---|---|---|---|
| weekly_meetings | jsonb | Yes | [{name, cadence, attendees, duration, agenda}] |
| monthly_mbr | jsonb | Yes | MBR structure |
| quarterly_qbr | jsonb | Yes | QBR structure |
| annual_planning | text | No | When and how annual planning happens |

### M08 — Performance Management Framework
| Field Key | Type | Required | Description |
|---|---|---|---|
| review_cycle | text | Yes | Annual/biannual/quarterly |
| rating_scale | jsonb | Yes | [{rating, label, description}] |
| kpi_weight | int | Yes | % weight for KPI vs behavior |
| role_scorecards | jsonb | Yes | [{role, kpis[], behaviors[], weights}] |
| calibration_process | text | No | How ratings are calibrated |
| feedback_360 | boolean | No | Whether 360 feedback is used |

### M09 — Variable Pay Framework
| Field Key | Type | Required | Description |
|---|---|---|---|
| eligibility | jsonb | Yes | [{band, eligible_pct_of_ctc}] |
| kpi_linkage | jsonb | Yes | [{kpi, weight, payout_curve}] |
| payout_schedule | text | Yes | Monthly/quarterly/annual |
| gate_conditions | text | No | Company must hit X before individual pays |
| examples | jsonb | No | 3 payout scenarios |

### M10 — Sales Tracker
| Field Key | Type | Required | Description |
|---|---|---|---|
| sales_team | jsonb | Yes | [{name, role, territory, target}] |
| product_targets | jsonb | Yes | [{product, annual_target, q_split}] |
| pipeline_stages | jsonb | Yes | [{stage, conversion_rate}] |
| forecast_method | text | Yes | How 2-month forecast is calculated |
| actuals_to_date | jsonb | No | Month-by-month actuals |

### M11 — Org Chart + JD Mapping
| Field Key | Type | Required | Description |
|---|---|---|---|
| org_nodes | jsonb | Yes | [{id, role, name, reports_to, dept, level, kpis[]}] |
| jd_templates | jsonb | Yes | [{role, responsibilities[], qualifications[], competencies[], kpis[]}] |
| value_tags | jsonb | No | Which values each role must exemplify |
| span_of_control | text | No | Ideal spans by level |

---

## localStorage Schema (MVP)

```typescript
interface BOSLocalState {
  projects: Project[];
  activeProjectId: string | null;
  lastUpdated: string;
}

interface Project {
  id: string;
  clientName: string;
  profile: CompanyProfile;
  modules: Record<ModuleKey, ModuleState>;
  documents: DocumentRecord[];
  createdAt: string;
  updatedAt: string;
}

interface ModuleState {
  status: 'not_started' | 'in_progress' | 'draft' | 'finalized';
  inputs: Record<string, unknown>;
  versions: ModuleVersion[];
  suggestions: Suggestion[];
  isStale: boolean;
  staleReason?: string;
}
```
