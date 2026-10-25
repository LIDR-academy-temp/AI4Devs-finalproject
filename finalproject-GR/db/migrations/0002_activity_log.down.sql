-- Reverses 0002_activity_log.up.sql. railgun_breakglass is not dropped here — it was
-- created in db/init/01-roles.sql (superuser-run), not by this migration.

DROP TABLE IF EXISTS activity_entries;
DROP FUNCTION IF EXISTS reject_activity_entries_mutation();
