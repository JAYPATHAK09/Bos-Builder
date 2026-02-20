# Business Operating System (BOS) Builder — Product Requirements Document

**Version:** 1.0
**Status:** Approved for Build
**Owner:** JAY / AOP Builder Consultancy
**Last Updated:** February 2026

---

## 1. Product Overview

### 1.1 What Is BOS Builder?

BOS Builder is a wizard-style, AI-powered web application that helps a consultancy generate a complete **Business Operating System** for client companies. A Business Operating System is a set of 11 interlinked strategic, operational, and people-management documents that collectively define how a business is run.

The tool takes company profile data and optional uploaded documents as input and produces board-ready, editable, exportable deliverables — in a fraction of the time a manual consulting engagement would require.

### 1.2 Core Value Proposition

Traditional consulting engagement to build a BOS: 3–6 months, ₹30–80L
BOS Builder: 4–8 hours of structured input → complete first-draft BOS in 48 hours

### 1.3 The 11 Modules

| # | Module | Primary Output | Key Consumers |
|---|--------|---------------|---------------|
| 1 | Purpose & Values | Value statements, behavioral indicators | All modules |
| 2 | Vision & Mission | Vision doc, mission statement | Modules 3, 4, 8 |
| 3 | 3-Year Strategic Plan | Strategy document, initiative roadmap | Module 4 |
| 4 | 1-Year AOP | Annual operating plan | Modules 5, 6, 7 |
| 5 | KPI Framework | KPI library with definitions | Modules 6, 7, 8, 9, 10, 11 |
| 6 | MIS Dashboard Blueprint | Dashboard spec & metrics hierarchy | Module 7 |
| 7 | Business Review System | Meeting cadence + agenda templates | Module 6 |
| 8 | Performance Management Framework | Role scorecards, rating rubric | Modules 9, 11 |
| 9 | Variable Pay Framework | Pay-for-performance structure | Module 8 |
| 10 | Sales Tracker | Target vs actual + 2-month forecast | Modules 6, 7 |
| 11 | Org Chart + JD Mapping | Org structure, JDs, role KPIs | Modules 5, 8 |

---

## 2. Personas

### 2.1 Consultant (Primary User)

**Name:** Priya — Senior Associate, Strategy Consulting Firm
**Goal:** Complete a client's BOS pack in 2–3 sessions, impress the client, reduce manual effort
**Pain Points:** Repetitive formatting, ensuring consistency across documents, going back and forth with client for inputs
**Key Needs:** Smart defaults, auto-fill from company profile, track changes, version history, master export

### 2.2 Founder / CEO (Client User)

**Name:** Rahul — Founder, 120-person manufacturing company
**Goal:** Have a working operating system for his business; understand what it means
**Pain Points:** Doesn't have time to fill 100 fields; needs guidance; wants something simple but comprehensive
**Key Needs:** Plain language, Indian business context, actionable outputs, ability to review and approve

### 2.3 HR Head (Client Reviewer)

**Name:** Meera — HR Director
**Goal:** Review PMS, Variable Pay, Org Chart, Values
**Pain Points:** Templates that don't match the company culture; too generic
**Key Needs:** Customisable PMS rubrics, values-linked behavioral indicators, JD templates

### 2.4 Sales Head (Client Reviewer)

**Name:** Arjun — VP Sales
**Goal:** Review Sales Tracker, AOP sales section, KPI framework
**Pain Points:** Tracker doesn't match their pipeline process; KPIs are unrealistic
**Key Needs:** Sales-specific KPIs, pipeline stages, forecast logic

---

## 3. User Journeys

### 3.1 Consultant Journey (Core Flow)

```
Login → Create New Client Project →
Company Onboarding (5-step wizard) →
Upload Existing Docs (optional) →
Auto-mapping + Conflict Resolution →
Module Dashboard →
[For each module:] Open → View Inputs → Generate Draft →
Edit → Accept/Reject Suggestions → Finalize → Export →
Master Pack Export → Share with Client
```

### 3.2 Client Review Journey

```
Receive review link → View specific module →
Add comments → Approve / Request Changes →
Consultant sees feedback → Updates → Re-sends
```

### 3.3 Re-engagement Journey (Update)

```
Login → Open Client Project →
See which modules are "stale" (upstream changed) →
Selectively regenerate → Re-export
```

---

## 4. Feature Specifications

### 4.1 Client Onboarding Wizard

**Steps:**
1. Basic company info (name, sector, stage, headcount, revenue, geographies)
2. Org structure (flat/functional/matrix/divisional, no. of levels)
3. Business model (product lines, channels, key customers, revenue streams)
4. Current state (pain points, what's working, what's not)
5. Aspiration (where they want to be in 3 years, key strategic bets)

**Acceptance Criteria:**
- All mandatory fields validated before proceeding
- "I'll fill later" option for non-mandatory fields (marked as [ASSUMED])
- Progress saved to localStorage (MVP) / Supabase (production)
- Duplicate client detection by company name + sector

### 4.2 Document Ingestion

**Supported Formats:** PDF, DOCX, TXT (paste)

**Extraction Flow:**
1. User uploads file(s)
2. Server extracts text (pdf-parse for PDF, mammoth for DOCX)
3. AI analyzes text and maps extracted content to BOS fields with confidence score
4. UI shows mapping: field → extracted snippet → confidence badge (High/Medium/Low)
5. User can accept, edit, or reject each mapping
6. Conflicting information across docs → Conflict Resolution UI

**Conflict Resolution UI:**
- Side-by-side display of conflicting values
- Source labels (e.g., "From HR Policy Doc" vs "From Annual Report")
- "Use this" / "Blend both" / "Ask Claude" options
- Resolution logged in audit trail

**Acceptance Criteria:**
- Min 70% field mapping accuracy for well-structured docs
- Confidence scores visible and calibrated
- Zero auto-acceptance without user confirmation
- Failed extractions show clear error message

### 4.3 Module Dashboard

**Layout:** Grid of 11 module cards
**Each card shows:**
- Module name + icon
- Status: Not Started / In Progress / Draft / Finalized
- Completion % (based on inputs filled)
- Dependencies: which upstream modules must be complete first
- "Stale" indicator: if an upstream module was updated after this was finalized
- CTA: Start / Continue / Review / Export

**Acceptance Criteria:**
- Dependencies block access to downstream module (with tooltip explaining why)
- Stale modules highlighted in amber with "Refresh" CTA
- Overall BOS completion % shown at top

### 4.4 Module Editor (Per Module)

**Layout:** Three-panel

**Left Panel — Inputs:**
- Form fields grouped logically
- Imported snippets shown in-context with source label
- "Suggest" button: AI fills this field based on company profile
- Required vs optional field indicators
- Character count / quality indicators

**Center Panel — Draft Preview:**
- Live markdown-rendered preview
- Sections collapsed/expandable
- Version selector: v0 draft / v1 edited / v2 final
- "Regenerate Section" buttons per section
- Track changes: diff view between versions

**Right Panel — Suggestions:**
- "Claude says:" AI suggestions for improvements
- Risks/gaps flagged (e.g., "Vision statement is too generic")
- Benchmark comparisons ("Industry best practice says...")
- Accept / Dismiss per suggestion

**Acceptance Criteria:**
- Generate button creates complete draft in < 60 seconds
- Edit saves auto (no manual save button)
- Version history maintains v0 (auto) / v1, v2... (manual saves)
- Each section has individual regenerate capability
- Track changes shows word-level diffs

### 4.5 Export System

**Per Module:**
- PDF (A4, print-ready, company branding)
- DOCX (editable Word document with styles)
- For Module 10 (Sales Tracker): also XLSX/CSV

**Master Pack Export:**
- Select which modules to include
- Combined PDF (bookmarked by module)
- ZIP of individual files
- Executive Summary auto-generated from all modules

**Acceptance Criteria:**
- PDF respects A4 layout, no cut-off tables
- DOCX uses heading styles, TOC-ready
- Export completes in < 30 seconds for all 11 modules
- File names: `[CompanyName]_[Module]_[Version]_[Date]`

### 4.6 Dependency Engine

Upstream changes propagate "stale" flag to all dependent modules.

**Trigger:** Any finalized field in module X is updated → all modules that use X inputs are marked stale.

**Stale behaviour:**
- Module card shows amber "Stale — upstream updated" badge
- Module editor shows banner: "Module 3 (3-Year Plan) was updated. Your draft may be outdated. [Refresh Draft]"
- Refresh uses latest upstream data but preserves user edits (merge, not overwrite)
- Merge conflicts shown in track-changes UI

### 4.7 Versioning

Each module maintains:
- `v0`: auto-generated first draft (never editable; preserved forever)
- `v1+`: user-edited versions (auto-saved every 30 seconds)
- `vFinal`: explicitly finalized by consultant; triggers downstream stale checks
- Diff view available between any two versions

### 4.8 Multi-Tenant (Consultancy Mode)

**Hierarchy:**
```
Consultancy (org) → Consultants (users) → Clients → Projects → Modules
```

**Roles:**
- Admin: full access, billing, user management
- Consultant: create/edit all projects assigned to them
- Client Viewer: read-only access to their own project, can add comments

**For MVP:** Single-tenant, no auth required. State in localStorage.
**For Production:** Supabase auth + RLS policies per org.

---

## 5. Screen-by-Screen Flow

### Screen 1: Home / Project List
- List of client projects (cards: company name, sector, BOS completion %, last updated)
- "New Client" button → starts onboarding wizard
- Search/filter

### Screen 2: Onboarding Wizard (5 steps)
- Step indicator at top
- Form fields per step
- "Import Documents" step (step 2.5, shown after step 2)
- "Review & Confirm" final step

### Screen 3: Document Import
- Drag-and-drop zone
- Or paste text
- Progress indicator during extraction
- Field mapping review table
- Conflict resolution panel (shown only if conflicts)

### Screen 4: Module Dashboard
- Top: company name, BOS progress ring (overall %)
- 11 module cards in grid (3 columns)
- Right sidebar: consultant notes, last activity log

### Screen 5: Module Editor
- Three-panel layout (see 4.4 above)
- Top bar: module name, status badge, version selector, export button
- Bottom: Back to Dashboard / Next Module

### Screen 6: Master Pack Export
- Checklist of 11 modules (check to include)
- Preview of each module (thumbnail)
- Export format selectors
- Progress bar during export
- Download buttons

---

## 6. Validation Rules

| Rule | Logic |
|---|---|
| Company name required | Cannot proceed without |
| Revenue format | Accept text (e.g., "₹50 Cr") — no strict numeric format |
| Priority 1 in Goals | At least 1 priority required |
| Module dependency | Module N cannot be generated if required upstream module is "Not Started" |
| Stale detection | Check `updatedAt` of upstream finalized fields vs `generatedAt` of this module |
| Conflict threshold | If same field has 2+ sources with >30% semantic difference → flag conflict |
| Export readiness | Module must be in "Draft" or "Finalized" status to export |

---

## 7. Analytics (Built-In)

Tracked events (stored locally / Supabase):
- Time to complete each module
- Number of regenerations per module
- Fields left empty vs filled
- Export types used
- Most common "gaps" flagged by Claude
- Conflict rate in document ingestion

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Draft generation time | < 60 seconds per module |
| Export generation time | < 30 seconds per module |
| Page load | < 2 seconds |
| Mobile responsive | Yes (view only; editing on desktop) |
| Accessibility | WCAG 2.1 AA |
| Data security | No client data stored in AI model; API calls use data-in-transit encryption |
| Token cost control | Max 8,192 tokens per generation; summaries cached; "regenerate" requires confirmation |
