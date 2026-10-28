-- Append-only activity log (ADR 0007). No foreign keys to any entity or user table —
-- see design.md: a cascade would silently wipe history.
-- Run as railgun_migrator, which owns this object.

CREATE TABLE activity_entries (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       uuid NOT NULL,
    project_id         uuid,
    actor_user_id      uuid,
    actor_display_name text,
    action_code        text NOT NULL,
    entity_type        text NOT NULL,
    entity_id          uuid NOT NULL,
    entity_name        text NOT NULL,
    category           text NOT NULL,
    details            jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CHECK ((actor_user_id IS NULL) = (actor_display_name IS NULL))
);

-- Row-Level Security: standard tenant-scoped policy, same pattern as 0001.
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_entries
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

-- Privileges: only SELECT and INSERT. UPDATE/DELETE/TRUNCATE are never granted —
-- this is a brand-new table, so there is nothing to revoke.
GRANT SELECT, INSERT ON activity_entries TO railgun_app;

-- railgun_breakglass needs its own UPDATE/DELETE grant for the trigger's exception to
-- mean anything: a BEFORE trigger only runs after the privilege check already passed,
-- so "the trigger allows it" is not enough on its own.
GRANT SELECT, UPDATE, DELETE ON activity_entries TO railgun_breakglass;

-- Immutability backstop: a trigger rejects UPDATE/DELETE for every role except the
-- reserved break-glass role, closing the gap that privileges alone leave open for
-- railgun_migrator (the table owner, which privileges don't restrict). The
-- railgun_breakglass role itself is created in db/init/01-roles.sql (superuser-run;
-- railgun_migrator lacks CREATEROLE).
CREATE FUNCTION reject_activity_entries_mutation() RETURNS trigger AS $$
BEGIN
  IF current_user <> 'railgun_breakglass' THEN
    RAISE EXCEPTION 'activity_entries is append-only; % by % is not permitted', TG_OP, current_user;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_entries_immutable
  BEFORE UPDATE OR DELETE ON activity_entries
  FOR EACH ROW EXECUTE FUNCTION reject_activity_entries_mutation();

-- Keyset pagination support (ADR 0007 / PRD §6.6): newest first, scoped per workspace
-- and optionally per project, with id as the final tiebreaker.
CREATE INDEX activity_entries_keyset_idx
  ON activity_entries (workspace_id, project_id, created_at DESC, id DESC);
