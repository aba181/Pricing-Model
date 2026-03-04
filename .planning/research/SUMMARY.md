# Project Research Summary

**Project:** ACMI Pricing Platform
**Domain:** Aviation ACMI wet lease pricing — internal CPQ-style web application replacing Excel workbooks
**Researched:** 2026-03-04
**Confidence:** HIGH (stack, architecture, pitfalls), MEDIUM (features — niche domain)

## Executive Summary

This project is a formula-driven pricing calculator that translates an existing Excel workbook into a reliable, auditable web application for an ACMI lessor's internal sales team. The core product is straightforward: given five inputs (MSN, MGH, cycle ratio, operating environment, and contract period), compute a per-block-hour EUR rate across seven cost components (Aircraft, Crew, Maintenance, Insurance, DOC, Other COGS, Overhead) and present the breakdown alongside a margin-adjusted final rate. The architecture follows a well-established FastAPI + Next.js + PostgreSQL pattern with hard constraints that match the AeroVista reference codebase — no technology decisions need to be made, only applied carefully.

The single biggest risk is formula fidelity. The Excel workbook is the contractual benchmark; any divergence between the Python pricing engine and the workbook's output destroys user trust immediately and permanently. This risk is mitigated by treating the pricing engine as an isolated, stateless, fully unit-tested module — completely separate from the API and database layers — and by conducting a full workbook dependency audit before writing a single formula. Floating-point arithmetic must never appear in the pricing pipeline; Python `decimal.Decimal` throughout the engine and PostgreSQL `NUMERIC` columns throughout the schema are non-negotiable.

The secondary risk is quote immutability. This is a legal and commercial quoting tool — quotes must be reproducible exactly as issued, regardless of subsequent changes to pricing configuration rates. This is a schema-level decision that must be made before the first quote is saved. The correct design (store all seven component values plus a foreign key to a versioned pricing config) is straightforward but cannot be retrofitted cheaply after launch. Get it right in the schema design phase and it becomes a non-issue.

---

## Key Findings

### Recommended Stack

The stack is fully constrained to match the AeroVista reference architecture. All core technology decisions are locked; the research task was to identify the correct library versions and reject common antipatterns within those constraints. The main discoveries: python-jose and passlib are both unmaintained and must not be used (use PyJWT 2.11.0 and pwdlib[argon2] 0.3.0 respectively); xlrd does not support `.xlsx` files (use openpyxl 3.1.5); no aviation-specific ACMI pricing libraries exist (the engine is pure `decimal.Decimal` arithmetic); and xlwings requires Excel installed on the host (incompatible with Docker/Linux production servers).

See `.planning/research/STACK.md` for full version table and rationale.

**Core technologies:**
- Python 3.12 + FastAPI 0.115.x: Backend runtime — locked to match AeroVista; asyncio performance improvements in 3.12
- asyncpg 0.31.0: PostgreSQL driver — fastest Python async driver; raw SQL + BaseRepository pattern (no ORM)
- PyJWT 2.11.0: JWT auth — replaces unmaintained python-jose; Python 3.12 compatible
- pwdlib[argon2] 0.3.0: Password hashing — replaces unmaintained passlib; Argon2 is OWASP-recommended
- Python `decimal.Decimal` (stdlib): Pricing arithmetic — mandatory; float arithmetic will produce silent rounding divergence from Excel
- openpyxl 3.1.5: Excel formula extraction — only actively maintained `.xlsx` library; use `data_only=False` to read formula strings
- Next.js 14 (App Router) + TypeScript 5.x: Frontend — locked; Server Components reduce bundle size
- Zustand 4.x: Frontend state — locked; one store per domain
- react-hook-form 7.x + Zod 3.x: Form validation — type-safe input handling for pricing parameters
- PostgreSQL 15+ with `NUMERIC` columns: All monetary and rate values stored as `NUMERIC`, never `FLOAT`

### Expected Features

The feature research found no direct ACMI-specific SaaS competitors — the market relies on proprietary Excel workbooks. Feature priorities are derived from the Excel-to-web-app replacement pattern, ACMI domain analysis, and the PROJECT.md requirements. The critical dependency chain is: MSN master data enables the pricing engine; the pricing engine enables quotes; quotes enable history, status workflow, duplication, and PDF export. Authentication gates everything.

See `.planning/research/FEATURES.md` for full dependency map and prioritization matrix.

**Must have (table stakes — v1 launch):**
- Team authentication (email/password JWT) — proprietary pricing IP must be gated before go-live
- MSN master data management (CRUD) — without aircraft records, the pricing engine has no inputs
- Pricing engine with all components (A, C, M, I, DOC, Other COGS, Overhead) — the core product; must exactly match Excel
- Pricing inputs form (MGH, Cycle Ratio, Environment, Period, MSN with auto-fill)
- Component-level cost breakdown display — single-screen layout showing all cost lines; the primary differentiator from the spreadsheet
- Margin input and EUR/BH final rate output — the headline deliverable
- Quote save with name/reference — named, user-attributed, timestamped saves
- Quote list (sortable, filterable DataTable)
- Quote detail view (read-only, showing saved inputs and breakdown)
- Input validation with clear errors — users are migrating from a spreadsheet that accepted any input silently

**Should have (v1.x — add after core is validated):**
- Quote duplication / clone — highest-value low-effort feature; confirmed by Excel-to-web migration research as the most-requested post-launch addition
- Quote status workflow (Draft / Final / Sent / Won / Lost) — once the quote list is used as a pipeline view
- PDF export for client delivery — once sales begins sending quotes from the tool rather than transcribing to email
- Input validation refinements based on actual usage patterns

**Defer (v2+):**
- Actuals vs. budget comparison — requires separate operational data pipeline; explicitly scoped to v2 per PROJECT.md
- Business Central integration — separate integration milestone; design the quote data model to export cleanly (CSV/JSON) so a future integration layer can consume it
- Aggregated reporting / margin trend dashboards — requires quote volume to be meaningful; build after several months of v1 usage
- Per-component sensitivity display — valuable for negotiation but deferred until sales team requests it
- Advanced RBAC — v1 is a small, trusted team; fine-grained roles become necessary as the team grows

**Explicit anti-features (do not build):**
- Real-time fuel cost pass-through (fuel is lessee's cost in ACMI; not part of the EUR/BH rate)
- Client-facing portal (separate product decision for v3+; deliver via PDF for now)
- AI/dynamic pricing suggestions (no public ACMI market rate data exists; hallucinated suggestions destroy trust)
- Multi-currency output (EUR is the contract standard; add only if repeatedly requested post-launch)
- Mobile native app (web-first per PROJECT.md; complex multi-input quote forms suit desktop/tablet)

### Architecture Approach

The architecture follows a strict layered pattern: Routers handle HTTP only, Services own business rules, Repositories own SQL, and the PricingEngineService is a completely isolated stateless module with no database or HTTP dependencies. This last point is the most important architectural decision: the pricing engine must be callable as `result = engine.generate_quote(inputs, aircraft, config)` with no mocks, no test database, no HTTP client. Every formula function (one per cost component) gets its own pure unit test verifying against known Excel outputs.

The data flow for the core use case is: user fills QuoteInputForm → quoteStore calls POST /api/v1/pricing/calculate → QuoteService pre-fetches aircraft data and active pricing config → PricingEngineService runs all component calculations → QuoteResult returned to frontend → user clicks Save → POST /api/v1/quotes → QuoteRepository persists all seven component values plus inputs and config foreign key.

See `.planning/research/ARCHITECTURE.md` for full system diagram, project structure, schema DDL, and data flow diagrams.

**Major components:**

1. PricingEngineService (services/pricing_engine.py) — stateless pure functions, one per ACMI cost component; translates Excel formulas to Python Decimal arithmetic; no I/O; 100% unit-testable
2. QuoteService + QuoteRepository — orchestrates pre-fetching, calls engine, persists immutable snapshots; enforces the rule that saved quotes are never recalculated on open
3. AircraftRepository + pricing_configs table — MSN master data and versioned pricing configuration; rates are in the database, never hardcoded in Python
4. FastAPI Router layer (api/v1/) — versioned from day one; validation via Pydantic; no business logic
5. Next.js 14 App Shell + Zustand feature stores (quoteStore, aircraftStore, pricingConfigStore, authStore) — one store per domain; API calls live in store actions; components read state only
6. PostgreSQL 15+ with NUMERIC columns — all monetary values as NUMERIC(precision, scale); soft deletes on quotes; indexes on created_by and created_at from day one

### Critical Pitfalls

These are not hypothetical — they are the failure modes most likely to derail this specific project type (Excel-to-web financial calculator in a niche aviation domain).

1. **Rounding divergence from Excel** — Use Python `decimal.Decimal` for ALL intermediate calculations; store all rates and monetary values as PostgreSQL `NUMERIC`, never `FLOAT`; apply rounding only at the final EUR/BH output boundary, not within component functions. A linting check or code review gate before the first formula is written is the cheapest prevention.

2. **Undiscovered Excel formula dependencies (hidden sheets, named ranges, circular references)** — Conduct a full workbook dependency audit before writing any Python: enumerate all named ranges via Name Manager, reveal all hidden sheets, trace all precedent/dependent chains across sheets, identify any circular references that require redesign. The audit is a deliverable, not an assumption. Block pricing engine coding until it is complete and reviewed.

3. **Quote records becoming stale when pricing configuration changes** — Store the full calculation snapshot with every quote: all seven component values as discrete columns, plus a foreign key to the `pricing_config` row used at creation time. Never recalculate a saved quote on open; display stored values. This is a schema-level decision that cannot be cheaply retrofitted.

4. **Block hours vs. flight hours vs. cycles unit confusion** — Document the unit (per BH, per cycle, per month) for every intermediate variable during the workbook audit. Write unit-dimension tests: maintenance cost per BH must increase when cycle ratio decreases; crew cost per BH must not change when cycle ratio changes. Test with extreme cycle ratio values (CR=1.0 for ultra-short haul, CR=8.0 for long haul).

5. **Pricing formulas embedded in application logic** — The pricing engine must be a standalone pure module before any other code is written. If formulas end up in the route handler, they cannot be unit-tested without a running HTTP server and database. When (not if) a formula needs correction, the fix location will be unclear. Enforce the isolation rule before the first formula is written.

6. **MGH sensitivity not applied correctly** — Fixed costs (aircraft lease, crew salaries, insurance) must be divided by `max(actual_hours, MGH)`, not actual_hours alone. Test with actual hours below MGH and verify that per-BH costs increase. This is the core contractual mechanic of ACMI pricing.

---

## Implications for Roadmap

Research strongly supports a five-phase build order that matches the dependency chain: foundation first, then aircraft master data, then the pricing engine (the critical path), then quote persistence, then polish. This order is not negotiable — each phase is a prerequisite for the next. The pricing engine phase carries the most uncertainty and should not begin until the Excel workbook audit is complete.

### Phase 1: Foundation and Authentication

**Rationale:** Authentication gates access to all features. The database schema (specifically the quotes and pricing_configs tables with their immutability requirements) must be designed correctly before any data is stored. Getting both right first means never having to retrofit security or schema structure.

**Delivers:** Working login/logout, JWT-protected route scaffold, asyncpg connection pool, BaseRepository, initial database migrations (users, aircraft, pricing_configs tables with correct NUMERIC column types and immutability design)

**Addresses:** Team authentication (P1 table stakes), input validation foundation

**Avoids:** Security pitfall of adding auth "later"; schema pitfall of non-immutable quote records (design the schema correctly from the start even though quotes table is built in Phase 4)

**Research flag:** Standard patterns — no research needed during planning. FastAPI JWT auth with PyJWT is well-documented. Spend time on schema design review before writing migrations.

### Phase 2: Aircraft / MSN Master Data

**Rationale:** The pricing engine cannot run without aircraft data. MSN master data must exist in the database before any quote can be created. Building this second gives the team something demonstrable (a working CRUD feature) while establishing the data foundation the engine requires.

**Delivers:** Aircraft CRUD API, aircraft list and detail pages, AircraftSelector component, AircraftService + AircraftRepository, aircraft table with MSN/registration/asset_value/monthly_lease_rate columns

**Addresses:** MSN master data management (P1 table stakes), MSN-driven auto-fill (P1 differentiator)

**Avoids:** The temptation to hardcode test aircraft data in the engine (creates cleanup debt)

**Research flag:** Standard patterns — no research needed. CRUD with asyncpg and Next.js DataTable is fully established.

### Phase 3: Pricing Engine (Critical Path)

**Rationale:** This is the core product and the highest-risk phase. The Excel workbook audit must be completed before this phase begins — it is a phase prerequisite, not a task within the phase. The engine must be built formula-by-formula against the workbook, with each component function having its own unit test before the next function is started. This phase cannot be estimated accurately until the workbook has been reviewed.

**Delivers:** Full workbook dependency map (audit deliverable), PricingEngineService with all component functions, pricing_configs table + PricingConfigRepository, unit test suite with Excel-validated fixtures, POST /api/v1/pricing/calculate endpoint, QuoteInputForm + PricingBreakdown + MarginControl frontend components, quoteStore calculateQuote action — "Enter inputs, see EUR/BH breakdown" working end-to-end. Nothing saved yet.

**Addresses:** Pricing engine with all components (P1 table stakes), component-level breakdown display (P1 differentiator), margin input + EUR/BH output (P1 table stakes)

**Avoids:** Rounding divergence (Decimal-only rule enforced at engine module level from the first function), hidden dependency pitfall (workbook audit is a prerequisite), unit confusion (unit-dimension tests alongside numeric tests), monolithic formula function antipattern (one function per component)

**Research flag:** REQUIRES research phase — specifically a thorough workbook audit before development. The Excel formulas are the unknown. All Phase 3 time estimates carry LOW confidence until the workbook is reviewed. Plan for a dedicated workbook audit session with the formula owner before this phase begins.

### Phase 4: Quote Persistence and History

**Rationale:** Once the pricing calculation is trusted (validated against the Excel workbook in Phase 3), saving and retrieving quotes is straightforward. This phase adds the persistence layer that transforms the calculator into an auditable quoting tool.

**Delivers:** quotes table migration (with all seven component columns and pricing_config_id foreign key), QuoteRepository, POST /api/v1/quotes (save) and GET /api/v1/quotes (history) endpoints, Save Quote button in UI, quote history list page, quote detail page (read-only, displaying saved values)

**Addresses:** Quote save with name/reference (P1 table stakes), quote history / audit record (P1 table stakes), quote list with sort/filter (P1 table stakes), quote retrieval / detail view (P1 table stakes)

**Avoids:** Quote immutability pitfall (stored values displayed, never recalculated on open), missing breakdown columns pitfall (all seven components stored as discrete NUMERIC columns), N+1 query in history list (JOIN aircraft data in the history query from day one), missing indexes (add on created_by, created_at DESC at migration time)

**Research flag:** Standard patterns — no research needed. The schema design is specified in ARCHITECTURE.md. Quote repository pattern follows BaseRepository.

### Phase 5: Polish and Production Readiness

**Rationale:** The core product is complete after Phase 4. This phase adds the features that make the tool professional and deployable, plus the operational hardening needed for a tool handling proprietary pricing data.

**Delivers:** Pricing config admin page (update rates without deployment), quote status field (Draft/Final/Sent/Won/Lost), dark/light mode toggle, empty states, loading states, comprehensive error handling, input validation tightening, Docker Compose deployment configuration (FastAPI + Next.js + PostgreSQL + Nginx), deployment documentation

**Addresses:** Dark/light mode (P1 differentiator per AeroVista pattern), quote status workflow (P2 — included here as it is low effort), input validation improvements (P1 table stakes)

**Avoids:** Hardcoded pricing configuration antipattern (admin page makes this a non-issue), UX pitfall of no visible config version (show config name/effective date on quote detail)

**Research flag:** Standard patterns — no research needed. Deployment with Gunicorn + UvicornWorker behind Nginx is documented in STACK.md.

### Phase Ordering Rationale

- **Foundation before everything:** Auth and schema correctness cannot be retrofitted. The immutability design and NUMERIC column types must be established before any data is written.
- **Aircraft before engine:** The engine's inputs reference aircraft-specific data (asset value, monthly lease rate). Seeding aircraft records also provides realistic test data for engine development.
- **Engine before persistence:** Saving an untrusted calculation would seed the database with wrong data. The engine must be validated against the Excel workbook before any quote is saved.
- **Persistence before polish:** The core value proposition (trusted, auditable quotes) must be working before effort is spent on admin UX and deployment configuration.
- **Workbook audit as a hard prerequisite for Phase 3:** This is the single biggest project risk. The audit takes 1–2 days and prevents weeks of debugging wrong formulas.

### Research Flags

Phases requiring deeper research during planning:
- **Phase 3 (Pricing Engine):** The Excel workbook must be audited before any development estimates for this phase are trusted. Key unknowns: number of formula dependencies, presence of hidden sheets or named ranges, existence of circular references, VLOOKUP/INDEX-MATCH table structures. The workbook audit is the research deliverable for this phase.

Phases with well-documented standard patterns (skip research-phase):
- **Phase 1 (Foundation):** FastAPI JWT auth with PyJWT, asyncpg pool setup, and database schema design are all well-documented. The ARCHITECTURE.md file includes the complete DDL for all tables.
- **Phase 2 (Aircraft CRUD):** Standard CRUD pattern with BaseRepository. No aviation-specific complexity at this layer.
- **Phase 4 (Quote Persistence):** Repository pattern is fully specified. Schema is defined in ARCHITECTURE.md. The only complexity is enforcing immutability, which is a design rule not a research question.
- **Phase 5 (Polish):** Docker Compose deployment, Nginx configuration, and Gunicorn setup are all documented in STACK.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack is locked to AeroVista. Library selections (PyJWT, pwdlib, openpyxl) verified against official FastAPI PRs and PyPI. Version compatibility confirmed for Python 3.12. |
| Features | MEDIUM | No direct ACMI SaaS competitors found — features inferred from domain analysis, analogous tools (AeroQuote, Aircraft Cost Calculator), and PROJECT.md requirements. Core P1 features are unambiguous; P2/P3 prioritization is judgment-based. |
| Architecture | HIGH | Derived from AeroVista reference architecture plus well-established FastAPI layered patterns. Database schema design and component boundaries are fully specified with concrete DDL and code examples. |
| Pitfalls | HIGH | Verified across multiple authoritative sources (Python docs, PostgreSQL docs, FastAPI official docs, Excel migration case studies). The pitfalls are specific to this project type (financial calculator, Excel migration) and confirmed by domain analysis. |

**Overall confidence:** HIGH for technical approach; the only genuine uncertainty is the Excel workbook content, which cannot be assessed until the workbook is reviewed.

### Gaps to Address

- **Excel workbook content (Phase 3 blocker):** The workbook has not been reviewed as part of this research. The number and complexity of formula dependencies, hidden sheets, named ranges, and circular references are unknown. All Phase 3 estimates are provisional until a full workbook audit is completed. Resolve by scheduling a workbook audit session before Phase 3 planning.

- **No ACMI-specific Python libraries:** Confirmed that no open-source ACMI pricing libraries exist. The pricing engine is greenfield formula translation. This is a gap in available tooling, not a gap in research — it means the project carries this implementation risk entirely.

- **xlcalculator maintenance status:** Used only as a validation tool for formula translation (not in production). Its maintenance activity is unclear. If it proves unreliable for formula cross-checking, the alternative is manual parallel computation against Excel reference values — more time-consuming but equally valid.

- **PDF export implementation approach:** Deferred to v1.x but not researched in depth. When this phase arrives, decide between server-side PDF generation (WeasyPrint or ReportLab) or print CSS. The constraint of selectively hiding cost components from client-facing PDFs (not exposing margin breakdown) needs a design decision at implementation time.

---

## Sources

### Primary (HIGH confidence)
- FastAPI GitHub PR #11589 — PyJWT migration from python-jose
- FastAPI GitHub PR #13917 — pwdlib/Argon2 migration from passlib
- FastAPI full-stack template PR #1539 — passlib replacement confirmation
- Python 3 official docs — floating point and Decimal precision
- PostgreSQL official docs — NUMERIC vs FLOAT column behavior
- FastAPI official deployment docs — Gunicorn + UvicornWorker configuration
- xlrd GitHub README — explicit statement that .xlsx support removed in v2.0
- AeroVista reference architecture — component structure and naming conventions

### Secondary (MEDIUM confidence)
- SKYbrary — ACMI component definitions (A/C/M/I breakdown)
- Law Insider — ACMI Block Hour Rate contract definition
- IALTA — Maintenance reserve calculation methodology
- ACC Aviation 2025 ACMI Market Insights — market context and rate ranges
- FastAPI layered architecture articles (Medium, dev.to) — service/repository pattern
- AeroQuote, Aircraft Cost Calculator — analogous feature comparison
- openpyxl documentation — formula tokenizer coverage (limited)

### Tertiary (LOW confidence)
- xlcalculator GitHub — formula validation tool; maintenance status unclear
- SpreadsheetWeb Excel-to-web guide — single source for migration feature list
- EASA Software LeasePlan case study — vendor marketing confirming clone/scenario value

---

*Research completed: 2026-03-04*
*Ready for roadmap: yes*
