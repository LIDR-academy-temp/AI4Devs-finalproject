-- Test executions and their runs (PRD §2.7, §2.8, §6.3). Standard tenant-scoped tables
-- (ADR 0003), every route nested under /projects/:projectId like test_case/environment.
-- Lifecycle rules live in the API (ADR 0005, ADR 0012); this file only fixes the shape.
-- Requires Postgres >= 15: `ON DELETE SET NULL (column)` nulls only the referencing id
-- column of a composite FK, keeping workspace_id intact.
-- Run as railgun_migrator.

-- Lets test_run reference test_case through the composite (id, workspace_id) pattern.
-- Already holds, since id is the primary key.
ALTER TABLE test_case ADD CONSTRAINT test_case_id_workspace_id_key UNIQUE (id, workspace_id);

CREATE TABLE test_execution (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id             uuid NOT NULL,
    workspace_id           uuid NOT NULL,
    name                   text NOT NULL,
    description            text,
    -- 'Canceled' is accepted now so Cancel (deferred) needs no constraint migration.
    status                 text NOT NULL DEFAULT 'Draft'
                           CHECK (status IN ('Draft', 'Ready', 'InProgress', 'Paused', 'Completed', 'Done', 'Canceled')),
    -- Cleared when the environment is deleted; environment_name keeps the label (G10).
    environment_id         uuid,
    environment_name       text,
    browser                text NOT NULL CHECK (browser IN ('Chromium', 'Firefox', 'WebKit')),
    viewport_width         integer NOT NULL CHECK (viewport_width > 0),
    viewport_height        integer NOT NULL CHECK (viewport_height > 0),
    locale                 text NOT NULL,
    timezone               text NOT NULL,
    auto_create_bug        boolean NOT NULL DEFAULT false,
    -- Elapsed timer (ADR 0005): time from finished InProgress periods, plus the start of
    -- the current one while InProgress. The client computes the live value.
    elapsed_ms_accumulated bigint NOT NULL DEFAULT 0,
    last_resumed_at        timestamptz,
    started_at             timestamptz,
    completed_at           timestamptz,
    signed_off_at          timestamptz,
    signed_off_by          uuid REFERENCES "user"(id),
    created_by             uuid NOT NULL REFERENCES "user"(id),
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    deleted_at             timestamptz,
    deleted_by             uuid REFERENCES "user"(id),
    UNIQUE (id, workspace_id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE,
    FOREIGN KEY (environment_id, workspace_id) REFERENCES environment(id, workspace_id) ON DELETE SET NULL (environment_id)
);

CREATE TABLE test_run (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id            uuid NOT NULL,
    workspace_id            uuid NOT NULL,
    -- Nullable so a future Trash purge of the test case keeps the run (ADR 0007).
    test_case_id            uuid,
    position                integer NOT NULL CHECK (position > 0),
    outcome                 text NOT NULL DEFAULT 'Pending'
                            CHECK (outcome IN ('Pending', 'Pass', 'Fail', 'NeedsReview')),
    -- Written by Run All (snapshot-on-start, PRD §6.3.4); null until then.
    test_case_name_snapshot text,
    gherkin_script_snapshot text,
    outcome_updated_at      timestamptz,
    outcome_updated_by      uuid REFERENCES "user"(id),
    created_at              timestamptz NOT NULL DEFAULT now(),
    -- Deferred so a Draft run-list replacement can rewrite positions in one transaction.
    UNIQUE (execution_id, position) DEFERRABLE INITIALLY DEFERRED,
    UNIQUE (execution_id, test_case_id),
    FOREIGN KEY (execution_id, workspace_id) REFERENCES test_execution(id, workspace_id) ON DELETE CASCADE,
    FOREIGN KEY (test_case_id, workspace_id) REFERENCES test_case(id, workspace_id) ON DELETE SET NULL (test_case_id)
);

CREATE INDEX test_execution_project_idx ON test_execution (project_id) WHERE deleted_at IS NULL;
CREATE INDEX test_run_test_case_idx ON test_run (test_case_id);

ALTER TABLE test_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON test_execution
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE test_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_run FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON test_run
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No DELETE on test_execution: deletion is a soft delete (an UPDATE), same as test_case.
GRANT SELECT, INSERT, UPDATE ON test_execution TO railgun_app;
-- DELETE on test_run: a Draft run-list replacement deletes and reinserts runs.
GRANT SELECT, INSERT, UPDATE, DELETE ON test_run TO railgun_app;
