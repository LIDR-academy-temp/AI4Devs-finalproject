[← index](_index.md) | [design →](design.md)

# spec.md — SETUP-000: Scaffolds API + Web + CI

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `desarrollador-react`, `auditor-codigo`)
> **Tipo:** Feature (infraestructura / habilitador)

## User story

Como desarrollador del equipo CuartaQuinientos, quiero proyectos `GraphApi/`, `GraphApi.Tests/` y `Web/` con la configuración transversal y CI que el readme asume, para implementar tickets de Fase 1 sin redefinir JWT, Dapper, ProblemDetails ni el pipeline en cada PR.

## Contexto / problema

**Documentos de entrada**

| Tipo | Fuente |
|---|---|
| Requerimiento | [readme.md](../../../README.md) §6 Ticket 33, §1.3 (UI tokens), §1.4 (arranque), §2.5 (seguridad, sesión web), §5.0 (núcleo) |
| Técnico | `CLAUDE.md`, `sdd.config.yaml`, `sdd-toolkit/setup/editorconfig`, [specs/base-datos.md](../../specs/base-datos.md) (Testcontainers + scripts SQL) |
| Mockup | Wireframes §1.3 readme (tokens Tailwind para Web) |

**Comportamiento actual:** solo existe `SQL/` en el repo (Entrega 1). No hay `GraphApi/`, `Web/` ni workflow de CI.

**Comportamiento esperado:** `dotnet run` (API), `npm run dev` (Web) y el job de CI pasan con la plantilla mínima; JWT con `RoleClaimType = "perfil"`, rate limiter `login`, Testcontainers aplicando `cuartaquinientos_schema.sql` + DB-001 + DB-002 en tests de integración.

**Cadena:** primer ticket de Entrega 2 → `SETUP-000 → DB-000 → DB-001 → DB-002 → USR-BE-007` ([FASE1_ROADMAP](../FASE1_ROADMAP.md)).

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GraphApi/` (.NET 9): JWT Bearer HS256, políticas `SoloAdministrador` y `AdminOAsignado`, CORS configurable, Serilog + `CorrelationId`, `ProblemDetails` global, rate limiter política `login`, Swagger en Development, HotChocolate `/graphql`, `/health` con chequeo de BD.
- Infraestructura API: `IDbConnectionFactory`, `UsuarioActual` desde claims, `Result<T>`, mapeo HTTP (`FORBIDDEN`→403, `NOT_FOUND`→404, `CONFLICT`→409, `VALIDATION_ERROR`→400/422).
- `GraphApi.Tests/`: xUnit + Moq + `WebApplicationFactory`; Testcontainers SQL Server con scripts `SQL/cuartaquinientos_schema.sql`, `DB-001_alineacion_modelo.sql`, `DB-002_seeds_catalogos.sql` (scripts referenciados; se crean en tickets DB).
- `Web/`: Vite + React 18 + TS estricto, Tailwind (tokens §1.3), Apollo Client, React Router + `PrivateRoute`, Vitest + Testing Library, ESLint.
- `.github/workflows/ci.yml`: build+test API, lint+test+build Web; corre en PR.
- `.editorconfig` desde `sdd-toolkit/setup/editorconfig`.
- Arranque documentado en readme §1.4 sin pasos extra.

### Should — esperado; negociable vía escalación
- Job `pytest` del Bot en CI `(asumido)` — el folder `Bot/` puede no existir aún; el workflow debe fallar claro o omitir el job hasta BOT en Fase 2.
- Plantilla mínima de `appsettings.Development.json` con connection string placeholder (user-secrets en dev real).

### Could — solo si sale gratis
- ninguno

### Won't — fuera de alcance explícito
- Implementar endpoints de negocio (USR-BE-007, TKT-BE-001, …).
- Scripts SQL DB-000/001/002 (tickets propios).
- Despliegue a Azure/producción.
- Bot Python funcional (solo hook CI si existe carpeta).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `backend:cuartaquinientos-api` | Nuevo proyecto `GraphApi/`, tests `GraphApi.Tests/` |
| `frontend:cuartaquinientos-web` | Nuevo proyecto `Web/` |
| `integrations:github-actions` | `.github/workflows/ci.yml`, `.editorconfig` |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | REST `/{Dominio}/{Controller}` sin prefijo `/api` | `readme.md` §2.5, ADR-003 |
| INV-2 | Errores en `ProblemDetails` con `code` de negocio | `readme.md` §4 |
| INV-3 | Identidad del JWT: `sub` = `UsuarioID`; `RoleClaimType = "perfil"` | ADR-003, Ticket 33 |
| INV-4 | Sin stored procedures de negocio en acceso a datos del scaffold | `specs/base-datos.md` INV-4, ADR-001 |
| INV-5 | Secretos solo en user-secrets / variables de entorno | `readme.md` §2.5 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: build API — **Dado** el repo tras SETUP-000 **Cuando** se ejecuta `dotnet build GraphApi/GraphApi.csproj` **Entonces** termina sin errores.
- [ ] **CA-2 [M]**: JWT y políticas — **Dado** `Program.cs` **Cuando** se inspecciona la configuración **Entonces** `RoleClaimType = "perfil"`, existen políticas `SoloAdministrador` y `AdminOAsignado`, y rate limiter registra política `login`.
- [ ] **CA-3 [M]**: health — **Dado** la API levantada con connection string válida **Cuando** `GET /health` **Entonces** responde 200 e incluye chequeo de conectividad a BD.
- [ ] **CA-4 [M]**: ProblemDetails — **Dado** un controller de prueba que devuelve `Result.Fail("CONFLICT", …)` **Cuando** se invoca **Entonces** la respuesta es 409 con cuerpo `ProblemDetails` y `code`.
- [ ] **CA-5 [M]**: Testcontainers — **Dado** `GraphApi.Tests` **Cuando** corre un test de integración base **Entonces** levanta SQL Server efímero y aplica los tres scripts SQL en orden (schema + DB-001 + DB-002) `(asumido)` rutas relativas al repo.
- [ ] **CA-6 [M]**: Web build — **Dado** `Web/` **Cuando** `npm run build` y `tsc --noEmit` **Entonces** ambos pasan.
- [ ] **CA-7 [M]**: PrivateRoute — **Dado** usuario no autenticado **Cuando** navega a ruta protegida **Entonces** redirige a `/login` (componente scaffold, sin localStorage para tokens — access token en memoria `(asumido)` alineado a FE-030).
- [ ] **CA-8 [M]**: CI — **Dado** un PR **Cuando** corre `.github/workflows/ci.yml` **Entonces** ejecuta build+test de API y lint+test+build de Web.
- [ ] **CA-9 [S]**: GraphQL — **Dado** Development **Cuando** `POST /graphql` con query `{ __typename }` **Entonces** responde 200 (schema mínimo HotChocolate).
- [ ] **CA-R1 [M]**: regresión INV-4 — **Dado** el código de `GraphApi/` **Cuando** `auditor-codigo` busca `CommandType.StoredProcedure` en repositorios scaffold **Entonces** no hay invocaciones a SP de negocio.

## Reutilización detectada (evidencia de la escalera — regla 6)

- Plantillas oficiales ASP.NET Core / Vite — peldaño 2 (nativo del stack).
- `sdd-toolkit/setup/editorconfig` — reuso directo.
- `Result<T>` y middleware ProblemDetails — patrón documentado en readme §2.5; no inventar otro envelope.
- Testcontainers + sqlcmd/scripts — patrón readme §2.5.1 (tests de integración núcleo).

## Definition of Ready

- [x] **I**ndependent — no depende de otro ticket SDD
- [x] **N**egotiable — Should del Bot en CI negociable
- [x] **V**aluable — desbloquea toda Fase 1 backend/frontend
- [x] **E**stimable — 5 h (Ticket 33)
- [x] **S**mall — una sesión grande o dos medianas
- [x] **T**estable — CA verificables con build/CI

- [x] Instancias en scope identificadas
- [x] Sin preguntas abiertas que bloqueen Must

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| CI referencia scripts DB aún no implementados | Media | Tests usan rutas acordadas; DB tickets entregan archivos antes de merge a main |
| Bot ausente rompe workflow | Baja | Job condicional o `continue-on-error` documentado en design |

## Preguntas abiertas

- Job pytest del Bot → **pendiente** hasta existir `Bot/` (Should, no bloquea Must).

## Quick Checks — antes del handoff al implementador

- [x] CA nombran artefactos reales (`Program.cs`, `/health`, `ci.yml`)
- [x] Reutilización evaluada
- [x] Won't no contradice design
