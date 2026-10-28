-- Reverses 0012_bug_tag.up.sql.

DROP TABLE IF EXISTS bug_tag;
ALTER TABLE bug DROP CONSTRAINT IF EXISTS bug_id_workspace_id_key;
