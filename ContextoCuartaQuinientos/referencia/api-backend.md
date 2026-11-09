# Referencia — Backend API (.NET 9)

> Guía de convenciones para implementar el backend en Entrega 2. Contrato oficial: `readme.md` §2.2 (componentes), §2.5 (seguridad) y §4 (API).
> Proyecto: `CuartaQuinientos.Api/` (nombre provisional, `readme.md` §2.3; `sdd.config.yaml` lo mapea como `GraphApi`).

## Stack

| Pieza | Uso |
|-------|-----|
| ASP.NET Core .NET 9 Web API | Controllers REST por dominio |
| HotChocolate | GraphQL en `/graphql` (queries, mutations, DataLoaders, `[Authorize]`) |
| Dapper + `Microsoft.Data.SqlClient` | Consultas parametrizadas; lectura por vistas `vs*`, escritura en tablas base |
| FluentValidation | Validación de DTOs create/update en servicios |
| JWT Bearer (HMAC-SHA256) | `[Authorize]` en controllers y resolvers |
| BCrypt.Net-Next | Verificación de contraseña en login |
| Serilog | Logging estructurado |
| Swashbuckle | OpenAPI (contrato §4) |
| QuestPDF + ClosedXML | Reportes PDF / Excel (RPT, BI) |
| xUnit + Moq | Tests de servicios con repositorios mockeados |

**Sin EF Core y sin stored procedures de negocio** (ADR-001, `readme.md` §2.5.1).

## Rutas REST

- Convención única: **`/{Dominio}/{Controller}`** sin prefijo `/api` — p. ej. `/TKT/Tickets`, `/SGR/Usuarios`, `/FNZ/Cuotas`, `/Dashboard/Resumen`, `/Reports/Reportes/Morosos`.
- Login: **`POST /SGR/AuthService/GenerateToken`** (`readme.md` §4 Endpoint 1, ticket USR-BE-007).
- Inventario completo por dominio: `readme.md` §4 (tabla de endpoints).

## Autenticación y claims

- Valida credenciales contra `sgr.Usuarios` con BCrypt.
- JWT: `sub` = **`UsuarioID`**, `nombre`, `perfil`, `bAdministrador`, `condominioId`, `exp`.
- El solicitante de cualquier acción sale de `sub`; nunca del body (ej. `UsuarioSolicitanteID` en tickets).

## Capas

```
Controllers/{Dominio}/     → delgados: validan, llaman al servicio, mapean HTTP
Services/{Dominio}/        → reglas de negocio, FluentValidation, transacciones
Repositories/{Dominio}/    → Dapper: SQL parametrizado, IDbTransaction
GraphQL/{Dominio}/         → Queries / Mutations / Types sobre los mismos servicios
```

REST y GraphQL comparten servicios: la lógica no se duplica (tampoco en el bot).

## Patrón de acceso a datos (ejemplo tickets)

- **Lectura:** `SELECT … FROM tkt.vsTickets WHERE …` con `DynamicParameters`.
- **Escritura:** `INSERT INTO tkt.Tickets (…)` + `SCOPE_IDENTITY()` dentro de transacción; columnas de auditoría `Creado`, `UsuarioCreacionID`, `FechaCreacion`, `bEliminado`.
- Efectos laterales (notificación a administradores en `ntf.Notificaciones`) en la misma transacción.
- Detalle: ticket TKT-BE-001 en [../.planning/tkt-be-001/_index.md](../.planning/tkt-be-001/_index.md).

## Configuración

- `ConnectionStrings:DefaultConnection` vía `IConnectionFactory`.
- `Jwt:SecretKey`, `Jwt:Issuer`, `Jwt:Audience` — plantilla en `scaffolds/api/appsettings.Development.example.json`; secretos solo en User Secrets / variables de entorno.
- Proveedor LLM (C500 Asiste): [bot-ia-configuracion.md](bot-ia-configuracion.md).

## Dónde seguir

| Necesidad | Documento |
|-----------|-----------|
| Contrato API | `readme.md` §4 |
| Tickets de implementación | `readme.md` §6 · [../.planning/FASE1_ROADMAP.md](../.planning/FASE1_ROADMAP.md) |
| Reglas por dominio | [../specs/_index.md](../specs/_index.md) |
