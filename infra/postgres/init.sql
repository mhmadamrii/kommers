-- Each service owns its own database — never a shared schema across services.
-- Add one CREATE DATABASE line here per service as it reaches Phase N in CLAUDE.MD.

CREATE DATABASE kommers_auth;

\connect kommers_auth
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() for primary keys
