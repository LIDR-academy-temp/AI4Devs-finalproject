# Proposal

## Why

Every screen is built (Phases 6–9), but a fresh account opens on empty lists. A demo needs a believable project: a folder tree of real-looking test cases, executions at every lifecycle stage, bugs filed from failed runs, and a history of who did what. Today the only seed (`apps/api/scripts/seed.ts`, from `tenant-base-schema`) creates two workspaces whose owners have made-up Clerk ids, so nobody can sign in to see them. This is roadmap-mvp.md Phase 9, Slice 4. The optional stats readout is **dropped** (user decision), so this slice is the seed only.

## What Changes

- **BREAKING (dev tooling only):** `npm run db:seed -w apps/api` changes from "create the Acme/Globex fixture workspaces" to "fill a real user's project with demo data". It requires `-- --email <address>` (resolved through the Clerk Backend API) or `-- --clerk-user-id <id>`. The old Acme/Globex seed is removed; nothing depends on it.
- The target is the default project of a user who has signed in at least once. Unknown email, no Clerk match, or never signed in → the script exits non-zero with a clear message and writes nothing.
- One believable product ("ShopFlow", an e-commerce web app) is added next to whatever the project already holds:
  - Two teammates who can't sign in (a Contributor and a Viewer) as project members, so authorship and history show more than one person.
  - A folder tree three levels deep with about 30 test cases with real Gherkin, mostly Ready plus some Draft and Deprecated.
  - Two environments with login credentials, encrypted like any other and revealable in the app.
  - Executions in every status the app supports (Draft, Ready, In Progress, Paused, Completed, Done), spread over the past three weeks. Started runs have outcomes and snapshots, timers are consistent, and the Done one is signed off.
  - Bugs across severities and statuses, most filed from failed runs with a failed step, one filed manually.
  - Backdated activity entries matching all of the above.
- **Idempotent and all-or-nothing:** a rerun adds nothing and changes nothing. A failure (e.g. a root folder name already used in the project) rolls back everything and names the clash. Existing rows are never modified.
- All writes go through the app role inside the target workspace's tenant context (RLS stays on). No migration.

Out of scope: the stats / Overview readout (dropped); a reset or unseed command; seeding more than one project or workspace; creating Clerk accounts.

## Capabilities

### New Capabilities

- `demo-seed`: the developer command that fills a real user's project with a consistent, believable demo dataset.

### Modified Capabilities

None. No product behaviour changes. The old Acme/Globex seed was never covered by a spec.

## Impact

- **API workspace (tooling only):** rewrite `apps/api/scripts/seed.ts` as the CLI (argument parsing, `.env` loading, Clerk email lookup). Add `apps/api/src/seed/` for the seeding logic and the static ShopFlow dataset, plus a Jest e2e spec against the dev Postgres. It reuses `withTenantContext`, `encrypt`, and `keyBetween`.
- **Requires:** `SECRETS_MASTER_KEY` (credential encryption) and, for `--email`, `CLERK_SECRET_KEY`, both already in `apps/api/.env`.
- **Docs:** CLAUDE.md gets a short "Demo data" note with the command. The roadmap-mvp.md Phase 9 Slice 4 entry is updated, and Phase 9's scope line records that the stats readout was dropped.
