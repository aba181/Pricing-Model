-- Users table migration for ACMI Pricing Platform
-- Run manually: psql $DATABASE_URL -f fastapi-project/migrations/001_create_users.sql
-- If DATABASE_URL is not set, use:
--   psql postgresql://postgres:postgres@localhost:5432/acmi_platform -f fastapi-project/migrations/001_create_users.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    full_name       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
