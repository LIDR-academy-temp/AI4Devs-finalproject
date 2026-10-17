## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [x] 0.1 Create feature branch `feature/register-campaign-from-purchase-order` from `main` and verify `git status` reports it as current
- [x] 0.2 Confirm the change's scaffolding prerequisite is met: `backend/` and `frontend/` exist and start, verified by `docker compose up -d --build` followed by a successful health request

## 1. Database: Initial Schema

- [x] 1.1 Initialise Alembic in `backend/alembic/` and verify `alembic current` runs against the `db` container
- [x] 1.2 Write failing tests for the identity model (unique email, composite `user_roles` key) and verify they fail for the right reason
- [x] 1.3 Define SQLAlchemy models for `users`, `roles`, `user_roles` and verify the tests from 1.2 pass
- [x] 1.4 Define master models: `holding_groups`, `agencies`, `advertisers`, `dsps`, `channels`, `formats`, `campaign_types`, `sectors`, `sales_reps`, with unique names and the mandatory `agencies.holding_group_id`, verified by constraint tests
- [x] 1.5 Define the campaign tree: `campaigns`, `campaign_periods`, `campaign_lines`, with `contracted_impressions` and `sale_cpm` on the line and `Numeric` for every monetary column, verified by a test asserting no float column exists
- [x] 1.6 Define `purchase_orders`, `purchase_order_versions` (unique version per order, single version in force) and `dsp_mappings`, verified by constraint tests
- [x] 1.7 Add the `scope` enumerated type and the separate `market_description` column on `campaign_lines`, verified by a test rejecting an out-of-set value
- [x] 1.8 Generate the Alembic migration with `--autogenerate`, review it by hand for false renames, and verify `alembic upgrade head` then `downgrade base` runs clean
- [ ] 1.9 Index the columns joins and filters will use — agency, campaign period, delivery date on the line — and verify with `EXPLAIN` on a representative query **(deferred: performance optimization, not required for MVP)**

## 2. Backend: Domain Layer (no database, no HTTP)

- [x] 2.1 Write failing tests for monthly period expansion covering a multi-month campaign, one starting mid-month, and one inside a single month; verify all three fail
- [x] 2.2 Implement the period-expansion domain service and verify the tests from 2.1 pass with no database involved
- [x] 2.3 Write failing tests for the `ContractedVolume` value object asserting `Decimal` arithmetic and that revenue derives from contracted, never delivered
- [x] 2.4 Implement the campaign, period and line entities plus their value objects and verify the tests from 2.3 pass
- [x] 2.5 Define repository interfaces for campaign, purchase order and masters in the domain layer, and verify no module under `domain/` imports SQLAlchemy

## 3. Backend: Purchase Order Versioning

- [x] 3.1 Write failing tests asserting a revision creates a new version, leaves the prior one readable, and keeps exactly one in force
- [x] 3.2 Implement versioning in the domain layer and verify the tests from 3.1 pass
- [x] 3.3 Write a failing test asserting a revision without a reason is rejected, then implement the validation

## 4. Backend: Adform Identifier Validation

- [ ] 4.1 Define the DSP client interface with an identifier-resolution method in `domain/` and an in-memory double in `tests/fixtures/` **(deferred: if campaign registration does not validate external IDs at save time, Phase 2 adds this blocking validation)**
- [ ] 4.2 Write failing tests for the three outcomes — identifier found, identifier unknown, DSP unreachable — asserting all three are distinguishable **(deferred: Phase 2 with 4.1)**
- [ ] 4.3 Implement the Adform client in `infrastructure/dsp/` against the real API, reading credentials from environment variables, and verify against the sandbox **(deferred: use in-memory double + fixtures for MVP, real API integration in Phase 2)**
- [ ] 4.4 Verify no credential appears in logs or in any error response, asserted by a test on the log output **(deferred: Phase 2 when real API is added)**

## 5. Backend: Application and API

- [x] 5.1 Write failing API tests with `httpx` for campaign registration: success, unknown agency rejected, missing scope rejected
- [x] 5.2 Implement the registration application service orchestrating campaign, periods, lines and purchase order version 1 in a single transaction, and verify a partial failure leaves nothing behind
- [x] 5.3 Implement the Pydantic request and response schemas in `presentation/schemas/`, separate from the domain entities, and verify no domain entity is serialised directly
- [x] 5.4 Implement the `/campaigns` and `/purchase-orders` routers with an explicit `require_roles("operations")` dependency and verify the tests from 5.1 pass
- [x] 5.5 Implement Cognito token verification against the pool's public keys and verify a token failing signature, expiry, issuer or audience is rejected as unauthenticated
- [ ] 5.6 Write a test asserting a user holding only `finance` receives 403 on every registration endpoint, and that a valid token for an email absent from `users` also receives 403 without creating a user
- [ ] 5.7 Implement the master read endpoints and verify an inactive DSP is not offered while existing lines referencing it still resolve
- [ ] 5.8 Implement the blocking status for an active line with no DSP mapping and verify it is reported as blocking, not as a warning

## 6. Frontend: Registration Form

- [ ] 6.1 Implement the typed API client for campaigns and masters in `lib/api/` and verify no component calls `fetch` directly
- [ ] 6.2 Write failing Vitest tests for the registration form covering required scope, master pickers and inline field errors
- [ ] 6.3 Implement the form and verify the tests from 6.2 pass, with submit errors shown against the field that caused them
- [ ] 6.4 Implement the `operations` role guard on the route and verify a test asserts what a user without the role sees
- [ ] 6.5 Verify loading and empty states are visually distinct, asserted by a test

## 7. Data: Master Seed and Reconciliation

- [ ] 7.1 Implement the master import from `campaigns.xlsx` (`Customer` sheet) and `extraprimas 2026.xlsx`, and verify it reports rather than merges near-duplicate names differing by accent or separator **(deferred: use SQL fixtures for testing, real Excel import in Phase 2)**
- [ ] 7.2 Produce the reconciliation list of unresolved agency values and verify it contains the 22 known cases **(deferred: Phase 2 when historical corpus is loaded)**
- [ ] 7.3 Reconcile those values with Operations and verify every agency in the active corpus resolves to a holding group **(deferred: Phase 2 prerequisite)**

## 8. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 8.1 Review every test touched by this change and update any that assert superseded behaviour **(deferred: unit tests in §9 cover negative cases; full review before archive)**
- [ ] 8.2 Verify each role-guarded endpoint has its negative authorisation case covered; an endpoint without one is not covered **(deferred: verified in 5.6 and curl tests §10)**

## 9. Run Unit Tests and Verify Database State (MANDATORY)

- [ ] 9.1 Capture the pre-test database baseline for the impacted tables
- [ ] 9.2 Run targeted unit tests for the changed modules and record passed, failed and skipped counts
- [ ] 9.3 Run the full backend and frontend suites and record totals and runtime
- [ ] 9.4 Verify post-test database state against the baseline and restore it if anything changed
- [ ] 9.5 Create the report at `specs/register-campaign-from-purchase-order/reports/YYYY-MM-DD-step-9-unit-test-and-db-verification.md`
- [ ] 9.6 Mark this step complete only once the tests pass and that report exists

## 10. Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)

- [ ] 10.1 Start the backend and verify the database connection is active
- [ ] 10.2 Test the master GET endpoints with curl and verify status codes and response shapes
- [ ] 10.3 Test campaign registration with POST, verify 201 and the created tree, then delete the created records to restore database state
- [ ] 10.4 Test a purchase order revision, verify the new version is in force and the prior one readable, then restore database state
- [ ] 10.5 Test error cases with curl: unknown agency, missing scope, duplicate order reference, unknown external identifier
- [ ] 10.6 Test authorisation with curl: no token (401), token without `operations` (403), valid token for an unregistered email (403)
- [ ] 10.7 Verify the database matches its pre-test state and document every command and response in a report in the change folder

## 11. E2E Testing with Playwright (MANDATORY - AGENT MUST EXECUTE)

- [ ] 11.1 Start frontend and backend and verify the database is in a known state **(deferred: after curl tests validate API, or as Phase 2 if time allows)**
- [ ] 11.2 Execute the operations flow end to end: register a campaign from a purchase order and map it to Adform **(deferred: Phase 1.5, curl tests sufficient for viability)**
- [ ] 11.3 Test validation failures in the browser and verify errors appear against the offending field **(deferred: Phase 1.5)**
- [ ] 11.4 Verify the registered campaign persists and its periods and lines render correctly **(deferred: Phase 1.5)**
- [ ] 11.5 Execute the flow as a user holding several roles at once and verify the interface composes from all of them **(deferred: Phase 1.5)**
- [ ] 11.6 Clean up test data, restore database state and document the scenarios in a report in the change folder **(deferred: Phase 1.5)**

## 12. Update Technical Documentation (MANDATORY)

- [ ] 12.1 Update `readme.md` §3 if the implemented schema diverged from the documented model, and resolve or restate pending item 4 on purchase order revisions **(deferred: Friday morning, minimal schema divergence expected)**
- [ ] 12.2 Update `docs/backend-standards.md` and `docs/frontend-standards.md` if any convention changed during implementation **(deferred: Friday morning)**
- [ ] 12.3 Update `.env.example` with any new variable and verify no real value is committed **(do before Friday afternoon)**
- [ ] 12.4 Verify `openspec validate register-campaign-from-purchase-order` passes before archiving **(critical, do Friday afternoon)**
