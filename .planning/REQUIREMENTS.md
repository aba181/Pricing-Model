# Requirements: ACMI Pricing Platform

**Defined:** 2026-03-04
**Core Value:** Accurate, repeatable ACMI pricing quotes that sales teams can generate, save, and retrieve — replacing manual spreadsheet-based pricing.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can log in with company email and password
- [x] **AUTH-02**: User session persists across browser refresh (JWT)
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: Admin can create and manage user accounts (no self-signup)

### Aircraft Data

- [x] **ACFT-01**: System stores aircraft records imported from Excel (MSN, type, registration, cost parameters)
- [x] **ACFT-02**: User can view list of aircraft with search by MSN or registration
- [x] **ACFT-03**: User can view aircraft detail with associated cost data
- [x] **ACFT-04**: Admin can update aircraft cost parameters

### Pricing Engine

- [x] **PRIC-01**: User can enter pricing inputs: MGH, Cycle Ratio, Environment, Period, MSN
- [x] **PRIC-02**: System calculates per-BH cost for each component: Aircraft, Crew, Maintenance, Insurance, DOC, Other COGS, Overhead
- [x] **PRIC-03**: User can enter margin percentage and see final EUR/BH rate
- [x] **PRIC-04**: Calculation results update in real-time as inputs change
- [x] **PRIC-05**: Calculation output matches Excel workbook exactly (verified with test fixtures)
- [x] **PRIC-06**: All monetary calculations use Decimal precision (never floating-point)

### Pricing Configuration

- [x] **CONF-01**: Admin can view and update base rates and pricing parameters via admin page
- [x] **CONF-02**: Pricing config changes are versioned (old quotes reference the config version they were created with)
- [x] **CONF-03**: System prevents config changes from altering previously saved quotes

### Sensitivity Analysis

- [x] **SENS-01**: User can vary a single input parameter and see how the EUR/BH rate changes
- [x] **SENS-02**: Sensitivity results display as a comparison table or chart

### Quote Management

- [x] **QUOT-01**: User can save a completed pricing calculation as a named quote with client name
- [x] **QUOT-02**: Saved quotes are immutable (original calculation preserved exactly as generated)
- [x] **QUOT-03**: User can view list of saved quotes with search and filter (by client, date, MSN)
- [x] **QUOT-04**: User can view full detail of a saved quote including all component breakdowns
- [x] **QUOT-05**: User can set quote status: Draft, Sent, Accepted, Rejected
- [ ] **QUOT-06**: User can export a quote as PDF with professional formatting

### UI / UX

- [x] **UI-01**: Application has sidebar navigation with pages: Dashboard, Pricing, Quotes, Aircraft, Admin
- [ ] **UI-02**: Data displayed in responsive, sortable tables with detail panes
- [ ] **UI-03**: Dark/light mode toggle persisted per user
- [ ] **UI-04**: Dashboard shows summary stats: total quotes, quotes by status, recent activity
- [x] **UI-05**: Application matches AeroVista visual style (Tailwind, Zustand, component patterns)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Actuals Comparison

- **ACTV-01**: User can upload Excel file with actual operational cost data
- **ACTV-02**: System displays comparison of quoted vs actual costs per contract
- **ACTV-03**: User can identify pricing model gaps (missing or irrelevant costs)

### Quote Enhancement

- **QUOT-07**: User can clone/duplicate an existing quote with modified inputs
- **QUOT-08**: User can add notes and attachments to quotes

### Integration

- **INTG-01**: System syncs financial data from Business Central Dynamics
- **INTG-02**: System provides monthly financial performance reporting

### Advanced Auth

- **AUTH-05**: Azure AD / SSO integration for enterprise login
- **AUTH-06**: Role-based access control with granular permissions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fuel cost calculation | Fuel is the lessee's cost, not the lessor's — does not belong in ACMI pricing |
| Real-time aircraft tracking | Not relevant to pricing; belongs in operations tools |
| Mobile app | Web-first; mobile deferred indefinitely |
| Multi-currency support | All ACMI contracts in EUR for this market |
| Self-service signup | Controlled company access only |
| Component-level tracking (engines, APU, LG) | v1 uses aircraft-level costs from Excel; component tracking is AeroVista's domain |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| UI-05 | Phase 1 | Complete |
| ACFT-01 | Phase 2 | Complete |
| ACFT-02 | Phase 2 | Complete |
| ACFT-03 | Phase 2 | Complete |
| ACFT-04 | Phase 2 | Complete |
| PRIC-01 | Phase 3 | Complete |
| PRIC-02 | Phase 3 | Complete |
| PRIC-03 | Phase 3 | Complete |
| PRIC-04 | Phase 3 | Complete |
| PRIC-05 | Phase 3 | Complete |
| PRIC-06 | Phase 3 | Complete |
| CONF-01 | Phase 3 | Complete |
| CONF-02 | Phase 3 | Complete |
| CONF-03 | Phase 3 | Complete |
| QUOT-01 | Phase 4 | Complete |
| QUOT-02 | Phase 4 | Complete |
| QUOT-03 | Phase 4 | Complete |
| QUOT-04 | Phase 4 | Complete |
| QUOT-05 | Phase 4 | Complete |
| QUOT-06 | Phase 4 | Pending |
| SENS-01 | Phase 4 | Complete |
| SENS-02 | Phase 4 | Complete |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after roadmap creation — all requirements mapped*
