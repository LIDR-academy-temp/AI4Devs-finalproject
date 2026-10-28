# Design

## Context

See proposal.md for motivation. Builds on `tenant-base-schema` (RLS pattern, `withTenantContext`, the two-role split). Constraint: ADR 0007 requires immutability enforced by the database, not convention, and requires the log to have no foreign keys so the eventual trash purge (not yet built) can never cascade into it.

## Goals / Non-Goals

**Goals:**
- `activity_entries` exists, is append-only at the database level (privileges plus a trigger, not just application discipline), and passes the RLS-coverage check from `tenant-base-schema`.
- `ActivityLogger.log(tx, entry)` exists, is correct (same-transaction atomicity proven by test), and is ready for the first real caller.

**Non-Goals:**
- No real mutation calls `ActivityLogger.log` yet — nothing exists to log beyond what `tenant-base-schema` built, which has nothing worth logging.
- No category-derivation-from-entity-type function. See Decisions — building that now would mean guessing at `entity_type` strings for tables that don't exist yet (test cases, executions, bugs are all later phases).
- No break-glass erasure procedure — only the role and the trigger's exception for it (open-questions.md B4 stays open).

## Decisions

### Table shape

`activity_entries`: `id uuid PK default gen_random_uuid()`, `workspace_id uuid not null`, `project_id uuid` (nullable — null for workspace-level events), `actor_user_id uuid` (nullable — null for system actions), `actor_display_name text` (nullable, paired with `actor_user_id`), `action_code text not null`, `entity_type text not null`, `entity_id uuid not null`, `entity_name text not null`, `category text not null`, `details jsonb`, `created_at timestamptz not null default now()`.

**No foreign keys at all** — not to `workspace`, not to `project`, not to `"user"`. This is deliberate (ADR 0007): a foreign key would let a future `ON DELETE CASCADE` silently wipe history. `workspace_id`/`project_id`/`entity_id` are plain UUID columns the application is trusted to populate correctly at write time (verified by tests, not the database).

A check constraint keeps `actor_user_id` and `actor_display_name` null together or populated together: `CHECK ((actor_user_id IS NULL) = (actor_display_name IS NULL))` — there's no such thing as a human actor with no name snapshot, or a snapshot with no id.

**`category` is a plain column, not derived by `ActivityLogger` itself.** PRD §6.6 frames category as "derived from entity type," but every `entity_type` value that mapping would need to cover (test case, execution, bug, ...) belongs to a table that doesn't exist until a later phase. Building the derivation function now means guessing at string values before they're real. The caller passes `category` explicitly; the first real caller's change is where a derivation helper (if still wanted) gets built against actual entity types.

### RLS

Standard tenant policy, same pattern as every other table in `tenant-base-schema` (keyed on `workspace_id`, which is always present even for workspace-level events — `project_id` being null doesn't change the tenant key):
```sql
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_entries
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);
```

### Immutability: privileges *and* a trigger, not either alone

`railgun_app` is granted only `SELECT, INSERT` on `activity_entries` — `UPDATE`/`DELETE`/`TRUNCATE` are simply never granted (no explicit `REVOKE` needed; this is a brand-new table, so there's nothing to revoke from). That alone stops the ordinary application role.

It does **not** stop `railgun_migrator`, which owns the table — an owner can `UPDATE`/`DELETE` its own rows regardless of its own grants. ADR 0007's threat model is explicitly "an application bug, a SQL injection, or stolen application credentials" — stolen *migration-role* credentials would defeat privilege-based protection alone. A `BEFORE UPDATE OR DELETE` trigger closes that gap by rejecting the operation for every role except a reserved `railgun_breakglass` role, regardless of ownership or grants:
```sql
CREATE ROLE railgun_breakglass NOLOGIN; -- reserved, inert until the (separate, future) erasure procedure activates it

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

-- A BEFORE trigger only runs after Postgres's own privilege check already passed, so
-- the trigger's exception is meaningless without a backing grant:
GRANT SELECT, UPDATE, DELETE ON activity_entries TO railgun_breakglass;
```
`railgun_breakglass` is created `NOLOGIN` — reserved and inert. Activating it (granting `LOGIN` and a credential) is a separate, deliberate, audited step belonging to the erasure procedure itself, which stays out of scope here (ADR 0007's own Open Items; open-questions.md B4).

### `ActivityLogger.log`

```ts
interface ActivityLogEntry {
  workspaceId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  actorDisplayName?: string | null; // must be set together with actorUserId, or both null
  actionCode: string;
  entityType: string;
  entityId: string;
  entityName: string;
  category: string;
  details?: Record<string, unknown>;
}

async function log(tx: Prisma.TransactionClient, entry: ActivityLogEntry): Promise<void>
```

Takes a `Prisma.TransactionClient` (`tx`), never a `PrismaClient` — it must run *inside* the caller's own transaction, which is the entire point (ADR 0007: "written in the same transaction as the change it records"). It does not open a transaction itself and is not a `withTenantContext` caller; the caller is already inside one.

## Risks / Trade-offs

- **[Risk]** The trigger identifies the break-glass role by name (`current_user = 'railgun_breakglass'`). If that role were ever renamed, the trigger would silently stop recognizing it. → **Mitigation:** a role rename is already a deliberate, rare operation; a test asserts the trigger's expected name matches the role actually created.
- **[Risk]** `details jsonb` has no enforced shape, so inconsistent payloads across future callers could make it hard to query later. → **Mitigation:** not a real concern yet (no callers exist); the first real caller's change should establish a documented convention.
- **[Risk]** Nothing calls `ActivityLogger.log` in production code yet, so its correctness is proven only by this change's own tests, not real usage. → **Mitigation:** the tests specifically exercise commit-vs-rollback atomicity against a real Postgres transaction — the part most likely to hide a subtle bug.

## Migration Plan

Additive only — a new table, trigger, function, and role; no existing table changes. Rollback drops all four, in dependency order.
