-- Estensione per la generazione di UUID lato database
CREATE
EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ACCOUNTS: credenziali/login. Non tutti i membri della famiglia
-- hanno un account (es. un neonato, un nonno defunto).
-- ============================================================
CREATE TABLE accounts
(
    id         UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    google_sub VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- PERSONS: ogni membro della famiglia, con o senza account.
-- ============================================================
CREATE TABLE persons
(
    id           UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    account_id   UUID UNIQUE  REFERENCES accounts (id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    birth_date   DATE,
    gender       VARCHAR(50),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_persons_account_id ON persons (account_id);

-- ============================================================
-- HOUSEHOLDS: nucleo abitativo (può essercene più di uno
-- collegato allo stesso albero genealogico, es. genitori separati).
-- ============================================================
CREATE TABLE households
(
    id         UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE person_households
(
    person_id    UUID        NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    household_id UUID        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    role         VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (person_id, household_id)
);

-- ============================================================
-- RELATIONSHIPS: solo relazioni atomiche. Tutto il resto
-- (nonni, zii, cugini...) si calcola con query ricorsive.
-- ============================================================
CREATE TABLE relationships
(
    id          UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    person_a_id UUID        NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    person_b_id UUID        NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL, -- PARENT_OF, SPOUSE_OF, PARTNER_OF
    status      VARCHAR(30),          -- MARRIED, PARTNERED, SEPARATED, DIVORCED, WIDOWED (solo per SPOUSE_OF/PARTNER_OF)
    biological  BOOLEAN,              -- rilevante solo per PARENT_OF
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_relationship_not_self CHECK (person_a_id <> person_b_id),
    CONSTRAINT chk_relationship_type CHECK (type IN ('PARENT_OF', 'SPOUSE_OF', 'PARTNER_OF'))
);

CREATE INDEX idx_relationships_person_a ON relationships (person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships (person_b_id);
CREATE INDEX idx_relationships_type ON relationships (type);

-- ============================================================
-- NICKNAMES: come "viewer" chiama "target" (es. io chiamo mia
-- moglie "amore", i miei figli mi chiamano "papà").
-- ============================================================
CREATE TABLE nicknames
(
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID         NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    target_id UUID         NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    label     VARCHAR(100) NOT NULL,
    CONSTRAINT uq_nickname_viewer_target UNIQUE (viewer_id, target_id),
    CONSTRAINT chk_nickname_not_self CHECK (viewer_id <> target_id)
);

-- ============================================================
-- PERMISSION_GRANTS: chi può vedere/modificare cosa. Generico
-- per modulo (resource_type), così i moduli futuri non toccano
-- il modello di permessi.
-- ============================================================
CREATE TABLE permission_grants
(
    id                        UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    owner_person_id           UUID        NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    resource_type             VARCHAR(50) NOT NULL, -- es. 'HEALTH_RECORD', 'CALENDAR_EVENT', 'SHOPPING_LIST'
    resource_id               UUID,                 -- NULL = tutte le risorse di questo tipo appartenenti all'owner
    grantee_type              VARCHAR(30) NOT NULL, -- PERSON, RELATIONSHIP_TYPE, HOUSEHOLD
    grantee_person_id         UUID REFERENCES persons (id) ON DELETE CASCADE,
    grantee_relationship_type VARCHAR(30),          -- usato quando grantee_type = RELATIONSHIP_TYPE
    grantee_household_id      UUID REFERENCES households (id) ON DELETE CASCADE,
    permission_level          VARCHAR(20) NOT NULL, -- READ, WRITE, ADMIN
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_grantee_type CHECK (grantee_type IN ('PERSON', 'RELATIONSHIP_TYPE', 'HOUSEHOLD'))
);

CREATE INDEX idx_permission_grants_owner ON permission_grants (owner_person_id);
CREATE INDEX idx_permission_grants_resource ON permission_grants (resource_type, resource_id);

-- ============================================================
-- GOOGLE_INTEGRATIONS: token OAuth per servizio Google, legati
-- all'account (non alla persona): un account potrebbe un giorno
-- far parte di più contesti familiari.
-- ============================================================
CREATE TABLE google_integrations
(
    id                      UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    account_id              UUID        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    service                 VARCHAR(30) NOT NULL, -- CALENDAR, GMAIL, CONTACTS, FAMILY_LINK
    access_token_encrypted  TEXT        NOT NULL,
    refresh_token_encrypted TEXT        NOT NULL,
    scope                   TEXT        NOT NULL,
    last_sync_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_google_integration_account_service UNIQUE (account_id, service)
);
