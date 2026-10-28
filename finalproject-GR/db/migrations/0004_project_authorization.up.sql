-- Resolving an effective project role needs to look up "which workspace does this
-- project belong to" and "do I have an explicit project_membership row" before any
-- workspace context is known — the same recurring shape as the dual policies on
-- workspace_membership (tenant-base-schema) and user (identity-provisioning).
-- Both new policies are SELECT-only; writes still require the existing
-- workspace-scoped tenant_isolation policy, unchanged.
-- Run as railgun_migrator.

CREATE POLICY member_visible ON project FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );

CREATE POLICY self_project_membership ON project_membership FOR SELECT
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
