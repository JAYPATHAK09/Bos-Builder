# BOS Builder — 2-Week Build Plan

---

## Team Assumption
- 1–2 developers (full-stack Next.js)
- 1 consultant / product owner (reviews outputs)
- Target: MVP that can run a real client session end-to-end

---

## Week 1 — Foundation + Core Modules

### Day 1 (Monday)
**Goal:** Project setup + onboarding wizard working end-to-end

- [ ] Create Next.js project, Tailwind, Zod, Anthropic SDK
- [ ] Company onboarding wizard (5 steps, form + validation)
- [ ] localStorage state management
- [ ] Company profile saved, readable
- [ ] Basic routing: Home → Onboarding → Dashboard
- **Deliverable:** Can create a client project and see blank module dashboard

### Day 2 (Tuesday)
**Goal:** Module dashboard + first module (M01) working

- [ ] Module dashboard UI (11 cards, status, dependency badges)
- [ ] Module editor shell (3-panel layout)
- [ ] M01 Purpose & Values: inputs + AI generation + markdown preview
- [ ] Copy/download .md working
- **Deliverable:** Can generate a Purpose & Values draft end-to-end

### Day 3 (Wednesday)
**Goal:** Modules M02, M03, M04 working

- [ ] M02 Vision & Mission: inputs + generation
- [ ] M03 3-Year Strategic Plan: inputs + generation
- [ ] M04 AOP: integrate with existing AOP prompt, extended inputs
- [ ] Version history (v0 auto-save on generation)
- **Deliverable:** Can run first 4 modules sequentially

### Day 4 (Thursday)
**Goal:** Dependency engine + stale detection

- [ ] Implement dependency engine (rules from DEPENDENCY_RULES.md)
- [ ] Stale badge on module cards
- [ ] "Refresh Draft" button on stale modules
- [ ] Dependency blocking (can't generate M03 without M02)
- **Deliverable:** Changes in M01/M02 propagate stale flags to downstream

### Day 5 (Friday)
**Goal:** Modules M05, M06, M07 + document ingestion shell

- [ ] M05 KPI Framework: inputs + generation
- [ ] M06 MIS Dashboard Blueprint: inputs + generation
- [ ] M07 Business Review System: inputs + generation
- [ ] Document upload UI (drag-and-drop)
- [ ] Server: text extraction (PDF, DOCX, TXT)
- **Deliverable:** Core operational modules working; doc upload functional

---

## Week 2 — People Modules + Export + Polish

### Day 6 (Monday)
**Goal:** Modules M08, M09 + document field mapping

- [ ] M08 Performance Management Framework: inputs + generation
- [ ] M09 Variable Pay Framework: inputs + generation
- [ ] AI field-mapping (extracted text → BOS fields with confidence scores)
- [ ] Field mapping review UI
- **Deliverable:** People modules working; doc ingestion maps to fields

### Day 7 (Tuesday)
**Goal:** Modules M10, M11 + conflict resolution UI

- [ ] M10 Sales Tracker: inputs + generation + XLSX export
- [ ] M11 Org Chart + JD Mapping: inputs + generation
- [ ] Conflict resolution panel UI
- [ ] Conflict auto-detection logic
- **Deliverable:** All 11 modules generating drafts

### Day 8 (Wednesday)
**Goal:** Export system

- [ ] Per-module PDF export (html → pdf via print dialog / jspdf)
- [ ] Per-module DOCX export (using docx library)
- [ ] M10 XLSX export
- [ ] Version selector + diff view
- **Deliverable:** Can export any module in PDF + DOCX

### Day 9 (Thursday)
**Goal:** Master Pack Export + suggestions system

- [ ] Master Pack Export UI (select modules, combined PDF)
- [ ] ZIP download of all individual exports
- [ ] Module suggestions (AI-generated risks/gaps per module)
- [ ] Accept/Dismiss suggestions workflow
- **Deliverable:** Complete BOS pack exportable in one click

### Day 10 (Friday)
**Goal:** QA + polish + deploy

- [ ] End-to-end test with a real client scenario
- [ ] Fix UI bugs, table widths, mobile view
- [ ] Add "Consultant tips" tooltips throughout
- [ ] Production env vars + Vercel deploy
- [ ] README + setup docs updated
- **Deliverable:** Deployed, tested, client-ready MVP

---

## Post-MVP (Week 3+)

| Feature | Effort | Priority |
|---|---|---|
| Supabase auth + multi-tenant | 3 days | High |
| Client review portal (shared link) | 2 days | High |
| Real-time collaboration | 4 days | Medium |
| Analytics dashboard | 2 days | Medium |
| AI chat within module ("ask Claude") | 1 day | Medium |
| Custom branding (logo on exports) | 1 day | Low |
| Template library (industry presets) | 3 days | Medium |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| AI generation quality inconsistent | Test all 11 prompts with 3 different company types before launch |
| PDF export formatting breaks on tables | Test DOCX export as primary; PDF via print dialog as fallback |
| Document extraction quality varies | Set low expectations; highlight confidence scores; easy manual override |
| localStorage limits (5MB) | Implement compression; warn at 80% capacity; push to Supabase early |
| Token costs exceed budget | Max 8192 tokens/generation; cache v0 aggressively; "regenerate" needs confirmation |

---

## Definition of Done

The MVP is complete when:
- [ ] A consultant can create a new client project in < 5 minutes
- [ ] All 11 modules generate a meaningful first draft
- [ ] Draft quality is "better than a blank template" for any industry
- [ ] Each module exports as PDF and DOCX
- [ ] Master Pack Export produces a ZIP with all files
- [ ] Stale detection works when M01 is updated after M08 is drafted
- [ ] App is deployed on Vercel with ANTHROPIC_API_KEY configured
