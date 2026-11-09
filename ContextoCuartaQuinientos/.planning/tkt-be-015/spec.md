[← index](_index.md) | [design →](design.md)

# spec.md — TKT-BE-015: Consultar mis tickets (residente)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como residente, quiero ver mis tickets y su estado actual, para saber si mis reportes están siendo atendidos.

## Contexto / problema

No existe código de aplicación (Entrega 1 = solo documentación). TKT-BE-001 crea tickets pero el residente no tiene cómo listarlos. Fuentes: readme §6 Ticket 15 (contrato), §5 HU-TKT-02, §5.0.1 poke-holes 2 (empty states) y 3 (orden fecha descendente + filtro por estado en AC), §4 inventario TKT (`GET /mis`), §3.2 diccionario; [specs/tickets.md](../../specs/tickets.md).

Comportamiento esperado: `TicketsController.GetMisTickets` (`GET /TKT/Tickets/mis`) toma `UsuarioID` del claim `sub` y delega en `ITicketService.GetMisTicketsAsync(uid, TicketFiltroDto)`, que consulta `tkt.vsTickets` con Dapper parametrizado filtrando por `UsuarioSolicitanteID` (el solicitante, no el usuario de auditoría `UsuarioCreacionID`), `bEliminado = 0`, filtros opcionales `estadoTicketId`/`categoriaTicketId`, orden `FechaCreacionTicket DESC` y paginación `OFFSET/FETCH`. `tkt.vsTickets` hoy no expone categoría; DB-001 la amplía (categoría, canal, casa) — por eso el ticket se ejecuta tras DB-001.

Además, readme §6 Ticket 15 asigna a este ticket los catálogos de solo lectura que consumen la web ([[FE-031]]: select de categoría y filtro por estado) y el bot ([[TKT-BOT-003]]): `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`, que devuelven `[{ id, nombre }]` de `tkt.CategoriasTicket` / `tkt.EstadosTickets` con `bEliminado = 0` ordenados por nombre.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GET /TKT/Tickets/mis` con `[Authorize]`; `UsuarioID` extraído del claim `sub` (nunca de query/body).
- Query params opcionales `estadoTicketId`, `categoriaTicketId`, `pagina`, `tamano` (IDs de `tkt.EstadosTickets` / `tkt.CategoriasTicket`).
- Consulta parametrizada a `tkt.vsTickets` `WHERE UsuarioSolicitanteID = @uid AND bEliminado = 0 ORDER BY FechaCreacionTicket DESC OFFSET/FETCH`.
- `200 OK` con `{ total, pagina, items: [{ ticketId, titulo, estado, prioridad, categoria, fechaCreacion }] }`; `items: []` si no hay tickets.
- `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets` con `[Authorize]` (cualquier perfil): `200 OK` con `[{ id, nombre }]` de los registros con `bEliminado = 0`, ordenados por nombre (readme §6 Ticket 15).
- Test unitario `GetMisTicketsAsync_ReturnsOnlyOwnTickets` + test de integración del endpoint.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Validación de paginación (`pagina ≥ 1`, `1 ≤ tamano ≤ 100`) con `400 VALIDATION_ERROR` `(asumido)`.
- Contrato visible en `/swagger` (DoD "Endpoint API", readme §5).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- ninguno

### Won't — fuera de alcance explícito
- Detalle del ticket con comentarios y evidencia (`GET /TKT/Tickets/{id}`, HU-TKT-04, fuera del Ticket 15).
- Listado de administración por condominio (es TKT-BE-016) y cola del Trabajador `GET /TKT/Tickets/asignados` (BOT-BE-021, Fase 2).
- Adjuntos (Fase 2, Non-goals TKT); SLA/tiempos de respuesta (Non-goals TKT).
- Consulta vía GraphQL (el Ticket 15 define solo REST).
- Catálogos `GET /TKT/PrioridadesTicket` y `GET /TKT/CanalesTicket` (inventario §4, fuera del Ticket 15) y ABM de catálogos.

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin cambios; lectura de `tkt.vsTickets` (ampliada por DB-001), `tkt.CategoriasTicket` y `tkt.EstadosTickets` (sembrados por DB-002) |
| `backend:cuartaquinientos-api` | Nuevo `ITicketService.GetMisTicketsAsync`, `TicketFiltroDto`, `TicketsController.GetMisTickets` (`GET /TKT/Tickets/mis`); `ICatalogoService` (TKT-BE-001) + `CategoriasTicketController` / `EstadosTicketsController` (`GET /TKT/CategoriasTicket`, `GET /TKT/EstadosTickets`) |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | El solicitante es `UsuarioSolicitanteID` = claim `sub`; nunca se toma del input | `specs/tickets.md` INV-7; readme §6 Ticket 15 |
| INV-2 | Soft delete: tickets con `bEliminado = 1` no aparecen | `specs/tickets.md` INV-9 |
| INV-3 | Estado y prioridad se muestran por nombre de catálogo (Nuevo/En seguimiento/Resuelto/Cerrado; Baja/Media/Alta/Crítica), nunca IDs ni valores inventados | `specs/tickets.md` INV-2 y Catálogos |
| INV-4 | Listados de tickets ordenados por fecha descendente | readme §5.0.1 poke-hole 3; §5 HU-TKT-02 |
| INV-5 | Lista vacía explícita (`items: []`), no error | readme §5.0.1 poke-hole 2; §6 Ticket 15 |
| INV-6 | Acceso a datos con consultas parametrizadas Dapper sobre vistas, sin SP | ADR-001; readme §2.5 inyección SQL |

## Criterios de aceptación

- [ ] **CA-1 [M]**: solo mis tickets — **Dado** el residente A (`sub` = 7) con 3 tickets y el residente B con 2 **Cuando** A llama `GET /TKT/Tickets/mis` **Entonces** `TicketsController.GetMisTickets` responde `200` con `total = 3` y los 3 `items` tienen `UsuarioSolicitanteID = 7` en `tkt.vsTickets`
- [ ] **CA-2 [M]**: orden descendente — **Dado** 3 tickets propios creados el 01, 05 y 10 de septiembre **Cuando** llama `GET /TKT/Tickets/mis` **Entonces** `items` viene en orden 10 → 05 → 01 (`FechaCreacionTicket DESC`)
- [ ] **CA-3 [M]**: filtro por estado — **Dado** 2 tickets propios "En seguimiento" y 1 "Nuevo" **Cuando** llama `GET /TKT/Tickets/mis?estadoTicketId=<ID de "En seguimiento">` **Entonces** `total = 2` y todos los `items` tienen `estado = "En seguimiento"`
- [ ] **CA-4 [M]**: filtro por categoría — **Dado** tickets propios "Agua" y "Electricidad" **Cuando** llama con `categoriaTicketId=<ID de "Agua">` **Entonces** solo aparecen `items` con `categoria = "Agua"`
- [ ] **CA-5 [M]**: paginación — **Dado** 25 tickets propios **Cuando** llama `?pagina=2&tamano=20` **Entonces** `200` con `total = 25`, `pagina = 2` y 5 `items` (los más antiguos)
- [ ] **CA-6 [M]**: lista vacía — **Dado** un residente sin tickets **Cuando** llama `GET /TKT/Tickets/mis` **Entonces** `200` con `{ total: 0, pagina: 1, items: [] }`
- [ ] **CA-7 [M]**: sin token — **Dado** una petición sin `Authorization` **Cuando** llama `GET /TKT/Tickets/mis` **Entonces** `401`
- [ ] **CA-8 [M]**: forma del item — **Dado** un ticket propio **Cuando** se lista **Entonces** cada item contiene `ticketId`, `titulo`, `estado`, `prioridad`, `categoria`, `fechaCreacion` (= `FechaCreacionTicket`) y ningún campo de auditoría
- [ ] **CA-9 [S]**: paginación inválida — **Dado** un residente **Cuando** llama `?pagina=0` o `?tamano=500` **Entonces** `400 VALIDATION_ERROR` `(asumido)`
- [ ] **CA-10 [S]**: filtro inexistente — **Dado** un residente con tickets **Cuando** llama `?estadoTicketId=999` (no existe) **Entonces** `200` con `items: []` `(asumido)`
- [ ] **CA-11 [M]**: catálogo de categorías — **Dado** `tkt.CategoriasTicket` sembrado por DB-002 (Agua, Electricidad, Jardinería, Seguridad, Limpieza, Otro) y una fila extra con `bEliminado = 1` **Cuando** un usuario autenticado de cualquier perfil llama `GET /TKT/CategoriasTicket` **Entonces** `CategoriasTicketController` responde `200` con 6 elementos `[{ id, nombre }]` ordenados por `nombre` (Agua, Electricidad, Jardinería, Limpieza, Otro, Seguridad) y sin la fila eliminada
- [ ] **CA-12 [M]**: catálogo de estados — **Dado** `tkt.EstadosTickets` sembrado (Nuevo, En seguimiento, Resuelto, Cerrado) **Cuando** un usuario autenticado llama `GET /TKT/EstadosTickets` **Entonces** `EstadosTicketsController` responde `200` con 4 elementos `[{ id, nombre }]` ordenados por `nombre` (Cerrado, En seguimiento, Nuevo, Resuelto), solo `bEliminado = 0`
- [ ] **CA-13 [M]**: catálogos sin token — **Dado** una petición sin `Authorization` **Cuando** llama `GET /TKT/CategoriasTicket` o `GET /TKT/EstadosTickets` **Entonces** `401`
- [ ] **CA-R1 [M]**: regresión de INV-1 — **Dado** un residente con `sub` = 7 **Cuando** llama `GET /TKT/Tickets/mis?usuarioId=9` **Entonces** el parámetro se ignora y solo se devuelven tickets con `UsuarioSolicitanteID = 7`
- [ ] **CA-R2 [M]**: regresión de INV-2 — **Dado** un ticket propio con `bEliminado = 1` **Cuando** se lista **Entonces** no aparece ni cuenta en `total`

## Reutilización detectada (evidencia de la escalera — regla 6)

- `tkt.vsTickets` (ampliada por DB-001) → fuente única del listado; no se crea vista nueva ni se leen tablas base.
- `ITicketService` (creado en TKT-BE-001) → se extiende con `GetMisTicketsAsync`; no se crea servicio paralelo.
- `TicketsController` (TKT-BE-001) → se agrega la acción `GET mis`; no se crea controller nuevo.
- Paginación nativa `OFFSET … FETCH` de SQL Server (peldaño 2) → sin librería de paginación.
- `ICatalogoService` (TKT-BE-001, resolución por nombre) → se extiende con los listados de categorías y estados; no se crea servicio de catálogos paralelo.
- Endpoint GraphQL de listado → evaluado y descartado: el Ticket 15 define solo REST y FE-031 lo consume por REST.

## Definition of Ready

- [x] **I**ndependent — depende de TKT-BE-001 (documentado en `_index.md`)
- [x] **N**egotiable — los Should son recortables vía escalación
- [x] **V**aluable — el residente ve sus tickets
- [x] **E**stimable — 5 h (readme §6)
- [x] **S**mall — una acción de listado + dos catálogos de solo lectura sobre servicios existentes
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (`tkt.vsTickets` declarada en DB-000/DB-001; MCP pendiente Entrega 2)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| `tkt.vsTickets` sin `CategoriaTicketID`/categoría si DB-001 no se aplicó (la vista actual no la expone) | Alta | DB-001 antes de programar (ADR-008); smoke `SELECT TOP 0` de la vista en el test de integración |
| Paginación inestable con tickets de igual `FechaCreacionTicket` | Baja | Desempate `TicketID DESC` `(asumido)` (design) |
| Confundir solicitante con `UsuarioCreacionID` | Media | CA-1/CA-R1 y comentario explícito del readme Ticket 15 |

## Preguntas abiertas

- ¿Solo perfil Residente o cualquier autenticado? → **respondida**: readme Ticket 15 usa `[Authorize]`; cualquier perfil ve solo los tickets que él solicitó `(asumido)` — no expone datos ajenos.
- Defaults y límites de paginación → **respondida `(asumido)`**: `pagina = 1`, `tamano = 20` (ejemplo del readme), máximo 100.
- Filtro con ID inexistente → **respondida `(asumido)`**: `200` con `items: []` (no `400`).
- Desempate del orden → **respondida `(asumido)`**: `ORDER BY FechaCreacionTicket DESC, TicketID DESC`.
- ¿Qué ticket implementa `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`? → **respondida**: este ticket (readme §6 Ticket 15, 2026-09-24).

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
- [x] Si Tipo = Refactor → CHAR-x poblado con baseline capturado por MCP (no aplica: Feature)
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada (no aplica: sin PBT-x)
