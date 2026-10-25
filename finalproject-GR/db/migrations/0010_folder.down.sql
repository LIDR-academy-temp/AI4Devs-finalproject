-- Reverses 0010_folder.up.sql.

DROP INDEX IF EXISTS test_case_folder_idx;
ALTER TABLE test_case DROP CONSTRAINT IF EXISTS test_case_folder_fk;
ALTER TABLE test_case DROP COLUMN IF EXISTS position_key;
ALTER TABLE test_case DROP COLUMN IF EXISTS deletion_id;
ALTER TABLE test_case DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS folder;
