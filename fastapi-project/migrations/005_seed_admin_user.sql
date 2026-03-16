-- Migration 005: Seed initial admin user
-- Creates the default admin account if it doesn't already exist.

INSERT INTO users (email, hashed_password, role)
VALUES (
    'admin@acmi.com',
    '$argon2id$v=19$m=65536,t=3,p=4$9kSZSYx01pz8SEShqR6Wog$VKRB2Vm1fwBsio+pSTphwllWRE/Pb/khcby+DOnKp/Y',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
