-- Base schema: workspace, user, workspace_membership, project, project_membership.
-- Tenant isolation enforced via RLS (ADR 0003); mechanism per ADR 0008.
-- Run as railgun_migrator, which owns these objects.

CREATE TABLE workspace (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "user" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id   text NOT NULL UNIQUE,
    display_name    text NOT NULL,
    email           text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_membership (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role          text NOT NULL CHECK (role IN ('Owner', 'Collaborator')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE TABLE project (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name          text NOT NULL,
    slug          text NOT NULL,
    deleted_at    timestamptz,
    deleted_by    uuid REFERENCES "user"(id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, slug),
    UNIQUE (id, workspace_id)
);

CREATE TABLE project_membership (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    uuid NOT NULL,
    workspace_id  uuid NOT NULL,
    user_id       uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role          text NOT NULL CHECK (role IN ('Admin', 'Contributor', 'Viewer')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE
);

-- Row-Level Security: standard tenant-scoped policies.

ALTER TABLE workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workspace
  USING      (id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON project
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE project_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_membership FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON project_membership
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- Row-Level Security: narrow user-keyed path (ADR 0003 point 4) for tables that must be
-- queryable before any workspace is selected.

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;
CREATE POLICY self_access ON "user"
  USING      (id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE workspace_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_membership FORCE ROW LEVEL SECURITY;
-- Two permissive policies, combined with OR: visible if the viewer is this row's own
-- user (pre-workspace-selection lookups) OR the active workspace matches (membership
-- listings once a workspace is selected). See design.md.
CREATE POLICY self_membership ON workspace_membership
  USING      (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY workspace_scoped ON workspace_membership
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- Privileges: railgun_app owns nothing and cannot bypass RLS; grant only the DML it needs.
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace, "user", workspace_membership, project, project_membership TO railgun_app;
