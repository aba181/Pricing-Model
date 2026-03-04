# Pitfalls Research

**Domain:** ACMI Pricing Platform (Excel-to-web financial calculator, aviation domain)
**Researched:** 2026-03-04
**Confidence:** HIGH — findings verified across official documentation, industry sources, and direct domain analysis

---

## Critical Pitfalls

### Pitfall 1: Rounding Behavior Divergence from Excel

**What goes wrong:**
The web application produces numbers that differ from the Excel workbook by small but commercially significant amounts — typically fractions of a EUR/BH that compound into material cost differences on multi-month ACMI contracts. The app "looks correct" but pricing decisions made from it diverge from the validated Excel model.

**Why it happens:**
Excel uses its own rounding rules (ROUND, ROUNDUP, ROUNDDOWN behave differently) and stores intermediate values at full IEEE 754 double-precision. Python `float` types are also IEEE 754 doubles, but intermediate rounding applied at different stages than Excel causes divergence. If Python's `decimal.Decimal` is not used consistently, or if PostgreSQL `NUMERIC` columns are mixed with `FLOAT` columns anywhere in the pipeline, tiny differences accumulate. The chain is: Python `float` intermediate → PostgreSQL `double precision` storage → Python `float` retrieval → final display. Every float-to-decimal boundary is a potential divergence point.

**How to avoid:**
- Use Python `decimal.Decimal` for ALL calculations in the pricing engine, never `float`
- Store all monetary and rate values in PostgreSQL as `NUMERIC(precision, scale)` — never `FLOAT`, `REAL`, or `DOUBLE PRECISION`
- Map every `ROUND()`, `ROUNDUP()`, `ROUNDDOWN()`, `INT()`, `CEILING()`, `FLOOR()` in the Excel workbook explicitly; translate each to the correct Python/Decimal equivalent with matching semantics
- Apply rounding ONLY at the final output step (EUR/BH rate), not at intermediate calculation steps — matches Excel's full-precision intermediate behaviour
- Never round inside the pricing engine functions; return full-precision Decimal, round only at the serialisation boundary

**Warning signs:**
- Component totals that match Excel individually but the final EUR/BH diverges by €0.01–0.50
- Different results when the same inputs are entered in a different order
- Results that match on round-number inputs but diverge on fractional inputs (e.g., 2.5 cycle ratio)
- PostgreSQL `FLOAT` or `REAL` column types anywhere in the pricing schema

**Phase to address:**
Pricing engine implementation phase. Must be enforced before any formula is written. Establish a `Decimal`-only rule in the engine module and write a linting check or code review gate before first formula is implemented.

---

### Pitfall 2: Undiscovered Excel Formula Dependencies (Hidden Sheets, Named Ranges, Circular References)

**What goes wrong:**
During formula extraction, developers transcribe the "visible" formulas from the workbook but miss hidden sheets, named ranges acting as configuration constants, or iteratively-calculated circular references that Excel resolves silently with its iterative calculation setting enabled. The pricing engine is incomplete without these, but it produces plausible-looking (wrong) results.

**Why it happens:**
Complex ACMI pricing workbooks routinely use:
- Named ranges as configuration constants (e.g., `InsuranceRate = 0.0045`) — not visible in formula cells
- Hidden sheets containing rate tables, lookup arrays, and sensitivity factors
- VLOOKUP/INDEX-MATCH against range tables that become database lookup tables but whose exact range boundaries are unclear
- Circular references that Excel handles via iterative calculation (enable under File > Options > Formulas > Iterative Calculation) — these cannot be directly translated to Python without redesign
- Dependency chains spanning 5–8 sheets where a change in sheet 1 feeds sheet 4 which feeds sheet 7

**How to avoid:**
- Before any development begins, conduct a full workbook audit: use Excel's Name Manager (Formulas > Name Manager) to enumerate ALL named ranges; show all hidden sheets; use Formulas > Trace Dependents/Precedents to map the full dependency tree
- Produce a written dependency map documenting every input → intermediate → output chain before writing a single line of Python
- Identify any circular references explicitly and design explicit iterative algorithms (e.g., Newton-Raphson) to replace them — do not attempt to reproduce Excel's iterative mode
- Tag every VLOOKUP/INDEX-MATCH target range as a future database table and document the exact range semantics (exact match vs. approximate match, sort order requirements)
- Keep the original Excel file open alongside development for continuous spot-checking

**Warning signs:**
- Named constants that appear in formulas but are not defined anywhere in the codebase
- A formula result that is exactly an integer or suspiciously round number — may be a lookup hitting a hidden table
- Calculation results that are correct for simple test cases but wrong for edge cases (extreme MGH, very high cycle ratio)
- Any formula containing `INDIRECT()`, `OFFSET()`, or `INDIRECT(ADDRESS(...))` — these are especially opaque

**Phase to address:**
Pre-development discovery phase (before pricing engine implementation). The workbook audit must be a deliverable, not an assumption. Block pricing engine coding until the dependency map is complete and reviewed.

---

### Pitfall 3: Block Hours vs. Flight Hours vs. Cycles Confusion in Formula Translation

**What goes wrong:**
Cost components are calculated on different bases — some per block hour, some per flight cycle, some per calendar month — and the Excel workbook silently converts between them using the cycle ratio and utilisation inputs. When translating formulas, developers misread which base is being used for a given component, producing costs that are correct in shape but wrong in magnitude.

**Why it happens:**
ACMI pricing has genuine complexity here:
- **Block hours**: Gate-to-gate including taxi. All ACMI contract rates are expressed per BH.
- **Flight cycles**: One takeoff + landing. Engine LLP costs, airframe structural checks, and landing gear are cycle-driven, not hour-driven.
- **Cycle ratio (CR)**: The ratio of flight hours to flight cycles. High CR = long sectors (fewer cycles per hour). Low CR = short sectors (more cycles per hour, higher maintenance cost per BH).
- **MGH (Minimum Guaranteed Hours)**: Monthly contracted minimum. Under-utilisation still incurs this cost.
- Maintenance components (M) and DOC components may blend hour-based and cycle-based costs, with the cycle ratio acting as a converter.

The formula `cost_per_BH = (cost_per_cycle × cycles_per_BH)` is trivial but requires knowing that `cycles_per_BH = 1 / cycle_ratio`. Getting this inverted or applied to the wrong component is a silent error.

**How to avoid:**
- Document the unit (per BH, per cycle, per month, per flight, per year) for every intermediate variable during the workbook audit
- In Python, encode units in variable names or comments: `engine_llp_cost_per_cycle`, `airframe_check_cost_per_bh`, `crew_cost_per_month`
- Write unit-assertion tests: if a result should be `EUR/BH`, trace every input through its unit conversions and verify algebraically
- Test with extreme cycle ratio values (CR = 1.0 for ultra-short haul; CR = 8.0 for long haul) and verify that M costs move in the expected direction (higher M cost per BH at low CR)

**Warning signs:**
- Maintenance cost per BH does not change when cycle ratio changes (means cycle ratio is not applied to M component)
- Crew cost per BH changes when cycle ratio changes (means cycle ratio is incorrectly applied to crew, which should be hour-based)
- Results with CR = 2.0 look exactly double CR = 1.0 results (suggests CR is applied linearly when it should be applied as a ratio)

**Phase to address:**
Pricing engine implementation. Include unit-dimension tests as part of the test suite alongside numeric correctness tests.

---

### Pitfall 4: Quote Records Becoming Stale When Pricing Configuration Changes

**What goes wrong:**
A quote is saved with inputs and a final EUR/BH result. Six months later, the maintenance rate tables or insurance factors in the database are updated. The saved quote, when reopened, either recalculates with new factors (showing a different number than was originally presented to the client) or displays the old number but the system cannot explain how it was calculated. In either case, the system is untrustworthy for contract negotiations.

**Why it happens:**
Developers treat quotes as live recalculations rather than immutable snapshots. The natural database design — store inputs, recalculate on open — makes sense for a calculator but breaks for a quoting tool. ACMI contracts are legal documents; the EUR/BH rate agreed in April must be reproducible in November even if rates have changed.

**How to avoid:**
- Store the FULL calculation snapshot with each quote: all inputs, all intermediate component values (A/BH, C/BH, M/BH, I/BH, DOC/BH, Other COGS/BH, Overhead/BH), and the final EUR/BH
- Store a snapshot of the pricing configuration parameters (rates, factors, lookup table values) used at quote creation time — either as a JSON blob in the quote record or via a versioned `pricing_config` table with a foreign key
- Never recalculate a saved quote on open — display the stored values
- Provide a separate "recalculate with current rates" action that creates a NEW quote version, never overwrites the original
- Add `created_at`, `created_by`, `config_version` columns to every quote record

**Warning signs:**
- Quote table schema stores only inputs and final total (no intermediate breakdown)
- No `pricing_config_version` concept exists in the schema
- A quote opened tomorrow shows different numbers than when it was created
- Users ask "why did this quote change?" — they have noticed recalculation drift

**Phase to address:**
Database schema design phase (very early). This is a schema-level decision; retrofitting immutability after launch is a significant migration.

---

### Pitfall 5: MGH Sensitivity Not Reflected Correctly in Per-BH Cost

**What goes wrong:**
MGH (Minimum Guaranteed Hours) is a monthly contracted floor. Fixed costs (aircraft lease, crew base salaries, insurance premiums) are spread across the guaranteed hours to produce a per-BH rate. If the formula divides by actual utilisation rather than the maximum of (actual utilisation, MGH), fixed costs are under-recovered in low-utilisation months and the quoted rate is too low to cover the lessor's actual cost exposure.

**Why it happens:**
Developers focus on the "normal operation" case where actual hours exceed MGH, making the MGH parameter appear irrelevant in testing. The edge case — actual < MGH — is the commercially critical scenario (it defines the minimum revenue the lessor will accept) and is the core reason MGH exists as a pricing input.

**How to avoid:**
- Explicitly test with utilisation below MGH and verify that per-BH costs INCREASE (fixed costs spread over fewer hours)
- Document the formula as `effective_hours = max(actual_hours, MGH)` where `effective_hours` is the denominator for fixed-cost amortisation
- Include an MGH sensitivity test case: same cost parameters, MGH=300, test at 200/250/300/350 actual hours — costs should plateau once actual ≥ MGH

**Warning signs:**
- Per-BH rate does not change when MGH is changed while keeping all other inputs constant
- Rate at 200 actual hours is identical to rate at 300 actual hours when MGH is 300
- Sales team reports the tool shows the same rate regardless of how low the guaranteed hours are set

**Phase to address:**
Pricing engine implementation and formula validation. Include MGH boundary tests in the test matrix.

---

### Pitfall 6: Pricing Formula Treated as Application Logic Rather Than Isolated, Testable Engine

**What goes wrong:**
Pricing formulas are woven into API endpoint handlers or database access functions. When a formula is wrong (and they will be — it is complex), reproducing the error requires running the full application. Testing requires integration setup. The formula cannot be compared against Excel outputs in isolation.

**Why it happens:**
The natural FastAPI pattern leads developers to write `POST /quotes` handlers that do everything: validate input, run calculations, and write to the database. It feels like it works, and for basic cases it does. The problem emerges when a calculation error is found months later and must be bisected.

**How to avoid:**
- Isolate the pricing engine as a pure Python module with no database or HTTP dependencies: `from pricing_engine import calculate_acmi_quote; result = calculate_acmi_quote(inputs)`
- The engine takes a `QuoteInputs` dataclass and returns a `QuoteBreakdown` dataclass — nothing else
- Write the engine's tests as pure unit tests: input → expected output, no database, no HTTP
- Build a parallel-run validation harness: given the Excel workbook, extract N representative input sets with their known outputs; run those inputs through the Python engine; assert outputs match within a defined tolerance (e.g., ±€0.01/BH on final rate)
- The API endpoint's job is validation, calling the engine, and persisting — not calculating

**Warning signs:**
- Pricing logic in `routers/quotes.py` rather than `engine/pricing.py`
- No pure unit tests for the pricing formulas (all tests require a running database)
- A bug in one formula requires redeploying the entire application to test a fix

**Phase to address:**
Pricing engine implementation phase. This is an architectural decision made before the first formula is written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use Python `float` for calculations instead of `decimal.Decimal` | Simpler code, faster to write | Silent rounding divergence from Excel; accumulates in intermediate steps | Never — the divergence is invisible and hard to diagnose later |
| Store only final EUR/BH in quote record (not full breakdown) | Simpler schema | Cannot audit or explain a quote; cannot support actuals comparison in v2 | Never for this domain — break-down is a stated output requirement |
| Recalculate quotes on open instead of storing snapshot | Smaller database, always "current" | Quotes change retroactively; unacceptable for contract reference | Never — legal/commercial documents must be immutable |
| Hardcode pricing configuration (rates, factors) in Python | Fast initial development | Rates cannot be updated without a code deploy; no history of rate changes | Only acceptable in first sprint as placeholder; must be externalised before first real quote |
| Skip the Excel dependency map and start coding formulas | Saves 1–2 days of upfront work | High probability of missing hidden sheets/named ranges; discovered late when formulas produce wrong results | Never — the workbook audit is the cheapest insurance available |
| Single `admin` role for all users | No auth complexity in v1 | Competitor or external party seeing another team's quotes; pricing data is commercially sensitive | Acceptable in very early internal-only development; must add per-user isolation before any multi-user deployment |
| Embed all formula variants in one giant function | Simpler initially | Untestable; formula bugs require full-stack debugging | Never — separate per-component functions (aircraft, crew, maintenance, insurance, DOC, overhead) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Excel workbook (source of truth) | Treating the workbook as documentation to read once | Treat the workbook as the canonical test oracle; run parallel calculations throughout development and after every formula change |
| PostgreSQL NUMERIC columns | Mixing `NUMERIC` and `FLOAT` in the same calculation (e.g., NUMERIC input × FLOAT rate factor) | All monetary and rate columns: `NUMERIC(18, 6)` minimum; never store rates as `FLOAT` or `REAL` |
| Python `decimal.Decimal` ↔ FastAPI JSON | Pydantic serialising `Decimal` to `str` or `float` by default, causing frontend to receive strings or lossy floats | Configure Pydantic model with `json_encoders = {Decimal: str}` and parse consistently; or use `float` only at the final display layer |
| asyncpg parameter binding | Passing Python `Decimal` to asyncpg and receiving `str` back, then doing arithmetic on `str` | Use `asyncpg`'s `Codecs` to register `Decimal` ↔ `NUMERIC` type codec; verify round-trip with test queries |
| Next.js frontend number display | Displaying raw float values with JavaScript's default `toString()` causing `0.30000000000000004` | Use `Intl.NumberFormat` with explicit `minimumFractionDigits`/`maximumFractionDigits`; never display raw float to user |
| Future Business Central integration | Sending EUR/BH rates as floats to BC | BC financial modules expect decimal/currency types; ensure the API contract uses string-encoded decimals |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all aircraft MSN records to filter in Python | Quote list page slow as MSN count grows | Filter in SQL using `WHERE` clauses; never load all rows to memory | ~500 aircraft records |
| Recalculating all historical quotes on every config change | Cascading slow writes when updating a rate factor | Never recalculate historical quotes; store snapshots; future "what-if" recalculation is a separate explicit action | Any config update |
| N+1 query in quote list (fetching aircraft details per quote) | Quote history page makes N+1 DB calls | Use JOIN in the list query to fetch aircraft data alongside quotes | 20+ quotes in history view |
| Storing component breakdown as separate rows (one row per component) | Many rows per quote; complex queries for history | Store full breakdown as JSONB column on the quote row alongside the component columns | Not a scale issue but a query-complexity trap from the start |
| No database index on `quotes.created_by` or `quotes.created_at` | Quote history searches slow as quotes accumulate | Add indexes on filter columns during schema creation | ~1,000 quotes |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No row-level isolation on quotes (any user can see all quotes) | Sales team member A sees competitor-sensitive pricing prepared by team member B; or external contractors see internal margin data | Enforce `WHERE created_by = current_user_id` or team-level ownership on all quote queries; even in v1 with single role, filter by user |
| Exposing margin percentage in API responses to roles that should not see it | A less senior user or external viewer sees the margin applied, revealing internal pricing strategy | Separate the "full quote" (with margin) from the "client quote" (total rate only); RBAC on which roles see margin detail |
| JWT tokens containing full pricing configuration | Token payload is decodable by any party with the token | JWT payload: user ID and role only; never embed pricing data in tokens |
| Hardcoded JWT secret or database credentials in source code | Credentials committed to git; accessible to anyone with repo access | All secrets via environment variables; add `.env` to `.gitignore` from day zero |
| No audit log for quote creation/modification | Cannot determine who priced a contract that later causes a dispute | Add `created_by`, `created_at`, `last_modified_by`, `last_modified_at` to all quote records; these are not optional |
| Admin endpoints without authentication (common in early development) | Pricing configuration update endpoint left unprotected during development | Apply auth middleware to ALL routes from the first commit; never add auth "later" |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw decimal values for component costs (e.g., `47.3821047`) | Sales team cannot quickly sense-check or communicate costs; erodes trust in the tool | Always format monetary values to 2 decimal places for display; show full precision only in a dedicated "calculation detail" view |
| No visible indication of which pricing configuration version was used | Users cannot tell if a quote was made with "old rates" or "current rates" | Show config version or effective date on every quote view |
| Requiring all 7 inputs before any output is shown | Sales team cannot do quick back-of-envelope estimates; feels inflexible | Show partial output as inputs are entered where mathematically possible; or provide sensible defaults for secondary inputs |
| Quote list with no search or filter | Once 20+ quotes exist, finding a specific aircraft/period quote is tedious | Include search by aircraft MSN, date range, and created-by from the first release |
| No way to duplicate/clone a quote | Sales team re-enters the same base parameters to compare margin scenarios | Add "Clone quote" action in v1; they will use it constantly |
| Showing "black box" totals with no formula breakdown | Finance and operations teams cannot verify the tool; will revert to Excel | The per-BH cost breakdown (A + C + M + I + DOC + Other COGS + Overhead) must be the primary output view, not a secondary drill-down |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pricing engine**: Results match Excel workbook on 10+ real test cases including edge cases (very high MGH, low cycle ratio, extreme period length) — verify before shipping any UI
- [ ] **Quote immutability**: Opening a saved quote after changing a pricing config shows IDENTICAL numbers to when it was first created — test by changing a rate, then reopening a pre-change quote
- [ ] **Decimal precision**: All intermediate values in the calculation chain are `decimal.Decimal`; search codebase for `float(` or `* 1.0` inside pricing engine code
- [ ] **PostgreSQL column types**: Every rate and monetary column is `NUMERIC`, not `FLOAT` — run `\d+ table_name` in psql and verify
- [ ] **MGH boundary**: Quote at 200 actual hours with MGH=300 produces a HIGHER EUR/BH than 300 actual hours — if they are the same, MGH is not being applied
- [ ] **Component breakdown stored**: Saved quote record contains all 7 component values (A, C, M, I, DOC, Other COGS, Overhead), not just the final total
- [ ] **Authentication on ALL routes**: Every API endpoint returns 401 without a valid token — run `curl` against each endpoint without Authorization header
- [ ] **User isolation**: User A's quotes are not visible to User B — test with two accounts
- [ ] **Cycle ratio effect**: Changing cycle ratio changes the Maintenance and potentially DOC cost per BH — if M cost is identical at CR=1 and CR=4, the formula is wrong
- [ ] **Environment factor effect**: If the workbook has an environment factor (hot/high, cold climate, etc.), verify that changing it changes the relevant cost components

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Floating-point rounding divergence discovered after launch | HIGH | Audit all formula code for `float` usage; replace with `Decimal`; migrate stored quote breakdowns using a recalculation pass; communicate to users which quotes may have been affected |
| Missing hidden sheet or named range discovered mid-development | MEDIUM | Stop formula development; complete the full workbook audit before resuming; design the missing configuration as a database table; add test cases for the affected components |
| Quote recalculation (non-immutable) discovered after quotes are in use | HIGH | Add snapshot columns to quote table; backfill by re-running calculations with the current config (noting these are approximate for old quotes); add created_at config version reference; document which quotes were backfilled |
| Block/flight/cycle unit confusion in a formula | MEDIUM | Identify the affected component(s); write unit-annotated test cases; fix the formula; re-run any quotes where the error would have been material; communicate corrections |
| Pricing configuration hardcoded in Python discovered at rate-change time | MEDIUM | Extract to a `pricing_config` database table; add admin UI or migration script for updates; deploy and verify existing quotes are unaffected (they should reference old config snapshot) |
| Security: quotes visible across all users | LOW–MEDIUM | Add `WHERE created_by = ?` filter to all quote queries; test with two user accounts; review for any other unfiltered queries |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rounding/precision divergence | Phase: Pricing engine foundation (before first formula) | Run parallel calculation suite against Excel; assert output matches within ±€0.01/BH |
| Hidden Excel dependencies | Phase: Pre-development workbook audit (before any coding) | Written dependency map reviewed and signed off before engine sprint begins |
| Block hours vs. cycles unit confusion | Phase: Pricing engine implementation | Unit-dimension tests in test suite; verify cycle ratio sensitivity |
| Quote immutability/configuration versioning | Phase: Database schema design (very early) | Change a rate, reopen old quote, confirm identical values displayed |
| MGH sensitivity formula correctness | Phase: Pricing engine implementation + test | Boundary test: actual < MGH produces higher EUR/BH than actual = MGH |
| Formula in application logic (not isolated engine) | Phase: Architecture setup (before first formula) | Pricing engine has 100% unit-testable pure functions; no DB imports in engine module |
| Pricing config hardcoded in Python | Phase: Database schema design | No literal rate or factor values in Python source; all sourced from DB config table |
| Missing quote breakdown columns | Phase: Database schema design | Schema review: all 7 component columns present on quote record |
| No user isolation on quotes | Phase: Authentication and data access layer | Two-user isolation test passes before any quote data enters production |
| Black-box UX (no breakdown visible) | Phase: UI implementation | Component breakdown (A/C/M/I/DOC/Other/Overhead) is the primary visible output |

---

## Sources

- Python floating-point and Decimal precision: [Python 3 docs — Floating Point Issues](https://docs.python.org/3/tutorial/floatingpoint.html), [Still Using Python float for Money?](https://medium.com/the-pythonworld/still-using-python-float-for-money-heres-why-that-s-dangerous-73a4f9e2539d)
- PostgreSQL financial precision: [PostgreSQL and Financial Calculations — CommandPrompt](https://www.commandprompt.com/blog/postgresql-and-financial-calculations-part-one/), [Working with Money in Postgres — Crunchy Data](https://www.crunchydata.com/blog/working-with-money-in-postgres)
- Excel formula migration risks: [Transforming a Financial Model into a Web App — Adventures in CRE](https://www.adventuresincre.com/financial-model-web-app/), [Excel to Web App — Modgility](https://www.modgility.com/blog/turn-excel-into-a-web-app)
- Excel circular references and named range risks: [Conquering Circular References in Excel — Macabacus](https://macabacus.com/blog/conquering-circular-references-in-excel), [Excel Circular References — PerfectXL](https://www.perfectxl.com/academy/circular-references/what-is-a-circular-reference/)
- ACMI block hours definition: [ACMI Aircraft Leasing — FlyMarathon](https://commercial.flymarathon.aero/acmi/what-is-acmi-aircraft-leasing-and-how-does-it-differ-from-other-types/), [ACMI Block Hour Rate Definition — Law Insider](https://www.lawinsider.com/dictionary/acmi-block-hour-rate)
- Aviation maintenance reserves and cycle ratios: [Basics of Aircraft Maintenance Reserve Development — AircraftMonitor](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/basics_of_aircraft_maintenance_reserves___v1.pdf)
- DOC components: [Aircraft Operating Costs — FAA](https://www.faa.gov/regulations_policies/policy_guidance/benefit_cost/econ-value-section-4-op-costs.pdf), [Direct Operating Cost — GlobeAir](https://www.globeair.com/g/direct-operating-cost-doc)
- Quote versioning and immutability: [Price Versioning — DealHub](https://dealhub.io/glossary/price-versioning/), [Database Design for Audit Logging — Red Gate](https://www.red-gate.com/blog/database-design-for-audit-logging/)
- Formula transparency requirements: [Transparency in Pricing Tools — PricingHUB](https://www.pricinghub.net/en/transparency-pricing-tool/), [Finance Teams and AI Transparency — Rillion](https://www.rillion.com/blog/finance-labs/ai-transparency-in-finance-report/)
- Race conditions in concurrent systems: [Race Conditions in Web Applications — PortSwigger](https://portswigger.net/web-security/race-conditions)
- Excel rounding function differences: [Rounding in Excel — AbleBits](https://www.ablebits.com/office-addins-blog/excel-round-functions/)

---
*Pitfalls research for: ACMI Pricing Platform (aviation lease pricing calculator)*
*Researched: 2026-03-04*
