-- Reverses 0008_test_execution.up.sql.

DROP TABLE IF EXISTS test_run;
DROP TABLE IF EXISTS test_execution;
ALTER TABLE test_case DROP CONSTRAINT IF EXISTS test_case_id_workspace_id_key;
