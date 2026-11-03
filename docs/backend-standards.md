---
description: Backend standards for Bccr.Supen.Ves.Api and Bccr.Supen.Ves.Mapi within the VES solution
globs: ["VES/Bccr.Supen.Ves.Api/**/*.cs", "VES/Bccr.Supen.Ves.Mapi/**/*.cs", "VES/Bccr.Supen.Ves.Api/**/*.csproj", "VES/Bccr.Supen.Ves.Mapi/**/*.csproj"]
alwaysApply: false
---

# VES Backend Standards

## Scope and Current Architecture

This document applies to the two .NET backend services in VES. It does not apply to the React UI and does not describe a Node.js backend:

```text
Navegador / Bccr.Supen.Ves.UI
             │ HTTP/HTTPS
             ▼
Bccr.Supen.Ves.Api
API Controller → SI.SG → IRequestsHandler → MAPI
                                           │ HTTP/HTTPS
                                           ▼
Bccr.Supen.Ves.Mapi
MAPI Controller → BW → DA → SQL Server
``` 

| Project | Responsibility | Confirmed Technology Stack |
|---|---|---|
| `Bccr.Supen.Ves.Api` | HTTP orchestration API consumed by the UI; `SI.SG` implements the HTTP gateway to MAPI | .NET 8 / ASP.NET Core, `IRequestsHandler`, contracts and DTOs in `Bccr.Supen.Ves.Abstracciones` |
| `Bccr.Supen.Ves.Mapi` | Service containing controllers, business logic, and data access | .NET 8 / ASP.NET Core, EF Core 8, SQL Server, and stored procedures |

These directories represent two separately deployable services, not layers of a single application. Each .NET solution has its own `Abstracciones` project for interfaces and models; it is not a shared layer between API and MAPI. Refer to [base-standards.md](./base-standards.md) for the architecture including the UI.

**Data references:** consult [data-model.md](./data-model.md) for API/MAPI transfer contracts and DTOs, and [SCHEMA.md](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md) for the SQL and stored-procedure inventory and its verification limitations. MUST NOT infer DDL from DTOs or treat legacy Web Forms diagrams as the current database schema.

The practices retained from previous standards include clear responsibilities, dependency inversion through existing contracts, pragmatic SOLID/DRY principles, input validation, correct asynchronous operations, explicit errors, secure defaults, behavior-based tests, edge-case coverage, and review before merging. They are expressed below using .NET and actual VES patterns.

> **Scope of this documentation revision:** decisions classified **C/U/R/A** in the approved matrix have been applied; claims classified **V** remain unverified against code, configuration, databases, or environments. This document does not constitute security validation or authorization to make executable changes.

## Repository Technology Stack and Conventions

- Runtime and framework: .NET 8 / ASP.NET Core 8.
- MAPI: EF Core 8 (packages currently centrally managed in `Bccr.Supen.Ves.Mapi/Codigo/Directory.Packages.props`) and SQL Server.
- MAPI: the DBA manages database schemas and stored procedures; MUST NOT add EF migrations or modify database objects through application code.
- API and MAPI: preserve existing BCCR packages, dependency injection, middleware, authentication, versioning, and configuration conventions. MUST NOT replace institutional dependencies with custom implementations without a requirement.
- VES project code and documentation are primarily in Spanish. Preserve existing names, contracts, messages, and conventions; MUST NOT translate or rename public code merely to enforce a generic language rule.
- Follow nearby files' C# formatting and style. Class, interface, public method, and DTO names use `PascalCase`; do not change existing domain identifiers (many are in Spanish).
- Preserve nullable annotations and project-defined types. Avoid `dynamic`, `object`, or nullability suppression that hides errors where an appropriate type or validation exists.
- Inspect `.csproj`, `Directory.Packages.props`, and each service's documentation before assuming versions or tools. Do not pin versions here if they are already managed centrally.

Component-specific operational references:

- API: `VES/Bccr.Supen.Ves.Api/AGENT.md` (outside this package), [SPEC.md](../VES/Bccr.Supen.Ves.Api/SPEC.md), [endpoint guide](../VES/Bccr.Supen.Ves.Api/Documentacion/ComoCrearUnNuevoEndpoint.md), and [deployment guide](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md).
- MAPI: `VES/Bccr.Supen.Ves.Mapi/README.md` (outside this package), `VES/Bccr.Supen.Ves.Mapi/AGENT.md` (outside this package), [implementation guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/ComoImplementarUnMAPI.md), [environment verification guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/VerificacionEntorno.md), and [SCHEMA.md](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md).

## C# Conventions — Single Normative Source

**Governing principle:** preserve VES conventions and public contracts; do not mechanically apply TypeScript/Node rules to .NET. This table replaces redundant explanations scattered throughout the previous document.

| Element | VES/.NET Convention | Example |
|---|---|---|
| Class, `record`, `enum`, DTO, or public property | `PascalCase` | `FondoSolicitud` |
| Interface | `I` + `PascalCase` | `IFondoDA` |
| Public or private method | `PascalCase` with a business-domain verb | `ObtengaFondosAsync` |
| Asynchronous method | `Async` suffix according to module conventions | `ActualiceRentabilidadAsync` |
| Local variables and parameters | `camelCase` | `codigoEntidad` |
| Private field | `_camelCase`; `readonly` when appropriate | `_fondoDA` |
| Constant and `static readonly` | `PascalCase`, unless an established convention differs | `CantidadMaximaResultados` |
| C# file | `PascalCase` matching the primary type | `FondoBW.cs` |
| Boolean identifiers | Positive, descriptive names | `tieneAutorizacion` |

- Preserve the module's language and terminology (predominantly Spanish), while respecting framework terms and external contracts. MUST NOT translate published identifiers, DTOs, or routes merely to satisfy a generic rule.
- MUST NOT rename existing files/classes as an incidental change. Before naming new elements, inspect neighboring files in the same layer and follow their style.
- Use explicit types and contracts, `nullable` where enabled, applicable `Abstracciones` DTOs, and sufficiently precise return types. Avoid `dynamic`, `object`, and `null!` as substitutes for validation.
- Use `var` when the type is obvious from the expression and explicit types when they improve understanding; follow local style.
- Use constructor injection, existing contracts, and private `_camelCase` fields (preferably `readonly`). Avoid directly instantiating concrete implementations with `new` inside BW/SG when an injectable dependency exists.
- Choose between `const` and `static readonly` based on semantics. Move environment-dependent values to options/configuration; do not hard-code URLs or credentials.
- Methods should have a clear responsibility, inputs and returns consistent with the contract, DTOs for related inputs, and `CancellationToken` only where the contract permits it.
- Prefer validation and early returns when they improve readability, without changing contractual error codes or exceptions. Avoid unnecessary nesting.
- Use comments and XML documentation for non-obvious decisions, rationale, and contracts, not to narrate what the code already expresses. Follow consistent repository C# formatting.

**Examples and special cases:** [conventions and naming](./backend-examples.md#convenciones-c-y-ejemplos-de-nomenclatura) (original lines 90–661). The single checklist remains at the end of this guide.

## Responsibility Boundaries and Architecture

### Orchestration API (`Bccr.Supen.Ves.Api`)

The API receives and validates HTTP requests, applies the configured attributes, filters, and middleware, and delegates operations to `SI.SG`. SG resolves `ApiEndpoint` using `IProveedorApiEndpoints` and calls MAPI through `IRequestsHandler`. The API does not own MAPI's EF/SQL access and MUST NOT duplicate MAPI business logic or data access.

When adding an endpoint, follow the project's documented workflow:

1. Reuse or add the DTO in `Bccr.Supen.Ves.Abstracciones`.
2. Define the SG contract and, where prescribed by the project pattern, the controller contract.
3. Implement the `SI.SG` call through `IRequestsHandler`.
4. Implement the controller in `API/Controllers/Version1/`, delegating to SG.
5. Add endpoint configuration and relevant tests.

Illustrative example of the existing gateway pattern:

```csharp
public sealed class FondoSG : IFondoSG
{
    private readonly IProveedorApiEndpoints _proveedorApiEndpoints;
    private readonly IRequestsHandler _requestHandler;

    public FondoSG(
        IProveedorApiEndpoints proveedorApiEndpoints,
        IRequestsHandler requestHandler)
    {
        _proveedorApiEndpoints = proveedorApiEndpoints;
        _requestHandler = requestHandler;
    }

    public async Task<IEnumerable<Fondo>> ObtengaLosFondosDeUnaEntidadAsync(
        int elCodigoEntidad,
        bool seAplicaElFiltro)
    {
        var configuracion = _proveedorApiEndpoints
            .ObtengaLaConfiguracion("ObtengaLosFondosDeUnaEntidadAsync");
        var apiEndpoint = new ApiEndpoint
        {
            Ruta = string.Format(
                configuracion.Ruta,
                elCodigoEntidad,
                seAplicaElFiltro),
            EnviaCertificadoDeAutorizacion = true,
            EnviaContextoBccr = true,
            Monitoreable = true
        };

        var respuesta =
            await _requestHandler.GetAsync<IEnumerable<Fondo>>(apiEndpoint);
        return respuesta.Respuesta;
    }
}
``` 

This example is illustrative: preserve the signatures, endpoint options, and behavior of the existing SG in the affected module. The route and its configured name must match. MUST NOT construct environment-specific URLs in code or create alternative HTTP clients where `IRequestsHandler` is required.

### Business and Data Service (`Bccr.Supen.Ves.Mapi`)

The internal architecture is **MAPI Controller → BW → DA → SQL Server**. `Bccr.Supen.Ves.Abstracciones` contains the relevant MAPI, BW, and DA interfaces and models/DTOs. Controllers delegate business rules to BW; BW uses DA contracts; DA encapsulates data access. Maintain the existing dependency direction and use constructor injection.

- Controller: HTTP, attributes, model binding, and delegation; avoid data-access logic.
- BW: business rules and operational coordination.
- DA: access to configured databases, EF Core, and existing stored procedures.
- Reuse existing abstractions and conventions; do not add `domain/application/infrastructure` layers borrowed from unrelated templates.
- Do not introduce rich entities, DDD aggregates, factories, or new repositories unless they address an actual domain need and fit the existing design.

### Single Responsibility, SOLID, and DRY

- Assign each type a specific responsibility, especially controllers and BW/DA classes.
- Prefer composition and project-defined interfaces over direct dependencies on concrete implementations. Use constructor injection.
- Keep newly introduced interfaces small and focused; do not split existing interfaces without a functional reason.
- Extract repeated logic when it represents the same business rule and can have a single source of truth. Do not generalize superficially similar code or introduce premature abstractions.
- Use inheritance only when substitutability genuinely respects the base-class contract; prefer composition to share behavior.
- Do not move a business rule between API and MAPI. Verify which service owns it and preserve the contract between services.

> Apply the Open/Closed Principle pragmatically: prefer extensions through existing contracts, composition, strategies, or supported implementations rather than modifying multiple consumers for a behavioral variation. Do not introduce factories, domain events, or inheritance hierarchies solely to satisfy an architectural template.

> Avoid generic abstractions for DA operations merely to remove repeated lines. Extract shared components only when they represent the same rule, contract, and change lifecycle.

> **SOLID/DRY examples:** see [backend-examples.md](./backend-examples.md#solid-y-dry-srp-ocp-lsp-isp-dip-dry). These are fully preserved in the appendix and do not constitute independent rules.

## MAPI Data Access

- Reuse existing stored procedures and schemas; consult `Documentacion/SCHEMA.md` before selecting the database, schema, or procedure.
- Use parameterized SQL. For new EF stored-procedure calls/results, the recommended MAPI pattern is `FromSqlInterpolated` with interpolated parameters; never concatenate inputs to build SQL:

```csharp
var resultados = await _contexto.Set<Modelos.MiModelo>()
    .FromSqlInterpolated(
        $"EXEC [esquema].[SP_Nombre] @Parametro = {valor}")
    .ToListAsync();
``` 

- Models in `DA/Modelos/` may map stored-procedure results rather than tables. Map actual column names and follow repository and `DbContext` conventions for registering keyless models.
- Do not run LINQ queries over stored-procedure result models if the model is defined exclusively for execution using `FromSqlInterpolated`.
- Existing institutional repository helpers may appear in legacy code. For new development, prefer the safe parameterization shown above. If a change must follow a legacy pattern, review its security, document any limitation, and avoid perpetuating SQL concatenation.
- MUST NOT add EF migrations or create/change database schemas, tables, or procedures from application code. Coordinate those changes with the DBA and keep schema evolution outside the application's deployment lifecycle.
- Do not mutate data during unit tests. Use configured test doubles, InMemory contexts, or other available strategies; remember that EF InMemory does not reproduce exact SQL Server or stored-procedure behavior.
- Select/read only necessary data when the procedure and contract permit it. Do not unilaterally alter a shared stored procedure or its signature for optimization.

> Avoid N+1-equivalent patterns. If an operation needs related data, assess whether a single query, stored procedure, or coordinated retrieval can provide it while honoring DBA-owned contracts and objects.

> Before proposing indexes, execution-plan changes, or stored-procedure modifications, measure the problem and coordinate with the DBA. Backend engineers may identify the need but MUST NOT unilaterally change the schema.

> For transactional operations, test both successful commit and rollback on failure. Keep the transaction boundary in the layer already responsible for coordinating the operation; do not distribute a transaction between API and MAPI.

> **Data-access examples:** [backend-examples.md](./backend-examples.md#acceso-a-datos-sql-proyecciones-n1-transacciones).

## APIs, Contracts, and Validation

- The API exposes versioned domain routes (`api-version=1.0`) and consumes configured MAPI endpoints. MAPI also exposes versioned contracts through its existing controllers/configuration. Do not impose new REST routes on legacy actions or change casing, parameter names, or response bodies without reviewing consumers.
- Use HTTP verbs and status codes consistent with existing behavior. Preserve serialization, field names, and response shapes established by the API and BCCR packages.
- Validate at input boundaries (model binding, validators, attributes, or project-defined validation), and recheck business invariants in BW. UI validation does not replace server-side validation.
- Do not accept unvalidated identity values, permissions, file paths, SQL names, or resource limits. Use existing APIs and binding for route/parameter values, not manual SQL interpolation or unsafe URL composition.
- Do not add parallel validators or error formats when institutional middleware/packages already handle responses. Propagate or translate errors according to configured exception handling.
- When coordinating API/MAPI changes, check the endpoint configuration, HTTP method, version, parameters, DTO/JSON, authentication, and required certificates at both ends.

> Keep HTTP responses and errors consistent with existing contracts. Do not introduce new JSON wrappers, error codes, or response formats for an isolated endpoint when BCCR middleware/packages already establish the shared format.

> Validate and normalize input before executing business logic. Normalization must not silently change data semantics; prefer an explicit validation response for invalid values.

### Validation and Contract Examples

> Validate-before-processing remains a central rule, but in VES validation belongs wherever the existing architecture specifies: HTTP-boundary binding/attributes or validators, and business rules/invariants in BW.

**HTTP Input Validation**

```csharp
[HttpGet]
public async Task<IActionResult> ObtengaFondos(
    [FromQuery] int codigoEntidad,
    CancellationToken cancellationToken)
{
    if (codigoEntidad <= 0)
    {
        return BadRequest("El código de entidad debe ser mayor que cero.");
    }

    var resultado = await _fondoSG.ObtengaFondosAsync(
        codigoEntidad,
        cancellationToken);

    return Ok(resultado);
}
``` 

If the project has institutional filters, validators, or middleware for this validation, reuse them rather than duplicating validation manually.

**Business Rule in BW**

```csharp
public async Task<IReadOnlyCollection<Fondo>> ObtengaFondosAsync(
    int codigoEntidad,
    CancellationToken cancellationToken)
{
    if (!await _entidadDA.ExisteAsync(codigoEntidad, cancellationToken))
    {
        throw new EntidadNoExisteException(codigoEntidad);
    }

    return await _fondoDA.ObtengaFondosAsync(
        codigoEntidad,
        cancellationToken);
}
``` 

Do not rely solely on prior UI validation.

## Errors, Observability, and Asynchronous Operations

- Report errors explicitly. MUST NOT return empty success responses to conceal failures or broadly catch exceptions without logging, contextualizing, or correctly rethrowing them.
- MUST NOT expose stack traces, SQL, connection strings, tokens, certificates, sensitive claims, or secrets in HTTP responses or logs.
- Use exception handling, correlation IDs, and logging already configured by institutional packages. Record useful operational context (module, operation/correlation ID, and outcome) without sensitive data.
- Choose log levels/messages that support diagnosis without repeatedly logging the same error at every layer. Avoid catch/rethrow patterns that lose the stack trace (`throw ex`) or duplicate logs.
- In asynchronous code, propagate `async`/`await` and cancellation tokens when existing signatures support them. Do not block using `.Result` or `.Wait()`, or wrap I/O-bound work in `Task.Run`.
- Run independent tasks in parallel only when order does not matter and the involved services/DbContext support concurrency. Do not perform concurrent operations on the same `DbContext` instance.
- For file upload/download endpoints, preserve coordinated limits across ASP.NET Core, IIS, MAPI, and configuration. Do not increase a limit in only one layer.

> Prefer early returns when they reduce nesting and clarify validation/error paths. Do not use exceptions for normal control flow when the contract can explicitly express an expected case.

> Maintain structured logging where supported by existing infrastructure, including operation identifiers, correlation IDs, and non-sensitive contextual data. Use appropriate log levels (`Debug`, `Information`, `Warning`, `Error`) and avoid logging the same failure in each layer.

> Do not wrap an exception merely to change its message unless doing so adds useful context, classification, or semantics. Preserve the original stack trace when rethrowing the same exception.

> **Error-handling examples:** [backend-examples.md](./backend-examples.md#manejo-de-excepciones).

### Structured Logging

**Avoid**

```csharp
_logger.LogInformation(
    "Actualizando fondo " + fondo.Codigo + " de " + fondo.CodigoEntidad);
``` 

**Recommended**

```csharp
_logger.LogInformation(
    "Actualizando fondo {CodigoFondo} de entidad {CodigoEntidad}",
    fondo.Codigo,
    fondo.CodigoEntidad);
``` 

Structured logging preserves queryable fields and avoids constructing strings when the log level is disabled.

### Asynchronous Operations and Cancellation

> The `async/await` principle remains applicable. In .NET, also propagate `CancellationToken` when supported by signatures and dependencies.

**Avoid Synchronous Blocking**

```csharp
var fondos = _fondoDA.ObtengaFondosAsync(codigoEntidad).Result;
```

```csharp
_fondoDA.ObtengaFondosAsync(codigoEntidad).Wait();
```

**Recommended**

```csharp
var fondos = await _fondoDA.ObtengaFondosAsync(
    codigoEntidad,
    cancellationToken);
```

**Avoid `Task.Run` for I/O**

```csharp
var fondos = await Task.Run(
    () => _fondoDA.ObtengaFondosAsync(codigoEntidad));
``` 

EF/HTTP access is already asynchronous I/O; wrapping it in `Task.Run` adds overhead without improving scalability.

### Safe Parallelism

Independent operations may run concurrently **only** when their dependencies permit it.

```csharp
var tareaCatalogos = _catalogoSG.ObtengaAsync(cancellationToken);
var tareaParametros = _parametroSG.ObtengaAsync(cancellationToken);

await Task.WhenAll(tareaCatalogos, tareaParametros);

var catalogos = await tareaCatalogos;
var parametros = await tareaParametros;
``` 

Do not execute concurrent EF queries on the same `DbContext` instance.

## Security and Configuration

- Validate inputs and authorize each operation server-side. Do not assume the frontend has validated or authorized the user.
- Preserve `[Authorize]`, role/profile rules, and anonymous exceptions in accordance with the requirement and controller conventions. An anonymous health-check endpoint must be an intentional, narrowly scoped, documented exception.
- The API uses environment-dependent JWT authentication; the existing handler may decode claims and rely on validation previously performed by the UI or infrastructure. Decoding a JWT **does not validate** its signature, issuer, or audience. Do not change this trust boundary without reviewing authentication architecture and consumers.
- The API communicates with MAPI using mTLS in environments that require it, including Staging and Production. Preserve client-certificate transmission and configuration in those environments. Decorators that omit certificates are limited to Development. Do not extend bypasses to other environments.
- Read configuration from `IConfiguration`/options and existing environment-specific mechanisms. Do not hard-code URLs, credentials, server paths, certificates, or keys.
- `appsettings` may contain tokens substituted by the pipeline; preserve the configuration schema and use User Secrets/secure environment variables for local credentials. Never commit real secrets or include them in examples.
- Do not loosen CORS, `AllowedHosts`, anonymous access, or process privileges for convenience. Changes must match consumers and environments and undergo security review.
- Parameterize SQL and validate identifiers/addresses that cannot be parameterized. Do not disable SonarQube checks merely to silence a warning without assessing and justifying the risk.

> Validate required startup configuration when supported by the project pattern so that missing critical settings cause an early, explicit failure rather than a failure while serving requests.

> Avoid mutable global state for connections, clients, or request data. Use the dependency injection container and lifetimes (`Singleton`, `Scoped`, `Transient`) defined by ASP.NET Core and the project, paying particular attention to `DbContext` lifetime.

> Sanitize or reject inputs that may reach SQL, paths, headers, files, logs, or URLs. Use parameterization whenever supported by the platform and allow-lists for non-parameterizable identifiers.

> **Configuration, DI, and secrets examples:** [backend-examples.md](./backend-examples.md#configuración-tipada-secretos-y-ciclos-di). JWT and mTLS policies remain **V: pending verification** before changing their operational instructions.

## Testing

### Existing Frameworks by Project

| Test Project | Current Usage/Framework |
|---|---|
| API `Bccr.Supen.Ves.Api.UnitTests` | MSTest, NSubstitute, and Moq |
| API `SI.SG.Pruebas` | MSTest; test the gateway by substituting `IRequestsHandler` |
| API `API.IntegrationTests` | xUnit and `CustomApplicationFactory` |
| MAPI `DA.Pruebas`, `BW.Pruebas`, `MAPI.UnitTests` | MSTest, with Moq/NSubstitute according to layer conventions |

Do not introduce xUnit/NUnit into MSTest unit-test projects or convert existing suites. API integration tests are the current exception and use xUnit. Check each project's `.csproj` and preserve its conventions.

### Coverage, Isolation, and Execution — Consolidated Rules

- Test behavior at the appropriate layer, including success, validation, missing data, errors, and relevant boundaries, without duplicating every scenario at every layer.
- API Controller: substitute SG; SG: substitute `IRequestsHandler`; MAPI Controller: substitute BW; BW: substitute DA; DA: use available isolated infrastructure. Do not use production SQL or real BCCR connections in unit tests.
- Follow existing test-naming conventions (behavior, scenario, outcome). Use AAA where it improves clarity, with explicit assertions and mocks that do not reproduce the implementation.
- Tests must be deterministic. Use reusable test data where meaningful repetition exists. Do not suppress errors in `catch` blocks or claim success without executing/verifying tests.
- Test transactions (commit/rollback), cancellation, timeouts, and dependency failures when they form part of observable behavior.
- Use API HTTP integration tests when appropriate for the contract; do not equate EF InMemory with real SQL Server/stored procedures.
- Inspect and respect actual Quality Gate rules and per-project coverage; do not impose a universal percentage without checking the pipeline.

### Mocking by Layer

| Unit Under Test | Normally Substitute | Should Not Require |
|---|---|---|
| API Controller | SG | Real MAPI/SQL |
| SG | `IRequestsHandler`, endpoint provider | BCCR network |
| MAPI Controller | BW | Real DA/SQL |
| BW | DA and other business dependencies | Real SQL |
| DA | Isolated context/infrastructure according to the suite | Production |

Do not mock the system under test or needlessly mock simple types.

> **Testing examples:** [Controller and SG](./backend-examples.md#pruebas-de-controller-con-moq-y-sg) and [exceptions](./backend-examples.md#pruebas-de-excepciones). The MAPI guide maintains distinct DA/BW/Controller examples. Also see [AAA](./backend-examples.md#patrón-aaa-y-nombres-de-pruebas) and [anti-patterns](./backend-examples.md#anti-patrones-de-pruebas).

### Reusable Test Data

When multiple tests need complex objects, use a test builder/factory if the suite already supports it.

```csharp
internal static class FondoTestData
{
    public static Fondo CreeFondoValido(
        int codigo = 1,
        int codigoEntidad = 10)
    {
        return new Fondo
        {
            Codigo = codigo,
            CodigoEntidad = codigoEntidad,
            Nombre = "Fondo de prueba"
        };
    }
}
``` 

This avoids repeated magic values and makes the intent of test data explicit.

### Transactional Tests

When DA includes a meaningful transactional operation, cover:

- commit when all operations succeed;
- rollback when an operation fails;
- exception propagation;
- absence of partial side effects.

Do not use a production database or real BCCR infrastructure in a unit test.

### Asynchrony, Cancellation, and Timeout Tests

When a method supports cancellation:

```csharp
[TestMethod]
public async Task ObtengaFondosAsync_SolicitudCancelada_PropagaCancelacion()
{
    using var cts = new CancellationTokenSource();
    cts.Cancel();

    var fondoDA = Substitute.For<IFondoDA>();
    fondoDA
        .ObtengaFondosAsync(
            Arg.Any<int>(),
            Arg.Any<CancellationToken>())
        .Returns<Task<IReadOnlyCollection<Fondo>>>(
            _ => throw new OperationCanceledException());

    var sut = new FondoBW(fondoDA);

    await Assert.ThrowsExceptionAsync<OperationCanceledException>(
        () => sut.ObtengaFondosAsync(10, cts.Token));
}
``` 

Do not add artificial concurrency tests when the functionality has no concurrent behavior.

## Performance and Reliability

- Measure query and operation performance before optimizing. Respect configured request limits, timeouts, and contracts.
- Avoid repeated queries and unnecessary data loading; coordinate any stored-procedure optimization with the DBA.
- Use asynchronous EF/HTTP operations for I/O. Do not introduce `Task.Run` merely to make code appear asynchronous.
- Use existing timeouts for HTTP calls and external dependencies. Retry only identified transient failures, with bounded attempts, idempotency, and policies compatible with project packages.
- Preserve correlation IDs and traceability across API → MAPI.
- Do not cache authorization, identity, or data that must immediately reflect changes without an explicit expiration and invalidation decision.

> Prefer queries that retrieve only required columns and rows, avoiding full collection materialization when the contract supports filtering, pagination, or database-side projections.

> Review repeated cross-layer queries and redundant HTTP calls. Do not introduce parallelism by default; use it only for independent operations, with concurrency limits, and without sharing a `DbContext` across concurrent operations.

> Retry only known transient errors. Every retry policy must be bounded, have timeouts and traceability, and account for idempotency to prevent duplicate operations.

> **Performance examples:** [backend-examples.md](./backend-examples.md#rendimiento-paginación-y-reintentos).

## Workflow

- Read the affected layer's `README.md`, `AGENT.md`, SPEC, and guides first.
- Make the smallest change that preserves existing contracts and conventions.
- If a feature spans API and MAPI, verify both sides of the contract; if it affects SQL/schema, coordinate with the DBA.
- Run the build and tests for the modified project; for cross-service interface changes, include relevant integration coverage.
- Review build diagnostics, test results, and Quality Gate findings. Do not introduce unrelated fixes or incidental package upgrades.
- Follow branch, review, and deployment procedures documented by each repository. This guide does not prescribe AWS Lambda, Serverless Framework, npm scripts, or Prisma migrations for .NET backends.

> Make functional changes in small, focused branches when permitted by repository Git workflows. Use descriptive commits and obtain review before merging.

> Before committing or opening a Pull Request, run at least the build and relevant tests for the modified project, and review new warnings, static analysis, and Quality Gate findings. Compilation alone does not prove a change is valid.

> Update or create tests whenever existing behavior changes. TDD may be used when valuable, but it is not universally mandatory in VES.

> Do not include unrelated formatting changes, package upgrades, broad refactors, or fixes outside the branch's purpose unless necessary to safely complete the requested change.

### Recommendations from the Previous Document That Do NOT Apply Literally

> The following must not become VES requirements.

- Do not require DDD, aggregates, Value Objects, factories, or Domain Events by default. VES must retain **API Controller → SI.SG → IRequestsHandler → MAPI** and **MAPI Controller → BW → DA → SQL Server**.
- Do not impose English naming for identifiers, messages, or commits where the VES repository and institutional contracts use Spanish.

## Quick Checklist for New Code

> Checklist for human or agent-assisted review.

Before considering a backend change complete:

- [ ] The change follows API → SG → MAPI or MAPI → BW → DA, as applicable.
- [ ] No unnecessary DDD layers/patterns were introduced.
- [ ] Class, interface, method, variable, and field names follow C# and module conventions.
- [ ] No unnecessary `dynamic`, `object`, `null!`, or casts are used to circumvent typing.
- [ ] No magic numbers/strings represent stable rules without appropriate explanation or extraction.
- [ ] Dependencies are received through DI rather than constructed with `new` inside BW/SG where a contract exists.
- [ ] Controllers contain no SQL or business rules belonging to BW.
- [ ] BW contains no direct SQL access.
- [ ] DA uses parameterized SQL and respects DBA-owned objects.
- [ ] No EF migrations were added.
- [ ] Inputs are validated server-side.
- [ ] No secrets or sensitive data are exposed in logs/responses.
- [ ] Logging is structured and does not duplicate the same error across layers.
- [ ] No `.Result`, `.Wait()`, or `Task.Run` for I/O.
- [ ] `CancellationToken` is propagated wherever supported by the contract.
- [ ] No concurrency occurs on the same `DbContext`.
- [ ] Queries retrieve only necessary data when contracts allow it.
- [ ] N+1 risks have been reviewed.
- [ ] Tests cover useful behavior: success, errors, and relevant boundaries.
- [ ] Mocks are placed at the correct system-under-test boundary.
- [ ] Unit tests do not depend on the BCCR network, production certificates, or production SQL.
- [ ] Relevant build and tests pass.
- [ ] Warnings and Quality Gate have been reviewed.
- [ ] No unrelated incidental changes were included.

## Specialized References (Avoid Duplication)

- [API Specification](../VES/Bccr.Supen.Ves.Api/SPEC.md): documented modules, contracts, configuration, and security.
- [New API Endpoint Guide](../VES/Bccr.Supen.Ves.Api/Documentacion/ComoCrearUnNuevoEndpoint.md): DTO → SG → controller → configuration → DI → tests.
- [API Deployment](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md): service-specific operations, with security items still requiring verification.
- [MAPI Implementation](../VES/Bccr.Supen.Ves.Mapi/Documentacion/ComoImplementarUnMAPI.md): DA → BW → controller and layer-specific tests.
- [MAPI Schemas and Procedures](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md): inventory and DBA contracts; does not authorize SQL changes.
- [MAPI Environment Verification](../VES/Bccr.Supen.Ves.Mapi/Documentacion/VerificacionEntorno.md): post-deployment health checks that may perform temporary writes.
- [Examples](./backend-examples.md): extended examples preserved outside the primary standard.
- [Pending V Verifications](./VERIFICACIONES_PENDIENTES.md): explicitly unresolved discrepancies.
- [Legacy Context](./historical/legacy-backend-reference.md) and [Phase 1](./historical/FASE1_COMPLETION_REPORT.md): historical materials, not operational instructions.
