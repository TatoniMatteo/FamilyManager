CREATE UNIQUE INDEX uq_households_name_normalized
    ON households (lower(btrim(name)));
