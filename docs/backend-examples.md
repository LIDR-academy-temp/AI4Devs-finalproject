# VES Backend Standards Examples — Preserved Appendix

This appendix preserves, **without semantic modifications**, the examples extracted from the normative standards document to reduce its length. They are illustrative examples from the original document, not evidence of successful compilation or authorization to execute changes.

> **IMPORTANT:** The snippets have not been verified against current source code or dependency versions. In case of discrepancies, verified contracts and configuration, together with the change approval process, take precedence. Items marked V remain pending verification.

**Source:** `originales_sin_modificar/backend-standards(1).md`, preserved in the package.

## C# Conventions and Naming Examples
Original source: lines 90–661.

## C# Coding and Naming Conventions

### Convention Mapping: Document 1 → VES/.NET

> Document 1 defines specific conventions for variables, functions, classes,
> interfaces, constants, types, and files. All are preserved here as normative
> intent, adapted to idiomatic C#/.NET conventions and the existing VES codebase.

| Element | Convention in Document 1 | VES/.NET Equivalent | VES Example |
|---|---|---|---|
| Local variables | `camelCase` | `camelCase` | `codigoEntidad` |
| Parameters | `camelCase` | `camelCase` | `codigoFondo` |
| Functions | `camelCase` | C# methods in `PascalCase` | `ObtengaFondoAsync` |
| Public methods | implicitly `camelCase` in TS | `PascalCase` | `ActualiceRentabilidadAsync` |
| Private methods | implicitly `camelCase` in TS | `PascalCase` per .NET/project conventions | `ValideSolicitud` |
| Classes | `PascalCase` | `PascalCase` | `FondoBW` |
| Interfaces | `PascalCase` | `I` + `PascalCase` | `IFondoDA` |
| Types | `PascalCase` | `PascalCase` | `FondoSolicitud` |
| Constants | `UPPER_SNAKE_CASE` | `PascalCase` for `const`/`static readonly`, unless local conventions differ | `CantidadMaximaResultados` |
| Files | `camelCase` | `PascalCase`, normally matching the primary type, according to repository C# style | `FondoBW.cs` |
| Public properties | not specified | `PascalCase` | `CodigoEntidad` |
| Private fields | not specified | `_camelCase` | `_fondoDA` |
| Boolean names | not specified | affirmative/descriptive names | `tieneAutorizacion` |
| Asynchronous methods | `async`/Promise | `Async` suffix when used by project convention | `ObtengaFondosAsync` |

The “VES/.NET Equivalent” column defines the rules for changes to VES. The Document 1 column is retained to show the origin of each practice and to avoid mechanically applying TypeScript-specific conventions to C#.

### File Naming Conventions

> The document requires consistent filenames (`candidateService.ts`,
> `candidateController.ts`). In C#, the same principle follows ecosystem and
> repository conventions: a filename should reflect its primary declared type.

**Avoid**
```text
fondo_bw.cs
fondobw.cs
fondoService.cs
archivo1.cs
```
**Recommended**
```text
FondoBW.cs
IFondoBW.cs
FondoDA.cs
IFondoDA.cs
FondoController.cs
FondoSolicitud.cs
```
When an existing file does not follow this convention, MUST NOT rename it as an incidental change. Apply the rule primarily to new files or refactorings that explicitly include renaming.

### Language for Identifiers, Comments, Errors, and Logs

> VES primarily uses Spanish in its domain code, contracts, and documentation.
> Therefore, **the “English-only” rule is not applied literally**; its actual
> intent is preserved: using one consistent, understandable language within the project.

VES rules:

- Preserve the language of the existing module and contract.
- Prefer Spanish for new domain identifiers when the module already uses Spanish.
- Do not mix English and Spanish for the same concept without a technical reason.
- Preserve established technical terms (`Controller`, `DTO`, `Async`, `Request`,
  `Response`, `DbContext`, etc.) when they are part of the framework or existing code.
- Error messages and logs must be descriptive, consistent, and useful for troubleshooting.
- Do not translate existing public names if doing so would break contracts,
  serialization, consumers, or historical consistency.

**Avoid**
```csharp
var candidate = await _fondoDA.GetFondosAsync(codigoEntidad);

_logger.LogError(
    "Failed actualizando el fondo {CodigoFondo}",
    codigoFondo);
```
**Recommended**
```csharp
var fondos = await _fondoDA.ObtengaFondosAsync(codigoEntidad);

_logger.LogError(
    "No fue posible actualizar el fondo {CodigoFondo}",
    codigoFondo);
```
If an external integration requires English names or messages, comply with that external contract at the integration boundary without unnecessarily changing internal terminology.

### Type and Signature Conventions

> In C#, this guidance means using nullability annotations, concrete types,
> explicit DTOs/contracts, and avoiding `dynamic` or `object` as a workaround
> for the type system.

**Avoid**
```csharp
public object Procese(dynamic datos)
{
    return datos;
}
```
**Recommended**
```csharp
public async Task<FondoResultado> ProceseAsync(
    FondoSolicitud solicitud,
    CancellationToken cancellationToken)
{
    // ...
}
```
For complex inputs, prefer existing contracts/DTOs in `Bccr.Supen.Ves.Abstracciones` over dictionaries, anonymous objects, or untyped structures.

### Method Naming Conventions

Rules:

- Use a verb or a business-intent name.
- Use `PascalCase`.
- Add the `Async` suffix for asynchronous methods where applicable.
- Avoid introducing new abbreviations.
- Avoid generic names (`Process`, `Execute`, `Do`, `Handle`) when a more precise domain name exists.
- Use `camelCase` parameters.
- Return an explicit type consistent with the contract.
- A method must not combine Controller, BW, and DA responsibilities.

**Avoid**
```csharp
public async Task<object> Process(int x, object data)
```
**Recommended**
```csharp
public async Task<RentabilidadResultado> RegistreRentabilidadAsync(
    RentabilidadSolicitud solicitud,
    CancellationToken cancellationToken)
```
### Constant Naming Conventions

**Document 1**
```text
MAX_CANDIDATES_PER_PAGE
```
**VES Equivalent**
```csharp
private const int CantidadMaximaResultadosPorPagina = 100;
```
For objects or values computed at runtime:
```csharp
private static readonly TimeSpan TiempoEsperaPredeterminado =
    TimeSpan.FromSeconds(30);
```
Do not use constants for values that must vary by environment:
```csharp
// Evitar
private const string UrlMapi =
    "https://servidor-produccion/api";
```
Those values must come from configuration.

### Primary Rule: Consistency with the VES Codebase

Before creating or renaming an identifier:

1. Inspect neighboring files in the same layer.
2. Preserve existing domain language and terminology.
3. Do not rename public contracts merely to satisfy a generic convention.
4. Prefer names that convey business intent rather than implementation details.
5. Avoid new abbreviations unless they are already part of the project vocabulary (`SG`, `BW`, `DA`, `DTO`, etc.).

### Classes, Interfaces, Records, Enums, and DTOs

| Element | VES/.NET Convention | Example |
|---|---|---|
| Class | `PascalCase` | `FondoBW` |
| Interface | `I` + `PascalCase` | `IFondoDA` |
| Record / DTO | `PascalCase` | `FondoSolicitud` |
| Enum | `PascalCase` | `EstadoSolicitud` |
| Enum member | `PascalCase` | `Pendiente` |
| Public method | `PascalCase` | `ObtengaLosFondosAsync` |
| Public property | `PascalCase` | `CodigoEntidad` |
| Namespace | `PascalCase` according to project convention | `Bccr.Supen.Ves.Abstracciones` |

**Avoid**
```csharp
public class fondo_bw
{
    public int codigo_entidad { get; set; }
}
```
**Recommended**
```csharp
public sealed class FondoBW : IFondoBW
{
    public int CodigoEntidad { get; init; }
}
```
### Local Variables and Parameters

Use `camelCase` and descriptive names.

**Avoid**
```csharp
var x = await _fondoDA.ObtengaAsync(id);
var tmp = x.FirstOrDefault();
```
**Recommended**
```csharp
var fondos = await _fondoDA.ObtengaAsync(codigoEntidad);
var primerFondo = fondos.FirstOrDefault();
```
For Boolean values, use names that read naturally as a business statement or question. Preserve the pattern already used by the module (`es`, `tiene`, `debe`, `puede`, `seAplica`, etc.).
```csharp
bool seAplicaElFiltro;
bool tieneAutorizacion;
bool debeEnviarCertificado;
```
Do not use Hungarian notation or encode the type into the name:
```csharp
// Evitar
string strNombre;
int intCodigoEntidad;

// Recomendado
string nombre;
int codigoEntidad;
```
### Private Fields and Dependency Injection

Use `_camelCase` for private fields, especially injected dependencies. Dependencies that do not change after object construction should be `readonly`.
```csharp
public sealed class FondoBW : IFondoBW
{
    private readonly IFondoDA _fondoDA;
    private readonly ILogger<FondoBW> _logger;

    public FondoBW(
        IFondoDA fondoDA,
        ILogger<FondoBW> logger)
    {
        _fondoDA = fondoDA;
        _logger = logger;
    }
}
```
**Avoid**
```csharp
public sealed class FondoBW
{
    private FondoDA fondoDA = new FondoDA();
}
```
The second form couples business logic to a concrete implementation, making testing and dependency substitution more difficult.

### Constants and Immutable Values

**Avoid magic numbers or strings**
```csharp
if (cantidad > 1000)
{
    // ...
}
```
**Recommended**
```csharp
private const int CantidadMaximaResultados = 1000;

if (cantidad > CantidadMaximaResultados)
{
    // ...
}
```
Use `const` only for values known at compile time:
```csharp
private const int CantidadMaximaIntentos = 3;
```
Use `static readonly` when a value is determined at runtime or is an object:
```csharp
private static readonly TimeSpan TiempoEsperaPredeterminado =
    TimeSpan.FromSeconds(30);
```
Do not turn environment configuration into constants. URLs, configurable timeouts, certificates, operational limits, and credentials must come from institutional configuration.

### Methods and Functions

Names must express a clear action or intent. Avoid generic names such as `Process`, `Handle`, `Execute`, or `DoWork` when a more precise domain action exists.

**Avoid**
```csharp
public async Task<List<Fondo>> Process(int id)
```
**Recommended**
```csharp
public async Task<IReadOnlyCollection<Fondo>> ObtengaLosFondosAsync(
    int codigoEntidad,
    CancellationToken cancellationToken)
```
For asynchronous operations returning `Task`/`Task<T>`, preserve the `Async` suffix when it is an existing project convention.

A method should maintain a consistent level of abstraction. If it simultaneously performs HTTP validation, applies business rules, and executes SQL, it is likely mixing responsibilities belonging to Controller, BW, and DA.

### Return Types and Collections

Prefer the most specific contract that expresses the intent:
```csharp
Task<Fondo?> ObtengaFondoAsync(...);
Task<IReadOnlyCollection<Fondo>> ObtengaFondosAsync(...);
```
Avoid exposing a mutable collection when the consumer only needs read access:
```csharp
// Evitar cuando no se necesita mutabilidad
Task<List<Fondo>> ObtengaFondosAsync(...);

// Preferible para contrato de solo lectura
Task<IReadOnlyCollection<Fondo>> ObtengaFondosAsync(...);
```
Do not change existing public signatures solely because of this recommendation; it primarily applies to new code.

### `var` and Explicit Types

Use `var` when the type is clear from the right-hand side and improves readability:
```csharp
var configuracion = _proveedorApiEndpoints
    .ObtengaLaConfiguracion("ObtengaLosFondosAsync");
```
Prefer an explicit type when it provides relevant context:
```csharp
IReadOnlyCollection<Fondo> fondos =
    await _fondoDA.ObtengaFondosAsync(codigoEntidad);
```
Avoid using `var` to conceal important contract types or when it makes the code harder to understand.

### Nullability and Type Safety

Preserve nullable reference types and represent null values explicitly.

**Avoid**
```csharp
public object Obtenga(int id)
{
    // ...
}
```
**Recommended**
```csharp
public async Task<Fondo?> ObtengaFondoAsync(
    int codigoFondo,
    CancellationToken cancellationToken)
{
    // ...
}
```
Do not use `null!`, unsafe casts, or `dynamic` merely to suppress warnings without addressing their underlying causes.

### Parameters

Avoid long primitive parameter lists when they represent a single input concept and the project already uses DTOs at that boundary.

**Avoid**
```csharp
public Task ActualiceAsync(
    int entidad,
    int fondo,
    int regimen,
    DateTime fecha,
    decimal valor,
    string tipo)
```
**Recommended when justified by the contract**
```csharp
public Task ActualiceAsync(
    ActualizacionRentabilidad solicitud,
    CancellationToken cancellationToken)
```
Do not create a new DTO solely to wrap one or two parameters unless doing so improves the contract.

### Conditional Expressions and Early Returns

Reduce nesting through validation and early returns when they improve clarity.

**Avoid**
```csharp
if (solicitud is not null)
{
    if (solicitud.CodigoEntidad > 0)
    {
        return await _servicio.ProceseAsync(solicitud);
    }
}

throw new ArgumentException("Solicitud inválida.");
```
**Recommended**
```csharp
ArgumentNullException.ThrowIfNull(solicitud);

if (solicitud.CodigoEntidad <= 0)
{
    throw new ArgumentException(
        "El código de entidad debe ser mayor que cero.",
        nameof(solicitud));
}

return await _servicio.ProceseAsync(solicitud);
```
Use existing institutional validation mechanisms and exceptions if the module provides them.

### Comments and Documentation

Comments should explain **why**, constraints, decisions, or non-obvious behavior; they should not repeat the code.

**Avoid**
```csharp
// Incrementa contador
contador++;
```
**Recommended**
```csharp
// El MAPI legacy requiere numeración basada en 1 para esta secuencia.
contador++;
```
Maintain XML documentation on public contracts only where the project already uses it or where it adds real value. Do not generate repetitive documentation automatically.

### Formatting and Readability

- One primary responsibility per type.
- Avoid lengthy methods with many levels of nesting.
- Avoid very large regions that conceal a class with too many responsibilities.
- Maintain `using` directives and their order/format according to `.editorconfig` or project style.
- Do not introduce mass reformatting as part of a functional change.
- Avoid commented-out code; Git retains history.
- Avoid introducing new compiler or static analyzer warnings.

### Naming Checklist

Before adding new code, verify:

- [ ] Local variables and parameters use `camelCase`.
- [ ] Classes, DTOs, enums, properties, and methods use `PascalCase`.
- [ ] Interfaces use the `I` prefix and `PascalCase`.
- [ ] Private fields use `_camelCase`.
- [ ] Injected dependencies are private and `readonly` where appropriate.
- [ ] Constants and `static readonly` fields have descriptive names; no magic numbers.
- [ ] `.cs` filenames follow the main type and module conventions.
- [ ] Asynchronous methods use `Async` according to existing conventions.
- [ ] Boolean names are affirmative/descriptive.
- [ ] No Hungarian prefixes (`strNombre`, `intCodigo`, etc.).
- [ ] No unnecessary new abbreviations.
- [ ] No `dynamic`, `object`, or `null!` used to hide type problems.
- [ ] Messages and logs use language consistent with VES and provide sufficient context.
- [ ] Public contracts have not been renamed solely for style.

## SOLID and DRY (SRP, OCP, LSP, ISP, DIP, DRY)
Original source: lines 769–1015.

### SOLID and DRY Examples Applied to VES

#### SRP — Single Responsibility Principle

**Avoid: Controller containing business validation and data access**
```csharp
[HttpGet]
public async Task<IActionResult> ObtengaFondos(int codigoEntidad)
{
    if (codigoEntidad <= 0)
    {
        return BadRequest();
    }

    await using var contexto = new VesDbContext();
    var fondos = await contexto.Fondos
        .Where(x => x.CodigoEntidad == codigoEntidad)
        .ToListAsync();

    return Ok(fondos);
}
```
**Recommended: each layer retains its own responsibility**
```csharp
[HttpGet]
public async Task<IActionResult> ObtengaFondos(
    int codigoEntidad,
    CancellationToken cancellationToken)
{
    var fondos = await _fondoBW.ObtengaFondosAsync(
        codigoEntidad,
        cancellationToken);

    return Ok(fondos);
}
```
 
```csharp
public sealed class FondoBW : IFondoBW
{
    private readonly IFondoDA _fondoDA;

    public FondoBW(IFondoDA fondoDA)
    {
        _fondoDA = fondoDA;
    }

    public Task<IReadOnlyCollection<Fondo>> ObtengaFondosAsync(
        int codigoEntidad,
        CancellationToken cancellationToken)
    {
        if (codigoEntidad <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(codigoEntidad));
        }

        return _fondoDA.ObtengaFondosAsync(
            codigoEntidad,
            cancellationToken);
    }
}
```
The Controller handles HTTP; BW applies business rules; DA encapsulates SQL/EF access.

#### OCP — Open/Closed Principle

Do not interpret OCP as a mandate to introduce inheritance. In VES, extension through contracts and composition is generally preferable.

**Avoid**
```csharp
public sealed class Notificador
{
    public Task EnvieAsync(string tipo, string mensaje)
    {
        if (tipo == "correo")
        {
            // ...
        }
        else if (tipo == "sms")
        {
            // ...
        }

        return Task.CompletedTask;
    }
}
```
**Recommended when behavioral variants genuinely exist**
```csharp
public interface INotificador
{
    Task EnvieAsync(
        string mensaje,
        CancellationToken cancellationToken);
}
```
 
```csharp
public sealed class NotificadorCorreo : INotificador
{
    public Task EnvieAsync(
        string mensaje,
        CancellationToken cancellationToken)
    {
        // Implementación correspondiente.
        return Task.CompletedTask;
    }
}
```
Introduce this abstraction only if the domain genuinely requires variants; do not create speculative strategies.

#### LSP — Liskov Substitution Principle

An interface implementation must honor its contract and must not surprise consumers.

**Avoid**
```csharp
public sealed class FondoDA : IFondoDA
{
    public Task<IReadOnlyCollection<Fondo>> ObtengaFondosAsync(
        int codigoEntidad,
        CancellationToken cancellationToken)
    {
        throw new NotSupportedException();
    }
}
```
If an implementation cannot satisfy the contract, the abstraction probably does not correctly represent that implementation.

**Recommendation:** prefer composition and small contracts; use inheritance only when substitutability holds.

#### ISP — Interface Segregation Principle

**Avoid an interface that requires implementing unrelated operations**
```csharp
public interface IFondoOperaciones
{
    Task<IReadOnlyCollection<Fondo>> ObtengaAsync();
    Task ActualiceAsync(Fondo fondo);
    Task EnvieCorreoAsync(Fondo fondo);
    Task GenereReporteAsync(Fondo fondo);
}
```
**Recommended**
```csharp
public interface IFondoDA
{
    Task<IReadOnlyCollection<Fondo>> ObtengaAsync(
        CancellationToken cancellationToken);

    Task ActualiceAsync(
        Fondo fondo,
        CancellationToken cancellationToken);
}
```
Email or reporting services belong in separate contracts if they genuinely represent distinct responsibilities.

#### DIP — Dependency Inversion Principle

**Avoid**
```csharp
public sealed class FondoBW
{
    private readonly FondoDA _fondoDA = new();
}
```
**Recommended**
```csharp
public sealed class FondoBW : IFondoBW
{
    private readonly IFondoDA _fondoDA;

    public FondoBW(IFondoDA fondoDA)
    {
        _fondoDA = fondoDA;
    }
}
```
BW depends on the `IFondoDA` contract, not on its concrete implementation.

#### DRY — Don't Repeat Yourself

**Avoid duplicating the same business rule**
```csharp
public void Cree(Fondo fondo)
{
    if (fondo.CodigoEntidad <= 0)
    {
        throw new ArgumentException("Entidad inválida.");
    }

    // ...
}

public void Actualice(Fondo fondo)
{
    if (fondo.CodigoEntidad <= 0)
    {
        throw new ArgumentException("Entidad inválida.");
    }

    // ...
}
```
**Recommended when it is the same rule**
```csharp
private static void ValideEntidad(Fondo fondo)
{
    if (fondo.CodigoEntidad <= 0)
    {
        throw new ArgumentException("Entidad inválida.");
    }
}
```
DRY does not mean creating generic helpers for every textual similarity. Two similar code blocks can represent different rules with different change lifecycles.

## Data Access, SQL, Projections, N+1, and Transactions
Original source: lines 1067–1184.

### Secure and Efficient Data Access Examples

> Guidance on retrieving only required data, avoiding N+1 queries,
> parameterizing queries, and testing transactions is retained and adapted
> to EF Core 8, SQL Server, and DBA-managed stored procedures.

#### Parameterized SQL

**Avoid**
```csharp
var sql =
    $"EXEC [INADM].[ObtengaFondo] @Entidad = '{codigoEntidad}'";

var resultado = await _contexto.Set<FondoResultado>()
    .FromSqlRaw(sql)
    .ToListAsync();
```
**Recommended**
```csharp
var resultado = await _contexto.Set<FondoResultado>()
    .FromSqlInterpolated(
        $"EXEC [INADM].[ObtengaFondo] @Entidad = {codigoEntidad}")
    .ToListAsync(cancellationToken);
```
`FromSqlInterpolated` converts interpolated values into parameters; do not confuse this with manually constructing a SQL string.

#### Data Projection

When querying a real EF entity and the contract permits it, select only the required fields.
```csharp
var fondos = await _contexto.Fondos
    .AsNoTracking()
    .Where(fondo => fondo.CodigoEntidad == codigoEntidad)
    .Select(fondo => new FondoResumen
    {
        Codigo = fondo.Codigo,
        Nombre = fondo.Nombre
    })
    .ToListAsync(cancellationToken);
```
Do not mechanically apply this pattern to models used solely to map stored procedure results.

#### Avoid N+1 Queries

**Avoid**
```csharp
var entidades = await _contexto.Entidades
    .AsNoTracking()
    .ToListAsync(cancellationToken);

foreach (var entidad in entidades)
{
    entidad.Fondos = await _contexto.Fondos
        .Where(fondo => fondo.CodigoEntidad == entidad.Codigo)
        .ToListAsync(cancellationToken);
}
```
**Prefer**, if the EF model and contract support it, a coordinated query using projection, navigation properties, `Include`, or an appropriate stored procedure. The specific solution must follow the actual MAPI model and may require DBA coordination.

#### `AsNoTracking`

For read-only EF entity queries, consider `AsNoTracking()` when the object will not be updated within the same unit of work.
```csharp
var fondo = await _contexto.Fondos
    .AsNoTracking()
    .SingleOrDefaultAsync(
        x => x.Codigo == codigoFondo,
        cancellationToken);
```
Do not use it if the workflow depends on change tracking for a subsequent update.

#### Transactions

Use an explicit transaction only when the operation coordinates changes that must commit or roll back as one unit and the project's data access pattern requires it.
```csharp
await using var transaccion =
    await _contexto.Database.BeginTransactionAsync(cancellationToken);

try
{
    // Cambios relacionados.
    await _contexto.SaveChangesAsync(cancellationToken);

    await transaccion.CommitAsync(cancellationToken);
}
catch
{
    await transaccion.RollbackAsync(cancellationToken);
    throw;
}
```
Do not open a manual transaction around every `SaveChangesAsync`; EF Core already manages a transaction for a single save operation when supported by the provider.

## Exception Handling
Original source: lines 1310–1367.

### Error Handling Examples

> Guidance on descriptive errors, natural exception propagation, and centralized
> handling is retained and adapted to existing ASP.NET Core middleware,
> exceptions, and BCCR packages.

**Avoid losing the stack trace**
```csharp
try
{
    await _servicio.ProceseAsync();
}
catch (Exception ex)
{
    throw ex; // Evitar
}
```
**Recommended when the exception only needs to be rethrown**
```csharp
try
{
    await _servicio.ProceseAsync();
}
catch
{
    throw;
}
```
Better yet, do not add `try/catch` unless it adds context, compensation, classification, or a concrete action.

**Add context without exposing secrets**
```csharp
try
{
    await _fondoDA.ActualiceAsync(fondo, cancellationToken);
}
catch (SqlException ex)
{
    _logger.LogError(
        ex,
        "Error actualizando fondo {CodigoFondo} para entidad {CodigoEntidad}",
        fondo.Codigo,
        fondo.CodigoEntidad);

    throw;
}
```
Do not log connection strings, tokens, certificates, sensitive data, or full SQL statements containing confidential values.

## Strongly Typed Configuration, Secrets, and DI Lifetimes
Original source: lines 1487–1552.

### Security and Configuration Examples

> Recommendations against committing secrets, for external configuration,
> input validation, and avoiding global state are retained, using
> `IConfiguration`, Options, DI, and institutional mechanisms.

#### Strongly Typed Configuration

Where the project already uses Options, prefer strongly typed configuration over scattered string keys:
```csharp
public sealed class MapiOptions
{
    public const string SectionName = "Mapi";

    public required string BaseUrl { get; init; }
    public int TimeoutSegundos { get; init; }
}
```
 
```csharp
builder.Services
    .AddOptions<MapiOptions>()
    .Bind(builder.Configuration.GetSection(MapiOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
```
Do not introduce Options if the project uses another institutional configuration mechanism; the principle is to centralize and validate configuration, not replace the infrastructure.

#### Secrets

**Never**
```json
{
  "ConnectionStrings": {
    "Ves": "Server=servidor;User Id=usuario;Password=clave-real;"
  }
}
```
in a version-controlled file containing real credentials.

Use the substitution mechanisms defined by the project's pipeline, User Secrets, or existing secure environment variables.

#### DI Lifetimes

Do not register a `DbContext` or a context-dependent component as a `Singleton`.
```csharp
// Evitar
services.AddSingleton<VesDbContext>();
```
Follow existing EF Core registrations and lifetimes. Before changing `Singleton`, `Scoped`, or `Transient`, inspect transitive dependencies and concurrent usage.

## Controller Tests with Moq and SG
Original source: lines 1698–1780.

### Controller Test Example Using Moq
```csharp
[TestMethod]
public async Task ObtengaFondos_EntidadValida_RetornaOk()
{
    // Arrange
    var fondoSG = new Mock<IFondoSG>();
    fondoSG
        .Setup(x => x.ObtengaFondosAsync(
            10,
            It.IsAny<CancellationToken>()))
        .ReturnsAsync(new[]
        {
            new Fondo { Codigo = 1, Nombre = "ROP" }
        });

    var controller = new FondoController(fondoSG.Object);

    // Act
    var resultado = await controller.ObtengaFondos(
        10,
        CancellationToken.None);

    // Assert
    Assert.IsInstanceOfType(resultado, typeof(OkObjectResult));

    fondoSG.Verify(
        x => x.ObtengaFondosAsync(
            10,
            It.IsAny<CancellationToken>()),
        Times.Once);
}
```
Adapt the constructor, names, and types to the actual controller. Do not add Moq to a test suite already standardized exclusively on NSubstitute without justification.

### SG Test Example

The equivalent of “mock the repository in service tests” from the earlier document is to substitute `IRequestsHandler` when testing an SG.
```csharp
[TestMethod]
public async Task ObtengaFondosAsync_ConfiguracionValida_InvocaRequestHandler()
{
    // Arrange
    var proveedor = Substitute.For<IProveedorApiEndpoints>();
    proveedor
        .ObtengaLaConfiguracion("ObtengaFondosAsync")
        .Returns(new ConfiguracionApiEndpoint
        {
            Ruta = "api/fondos/{0}"
        });

    var requestHandler = Substitute.For<IRequestsHandler>();
    requestHandler
        .GetAsync<IEnumerable<Fondo>>(Arg.Any<ApiEndpoint>())
        .Returns(new RespuestaApi<IEnumerable<Fondo>>
        {
            Respuesta = new[] { new Fondo() }
        });

    var sut = new FondoSG(proveedor, requestHandler);

    // Act
    var resultado = await sut.ObtengaFondosAsync(10);

    // Assert
    Assert.IsNotNull(resultado);

    await requestHandler
        .Received(1)
        .GetAsync<IEnumerable<Fondo>>(
            Arg.Is<ApiEndpoint>(endpoint =>
                endpoint.Ruta.Contains("10")));
}
```
The exact response and configuration types must match those actually present in the project; the example illustrates the pattern and does not authorize inventing contracts.

## Exception Tests
Original source: lines 1797–1830.

### Exception Tests

**MSTest**
```csharp
[TestMethod]
public async Task ObtengaFondosAsync_EntidadInvalida_LanzaExcepcion()
{
    var fondoDA = Substitute.For<IFondoDA>();
    var sut = new FondoBW(fondoDA);

    await Assert.ThrowsExceptionAsync<ArgumentOutOfRangeException>(
        () => sut.ObtengaFondosAsync(
            0,
            CancellationToken.None));
}
```
Do not use:
```csharp
try
{
    await sut.ObtengaFondosAsync(0, CancellationToken.None);
}
catch
{
    Assert.IsTrue(true);
}
```
That pattern can report a passing test without demonstrating which exception occurred or whether the method failed for the expected reason.

## AAA Pattern and Test Naming
Original source: lines 1623–1685.

### Test Writing Pattern

> The previous document defines behavior-oriented test names, the AAA pattern,
> mocks per layer, realistic test data, and coverage of happy paths, error paths,
> and edge cases. These practices are retained using MSTest/xUnit and
> Moq/NSubstitute according to each project.

#### Naming Conventions

Use names indicating **method + scenario + expected outcome**, following the project's language and naming style.

Examples:
```text
ObtengaFondosAsync_EntidadValida_RetornaFondos
ObtengaFondosAsync_EntidadInexistente_LanzaExcepcion
ActualiceAsync_DADevuelveError_PropagaExcepcion
```
Do not impose Jest-style `snake_case` or rename existing test suites.

#### AAA Pattern
```csharp
[TestMethod]
public async Task ObtengaFondosAsync_EntidadValida_RetornaFondos()
{
    // Arrange
    var fondoEsperado = new Fondo
    {
        Codigo = 1,
        Nombre = "ROP"
    };

    var fondoDA = Substitute.For<IFondoDA>();
    fondoDA
        .ObtengaFondosAsync(
            10,
            Arg.Any<CancellationToken>())
        .Returns(new[] { fondoEsperado });

    var sut = new FondoBW(fondoDA);

    // Act
    var resultado = await sut.ObtengaFondosAsync(
        10,
        CancellationToken.None);

    // Assert
    Assert.AreEqual(1, resultado.Count);

    await fondoDA
        .Received(1)
        .ObtengaFondosAsync(
            10,
            Arg.Any<CancellationToken>());
}
```
AAA improves readability but does not require `Arrange/Act/Assert` comments when a test is already trivial and the existing style omits them.

## Testing Anti-Patterns
Original source: lines 1896–1922.

### Testing Anti-Patterns

- Testing private methods directly.
- Duplicating the same test in Controller, BW, and DA without any difference in observed behavior.
- Using sleeps (`Thread.Sleep`) to synchronize tests.
- Depending on test execution order.
- Sharing mutable state among tests.
- Using production data.
- Catching exceptions and marking a test as passing without validating the type or behavior.
- Configuring mocks in such detail that a test reproduces the implementation.
- Checking only numeric coverage instead of meaningful behavior.
- Ignoring a failing test or disabling it without documenting the cause.

Common commands from the corresponding project's `Codigo/` directory:
```powershell
dotnet build <solucion>.sln
dotnet test <solucion>.sln
dotnet test <solucion>.sln --collect:"XPlat Code Coverage"
```
The exact solution and project names, along with restore options, are documented in each service's README. Package restore may require private feeds and BCCR network access.

## Performance, Pagination, and Retries
Original source: lines 1952–2011.

### Performance and Reliability Examples

> Recommendations to avoid unnecessary loads, measure before optimizing,
> parallelize only independent operations, and propagate errors without
> excessive wrapping are retained.

#### Avoid Unnecessary Materialization

**Avoid**
```csharp
var todos = await _contexto.Fondos
    .ToListAsync(cancellationToken);

var fondo = todos.FirstOrDefault(x => x.Codigo == codigoFondo);
```
**Recommended**
```csharp
var fondo = await _contexto.Fondos
    .AsNoTracking()
    .SingleOrDefaultAsync(
        x => x.Codigo == codigoFondo,
        cancellationToken);
```
#### Pagination

For endpoints that may return large volumes, use the pagination mechanisms already defined by the contract before loading the entire collection into memory. Do not unilaterally change an existing endpoint signature to introduce pagination.

#### Retries

Do not wrap all calls in generic retries.

**Avoid**
```csharp
for (var intento = 0; intento < 10; intento++)
{
    try
    {
        return await _servicio.EnvieAsync();
    }
    catch
    {
        // Reintento indiscriminado.
    }
}
```
A retry policy must be limited to identified transient failures, honor timeouts and idempotency, and use the project's existing infrastructure when available.
