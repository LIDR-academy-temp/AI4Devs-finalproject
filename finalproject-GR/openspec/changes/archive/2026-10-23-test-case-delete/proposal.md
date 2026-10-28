# Proposal

## Why

Test case authoring (`test-case-authoring`) shipped create/read/update but deliberately left delete out of scope, since its authorization (Admin-only, not Contributor) and semantics (soft-delete, hide-from-list) differ materially from the other verbs. Without it, a test case can never be removed once created — an Admin has no way to retire test cases that no longer belong in a project.

## What Changes

- Add `DELETE /projects/:projectId/test-cases/:testCaseId`, gated by the project-authorization guard, requiring at least `Admin` (PRD §6.2.5, §7.1 — Contributors "cannot delete"). Workspace Owners already resolve to implicit Project Admin, so no new role logic is needed.
- Delete is a soft-delete: sets `deleted_at`/`deleted_by` on the existing columns (added in `test-case-authoring`'s migration but never written to until now). No row is physically removed.
- A soft-deleted test case disappears from `GET /projects/:projectId/test-cases` (list) and `GET .../:testCaseId` (detail) returns 404 — both already filter or can filter on `deleted_at IS NULL`.
- No new migration: this is an `UPDATE` (setting `deleted_at`/`deleted_by`), not an SQL `DELETE`, so the `UPDATE` grant `test-case-authoring`'s migration already gave `railgun_app` on `test_case` covers it.
- **Explicitly deferred, not implemented here:** PRD §6.2.5's rule that delete is refused (with the blocking executions listed) while the test case is part of a Draft/Ready/InProgress/Paused execution. No `test_execution` concept exists yet in this codebase (Phase 6 of the roadmap) — there is nothing to check against. Delete is unconditionally allowed for now; this is a recorded gap to close when the execution lifecycle lands, not a silent omission.
- **Out of scope:** the Trash list/restore screen and endpoint (PRD §6.9, §2.11) — the bare `deleted_at`/`deleted_by` columns already exist and are now written to, but listing or restoring deleted items is a separate, later slice. Folder delete (folders are cut entirely from MVP scope). Hard/permanent delete and the 30-day purge job (ADR 0007).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `test-case-authoring`: adds a delete requirement (Admin-only, soft-delete, hidden from list/detail afterward) to the existing test case capability.

## Impact

- **DB:** no new migration — soft-delete columns and the `UPDATE` grant both already exist from `test-case-authoring`'s migration (0005).
- **API:** `apps/api/src/test-cases/test-cases.controller.ts` gains a `DELETE :testCaseId` handler; `list`/`detail` already filter on `deleted_at IS NULL` and need no change.
- **Tests:** new e2e coverage for Admin-only delete, post-delete list/detail hiding, and role denial (Contributor/Viewer/no-access all get 403).
