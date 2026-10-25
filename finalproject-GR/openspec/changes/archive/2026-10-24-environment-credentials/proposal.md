# Proposal

## Why

PRD §2.6 and §6.7 require projects to define Environments (base URL, default browser, one or more named credential sets) that executions will later run against, with credentials recoverable on demand but masked by default. ADR 0004's envelope encryption mechanism (`secrets-encryption`, archived) exists precisely to back this feature but has no caller yet. Phase 5 Slice 1 built the mechanism in isolation; this slice — roadmap-mvp.md's Phase 5 Slice 2 — is its first real consumer: environment CRUD plus the reveal-and-audit endpoint, the one feature area the MVP roadmap keeps un-simplified (full encryption, full audit) because retrofitting it later means migrating plaintext-adjacent data under pressure.

## What Changes

- Add an `environment` table (project-scoped: name, base URL, default browser) and an `environment_credential` child table (alias, email, encrypted password) — both standard tenant tables per ADR 0003, following the same shape as `test_case`.
- Add `POST/GET/GET:id/PATCH/DELETE /projects/:projectId/environments`, covering environment fields and nested credential aliases/emails together (credentials are managed as part of their parent environment, matching the PRD's single environment-editor modal — there is no separate credentials endpoint).
- Store each credential's password via `secrets-encryption`'s `encrypt`, keyed by the credential's own row id as `secretId`; list/detail responses never include password values, only whether one is set.
- Add a dedicated `POST /projects/:projectId/environments/:environmentId/credentials/:credentialId/reveal` endpoint: decrypts the password, writes an activity-log entry in the same transaction, is rate-limited per user, and responds with `Cache-Control: no-store` (ADR 0004 #5).
- Environment deletion is a hard `DELETE` (cascading to its credentials) — PRD §2.11's trash model does not list Environment among the entities that go to trash, unlike test cases/folders/executions/bugs/projects.
- No soft-delete columns on `environment`/`environment_credential`, for the same reason.

## Capabilities

### New Capabilities
- `environment-credentials`: project-scoped environment configuration (name, base URL, default browser) and its named credential sets, including the audited reveal path for recovering a credential's password.

### Modified Capabilities
(none — this change only consumes `secrets-encryption`'s existing `encrypt`/`decrypt` functions as a caller; the mechanism's own requirements are unchanged)

## Impact

- **DB:** new migration adding `environment` and `environment_credential` (both tenant tables per ADR 0003 — `workspace_id`-keyed RLS, same shape as `test_case`; no soft-delete columns, see above).
- **API:** new `src/environments/environments.controller.ts` (CRUD) and a reveal route within it; a small in-process rate-limit helper for the reveal endpoint (design.md decides the approach — no new dependency, matching `secrets-encryption`'s own "built-in `crypto`, no new dependency" precedent).
- **Activity log:** a new reveal action is written via the existing `log(tx, …)` helper (`activity-log`, archived) — this is the first caller to actually wire activity logging into a controller.
- **No new caller changes to `secrets-encryption`** — only `encrypt`/`decrypt` are used, as designed.
- **Out of scope:** the environment picker in the New Execution modal, and the execution-detail environment panel (PRD §6.3.3) — both belong to Phase 6 (Execution lifecycle), not yet started. G10 (what happens to a Draft/Ready execution's environment link when that environment is deleted) stays open until that phase.
