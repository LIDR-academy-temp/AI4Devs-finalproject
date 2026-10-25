# Design

## Context

See proposal.md - Why. `test_case` already carries `deleted_at`/`deleted_by` (added, never written to, in `test-case-authoring`'s migration 0005) and `railgun_app` already holds `SELECT, INSERT, UPDATE` on it — no `DELETE`. `list` and `detail` (from `test-case-authoring`) already filter `WHERE ... AND deleted_at IS NULL`, so once a row's `deleted_at` is set, both already stop returning it with zero changes to their own queries.

## Goals / Non-Goals

**Goals:**
- An Admin-gated endpoint that soft-deletes a test case and makes it immediately disappear from list/detail.

**Non-Goals:**
- Enforcing PRD §6.2.5's "refused while part of an active execution" rule (no `test_execution` concept exists yet — deferred per proposal.md).
- Any Trash list/restore surface, or physically removing the row.

## Decisions

**Soft delete is an `UPDATE`, not a SQL `DELETE` — so no new grant or migration is needed.** The proposal's first draft assumed delete would need a `DELETE` grant on `test_case`; that's wrong for a soft delete. Setting `deleted_at = now()`, `deleted_by = <caller>` on the existing row is an `UPDATE`, and `railgun_app` already has `UPDATE` from migration 0005. Corrected in proposal.md during this design pass, not left for apply to discover. (If a future change ever needs a real SQL `DELETE` — e.g., the 30-day purge job in ADR 0007 — that's the point to add the grant, not now.)

**`DELETE /projects/:projectId/test-cases/:testCaseId` returns 204 with no body**, consistent with there being nothing meaningful left to return once a resource is gone — unlike `PATCH`, which returns the updated representation because callers need to see the result of a partial update.

**Idempotency:** deleting an already-deleted (or nonexistent) test case returns 404, the same `WHERE id = ... AND deleted_at IS NULL` miss that `detail`/`update` already use for a vanished row. No special "already deleted" response — a second delete attempt looks identical to deleting something that was never there, which is the simplest correct behavior and matches how `update` already handles a missing row.

## Risks / Trade-offs

- [No execution-membership check before delete] → Accepted and explicit per proposal.md: nothing to check against yet; this is a recorded gap for the Phase 6 (execution lifecycle) change to close, not a silent one.
