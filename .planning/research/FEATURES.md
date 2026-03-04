# Feature Research

**Domain:** ACMI wet lease pricing platform (internal tool for ACMI lessors)
**Researched:** 2026-03-04
**Confidence:** MEDIUM — ACMI pricing tooling is a niche, internal domain. No widely-published ACMI-specific pricing SaaS products were found. Feature landscape is inferred from: (a) ACMI domain knowledge, (b) analogous aviation software (AeroQuote, Aircraft Cost Calculator, Leon), (c) the Excel-to-web-app replacement pattern, and (d) PROJECT.md requirements.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the sales and operations team will assume exist from day one. Missing these means the tool is not useful and they return to the spreadsheet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Aircraft/MSN master data list | Every quote must reference a specific tail number with its parameters baked in (aircraft type, config, lease cost basis) | MEDIUM | Must store: MSN, aircraft type/family, registration, entry date, config details. Editing MSN data must not break existing saved quotes. |
| Pricing engine: ACMI component breakdown | The core value of the tool. Produces per-BH cost for A (Aircraft lease cost), C (Crew), M (Maintenance), I (Insurance), DOC, Other COGS, Overhead | HIGH | Formulas come from existing Excel workbook. Engine must be exactly correct — any deviation destroys trust in the tool immediately. |
| Pricing inputs: MGH, Cycle Ratio, Environment, Period, MSN | These five inputs drive the entire calculation in the existing Excel model. Without them there is no output | LOW | MGH = minimum guaranteed hours/month. Cycle ratio = flights per BH (affects maintenance cost). Environment = short-haul/medium/long-haul or similar utilisation context. Period = contract duration (months). |
| Margin input and EUR/BH output | Sales team needs to enter a target margin percentage and see the final client-facing rate in EUR/BH | LOW | Final output = sum of all components + margin. Must be prominently displayed. |
| Quote save and retrieve | Users must be able to name, save, and later reopen any quote. Without this it is just a calculator, not a tool | MEDIUM | Minimum: save with a name/reference, list all saved quotes, open and review any past quote. |
| Quote history / audit record | Saved quotes must be immutable records. If inputs change, a new quote is created rather than overwriting the old one | MEDIUM | Critical for sales accountability: "what rate did we quote airline X in March?" must be answerable. |
| Team authentication | Login required — this is proprietary pricing IP. Without auth, anyone can access rates | LOW | Email/password per PROJECT.md. bcrypt password hashing, JWT session tokens. No OAuth for v1. |
| Input validation with clear error messages | Users entering invalid values (negative MGH, impossible cycle ratios) must get immediate feedback, not silent wrong results | LOW | Frontend validation + backend validation. Especially important given the Excel migration — users are used to the spreadsheet "just letting them type anything." |
| Responsive data table for quote list | Users need to scan, sort, and filter saved quotes by date, aircraft, client, status | MEDIUM | Standard DataTable component per AeroVista pattern. Sort by date, filter by MSN/aircraft type. |

### Differentiators (Competitive Advantage)

Features that make this tool meaningfully better than the Excel workbook it replaces, or better than generic tools. Focus on what actually matters to this team.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Component-level cost visibility | Show the breakdown by line (A, C, M, I, DOC, COGS, Overhead, Total, Margin, Final Rate) on the same screen as inputs. Excel had this buried across sheets | LOW | Single-screen layout: inputs left, cost breakdown right. Immediately shows which component drives total cost. Eliminates "I have to navigate 5 sheets to understand this quote." |
| Quote duplication ("clone and adjust") | Sales generates many quotes for the same aircraft with small variations. Copying a quote and tweaking one input saves significant time | LOW | Clone button on any quote. Pre-fills all inputs. User adjusts and saves as new quote. This is the most-requested feature in Excel-to-web-app migrations. |
| MSN-driven auto-fill | Selecting an MSN pre-populates all aircraft-specific parameters (lease cost, type, config), reducing data entry errors | MEDIUM | Depends on quality of MSN master data. Reduces human error on the most consequential inputs. |
| Quote status workflow | Simple status tags: Draft, Final, Sent, Won, Lost. Gives ops visibility into pipeline without a full CRM | LOW | Not a CRM replacement. Just enough status to answer "which quotes are live?" At this scope: enum field on quote, filter in list view. |
| Per-component sensitivity display | Show what the EUR/BH rate becomes if MGH changes by +/- 5% or 10%. Helps sales understand margin risk | MEDIUM | Can be implemented as a simple "sensitivity row" below the main output. Particularly valuable for negotiation: "if client wants 10% fewer hours, our rate needs to go up by X." |
| Quote PDF export | Sales team sends rates to airline clients. A clean PDF with the company header, quote reference, aircraft details, and EUR/BH rate is required for professional client delivery | MEDIUM | The breakdown detail shown in the PDF should be configurable (may not want to expose cost components to client, only final rate). Use a server-side rendering approach or a well-structured print CSS. |
| Dark/light mode | Per AeroVista pattern and PROJECT.md requirement. Reduces eye strain for ops teams working long shifts | LOW | Tailwind CSS `dark:` variants, system-preference detection, manual toggle. Already proven in AeroVista. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly NOT build in v1. These are tempting but will expand scope without delivering the core value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Actuals vs. budget comparison | "If we track quotes and actuals we can see our margin performance" | Requires ingesting operational data (flight logs, invoices) — a completely different data pipeline. Doubles the project scope. Explicitly deferred per PROJECT.md. | Build the pricing model correctly in v1. Add actuals tracking as a separate v2 milestone once pricing proves trustworthy. |
| Business Central / ERP integration | "Push quotes directly to our accounting system" | BC integration is a separate integration project. Requires BC API expertise, data mapping, approval workflows. Cannot be done correctly as part of a pricing v1. | Design quote data model so it exports cleanly (CSV/JSON). Integration layer can consume this in a future milestone. |
| Real-time fuel cost pass-through | "ACMI rates change with fuel — can we auto-update?" | In ACMI, fuel is the lessee's cost (not included in the A/C/M/I rate). Fuel pass-through is contractually separate. Adding live fuel pricing would build the wrong mental model. | Keep fuel out of the pricing engine entirely. The EUR/BH rate the tool produces is the lessor's cost + margin, not the all-in cost. |
| Client-facing portal | "Airlines could log in and see their own rates" | Completely different product (external-facing, multi-tenant, data isolation concerns, client onboarding). Not what this team needs right now. | Deliver quotes as PDFs. Client portal is a separate product decision for v3+. |
| Dynamic/AI pricing suggestions | "Can it recommend a margin based on market rates?" | No public data source for ACMI market rates exists. AI suggestions without reliable training data produce hallucinated recommendations that erode trust. | Support the pricing team's judgment with good tooling. Leave margin as a human decision. |
| Mobile app | "Sales team needs this on their phone" | Web-first per PROJECT.md. Building native mobile in parallel fragments effort. The use case (generate a detailed multi-input quote) is better suited to desktop/tablet. | Ensure responsive web design works on tablet if needed. Full mobile app is a v3+ consideration. |
| Full financial reporting / P&L dashboards | "We want to see margin trends across all quotes" | Reporting across many quotes requires aggregation, date filtering, chart infrastructure. Not needed to validate that the pricing engine is correct. | Defer. Once v1 proves the pricing model is trusted, aggregated reporting becomes valuable. |
| Multi-currency output | "Some clients want rates in USD" | EUR is the contract standard per PROJECT.md. Adding multi-currency requires exchange rate management, historical rate storage, and display complexity. | Store and display EUR only. If a client needs USD, the sales team converts manually. Add currency support if this is raised repeatedly post-launch. |
| Email/notification system | "Notify the team when a quote status changes" | Email infrastructure (SMTP, templates, bounce handling) is significant scope for a team that is physically co-located and can just check the tool. | Status is visible in the quote list. Add notifications in v2 if the team grows remote. |

---

## Feature Dependencies

```
[MSN Master Data]
    └──required by──> [Pricing Engine]
                          └──required by──> [Quote Save/Retrieve]
                                                └──required by──> [Quote History / Audit Record]
                                                └──required by──> [Quote Status Workflow]
                                                └──required by──> [Quote Duplication]
                                                └──required by──> [Quote PDF Export]

[Team Authentication]
    └──gates access to──> [All Features]

[MSN Master Data]
    └──enables──> [MSN Auto-fill on Quote Form]

[Pricing Engine]
    └──enables──> [Component-Level Cost Visibility]
    └──enables──> [Per-Component Sensitivity Display]

[Quote Save/Retrieve]
    └──enables──> [Quote Status Workflow]
    └──enables──> [Quote Duplication]
    └──enables──> [Quote PDF Export]
```

### Dependency Notes

- **Pricing Engine requires MSN Master Data:** Engine inputs reference MSN-specific parameters (aircraft lease cost basis, type config). You cannot price a quote without knowing what aircraft it is.
- **Quote Save requires Pricing Engine:** A saved quote must capture the full breakdown at time of saving, not just inputs. If inputs change later (e.g. MSN data updated), the saved quote must still show the original figures.
- **Quote History requires Save:** History is a consequence of saving — each saved quote is an immutable record. There is no history without first building save correctly.
- **Auth gates everything:** The entire application sits behind authentication. Auth must be in place before any other feature is useful in production.
- **PDF Export requires Save:** The export represents a finalised quote. It should only be available on saved (not just calculated) quotes to prevent exporting unsaved work.
- **Sensitivity Display requires Pricing Engine:** It re-runs the engine with modified inputs. The engine API must be callable independently of the form submission.

---

## MVP Definition

### Launch With (v1)

Minimum set to replace the Excel workbook and deliver value to the sales team.

- [ ] **Team authentication (email/password)** — Must be gated before going live; this is proprietary pricing data.
- [ ] **MSN master data management** — CRUD for aircraft records. Without this, pricing has no foundation.
- [ ] **Pricing engine with all components** — A, C, M, I, DOC, Other COGS, Overhead, translated exactly from Excel. This is the core product.
- [ ] **Pricing inputs form** — MGH, Cycle Ratio, Environment, Period, MSN selector with auto-fill.
- [ ] **Component-level breakdown display** — Show all cost lines plus margin and final EUR/BH rate on one screen.
- [ ] **Margin input** — Percentage input producing final rate; must be editable without re-entering other inputs.
- [ ] **Quote save with name/reference** — Named saves, attached to authenticated user, timestamped.
- [ ] **Quote list view** — Sortable, filterable list of all saved quotes.
- [ ] **Quote retrieval / detail view** — Open any saved quote and see all inputs + breakdown exactly as saved.

### Add After Validation (v1.x)

Add these once the core pricing engine is trusted and in daily use.

- [ ] **Quote duplication (clone)** — Add when user feedback confirms it is a common workflow need; low effort, high value once the save/retrieve loop is in place.
- [ ] **Quote status workflow (Draft/Final/Sent/Won/Lost)** — Add when the team starts using the quote list as a pipeline view rather than just an archive.
- [ ] **PDF export** — Add when sales team begins sending client quotes from the tool rather than transcribing to email.
- [ ] **Input validation improvements** — Tighten based on what errors the team actually makes in practice.

### Future Consideration (v2+)

Defer until v1 proves value and the product roadmap is extended.

- [ ] **Actuals vs. budget comparison** — Requires separate operational data pipeline. Explicitly scoped to v2 per PROJECT.md.
- [ ] **Per-component sensitivity display** — Valuable for negotiations but requires additional UI work. Add when the sales team reports needing it.
- [ ] **Business Central integration** — Separate integration milestone. Depends on v1 success per PROJECT.md.
- [ ] **Aggregated reporting / margin trend dashboards** — Requires quote volume to be meaningful. Build after the team has been using the tool for several months.
- [ ] **Advanced role-based permissions** — v1 is a small, trusted team. Fine-grained roles become necessary when the team grows or the tool expands to other departments.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Team authentication | HIGH | LOW | P1 |
| MSN master data management | HIGH | MEDIUM | P1 |
| Pricing engine (all components) | HIGH | HIGH | P1 |
| Pricing inputs form with auto-fill | HIGH | MEDIUM | P1 |
| Component-level breakdown display | HIGH | LOW | P1 |
| Margin input + EUR/BH output | HIGH | LOW | P1 |
| Quote save and retrieve | HIGH | MEDIUM | P1 |
| Quote list with sort/filter | HIGH | MEDIUM | P1 |
| Input validation | MEDIUM | LOW | P1 |
| Quote duplication | HIGH | LOW | P2 |
| Quote status workflow | MEDIUM | LOW | P2 |
| PDF export | HIGH | MEDIUM | P2 |
| Per-component sensitivity display | MEDIUM | MEDIUM | P2 |
| Actuals comparison | HIGH | HIGH | P3 |
| Business Central integration | HIGH | HIGH | P3 |
| Aggregated reporting / dashboards | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add after core is validated
- P3: Future milestone

---

## Competitor Feature Analysis

No direct public ACMI-specific pricing SaaS tools were identified. The market appears to rely on proprietary Excel workbooks (as this project describes) or general aviation ops platforms that are adjacent but not equivalent. The closest analogues researched are:

| Feature | AeroQuote (charter quoting) | Aircraft Cost Calculator (ownership analytics) | This Tool (ACMI pricing) |
|---------|------------|------------|---------|
| Cost component breakdown | Fuel, airport fees, maintenance, insurance (per-trip) | Variable, fixed, long-term costs (per-aircraft-type) | A, C, M, I, DOC, COGS, Overhead (per-BH rate card) |
| Aircraft data | Per-trip routing and aircraft selection | 500+ airframe database with real-world specs | MSN-level records for own fleet (lessor's specific aircraft) |
| Quote save/history | Yes — booking management | Session-based saves | Yes — required from v1 |
| PDF/report export | Branded quote documents | 9 report types, custom branding | Planned for v1.x |
| Multi-user / auth | Yes (operator + broker roles) | Account-based | Team auth, v1 email/password |
| Margin visibility | Yes — profit margin per quote | Charter revenue projections | Yes — explicit margin input and final rate |
| Scenario comparison | Not mentioned | Side-by-side aircraft comparison | Sensitivity display deferred to v1.x |
| Integration | Booking, ops management | Financing tools | BC integration deferred to v2 |

**Key distinction:** Existing tools serve charter operators (per-trip quoting) or aircraft purchasers (ownership analytics). Neither serves an ACMI lessor's internal need: generate a per-block-hour cost rate for a specific MSN on a specific contract configuration, across the lessor's own cost structure (crew salaries, insurance premiums, maintenance reserves). This is a niche internal tool, not a market tool.

---

## Sources

- [ACC Aviation — 2025 ACMI Market Insights](https://accaviation.com/2025-acmi-market-insight-and-the-evolving-role-of-intermediaries-in-acmi-leasing/) — ACMI market context and block hour rate ranges
- [SKYbrary — ACMI Definition](https://skybrary.aero/articles/aircraft-crew-maintenance-and-insurance-acmi) — Authoritative breakdown of A/C/M/I components (MEDIUM confidence)
- [Law Insider — ACMI Block Hour Rate Definition](https://www.lawinsider.com/dictionary/acmi-block-hour-rate) — Contract definition of MGH and block hour billing (MEDIUM confidence)
- [IALTA — Maintenance Reserve Funds](https://ialta.aero/aircraft-maintenance-reserve-funds-in-aircraft-leasing) — Maintenance reserve calculation methodology: cost per event / interval (MEDIUM confidence)
- [AeroQuote](https://aeroquote.com/) — Analogous charter quoting tool; features inform differentiator analysis (MEDIUM confidence)
- [Aircraft Cost Calculator](https://www.aircraftcostcalculator.com/) — Analogous aircraft cost analytics; features inform prioritization (MEDIUM confidence)
- [Symson — Excel Pricing Model Challenges](https://www.symson.com/blog/the-8-most-important-challenges-of-pricing-models-in-excel) — The 8 critical problems with Excel-based pricing; informs anti-features and migration requirements (MEDIUM confidence)
- [SpreadsheetWeb — Excel to Web App Pricing Tool Guide](https://spreadsheetweb.com/excel-to-web-apps-step-by-step-guide-to-building-a-pricing-tool/) — Required features when migrating pricing spreadsheets to web apps (LOW confidence — single source)
- [EASA Software — LeasePlan Case Study](https://easasoftware.com/case-studies/leaseplan-transforming-scenario-pricing-models-spreadsheet-tools-into-enterprise-web-applications) — Scenario pricing model migrated from spreadsheet; confirms clone/scenario features are high-value (LOW confidence — vendor marketing)
- [Fly2Sky — ACMI Models](https://www.fly2sky.aero/article/aircraft-wet-lease-or-acmi-models) — ACMI rate structure and MGH billing model (MEDIUM confidence)

---
*Feature research for: ACMI wet lease pricing platform*
*Researched: 2026-03-04*
