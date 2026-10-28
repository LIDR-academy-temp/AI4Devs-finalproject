-- Reverses 0013_project_management.up.sql.

ALTER TABLE "user" DROP COLUMN IF EXISTS last_project_id;
