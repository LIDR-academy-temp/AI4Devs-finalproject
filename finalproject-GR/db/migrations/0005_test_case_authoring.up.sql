-- The first real content entity (PRD §2.5). Standard tenant-scoped table — no new
-- RLS shape needed, because every route stays nested under /projects/:projectId
-- (design.md), so ProjectRoleGuard never needs to resolve a project from a bare
-- test_case id.
-- Run as railgun_migrator.

CREATE TABLE test_case (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     uuid NOT NULL,
    workspace_id   uuid NOT NULL,
    name           text NOT NULL,
    gherkin_script text,
    status         text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ready', 'Deprecated')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    deleted_by     uuid REFERENCES "user"(id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE
);

ALTER TABLE test_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON test_case
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No DELETE grant yet — delete is a separate, Admin-gated slice (proposal.md).
GRANT SELECT, INSERT, UPDATE ON test_case TO railgun_app;
