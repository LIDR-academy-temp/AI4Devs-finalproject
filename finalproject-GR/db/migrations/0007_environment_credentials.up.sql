-- Project-scoped environments and their named credential sets (PRD §2.6, §6.7).
-- First real caller of secrets-encryption (archived) — environment_credential stores
-- each password as a ciphertext envelope produced by that module's encrypt().
-- Standard tenant tables (ADR 0003) — same shape as test_case; no soft-delete columns,
-- since environments are not part of PRD §2.11's Trash model (proposal.md).
-- Run as railgun_migrator.

CREATE TABLE environment (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid NOT NULL,
    workspace_id    uuid NOT NULL,
    name            text NOT NULL,
    base_url        text NOT NULL,
    default_browser text NOT NULL CHECK (default_browser IN ('Chromium', 'Firefox', 'WebKit')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, workspace_id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE
);

CREATE TABLE environment_credential (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id     uuid NOT NULL,
    workspace_id       uuid NOT NULL,
    alias              text NOT NULL,
    email              text NOT NULL,
    password_ciphertext text NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (environment_id, alias),
    FOREIGN KEY (environment_id, workspace_id) REFERENCES environment(id, workspace_id) ON DELETE CASCADE
);

ALTER TABLE environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON environment
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

ALTER TABLE environment_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_credential FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON environment_credential
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- Full CRUD grant, including DELETE — environment deletion is a hard delete from the
-- start (no separate delete slice, unlike test_case), cascading to credentials via FK.
GRANT SELECT, INSERT, UPDATE, DELETE ON environment, environment_credential TO railgun_app;
