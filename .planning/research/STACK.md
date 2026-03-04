# Stack Research

**Domain:** ACMI pricing web application (FastAPI + Next.js 14 + PostgreSQL)
**Researched:** 2026-03-04
**Confidence:** HIGH (core stack), MEDIUM (Excel parsing), LOW (ACMI-specific libraries)

---

## Recommended Stack

### Core Technologies (Locked — Match AeroVista)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.12+ | Backend runtime | Required by constraint; 3.12 improves asyncio performance |
| FastAPI | 0.115.x | API framework | Locked per constraint; async-native, Pydantic v2 built-in |
| Next.js | 14 (App Router) | Frontend framework | Locked per constraint; Server Components reduce client bundle |
| TypeScript | 5.x | Frontend type safety | Locked per constraint; essential for complex financial form state |
| PostgreSQL | 15+ | Primary database | Locked per constraint; JSONB for flexible cost breakdowns |
| asyncpg | 0.31.0 | PostgreSQL async driver | Locked per constraint; fastest Python PostgreSQL driver (no ORM wrapper overhead) |
| Tailwind CSS | 3.x | Styling | Locked per constraint; matches AeroVista UI |
| Zustand | 4.x | Frontend state | Locked per constraint; matches AeroVista pattern |

### Python Backend Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| pydantic | 2.x (bundled with FastAPI) | Request/response validation, Decimal field typing | Pydantic v2 serializes `Decimal` as string by default — preserves EUR precision across API boundary. Use `condecimal(max_digits=15, decimal_places=4)` for per-BH rates. |
| PyJWT | 2.11.0 | JWT token creation and verification | Official FastAPI docs switched from python-jose to PyJWT in late 2024 (PR #11589). python-jose is unmaintained since 2021 and incompatible with Python 3.12+. |
| pwdlib[argon2] | 0.3.0 | Password hashing | FastAPI docs updated (PR #13917) to use pwdlib + Argon2 over passlib. passlib breaks on Python 3.13+ due to `crypt` module removal. Argon2 is GPU-resistant and OWASP-recommended. |
| openpyxl | 3.1.5 | Excel workbook reading and formula extraction | The only actively maintained library for `.xlsx` files. Use `load_workbook(path, data_only=False)` to extract formula strings; use `Tokenizer` class to parse formula tokens for translation to Python. |
| python-multipart | 0.0.x | Form data parsing | Required for FastAPI OAuth2PasswordRequestForm (login endpoint) |

### Python Pricing Calculation Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Python `decimal` (stdlib) | stdlib | All EUR/BH arithmetic | Use `Decimal` throughout the pricing engine — never `float`. Aviation pricing involves chain multiplications (cost × cycle_ratio × MGH × environment_factor) where float drift compounds into cent-level errors on large contracts. Set `decimal.getcontext().prec = 28` globally. |
| `decimal.ROUND_HALF_UP` (stdlib) | stdlib | Rounding to contract precision | ACMI quotes are presented to 2 decimal places (e.g., 1,234.56 EUR/BH). Use `quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)` only at final output, not mid-calculation. |

**No third-party financial library is needed.** QuantLib and FinancePy target derivatives and fixed-income instruments — irrelevant to ACMI cost-component arithmetic. The pricing engine is formula translation (Excel → Python `Decimal`), not quantitative finance.

### Excel Formula Extraction (One-Time Migration Tool)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| openpyxl | 3.1.5 | Extract formula strings from workbook cells | Primary tool. `load_workbook(data_only=False)` returns raw formula text (e.g., `=C5*MGH_RATE*1.15`). Use `openpyxl.formula.tokenize.Tokenizer` to parse formula tokens. |
| xlcalculator | 0.4.x | Verify formula translation by evaluation | Secondary tool for validation only. xlcalculator converts Excel formulas to Python and evaluates them against sample inputs — useful for cross-checking manual Python translations. Not for production use. |

**Do NOT use xlwings** for the server-side formula extraction. xlwings requires Excel to be installed on the same machine — incompatible with Linux production servers and Docker containers.

**Do NOT use xlrd** for the workbook. xlrd only reads `.xls` (Excel 97-2003 binary format). Modern Excel workbooks are `.xlsx`. xlrd explicitly removed `.xlsx` support in v2.0 and its README directs users to openpyxl.

### Frontend Libraries (Next.js 14)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 4.x | Client state (quote form, UI state) | All client-side state: form inputs, current quote draft, sidebar open/closed |
| shadcn/ui | latest | Component library | AeroVista-style components: DataTable, StatCard, StatusBadge, Sidebar |
| Radix UI | via shadcn | Accessible primitives | Underpins shadcn; dark/light mode toggle, dropdowns, dialogs |
| react-hook-form | 7.x | Form validation | Pricing input forms: MGH, cycle ratio, environment, period — with Zod schema |
| Zod | 3.x | Schema validation | Validate pricing inputs on client before submission; types flow from Zod → TypeScript |
| next-themes | 0.x | Dark/light mode | AeroVista pattern: system-aware theme switching |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| uv | Python dependency management | Faster than pip/poetry; use `uv pip install` and `uv.lock` for reproducible environments |
| Docker + Docker Compose | Local dev environment | One `docker-compose.yml` for FastAPI + PostgreSQL + Next.js; matches production topology |
| Nginx (production) | Reverse proxy, SSL termination | Routes `/api/*` to FastAPI (Gunicorn/Uvicorn), all other routes to Next.js; handles SSL in one place |
| Gunicorn + UvicornWorker | FastAPI process manager | `gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker`; worker count = (2 × CPU cores) + 1 |
| pytest + pytest-asyncio | Backend testing | Test pricing engine formulas with fixture inputs vs. expected EUR/BH values from Excel workbook |
| Alembic | Database migrations | Even with raw SQL, Alembic tracks schema changes via SQL migration files (not auto-generated, hand-written) |

---

## Installation

```bash
# Python backend
pip install fastapi uvicorn[standard] asyncpg pydantic PyJWT "pwdlib[argon2]" openpyxl python-multipart

# Development / formula extraction only
pip install xlcalculator pytest pytest-asyncio

# Frontend
npm install next@14 react react-dom typescript tailwindcss zustand
npm install @hookform/resolvers react-hook-form zod next-themes
npx shadcn-ui@latest init

# Dev dependencies
npm install -D @types/react @types/node eslint
```

---

## Alternatives Considered

| Recommended | Alternative | Why Alternative Was Rejected |
|-------------|-------------|------------------------------|
| PyJWT 2.11.0 | python-jose | python-jose unmaintained since 2021; breaks on Python 3.12+ due to ecdsa dependency issues. FastAPI official docs migrated away from it (PR #11589). |
| pwdlib[argon2] | passlib[bcrypt] | passlib unmaintained; `crypt` module removed in Python 3.13; throws deprecation warnings on 3.11+. Full-stack FastAPI template already migrated (PR #1539). |
| pwdlib[argon2] | bcrypt directly | Direct bcrypt usage possible but lacks wrapper abstractions; bcrypt hard-limits passwords to 72 chars. pwdlib provides cleaner interface. |
| Python `decimal` stdlib | numpy/pandas for calculations | numpy uses float64 internally — precision insufficient for accumulated cost calculations. pandas adds unnecessary DataFrame overhead for single-row pricing computations. |
| openpyxl | xlrd | xlrd removed `.xlsx` support in v2.0. Only handles legacy `.xls`. Rejected entirely for this project. |
| Nginx reverse proxy | Next.js rewrites as proxy | Next.js rewrites can proxy `/api` to FastAPI, but adds Node.js as middle layer for every API call. Nginx is zero-overhead at this layer and handles SSL, compression, and load balancing natively. |
| Gunicorn + UvicornWorker | Uvicorn standalone | Uvicorn standalone (`--workers N`) lacks Gunicorn's process restart, graceful shutdown, and crash recovery. FastAPI docs recommend Gunicorn as process manager for production. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| python-jose | Unmaintained since 2021, security vulnerabilities, incompatible with Python 3.12+ due to ecdsa/rsa dependency issues | PyJWT 2.11.0 |
| passlib | `crypt` module removed in Python 3.13; throws DeprecationWarning on 3.11+; last release was 2020 | pwdlib[argon2] 0.3.0 |
| xlrd | Explicitly removed .xlsx support in v2.0; only reads legacy .xls binary format | openpyxl 3.1.5 |
| xlwings | Requires Excel installed on the same machine; incompatible with Linux/Docker production servers | openpyxl (formula extraction) + Python `decimal` (engine) |
| SQLAlchemy / any ORM | Locked out by project constraint (raw SQL + asyncpg BaseRepository pattern) | asyncpg 0.31.0 with BaseRepository pattern |
| float arithmetic for prices | IEEE 754 float drift: `0.1 + 0.2 = 0.30000000000000004`; compounds in multi-step ACMI cost formulas | Python `decimal.Decimal` throughout |
| QuantLib / FinancePy | Designed for derivatives pricing (options, bonds); adds 200MB+ dependency for irrelevant functionality | Python `decimal` stdlib |
| NextAuth.js | OAuth/SSO flows are explicitly out of scope for v1; adds complexity for simple email/password | Custom JWT auth via PyJWT + HTTP-only cookies |

---

## Stack Patterns by Context

**For the pricing engine (core):**
- All intermediate calculations use `Decimal`
- Formula inputs (MGH, cycle_ratio, etc.) arrive as `Decimal` from Pydantic validation
- Round only at the final EUR/BH output step: `result.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`
- Store all intermediate values as `NUMERIC(15, 4)` in PostgreSQL (not `FLOAT`)

**For the Excel formula extraction (one-time migration):**
- Run openpyxl locally (not on server) against the provided workbook
- Extract formula strings per cell per sheet
- Manually translate to Python `Decimal` functions
- Use xlcalculator to validate translations against Excel-computed reference values

**For FastAPI authentication:**
- Standard OAuth2 password flow: POST `/auth/login` → JWT access token
- Store JWT in HTTP-only cookie (not localStorage) to prevent XSS
- Token contains: `user_id`, `email`, `exp` (24h default)
- Protect routes with `Depends(get_current_user)` dependency

**For asyncpg connection pool:**
- Create pool in FastAPI `lifespan` context manager (not `@app.on_event` — deprecated)
- Pool config: `min_size=2, max_size=10, max_inactive_connection_lifetime=300`
- Store pool on `app.state.pool`, access via `request.app.state.pool` in dependencies
- Never share a single connection; always acquire from pool per request

**For deployment:**
- Single `docker-compose.yml`: `fastapi` (Gunicorn+Uvicorn), `nextjs` (standalone output), `postgres`
- Nginx container handles all ingress: `/api/*` → FastAPI, `/*` → Next.js
- Next.js built with `output: 'standalone'` for minimal Docker image

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| FastAPI 0.115.x | Pydantic 2.x | FastAPI 0.100+ requires Pydantic v2; do not mix with Pydantic v1 |
| asyncpg 0.31.0 | Python 3.9–3.14, PostgreSQL 9.5–18 | Fully compatible with Python 3.12 |
| PyJWT 2.11.0 | Python 3.9+ | Compatible with Python 3.12 |
| pwdlib 0.3.0 | Python 3.10+ | Requires Python 3.10+; Python 3.12 is fine |
| openpyxl 3.1.5 | Python 3.8+ | No dependency conflicts with FastAPI stack |
| Next.js 14 | Node.js 18.17+ | App Router requires Node.js 18.17 or 20+; use Node 20 LTS |

---

## ACMI-Specific Notes

**No aviation-specific Python libraries exist for ACMI pricing.** The domain is too niche and proprietary. Confirmed via search — no open-source ACMI pricing libraries, no aviation cost-formula libraries. The industry uses proprietary Excel workbooks (exactly what this project is replacing).

The pricing engine is purely arithmetic — chain multiplications and additions of cost components:

```
A_cost = aircraft_lease_rate × MGH
C_cost = crew_rate × MGH × cycle_adjustment
M_cost = maintenance_rate × MGH × environment_factor
I_cost = insurance_rate × aircraft_value
DOC = A_cost + C_cost + M_cost + I_cost + other_cogs
Total_COGS = DOC + overhead
EUR_per_BH = Total_COGS × (1 + margin_pct)
```

This translates directly to Python `Decimal` arithmetic. No third-party library adds value here.

---

## Sources

- PyPI: openpyxl 3.1.5 — https://pypi.org/project/openpyxl/ (verified current stable)
- PyPI: asyncpg 0.31.0 — https://pypi.org/project/asyncpg/ (verified, released Nov 2025)
- PyPI: PyJWT 2.11.0 — https://pypi.org/project/PyJWT/ (verified, released Jan 2026)
- PyPI: pwdlib 0.3.0 — https://pypi.org/project/pwdlib/ (verified, released Oct 2025)
- FastAPI GitHub PR #11589 — PyJWT migration from python-jose (HIGH confidence)
- FastAPI GitHub PR #13917 — pwdlib/Argon2 migration from passlib (HIGH confidence)
- FastAPI full-stack template PR #1539 — direct bcrypt over passlib migration (HIGH confidence)
- openpyxl formula docs — https://openpyxl.readthedocs.io/en/stable/formula.html (MEDIUM confidence — Tokenizer class coverage is limited)
- xlrd GitHub README — explicitly warns `.xlsx` not supported since v2.0 (HIGH confidence)
- xlcalculator GitHub — https://github.com/bradbase/xlcalculator (MEDIUM confidence — maintenance activity unclear)
- FastAPI official deployment docs — https://fastapi.tiangolo.com/deployment/server-workers/ (HIGH confidence)
- ACMI aviation library search — no domain-specific Python libraries found (confirmed gap, LOW confidence that nothing exists)

---

*Stack research for: ACMI Pricing Platform*
*Researched: 2026-03-04*
