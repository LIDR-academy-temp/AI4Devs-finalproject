---
description: Enforce mandatory steps from openspec/config.yaml when creating tasks.md artifacts and ensure agent executes all manual tests
alwaysApply: true
---

# OpenSpec Tasks: Mandatory Steps Enforcement

> **Adapted to the VES architecture.** VES is made of **three separate components**,
> not one backend and one frontend:
>
> ```text
> Bccr.Supen.Ves.UI (React 19 / Vite / Vitest)
>    │ HTTP/HTTPS
>    ▼
> Bccr.Supen.Ves.Api (.NET 8)   API Controller → SI.SG → IRequestsHandler
>    │ HTTP/HTTPS
>    ▼
> Bccr.Supen.Ves.Mapi (.NET 8)  MAPI Controller → BW → DA → EF Core / stored procedures
>    │
>    ▼
> SQL Server (schema and stored procedures owned by DBA)
> ```
>
> Wherever the original text said "backend" read **API and/or MAPI** (whichever
> the change touches), and wherever it said "frontend" read **UI**. The UI must
> only call the API, never MAPI or SQL Server. Steps that do not apply to VES
> are not removed; they are marked.

## Scope Control: Exploration vs. Implementation

- **Read-only (`/opsx:explore`)**: review the user story, source code, contracts, and documentation; identify affected files and present an impact assessment matrix. **Do not** create branches, tasks, reports, or files; **do not** run tests or commands with side effects, or modify code, OpenSpec, Azure DevOps, or databases.
- **Propose documentation**: create or update `tasks.md` only when explicitly authorized to write OpenSpec artifacts. Such authorization **does not** permit source-code changes or implementation execution.
- **Implement (`/opsx:apply`)**: requires explicit approval to modify source code and the affected components. When implementation proceeds, all mandatory steps below apply.
- **Unavailable tools or access**: record each affected test as **BLOCKED / NOT VERIFIED**, stating the reason. Never fabricate results or mark the task as completed. Do not access production or execute data-modifying SQL.
- The `AGENT.md`, `openspec/config.yaml`, and design manifest files are repository references. If unavailable, explicitly document that limitation.

When creating or updating `tasks.md` artifacts in OpenSpec changes, you MUST:

## 1. Read openspec/config.yaml First

**BEFORE** creating or updating any `tasks.md` file, you MUST read `openspec/config.yaml` to understand:
- API, MAPI and UI-specific mandatory steps
- Branch naming conventions
- Task structure requirements
- Testing and documentation requirements

> **VES note:** at the time of this adaptation `openspec/config.yaml` only
> declares `schema: spec-driven` and has no custom `rules`/`context`; in that
> case this document is the source of the mandatory steps. You MUST ALSO read,
> for each affected component, its `README.md`, `AGENT.md` and `SPEC.md`
> (when present), plus the applicable standards in `docs/`
> ([base](./base-standards.md), [backend](./backend-standards.md),
> [frontend](./frontend-standards.md), [documentation](./documentation-standards.md))
> and [development guide](./development_guide.md).

> For API changes, you MUST also consult the
> [endpoint guide](../VES/Bccr.Supen.Ves.Api/Documentacion/ComoCrearUnNuevoEndpoint.md) and the
> [deployment guide](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md).

> For MAPI changes, you MUST also consult the
> [implementation guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/ComoImplementarUnMAPI.md) and the
> [environment verification guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/VerificacionEntorno.md).

> For UI changes, you MUST also consult the
> [deployment guide](../VES/Bccr.Supen.Ves.UI/Documentacion/Deploy.md),
> [development guide](../VES/Bccr.Supen.Ves.UI/Documentacion/DEVELOPMENT.md), and
> [usability guide](../VES/Bccr.Supen.Ves.UI/Documentacion/USABILIDAD.md).

> For visual design, follow the guidelines in
> `VES/Bccr.Supen.Ves.UI/Prototipo-UI/data-load-design-system.html` (present in the repository; its visual correspondence with the current UI still requires verification),
> the [design handoff guide](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-HANDOFF.md),
> the [design system guide](../VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-SYSTEM.md), and
> `VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-MANIFEST.json` (present in the repository; its correspondence with screens and components still requires verification).

> **UI screens (mandatory reuse):** before defining screen implementation tasks, inspect `Codigo/src/componentes` and reuse existing shared components instead of creating custom controls. In particular, standard actions (`Abrir`, `Nuevo`, `Eliminar`, `Descargar`, etc.) are generated through the shared `Botonera` component, according to the user's security options stored in the database (see [frontend-standards.md](./frontend-standards.md)). Tasks must explicitly identify the shared component being reused.

> **Local manual testing without GAUDI:** when `RequiereJwt=false`, the API authenticates as `localhost`; therefore, HTTP 401/403 behavior cannot be verified and those acceptance criteria must be reported as **NOT VERIFIED**. If the BCCR Event Log logger fails with `SecurityException`, register the component's event sources (e.g., `VES`, `VES.API`) instead of suppressing logging, or document the blocker.


## 2. Mandatory Steps

All implementation tasks MUST include these steps in the correct order:

### Step 0: Create Feature Branch (MUST BE FIRST)
- **Location**: Must be the very first step (Step 0)
- **Branch naming**: `feature/[ticket-id]` or `feature/[change-name]`
  - VES does not require a `-backend`/`-frontend` suffix; use `feature/<description>` (or `fix/<description>`, `refactor/<description>`) as in each repository's README/AGENT.md
  - **Base branch depends on the component**: `Bccr.Supen.Ves.UI` and `Bccr.Supen.Ves.Mapi` branch from `dev` (PR back to `dev`); `Bccr.Supen.Ves.Api` branches from `main` (PR to `main`). Confirm in the component's README/AGENT.md before creating the branch
  - A change that touches more than one component creates one branch **per affected repository/folder** following that component's flow
- **Action**: Create and switch to feature branch before any code changes

### Mandatory Steps (Must Be Included):
- **Step N**: Review and Update Existing Unit Tests (MANDATORY)
  - Frameworks per component: UI → Vitest + React Testing Library; API → MSTest (`Bccr.Supen.Ves.Api.UnitTests`, `SI.SG.Pruebas`) and xUnit (`API.IntegrationTests`); MAPI → MSTest (`DA.Pruebas`, `BW.Pruebas`, `MAPI.UnitTests`). Do not introduce Jest, Cypress, xUnit/NUnit into MSTest suites, or other frameworks
- **Step N+1**: Run Unit Tests and Verify Database State (MANDATORY)
- **Step N+2**: Manual Endpoint Testing with curl (MANDATORY) - **AGENT MUST EXECUTE**
- **Step N+3**: E2E Testing with Playwright MCP (MANDATORY if applicable) - **AGENT MUST EXECUTE**
- **Step N+4**: Update Technical Documentation (MANDATORY)

## 3. Manual Testing Requirements - CRITICAL: Agent Must Execute

**IMPORTANT**: The coding agent (AI) MUST perform all manual testing steps itself. **NEVER delegate testing to the user**. These tests must be executed by the agent to mark tasks as completed in `tasks.md`.

**VES environment rules for every manual test step:**
- Start the components in dependency order: **MAPI → API → UI** (see [development guide, section 5](./development_guide.md)). The API may point to the shared development MAPI when the team procedure allows it.
- Confirm the **effective** URL/port from the process output, `launchSettings.json`, `ApiEndpoints` and the UI configuration (`Codigo/config/{environment}.json`); do not assume ports and do not change code to match an "expected" port.
- Never test against production, never use real/production credentials or certificates, and never write secrets, tokens, certificates or connection strings in reports, `tasks.md` or commits.
- Development-only authentication/certificate bypass decorators must not be moved to other environments.
- The SQL Server schema and stored procedures are owned by the DBA: do not alter schema/procedures, do not generate EF migrations and do not run ad-hoc mutating SQL to "restore" or prepare state. Restore state through the application operations (API/MAPI endpoints) or coordinate with the DBA.

### Step N+1: Run Unit Tests and Verify Database State (MANDATORY)

**Agent Responsibility**: The coding agent MUST execute unit tests, validate database integrity before/after execution, and produce a test report artifact in the change spec folder. This is NOT optional and cannot be delegated to the user.

**Implementation Steps** (Agent must perform):
1. **Prepare Test Environment**:
   - Ensure required services are available (database, dependencies). Unit tests in VES must NOT need SQL Server, private NuGet feeds beyond restore, production certificates or external services; the BCCR network/VPN and SQL Server development access are only needed for restore, integration suites or the manual steps below
   - Capture pre-test database state relevant to the change (counts, key records, checksums, or snapshots) **only when the test run or the change can touch a real SQL Server instance** (integration suites, manual flow). Use read-only means authorized for the environment (read operations exposed by API/MAPI or DBA-provided access); unit-test-only runs record "N/A - unit suites are isolated from the database"
   - Document the exact test command(s) that will be executed

2. **Run Targeted Unit Tests First**:
   - Execute focused tests for the modified module(s) and related behavior (for example `dotnet test <project>.csproj --filter <...>` for API/MAPI, or `npx vitest run <path>` for UI)
   - Confirm failures are resolved and no new regressions appear in targeted scope
   - Capture command output summary (passed/failed/skipped)

3. **Run Broader Unit Test Suite**:
   - Execute the project/unit suite required by `openspec/config.yaml` (or justified subset if configured). Minimum per component, from the component's `Codigo/` folder:
     - **UI**: `npm run lint`, `npm test`, `npm run build:local` (do NOT run `build:pruebas`/`build:produccion`: they increment the `package.json` version)
     - **API**: `dotnet build Bccr.Supen.Ves.Api.sln`, `dotnet test Bccr.Supen.Ves.Api.sln`
     - **MAPI**: `dotnet build Bccr.Supen.Ves.Mapi.sln --no-restore`, `dotnet test Bccr.Supen.Ves.Mapi.sln` (coverage when required: `--collect:"XPlat Code Coverage"`)
     - Cross-component changes (API ↔ MAPI, UI ↔ API): run the suites of every affected component and verify the contract (route, HTTP verb, version, parameters, DTO/serialization, authentication and mTLS) on both sides
   - Record total test counts, failures, runtime, and any flaky behavior observed, plus relevant new build warnings and Quality Gate/analysis findings. Do not invent a universal coverage percentage; respect the pipeline's Quality Gate

4. **Verify Post-Test Database State**:
   - Re-check the same database indicators captured before tests (when a baseline was required)
   - Confirm no unintended mutations remain after tests complete
   - If any mutation occurred, restore state through application operations or the DBA and document the restoration
   - Run `git status`/`git diff` to confirm the validation did not alter files unexpectedly (for example version bumps)

5. **Create Unit Test Verification Report in Spec Folder**:
   - Save report under the current change folder in `specs/<change-name>/reports/` (in this workspace: `openspec/changes/<change-name>/specs/<capability>/reports/`, following the layout already used by the active change)
   - Use this filename pattern: `YYYY-MM-DD-step-N+1-unit-test-and-db-verification.md`
   - Include executed commands, summarized results, database pre/post comparison, and cleanup actions

6. **Mark Task as Completed**: Only after unit tests pass (or approved exceptions are documented), database state is verified/restored, and the report file is created, mark Step N+1 as completed in `tasks.md`.

**Report Template** (store in `specs/<change-name>/reports/`):
```markdown
# Step N+1 Report - Unit Tests and Database Verification

- Date: YYYY-MM-DD
- Change: <change-name>
- Agent: <agent-name>
- Components affected: UI / API / MAPI

## Commands Executed
- `<command 1>`
- `<command 2>`

## Unit Test Results
- Targeted tests: X passed, Y failed, Z skipped
- Full/required suite: X passed, Y failed, Z skipped (per component)
- Runtime: <duration>
- Notes: <flaky tests, retries, exceptions, new warnings>

## Database State Verification
- Pre-test baseline (or "N/A - unit suites isolated from SQL Server"):
  - <metric/table/check>: <value>
- Post-test validation:
  - <metric/table/check>: <value>
- State restored: Yes/No/N/A
- Restoration actions (if any): <actions>

## Outcome
- Step N+1 status: PASS/FAIL
- Blocking issues: <none or list>
```

**Dependencies**:
- Test runner and project test dependencies installed (npm / .NET 8 SDK; install only what the project requires)
- Database access for state verification/restoration (only when the run can touch a real SQL Server instance)
- Permission to create report files in `specs/<change-name>/reports/`

**Notes**:
- **The agent MUST execute tests itself** - never ask the user to run tests
- This step is mandatory even when code changes look small
- Report naming must follow the required pattern for traceability
- **Task completion in tasks.md can only be marked after report creation**
- If an environment blocker exists (VPN, private feed, SQL access), document it in the report and do not claim completion

### Step N+2: Manual Endpoint Testing with curl (MANDATORY)

**Agent Responsibility**: The coding agent MUST execute all curl commands and verify responses. This is NOT optional and cannot be delegated to the user.

**Scope in VES**: endpoints are exposed by `Bccr.Supen.Ves.Api` (public contract consumed by the UI) and by `Bccr.Supen.Ves.Mapi` (internal service called by the API through SI.SG). Test the API endpoints end to end; test MAPI endpoints directly when the change adds or modifies a MAPI contract. Routes, properties and identifiers are in Spanish (for example `/Documentos/Documentos/ListarDocumentosAsync`) and must be preserved as implemented.

**Implementation Steps** (Agent must perform):
1. **Prepare Test Environment**:
   - Ensure the backend server is running (start if needed): MAPI first (`dotnet run` from `Codigo/MAPI`), then API (`IIS-development` profile or `dotnet run`), or API pointing to the shared development MAPI
   - Verify database connection is active (MAPI `GET /healthcheckVES`, which checks every configured SQL connection, and API `GET /healthcheck?api-version=1`)
   - Note the current database state (if testing CREATE/UPDATE/DELETE endpoints) using read endpoints, so it can be restored through the application
   - Resolve authentication: business endpoints are `[Authorize]` and API↔MAPI may require mTLS client certificates; use the authorized mechanism for the environment (never record tokens/certificates). Use `-k` only for local development certificates

2. **Test GET Endpoints** (if any):
   - Create curl command to test GET endpoint
   - Execute curl command: `curl -X GET [endpoint-url] [headers]` (include `api-version`, for example `?api-version=1`, when the endpoint requires it)
   - Verify response status code (200, 404, etc.)
   - Verify response body structure and content
   - Document the curl command and response in the task completion

3. **Test POST Endpoints** (CREATE operations):
   - Create curl command with request body: `curl -X POST [endpoint-url] -H "Content-Type: application/json" -d '[json-body]'`; for file uploads use `multipart/form-data` (`-F "archivo=@<ruta>"`) with the allowed extensions/size limits of the change
   - Execute curl command and capture response
   - Verify response status code (201, 400, 422, etc.)
   - Verify response body contains created resource
   - **Restore Database State**: After testing, delete the created record to restore database to original state (through the DELETE operation of the API/MAPI; use clearly identifiable test data)
   - Document the curl command, response, and cleanup action

4. **Test PUT/PATCH Endpoints** (UPDATE operations):
   - Create curl command with updated data: `curl -X PUT [endpoint-url] -H "Content-Type: application/json" -d '[json-body]'` (VES may implement updates as `POST` "Guardar..." operations; use the verb actually implemented)
   - Execute curl command and capture response
   - Verify response status code (200, 404, 400, etc.)
   - Verify response body contains updated resource
   - **Restore Database State**: After testing, revert the updated record to its original values to restore database state
   - Document the curl command, response, and cleanup action

5. **Test DELETE Endpoints**:
   - Create curl command: `curl -X DELETE [endpoint-url]`
   - Execute curl command and capture response
   - Verify response status code (200, 204, 404, etc.)
   - Verify deletion was successful
   - **Restore Database State**: After testing, recreate the deleted record with original values to restore database state (prefer deleting only test records created in step 3)
   - Document the curl command, response, and cleanup action

6. **Test Error Cases**:
   - Test with invalid data (validation errors)
   - Test with non-existent resources (404 errors)
   - Test with unauthorized access (if applicable: no/invalid authentication, missing client certificate)
   - Test download/upload edge cases when applicable (binary response, missing file, disallowed extension, size limit)
   - Verify error response format matches the implemented API contract and that MAPI/SQL errors are not turned into success responses nor leak sensitive data

7. **Mark Task as Completed**: Only after all curl tests pass and database state is restored, mark the task as completed in `tasks.md`

**Dependencies**:
- Backend server running (agent must start if needed): MAPI and API
- Database access for state restoration (through the application operations; direct SQL only if authorized and read-only)
- curl command-line tool

**Notes**:
- This step is MANDATORY for all new endpoints
- **The agent MUST execute all curl commands itself** - never ask the user to run tests
- All CREATE/UPDATE/DELETE operations must restore database to original state after testing
- Document all curl commands and responses for future reference in a report in the spec folder with proper naming (redact tokens, certificates and connection strings)
- Verify that database state matches pre-test state after cleanup
- Do not skip manual testing even if unit tests pass
- **Task completion in tasks.md can only be marked after successful execution of all curl tests**

### Step N+3: E2E Testing with Playwright MCP (MANDATORY if applicable)

**Agent Responsibility**: The coding agent MUST execute all E2E tests using Playwright MCP tools. This is NOT optional and cannot be delegated to the user.

> **VES note:** UI tests use Vitest + React Testing Library and no E2E dependency must be added to the repositories. Playwright MCP here is an **agent tool** used to drive the browser against the running UI; it does not add a dependency. If the tools are not available in the session, document the blocker and do not mark the step as completed.

**When This Applies**:
- UI changes (`Bccr.Supen.Ves.UI`, STI/SEC screens) that affect user workflows
- Integration between UI and API endpoints (UI → API → MAPI)
- User-facing features that require browser interaction

**Implementation Steps** (Agent must perform):
1. **Prepare Test Environment**:
   - Ensure both frontend and backend servers are running (start if needed): MAPI → API → UI (`npm start` from `Bccr.Supen.Ves.UI/Codigo`, served by Vite, normally at `http://localhost:3000`; the `localdev` configuration points to the local API, normally `http://localhost:62525/`; confirm effective URLs)
   - Verify database is in a known state (through read operations of the application)
   - Check available Playwright MCP tools using MCP file system

2. **Navigate to Application**:
   - Use Playwright MCP `browser_navigate` to open the application URL
   - Wait for page to load completely
   - Take a snapshot to verify initial state

3. **Execute User Workflows**:
   - Use Playwright MCP tools to interact with the UI:
     - `browser_click` for button clicks and navigation
     - `browser_type` or `browser_fill` for form inputs
     - `browser_snapshot` to verify state changes
     - `browser_wait` for async operations
   - Test the complete user workflow from start to finish
   - Verify expected outcomes at each step
   - Verify that the UI calls the API (browser network requests) and never MAPI or SQL Server directly, and that no sensitive data is shown in errors or the console

4. **Test Error Scenarios**:
   - Test form validation errors
   - Test error messages display correctly
   - Test error recovery flows

5. **Verify Data Persistence**:
   - After creating/updating data through UI, verify it persists correctly
   - Check database state matches UI state (verify through API/MAPI read operations rather than direct SQL, unless authorized)
   - Verify data appears correctly in lists/details views

6. **Restore Test Environment**:
   - Clean up any test data created during E2E tests
   - Restore database to original state (through the application's delete/revert operations)
   - Close browser sessions

7. **Mark Task as Completed**: Only after all E2E tests pass and environment is restored, mark the task as completed in `tasks.md`

**Dependencies**:
- Frontend server running (agent must start if needed)
- Backend server running (agent must start if needed): API and MAPI
- Playwright MCP tools available
- Database access for verification and cleanup (through the application)
- An authorized test user for the UI authentication (GAUDI/OpenID) when the workflow requires it; never record credentials

**Notes**:
- **The agent MUST execute all E2E tests itself** - never ask the user to run tests
- Use incremental waits (1-3 seconds) with snapshot checks rather than long waits
- Always restore database state after tests that modify data
- Document test scenarios and outcomes in a report in the spec folder with proper naming
- **Task completion in tasks.md can only be marked after successful execution of all E2E tests**

### Step N+4: Update Technical Documentation (MANDATORY)

- Follow [documentation-standards.md(./documentation-standards.md): identify the affected component and update only the documents whose statements become false, incomplete or misleading (see its "Change-to-document decision matrix"). Examples of VES destinations: component `README.md`/`AGENT.md`/`SPEC.md`, API `ComoCrearUnNuevoEndpoint.md`, MAPI `ComoImplementarUnMAPI.md` and `SCHEMA.md`, UI `Documentacion/DEVELOPMENT.md`
- Document contract changes on **both** sides (API and MAPI `Abstracciones` are separate, not one shared library)
- Preserve Spanish routes, properties and stored procedure names; never include real secrets
- Mark contracts as verified only after they were implemented and tested; do not describe a planned contract as implemented
- Update OpenSpec artifacts (`tasks.md`, specs/scenarios) before the code when a requirement changes after `/opsx:apply`
- Report what was edited, verified and not verified

## 4. Verification Checklist

Before finalizing any `tasks.md` file, verify:
- [ ] Step 0 (Create Feature Branch) is the FIRST step
- [ ] All mandatory steps from config.yaml are included
- [ ] Steps are numbered sequentially
- [ ] Mandatory steps are clearly marked with "(MANDATORY)" label
- [ ] Branch naming follows the convention: `feature/[name]` (no `-backend` suffix required in VES; base branch `dev` for UI/MAPI and `main` for API, per each repository)
- [ ] Step N+1 includes report path and naming convention in `specs/<change-name>/reports/`
- [ ] Manual testing steps explicitly state "AGENT MUST EXECUTE"
- [ ] Tasks include database state restoration steps
- [ ] E2E testing step is included if frontend changes are involved
- [ ] Each task names the affected component (UI, API or MAPI) and the commands run from its `Codigo/` folder
- [ ] No task introduces Prisma, Docker/PostgreSQL, Cypress, Jest, EF migrations or SQL schema/procedure changes outside the DBA process
- [ ] `npm run build:pruebas`/`build:produccion` are not used as local validation

## 5. When This Applies

This rule applies when:
- Creating `tasks.md` via `/opsx:ff` (fast-forward) or `openspec-ff-change` skill 
- Creating `tasks.md` via `/opsx:propose` or the `openspec-propose` skill (the workflow actually available in this workspace)
- Creating `tasks.md` via `/opsx:continue` (continue change) or `openspec-continue-change` skill 
- Updating existing `tasks.md` files (including via `/opsx:update` or the `openspec-update-change` skill)
- Any task creation that involves backend changes (API and/or MAPI) or UI changes
- Implementing tasks from `tasks.md` via `/opsx:apply` or `openspec-apply-change` skill - the agent must execute manual tests

## 6. Example Structure

```markdown
## 0. Setup: Create Feature Branch (MANDATORY - FIRST STEP)

- [ ] 0.1 Create feature branch `feature/add-ves-documentos-module` from the base branch of each affected component (`dev` for UI/MAPI, `main` for API)
- [ ] 0.2 Verify branch creation and current branch status (`git branch --show-current`)

## 1. MAPI/API: Validator and Business Tests (TDD where it adds value)
...

## 8. MAPI/API: Review and Update Existing Unit Tests (MANDATORY)
...

## 9. MAPI/API/UI: Run Unit Tests and Verify Database State (MANDATORY)
- [ ] 9.1 Capture pre-test database baseline for impacted entities (only if the run can touch SQL Server; otherwise record N/A)
- [ ] 9.2 Run targeted unit tests for changed modules
- [ ] 9.3 Run required broader unit test suite from config (`dotnet test` for API/MAPI, `npm run lint` + `npm test` + `npm run build:local` for UI)
- [ ] 9.4 Verify post-test database state and restore if needed
- [ ] 9.5 Create report `specs/<change-name>/reports/YYYY-MM-DD-step-N+1-unit-test-and-db-verification.md`
- [ ] 9.6 Mark step complete only after tests pass and report exists

## 10. API/MAPI: Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)
- [ ] 10.1 Ensure MAPI and API servers are running (MAPI first) and health checks respond
- [ ] 10.2 Test GET endpoints with curl and verify responses
- [ ] 10.3 Test POST endpoints with curl, verify creation, then restore database state
- [ ] 10.4 Test PUT/PATCH endpoints with curl, verify updates, then restore database state
- [ ] 10.5 Test DELETE endpoints with curl, verify deletion, then restore database state
- [ ] 10.6 Test error cases (validation errors, 404, unauthorized, etc.)
- [ ] 10.7 Document all curl commands and responses
- [ ] 10.8 Verify database state matches pre-test state

## 11. UI: E2E Testing with Playwright MCP (MANDATORY if applicable - AGENT MUST EXECUTE)
- [ ] 11.1 Ensure UI, API and MAPI servers are running
- [ ] 11.2 Navigate to application using Playwright MCP browser_navigate
- [ ] 11.3 Execute complete user workflow using Playwright MCP tools
- [ ] 11.4 Test error scenarios and validation
- [ ] 11.5 Verify data persistence and UI state
- [ ] 11.6 Restore test environment and database state
- [ ] 11.7 Document test scenarios and outcomes

## 16. Update Technical Documentation (MANDATORY)
...
```

## 7. Agent Execution Requirements

**CRITICAL**: When implementing tasks from `tasks.md` (via `openspec-apply-change` skill or `/opsx:apply` command), the coding agent MUST:

1. **Execute All Manual Tests**: Never ask the user to run curl commands or E2E tests. The agent must:
   - Start servers if needed (MAPI, API, UI - in that order)
   - Execute all curl commands for endpoint testing
   - Execute all E2E tests using Playwright MCP tools
   - Verify all responses and outcomes
   - Restore database state after tests (through application operations or the DBA; never by altering schema/procedures)

2. **Mark Tasks as Completed**: Tasks can ONLY be marked as completed (`[x]`) in `tasks.md` AFTER:
   - The agent has successfully executed all required tests
   - All test results have been verified
   - Database state has been restored (for CREATE/UPDATE/DELETE operations)
   - All test outcomes have been documented

3. **Never Delegate Testing**: The agent must never:
   - Ask the user to run curl commands
   - Ask the user to test endpoints manually
   - Ask the user to run E2E tests
   - Mark tasks as completed without executing tests
   - Skip manual testing steps

4. **Document Test Execution**: The agent must document:
   - All curl commands executed
   - All responses received
   - All E2E test scenarios executed
   - Database state restoration actions
   - Any issues encountered and resolutions

5. **Run the documentation update procedure in accordance with `docs/documentation-standards.md`**

## Failure to Follow

If you create tasks without following these mandatory steps, the user will need to manually fix the tasks.md file. Always read `openspec/config.yaml` first and ensure all mandatory steps are included.

**If you implement tasks without executing manual tests yourself, you are violating this rule. The agent must execute all tests to mark tasks as completed.**
