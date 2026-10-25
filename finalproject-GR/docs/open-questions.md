# Open Questions

Consolidated list of everything still undecided, as of **2026-09-23**. It gathers the *Open Items* from [ADR 0002](adr/0002-authentication-and-workspace-membership.md) to [ADR 0007](adr/0007-activity-log-and-trash-purge.md), the layers of [ADR 0001](adr/0001-tech-stack.md) that were never settled, gaps found while reviewing ADR 0001 against [PRD.md](../PRD.md) v1.1, and PRD questions found while building the data model ([readme §3](../readme-GR.md)).

Each row says what it **blocks**, so the list can be worked in an order that unblocks the most.

## Resolved since the ADR reviews

| Was open | Settled in |
|---|---|
| Immutability of the activity log | [ADR 0007](adr/0007-activity-log-and-trash-purge.md) |
| Snapshot columns on runs and bugs | [readme §3](../readme-GR.md): runs snapshot the test case name and script when the execution starts; bugs snapshot name, script and failed step |
| Retention of reveal audit entries | Follows ADR 0007: the log is retained indefinitely |
| PRD contradictions (invitations, roles, tags on executions, and others) | PRD v1.1 |
| Readme §1.4 (install) and §2.1 to §2.6 still described the ADR 0001 stack (Socket.IO, Redis, BullMQ, Clerk organizations) | Updated to match ADRs 0001 to 0007; the architecture diagram was redrawn |
| Who may Run All, Pause and Resume, and whether an empty execution can start | PRD §3.2 and §6.3.4: Contributors and Project Admins; an empty execution cannot start |
| The ADR 0001 architecture diagram still showed the old stack | Redrawn in ADR 0001 to match readme §2.1 |
| Readme §4 (API specification) not reviewed against PRD v1.1 and the ADRs | Updated: common conventions (auth, tenant-scoped 404, same-transaction logging), position keys, timer fields, server-derived bug snapshots, full error responses |
| B1: Prisma tenant-context mechanism | [ADR 0008](adr/0008-tenant-context-implementation.md): explicit `withTenantContext` transaction helper, shared by API requests and later background jobs |
| A2: Browser-to-API authentication (bearer token versus cookie) | [ADR 0009](adr/0009-api-authentication-transport.md): bearer token (Clerk session JWT verified against Clerk's JWKS); the SSE-client half of A2 is deferred with SSE itself but will reuse this same mechanism |
| F4: Repository layout | [ADR 0010](adr/0010-monorepo-layout.md): npm workspaces, `apps/` + `packages/` split, superseding the pnpm sketch that only existed in the (now out-of-scope) course readme |
| F6, partial: Frontend UI stack (styling/components, data fetching, forms) | [ADR 0011](adr/0011-frontend-ui-stack.md): Tailwind v4 + shadcn/ui, TanStack Query, react-hook-form + zod. Folder-tree drag-and-drop, the traceability graph, and the chart library remain open — decided per-phase, when each is actually built. |
| G6: What makes an execution Completed, and how Needs Review is resolved before sign-off | [ADR 0012](adr/0012-execution-completion-and-sign-off.md): automatic when the last Pending run gets an outcome (Needs Review counts); outcomes stay editable in Completed; Sign Off refused while any run is Needs Review |
| G10: What happens to an execution when its environment is deleted | `execution-lifecycle` (roadmap-mvp.md Phase 7): the FK clears the execution's environment link (`ON DELETE SET NULL (environment_id)`) and the execution keeps the snapshotted `environment_name` |
| G11 (new, PRD §7.2): Which test case statuses can be selected into an execution | [ADR 0012](adr/0012-execution-completion-and-sign-off.md): Ready only, re-checked at Mark as Ready |
| G4: Which bug status transitions are allowed, and who may make them | [ADR 0013](adr/0013-bug-lifecycle-and-auto-creation.md): any status to any other, for Contributors and Admins; every change activity-logged with old and new value |
| G8: What triggers auto-create bug on failure in manual mode | [ADR 0013](adr/0013-bug-lifecycle-and-auto-creation.md): a tester setting a run to Fail on an execution with the toggle on; same transaction, at most one auto-created bug per run (DB-enforced) |

## A. Authentication and API access

| # | Question | Source | Blocks | Suggested resolution |
|---|---|---|---|---|
| A1 | Which transactional email provider sends invitations and reminders? | ADR 0002 | Invitation flow | Pick a managed provider with domain verification; decide together with hosting (E). |
| A2 | ~~How does the browser authenticate to the API across hosts, and how do SSE streams authenticate (they cannot send an `Authorization` header)?~~ | ADR 0002, 0005 | API skeleton, frontend data layer | **Resolved:** [ADR 0009](adr/0009-api-authentication-transport.md) — bearer token; the SSE client reuses it when SSE is built. |
| A3 | Can Clerk's application-level invitations (sign-up tickets) give invited new users a pre-verified email, or is our emailed token the proof? | ADR 0002 | Invited sign-up flow | Read Clerk's docs and try it in a small spike. |
| A4 | Which Clerk webhook events are available to mirror users (create, update, delete, verification)? | ADR 0002 | User provisioning | Confirm in Clerk's documentation. |
| A5 | How are membership and invitation lookups done under RLS, given they must run before a workspace is known? | ADR 0003 | Data-access layer | Design a narrow, user-scoped access path with policies keyed on user id. |

## B. Data layer

| # | Question | Source | Blocks | Suggested resolution |
|---|---|---|---|---|
| B1 | ~~How is the tenant context applied with the chosen ORM (Prisma extension versus explicit transaction helper)? Does friction justify a different ORM?~~ | ADR 0003 | First data-access code | **Resolved:** [ADR 0008](adr/0008-tenant-context-implementation.md) — explicit `withTenantContext` helper. |
| B2 | Queue library: pg-boss or Graphile Worker, and does it work with the ORM and the connection pooler? | ADR 0005 | Worker process | Verify against the chosen pooler; default pg-boss. |
| B3 | Health Score snapshot job: how is history backfilled for a project that has runs but no snapshots yet? | Decision 2, readme §3 | Trend charts | Recompute from run history on first request, then snapshot daily. |
| B4 | Activity log: partitioning threshold, who holds the break-glass credentials, the erasure runbook, and whether Owners can view a purged project's log. | ADR 0007 | Production readiness | Set thresholds and custody before the first external customer. |

## C. Secrets

| # | Question | Source | Blocks | Suggested resolution |
|---|---|---|---|---|
| C1 | Where does the v1 master key live? | ADR 0004 | Secrets module | Depends on the hosting choice (E2); use that platform's secret store. |
| C2 | Does the reveal UI re-mask a password after a short interval? | ADR 0004 | Reveal UX | Default: yes, after about 30 seconds. |

## D. Reports

| # | Question | Source | Blocks | Suggested resolution |
|---|---|---|---|---|
| D1 | Spike: chart fidelity through SVG, Japanese font coverage, PDF time for a large execution. This also decides pdfmake versus react-pdf. | ADR 0006 | Report implementation | Time-boxed spike before building any report. |
| D2 | Image resize dimension, maximum report size, and total-size cap. | ADR 0006 | HTML export | Start at 1600 px longest side; set the cap from the spike. |
| D3 | Retention of generated report files and lifetime of the signed link (`Report.expires_at`). | ADR 0006, readme §3 | Report storage | Short retention, for example 7 days, with regeneration on demand. |

## E. Hosting and infrastructure (ADR 0001 layers still "either/or")

| # | Question | Source | Blocks | Suggested resolution |
|---|---|---|---|---|
| E1 | PostgreSQL host: Neon or RDS? | ADR 0001 | Everything that touches the database | Decide first; it fixes pooling behaviour and where `LISTEN/NOTIFY` works. |
| E2 | Compute host: Railway or Render, and where the worker process runs. | ADR 0001, 0005 | Deployment | Decide with E1 so the API and database sit in the same region. |
| E3 | Object storage: S3 or R2? | ADR 0001 | Attachments, reports | R2 if egress cost matters; S3 if the team already uses AWS. |
| E4 | Region and data residency. Your project documents are in Spanish, so EU users are plausible. | Review of ADR 0001 | E1 to E3, Clerk region | Decide before choosing any region. |
| E5 | If Neon is chosen: pooled connection for requests, direct connection for migrations and `LISTEN/NOTIFY`. | ADR 0001, 0005 | Connection setup | Follows from E1. |

## F. Not yet covered by any ADR

| # | Topic | What needs deciding |
|---|---|---|
| F1 | Observability | Logging, error tracking, tracing and job monitoring. |
| F2 | CI/CD and environments | Dev, staging and production; migrations on deploy; secrets management; infrastructure as code. |
| F3 | Testing strategy | Unit, integration and end-to-end tools, including the cross-tenant test suite that ADR 0003 requires (readme §2.6). |
| F4 | ~~Repository layout~~ | **Resolved:** [ADR 0010](adr/0010-monorepo-layout.md) — npm workspaces, `apps/` + `packages/` split. |
| F5 | API contract and shared types | ADR 0001's claim of one type system from database to UI needs a shared types package or OpenAPI/zod code generation to be true. |
| F6 | ~~Frontend libraries~~ Remaining frontend libraries | **Partially resolved:** [ADR 0011](adr/0011-frontend-ui-stack.md) settled styling/components (Tailwind v4 + shadcn/ui), data fetching (TanStack Query), and forms (react-hook-form + zod). Drag-and-drop **resolved** by [ADR 0014](adr/0014-drag-and-drop-and-ordering.md): dnd-kit, in-house base-36 fractional keys, Move to… as the accessible alternative; the folder tree and execution run reordering share it. Still open: the traceability graph, and a chart library — each decided when the phase that builds it starts. (The Gherkin editor was never a library gap: PRD §6.2.3 specifies a plain textarea, already built.) |
| F7 | Non-functional requirements | Scale targets, availability, backups with recovery objectives, retention, and compliance (GDPR). |
| F8 | Attachment pipeline | Upload validation the storage layer cannot enforce (5 per bug, content type, size), EXIF stripping, optional malware scanning. |
| F9 | Cost and vendor count | Clerk, hosting, database, storage and email, plus KMS later, in one estimate. |

## G. PRD questions (found, not yet decided)

| # | Question | Where |
|---|---|---|
| G1 | Where does a **Manual** test case's description live? The detail view only has a Gherkin script editor. | PRD §2.5, §6.2.3 |
| G2 | How does a test case change status (Draft, Ready, Deprecated), and who may? The detail view shows the status but lists no way to edit it. | PRD §6.2.3 |
| G3 | Tag management: how are tags renamed, recoloured or deleted? There is no screen for it. | PRD §2.4 |
| G5 | Concurrent edits (auto-save on blur): last write wins, or optimistic locking with a conflict message? | PRD §6.2.3 |
| G7 | **Try Again:** what happens when a test case in the chosen subset was deleted, and does Restart keep attempt history? | PRD §6.3.4 |
| G9 | UI language, date and time zone display, and the full lists of locales and timezones in the New Execution modal. (The API side is settled by `execution-lifecycle`: it accepts any valid BCP 47 locale and IANA timezone via `Intl`, so only the picker lists remain open.) | PRD §7.2 |

## H. Documentation that no longer matches the decisions

| # | Item |
|---|---|
| H1 | Endpoints that exist in the product but are not specified in readme §4 (the format allows three): invitations (create, resend, revoke, accept, decline), revealing an environment credential, trash (list, restore), reports (request, download), and the SSE streams. |
