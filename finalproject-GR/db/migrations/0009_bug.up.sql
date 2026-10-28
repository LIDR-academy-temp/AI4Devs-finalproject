-- Bugs (PRD §2.9, §6.4), text-only for the MVP: no images, no tags. Standard
-- tenant-scoped table (ADR 0003); snapshot and linking rules in ADR 0013.
-- Requires Postgres >= 15 (`ON DELETE SET NULL (column)`, as 0008).
-- Run as railgun_migrator.

-- Lets bug reference test_run through the composite (id, workspace_id) pattern.
-- Already holds, since id is the primary key.
ALTER TABLE test_run ADD CONSTRAINT test_run_id_workspace_id_key UNIQUE (id, workspace_id);

CREATE TABLE bug (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              uuid NOT NULL,
    workspace_id            uuid NOT NULL,
    title                   text NOT NULL,
    severity                text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    status                  text NOT NULL DEFAULT 'Open'
                            CHECK (status IN ('Open', 'InProgress', 'Resolved', 'Closed', 'WontFix')),
    description             text,
    steps_to_reproduce      text,
    -- Links cleared by a purge (ADR 0007); the snapshots below keep the context.
    test_run_id             uuid,
    test_case_id            uuid,
    -- Copied by the server from the run's own start snapshot (ADR 0013), never from requests.
    test_case_name_snapshot text,
    gherkin_snapshot        text,
    -- One trimmed, non-blank line of gherkin_snapshot, picked by the reporter.
    failed_step_snapshot    text,
    reporter_id             uuid NOT NULL REFERENCES "user"(id),
    -- Stored because "user" rows are only readable by their owner (same as activity_entries).
    reporter_display_name   text NOT NULL,
    auto_created            boolean NOT NULL DEFAULT false,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    deleted_at              timestamptz,
    deleted_by              uuid REFERENCES "user"(id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE,
    FOREIGN KEY (test_run_id, workspace_id) REFERENCES test_run(id, workspace_id) ON DELETE SET NULL (test_run_id),
    FOREIGN KEY (test_case_id, workspace_id) REFERENCES test_case(id, workspace_id) ON DELETE SET NULL (test_case_id)
);

-- At most one auto-created bug per run (ADR 0013 decision 2), enforced here so a
-- Fail → Pass → Fail flip or a concurrent write can never produce a second one.
CREATE UNIQUE INDEX bug_one_auto_per_run_idx ON bug (test_run_id) WHERE auto_created AND deleted_at IS NULL;
CREATE INDEX bug_project_idx ON bug (project_id) WHERE deleted_at IS NULL;
CREATE INDEX bug_test_run_idx ON bug (test_run_id);

ALTER TABLE bug ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bug
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No DELETE: deletion is a soft delete (an UPDATE), same as test_case/test_execution.
GRANT SELECT, INSERT, UPDATE ON bug TO railgun_app;
