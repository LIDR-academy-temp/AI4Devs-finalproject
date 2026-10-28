-- Tags (PRD §2.4, ADR 0016): per-project coloured labels, applied to test cases here
-- (bugs join in a later change). Standard tenant-scoped tables (ADR 0003). Tags are
-- deleted permanently, not soft-deleted (ADR 0016 decision 5), so the join rows
-- cascade; the activity log keeps the history.
-- Run as railgun_migrator.

CREATE TABLE tag (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    uuid NOT NULL,
    workspace_id  uuid NOT NULL,
    name          text NOT NULL CHECK (btrim(name) <> '' AND length(name) <= 50),
    -- Palette token names, rendered per theme by the web app (ADR 0016 decision 2).
    color         text NOT NULL CHECK (color IN ('gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, workspace_id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE
);

-- Names are unique within a project, ignoring case.
CREATE UNIQUE INDEX tag_project_name_idx ON tag (project_id, lower(name));

CREATE TABLE test_case_tag (
    test_case_id  uuid NOT NULL,
    tag_id        uuid NOT NULL,
    workspace_id  uuid NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (test_case_id, tag_id),
    FOREIGN KEY (test_case_id, workspace_id) REFERENCES test_case(id, workspace_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id, workspace_id) REFERENCES tag(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX test_case_tag_tag_idx ON test_case_tag (tag_id);

ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tag
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE test_case_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_tag FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON test_case_tag
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON tag TO railgun_app;
-- No UPDATE: a join row is only ever added or removed.
GRANT SELECT, INSERT, DELETE ON test_case_tag TO railgun_app;
