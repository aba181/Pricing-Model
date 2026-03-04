# ACMI Pricing Platform

## What This Is

A web application for generating ACMI (Aircraft, Crew, Maintenance, Insurance) lease pricing quotes. Sales and operations teams enter aircraft and operational parameters to get a per-Block-Hour cost breakdown across all ACMI components, add a margin, and produce a EUR/BH rate to charge airline clients. Built to replace a complex Excel workbook with a proper multi-user web application.

## Core Value

Accurate, repeatable ACMI pricing quotes that the sales team can generate, save, and retrieve — replacing manual spreadsheet-based pricing with a structured tool that produces consistent results.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Aircraft/MSN master data management
- [ ] ACMI pricing engine (formula-based, translated from existing Excel workbook)
- [ ] Pricing inputs: MGH, Cycle Ratio, Environment, Period, MSN
- [ ] Per-BH cost breakdown: Aircraft, Crew, Maintenance, Insurance, DOC, Other COGS, Overhead
- [ ] Margin input (percentage) producing final EUR/BH rate
- [ ] Quote saving and retrieval (history)
- [ ] Team authentication (login required)
- [ ] AeroVista-style UI: sidebar navigation, detail panes, dark/light mode

### Out of Scope

- Actuals comparison (Excel upload) — deferred to v2, after pricing model proves value
- Business Central Dynamics integration — future milestone, depends on v1 success
- Full financial reporting — future milestone, larger scope
- Real-time aircraft tracking — not relevant to pricing
- Mobile app — web-first
- OAuth/SSO — email/password sufficient for v1

## Context

- **Reference application:** AeroVista Asset Management Platform (irakli934/Asset-Management-App) — same team built this; want identical tech stack, architecture, and UI patterns
- **Existing pricing logic:** Complex Excel workbook with many interconnected sheets containing all ACMI pricing formulas. Will be provided during development for formula extraction.
- **Domain:** ACMI wet leasing — lessor provides aircraft + crew + maintenance + insurance to airline clients, charged per block hour
- **Future vision:** This pricing module is phase 1 of a larger financial platform. Success here leads to actuals tracking, Business Central integration, and company-wide financial reporting.
- **Pricing components:** A (Aircraft), C (Crew), M (Maintenance), I (Insurance), DOC (Direct Operating Costs), Other COGS, Overhead — each calculated separately, summed, then margin applied

## Constraints

- **Tech stack:** FastAPI (Python 3.12+) + Next.js 14 + TypeScript + Tailwind CSS + PostgreSQL 15+ with asyncpg (raw SQL, no ORM) — must match AeroVista architecture
- **State management:** Zustand (matching AeroVista pattern)
- **Database pattern:** Raw SQL via asyncpg with BaseRepository pattern — no ORM
- **UI pattern:** Sidebar nav, detail panes, dark/light mode, StatusBadge/StatCard/DataTable components — AeroVista style
- **Currency:** EUR for all pricing outputs
- **Spreadsheet dependency:** Pricing formulas will be extracted from provided Excel workbook — development of pricing engine depends on receiving this file

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Match AeroVista stack exactly | Team familiarity, proven architecture, consistent codebase | — Pending |
| Raw SQL over ORM | Performance, full query control, matches existing pattern | — Pending |
| v1 = pricing + save only | Prove value before adding actuals comparison | — Pending |
| EUR as pricing currency | Standard for ACMI contracts in this market | — Pending |

---
*Last updated: 2026-03-04 after initialization*
