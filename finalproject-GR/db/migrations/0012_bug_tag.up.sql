-- Tags on bugs (PRD §2.4, ADR 0016), shaped like test_case_tag (0011). Join rows cascade
-- with either side; the activity log keeps the history.
-- Run as railgun_migrator.

-- Lets bug_tag reference bug through the composite (id, workspace_id) tenant pattern.
-- Already holds, since id is the primary key.
ALTER TABLE bug ADD CONSTRAINT bug_id_workspace_id_key UNIQUE (id, workspace_id);

CREATE TABLE bug_tag (
    bug_id        uuid NOT NULL,
    tag_id        uuid NOT NULL,
    workspace_id  uuid NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bug_id, tag_id),
    FOREIGN KEY (bug_id, workspace_id) REFERENCES bug(id, workspace_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id, workspace_id) REFERENCES tag(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX bug_tag_tag_idx ON bug_tag (tag_id);

ALTER TABLE bug_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_tag FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bug_tag
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- No UPDATE: a join row is only ever added or removed.
GRANT SELECT, INSERT, DELETE ON bug_tag TO railgun_app;
