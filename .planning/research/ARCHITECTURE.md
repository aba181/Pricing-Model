# Architecture Research

**Domain:** ACMI Pricing Platform (CPQ-style web app, formula-driven pricing engine)
**Researched:** 2026-03-04
**Confidence:** HIGH — derived from AeroVista reference architecture + FastAPI/Next.js established patterns

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js 14)                         │
├──────────────────────────────┬──────────────────────────────────────┤
│     App Shell / Layout       │       Page / Feature Area             │
│  ┌──────────────────────┐   │  ┌──────────────┐  ┌──────────────┐  │
│  │  Sidebar Navigation  │   │  │  QuoteWizard │  │  QuoteDetail │  │
│  │  (Zustand: nav state)│   │  │  Page        │  │  Page        │  │
│  └──────────────────────┘   │  └──────┬───────┘  └──────┬───────┘  │
│  ┌──────────────────────┐   │         │                  │          │
│  │  Auth Context        │   │         ▼                  ▼          │
│  └──────────────────────┘   │  ┌──────────────────────────────────┐ │
│                              │  │    Zustand Feature Stores         │ │
│                              │  │  quoteStore / aircraftStore /     │ │
│                              │  │  pricingConfigStore               │ │
│                              │  └──────────────┬───────────────────┘ │
│                              │                 │                      │
│                              │  ┌──────────────▼───────────────────┐ │
│                              │  │    API Client (fetch / axios)     │ │
│                              │  └──────────────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────────────┘
                                            │
                            HTTPS REST API  │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                               │
├─────────────────────────────────────────────────────────────────────┤
│  Router Layer (api/v1/)                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ /aircraft    │  │ /quotes      │  │ /pricing   │  │ /auth    │  │
│  │ router       │  │ router       │  │ router     │  │ router   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘  │
│         └─────────────────┴────────────────┴───────────────┘        │
│                                    │                                 │
├────────────────────────────────────▼─────────────────────────────────┤
│  Service Layer                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    PricingEngineService                         │  │
│  │  calculate_aircraft_cost() / calculate_crew_cost()             │  │
│  │  calculate_maintenance_cost() / calculate_insurance_cost()     │  │
│  │  calculate_doc() / calculate_overhead() / apply_margin()       │  │
│  │  generate_quote()                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  AircraftService  │  │  QuoteService      │  │  AuthService     │  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └────────┬─────────┘  │
│            └─────────────────────┴─────────────────────┘              │
│                                    │                                   │
├────────────────────────────────────▼──────────────────────────────────┤
│  Repository Layer (BaseRepository + domain repos)                      │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐   │
│  │ AircraftRepository│  │  QuoteRepository   │  │  UserRepository  │   │
│  │ (raw SQL asyncpg) │  │ (raw SQL asyncpg)  │  │ (raw SQL asyncpg)│   │
│  └─────────┬─────────┘  └─────────┬─────────┘  └────────┬─────────┘   │
└────────────┴─────────────────────┴──────────────────────┘──────────────┘
                                    │
                            asyncpg connection pool
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 15+                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  aircraft    │  │  quotes      │  │  pricing_configs          │   │
│  │  msn_data    │  │  quote_lines │  │  users / sessions         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Next.js App Shell | Sidebar nav, auth state, routing shell | Page components, auth store |
| Zustand Feature Stores | Client-side state per domain (quotes, aircraft, pricing) | Page components, API client |
| API Client (fetch) | HTTP calls to FastAPI, request/response typing | Zustand stores (called from actions) |
| FastAPI Routers | HTTP route definitions, request validation, response shaping | Service layer |
| PricingEngineService | All ACMI formula computation, stateless pure functions | AircraftRepository, PricingConfigRepository |
| AircraftService / QuoteService | CRUD orchestration, business rules beyond calculation | Repository layer |
| BaseRepository + domain repos | Parameterized raw SQL via asyncpg, result mapping | PostgreSQL via asyncpg pool |
| PostgreSQL | Source of truth for all persistent data | Repository layer only |

---

## Recommended Project Structure

### Backend (fastapi-project/)

```
fastapi-project/
├── app/
│   ├── main.py                  # FastAPI app factory, lifespan hooks, middleware
│   ├── config.py                # Settings (pydantic-settings, .env loading)
│   ├── database.py              # asyncpg pool init, connection dependency
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py        # Aggregates all sub-routers
│   │       ├── aircraft.py      # CRUD routes for aircraft / MSN master data
│   │       ├── quotes.py        # Quote creation, retrieval, history
│   │       ├── pricing.py       # Pricing config management, engine trigger
│   │       └── auth.py          # Login, logout, session
│   │
│   ├── services/
│   │   ├── pricing_engine.py    # Core: all ACMI formula logic lives here
│   │   ├── aircraft_service.py  # Aircraft CRUD business rules
│   │   ├── quote_service.py     # Quote assembly, persistence orchestration
│   │   └── auth_service.py      # Password hash, token generation
│   │
│   ├── repositories/
│   │   ├── base.py              # BaseRepository: execute(), fetch_one(), fetch_all()
│   │   ├── aircraft.py          # AircraftRepository: MSN data queries
│   │   ├── quote.py             # QuoteRepository: quote + line item queries
│   │   ├── pricing_config.py    # PricingConfigRepository: config lookup
│   │   └── user.py              # UserRepository: auth queries
│   │
│   ├── models/
│   │   ├── aircraft.py          # Pydantic: AircraftCreate, AircraftRead, MSNData
│   │   ├── quote.py             # Pydantic: QuoteCreate, QuoteRead, QuoteLine
│   │   ├── pricing.py           # Pydantic: PricingInputs, PricingResult, ComponentBreakdown
│   │   └── auth.py              # Pydantic: LoginRequest, TokenResponse, UserRead
│   │
│   └── core/
│       ├── security.py          # JWT or session token utils
│       ├── exceptions.py        # Custom exception classes + handlers
│       └── dependencies.py      # FastAPI Depends() for auth, db connection
│
├── migrations/
│   └── 001_initial_schema.sql   # Hand-written SQL migrations (no Alembic)
├── tests/
│   ├── test_pricing_engine.py   # Unit tests for each formula function
│   └── test_quotes_api.py       # Integration tests for quote endpoints
├── .env.example
└── requirements.txt
```

### Frontend (nextjs-project/)

```
nextjs-project/
├── app/
│   ├── layout.tsx               # Root layout: font, theme provider, auth guard
│   ├── page.tsx                 # Redirect → /quotes
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx         # Login form, no sidebar
│   │
│   └── (dashboard)/
│       ├── layout.tsx           # Dashboard layout: Sidebar + main content area
│       ├── quotes/
│       │   ├── page.tsx         # Quote list / history table
│       │   ├── new/
│       │   │   └── page.tsx     # New quote wizard (multi-step inputs)
│       │   └── [id]/
│       │       └── page.tsx     # Quote detail / breakdown view
│       ├── aircraft/
│       │   ├── page.tsx         # Aircraft / MSN master data table
│       │   └── [id]/
│       │       └── page.tsx     # Aircraft detail pane
│       └── pricing-config/
│           └── page.tsx         # Pricing configuration management (admin)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Navigation sidebar (links, active state)
│   │   ├── TopBar.tsx           # Page title, user menu, theme toggle
│   │   └── PageShell.tsx        # Wraps page content with standard padding
│   │
│   ├── ui/                      # Primitive design system components
│   │   ├── StatCard.tsx         # Key metric display (matches AeroVista)
│   │   ├── DataTable.tsx        # Sortable/filterable table
│   │   ├── StatusBadge.tsx      # Quote status indicator
│   │   └── ...                  # Button, Input, Select, Modal, etc.
│   │
│   ├── quotes/
│   │   ├── QuoteInputForm.tsx   # MGH, Cycle Ratio, Environment, Period, MSN inputs
│   │   ├── PricingBreakdown.tsx # Per-component cost display (A/C/M/I/DOC/Overhead)
│   │   ├── QuoteCard.tsx        # Summary card for list view
│   │   └── MarginControl.tsx    # Margin % input → final EUR/BH display
│   │
│   └── aircraft/
│       ├── AircraftSelector.tsx # Dropdown/search for MSN selection in quote form
│       └── AircraftDetailPanel.tsx
│
├── store/
│   ├── quoteStore.ts            # Quote list, active quote, calculation state
│   ├── aircraftStore.ts         # Aircraft / MSN master data cache
│   ├── pricingConfigStore.ts    # Config values for pricing engine
│   └── authStore.ts             # Current user, session token
│
├── lib/
│   ├── api/
│   │   ├── client.ts            # Base fetch wrapper with auth headers
│   │   ├── quotes.ts            # Quote API calls
│   │   ├── aircraft.ts          # Aircraft API calls
│   │   └── pricing.ts           # Pricing engine API calls
│   ├── types/
│   │   ├── quote.ts             # TypeScript types matching backend Pydantic models
│   │   ├── aircraft.ts
│   │   └── pricing.ts
│   └── utils/
│       ├── currency.ts          # EUR formatting utils
│       └── date.ts              # Date formatting utils
│
├── public/
└── tailwind.config.ts
```

### Structure Rationale

- **services/pricing_engine.py:** The Excel workbook maps directly to this single file. Each spreadsheet tab becomes a function or group of functions. Keeping all formula logic in one place means audit, debugging, and updates are isolated to one location.
- **repositories/ (distinct from services/):** Strict separation means no SQL ever appears in service or router files. Services call repositories; repositories call the database. This boundary makes unit testing pricing logic without a database straightforward.
- **api/v1/ prefix:** Version prefix from day one avoids painful renames when the platform expands (actuals, Business Central integration).
- **store/ per-feature:** One Zustand store per domain (quotes, aircraft, config, auth) avoids a monolithic store that becomes hard to reason about as features grow.
- **components/ui/ vs components/quotes/:** Generic design system components (StatCard, DataTable) stay separate from domain-specific components. This matches AeroVista's established pattern and makes reuse clean.

---

## Architectural Patterns

### Pattern 1: Pricing Engine as Pure Service

**What:** `PricingEngineService` contains only stateless functions that take numeric inputs and return numeric outputs. It holds no database calls and no I/O.

**When to use:** Always for the calculation layer. The Excel workbook is pure computation — replicate that purity in code.

**Trade-offs:** Requires callers (QuoteService) to pre-fetch all necessary data before calling the engine. This is the correct trade-off: it makes every formula unit-testable without mocks.

**Example:**
```python
# services/pricing_engine.py

class PricingEngineService:
    """
    Stateless ACMI pricing computation.
    All methods are pure functions: inputs in, costs out.
    No database access. No side effects.
    """

    def calculate_aircraft_cost(
        self,
        mgh: float,           # Monthly Guaranteed Hours
        cycle_ratio: float,   # Cycles per flight hour
        aircraft_data: AircraftData,
        pricing_config: PricingConfig,
    ) -> Decimal:
        """Translates Aircraft sheet formula from Excel workbook."""
        # Formula extracted from Excel: Aircraft cost per BH
        depreciation_per_bh = aircraft_data.asset_value / (pricing_config.useful_life_hours)
        lease_rate_per_bh = aircraft_data.monthly_lease_rate / mgh
        return depreciation_per_bh + lease_rate_per_bh

    def calculate_crew_cost(
        self,
        mgh: float,
        environment: OperatingEnvironment,
        pricing_config: PricingConfig,
    ) -> Decimal:
        """Translates Crew sheet formula from Excel workbook."""
        base_crew_cost = pricing_config.crew_monthly_cost
        environment_multiplier = ENVIRONMENT_MULTIPLIERS[environment]
        return (base_crew_cost * environment_multiplier) / mgh

    def generate_quote(self, inputs: PricingInputs, aircraft: AircraftData, config: PricingConfig) -> QuoteResult:
        """Orchestrates all component calculations into a full ACMI quote."""
        aircraft_bh = self.calculate_aircraft_cost(inputs.mgh, inputs.cycle_ratio, aircraft, config)
        crew_bh     = self.calculate_crew_cost(inputs.mgh, inputs.environment, config)
        maint_bh    = self.calculate_maintenance_cost(inputs.mgh, inputs.cycle_ratio, aircraft, config)
        insurance_bh = self.calculate_insurance_cost(aircraft, config)
        doc_bh      = self.calculate_doc(inputs.mgh, config)
        overhead_bh = self.calculate_overhead(config)

        total_cost_bh = aircraft_bh + crew_bh + maint_bh + insurance_bh + doc_bh + overhead_bh
        final_rate_bh = total_cost_bh * (1 + inputs.margin_pct / 100)

        return QuoteResult(
            aircraft_cost_bh=aircraft_bh,
            crew_cost_bh=crew_bh,
            maintenance_cost_bh=maint_bh,
            insurance_cost_bh=insurance_bh,
            doc_cost_bh=doc_bh,
            overhead_cost_bh=overhead_bh,
            total_cost_bh=total_cost_bh,
            margin_pct=inputs.margin_pct,
            final_rate_eur_bh=final_rate_bh,
            currency="EUR",
        )
```

### Pattern 2: BaseRepository with Asyncpg

**What:** A generic `BaseRepository` class wraps asyncpg's connection pool. Domain repositories inherit from it and add query methods as named functions. No ORM; all SQL is hand-written.

**When to use:** Every database interaction. The rule is: if it touches the database, it goes in a repository method with a descriptive name.

**Trade-offs:** More SQL to write. The payoff is full query control, no hidden N+1 queries, and the ability to use PostgreSQL-specific features (window functions, CTEs, JSON aggregation) without fighting an ORM.

**Example:**
```python
# repositories/base.py

class BaseRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def fetch_one(self, query: str, *args) -> Optional[asyncpg.Record]:
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetch_all(self, query: str, *args) -> List[asyncpg.Record]:
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def execute(self, query: str, *args) -> str:
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)


# repositories/quote.py

class QuoteRepository(BaseRepository):

    async def get_by_id(self, quote_id: UUID) -> Optional[asyncpg.Record]:
        return await self.fetch_one(
            "SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL",
            quote_id
        )

    async def get_history_for_user(self, user_id: UUID, limit: int = 50) -> List[asyncpg.Record]:
        return await self.fetch_all(
            """
            SELECT q.*, a.registration, a.msn
            FROM quotes q
            JOIN aircraft a ON q.aircraft_id = a.id
            WHERE q.created_by = $1 AND q.deleted_at IS NULL
            ORDER BY q.created_at DESC
            LIMIT $2
            """,
            user_id, limit
        )

    async def save_quote(self, quote: QuoteCreate, result: QuoteResult, user_id: UUID) -> UUID:
        return await self.fetch_one(
            """
            INSERT INTO quotes (aircraft_id, mgh, cycle_ratio, environment, period_months,
                                margin_pct, total_cost_bh, final_rate_eur_bh, breakdown_json,
                                created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
            """,
            quote.aircraft_id, quote.mgh, quote.cycle_ratio, quote.environment,
            quote.period_months, quote.margin_pct, result.total_cost_bh,
            result.final_rate_eur_bh, result.breakdown_json(), user_id
        )
```

### Pattern 3: Zustand Feature Store with API Actions

**What:** Each domain gets one Zustand store. The store holds state and exposes async action functions that call the API client and update state. Components read from the store and call actions.

**When to use:** All client-side state. Server components in Next.js handle initial data load; Zustand handles post-hydration interactivity.

**Trade-offs:** Simpler than Redux but requires discipline not to put everything in one store. Keep each store to its own domain.

**Example:**
```typescript
// store/quoteStore.ts

interface QuoteStore {
  quotes: QuoteRead[];
  activeQuote: QuoteRead | null;
  isCalculating: boolean;
  error: string | null;

  // Actions
  fetchQuoteHistory: () => Promise<void>;
  calculateQuote: (inputs: QuoteInputs) => Promise<QuoteResult>;
  saveQuote: (result: QuoteResult) => Promise<void>;
  setActiveQuote: (quote: QuoteRead) => void;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: [],
  activeQuote: null,
  isCalculating: false,
  error: null,

  fetchQuoteHistory: async () => {
    const quotes = await quotesApi.getHistory();
    set({ quotes });
  },

  calculateQuote: async (inputs: QuoteInputs) => {
    set({ isCalculating: true, error: null });
    try {
      const result = await pricingApi.calculate(inputs);
      set({ isCalculating: false });
      return result;
    } catch (err) {
      set({ isCalculating: false, error: 'Calculation failed' });
      throw err;
    }
  },

  saveQuote: async (result: QuoteResult) => {
    const saved = await quotesApi.save(result);
    set(state => ({ quotes: [saved, ...state.quotes] }));
  },

  setActiveQuote: (quote) => set({ activeQuote: quote }),
}));
```

---

## Database Schema Design

### Core Tables

```sql
-- Aircraft / MSN master data
CREATE TABLE aircraft (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    msn             VARCHAR(50) UNIQUE NOT NULL,   -- Manufacturer Serial Number
    registration    VARCHAR(20),                    -- Current registration mark
    aircraft_type   VARCHAR(50) NOT NULL,           -- e.g. "B737-800", "A320"
    engine_type     VARCHAR(50),
    year_of_mfg     SMALLINT,
    asset_value_eur NUMERIC(15, 2),                -- For depreciation calc
    monthly_lease_rate_eur NUMERIC(12, 2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pricing configuration (the "constants" from the Excel workbook)
-- One row per config version; newest active row wins
CREATE TABLE pricing_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name     VARCHAR(100) NOT NULL,          -- e.g. "2026 Standard"
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Crew cost constants
    crew_monthly_cost_eur       NUMERIC(12, 2) NOT NULL,
    crew_env_multiplier_hot     NUMERIC(6, 4) NOT NULL DEFAULT 1.0,
    crew_env_multiplier_cold    NUMERIC(6, 4) NOT NULL DEFAULT 1.0,
    crew_env_multiplier_standard NUMERIC(6, 4) NOT NULL DEFAULT 1.0,
    -- Maintenance constants
    maint_cost_per_fh_eur       NUMERIC(10, 4) NOT NULL,
    maint_cost_per_cycle_eur    NUMERIC(10, 4) NOT NULL,
    -- Insurance constants
    insurance_rate_pct          NUMERIC(6, 4) NOT NULL,  -- % of asset value / year
    -- DOC constants
    doc_fixed_monthly_eur       NUMERIC(12, 2) NOT NULL,
    -- Overhead constants
    overhead_allocation_pct     NUMERIC(6, 4) NOT NULL,
    -- Lifecycle
    effective_from  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES users(id)
);

-- Quotes (the main output)
CREATE TABLE quotes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aircraft_id     UUID NOT NULL REFERENCES aircraft(id),
    pricing_config_id UUID NOT NULL REFERENCES pricing_configs(id),
    -- Inputs
    mgh             NUMERIC(8, 2) NOT NULL,         -- Monthly Guaranteed Hours
    cycle_ratio     NUMERIC(6, 4) NOT NULL,          -- Cycles per flight hour
    environment     VARCHAR(20) NOT NULL,             -- 'standard'|'hot_and_high'|'cold'
    period_months   SMALLINT NOT NULL,
    margin_pct      NUMERIC(6, 4) NOT NULL,
    -- Outputs (stored for history; recalculation should reproduce these)
    aircraft_cost_bh     NUMERIC(12, 4) NOT NULL,
    crew_cost_bh         NUMERIC(12, 4) NOT NULL,
    maintenance_cost_bh  NUMERIC(12, 4) NOT NULL,
    insurance_cost_bh    NUMERIC(12, 4) NOT NULL,
    doc_cost_bh          NUMERIC(12, 4) NOT NULL,
    overhead_cost_bh     NUMERIC(12, 4) NOT NULL,
    total_cost_bh        NUMERIC(12, 4) NOT NULL,
    final_rate_eur_bh    NUMERIC(12, 4) NOT NULL,   -- The headline number
    -- Metadata
    quote_name      VARCHAR(200),                    -- Optional user label
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft|final|archived
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                      -- Soft delete
);

-- Users (simple email/password auth for v1)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user'|'admin'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_aircraft_id ON quotes(aircraft_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_status ON quotes(status) WHERE deleted_at IS NULL;
```

### Schema Design Rationale

- **`pricing_configs` table (not hardcoded):** The Excel workbook constants (crew costs, maintenance rates, insurance rates) belong in the database, not in code. This lets admins update rates without a deployment. The `is_active` flag means only one config is "live"; all new quotes reference the active config. Old quotes retain a foreign key to their config version — this is the immutable audit trail.
- **`breakdown_json` avoided:** Each cost component is stored as a discrete column (not a JSON blob). This enables SQL-level aggregation, filtering, and reporting in future milestones.
- **Soft deletes on quotes:** `deleted_at IS NULL` filter keeps quote history intact. Sales teams need to recover "deleted" quotes; hard deletes cause support issues.
- **`NUMERIC` not `FLOAT`:** All monetary values use `NUMERIC(precision, scale)`. IEEE 754 float rounding errors in a pricing system are a critical bug.

---

## Data Flow

### Quote Calculation Flow

```
User fills QuoteInputForm (MSN, MGH, Cycle Ratio, Environment, Period, Margin)
    │
    ▼
QuoteInputForm → calls calculateQuote() action in quoteStore
    │
    ▼
quoteStore → POST /api/v1/pricing/calculate  { aircraft_id, mgh, cycle_ratio, environment, period_months, margin_pct }
    │
    ▼
FastAPI router (pricing.py) → validates via Pydantic PricingInputs model
    │
    ▼
QuoteService.prepare_and_calculate()
    ├── AircraftRepository.get_by_id(aircraft_id)       → aircraft row
    └── PricingConfigRepository.get_active_config()     → config row
    │
    ▼
PricingEngineService.generate_quote(inputs, aircraft, config)
    ├── calculate_aircraft_cost()
    ├── calculate_crew_cost()
    ├── calculate_maintenance_cost()
    ├── calculate_insurance_cost()
    ├── calculate_doc()
    ├── calculate_overhead()
    └── apply_margin()
    │
    ▼
QuoteResult (Pydantic) returned to router
    │
    ▼
FastAPI returns JSON response
    │
    ▼
quoteStore receives QuoteResult, sets state
    │
    ▼
PricingBreakdown component renders cost breakdown + final EUR/BH rate
    │
    ▼
User clicks "Save Quote" → quoteStore.saveQuote() → POST /api/v1/quotes
    │
    ▼
QuoteRepository.save_quote() persists all columns to quotes table
```

### Quote History Flow

```
User navigates to /quotes
    │
    ▼
page.tsx server component (or useEffect on mount)
    │
    ▼
quoteStore.fetchQuoteHistory()  →  GET /api/v1/quotes?limit=50
    │
    ▼
QuoteRepository.get_history_for_user()  →  SQL JOIN query (quotes + aircraft)
    │
    ▼
List of QuoteRead objects returned
    │
    ▼
quoteStore.quotes updated
    │
    ▼
DataTable component renders sortable quote history
User clicks row → quoteStore.setActiveQuote() → /quotes/[id] detail page
```

### Authentication Flow

```
User submits login form
    │
    ▼
authStore.login()  →  POST /api/v1/auth/login  { email, password }
    │
    ▼
AuthService.authenticate()
    ├── UserRepository.get_by_email()
    └── bcrypt.verify(password, hash)
    │
    ▼
Session token (JWT or server-side session) returned
    │
    ▼
authStore stores token, sets user in state
    │
    ▼
API client attaches token to all subsequent requests via Authorization header
```

---

## Component Boundaries

### What Talks to What (Strict Rules)

| Boundary | Rule | Reason |
|----------|------|--------|
| Router → Service | Routers call services only, never repositories directly | Services own business rules |
| Service → Repository | Services call repositories, never asyncpg directly | Repositories own SQL |
| PricingEngineService | Never calls any repository | Pure computation; keeps formulas unit-testable |
| Repository → Database | Repositories are the only layer that writes SQL | Single location for all query logic |
| Frontend Store → API | Stores call the API client; components never call fetch directly | API shape changes in one place |
| Components → Store | Components read state and call store actions only | No component-to-component data passing |

---

## Build Order (Dependency Chain)

Build bottom-up within each phase. Never build a layer before its dependency exists.

```
Phase 1: Foundation
    1a. PostgreSQL schema + migrations (aircraft, users, pricing_configs)
    1b. asyncpg pool setup + BaseRepository
    1c. UserRepository + AuthService + /auth routes
    1d. Next.js shell: layout, sidebar, auth pages, authStore
    → Milestone: Team can log in. Sidebar renders. No pricing yet.

Phase 2: Aircraft Master Data
    2a. AircraftRepository + AircraftService
    2b. /aircraft CRUD API routes
    2c. aircraftStore + Aircraft pages (list + detail pane)
    2d. AircraftSelector component
    → Milestone: MSN data is manageable from the UI.

Phase 3: Pricing Engine (critical path — needs Excel workbook)
    3a. pricing_configs schema + PricingConfigRepository
    3b. PricingEngineService (formula translation from Excel — formula-by-formula)
    3c. Unit tests for every formula function (verify against Excel outputs)
    3d. QuoteService.prepare_and_calculate() wiring
    3e. POST /pricing/calculate endpoint
    3f. QuoteInputForm + PricingBreakdown + MarginControl components
    3g. quoteStore calculateQuote action
    → Milestone: Enter inputs, see EUR/BH breakdown. Nothing saved yet.

Phase 4: Quote Persistence + History
    4a. quotes table migration
    4b. QuoteRepository (save + history queries)
    4c. POST /quotes (save) + GET /quotes (history) routes
    4d. Save button in UI, quote history page, QuoteDetail page
    → Milestone: Quotes can be saved, retrieved, and reviewed.

Phase 5: Polish + Production Readiness
    5a. Pricing config admin page
    5b. Status badges, dark/light mode toggle
    5c. Error handling, loading states, empty states
    5d. Deployment configuration
```

**Critical dependency note:** Phase 3 cannot start without the Excel workbook. The formula translation is the single biggest uncertainty. All of Phase 3's estimates carry LOW confidence until the workbook is reviewed.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 users (v1) | Single FastAPI process, single Postgres instance. asyncpg pool of 10-20 connections is sufficient. |
| 50-500 users | Add read replica for quote history queries. Connection pooling via PgBouncer if connection count spikes. |
| 500+ users | Pricing calculation is stateless and CPU-bound — multiple FastAPI workers (uvicorn + gunicorn) handle concurrency without architectural changes. Postgres remains the bottleneck at this scale. |

**First bottleneck:** The `quotes` table history query grows linearly with usage. Add `LIMIT` and cursor-based pagination from day one. Adding an index on `(created_by, created_at DESC)` handles the common case.

**Not a concern at v1 scale:** Caching pricing calculations. Results are cheap to compute (pure arithmetic). Only cache if user testing reveals perceptible latency.

---

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Routers

**What people do:** Put pricing formula calculations directly in the route handler function because it's quick.

**Why it's wrong:** Formulas cannot be unit-tested without standing up HTTP. When the Excel workbook changes (it will), the location of the logic is unclear.

**Do this instead:** Route handlers do three things only: validate input (Pydantic), call a service method, return the result. All logic lives in `PricingEngineService`.

### Anti-Pattern 2: One Giant Pricing Function

**What people do:** Translate the entire Excel workbook into one `calculate_price()` function that returns the final number.

**Why it's wrong:** When a formula is wrong (and it will be — Excel formulas are notoriously hard to read), you cannot isolate which component is incorrect. Testing requires testing the entire workbook simultaneously.

**Do this instead:** One function per ACMI component (aircraft, crew, maintenance, insurance, DOC, overhead). `generate_quote()` orchestrates them. Each component function gets its own unit test verifying it against known Excel outputs.

### Anti-Pattern 3: Hardcoding Pricing Constants

**What people do:** Define crew costs, maintenance rates, and insurance percentages as Python constants or environment variables.

**Why it's wrong:** Rates change annually. A code change + deployment to update a number is operationally unacceptable for a pricing tool.

**Do this instead:** `pricing_configs` table. One active row at a time. Admin UI for updating. All quotes store a foreign key to the config version used — this is the audit trail.

### Anti-Pattern 4: Monolithic Zustand Store

**What people do:** One `useAppStore` that holds quotes, aircraft, auth, UI state, and pricing config all together.

**Why it's wrong:** Any state change triggers re-render evaluation across all subscribers. Debugging is difficult. As features grow, the store becomes unmaintainable.

**Do this instead:** Separate stores per domain (`quoteStore`, `aircraftStore`, `authStore`, `pricingConfigStore`). Each file is independently understandable and testable.

### Anti-Pattern 5: Floating-Point for Money

**What people do:** Use JavaScript `number` or Python `float` for EUR/BH values.

**Why it's wrong:** `0.1 + 0.2 === 0.30000000000000004`. Rounding errors compound across seven cost components and will produce rates that differ from the Excel workbook by fractions of a cent — which becomes visible when the formula cross-check fails.

**Do this instead:** Python `Decimal` throughout the pricing engine. PostgreSQL `NUMERIC` for all monetary columns. Format to display precision only at the UI layer.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js frontend ↔ FastAPI | REST/JSON over HTTPS | Typed with Pydantic response models on backend, TypeScript interfaces on frontend |
| FastAPI routers ↔ Services | Direct Python function calls | No message bus needed at v1 scale |
| Services ↔ Repositories | Direct Python function calls, asyncpg Records | Records mapped to Pydantic models in service layer |
| PricingEngineService ↔ QuoteService | Direct calls; engine is stateless | QuoteService pre-fetches data, passes to engine |

### External Services (v1)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None | — | v1 is fully self-contained. No external APIs required. |
| Business Central (future) | REST integration via integrations/ layer | Deferred to post-v1. When added, follows AeroVista integrations layer pattern: separate module, adapter interface, never called from service layer directly. |

---

## Sources

- AeroVista reference architecture (project context, irakli934/Asset-Management-App)
- [FastAPI Layered Architecture — Production Patterns 2025](https://medium.com/@abhinav.dobhal/building-production-ready-fastapi-applications-with-service-layer-architecture-in-2025-f3af8a6ac563)
- [Layered Architecture & Dependency Injection in FastAPI](https://dev.to/markoulis/layered-architecture-dependency-injection-a-recipe-for-clean-and-testable-fastapi-code-3ioo)
- [Raw SQL over ORM in FastAPI](https://medium.com/@compsci88/why-i-ditched-orms-for-raw-sql-in-fastapi-and-you-should-too-59766b2ba825)
- [Repository Pattern Implementation](https://deepwiki.com/mrshabel/fastapi-starter/6.1-repository-pattern-implementation)
- [Next.js App Router Layouts and Navigation](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Zustand with Next.js — Official Guide](https://zustand.docs.pmnd.rs/guides/nextjs)
- [PostgreSQL Schema Design Best Practices](https://www.bytebase.com/blog/top-database-schema-design-best-practices/)

---
*Architecture research for: ACMI Pricing Platform*
*Researched: 2026-03-04*
