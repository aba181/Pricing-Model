# Roadmap: ACMI Pricing Platform

## Overview

Five phases that follow the dependency chain of the product itself. Authentication gates access to everything, so it ships first. Aircraft master data feeds the pricing engine, so it ships second. The pricing engine is the core product and the highest-risk phase — it ships third, after the Excel workbook audit is complete. Quote persistence transforms the calculator into an auditable quoting tool and ships fourth. Polish and production readiness close the milestone. Each phase delivers a coherent, verifiable capability. Nothing is built before its dependency exists.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation and Authentication** - Secure access, project scaffold, and database schema foundation
- [x] **Phase 2: Aircraft Master Data** - Aircraft records with cost parameters that feed the pricing engine
- [ ] **Phase 3: Pricing Engine** - Formula-accurate EUR/BH calculation across all seven ACMI cost components
- [ ] **Phase 4: Quote Persistence and History** - Save, retrieve, and manage pricing quotes as auditable records
- [ ] **Phase 5: Polish and Production Readiness** - Admin controls, UI completeness, and deployment configuration

## Phase Details

### Phase 1: Foundation and Authentication
**Goal**: Users can securely access the application and the project foundation is correct before any data is written
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, UI-01, UI-05
**Success Criteria** (what must be TRUE):
  1. User can log in with company email and password and is taken to the application
  2. User remains logged in after refreshing the browser (JWT persists across sessions)
  3. User can log out from any page and is immediately redirected to the login screen
  4. Admin can create a new user account without that user self-registering
  5. Application sidebar navigation renders with all five pages (Dashboard, Pricing, Quotes, Aircraft, Admin) and matches AeroVista visual style
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — FastAPI scaffold, asyncpg DB layer, users table migration, pytest Wave 0
- [x] 01-02-PLAN.md — FastAPI auth backend (login, logout, /auth/me, admin user CRUD, 8 tests green)
- [x] 01-03-PLAN.md — Next.js project, login page, middleware, auth Server Actions, session helper
- [x] 01-04-PLAN.md — App shell: collapsible sidebar, 5 nav pages, top bar, logout, human verify checkpoint

### Phase 2: Aircraft Master Data
**Goal**: Aircraft records with MSN, registration, and cost parameters exist in the database and are browsable by users
**Depends on**: Phase 1
**Requirements**: ACFT-01, ACFT-02, ACFT-03, ACFT-04
**Success Criteria** (what must be TRUE):
  1. Aircraft records imported from Excel appear in the system with MSN, type, registration, and all cost parameters
  2. User can search the aircraft list by MSN or registration and find the correct record
  3. User can click an aircraft record and see all associated cost data on a detail page
  4. Admin can update aircraft cost parameters and the changes are reflected immediately
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — DB schema (aircraft, rates, EPR tables), AircraftRepository, Pydantic schemas, Excel seed script, Wave 0 test stubs
- [x] 02-02-PLAN.md — Aircraft API router (list, detail, update), EUR conversion service, 9 tests green
- [x] 02-03-PLAN.md — Frontend aircraft list with search, detail page with cost sections, admin edit, human verify

### Phase 3: Pricing Engine
**Goal**: Users can enter ACMI pricing inputs and receive an accurate EUR/BH cost breakdown that exactly matches the Excel workbook
**Depends on**: Phase 2
**Requirements**: PRIC-01, PRIC-02, PRIC-03, PRIC-04, PRIC-05, PRIC-06, CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. User can enter MGH, Cycle Ratio, Environment, Period, and select an MSN to trigger a calculation
  2. Calculation results display a per-BH cost breakdown for all seven components: Aircraft, Crew, Maintenance, Insurance, DOC, Other COGS, Overhead
  3. User can enter a margin percentage and see the final EUR/BH rate update accordingly
  4. Calculation results update in real-time as the user changes any input field
  5. Calculation output matches the Excel workbook exactly when verified with the same inputs (using test fixtures derived from workbook audit)
  6. Admin can view and update base rates and pricing parameters via the admin page without redeploying the application
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — DB migration (pricing_config, crew_config, projects, MSN inputs), repositories, Pydantic schemas, seed script, mock DB handlers
- [ ] 03-02-PLAN.md — TDD pricing calculation engine: 7 ACMI components, EPR interpolation, crew/lease type matrix, Excel-verified fixtures
- [ ] 03-03-PLAN.md — Pricing API router: calculate endpoint, config CRUD (versioned), crew config CRUD, project management
- [ ] 03-04-PLAN.md — Dashboard Summary page with per-MSN input grid, pricing Zustand store, Server Actions, sidebar updates (P&L + Crew)
- [ ] 03-05-PLAN.md — P&L financial statement page, MSN switcher, margin input, Crew config page, human verify checkpoint

### Phase 4: Quote Persistence and History
**Goal**: Users can save a completed pricing calculation as a named quote and retrieve it later exactly as it was generated
**Depends on**: Phase 3
**Requirements**: QUOT-01, QUOT-02, QUOT-03, QUOT-04, QUOT-05, QUOT-06, SENS-01, SENS-02
**Success Criteria** (what must be TRUE):
  1. User can save a pricing result as a named quote with a client name, and the saved quote displays identically when reopened regardless of subsequent pricing configuration changes
  2. User can view the quote list filtered and sorted by client name, date, or MSN and find any previously saved quote
  3. User can open a saved quote and see the full component-level cost breakdown exactly as it was at the time of saving
  4. User can change a quote's status (Draft, Sent, Accepted, Rejected) from the quote detail or list view
  5. User can export a quote as a PDF with professional formatting suitable for client delivery
  6. User can vary a single input and see a comparison table showing how the EUR/BH rate changes across that input range
**Plans**: TBD

### Phase 5: Polish and Production Readiness
**Goal**: The application is complete, professionally finished, and deployable to a production environment
**Depends on**: Phase 4
**Requirements**: UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. All data tables are sortable and responsive, and detail panes open without full page navigations
  2. User can toggle between dark and light mode from any page, and the preference persists across sessions
  3. Dashboard displays meaningful summary statistics: total quotes, quotes by status, and recent activity feed
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Authentication | 4/4 | Complete | 2026-03-05 |
| 2. Aircraft Master Data | 3/3 | Complete    | 2026-03-05 |
| 3. Pricing Engine | 0/5 | Planned | - |
| 4. Quote Persistence and History | 0/? | Not started | - |
| 5. Polish and Production Readiness | 0/? | Not started | - |
