-- Add 'viewer' role to the users table role constraint.
-- Viewer users have read-only access to Dashboard and Quotes pages only.
-- Run: psql $DATABASE_URL -f fastapi-project/migrations/006_add_viewer_role.sql

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer'));
