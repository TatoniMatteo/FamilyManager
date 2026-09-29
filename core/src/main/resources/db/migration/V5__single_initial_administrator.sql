CREATE UNIQUE INDEX uq_accounts_single_initial_admin
    ON accounts (initial_admin) WHERE initial_admin = TRUE;
