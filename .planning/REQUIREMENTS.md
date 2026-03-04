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

- [ ] **ACFT-01**: System stores aircraft records imported from Excel (MSN, type, registration, cost parameters)
- [ ] **ACFT-02**: User can view list of aircraft with search by MSN or registration
- [ ] **ACFT-03**: User can view aircraft detail with associated cost data
- [ ] **ACFT-04**: Admin can update aircraft cost parameters

### Pricing Engine

- [ ] **PRIC-01**: User can enter pricing inputs: MGH, Cycle Ratio, Environment, Period, MSN
- [ ] **PRIC-02**: System calculates per-BH cost for each component: Aircraft, Crew, Maintenance, Insurance, DOC, Other COGS, Overhead
- [ ] **PRIC-03**: User can enter margin percentage and see final EUR/BH rate
- [ ] **PRIC-04**: Calculation results update in real-time as inputs change
- [ ] **PRIC-05**: Calculation output matches Excel workbook exactly (verified with test fixtures)
- [ ] **PRIC-06**: All monetary calculations use Decimal precision (never floating-point)

### Pricing Configuration

- [ ] **CONF-01**: Admin can view and update base rates and pricing parameters via admin page
- [ ] **CONF-02**: Pricing config changes are versioned (old quotes reference the config version they were created with)
- [ ] **CONF-03**: System prevents config changes from altering previously saved quotes

### Sensitivity Analysis

- [ ] **SENS-01**: User can vary a single input parameter and see how the EUR/BH rate changes
- [ ] **SENS-02**: Sensitivity results display as a comparison table or chart

### Quote Management

- [ ] **QUOT-01**: User can save a completed pricing calculation as a named quote with client name
- [ ] **QUOT-02**: Saved quotes are immutable (original calculation preserved exactly as generated)
- [ ] **QUOT-03**: User can view list of saved quotes with search and filter (by client, date, MSN)
- [ ] **QUOT-04**: User can view full detail of a saved quote including all component breakdowns
- [ ] **QUOT-05**: User can set quote status: Draft, Sent, Accepted, Rejected
- [ ] **QUOT-06**: User can export a quote as PDF with professional formatting

### UI / UX

- [ ] **UI-01**: Application has sidebar navigation with pages: Dashboard, Pricing, Quotes, Aircraft, Admin
- [ ] **UI-02**: Data displayed in responsive, sortable tables with detail panes
- [ ] **UI-03**: Dark/light mode toggle persisted per user
- [ ] **UI-04**: Dashboard shows summary stats: total quotes, quotes by status, recent activity
- [ ] **UI-05**: Application matches AeroVista visual style (Tailwind, Zustand, component patterns)

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
| UI-01 | Phase 1 | Pending |
| UI-05 | Phase 1 | Pending |
| ACFT-01 | Phase 2 | Pending |
| ACFT-02 | Phase 2 | Pending |
| ACFT-03 | Phase 2 | Pending |
| ACFT-04 | Phase 2 | Pending |
| PRIC-01 | Phase 3 | Pending |
| PRIC-02 | Phase 3 | Pending |
| PRIC-03 | Phase 3 | Pending |
| PRIC-04 | Phase 3 | Pending |
| PRIC-05 | Phase 3 | Pending |
| PRIC-06 | Phase 3 | Pending |
| CONF-01 | Phase 3 | Pending |
| CONF-02 | Phase 3 | Pending |
| CONF-03 | Phase 3 | Pending |
| QUOT-01 | Phase 4 | Pending |
| QUOT-02 | Phase 4 | Pending |
| QUOT-03 | Phase 4 | Pending |
| QUOT-04 | Phase 4 | Pending |
| QUOT-05 | Phase 4 | Pending |
| QUOT-06 | Phase 4 | Pending |
| SENS-01 | Phase 4 | Pending |
| SENS-02 | Phase 4 | Pending |
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
