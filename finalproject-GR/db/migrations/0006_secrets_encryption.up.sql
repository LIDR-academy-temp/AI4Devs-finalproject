-- Application-level envelope encryption foundation (ADR 0004). One wrapped data
-- encryption key per workspace; no secret-holding caller yet (design.md).
-- Run as railgun_migrator.

CREATE TABLE workspace_dek (
    workspace_id       uuid PRIMARY KEY REFERENCES workspace(id) ON DELETE CASCADE,
    wrapped_dek        text NOT NULL,
    master_key_version integer NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspace_dek ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_dek FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workspace_dek
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No UPDATE/DELETE — a DEK is never modified or removed in this slice (design.md).
GRANT SELECT, INSERT ON workspace_dek TO railgun_app;
