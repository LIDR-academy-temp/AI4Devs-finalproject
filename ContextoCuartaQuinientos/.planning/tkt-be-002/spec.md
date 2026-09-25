[← index](_index.md) | [design →](design.md)

# spec.md — TKT-BE-002: Backend: GraphQL mutation crearTicket

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como residente en la web, quiero crear una incidencia vía GraphQL, para usar el mismo flujo de negocio que el bot REST sin duplicar reglas (HU-TKT-01).

## Contexto / problema

Entrega 1 = solo documentación. TKT-BE-001 define `ITicketService.CrearTicketAsync` y `POST /TKT/Tickets` (bot). La web debe usar HotChocolate (`crearTicket`) según readme §4 Endpoint 2 y §6 Ticket 2: el resolver construye `UsuarioActual` desde el JWT y delega en el servicio; traduce `Result` a `CrearTicketPayload` (`ticket` o `errors`). Fuentes: [specs/tickets.md](../../specs/tickets.md), TKT-BE-001 spec/design.

## Alcance (MoSCoW)

### Must
- Mutation GraphQL `crearTicket(input: CrearTicketInput!)` → `CrearTicketPayload` reutilizando `CrearTicketInput` y `ITicketService.CrearTicketAsync` (TKT-BE-001).
- `[Authorize(Roles = new[] { "Residente" })]` en el resolver (`RoleClaimType = "perfil"`, SETUP-000).
- `UsuarioSolicitanteID` = claim `sub` (`UsuarioID`); nunca del input ni `ResidenteID`.
- Errores de validación/negocio → `ticket: null` + `errors[]` (no excepción GraphQL para 400/403 del servicio).
- Fail-fast en input GraphQL: `titulo` ≤ 200, `descripcion` ≤ 4 000, prioridad válida, `canal` default WEB.
- 3 tests de integración GraphQL: éxito, título > 200, perfil no Residente.

### Should
- Schema y ejemplos alineados a readme §4 Endpoint 2.

### Could
- ninguno

### Won't
- Reglas de negocio duplicadas en el resolver (solo delegación).
- Listado o gestión admin (TKT-BE-015/016, FE-038).
- Adjuntos, bot Telegram (Fase 2).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `backend:cuartaquinientos-api` | `TicketMutation.CrearTicketAsync`, `CrearTicketPayload`, `UsuarioActual.DesdeClaims`, registro en schema HotChocolate |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Misma regla de alta que REST (estado Nuevo, catálogos por nombre, notificación en transacción) | TKT-BE-001; `specs/tickets.md` |
| INV-2 | Identidad del JWT (`sub`), nunca del body | CLAUDE.md |
| INV-3 | Sin SP de negocio | ADR-001 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: **Dado** JWT Residente válido **Cuando** `mutation crearTicket` con `{ titulo, descripcion, categoria }` **Entonces** payload con `ticket` (desde servicio) y `errors` null
- [ ] **CA-2 [M]**: **Dado** JWT Administrador **Cuando** ejecuta la mutation **Entonces** GraphQL devuelve error de autorización (equivalente 403) sin insert
- [ ] **CA-3 [M]**: **Dado** Residente **Cuando** `titulo` de 201 caracteres **Entonces** `errors` con validación y `ticket` null
- [ ] **CA-4 [M]**: **Dado** body con `usuarioSolicitanteId` distinto **Cuando** Residente con `sub=7` crea **Entonces** ticket con `UsuarioSolicitanteID=7` (servicio TKT-BE-001)
- [ ] **CA-5 [M]**: **Dado** servicio devuelve `FORBIDDEN` o `VALIDATION_ERROR` **Entonces** `CrearTicketPayload.Desde(result)` mapea a `errors` sin stack al cliente
- [ ] **CA-R1 [M]**: **Dado** mismo input **Cuando** REST `POST /TKT/Tickets` vs GraphQL **Entonces** mismo ticket persistido (mismo servicio)

## Reutilización detectada

- `ITicketService.CrearTicketAsync`, `CrearTicketInput`, `CrearTicketInputValidator` → TKT-BE-001 (peldaño 3).
- HotChocolate `[Authorize]` → stack existente SETUP-000 (peldaño 2).

## Definition of Ready

- [x] INVEST + checklist plantilla; depende TKT-BE-001 documentado.

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Doble validación GraphQL vs FluentValidation | Baja | Validación mínima en input type; negocio en servicio |
| `RoleClaimType` mal configurado | Media | CA-2 + tests integración |

## Preguntas abiertas

- Ninguna que bloquee Must.

## Quick Checks

- [x] CA nombran resolver/mutation; reutilización documentada; DoR completa.
