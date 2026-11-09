[← index](_index.md) | [design →](design.md)

# spec.md — TKT-BE-001: Backend: crear ticket (repositorio Dapper + servicio + REST)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `api-tester`, `auditor-codigo`, `auditor-seguridad`)
> **Tipo:** Feature

## User story

Como residente, quiero reportar una incidencia (desde el bot vía REST y, a través de TKT-BE-002, desde la web), para que la administración la atienda con seguimiento formal en estado Nuevo.

## Contexto / problema

Hoy no existe código de aplicación (Entrega 1 = solo documentación; `GraphApi/` se genera en SETUP-000). No hay forma de crear un ticket: el esquema `tkt` existe en `SQL/cuartaquinientos_schema.sql` (DB-000) y DB-001 alinea los nombres lógicos (`Titulo`, `Descripcion`, `CasaID`, `FechaCreacion`, `tkt.PrioridadesTicket`, `TipoNotificacion`); DB-002 siembra los catálogos (estados, prioridades, categorías, canales, tipos de notificación).

Fuentes leídas: readme §6 Ticket 1 (contrato), §5 HU-TKT-01 y Non-goals TKT, §3.2 (diccionario lógico ↔ físico y máquina de estados: *(alta)* → Nuevo), §4 Endpoint 2 (`CrearTicketInput`), §2.5 (catálogos, `CasaOcupantes`, `CasaID`), ADR-001/008/009 (§2.5.1); [specs/tickets.md](../../specs/tickets.md) y [specs/notificaciones.md](../../specs/notificaciones.md).

Comportamiento esperado: `ITicketService.CrearTicketAsync` (servicio C# + repositorio Dapper, **sin SP** — el borrador con `prcCreateTicket` fue rechazado, readme §6 Prompt 1) valida con FluentValidation, comprueba que el perfil sea Residente, resuelve estado "Nuevo", prioridad, categoría y canal **por nombre** en sus catálogos, infiere `CasaID` de `sgr.CasaOcupantes` vigente, inserta en `tkt.Tickets` y notifica a los administradores activos vía `INotificacionService.NotificarAdministradoresAsync` (NTF-BE-013) en **una sola transacción** (`IDbTransaction`); tras el commit lee el ticket desde `tkt.vsTickets`. `TicketsController` (`POST /TKT/Tickets`) es un controller delgado que expone el servicio al bot; la web usa la mutation GraphQL de TKT-BE-002, que delega en el mismo servicio.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `ITicketService.CrearTicketAsync(CrearTicketInput, UsuarioActual)` con transacción `IDbTransaction` (insert + notificación; rollback completo ante fallo).
- `POST /TKT/Tickets` con `[Authorize(Roles = "Residente")]` → `201 Created` + `Location: /TKT/Tickets/{id}`; errores `ProblemDetails` (`400 VALIDATION_ERROR`, `403 FORBIDDEN`).
- Validaciones FluentValidation: `Titulo` requerido ≤ 200; `Descripcion` requerida ≤ 4 000; `Categoria` requerida y existente en `tkt.CategoriasTicket`; `Prioridad` válida o default "Media"; `Canal` WEB (default) o TELEGRAM validado contra `tkt.CanalesTicket`.
- Estado, prioridad, categoría y canal resueltos por catálogo **por nombre** (sin IDs hardcodeados).
- `UsuarioSolicitanteID` = claim `sub`; `CasaID` = casa vigente en `sgr.CasaOcupantes` (null si no tiene).
- `INSERT tkt.Tickets` parametrizado con auditoría (`Creado` = correo, `UsuarioCreacionID`, `FechaCreacion`) + `bEliminado = 0`.
- Notificación `TICKET_NUEVO` a administradores activos vía `INotificacionService` en la misma transacción.
- Respuesta leída desde `tkt.vsTickets` después del commit.
- Tests unitarios (éxito, perfil no residente, categoría inexistente) + test de integración del endpoint.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Endpoint visible en `/swagger` con request/response y códigos 201/400/401/403 documentados (DoD "Endpoint API", readme §5).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- ninguno

### Won't — fuera de alcance explícito
- Adjuntos (`tkt.DocumentosTicket` → `arc.Archivos`, `POST /TKT/Tickets/{ticketId}/Documentos`): Fase 2 con ARC-BE-028 (Non-goals TKT).
- Mutation GraphQL `crearTicket` (es TKT-BE-002) y handler del bot `/tickets` (TKT-BOT-003, Fase 2).
- Stored procedures de negocio (ADR-001).
- Envío real a Telegram: `INotificacionService` solo encola en `ntf.NotificacionesEntrega` (NTF-BE-013; envío en BOT-BE-020, Fase 2).
- SLA/escalamiento automático, calificación (HU-TKT-05), notificaciones push nativas (Non-goals TKT).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin cambios de esquema; reusa `tkt.Tickets`, catálogos `tkt.*`, `sgr.CasaOcupantes`, `tkt.vsTickets` (lectura/escritura por Dapper) |
| `backend:cuartaquinientos-api` | Nuevo `ITicketService.CrearTicketAsync`, `TicketRepository`, `CrearTicketInputValidator`, resolución de catálogos y `TicketsController.Crear` (`POST /TKT/Tickets`) |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Todo ticket nace en estado **Nuevo** | `specs/tickets.md` INV-1; readme §3.2 máquina de estados |
| INV-2 | `EstadoTicketID` y `PrioridadTicketID` siempre referencian un valor del catálogo (nunca texto libre ni enteros arbitrarios) | `specs/tickets.md` INV-2 |
| INV-3 | Título máximo 200 caracteres | `specs/tickets.md` INV-4; readme §5 HU-TKT-01 |
| INV-4 | El solicitante es `UsuarioSolicitanteID` = claim `sub`, nunca del input; `CasaID` se infiere de `sgr.CasaOcupantes` vigente | `specs/tickets.md` INV-7; readme §4 Endpoint 1 (nota `sub`) |
| INV-5 | Todo ticket tiene `CategoriaTicketID` y `CanalID` (default WEB) de catálogo; prioridad default Media | `specs/tickets.md` INV-11 |
| INV-6 | Soft delete con `bEliminado`; el ticket nace con `bEliminado = 0` y nunca se borra físicamente | `specs/tickets.md` INV-9 |
| INV-7 | `INotificacionService` es el único punto que inserta en `ntf.Notificaciones`; recibe conexión/transacción del llamador | `specs/notificaciones.md` INV-7 |
| INV-8 | Cada notificación pertenece a un `UsuarioID` y a un `TipoNotificacionID` del catálogo (resuelto por `TipoNotificacion`) | `specs/notificaciones.md` INV-1 |
| INV-9 | Un fallo de Telegram nunca revierte el ticket (entrega por outbox, Fase 1 solo encola) | ADR-009 (readme §2.5.1); `specs/notificaciones.md` INV-7 |
| INV-10 | Sin stored procedures de negocio: servicios C# + Dapper con consultas parametrizadas | ADR-001 (readme §2.5.1); readme §2.5 inyección SQL |

## Criterios de aceptación

- [ ] **CA-1 [M]**: alta exitosa — **Dado** un JWT de perfil Residente (`sub` = 7) con casa vigente 12 en `sgr.CasaOcupantes` y catálogos de DB-002 sembrados **Cuando** llama `POST /TKT/Tickets` con `{ titulo: "Fuga de agua", descripcion: "…", categoria: "Agua" }` **Entonces** `TicketsController` responde `201 Created` con `Location: /TKT/Tickets/{id}` y el cuerpo leído de `tkt.vsTickets` muestra estado "Nuevo", prioridad "Media", canal "WEB", `UsuarioSolicitanteID = 7`, `CasaID = 12`
- [ ] **CA-2 [M]**: perfil no residente — **Dado** un JWT de perfil Administrador, Guardia o Trabajador **Cuando** llama `POST /TKT/Tickets` (o `ITicketService.CrearTicketAsync` directamente) **Entonces** la respuesta es `403` con `ProblemDetails.code = FORBIDDEN` (el servicio devuelve `Result.Fail("FORBIDDEN")`) y `COUNT(*)` de `tkt.Tickets` no cambia
- [ ] **CA-3 [M]**: título inválido — **Dado** un Residente **Cuando** envía `titulo` vacío o de 201 caracteres **Entonces** `CrearTicketInputValidator` rechaza y el endpoint responde `400 VALIDATION_ERROR` con `errors.titulo`, sin insert
- [ ] **CA-4 [M]**: descripción inválida — **Dado** un Residente **Cuando** envía `descripcion` vacía o de 4 001 caracteres **Entonces** `400 VALIDATION_ERROR` con `errors.descripcion`, sin insert
- [ ] **CA-5 [M]**: categoría requerida/inexistente — **Dado** un Residente **Cuando** omite `categoria` o envía `categoria: "Plomería"` (no existe en `tkt.CategoriasTicket`) **Entonces** `400 VALIDATION_ERROR` con `errors.categoria` y ningún insert
- [ ] **CA-6 [M]**: prioridad y canal — **Dado** un Residente **Cuando** envía `prioridad: "Alta", canal: "TELEGRAM"` **Entonces** el ticket queda con los IDs resueltos por nombre en `tkt.PrioridadesTicket` y `tkt.CanalesTicket`; **Cuando** envía `prioridad: "Urgente"` o `canal: "EMAIL"` **Entonces** `400 VALIDATION_ERROR`
- [ ] **CA-7 [M]**: solicitante desde el JWT — **Dado** un body que incluye `usuarioSolicitanteId: 99` **Cuando** un Residente con `sub` = 7 llama `POST /TKT/Tickets` **Entonces** el ticket se guarda con `UsuarioSolicitanteID = 7` (el campo del body se ignora)
- [ ] **CA-8 [M]**: residente sin casa vigente — **Dado** un Residente sin fila vigente en `sgr.CasaOcupantes` **Cuando** crea un ticket válido **Entonces** `201` con `CasaID = NULL`
- [ ] **CA-9 [M]**: notificación en la transacción — **Dado** 2 administradores activos (`sgr.Perfiles.bAdministrador = 1`, `bActivo = 1`, `bEliminado = 0`) **Cuando** un Residente crea un ticket **Entonces** `INotificacionService.NotificarAdministradoresAsync` inserta 2 filas en `ntf.Notificaciones` con tipo `TICKET_NUEVO`, en la misma transacción que el `INSERT tkt.Tickets`
- [ ] **CA-10 [M]**: rollback completo — **Dado** que `NotificarAdministradoresAsync` lanza excepción (mock) **Cuando** `TicketService.CrearTicketAsync` se ejecuta **Entonces** se hace `Rollback` y no queda fila nueva en `tkt.Tickets` ni en `ntf.Notificaciones`
- [ ] **CA-11 [M]**: auditoría — **Dado** un alta exitosa **Cuando** se consulta la fila en `tkt.Tickets` **Entonces** `Creado` = claim `correo`, `UsuarioCreacionID` = `sub`, `FechaCreacion` y `FechaCreacionTicket` en UTC (`SYSUTCDATETIME()`), `bEliminado = 0`
- [ ] **CA-12 [M]**: sin token — **Dado** una petición sin `Authorization` **Cuando** llama `POST /TKT/Tickets` **Entonces** `401` sin insert
- [ ] **CA-13 [S]**: contrato publicado — **Dado** el API en Development **Cuando** se abre `/swagger` **Entonces** `POST /TKT/Tickets` muestra request `CrearTicketInput` y respuestas 201/400/401/403
- [ ] **CA-R1 [M]**: regresión de INV-1 e INV-2 — **Dado** cualquier combinación válida de entrada (con o sin prioridad/canal) **Cuando** `TicketService.CrearTicketAsync` inserta **Entonces** `EstadoTicketID` corresponde siempre a "Nuevo" en `tkt.EstadosTickets` y `PrioridadTicketID`/`CategoriaTicketID`/`CanalID` son FKs válidas de su catálogo
- [ ] **CA-R2 [M]**: regresión de INV-7/INV-9 — **Dado** un administrador destinatario vinculado a Telegram (`bot.CuentasTelegram.Activo = 1`) **Cuando** un Residente crea un ticket **Entonces** la inserción en `ntf.Notificaciones` y `ntf.NotificacionesEntrega` (`PENDIENTE`) la hace solo `INotificacionService`; `TicketService` no escribe en tablas `ntf` directamente

## Reutilización detectada (evidencia de la escalera — regla 6)

- `tkt.Tickets` + catálogos `tkt.EstadosTickets`, `tkt.PrioridadesTicket`, `tkt.CategoriasTicket`, `tkt.CanalesTicket` → se reusan tal cual (DB-000/DB-001/DB-002); no se crean tablas.
- `tkt.vsTickets` (ampliada por DB-001 con categoría, canal, casa) → lectura post-commit; no se crea DTO de lectura paralelo a la vista.
- `sgr.CasaOcupantes` (§2.5) → fuente de `CasaID`; evaluado `sgr.Casas.PropietarioUsuarioID` y descartado porque no cubre arrendatarios.
- `INotificacionService.NotificarAdministradoresAsync` (NTF-BE-013) → se reusa; no se inserta en `ntf.*` desde `TicketService`.
- Stored procedure `prcCreateTicket` → evaluado y descartado (ADR-001).
- `ITicketService.CrearTicketAsync` → lo reutiliza TKT-BE-002 (GraphQL); una sola regla de negocio para web y bot.

## Definition of Ready

- [x] **I**ndependent — dependencias (USR-BE-007, DB-002, NTF-BE-013) documentadas en `_index.md`; NTF-BE-013 se puede mockear
- [x] **N**egotiable — el Should (swagger) es recortable vía escalación
- [x] **V**aluable — cada Must entrega el alta de ticket observable por REST
- [x] **E**stimable — 5 h (readme §6); sin incertidumbre técnica
- [x] **S**mall — cabe en una sesión de implementador
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [x] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí (objetos declarados en readme §3.2 / DB-001; verificación MCP pendiente para Entrega 2, BD no desplegada)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Catálogos vacíos (DB-002 no aplicado) → falla por estado/categoría inexistente | Alta | DB-002 bloquea el ticket; test de integración corre tras DB-000..DB-002 |
| Código escrito contra nombres físicos heredados (antes de DB-001) | Media | DB-001 se aplica antes de programar (ADR-008); queries solo con nombres lógicos §3.2 |
| NTF-BE-013 no disponible al implementar | Media | Mock de `INotificacionService` en unit tests; integración al cerrar NTF-BE-013 |
| Rol no reconocido por `[Authorize(Roles)]` si falta `RoleClaimType = "perfil"` | Media | Configuración de SETUP-000/USR-BE-007; CA-2 lo cubre |

## Preguntas abiertas

- Sin administradores activos, ¿se confirma el ticket? → **respondida `(asumido)`**: `NotificarAdministradoresAsync` no inserta filas y el ticket se confirma igual.
- `Descripcion` ≤ 4 000 con columna `NVARCHAR(MAX)` → **respondida**: validación de entrada (readme §6 Ticket 1, §4 Endpoint 2 y Ticket 2 usan el mismo límite).
- Campos extra en el body (`usuarioSolicitanteId`, `casaId`) → **respondida `(asumido)`**: se ignoran; `CrearTicketInput` no los declara (CA-7).

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
