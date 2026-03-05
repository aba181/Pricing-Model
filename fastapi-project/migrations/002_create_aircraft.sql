-- Migration 002: Create aircraft, aircraft_rates, and epr_matrix_rows tables
-- Phase 2: Aircraft Master Data
--
-- All monetary columns use NUMERIC with explicit precision/scale to:
-- 1. Ensure asyncpg returns Python Decimal (not float)
-- 2. Avoid scientific notation serialization (Pitfall 1 from research)

-- Aircraft identity (one row per MSN)
CREATE TABLE IF NOT EXISTS aircraft (
    id              SERIAL PRIMARY KEY,
    msn             INTEGER NOT NULL UNIQUE,
    aircraft_type   TEXT NOT NULL DEFAULT 'A320',
    registration    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aircraft_msn ON aircraft(msn);

-- Cost rates per aircraft (one row per MSN)
-- Stores USD originals; EUR values computed on read using adjustable rate
CREATE TABLE IF NOT EXISTS aircraft_rates (
    id                      SERIAL PRIMARY KEY,
    aircraft_id             INTEGER NOT NULL UNIQUE REFERENCES aircraft(id) ON DELETE CASCADE,
    -- Fixed monthly rates (USD)
    lease_rent_usd          NUMERIC(12,2),
    six_year_check_usd      NUMERIC(12,2),
    twelve_year_check_usd   NUMERIC(12,2),
    ldg_usd                 NUMERIC(12,2),
    -- Variable rates per engine (USD)
    apu_rate_usd            NUMERIC(10,4),
    llp1_rate_usd           NUMERIC(10,4),
    llp2_rate_usd           NUMERIC(10,4),
    -- Escalation rates (stored as decimal fractions, e.g., 0.05 = 5%)
    epr_escalation          NUMERIC(6,4) DEFAULT 0,
    llp_escalation          NUMERIC(6,4) DEFAULT 0,
    af_apu_escalation       NUMERIC(6,4) DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EPR matrix rows (variable number per aircraft)
-- Each MSN has different cycle ratio steps and different row counts
CREATE TABLE IF NOT EXISTS epr_matrix_rows (
    id              SERIAL PRIMARY KEY,
    aircraft_id     INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    cycle_ratio     NUMERIC(6,4) NOT NULL,
    benign_rate     NUMERIC(10,2) NOT NULL,
    hot_rate        NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(aircraft_id, cycle_ratio)
);

CREATE INDEX IF NOT EXISTS idx_epr_matrix_aircraft ON epr_matrix_rows(aircraft_id, cycle_ratio);
