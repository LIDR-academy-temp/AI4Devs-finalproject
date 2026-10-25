-- Reverses 0009_bug.up.sql.

DROP TABLE IF EXISTS bug;
ALTER TABLE test_run DROP CONSTRAINT IF EXISTS test_run_id_workspace_id_key;
