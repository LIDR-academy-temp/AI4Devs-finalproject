# ADR 0007: Activity Log Immutability and Trash Purge

**Status:** Accepted, amended by [ADR 0013](0013-bug-lifecycle-and-auto-creation.md) (bug lifecycle, snapshot source and auto-creation)
**Date:** 2026-09-23
**Amends:** [ADR 0001](0001-tech-stack.md) (adds a layer ADR 0001 did not cover; it justified Postgres partly by "FK cascades on deletes")

## Context

[PRD.md](../../PRD.md) v1.1 sets up a tension between two rules:

- The **activity log is immutable** (§2.10) and is **never deleted**. Its entries keep the name of an item as it was, even after the item is permanently removed (§2.11).
- Deleted items sit in a **trash for 30 days and are then permanently removed**, together with their dependents (§2.11).

The log also records events beyond ordinary edits: invitations and membership changes, deletes and restores, and every reveal of a stored password (PRD §6.6 and ADR 0004). A reveal that isn't reliably recorded defeats the point of allowing it. The screens read the log with grouping by day, per-type filters, per-entity history panels and infinite scroll (§6.6, §6.3.3, §6.4.3).

ADR 0001 justified PostgreSQL partly by foreign-key cascades on deletes. That reasoning holds for ordinary data, but the log must **not** be part of any cascade.

## Decision

### Activity log

1. **Table and shape.** One `activity_entries` table, a tenant table under ADR 0003 (`workspace_id`, RLS). Each entry holds: time-ordered id, `workspace_id`, `project_id` (null for workspace-level events), the actor's user id (null for system actions) and the actor's **display-name snapshot**, an action code, `entity_type`, `entity_id`, an **entity-name snapshot**, a category (derived from entity type, per PRD §6.6), a small details object, and `created_at`. **There are no foreign keys to entities or users**, so nothing that happens to those rows can cascade into the log. Snapshots hold display names only, not email addresses, to minimise personal data.
2. **Written in the same transaction as the change it records**, by one logging function in the domain layer. There is no separate process that logs after the fact, so a change cannot exist without its entry. This includes secret reveals, deletes, restores, invitations and membership changes.
3. **Immutability is enforced by the database, not by convention.**
   - The application's database role has `INSERT` and `SELECT` on the table; `UPDATE`, `DELETE` and `TRUNCATE` are revoked.
   - A trigger rejects any `UPDATE` or `DELETE` from every role except a dedicated **break-glass role** that exists only for the audited erasure procedure below.
   - Migrations run under a separate role and must not modify existing rows; a migration check enforces this.
4. **Reading.** Keyset pagination on `(workspace_id, project_id, created_at desc, id)` for "Load more" and infinite scroll, never offset pagination. Indexes support the category filter and the per-entity history panels (`entity_type`, `entity_id`). Day grouping uses the viewer's timezone.
5. **Growth.** Append-only and retained indefinitely. Partitioning by month is added when volume warrants it.
6. **Privacy exception.** Erasing a person (a support-only path in v1, per PRD decision 10) runs a privileged, audited procedure using the break-glass role. It replaces the actor name snapshot with "Former member" and never changes the action, entity, or time. The procedure writes its own log entry.

### Trash purge

1. **Soft delete.** Top-level items (test case, folder, execution, bug, project) carry `deleted_at` and `deleted_by`. Deleting a folder or project marks its subtree under one shared deletion id so it can be restored together. Restoring follows the PRD rule that restoring an item whose containing folder is in the trash restores that folder too. The data-access layer excludes deleted rows from every read, list, metric and report by default.
2. **Purge job.** A daily scheduled singleton job (ADR 0005) processes each workspace under its tenant context. It selects top-level items deleted more than 30 days ago and, in batches, purges each in one transaction, together with its dependents, in dependency order. The job is idempotent and safe to retry.
3. **What survives a purge (PRD §2.11):**
   - Purging a **test case** keeps its runs inside their executions. Runs therefore store a snapshot of the test case name and Gherkin script and hold a nullable reference; links from bugs show "deleted".
   - Purging an **execution** removes its runs, step results and attempts and clears the bug links to them; the bugs keep their own Gherkin snapshot.
   - Purging a **bug** removes its images; purging a **project** removes everything under it.
   - **The activity log is untouched**, because it has no foreign keys.
4. **One system entry per top-level item** ("permanently removed", with the name snapshot), attributed to a system actor, not one per dependent row.
5. **Object storage.** File deletions (bug images) are enqueued in the same transaction as the purge (ADR 0005), so an image is never orphaned or deleted before its rows are. An orphan-cleanup job is the safety net.
6. **Permissions.** The purge runs as the application role under RLS. That role can delete from tenant tables but, by the rules above, never from the log.

## Rationale

- **Structural separation makes the two PRD rules compatible.** With no foreign keys and name snapshots, the log is readable after its subject is gone and can never be deleted by a cascade.
- **Same-transaction logging** closes the gap where a change commits but its entry is lost, which matters most for secret reveals.
- **Database privileges plus a trigger** protect history from the failures that are actually likely here: an application bug, a SQL injection, or stolen application credentials. They also cost almost nothing at runtime.

## Alternatives Considered

- **Tamper-evident hash chain per workspace.** Would detect alteration even by a privileged database user. Rejected for v1: it serialises writes per workspace, makes the privacy-erasure procedure much harder (rewriting a name breaks the chain), and is more than v1 needs. Revisit if an audit or compliance requirement appears.
- **Application convention only.** Simplest, but immutability becomes a promise, not a property; one bug or injection could rewrite history undetected.
- **Foreign keys with cascades from entities to log entries.** Rejected: it would delete history on purge, contradicting the PRD.

## Consequences

- **Log entries can outlive their subjects.** The UI shows the snapshot name and a non-navigable "deleted" state for such entries.
- **No foreign keys means the database does not police these references.** Tests must verify that entries reference real entities at write time.
- **The activity feed of a purged project becomes unreachable in the UI**, although its entries remain stored. This is accepted for v1.
- Not covered: a database superuser can still alter the log. The break-glass role's credentials need controlled handling and its use is itself logged.
- Runs and other dependents must store the snapshots they need (test case name and script) so purging their source does not break them. This is a data-model requirement for the next phase.

## Open Items

- Who holds the break-glass credentials and the exact erasure runbook.
- Partitioning threshold for the log table.
- Whether Owners should ever be able to view the log of a purged project.
- ~~Exact snapshot columns on runs and bugs~~ Settled in readme section 3: runs snapshot the test case name and Gherkin script when the execution starts; bugs snapshot the test case name, script and failed step.
