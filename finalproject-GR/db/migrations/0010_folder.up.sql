-- Test case folders (PRD §2.3, §6.2) and user-controlled ordering (ADR 0014).
-- Standard tenant-scoped table (ADR 0003); soft delete with a shared deletion_id so a
-- folder subtree can be restored together later (ADR 0007).
-- position_key columns are COLLATE "C": the server's keyBetween() compares keys
-- byte-wise, and the database must sort them the same way.
-- Run as railgun_migrator.

CREATE TABLE folder (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       uuid NOT NULL,
    workspace_id     uuid NOT NULL,
    -- Null = root. Depth (max 4) is checked by the API on every write, not stored.
    parent_folder_id uuid,
    name             text NOT NULL CHECK (btrim(name) <> ''),
    position_key     text COLLATE "C" NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    deleted_by       uuid REFERENCES "user"(id),
    deletion_id      uuid,
    UNIQUE (id, workspace_id),
    FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE,
    -- No cascade: deletes are soft; a future purge removes children first (ADR 0007).
    FOREIGN KEY (parent_folder_id, workspace_id) REFERENCES folder(id, workspace_id)
);

-- Sibling folder names are unique, ignoring case, among non-deleted folders.
CREATE UNIQUE INDEX folder_sibling_name_idx ON folder (
    project_id,
    COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
) WHERE deleted_at IS NULL;
CREATE INDEX folder_parent_idx ON folder (project_id, parent_folder_id) WHERE deleted_at IS NULL;

ALTER TABLE folder ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON folder
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No DELETE: deletion is a soft delete (an UPDATE).
GRANT SELECT, INSERT, UPDATE ON folder TO railgun_app;

-- Test cases join the tree: optional folder (null = root), an order key, and the
-- deletion_id a folder delete stamps on the test cases it takes with it.
ALTER TABLE test_case ADD COLUMN folder_id uuid;
ALTER TABLE test_case ADD COLUMN deletion_id uuid;
ALTER TABLE test_case ADD COLUMN position_key text COLLATE "C";
ALTER TABLE test_case ADD CONSTRAINT test_case_folder_fk
    FOREIGN KEY (folder_id, workspace_id) REFERENCES folder(id, workspace_id);

-- Backfill: every existing test case is at the root, so one sequence per project in
-- creation order. Fixed width keeps numeric and byte order identical; the trailing '1'
-- keeps keys valid for keyBetween (keys never end in '0').
-- FORCE RLS applies even to this owner role and a migration has no tenant context,
-- so lift it for the cross-tenant backfill only, then restore it (same transaction).
ALTER TABLE test_case NO FORCE ROW LEVEL SECURITY;
UPDATE test_case t
SET position_key = k.key
FROM (
    SELECT id, lpad(row_number() OVER (PARTITION BY project_id ORDER BY created_at, id)::text, 8, '0') || '1' AS key
    FROM test_case
) k
WHERE t.id = k.id;
ALTER TABLE test_case FORCE ROW LEVEL SECURITY;

ALTER TABLE test_case ALTER COLUMN position_key SET NOT NULL;
CREATE INDEX test_case_folder_idx ON test_case (project_id, folder_id) WHERE deleted_at IS NULL;
