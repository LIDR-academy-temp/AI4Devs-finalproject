-- Background jobs (ADR 0005, ADR 0018, background-jobs): the allow-listed enqueue wrapper
-- for railgun_app, and railgun_worker's grants. The graphile_worker schema itself is
-- installed before this file by scripts/install-job-queue.js, as this same migrator role.
-- Run as railgun_migrator. Needs db/init/02-worker-role.sql (the railgun_worker role).

-- Enqueue, transactionally: callers run this inside the transaction of the change that
-- triggers the job, so the job exists if and only if that change commits. SECURITY DEFINER
-- because graphile_worker.add_job needs owner privileges; the allow-list is what keeps the
-- app role from queueing anything else. Adding a task means replacing this function.
CREATE FUNCTION public.enqueue_job(task text, payload jsonb DEFAULT '{}', run_at timestamptz DEFAULT now())
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  job_id bigint;
BEGIN
  IF NOT (task = ANY (ARRAY['trash_purge'])) THEN
    RAISE EXCEPTION 'unknown job task: %', task USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT (graphile_worker.add_job(task, payload::json, run_at => run_at)).id INTO job_id;
  RETURN job_id;
END
$$;

REVOKE ALL ON FUNCTION public.enqueue_job(text, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_job(text, jsonb, timestamptz) TO railgun_app;

-- The worker runs the queue: Graphile Worker's runtime privileges aren't documented, so
-- grant the whole of its own schema (never ownership), and cover tables a later Graphile
-- version adds via default privileges. railgun_app gets none of this.
GRANT USAGE ON SCHEMA graphile_worker TO railgun_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO railgun_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA graphile_worker TO railgun_worker;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO railgun_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO railgun_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  GRANT USAGE, SELECT ON SEQUENCES TO railgun_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker
  GRANT EXECUTE ON FUNCTIONS TO railgun_worker;
-- Graphile enables (not forces) RLS on its private tables with no policies, so only the
-- owner gets through (found by running the worker, task 3.2). One policy per table lets
-- this role in; a table a later Graphile version adds with RLS needs its own policy here.
CREATE POLICY worker_all ON graphile_worker._private_job_queues FOR ALL TO railgun_worker USING (true) WITH CHECK (true);
CREATE POLICY worker_all ON graphile_worker._private_jobs FOR ALL TO railgun_worker USING (true) WITH CHECK (true);
CREATE POLICY worker_all ON graphile_worker._private_known_crontabs FOR ALL TO railgun_worker USING (true) WITH CHECK (true);
CREATE POLICY worker_all ON graphile_worker._private_tasks FOR ALL TO railgun_worker USING (true) WITH CHECK (true);

-- The trash purge (ADR 0007): read and delete the top-level trashable rows, under each
-- workspace's tenant context (RLS still applies). Dependents go by FK cascade / SET NULL,
-- which run as the table owner, so no grants on them are needed.
GRANT SELECT, DELETE ON project, folder, test_case, test_execution, bug TO railgun_worker;
GRANT INSERT ON activity_entries TO railgun_worker;

-- Visiting each workspace needs its id before any tenant context exists: a column grant on
-- id only, and a SELECT policy for this role alone. Names and every other tenant table stay
-- behind the tenant_isolation policies.
GRANT SELECT (id) ON workspace TO railgun_worker;
CREATE POLICY worker_list_workspaces ON workspace FOR SELECT TO railgun_worker USING (true);

-- member_visible (0004) serves the API's pre-workspace lookups under app.user_id. Postgres
-- evaluates every applicable policy with the caller's privileges, and its subquery reads
-- workspace_membership, so it would deny the worker any read of project. Scope it to the
-- role it was written for rather than grant the worker membership data.
ALTER POLICY member_visible ON project TO railgun_app;
