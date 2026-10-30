# Step 5 Report - Unit Tests and Database Verification

- Date: 2026-10-20
- Change: `consultar-documentos-filtrados-por-tipo`
- Agent: AI assistant using Copilot SDK in VS Code
- Components affected: UI / API / MAPI

## Commands Executed

- MAPI, from `VES/Bccr.Supen.Ves.Mapi/Codigo/`:
  - `dotnet build Bccr.Supen.Ves.Mapi.sln --no-restore`
  - `dotnet test Bccr.Supen.Ves.Mapi.sln`
- API, from `VES/Bccr.Supen.Ves.Api/Codigo/`:
  - `dotnet build Bccr.Supen.Ves.Api.sln`
  - `dotnet test Bccr.Supen.Ves.Api.sln`
  - `dotnet build API/Bccr.Supen.Ves.Api.csproj`
  - `dotnet test Bccr.Supen.Ves.Api.UnitTests/Bccr.Supen.Ves.Api.UnitTests.csproj`
- UI, from `VES/Bccr.Supen.Ves.UI/Codigo/`:
  - `npm install --save-dev --save-exact typescript@5.1.6` (approved compatibility pin)
  - `npm run lint`
  - `npm test -- src/Dashboard.test.jsx src/Documentacion/Documentos/ConsultaDocumentos.test.jsx`
  - `npm test`
  - `npm run build:local`
- Repository:
  - `git status --short`
  - `git diff --check`

## Unit Test Results

- Targeted UI tests: 9 passed, 0 failed.
- Full UI suite: 82 passed, 0 failed across 18 files.
- MAPI suite: 529 passed, 0 failed (144 MAPI, 169 DA, 216 BW).
- API unit tests: 187 passed, 0 failed.
- MAPI build: succeeded with 0 errors and 3 warnings in existing DA/BW test files (`CS1998`, `CS8632`, `CS0618`).
- API project build: succeeded with 0 warnings and 0 errors.
- UI local build: succeeded. Vite reported the existing large-chunk warning (the main JS chunk is about 1.66 MB).
- API solution build/test: blocked because the integration-test project cannot restore private package `Bccr.Pruebas.PruebasDeIntegracion` (`NU1101`) from the configured feeds.
- UI lint: passed after pinning TypeScript 5.1.6 with the requester's approval; ESLint reported 0 errors and 12 warnings in existing files outside this change, plus an informational `jsx-ast-utils` parser warning.
- `git diff --check` reported trailing whitespace in the pre-existing modified `readme.md`; this task did not edit that file.

## Manual API/MAPI Checks

- Started the local Development MAPI first at `http://localhost:62528`, then the API at `http://localhost:62525`.
- MAPI `/health/ready` and `/healthcheck` returned HTTP 200; `/healthcheckVES` returned HTTP 503 because that path did not match a local route.
- API `/health/ready` returned HTTP 200. The local API Development authentication handler reports `RequiereJwt=False`, so this environment cannot verify the expected unauthorized response for a user without credentials.
- Unauthenticated `GET /Documentos/Tipos?api-version=1.0` and `GET /Documentos?codigoTipo=-1&api-version=1.0` ended without an HTTP response while the local API-to-MAPI/error-logging path failed. `GET /Documentos?codigoTipo=0&api-version=1.0` returned HTTP 400 with the expected Spanish validation message.
- No authorized positive-type or `Todos` data response was obtained. These local calls were GET-only; no write or mutation request was sent. The local servers were stopped after the checks.

## Database State Verification

- Pre-test baseline: N/A - no real SQL Server database was used by the executed unit suites.
- Post-test validation: N/A - tests used in-memory EF or generated SQL text; the health-check test targets a deliberately invalid host. Manual local checks were GET-only and did not access a real non-production database.
- State restored: N/A.
- Restoration actions: None.
- Read-only scope: the implemented operations are GET queries and the MAPI DA path uses stored-procedure reads. Runtime confirmation against an authorized non-production environment remains pending under tasks 6 and 7.

## Outcome

- Step 5 status: FAIL (partial) - MAPI and UI suites passed; API unit tests and API project build passed; the full API solution remains blocked by the unavailable private integration-test package. Local endpoint checks could not verify data responses or the unauthorized challenge.
- Blocking issues:
  - Restore access or an available package source for `Bccr.Pruebas.PruebasDeIntegracion`.
  - Run the authorized non-production endpoint checks from task 6 and the authenticated UI flow from task 7.

## Follow-up: local database and UI E2E verification (2026-10-20)

This follow-up supersedes the earlier statement above that no local document data response was obtained. It does not clear the private-package, VES authorization, or remaining scenario gaps.

### Environment and execution

- Started MAPI, API, then UI in Development at `http://localhost:62528`, `http://localhost:62525`, and `http://localhost:3000`, respectively. The local API configuration points the document gateway to MAPI on port 62528; the UI local configuration points to API on port 62525. Requests used `api-version=1.0`.
- MAPI was started with a process-scoped logging-level override for EF model-validation warnings after the earlier Event Log permission failure. No repository configuration was changed for this override.
- Navigated through the local Development login and Dashboard to **Documentación → Documentos** using the integrated Playwright browser. Development has `RequiereJwt=False`; this login is not evidence that the VES authentication/authorization policy works in an authorized environment.
- An initial browser visit using `127.0.0.1:3000` encountered a CORS error for the API origin. Reopening the UI at the configured `localhost:3000` origin allowed the flow to continue; no CORS or application configuration was changed.

### Observed results

| Scenario | Result |
|---|---|
| Load document types | HTTP 200; the selector showed **Todos** plus 5 types returned by the active-types operation. |
| Initial **Todos** list | HTTP 200; 61 rows from the development database. The displayed columns were code, file name, type, title, and publication date. |
| Select type code 1 | HTTP 200; 5 rows, all displayed as “Manuales de Usuario”. |
| Return to **Todos** | HTTP 200; 61 rows returned again. |
| Ordering and projection | Both observed lists were in descending publication-date order and used `yyyy-MM-dd` dates. The UI displayed no binary field. |
| UI/API boundary | Browser network activity for login, menu, type catalog, and document-list data was directed to the configured API; document data was not requested directly from MAPI. |
| Empty/error UI states | Not exercised in this E2E run. |
| Authorization challenge | Not verified; local Development disables required JWT. |

The successful document requests were GET-only. The list checks confirm the live stored-procedure/API/UI path after the requester corrected the `NombreArchivo` output, but do not independently establish the database contents of inactive types, null-type rows, binary-null rows, or expiration-boundary cases. No before/after database snapshot was captured, so the report makes no independent claim about row-level database state.

### Cleanup and remaining work

- Stopped the local UI, API, and MAPI processes; verified ports 3000, 62525, and 62528 were free. Navigated the browser tab to `about:blank`; did not perform VES logout because this Development login is not an authorized VES session.
- Tasks 6.1–6.3 and 7.1–7.3 remain incomplete where their criteria require authorized-environment verification, `curl.exe`, empty/error UI scenarios, or an independent data-state check. The partial E2E evidence is recorded in `tasks.md`; no task checkbox was completed based only on partial evidence.
