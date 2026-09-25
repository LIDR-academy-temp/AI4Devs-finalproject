[← index](_index.md) | [← spec](spec.md)

# design.md — TKT-BE-002: Backend: GraphQL mutation crearTicket

> Generado por: **generador de contexto SDD** tras validar spec.md
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api` → `api-tester` → `auditor-codigo`)

## Estrategia técnica

Resolver delgado en `TicketMutation` (readme §6 Ticket 2): `UsuarioActual.DesdeClaims(claimsPrincipal)` → `ticketService.CrearTicketAsync(input, solicitante)` → `CrearTicketPayload.Desde(result)`. Sin acceso a BD ni catálogos en el resolver.

Alternativas descartadas: duplicar INSERT en el resolver; llamar `POST /TKT/Tickets` por HTTP interno.

### Escalera de decisión

| Capacidad | Peldaño | Objeto | Descarte |
|---|---|---|---|
| Alta de ticket | 3 | `ITicketService` (TKT-BE-001) | — |
| Auth Residente | 2 | HotChocolate `[Authorize(Roles)]` | — |
| Payload GraphQL | 5 | `CrearTicketPayload`, `UserError` | no existe tipo union en REST |
| Resolver | 5 | `TicketMutation.CrearTicketAsync` | — |

## database:CuartaQuinientos

Sin cambios (TKT-BE-001).

## backend:cuartaquinientos-api

| Endpoint | Verbo | Request | Response | Acción |
|---|---|---|---|---|
| `/graphql` | POST | `mutation CrearTicket($input: CrearTicketInput!) { crearTicket(input: $input) { ticket { ... } errors { message code field } } }` | `CrearTicketPayload` | crear |

Clases: `TicketMutation`, `CrearTicketPayload.Desde(Result<TicketDto>)`, registro en `Program.cs`/schema existente.

## Orden de implementación

| # | Paso | Target | Entregable | Dep | Verificación |
|---|------|--------|------------|-----|--------------|
| 1 | Payload + mapper | backend | `CrearTicketPayload`, `UserError` | TKT-BE-001 merge | unit test mapper |
| 2 | Resolver | backend | `TicketMutation` | 1 | build |
| 3 | Tests integración | backend | 3 casos GraphQL | 2 | `dotnet test` |

## Plan de pruebas

| Prueba | Target | Tipo | Cubre |
|---|---|---|---|
| `TC-1` | API | integración GraphQL | CA-1 |
| `TC-ERR-1` | API | negativo | CA-3 |
| `TC-ERR-2` | API | auth | CA-2 |
| `TC-INV-1` | API | regresión | CA-R1 vs REST |

## Estrategia de rollback

Eliminar mutation del schema; FE-031 sigue bloqueada hasta restaurar.

## Decisiones técnicas

| # | Decisión | Justificación |
|---|---|---|
| D-1 | Un servicio para REST y GraphQL | readme Ticket 2; evita drift |

## Autoverificación

- [x] Consistente con spec; sin objetos Won't; pruebas cubren CA.
