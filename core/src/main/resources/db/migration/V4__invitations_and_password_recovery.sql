CREATE TABLE family_invitations
(
    id                    UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) NOT NULL,
    type                  VARCHAR(24)  NOT NULL CHECK (type IN ('SIMPLE', 'PROFILE', 'PROFILE_EMAIL')),
    person_id             UUID REFERENCES persons (id) ON DELETE CASCADE,
    token_hash            VARCHAR(64)  NOT NULL UNIQUE,
    expires_at            TIMESTAMPTZ  NOT NULL,
    created_by_account_id UUID         NOT NULL REFERENCES accounts (id),
    registered_account_id UUID UNIQUE  REFERENCES accounts (id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    accepted_at           TIMESTAMPTZ,
    CONSTRAINT chk_invitation_profile_type CHECK ((type = 'SIMPLE' AND person_id IS NULL) OR
                                                  (type <> 'SIMPLE' AND person_id IS NOT NULL))
);

CREATE INDEX idx_family_invitations_email ON family_invitations (email);
CREATE INDEX idx_family_invitations_expiry ON family_invitations (expires_at);

CREATE TABLE account_action_tokens
(
    id         UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    account_id UUID        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    purpose    VARCHAR(24) NOT NULL CHECK (purpose IN ('PASSWORD_RESET', 'PASSWORD_SETUP')),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_action_tokens_account ON account_action_tokens (account_id, purpose);
