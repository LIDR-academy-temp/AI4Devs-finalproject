[← index](_index.md) | [← spec](spec.md)

# design.md — SETUP-000: Scaffolds API + Web + CI

> Generado por: **generador de contexto SDD** tras validar spec.md

## Estrategia técnica

Scaffold mínimo alineado a `readme.md` §1.4 y Ticket 33: un solution .NET 9 con API + tests, app Vite React, workflow CI. Sin lógica de negocio — solo wiring transversal que USR-BE-007 y FE-030 consumen.

**Alternativas descartadas:** monorepo Nx (sobreingeniería); Minimal API sin controllers (contradice patrón `/{Dominio}/{Controller}`); almacenar JWT en localStorage (prohibido §2.5).

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Descarte 2-4 |
|---|---|---|---|
| Proyecto API .NET | 2 | `dotnet new webapi` + ajustes | — |
| JWT + rate limit | 2 | middleware ASP.NET Core | — |
| Web React | 2 | `npm create vite` | — |
| CI GitHub | 2 | `actions/checkout` + matrices | — |
| Testcontainers | 3 | paquete ya estándar en readme | no hay harness previo |
| `PrivateRoute` | 5 | componente en `Web/src/` | no existe UI |

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/health` | GET | — | 200 health+json | crear |
| `/graphql` | POST | query mínima | 200 | crear (HotChocolate stub) |

| Objeto | Tipo | Acción | Notas |
|---|---|---|---|
| `GraphApi/Program.cs` | Host | crear | JWT, CORS, Serilog, ProblemDetails, rate limit `login` |
| `GraphApi/Infrastructure/*` | Clases | crear | `IDbConnectionFactory`, `UsuarioActual`, `Result<T>` |
| `GraphApi.Tests/` | Proyecto | crear | Testcontainers + 3 scripts SQL |

## frontend:cuartaquinientos-web

| Componente | Acción | Contrato |
|---|---|---|
| `PrivateRoute` | crear | redirige `/login` |
| `ApolloProvider` + auth link | crear | Bearer desde contexto memoria |
| Tailwind config | crear | tokens §1.3 |

## integrations:github-actions

| Workflow | Acción |
|---|---|
| `.github/workflows/ci.yml` | crear — API + Web |

## Orden de implementación

| # | Paso | Target | Entregable | Dep | Verificación |
|---|------|--------|------------|-----|--------------|
| 1 | Solution API | backend | `GraphApi/` compila | — | `dotnet build` |
| 2 | Infra transversal | backend | JWT, Dapper factory, Result | 1 | test unitario mapper Result |
| 3 | Tests + Testcontainers | backend | proyecto tests | 1 | `dotnet test` (smoke skip si no hay Docker) |
| 4 | Web scaffold | frontend | `Web/` | — | `npm run build` |
| 5 | CI | integrations | workflow | 1,4 | push PR |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre |
|---|---|---|---|
| TC-INV-1 | backend | regresión | CA-R1 INV-4 |
| TC-ERR-1 | backend | negativo | health sin BD → unhealthy |
| TC-ERR-2 | frontend | negativo | ruta protegida sin auth |
| TC-RB | repo | rollback | revertir commit scaffold |

Ratio: integración ~70 % (Testcontainers), unitario ~30 %.

## Estrategia de rollback

Revertir commit único de scaffold; no hay DDL.

## Decisiones técnicas

| # | Decisión | Justificación |
|---|---|---|
| 1 | HS256 JWT | readme §2.5 |
| 2 | Access token en memoria en Web | FE-030 / §2.5 |

## Autoverificación

- [x] Won't sin endpoints negocio
- [x] TC-INV-1 ↔ INV-4
- [ ] MCP SQL en tests — pendiente Entrega 2 (scripts DB referenciados)
