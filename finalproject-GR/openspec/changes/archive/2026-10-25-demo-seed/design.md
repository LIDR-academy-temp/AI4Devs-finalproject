# Design

## Context

See proposal.md - Why. Constraints found in the code:

- **RLS everywhere, forced.** `FORCE ROW LEVEL SECURITY` applies to the table owner too, so even `railgun_migrator` can't read across tenants without context.
  - `"user"` rows are visible only by `app.user_id` or `app.clerk_user_id` (migration 0003).
  - `workspace_membership` rows are visible by `app.user_id` (self) or `app.workspace_id`.
  - So a user **can't be found by email** in the database. The only path is Clerk id → user → membership → workspace, the same one `provisionIdentity` takes.
- **Inserting a `"user"` row** requires `app.user_id` set to that row's id (WITH CHECK). The old seed and `provisionIdentity` both do this.
- **The default project** is the workspace's oldest project (`ORDER BY created_at LIMIT 1`, `provisionIdentity`). The web app always opens on it.
- **Credentials:** `encrypt(prisma, workspaceId, secretId, plaintext)` reads the workspace DEK in its own `withTenantContext` transaction and binds `workspaceId:secretId` as AAD. So the credential id must be known before encrypting.
- **Ordering:** `keyBetween(a, b)` (`src/common/ordering.ts`); `position_key` is `COLLATE "C"`. `folder_sibling_name_idx` makes root folder names unique (case-insensitive) per project.
- **Activity:** `log()` always stamps `now()`. The API logs `folder.created`, `test_execution.{created,marked_ready,started,paused,resumed,completed,signed_off}`, `test_run.outcome_set` and `bug.{created,updated,linked}`. Test case and environment creation write **no** entry today.
- **Lifecycle columns** (execution-lifecycle.controller.ts):
  - `started_at` and `last_resumed_at` are set on start. Pause folds the running period into `elapsed_ms_accumulated` and nulls `last_resumed_at`.
  - Completion sets `completed_at`; sign-off sets `signed_off_at/by`.
  - Started runs carry `test_case_name_snapshot`, `gherkin_script_snapshot`, and `outcome_updated_at/by`.
- **Tooling:**
  - `apps/api` already has `"db:seed": "ts-node --transpile-only scripts/seed.ts"`.
  - Jest's `testRegex` picks up `*.e2e-spec.ts` anywhere, and e2e specs run against the dev Postgres (`test/helpers`).
  - Tests never load `.env`; `src/load-env.ts` loads it on import.

## Goals / Non-Goals

**Goals:**
- Data indistinguishable from data made through the app: same columns, same invariants, same activity codes.
- One transaction for all inserts; a rerun is detected up front and writes nothing.
- The seeding logic is testable without Clerk: it takes a Clerk user id. Only the CLI resolves emails.

**Non-Goals:**
- Reset or unseed. That's impossible to do cleanly anyway, since `activity_entries` is append-only (ADR 0007).
- Seeding through the HTTP API, which would need a Clerk session token.
- Logging what the API doesn't log (test case and environment creation).

## Decisions

**1. Layout: CLI shell plus testable module.**
- `apps/api/scripts/seed.ts` (rewritten) is the CLI:
  - Imports `../src/load-env` first.
  - Parses `--email <address>` or `--clerk-user-id <id>`; with neither, prints usage and exits 1.
  - For `--email`, it calls `clerkClient.users.getUserList({ emailAddress: [email] })`. No match exits 1 with "No Clerk user with email …".
  - Then it calls `seedDemo(prisma, clerkUserId)` and prints the summary or "already present".
- `apps/api/src/seed/demo-dataset.ts` holds the static ShopFlow content: folders, test cases with Gherkin, environments, executions with per-run outcomes, bugs, teammates, and day offsets. It's plain data, no SQL.
- `apps/api/src/seed/demo-seed.ts` holds `seedDemo(prisma, clerkUserId, { now? })` → `{ status: 'seeded' | 'already-present', workspaceId, projectId, counts }`. `now` is injectable so tests can check backdating.
- *During implementation:* the target lookup sets `app.clerk_user_id` and `app.user_id` in a raw transaction, as `provisionIdentity` does. ADR 0008's lint rule lets only context-mechanism modules hold a `PrismaClient`, so the lookup lives in `src/common/seed-target.ts` (added to the rule's exception list). `seedDemo` and the CLI take the app's `PrismaService`.

*Alternative:* a SQL file. Rejected: credentials must be encrypted with the workspace DEK in TypeScript, and fractional keys come from `keyBetween`.

**2. Resolving the target (read-only, mirrors `provisionIdentity`).**
1. In one transaction, set `app.clerk_user_id` and select the user. None → throw `SeedTargetError('… has never signed in to the app')`.
2. Set `app.user_id`; take the oldest `workspace_membership`.
3. Set `app.workspace_id`; take the oldest project.

Nothing is created on this path: a missing user means the developer should sign in first.

**3. Deterministic ids and the "already present" check.**
- Every seeded id is `seedUuid(\`${workspaceId}:${key}\`)`: a SHA-256-derived v5-style UUID, the same helper as the old seed, moved to `demo-seed.ts`. Keys are stable dataset keys (`folder:checkout`, `run:smoke-oct:login`, …).
- Before inserting anything, the seed checks whether the marker row (the ShopFlow root folder's id) exists. If it does, it returns `already-present` and writes nothing.
- Because everything else is inserted in the same transaction as that row, the marker's presence means the whole dataset is present.
- No `ON CONFLICT`: an unexpected conflict should fail loudly and roll back.

**4. One transaction; encryption first.**
- Credential ids are computed and the passwords encrypted with `encrypt()` **before** the main transaction, since each call opens its own short read-only transaction for the DEK.
- Then one `withTenantContext(workspaceId)` transaction does everything else, inserting in dependency order:
  1. Teammates: `"user"` rows, with `app.user_id` set to each row's id per insert. Clerk ids are `seed:<workspaceId>:contributor` / `:viewer`, unique per workspace and never a real Clerk id.
  2. Their `workspace_membership` rows (`Collaborator`) and `project_membership` rows (`Contributor`, `Viewer`).
  3. Folders, then test cases, then environments and credentials.
  4. Executions, then runs.
  5. Bugs.
  6. Activity entries.

  The transaction resets `app.user_id` after each teammate insert; tenant tables only check `app.workspace_id`.
- The clash pre-check runs inside the same transaction: if a non-deleted root folder in the project has a seeded root name (case-insensitive), throw `SeedConflictError` naming it.

**5. Placement and order.**
- Seeded root folders get keys after the project's current last root folder key; seeded root test cases go after the last root test case key, using `keyBetween(last, null)` successively.
- Inside seeded folders, keys come from `keyBetween` chains starting at `(null, null)`.
- Runs use positions 1..n.

**6. The dataset (ShopFlow, an e-commerce web app). Dates are relative to `now`: "d-18" means 18 days before.**
- **People:**
  - The seeded user is the Owner and acts as Admin, signing off executions.
  - "Priya Shah" is the Contributor and authors most runs.
  - "Marco Rossi" is the Viewer; he files nothing, but appears in membership.
- **Folders:**
  - `ShopFlow` (the marker root), containing Authentication, Catalog & Search, Cart, Checkout and Account.
  - Checkout > Payments > Cards, and Payments > Wallets (four levels including the root, within the limit of 4). Account > Profile.
  - The design picks a single marker root so the clash check covers one name. It's still a three-plus-level tree inside.
- **Test cases:** about 30, about 22 Ready, 5 Draft, 3 Deprecated, each with a realistic Gherkin script (Feature/Scenario/Given/When/Then). A few sit at the ShopFlow root.
- **Environments:**
  - "Staging" (`https://staging.shopflow.test`, Chromium) with credentials `admin` and `shopper`.
  - "QA" (`https://qa.shopflow.test`, Firefox) with credential `shopper`.
  - Demo passwords are obvious placeholders (`Demo-Staging-1!`).
- **Executions:**

  | Name | Status | Shape |
  |---|---|---|
  | Release 2.3 regression | Done | d-18 → d-16, all outcomes Pass/Fail, signed off by the user, 2 Fail |
  | Payments smoke | Completed | d-9, 1 Needs Review left so it can't be signed off yet |
  | Release 2.4 regression | In Progress | started d-1, about 60% recorded, `last_resumed_at` = now − 40 min, prior accumulated time |
  | Search & catalog pass | Paused | about 30% recorded, accumulated time only |
  | Checkout hotfix verification | Ready | no outcomes, no snapshots |
  | Account settings (planning) | Draft | no outcomes, no snapshots |

  - Started executions' runs carry snapshots of their test case's name and script.
  - `outcome_updated_by` alternates between Priya and the user.
  - `elapsed_ms_accumulated` is consistent with the start/complete spans (hours, not days, of active time).
- **Bugs:** about 8.
  - Critical, High, Medium and Low severities, in Open, In Progress, Resolved, Closed and Won't Fix status.
  - Six are filed from Fail runs. Their snapshots are copied from the run's snapshots, and `failed_step_snapshot` is a real line of that script.
  - One is a manual bug with no run.
  - One is `auto_created` on an execution with `auto_create_bug = true`.
- **Activity:** one entry per logged action above, with the API's `action_code`, `entity_type`, `category` and `details` shapes and with `created_at` at the event's time. Inserted directly (the app role has INSERT on `activity_entries`), because `log()` can't backdate.

**7. Remove the Acme/Globex fixture seed.** Nothing references it (grep: only package.json and seed.ts). Its two workspaces already in the dev database are left alone; the seed never deletes.

## Risks / Trade-offs

- [The dataset drifts from app rules as the schema evolves] → The e2e spec loads the seeded project through the real controllers' query helpers (`listExecutions`, `loadExecution`, the bug and test-case list queries) and asserts counts and invariants, so drift fails a test.
- [Clerk `getUserList` returns several users for one email] → Use the first one and print which Clerk id was used. Clerk enforces unique verified emails, so this is unlikely.
- [The In Progress timer keeps running after seeding] → Intended: it's a live execution. A rerun doesn't touch it.
- [Running the e2e spec writes to the dev database] → It does, like every e2e spec here, into fresh fixture workspaces created via `provisionIdentity` with random Clerk ids.

## Migration Plan

No schema change. Rollback is reverting the commit. Seeded rows stay, and can be soft-deleted through the app like any data.
