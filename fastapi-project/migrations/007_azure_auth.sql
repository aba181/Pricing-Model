-- Allow Azure AD users (no password) and track Azure identity
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_azure_id ON users(azure_id);
