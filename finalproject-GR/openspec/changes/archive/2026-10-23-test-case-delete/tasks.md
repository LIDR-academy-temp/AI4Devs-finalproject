# Tasks

## 1. Delete endpoint

- [x] 1.1 Implement `DELETE /projects/:projectId/test-cases/:testCaseId` (`Admin`+) — sets `deleted_at`/`deleted_by` via `UPDATE` (no new grant needed, per design.md) — verify e2e against real Postgres: an Admin deletes a test case and gets 204
- [x] 1.2 Verify deletion effect: after delete, the test case no longer appears in `GET /projects/:projectId/test-cases` (list), and `GET .../:testCaseId` (detail) returns 404
- [x] 1.3 Verify idempotency/not-found: deleting a nonexistent or already-deleted test case returns 404
- [x] 1.4 Verify role denial: a `Contributor` attempting to delete gets 403; a `Viewer` attempting to delete gets 403; a caller with no effective access gets 403

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
