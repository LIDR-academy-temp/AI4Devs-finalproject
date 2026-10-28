-- Local dev roles only — passwords here are throwaway container defaults, never real secrets.
-- Role split per ADR 0003 / ADR 0007: a privileged role owns objects and runs migrations;
-- the application role owns nothing and cannot bypass RLS.

CREATE ROLE railgun_migrator WITH LOGIN PASSWORD 'migrator_dev_password';
GRANT ALL ON SCHEMA public TO railgun_migrator;

CREATE ROLE railgun_app WITH LOGIN PASSWORD 'app_dev_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO railgun_app;

-- Reserved for the activity log's break-glass exception (ADR 0007). NOLOGIN — inert
-- until the (separate, future, audited) erasure procedure activates it. Created here,
-- not in a migration, because role creation needs a superuser/CREATEROLE role, which
-- railgun_migrator deliberately does not have.
CREATE ROLE railgun_breakglass NOLOGIN;
