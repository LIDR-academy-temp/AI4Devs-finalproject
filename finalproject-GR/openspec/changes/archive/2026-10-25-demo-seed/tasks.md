# Tasks

## 1. Docs

- [x] 1.1 roadmap-mvp.md: rename Phase 9 Slice 4 to "Seed data" 🚧, pointing at OpenSpec change `demo-seed`, and add a dated note to Phase 9's scope line that the optional stats readout was dropped (2026-10-25, user decision). Verify the legend matches Slices 1–3

## 2. Seeding module

- [x] 2.1 `apps/api/src/seed/demo-dataset.ts`: the static ShopFlow dataset per design.md decision 6, as plain typed data with stable keys and day offsets: teammates, folder tree (ShopFlow root, 4 levels max), about 30 test cases with Gherkin (about 22 Ready / 5 Draft / 3 Deprecated), 2 environments with 3 credentials, 6 executions (Draft/Ready/InProgress/Paused/Completed/Done) with per-run outcomes, about 8 bugs. Verify a unit spec (`demo-dataset.spec.ts`):
  - keys are unique and folder depth is ≤ 4
  - every run references a dataset test case that is Ready
  - started executions have outcomes only on their own runs
  - the Completed execution has exactly one Needs Review and no Pending run
  - Done has no Needs Review or Pending
  - each run-linked bug's failed step is a line of that test case's script
- [x] 2.2 `apps/api/src/seed/demo-seed.ts`:
  - `seedUuid`, plus `SeedTargetError` and `SeedConflictError`
  - target resolution (design.md decision 2), the marker check, the root-folder clash check
  - credential encryption before the transaction, then one `withTenantContext` transaction inserting in dependency order with `keyBetween` placement after existing root items
  - backdated rows and activity entries with the API's action codes and `details` shapes

  Verify `apps/api/test/demo-seed.e2e-spec.ts` (fixture user via `provisionIdentity` with a random Clerk id):
  - seeding returns `seeded` with expected counts
  - `listExecutions` shows all six statuses with counts matching runs
  - `loadExecution` of the InProgress execution has snapshots and a non-null `lastResumedAt`
  - the Done one has `signedOffBy`
  - bugs list linked bugs with failed steps
  - a seeded credential decrypts via `decrypt`
  - the test-case list returns `lastOutcome` for run test cases
  - activity spans more than 14 days and has more than one actor
  - pre-existing test case and folder are unchanged and seeded root keys sort after them
  - a second run returns `already-present` with row counts unchanged
  - a clashing "ShopFlow" root folder throws `SeedConflictError` and writes nothing
  - an unknown Clerk id throws `SeedTargetError`
  - another fixture workspace's row counts are unchanged

## 3. CLI

- [x] 3.1 Rewrite `apps/api/scripts/seed.ts` as the CLI (design.md decision 1): load `.env`, parse `--email` / `--clerk-user-id`, look up the email via `clerkClient.users.getUserList`, call `seedDemo`, print the summary or "already present", exit 1 with a clear message on `SeedTargetError`, `SeedConflictError`, no Clerk match, or no arguments (usage). Remove the Acme/Globex seed. Verify by running `npm run db:seed -w apps/api` with no args (usage, exit 1), with an unknown email (exit 1, nothing written), then with your own email (summary printed), then again ("already present")
- [x] 3.2 CLAUDE.md: a short "Demo data" note with the command, that the target must have signed in once, that it is additive and idempotent, and that it needs `SECRETS_MASTER_KEY` (plus `CLERK_SECRET_KEY` for `--email`). Verify the command in the note matches package.json

## 4. Integration check

- [x] 4.1 Run root `npm run lint` and `npm run typecheck`, plus the API's unit and e2e tests (with `SECRETS_MASTER_KEY` set) and the web tests; all pass. Then sign in as the seeded user and check:
  - Test Cases shows the ShopFlow tree with outcome dots
  - Executions lists all six statuses, the In Progress timer runs, and the Done one shows sign-off
  - a run with a bug shows it, and Bugs lists the seeded bugs
  - revealing a seeded credential works

## Workflow follow-up

- User tests the slice manually before any commit (no commits until MVP v1 is user-tested).
- On archive: update roadmap-mvp.md Phase 9 Slice 4 to ✅ with Built / Key decisions / Deferred, and mark Phase 9 complete if nothing else remains.
