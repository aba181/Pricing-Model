-- Migration 004: Create quotes, quote_msn_snapshots, and quote_sequences tables
-- Phase 4: Quote Persistence and History

-- Quote sequences for atomic auto-numbering by client code
CREATE TABLE IF NOT EXISTS quote_sequences (
    client_code     TEXT PRIMARY KEY,
    last_seq        INTEGER NOT NULL DEFAULT 0
);

-- Main quotes table: normalized metadata + JSONB snapshots
CREATE TABLE IF NOT EXISTS quotes (
    id                      SERIAL PRIMARY KEY,
    quote_number            TEXT NOT NULL UNIQUE,
    client_name             TEXT NOT NULL,
    client_code             TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    -- Quick-access metadata (normalized for search/filter)
    exchange_rate           NUMERIC(8,4) NOT NULL,
    margin_percent          NUMERIC(6,4) NOT NULL,
    total_eur_per_bh        NUMERIC(12,4),
    msn_list                INTEGER[] NOT NULL,
    period_start            TEXT,
    period_end              TEXT,
    -- Full state snapshots (JSONB, immutable after creation)
    pricing_config_snapshot JSONB NOT NULL,
    crew_config_snapshot    JSONB NOT NULL,
    costs_config_snapshot   JSONB NOT NULL,
    dashboard_state         JSONB NOT NULL,
    -- Ownership
    created_by              INTEGER NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_client ON quotes(client_code, created_at DESC);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX idx_quotes_msn_list ON quotes USING GIN(msn_list);

-- Per-MSN snapshot within a quote
CREATE TABLE IF NOT EXISTS quote_msn_snapshots (
    id              SERIAL PRIMARY KEY,
    quote_id        INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    msn             INTEGER NOT NULL,
    aircraft_type   TEXT NOT NULL,
    aircraft_id     INTEGER NOT NULL,
    msn_input       JSONB NOT NULL,
    breakdown       JSONB NOT NULL,
    monthly_pnl     JSONB NOT NULL,
    monthly_cost    NUMERIC(12,2),
    monthly_revenue NUMERIC(12,2),
    UNIQUE(quote_id, msn)
);

CREATE INDEX idx_quote_msn_snapshots_quote ON quote_msn_snapshots(quote_id);
