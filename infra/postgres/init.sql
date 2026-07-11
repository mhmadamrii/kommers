-- Each service owns its own database — never a shared schema across services.
-- Add one CREATE DATABASE line here per service as it reaches Phase N in CLAUDE.MD.

CREATE DATABASE kommers_auth;

\connect kommers_auth
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() for primary keys

CREATE DATABASE kommers_catalog;

\connect kommers_catalog
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() for primary keys
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- ILIKE search stub (docs/catalog-service.md § Search stub)
