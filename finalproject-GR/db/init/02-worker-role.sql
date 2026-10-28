-- The background worker's role (ADR 0018, background-jobs). Local dev only — the password is
-- a throwaway container default. Idempotent, so an existing dev database can run it once:
--   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/railgun node scripts/apply-sql.js db/init/02-worker-role.sql
-- Runs as a superuser: railgun_migrator deliberately can't create roles (01-roles.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'railgun_worker') THEN
    -- Like railgun_app: owns nothing, cannot bypass RLS. Its grants come from migration 0014.
    CREATE ROLE railgun_worker WITH LOGIN PASSWORD 'worker_dev_password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO railgun_worker;

-- Lets the migrator create (and so own) the graphile_worker schema, installed by
-- scripts/install-job-queue.js — schema changes keep one owner and one path.
DO $$
BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO railgun_migrator', current_database());
END
$$;
