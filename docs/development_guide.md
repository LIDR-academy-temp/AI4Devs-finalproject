# VES Development Guide

Getting-started guide for setting up and working with the three BCCR VES components. Practices that remain applicable—keeping credentials out of the repository, testing changes, following reproducible steps, and running each service independently—are retained using the actual VES toolchain.

## 0. How to Use This Guide

Use this guide to:

1. verify prerequisites;
2. obtain or access the three projects;
3. configure each component securely;
4. start MAPI, API, and UI;
5. validate the end-to-end flow;
6. run the appropriate tests;
7. troubleshoot common failures without weakening security.

Do not use this guide as a substitute for the `README.md`, `AGENT.md`, `SPEC.md`, or component-specific technical documentation in each repository. Where they differ, component-specific documentation takes precedence.

### 0.1 Security Rule for Reusing Historical Documentation

Never copy the following from historical documentation:

- passwords;
- database user accounts;
- connection strings;
- tokens;
- certificates;
- unverified internal URLs;
- `.env` secrets.

Use only mechanisms and access permissions authorized for VES.

Contract and procedure locations are listed in the [VES documentation index](./INDICE_DOCUMENTAL.md). This guide focuses on preparing and verifying the three components. Coding rules are defined in the specialized standards, and OpenSpec instructions are defined in the [mandatory steps](./openspec-tasks-mandatory-steps.md).

## 1. Architecture and Responsibilities

```text
Browser
   │
   ▼
Bccr.Supen.Ves.UI (React 19 / Vite)
   │ HTTP/HTTPS
   ▼
Bccr.Supen.Ves.Api (.NET 8)
   API Controller → SI.SG → IRequestsHandler
   │ HTTP/HTTPS
   ▼
Bccr.Supen.Ves.Mapi (.NET 8)
   MAPI Controller → BW → DA → EF Core / stored procedures
   │
   ▼
SQL Server
```

These are three separate components, not three layers within a single solution:

| Directory | Responsibility |
|---|---|
| `Bccr.Supen.Ves.UI` | STI and SEC SPA; communicates exclusively with the API |
| `Bccr.Supen.Ves.Api` | Orchestrates HTTP requests and invokes MAPI through `SI.SG` |
| `Bccr.Supen.Ves.Mapi` | Business logic (`BW`) and data access (`DA`) |

The UI MUST NOT call MAPI or SQL Server directly. Contracts and DTOs in `Bccr.Supen.Ves.Abstracciones` belong to their respective solutions; they are not a shared library across all three directories.

## 2. Prerequisites and Access

- **UI:** Node.js **24.18.0**, npm, and Git. The version is pinned in `Bccr.Supen.Ves.UI/Codigo/.nvmrc`; the repository also includes portable Node.js under `Codigo/.tools/`.
- **API and MAPI:** .NET 8 SDK. Visual Studio 2022, Rider, or VS Code with the C# extension can be used for development.
- Restoring .NET packages and accessing development services and databases may require the BCCR network/VPN and authentication to private NuGet feeds.
- Running MAPI requires connectivity to development SQL servers. This solution does not require Docker or a local PostgreSQL database.
- Debugging the API with IIS Express requires the IIS Express support provided by Visual Studio. MAPI execution with `dotnet run` is also documented.

Verify component-specific requirements and package versions in the corresponding README, `.csproj`, and configuration files. Do not install global tools or extra dependencies unnecessarily.

### 2.1 Preflight Checks Before Installation or Execution

> **Note — Adapted from `development_guide_1.md`:** The original requirement to check prerequisites before setup is retained, using the actual versions and dependencies of each component.

Before proceeding, check the following.

#### UI

```powershell
node --version
npm --version
git --version
```

The Node.js version MUST match:

```text
Bccr.Supen.Ves.UI/Codigo/.nvmrc
```

The project guide currently specifies Node.js `24.18.0`; always verify the repository file before installing another version.

#### API / MAPI

```powershell
dotnet --version
dotnet --list-sdks
git --version
```

A .NET 8 SDK compatible with the `.csproj` files MUST be available.

#### Connectivity

Confirm the following as applicable to the task:

- BCCR network/VPN access;
- access to private NuGet feeds;
- development SQL Server permissions if MAPI will run;
- access to the client certificate if the environment requires mTLS;
- access to the relevant repository.

### 2.2 Do Not Install Tools Preemptively

Do not install the following by default:

- Docker;
- PostgreSQL;
- Prisma;
- Cypress;
- global npm tools;
- additional SDKs;
- external NuGet packages.

Install new tools only when required by the actual project and confirmed by component-specific documentation.

## 3. Obtain the Projects

In this workspace, all three directories are already available under `VES/`. When cloning them separately, follow the BCCR-approved repository and access instructions in each project's README:

- [UI: README and development](../VES/Bccr.Supen.Ves.UI/README.md)
- [API: README](../VES/Bccr.Supen.Ves.Api/README.md)
- [MAPI: README](../VES/Bccr.Supen.Ves.Mapi/README.md)

### 3.1 Verification After Obtaining the Source Code

Once each repository is available:

1. verify that the expected branch is checked out;
2. read `README.md` and `AGENT.md`;
3. review version and configuration files before installing dependencies;
4. do not copy `.env`, `appsettings`, or configuration files from another project.

Useful Git commands for confirming the current context:

```bash
git status
git branch --show-current
git remote -v
```

These are inspection commands and do not modify the repository.

## 4. Secure Configuration

### UI

Environment-specific configuration lives in `Bccr.Supen.Ves.UI/Codigo/config/{ambiente}.json` and is merged with `config/default.json`. `NODE_CONFIG_ENV` selects the environment during Vite build/development; `vite.config.mjs` exposes the configuration to the browser bundle as `__APP_CONFIG__`.

- For local development, the UI defaults to `http://localhost:62525/` (local API).
- Do not hardcode API URLs in components or edit `Constantes.js` to switch environments.
- Any value bundled into browser code is visible to end users. Never store credentials, private keys, or secrets in `Codigo/config/` or the frontend `.env`.
- The UI repository documents a legacy `ENCRYPTION_KEY` value as pending secure management; do not add or replicate secrets in that file.

### API

The MAPI URL is configured through `ApiEndpoints` and environment-specific settings. In development it may point to a shared MAPI instance or a local one; consult the API README and `Codigo/API/appsettings.Development.json`. Do not place secrets in version-controlled files or modify tokens resolved by the pipeline.

The API requires a client certificate to communicate with MAPI in environments enforcing mTLS. Certificate-bypass decorators are exclusive to `Development` and MUST NOT be carried into Staging, QA, or Production.

### MAPI and SQL Server

Configuration placeholders in the form `#{token}#` are substituted during deployment. `appsettings.Development.json` contains reference configuration and MUST NOT contain personal credentials.

For local development, use **User Secrets** as described in the MAPI guide:

```powershell
cd VES\Bccr.Supen.Ves.Mapi\Codigo\MAPI
dotnet user-secrets set "ConnectionStrings:BDSupen" "<cadena de conexión local autorizada>"
```

Configure other required connection strings according to `Bccr.Supen.Ves.Mapi/README.md`. The User Secrets ID is associated with the .NET project; inspect its `.csproj` rather than assuming the identifier.

Do not include passwords, tokens, private certificates, or real connection strings in saved commands, Markdown, logs, or commits. User Secrets reside in the local user profile and MUST NOT be copied into the repository. Integration and production connections use the process/IIS identity according to infrastructure configuration.

The DBA owns the SQL Server schema and stored procedures. Do not generate EF migrations or change the schema as part of ordinary application work; coordinate such changes with the DBA.

### 4.1 Configuration Checklist by Component

> **Note — Adapted from `development_guide_1.md`:** The previous guide instructed developers to create `.env` files for frontend/backend. VES addresses the same environment configuration need through different mechanisms.

#### UI

Before starting:

- confirm the environment selected by `NODE_CONFIG_ENV`;
- review `config/default.json` and `config/{ambiente}.json`;
- verify the effective API URL;
- verify that no secrets are included in the bundle;
- do not edit `Constantes.js` merely to point to another environment.

#### API

Before starting:

- review `ApiEndpoints`;
- confirm the effective MAPI URL;
- verify the ASP.NET Core environment;
- determine whether a client certificate is required;
- do not use `Development` bypasses/decorators in other environments.

#### MAPI

Before starting:

- confirm SQL connectivity;
- configure only the required connection strings using User Secrets or another authorized mechanism;
- review the effective tokens/configuration;
- do not edit stored procedures or the schema merely to make the local environment work.

### 4.2 Configuration Is Not a Secret

Distinguish between:

```text
Configuration:
- logical host
- timeout
- endpoint name
- non-sensitive feature/config flags

Secret:
- password
- private key
- client secret
- token
- connection string containing credentials
```

All values delivered to the browser are public. Backend secrets MUST remain outside the repository and be resolved through authorized mechanisms.

## 5. Run Locally

Services can be started independently. To test the full flow with local instances, start MAPI first, then API, and finally UI. Alternatively, the API may target the shared development MAPI.

### 5.0 Recommended Sequence for a Fully Local Environment

To run all three components locally:

```text
1. MAPI
   ↓
2. API
   ↓
3. UI
```

Reason:

- MAPI requires SQL Server access;
- API requires an accessible MAPI;
- UI requires an accessible API.

Running all three locally is not mandatory. The API may point to a shared development MAPI if team procedures allow it.

### 5.0.1 Checkpoint Before Starting the Next Component

Before proceeding, verify:

**MAPI**
- the build succeeded;
- the process started without configuration errors;
- the service listens on the effective profile/port;
- the required SQL Server connectivity is available.

**API**
- the build succeeded;
- the process started;
- `ApiEndpoints` points to the correct MAPI;
- the health check responds;
- mTLS and other configuration match the environment.

**UI**
- dependencies are installed;
- Vite starts;
- effective configuration points to the expected API;
- the browser can reach the API.

Do not assume ports solely from this guide. Always verify process output, `launchSettings.json`, and effective configuration.

### 5.1 MAPI

From the MAPI repository/directory:

```powershell
cd VES\Bccr.Supen.Ves.Mapi\Codigo
dotnet restore Bccr.Supen.Ves.Mapi.sln
dotnet build Bccr.Supen.Ves.Mapi.sln --no-restore
cd MAPI
dotnet run
```

According to the MAPI README, `dotnet run` normally listens on `https://localhost:5001` and `http://localhost:5000`; confirm the ports in local output and `Properties/launchSettings.json`.

### 5.2 Orchestration API

Restore and build the solution:

```powershell
cd VES\Bccr.Supen.Ves.Api\Codigo
dotnet restore Bccr.Supen.Ves.Api.sln
dotnet build Bccr.Supen.Ves.Api.sln
```

In Visual Studio, run the `IIS-development` profile documented by the project. The documented local URL is `https://localhost:44366`. Ensure `ApiEndpoints` points either to the local MAPI instance or to the shared service. The `API` project can also be run with `dotnet run` using the appropriate development profile and configuration.

API health check:

```text
GET https://localhost:44366/healthcheck?api-version=1
```

### 5.3 UI

From the UI `Codigo` directory:

```powershell
cd VES\Bccr.Supen.Ves.UI\Codigo
npm install
npm start
```

Vite serves the UI at `http://localhost:3000`. Its `localdev` configuration targets `http://localhost:62525/`. Run the API at that address or configure the UI according to the team's documented development procedure.

To produce a local build without changing the version:

```powershell
npm run build:local
```

The `build:pruebas` and `build:produccion` scripts increment the version in `package.json`; do not run them for routine local validation.

### 5.4 Minimum Manual End-to-End Verification

After starting the required components:

1. verify that MAPI started successfully;
2. check the API health endpoint;
3. open the UI;
4. execute only a known, safe functional flow;
5. inspect browser console and network errors;
6. confirm that the UI calls the API rather than MAPI directly;
7. confirm that error responses do not expose sensitive data.

Manual validation complements, but does not replace, automated tests.

### 5.5 Ports and Profiles: Avoid Assumptions

This guide documents multiple profiles/URLs because components can run using different mechanisms (for example, IIS Express, `dotnet run`, or `localdev` configuration).

Therefore:

- do not change code merely to match an expected port;
- confirm the actual port in runtime output;
- inspect `launchSettings.json`, `ApiEndpoints`, and Vite configuration;
- align configuration according to team procedures.

## 6. Testing and Verification

Run the checks applicable to the directory you changed.

### 6.0 Quick Validation Matrix

| Change made | Minimum validation |
|---|---|
| UI only | `npm run lint` + `npm test` + `npm run build:local` |
| API only | `dotnet build` + `dotnet test` for the API solution |
| MAPI only | `dotnet build` + `dotnet test` for the MAPI solution |
| API ↔ MAPI | Tests for both components + contract verification |
| UI ↔ API | Relevant UI/API tests + route/configuration verification |
| UI ↔ API ↔ MAPI | Checks for all three components + controlled integrated flow |
| SQL/SP change | Application validation + DBA coordination/verification |

Do not run tools from another project merely to satisfy a checklist: Cypress, Prisma, and Jest are not part of the current VES workflow.

### UI

From `Bccr.Supen.Ves.UI/Codigo/`:

```powershell
npm run lint
npm test
npm run build:local
```

Tests use Vitest and React Testing Library. The current stack does not use Jest or Cypress.

### API

From `Bccr.Supen.Ves.Api/Codigo/`:

```powershell
dotnet build Bccr.Supen.Ves.Api.sln
dotnet test Bccr.Supen.Ves.Api.sln
```

The suite includes MSTest unit tests and xUnit integration tests; consult the `.csproj` files to run a specific test project.

### MAPI

From `Bccr.Supen.Ves.Mapi/Codigo/`:

```powershell
dotnet build Bccr.Supen.Ves.Mapi.sln --no-restore
dotnet test Bccr.Supen.Ves.Mapi.sln
dotnet test Bccr.Supen.Ves.Mapi.sln --collect:"XPlat Code Coverage"
```

Layer-specific tests reside in `DA.Pruebas`, `BW.Pruebas`, and `MAPI.UnitTests`, using MSTest and Moq/NSubstitute according to existing patterns. Unit tests MUST NOT depend on real databases, private feeds, production certificates, or external services.

### Changes Spanning Multiple Components

If the API↔MAPI contract changes, verify configured route, HTTP method, version, parameters, serialization/DTOs, authentication, and mTLS at both ends. If the change also affects UI, verify that it uses the correct environment-specific URL/configuration and handles loading and error states.

### 6.1 What a Passing Validation Means

A successful command alone is not enough if:

- relevant new warnings appear;
- a test was skipped to make the suite pass;
- a contract changed without updating consumers;
- a unit test unexpectedly requires external infrastructure;
- the build command incremented versions or introduced unrelated changes.

After running tests:

```bash
git status
git diff
```

Or use equivalent commands in the Git client to confirm validation did not unexpectedly modify files.

### 6.2 Local Tests Without Production Infrastructure

Unit tests MUST NOT require:

- production SQL Server;
- production certificates;
- real credentials;
- uncontrolled external network access;
- unauthorized additional feeds.

Integration test suites may have different requirements; review their README and configuration before treating their failures as unit test failures.

### 6.3 Coverage

- API/MAPI: use the project's configured options and Quality Gate;
- MAPI documents `--collect:"XPlat Code Coverage"`;
- UI: follow the existing Vitest/pipeline configuration;
- do not invent a universal coverage threshold unless the repository establishes one.

## 7. Retained Working Practices

- Keep changes within the task scope and respect layer responsibilities.
- Write or update tests covering new behavior and relevant regressions, using the project's test framework.
- Validate inputs server-side and preserve meaningful errors; do not mask failures with empty success responses.
- Use parameterized SQL; never concatenate input data into SQL statements.
- Keep secrets out of the repository and browser bundle.
- Do not duplicate business rules between API and MAPI or introduce layers/dependencies without a concrete need.
- Before deployment, follow the pipeline and procedures for the target repository and environment. Local builds do not replace deployment authorization.

For detailed conventions and architecture, consult [base-standards.md](./base-standards.md), [frontend-standards.md](./frontend-standards.md), and [backend-standards.md](./backend-standards.md).

### 7.1 Recommended Workflow

> **Note — Adapted from `development_guide_1.md`:** The previous guide was strictly sequential. Its operational value is preserved in a workflow applicable to all three components.

```text
1. Identify the component
        ↓
2. Read standards/README
        ↓
3. Verify the environment
        ↓
4. Make the smallest necessary change
        ↓
5. Build/lint
        ↓
6. Run tests
        ↓
7. Validate integration if applicable
        ↓
8. Review git diff/status
        ↓
9. Document relevant changes
```

For complex changes, also follow the planning/model-selection strategy defined in `base-standards.md`.

### 7.2 Do Not “Fix” an Environment by Weakening Controls

If execution fails due to:

- authentication;
- certificates;
- CORS;
- permissions;
- SQL connectivity;
- private feeds;
- environment configuration;

first investigate the correct configuration and access requirements.

Do not resolve a local issue by:

- introducing unnecessary `[AllowAnonymous]`;
- disabling TLS validation;
- bypassing mTLS outside Development;
- broadly relaxing CORS;
- hardcoding credentials;
- changing global permissions;
- targeting an unauthorized database.

## 8. Troubleshooting

| Symptom | Checks |
|---|---|
| `dotnet restore` cannot find packages | Verify BCCR network/VPN connectivity, NuGet authentication, and configured private feeds. Do not add untrusted feeds. |
| API cannot find a MAPI endpoint | Review `ApiEndpoints`, the exact endpoint name, MAPI URL, and effective `Development` configuration file. |
| Certificate error when calling MAPI | Verify environment and mTLS configuration; do not disable certificates outside Development. |
| Local SQL connection error | Verify network/permissions, required connection strings, and User Secrets; never copy credentials into the repository. |
| Upload limit error `404.13` | Ensure IIS and ASP.NET Core/API limits are aligned; consult the API README and deployment guide. |
| UI cannot connect to API | Verify that API is running at the host/port configured for `localdev`, and inspect browser console/network requests. |
| API tests require external services | Run the appropriate test project; unit tests should replace external dependencies. Check whether an integration suite is being run. |

Do not resolve environment failures by weakening authentication, permissions, CORS, or validation without approval and impact analysis.

### 8.1 Layer-by-Layer Diagnosis

When the full flow fails, isolate the issue from the bottom up:

```text
SQL Server
   ↑
MAPI
   ↑
API
   ↑
UI
```

Examples:

- if MAPI cannot access SQL Server, do not diagnose React first;
- if API cannot reach MAPI, inspect `ApiEndpoints` before modifying UI;
- if the API health check responds but UI fails, inspect UI configuration, browser behavior, and the HTTP request.

### 8.2 Useful Information When Reporting a Failure

Record, without exposing secrets:

- component;
- executed command;
- environment/profile;
- error message;
- affected logical endpoint/route;
- stage at which the error occurs;
- whether build/tests pass;
- related recent change.

Do not include:

- passwords;
- tokens;
- actual connection strings;
- private certificate contents;
- sensitive data.

## 9. Development Quick Start

### UI Only

```powershell
cd VES\Bccr.Supen.Ves.UI\Codigo
npm install
npm start
```

Validate:

```powershell
npm run lint
npm test
npm run build:local
```

### API Only

```powershell
cd VES\Bccr.Supen.Ves.Api\Codigo
dotnet restore Bccr.Supen.Ves.Api.sln
dotnet build Bccr.Supen.Ves.Api.sln
dotnet test Bccr.Supen.Ves.Api.sln
```

Confirm the profile/configuration before starting the host.

### MAPI Only

```powershell
cd VES\Bccr.Supen.Ves.Mapi\Codigo
dotnet restore Bccr.Supen.Ves.Mapi.sln
dotnet build Bccr.Supen.Ves.Mapi.sln --no-restore
dotnet test Bccr.Supen.Ves.Mapi.sln

cd MAPI
dotnet run
```

MAPI requires appropriate SQL connectivity and configuration.

### Full Local Flow

```text
1. Configure MAPI
2. Start MAPI
3. Configure API → MAPI
4. Start API
5. Verify the health check
6. Configure UI → API
7. Start UI
8. Test the functional flow
9. Run tests for each modified component
```

## 10. Final Development Environment Checklist

### Prerequisites

- [ ] Node.js matches `.nvmrc` for UI.
- [ ] .NET 8 SDK is available for API/MAPI.
- [ ] Git is available.
- [ ] BCCR network/VPN is available when required.
- [ ] Private NuGet feeds are accessible when required.
- [ ] Authorized SQL access is available for MAPI when required.

### Configuration

- [ ] UI uses the correct environment/configuration.
- [ ] API points to the correct MAPI.
- [ ] MAPI has only the required authorized connections.
- [ ] No new secrets were added to version-controlled files.
- [ ] mTLS/certificates match the environment.

### Execution

- [ ] MAPI starts successfully if required.
- [ ] API starts and its health check responds.
- [ ] UI starts with Vite.
- [ ] UI communicates with API, not MAPI.
- [ ] Effective ports were verified, not assumed.

### Tests

- [ ] UI: lint + Vitest + local build, if UI was changed.
- [ ] API: build + tests, if API was changed.
- [ ] MAPI: build + tests, if MAPI was changed.
- [ ] Cross-component contracts were verified on both sides.
- [ ] SQL changes were coordinated with the DBA.

### Security

- [ ] No actual passwords/tokens/connection strings in commits.
- [ ] No authentication bypass outside Development.
- [ ] No CORS/TLS/mTLS weakening to resolve a local failure.
- [ ] No sensitive data in logs or error screenshots.

### Before Closing

- [ ] `git status` shows no unexpected changes.
- [ ] `git diff` was reviewed.
- [ ] Affected documentation remains aligned.
- [ ] `base-standards.md`, `frontend-standards.md`, and/or `backend-standards.md` were followed as applicable to the component.
