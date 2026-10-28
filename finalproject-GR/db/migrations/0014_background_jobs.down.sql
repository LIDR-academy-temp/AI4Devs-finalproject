-- Reverses 0014_background_jobs.up.sql. Leaves the graphile_worker schema (drop it by hand:
-- DROP SCHEMA graphile_worker CASCADE) and the railgun_worker role (harmless without grants).

ALTER POLICY member_visible ON project TO PUBLIC;
DROP POLICY IF EXISTS worker_list_workspaces ON workspace;
REVOKE SELECT (id) ON workspace FROM railgun_worker;
REVOKE INSERT ON activity_entries FROM railgun_worker;
REVOKE SELECT, DELETE ON project, folder, test_case, test_execution, bug FROM railgun_worker;

DROP POLICY IF EXISTS worker_all ON graphile_worker._private_job_queues;
DROP POLICY IF EXISTS worker_all ON graphile_worker._private_jobs;
DROP POLICY IF EXISTS worker_all ON graphile_worker._private_known_crontabs;
DROP POLICY IF EXISTS worker_all ON graphile_worker._private_tasks;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  REVOKE EXECUTE ON FUNCTIONS FROM railgun_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  REVOKE USAGE, SELECT ON SEQUENCES FROM railgun_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM railgun_worker;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker FROM railgun_worker;
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA graphile_worker FROM railgun_worker;
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker FROM railgun_worker;
REVOKE USAGE ON SCHEMA graphile_worker FROM railgun_worker;

DROP FUNCTION IF EXISTS public.enqueue_job(text, jsonb, timestamptz);
