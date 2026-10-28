-- The user's last active project (ADR 0017): the project switcher writes it, and identity
-- resolution reads it on every request, falling back when it is null, in the trash, or no
-- longer accessible. "user" is not tenant-scoped, so a plain FK is enough; the existing
-- self_access policy already lets a user update their own row.
-- Run as railgun_migrator.

ALTER TABLE "user" ADD COLUMN last_project_id uuid REFERENCES project(id) ON DELETE SET NULL;
