ALTER TABLE accounts
    ADD COLUMN password_hash VARCHAR(100),
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
    ADD COLUMN email_verified_at TIMESTAMPTZ,
    ADD COLUMN initial_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE email_verification_tokens
(
    id         UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    account_id UUID        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_account ON email_verification_tokens (account_id);
