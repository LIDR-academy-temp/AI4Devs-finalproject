# Proposal

## Why

The activity log is PRD §2.10's audit trail: an immutable record of who did what, to what, and when, that must outlive the entities it describes (PRD §2.11 — purged items keep their activity history). ADR 0007 requires this to be structurally impossible to tamper with or cascade-delete, not a promise kept by convention. Every later change that mutates data needs `ActivityLogger.log` to already exist and be correct, in the same transaction as the change it records — building it now, before any real mutation calls it, means every future change writes to a proven mechanism instead of a new one each time.

## What Changes

- An append-only `activity_entries` table: `workspace_id`, `project_id` (nullable — null for workspace-level events), actor user id (nullable — null for system actions) plus an actor display-name snapshot, `action_code`, `entity_type`, `entity_id`, an entity-name snapshot, a `category` derived from entity type (PRD §6.6), a small `details` object, `created_at`. **No foreign keys to any entity or user table** — nothing that happens to those rows (edits, deletes, the eventual trash purge) can cascade into the log.
- `ActivityLogger.log(tx, entry)`: writes one entry using the caller's own transaction (`tx`), so a logged change and its log entry either both commit or neither does. This change makes the function exist and be correct; it is not called from any real mutation yet, since none exists beyond what `tenant-base-schema` built (which has nothing worth logging).
- Immutability enforced by the database, not convention: `railgun_app` gets only `INSERT` and `SELECT` on `activity_entries` (`UPDATE`/`DELETE`/`TRUNCATE` revoked), plus a trigger rejecting any `UPDATE`/`DELETE` from every role except a reserved break-glass role.
- `activity_entries` carries `workspace_id` (ADR 0003) and gets its own RLS policy, so the RLS-coverage CI check from `tenant-base-schema` continues to pass.
- Keyset pagination support on `(workspace_id, project_id, created_at desc, id)` — never offset — since that's what the (later) Activity screen's "Load more" and per-entity history panels need (PRD §6.6).

**Not included** (explicitly out of scope for this change):
- Calling `ActivityLogger.log` from any real mutation — there isn't one yet worth logging.
- The Activity feed UI and its filter pills (PRD §6.6) — later phase.
- The break-glass privacy-erasure procedure itself — only the role and the trigger's exception for it exist here; the procedure is a separate, audited piece of work (open-questions.md B4).
- Partitioning by month — ADR 0007 defers this until volume warrants it.

## Capabilities

### New Capabilities
- `activity-log`: an append-only, tamper-resistant record of actions taken in a project or workspace. Once written, an entry can never be altered or deleted except through a reserved break-glass path, and it carries its own snapshot of what it describes, so it stays readable and correct independent of what happens to the entities or users it references.

### Modified Capabilities
_None — `activity-log` is new; `api-health-check` and `tenant-isolation` are unaffected._

## Impact

- **Affected code:** new migration (`activity_entries`, its RLS policy, the privilege revocations, the immutability trigger, the break-glass role), `ActivityLogger.log` in the API's data-access layer, and the keyset-pagination query shape for future reads.
- **Dependencies:** none new — reuses `withTenantContext` (ADR 0008) and the role split (ADR 0003) already in place.
- **Systems:** every future change that mutates a tenant table will call `ActivityLogger.log` inside the same transaction; this change is what makes that call meaningful rather than a stub.
