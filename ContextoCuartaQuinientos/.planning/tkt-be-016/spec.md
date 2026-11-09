[← index](_index.md) | [design →](design.md)

# spec.md — TKT-BE-016: Gestión de tickets por Administrador

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `desarrollador-tdd` (máquina de estados), `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como administrador, quiero listar los tickets de mi condominio, cambiar su estado y asignarlos a personal (Trabajador), para gestionar su atención hasta el cierre.

## Contexto / problema

No existe código de aplicación (Entrega 1 = solo documentación). TKT-BE-001 crea tickets en "Nuevo" y TKT-BE-015 los lista para el residente, pero nadie puede moverlos por su ciclo de vida ni asignarlos. Fuentes: readme §6 Ticket 16 (contrato), §5 HU-TKT-03 y Non-goals TKT, §3.2 máquina de estados, §2.5 (perfiles, `EsInterno`, `CasaID`), §2.5 formato de errores (`INVALID_TRANSITION`), §4 inventario TKT; [specs/tickets.md](../../specs/tickets.md) y [specs/notificaciones.md](../../specs/notificaciones.md).

Máquina de estados (readme §3.2; la valida `TicketService`; cualquier otra transición → `422 INVALID_TRANSITION`):

| Desde | Hacia | Quién | Efecto |
|-------|-------|-------|--------|
| Nuevo | En seguimiento | Administrador o trabajador asignado | Notifica al solicitante |
| En seguimiento | Resuelto | Administrador o trabajador asignado | Registra `FechaCierre`; notifica al solicitante |
| Resuelto | En seguimiento | Administrador (reapertura) | Limpia `FechaCierre`; notifica al solicitante |
| Resuelto | Cerrado | Administrador | Cierre administrativo; `FechaCierre` no cambia; notifica al solicitante |

Toda transición notifica al solicitante con el tipo `TICKET_ESTADO` vía `INotificacionService` (readme §3.2).

Comportamiento esperado: `TicketsController` expone `GET /TKT/Tickets` (listado del condominio del JWT vía `tkt.Tickets.CasaID → sgr.Casas.CondominioID`) y `PATCH /TKT/Tickets/{ticketID}/estado/{estadoId}`; `TicketsUsuariosAsignadosController` expone `POST /TKT/TicketsUsuariosAsignados`. `ITicketService.CambiarEstadoAsync` valida catálogo y máquina de estados, actualiza `EstadoTicketID`/`FechaCierre`, inserta un comentario de sistema en `tkt.ComentariosTicket` (`EsInterno = 1`) y notifica al solicitante vía `INotificacionService`, todo en una transacción. La asignación crea la fila N:M (`Terminado = 0`) y notifica al asignado.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `GET /TKT/Tickets` con `[Authorize(Policy = "SoloAdministrador")]`, filtrado por `condominioId` del JWT, con `?estadoTicketId=&prioridadTicketId=&pagina=&tamano=`, orden fecha descendente.
- `PATCH /TKT/Tickets/{ticketID}/estado/{estadoId}` con `[Authorize(Policy = "AdminOAsignado")]` → `204`; valida catálogo y máquina de estados (`422 INVALID_TRANSITION`); Resuelto registra `FechaCierre`, reapertura la limpia; comentario de sistema `EsInterno = 1`; notificación al solicitante; todo en una transacción.
- El trabajador asignado solo puede ejecutar Nuevo → En seguimiento → Resuelto.
- `POST /TKT/TicketsUsuariosAsignados` con `SoloAdministrador` → `201`; crea (`TicketID`, `UsuarioID`, `Terminado = 0`) y notifica al asignado vía `INotificacionService`; solo usuarios activos con perfil Trabajador (`422` si no).
- Tests `CambiarEstadoAsync_ActualizaEstadoYFechaCierre` y `AsignarTicket_InsertaTicketsUsuariosAsignados` + integración de los 3 endpoints.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Asignación duplicada activa del mismo usuario al mismo ticket → `409 CONFLICT` `(asumido)`.
- Cambio de estado concurrente (el estado leído ya no es el actual) → `409 CONFLICT` `(asumido)`.
- Contratos visibles en `/swagger` (DoD "Endpoint API").

### Could — solo si sale gratis durante la implementación; jamás bloquea
- ninguno

### Won't — fuera de alcance explícito
- Endpoint para listar candidatos a asignar (usuarios Trabajador activos): no está en el Ticket 16 (ver Preguntas abiertas; lo necesita FE-038).
- Comentarios de usuario, edición/borrado de comentarios (HU-TKT-04 [S]; Non-goals TKT).
- Marcar `TicketsUsuariosAsignados.Terminado = 1` y evidencia por foto (HU-BOT-10 / BOT-BE-021, Fase 2).
- SLA, escalamiento automático, calificación (Non-goals TKT); adjuntos (Fase 2).
- Envío real a Telegram (Fase 1 solo encola; BOT-BE-020).
- UI de gestión (FE-038).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin cambios de esquema; UPDATE `tkt.Tickets`, INSERT `tkt.ComentariosTicket` y `tkt.TicketsUsuariosAsignados`; lectura `tkt.vsTickets`, `sgr.Casas`, `sgr.Usuarios`, `sgr.Perfiles`, catálogos |
| `backend:cuartaquinientos-api` | `ITicketService.ListarAsync`, `CambiarEstadoAsync`, `AsignarAsync`; acciones en `TicketsController`; nuevo `TicketsUsuariosAsignadosController`; handler de la política `AdminOAsignado` |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Solo se permiten las transiciones de la máquina de estados; cualquier otra → `422 INVALID_TRANSITION` ("Transición de estado no permitida") | `specs/tickets.md` INV-10; readme §3.2 |
| INV-2 | Al pasar a **Resuelto** se registra `FechaCierre`; **toda** transición (incluidas reapertura y cierre) notifica al solicitante con `TICKET_ESTADO` | `specs/tickets.md` INV-3 y máquina de estados; readme §3.2 |
| INV-3 | La asignación se materializa en `tkt.TicketsUsuariosAsignados` (N:M con `Terminado`); el técnico asignado recibe notificación | `specs/tickets.md` INV-5 |
| INV-4 | Un comentario con `EsInterno = 1` es visible solo para Administrador | `specs/tickets.md` INV-6; readme §2.5 |
| INV-5 | `EstadoTicketID`/`PrioridadTicketID` siempre referencian el catálogo; estados resueltos por nombre (Nuevo, En seguimiento, Resuelto, Cerrado) | `specs/tickets.md` INV-2 y Catálogos |
| INV-6 | Soft delete `bEliminado`; tickets eliminados no se listan ni se modifican | `specs/tickets.md` INV-9 |
| INV-7 | `INotificacionService` es el único punto que inserta en `ntf.Notificaciones`; recibe la transacción del llamador; Telegram solo se encola (un fallo de Telegram no revierte) | `specs/notificaciones.md` INV-7; ADR-009 |
| INV-8 | Ordenar por prioridad usa `tkt.PrioridadesTicket.Orden`, nunca el ID | readme §3.2 diccionario (DB-001) |
| INV-9 | Identidad del actor desde el JWT (`sub`, `condominioId`, `bAdministrador`); nunca del body | readme §2.5; CLAUDE.md convenciones |

## Propiedades (PBT-x) — invariantes a nivel dato (OPCIONAL)

- PBT-1: Para todo par (estado origen, estado destino) de `tkt.EstadosTickets` que no figure en la tabla §3.2, `TicketService.CambiarEstadoAsync` devuelve `INVALID_TRANSITION` y la fila de `tkt.Tickets` queda idéntica.
- PBT-2: Para todo ticket con `bEliminado = 0` tras cualquier secuencia válida de transiciones, `FechaCierre IS NOT NULL` si y solo si el estado es Resuelto o Cerrado.

## Criterios de aceptación

- [ ] **CA-1 [M]**: listado por condominio — **Dado** un Administrador con `condominioId` = 1 y tickets de casas de los condominios 1 y 2 **Cuando** llama `GET /TKT/Tickets` **Entonces** `TicketsController` responde `200` solo con tickets cuyo `CasaID` pertenece a `sgr.Casas.CondominioID = 1`, `bEliminado = 0`
- [ ] **CA-2 [M]**: filtros, orden y paginación — **Dado** tickets del condominio con distintos estados y prioridades **Cuando** llama `GET /TKT/Tickets?estadoTicketId=<Nuevo>&prioridadTicketId=<Alta>&pagina=1&tamano=20` **Entonces** `200 { total, pagina, items }` solo con estado Nuevo y prioridad Alta, ordenados por `FechaCreacionTicket DESC`
- [ ] **CA-3 [M]**: listado solo Administrador — **Dado** un JWT de Residente, Guardia o Trabajador **Cuando** llama `GET /TKT/Tickets` **Entonces** `403 FORBIDDEN`
- [ ] **CA-4 [M]**: Nuevo → En seguimiento — **Dado** un ticket "Nuevo" del condominio del Administrador **Cuando** llama `PATCH /TKT/Tickets/{id}/estado/{En seguimiento}` **Entonces** `204`; `tkt.Tickets.EstadoTicketID` = En seguimiento; 1 fila nueva en `tkt.ComentariosTicket` con `EsInterno = 1`; 1 notificación `TICKET_ESTADO` al `UsuarioSolicitanteID` vía `INotificacionService`
- [ ] **CA-5 [M]**: En seguimiento → Resuelto — **Dado** un ticket "En seguimiento" **Cuando** el Administrador lo pasa a Resuelto **Entonces** `204`, `FechaCierre` = `SYSUTCDATETIME()` del cambio, comentario de sistema y notificación al solicitante (test `CambiarEstadoAsync_ActualizaEstadoYFechaCierre`)
- [ ] **CA-6 [M]**: reapertura — **Dado** un ticket "Resuelto" con `FechaCierre` **Cuando** el Administrador lo pasa a En seguimiento **Entonces** `204`, `FechaCierre = NULL` y 1 notificación `TICKET_ESTADO` al solicitante
- [ ] **CA-7 [M]**: cierre administrativo — **Dado** un ticket "Resuelto" con `FechaCierre` = F **Cuando** el Administrador lo pasa a Cerrado **Entonces** `204`, `FechaCierre` sigue = F y 1 notificación `TICKET_ESTADO` al solicitante
- [ ] **CA-8 [M]**: transición no permitida — **Dado** un ticket "Nuevo" **Cuando** el Administrador llama `PATCH …/estado/{Cerrado}` **Entonces** `422` con `ProblemDetails.code = INVALID_TRANSITION` y título "Transición de estado no permitida"; sin cambios en `tkt.Tickets`, `tkt.ComentariosTicket` ni `ntf.Notificaciones`
- [ ] **CA-9 [M]**: trabajador asignado — **Dado** un Trabajador con fila en `tkt.TicketsUsuariosAsignados` para el ticket **Cuando** ejecuta Nuevo → En seguimiento y luego En seguimiento → Resuelto **Entonces** ambos `204`; **Dado** un Trabajador **no** asignado **Cuando** llama el mismo `PATCH` **Entonces** `403 FORBIDDEN` (política `AdminOAsignado`)
- [ ] **CA-10 [M]**: límites del trabajador — **Dado** un Trabajador asignado y un ticket "Resuelto" **Cuando** intenta Resuelto → Cerrado o Resuelto → En seguimiento **Entonces** `422 INVALID_TRANSITION` `(asumido)`
- [ ] **CA-11 [M]**: estado destino inexistente — **Dado** un Administrador **Cuando** llama `PATCH …/estado/999` (no existe en `tkt.EstadosTickets`) **Entonces** `400 VALIDATION_ERROR` `(asumido)` sin cambios
- [ ] **CA-12 [M]**: ticket ajeno o inexistente — **Dado** un Administrador del condominio 1 **Cuando** llama `PATCH` o asigna sobre un ticket inexistente, eliminado o de otro condominio **Entonces** `404 NOT_FOUND` `(asumido)`
- [ ] **CA-13 [M]**: atomicidad del cambio de estado — **Dado** que `INotificacionService.NotificarUsuarioAsync` lanza excepción (mock) **Cuando** `TicketService.CambiarEstadoAsync` se ejecuta **Entonces** `Rollback`: `EstadoTicketID`, `FechaCierre` y `tkt.ComentariosTicket` sin cambios
- [ ] **CA-14 [M]**: asignar — **Dado** un Trabajador activo (`sgr.Usuarios.bActivo = 1`, perfil "Trabajador") **Cuando** el Administrador llama `POST /TKT/TicketsUsuariosAsignados { ticketId, usuarioId }` **Entonces** `201`; fila en `tkt.TicketsUsuariosAsignados` con `Terminado = 0`, auditoría del admin; notificación `TICKET_ASIGNADO` al trabajador en la misma transacción (test `AsignarTicket_InsertaTicketsUsuariosAsignados`)
- [ ] **CA-15 [M]**: asignar a no-Trabajador — **Dado** un usuario Residente/Guardia/Administrador o un Trabajador con `bActivo = 0` **Cuando** el Administrador lo asigna **Entonces** `422` con `code = VALIDATION_ERROR` `(asumido)` y sin fila nueva
- [ ] **CA-16 [M]**: asignar solo Administrador — **Dado** un JWT de Trabajador o Residente **Cuando** llama `POST /TKT/TicketsUsuariosAsignados` **Entonces** `403 FORBIDDEN`
- [ ] **CA-17 [S]**: asignación duplicada — **Dado** una fila activa (`bEliminado = 0`) para (ticket, usuario) **Cuando** el Administrador repite la asignación **Entonces** `409 CONFLICT` `(asumido)`
- [ ] **CA-18 [S]**: cambio concurrente — **Dado** dos administradores que leen el ticket en "Nuevo" **Cuando** ambos envían `PATCH …/estado/{En seguimiento}` **Entonces** uno obtiene `204` y el otro `409 CONFLICT` `(asumido)`; solo 1 comentario de sistema
- [ ] **CA-R1 [M]**: regresión de INV-1 — **Dado** cada uno de los 16 pares (origen, destino) del catálogo de estados **Cuando** el Administrador llama `PATCH` **Entonces** solo los 4 pares de §3.2 devuelven `204`; los otros 12 devuelven `422 INVALID_TRANSITION`
- [ ] **CA-R2 [M]**: regresión de INV-4/INV-7 — **Dado** cualquier cambio de estado exitoso **Cuando** se inspeccionan las escrituras **Entonces** el comentario de sistema tiene `EsInterno = 1` y la única escritura en `ntf.*` la hace `INotificacionService`

## Reutilización detectada (evidencia de la escalera — regla 6)

- `ITicketService`/`TicketService` y `ICatalogoService` (TKT-BE-001) → se extienden con `ListarAsync`, `CambiarEstadoAsync`, `AsignarAsync`; no se crea servicio nuevo de tickets.
- `tkt.vsTickets` → listado (con join a `sgr.Casas` para el condominio); `tkt.TicketsUsuariosAsignados` y `tkt.ComentariosTicket.EsInterno` (ya en el esquema) → sin tablas nuevas.
- `INotificacionService.NotificarUsuarioAsync` (NTF-BE-013) → notificaciones al solicitante y al asignado.
- Políticas `SoloAdministrador` y `AdminOAsignado` (declaradas en SETUP-000, readme Ticket 33) → se reusan; aquí solo se implementa el handler de recurso de `AdminOAsignado` si SETUP-000 no lo trae.
- Endpoint único `PATCH …/estado/{id}` para toda transición (web y bot) → specs/tickets.md, reutilización.
- Tabla de auditoría de transiciones → evaluada y descartada: el comentario de sistema en `tkt.ComentariosTicket` cubre la traza (readme Ticket 16).

## Definition of Ready

- [x] **I**ndependent — bloqueado por TKT-BE-015 y dependencias técnicas documentadas en `_index.md`
- [x] **N**egotiable — Should (409 duplicado/concurrencia, swagger) recortables vía escalación
- [x] **V**aluable — el administrador opera el ciclo del ticket
- [x] **E**stimable — 8 h (readme §6)
- [x] **S**mall — tres endpoints sobre un servicio existente; cabe en una sesión (si no, dividir listado / estado / asignación)
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (objetos declarados en DB-000/DB-001; MCP pendiente Entrega 2)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must (las que tocan Must tienen default `(asumido)` declarado)
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Tickets con `CasaID = NULL` (residente sin casa vigente, TKT-BE-001 CA-8) no aparecen en el listado del administrador | Media | Pregunta abierta; HU-USR-04 liga al residente a una casa en el alta |
| Máquina de estados implementada por IDs en vez de nombres | Alta | Transiciones por nombre de catálogo (INV-5); CA-R1 con los 16 pares |
| Handler `AdminOAsignado` sin acceso al `ticketID` de la ruta | Media | Handler basado en recurso (lee `ticketID` de la ruta) o verificación en servicio; CA-9 |
| Notificación fuera de la transacción deja estado sin aviso | Media | `INotificacionService` recibe `conn`/`tx` (INV-7); CA-13 |

## Preguntas abiertas

- Código de error al asignar a un no-Trabajador (readme: `422` sin `code`) → **respondida `(asumido)`**: `VALIDATION_ERROR`.
- Trabajador asignado intentando Resuelto → Cerrado o reapertura (`403`/`422` no especificado) → **respondida `(asumido)`**: `422 INVALID_TRANSITION`.
- Notificar al solicitante en reapertura y en Cerrado → **respondida (confirmada por readme §3.2)**: toda transición notifica al solicitante con `TICKET_ESTADO` vía `INotificacionService`.
- `estadoId` inexistente → **respondida `(asumido)`**: `400 VALIDATION_ERROR`.
- Ticket de otro condominio en `PATCH`/`POST` → **respondida `(asumido)`**: `404 NOT_FOUND` (no revela existencia).
- ¿"Trabajador asignado" exige `Terminado = 0`? → **respondida `(asumido)`**: basta fila con `bEliminado = 0`.
- Tickets con `CasaID = NULL` en el listado del admin → **pendiente** (no afecta Must: el readme define el filtro vía `CasaID`).
- Endpoint de candidatos Trabajador para asignar (HU-TKT-03 "solo aparecen usuarios activos con perfil Trabajador") → **pendiente** (fuera del Ticket 16; lo necesita FE-038).
- Texto del comentario de sistema → **respondida `(asumido)`**: "Estado: <origen> → <destino>".

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [x] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
- [x] Si Tipo = Refactor → CHAR-x poblado con baseline capturado por MCP (no aplica: Feature)
- [x] Toda propiedad PBT-x es universal sobre el dominio de entrada (no un caso puntual)
