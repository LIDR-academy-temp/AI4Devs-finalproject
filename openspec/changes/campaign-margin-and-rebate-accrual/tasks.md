## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/campaign-margin-and-rebate-accrual` from `main` and verify `git status` reports it as current
- [ ] 0.2 Verify both prerequisite changes are applied: campaign lines carry contracted volume and sale CPM, and delivery carries impressions and media cost

## 1. Database: Rebate and Rate Schema

- [ ] 1.1 Write failing tests for `rebate_schedules` asserting a nullable agency, a nullable channel, a required validity start and non-overlapping validity for the same key
- [ ] 1.2 Define `rebate_schedules` and `rebate_brackets` with `Numeric` thresholds and rates, and verify the tests from 1.1 pass
- [ ] 1.3 Define `rebate_accruals` keyed on holding group, nullable agency, channel and year, holding accrued and settled separately, verified by constraint tests
- [ ] 1.4 Define `platform_rate_settings` with its level, nullable scope keys, author and timestamp, verified by a test rejecting a level whose scope key is absent
- [ ] 1.5 Define `applied_rates` as append-only per calculation, holding the rebate rate, resolution step, agency-exception flag, source year, platform rate and calculation time
- [ ] 1.6 Generate the Alembic migration with `--autogenerate`, review it by hand, and verify `upgrade head` then `downgrade base` runs clean

## 2. Domain: Margin Calculation (no database, no HTTP)

- [ ] 2.1 Write failing tests for the closed-month margin using the worked example — revenue 3,631.01 €, media cost 1,200.00 €, rebate 907.75 €, platform cost 700.00 €, margin 823.26 € — and verify it fails
- [ ] 2.2 Implement the margin calculation in the domain layer and verify the test from 2.1 passes with no database involved
- [ ] 2.3 Write a failing test asserting revenue uses contracted volume when delivery falls short, then verify the implementation satisfies it
- [ ] 2.4 Write failing tests for the running-month pro-rating, including a period with zero delivery still accruing revenue, and implement it
- [ ] 2.5 Write a failing test asserting a `Deal` line uses the identical model to a `Directo` line, and verify no channel-specific revenue branch exists
- [ ] 2.6 Write a failing test asserting exact decimal arithmetic across an accumulated year, then verify no float appears in the calculation path
- [ ] 2.7 Write a failing test for a line whose media cost exceeds its revenue and implement the below-cost flag

## 3. Domain: Rebate Resolution Ladder

- [ ] 3.1 Write failing tests for each of the eight ladder steps, asserting the step that produced the rate is recorded
- [ ] 3.2 Implement the ladder as an ordered table of match keys rather than a conditional chain, and verify the tests from 3.1 pass
- [ ] 3.3 Write failing tests asserting an agency exception wins over its group's schedule, and that scope narrows before it widens
- [ ] 3.4 Write a failing test asserting a group with no schedule in any year resolves to an explicit zero carrying its reason, distinguishable from a negotiated zero
- [ ] 3.5 Write a failing test asserting two scopes priced differently never resolve to the mean of the two
- [ ] 3.6 Write a failing test asserting a year with no schedule inherits the previous one and the result records it as inherited

## 4. Domain: Bracket Engine and Accrual

- [ ] 4.1 Write a failing test for marginal bracket application using the worked example — a counter at 90,000 € receiving 30,000 € yielding an 18.3% effective rate — and verify it fails
- [ ] 4.2 Implement marginal bracket application on the slice and verify the test from 4.1 passes
- [ ] 4.3 Write failing tests asserting each channel runs an independent annual counter and that one channel's volume never advances another's bracket
- [ ] 4.4 Write failing tests for the agency carve-out: an excepted agency accrues to itself, is excluded from its group's counter, and the carve-out applies per channel
- [ ] 4.5 Implement counter resolution keyed on group, optional agency, channel and year, and verify the tests from 4.3 and 4.4 pass
- [ ] 4.6 Write failing tests for chronological attribution: a bracket crossing is forward-only, already-accrued months keep their rate, and a straddling campaign blends
- [ ] 4.7 Implement the counter-year replay with a stable ordering tiebreak, and verify two replays of the same inputs produce identical results
- [ ] 4.8 Write failing tests asserting a schedule change restates the year to date, a backdated correction replays it, and creating or removing an agency exception restates both sides
- [ ] 4.9 Implement restatement triggers and verify the restatement is recorded rather than applied silently
- [ ] 4.10 Measure a replay against the largest real combination (1,159,752 € in one group and channel) and record the timing

## 5. Domain: Platform Rate

- [ ] 5.1 Write failing tests for most-specific-first resolution across line, agency, campaign type and system default, and implement it
- [ ] 5.2 Write a failing test asserting the resolved rate is frozen on the line and that changing the default afterwards does not move a calculated margin

## 6. Backend: Persistence, Freezing and API

- [ ] 6.1 Implement the SQLAlchemy repositories behind the domain interfaces and verify no module under `domain/` imports SQLAlchemy
- [ ] 6.2 Implement `applied_rates` as append-only and verify a recalculation adds a row rather than updating one
- [ ] 6.3 Write an API test asserting that editing a rebate master after calculation leaves the calculated margin unchanged
- [ ] 6.4 Implement the margin and roll-up endpoints aggregating in the database, and verify with `EXPLAIN` that they do not fetch delivery rows into the application
- [ ] 6.5 Verify a roll-up equals the sum of its underlying campaign figures, asserted by a test
- [ ] 6.6 Implement Excel and CSV export and verify the exported figures match those returned by the API
- [ ] 6.7 Implement `require_roles("finance")` on every cost and margin endpoint, including the platform rate configuration endpoints
- [ ] 6.8 Write tests asserting a user holding `business` or `operations` but not `finance` receives 403 on every endpoint of this change, and 401 for a missing or invalid token
- [ ] 6.9 Implement the `CuratorMargin` figure as computed on demand for Deal lines, and verify it is never stored and never enters the margin

## 7. Frontend: Margin and Roll-up Views

- [ ] 7.1 Implement the typed API client for margin and roll-ups in `lib/api/` and verify no component calls `fetch` directly
- [ ] 7.2 Write failing Vitest tests asserting a running-month figure renders with its provisional label and a closed figure does not
- [ ] 7.3 Implement the margin view and verify the tests from 7.2 pass, with no monetary value recomputed client-side
- [ ] 7.4 Implement the roll-up view with filtering by period, agency, advertiser and campaign type, and verify sorting and filtering work on each
- [ ] 7.5 Implement the `finance` route guard and write a test asserting what a user without the role sees
- [ ] 7.6 Verify a below-cost line renders flagged rather than blended into the total, asserted by a test
- [ ] 7.7 Verify the masters view distinguishes a group negotiated at zero from one whose rate was never loaded

## 8. Data: Rebate Migration and Reconciliation

- [ ] 8.1 Normalise `extraprimas 2023/2024/2026.xlsx` into `rebate_schedules` with validity ranges, each rate as a single open bracket, and verify 2025 resolves through the ladder rather than a hardcoded label
- [ ] 8.2 Seed the platform rate at the system default of 1.00 €/CPM as data and verify no rate is hardcoded anywhere
- [ ] 8.3 Recalculate a set of closed months and reconcile line by line against Qlik Sense
- [ ] 8.4 Classify every difference as a named known defect or an implementation error, and verify none is accepted as merely close enough
- [ ] 8.5 Produce the reconciliation summary for Finance and Business before any figure is published

## 9. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 9.1 Review every test touched by this change and update any asserting superseded behaviour
- [ ] 9.2 Verify every worked example from `docs/product-description.md` §5 is encoded as a test
- [ ] 9.3 Verify each role-guarded endpoint added here has its negative authorisation case covered

## 10. Run Unit Tests and Verify Database State (MANDATORY)

- [ ] 10.1 Capture the pre-test database baseline for schedules, brackets, accruals and applied rates
- [ ] 10.2 Run targeted unit tests for the domain modules and record passed, failed and skipped counts
- [ ] 10.3 Run the full backend and frontend suites and record totals and runtime
- [ ] 10.4 Verify post-test database state against the baseline and restore it if anything changed
- [ ] 10.5 Create the report at `specs/campaign-margin-and-rebate-accrual/reports/YYYY-MM-DD-step-10-unit-test-and-db-verification.md`
- [ ] 10.6 Mark this step complete only once the tests pass and that report exists

## 11. Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)

- [ ] 11.1 Start the backend and verify the database connection is active
- [ ] 11.2 Request a closed-month margin with curl and verify the four terms against a hand-computed figure
- [ ] 11.3 Request a running-month margin with curl and verify it is pro-rated and marked provisional
- [ ] 11.4 Create a platform rate override with curl, verify the resolution changes, then delete it to restore database state
- [ ] 11.5 Create an agency rebate exception with curl, verify the counter carve-out and the restatement, then remove it and restore database state
- [ ] 11.6 Request a roll-up and an export with curl and verify they agree with the detail
- [ ] 11.7 Test authorisation: no token (401), token without `finance` on every cost and margin endpoint (403)
- [ ] 11.8 Verify the database matches its pre-test state and document every command and response in a report in the change folder

## 12. E2E Testing with Playwright (MANDATORY - AGENT MUST EXECUTE)

- [ ] 12.1 Start frontend and backend and verify the database is in a known state
- [ ] 12.2 Execute the finance flow: read a campaign margin, then a period roll-up, then export it
- [ ] 12.3 Verify a running-month figure displays its provisional label in the browser
- [ ] 12.4 Verify a user without `finance` cannot reach the margin views and sees no cost figure anywhere
- [ ] 12.5 Execute the flow as a user holding several roles and verify the interface composes from all of them
- [ ] 12.6 Clean up test data, restore database state and document the scenarios in a report in the change folder

## 13. Update Technical Documentation (MANDATORY)

- [ ] 13.1 Update `readme.md` §3 if the rebate or rate schema diverged from the documented model
- [ ] 13.2 Record the measured replay timing and the bracket thresholds actually supplied in `docs/product-description.md`
- [ ] 13.3 Resolve or restate pending item 1 of `readme.md` §3.3 once real bracket thresholds exist
- [ ] 13.4 Verify `openspec validate campaign-margin-and-rebate-accrual` passes before archiving
