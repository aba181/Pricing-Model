-- Migration 003: Create pricing config, crew config, projects, and MSN input tables
-- Phase 3: Pricing Engine — Data Foundation
--
-- All monetary columns use NUMERIC with explicit precision/scale:
--   NUMERIC(12,2) for dollar amounts
--   NUMERIC(10,4) for rates per block hour
--   NUMERIC(8,4)  for exchange rates
--   NUMERIC(6,4)  for percentages / escalation
--   NUMERIC(4,1)  for fleet size
--   NUMERIC(8,2)  for block hours
--   NUMERIC(10,2) for per-diem rates
--
-- Config tables are append-only (versioned). Partial unique indexes enforce
-- that only one row per category can be "current" at a time.

-- ============================================================
-- 1. pricing_config — global pricing parameters (versioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_config (
    id                          SERIAL PRIMARY KEY,
    version                     INTEGER NOT NULL DEFAULT 1,
    -- Exchange rate (USD -> EUR)
    exchange_rate               NUMERIC(8,4) NOT NULL DEFAULT 0.85,
    -- Insurance (fixed USD/month)
    insurance_usd               NUMERIC(12,2) NOT NULL,
    -- DOC — total budget, divided by avg fleet at calc time
    doc_total_budget            NUMERIC(12,2) NOT NULL,
    -- Overhead — total budget, divided by avg fleet at calc time
    overhead_total_budget       NUMERIC(12,2) NOT NULL,
    -- Other COGS (monthly, per aircraft)
    other_cogs_monthly          NUMERIC(12,2) NOT NULL,
    -- Maintenance: fixed monthly amounts
    line_maintenance_monthly    NUMERIC(12,2) NOT NULL,
    base_maintenance_monthly    NUMERIC(12,2) NOT NULL,
    personnel_salary_monthly    NUMERIC(12,2) NOT NULL,
    c_check_monthly             NUMERIC(12,2) NOT NULL,
    maintenance_training_monthly NUMERIC(12,2) NOT NULL,
    -- Maintenance: variable rate
    spare_parts_rate            NUMERIC(10,4) NOT NULL,
    -- Maintenance: per diem
    maintenance_per_diem        NUMERIC(12,2) NOT NULL,
    -- Fleet size for budget-per-aircraft calculations
    average_active_fleet        NUMERIC(4,1) NOT NULL DEFAULT 11.0,
    -- Metadata
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  INTEGER REFERENCES users(id),
    is_current                  BOOLEAN NOT NULL DEFAULT TRUE
);

-- Only one pricing_config row can be current at any time
CREATE UNIQUE INDEX idx_pricing_config_current
    ON pricing_config (is_current) WHERE is_current = TRUE;


-- ============================================================
-- 2. crew_config — crew cost parameters per aircraft type (versioned)
-- ============================================================
CREATE TABLE IF NOT EXISTS crew_config (
    id                                  SERIAL PRIMARY KEY,
    version                             INTEGER NOT NULL DEFAULT 1,
    aircraft_type                       TEXT NOT NULL DEFAULT 'A320',
    -- Salaries (monthly per person)
    pilot_salary_monthly                NUMERIC(12,2) NOT NULL,
    senior_attendant_salary_monthly     NUMERIC(12,2) NOT NULL,
    regular_attendant_salary_monthly    NUMERIC(12,2) NOT NULL,
    -- Variable costs
    per_diem_rate                       NUMERIC(10,2) NOT NULL,
    accommodation_monthly_budget        NUMERIC(12,2) NOT NULL,
    training_total_budget               NUMERIC(12,2) NOT NULL,
    uniform_total_budget                NUMERIC(12,2) NOT NULL,
    -- Metadata
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                          INTEGER REFERENCES users(id),
    is_current                          BOOLEAN NOT NULL DEFAULT TRUE
);

-- Each aircraft_type can have exactly one current config row
CREATE UNIQUE INDEX idx_crew_config_current
    ON crew_config (aircraft_type, is_current) WHERE is_current = TRUE;


-- ============================================================
-- 3. pricing_projects — mutable, session-based project container
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_projects (
    id                  SERIAL PRIMARY KEY,
    name                TEXT,
    exchange_rate       NUMERIC(8,4) NOT NULL DEFAULT 0.85,
    margin_percent      NUMERIC(6,4) DEFAULT 0,
    config_version_id   INTEGER REFERENCES pricing_config(id),
    crew_config_a320_id INTEGER REFERENCES crew_config(id),
    crew_config_a321_id INTEGER REFERENCES crew_config(id),
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. project_msn_inputs — per-MSN operational inputs in a project
-- ============================================================
CREATE TABLE IF NOT EXISTS project_msn_inputs (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES pricing_projects(id) ON DELETE CASCADE,
    aircraft_id     INTEGER NOT NULL REFERENCES aircraft(id),
    -- Operational inputs
    mgh             NUMERIC(8,2) NOT NULL,
    cycle_ratio     NUMERIC(6,4) NOT NULL,
    environment     TEXT NOT NULL CHECK (environment IN ('benign', 'hot')),
    period_months   INTEGER NOT NULL DEFAULT 12,
    lease_type      TEXT NOT NULL DEFAULT 'wet'
                    CHECK (lease_type IN ('wet', 'damp', 'moist')),
    crew_sets       INTEGER NOT NULL DEFAULT 4,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Each aircraft appears at most once per project
    UNIQUE(project_id, aircraft_id)
);
