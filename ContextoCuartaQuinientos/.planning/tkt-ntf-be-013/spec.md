[← index](_index.md) | [design →](design.md)

# spec.md — NTF-BE-013: Servicio de notificaciones in-app

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — agentes `desarrollador-api`, `desarrollador-sql`, `api-tester`)
> **Tipo:** Feature

## User story

Como usuario autenticado (Administrador, Residente, Guardia o Trabajador), quiero una bandeja de notificaciones in-app con contador de no leídas y la opción de marcarlas como leídas —y, como Administrador, enviar un aviso general a todos los residentes activos—, para enterarme de avisos, tickets y pagos sin depender de otro canal.

## Contexto / problema

- **Actual:** no existe código de notificaciones. El esquema físico tiene `ntf.Notificaciones`, `ntf.NotificacionesVisualizadas` y `ntf.TiposNotificacion` (verificado en `SQL/cuartaquinientos_schema.sql` según [specs/notificaciones.md](../../specs/notificaciones.md)); `ntf.NotificacionesEntrega` es delta de DB-001 y los 9 tipos los siembra DB-002.
- **Esperado (readme §6 Ticket 13):** `NotificacionesController` expone `GET /NTF/Notificaciones`, `PATCH /NTF/Notificaciones/{id}/leida` y `POST /NTF/Notificaciones/aviso`; `INotificacionService` es el **único** punto que inserta en `ntf.Notificaciones` y encola la entrega Telegram (`PENDIENTE`) en `ntf.NotificacionesEntrega` (ADR-009).
- **Decisión de modelo (readme §3.2):** la marca de leído es una fila en `ntf.NotificacionesVisualizadas` (`NotificacionID`, `UsuarioID`, `FechaLectura`); "no leída" = sin fila. La columna física heredada `ntf.Notificaciones.Leido` no se lee ni se escribe.
- **Consumidores ya diseñados:** [TKT-BE-001](../tkt-be-001/_index.md) (`NotificarAdministradoresAsync(conn, tx, "TICKET_NUEVO", …)`), [FNZ-BE-011](../tkt-fnz-be-011/_index.md) (pago registrado), [DASH-BE-014](../tkt-dash-be-014/_index.md) (reusa el conteo de no leídas), FE-040 (bandeja + badge) y BOT-BE-020 (Fase 2, consume el outbox).
- **Non-goals NTF Fase 1 (readme §5):** solo in-app; Telegram solo se **encola**; sin email, preferencias, plantillas ni digest.

## Alcance (MoSCoW)

### Must — sin esto el requerimiento no cierra
- `INotificacionService` (`NotificarUsuarioAsync`, `NotificarAdministradoresAsync`, `AvisoGeneralAsync`) con conexión/transacción del llamador; único punto de inserción en `ntf.Notificaciones`.
- Encolado de una fila `PENDIENTE` (canal `TELEGRAM`) en `ntf.NotificacionesEntrega` por cada destinatario con `bot.CuentasTelegram.Activo = 1`, en la misma transacción.
- `GET /NTF/Notificaciones?pagina=1&tamano=20`: bandeja del `sub`, `bEliminado = 0`, orden `FechaCreacionNotificacion DESC`, con `totalNoLeidas`.
- `PATCH /NTF/Notificaciones/{id}/leida`: valida propiedad (`403` si no es suya) e inserta idempotente en `ntf.NotificacionesVisualizadas`.
- `POST /NTF/Notificaciones/aviso`: solo `bAdministrador = 1`; `INSERT … SELECT` para cada residente activo en una transacción.
- `TipoNotificacionID` resuelto por nombre en `ntf.TiposNotificacion.TipoNotificacion`; auditoría estándar en cada insert.
- Tests: bandeja propia, marcar leída ajena (`403`), aviso masivo llega a todos los residentes activos.

### Should — esperado; negociable vía escalación al usuario si tiempo/riesgo aprieta
- Validación FluentValidation de `pagina`/`tamano` y del cuerpo del aviso con `ProblemDetails` `VALIDATION_ERROR` (asumido: límites exactos).
- `404 NOT_FOUND` al marcar una notificación inexistente o eliminada (asumido).

### Could — solo si sale gratis durante la implementación; jamás bloquea
- Respuesta de `POST /aviso` con el número de destinatarios (asumido).

### Won't — fuera de alcance explícito
- Envío real a Telegram, reintentos y transición `ENVIADA`/`FALLIDA` (BOT-BE-020, Fase 2).
- Email, preferencias por usuario, plantillas configurables, digest (readme §5 Non-goals NTF).
- Leer o escribir la columna heredada `ntf.Notificaciones.Leido` o eliminarla.
- Borrado de notificaciones (físico o lógico) desde la bandeja.
- Endpoints de `/NTF/NotificacionesVisualizadas` y `/NTF/TiposNotificacion` (inventario §4 sin verbos en §6).
- Frontend de bandeja y badge (FE-040).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | Sin DDL. Lecturas/escrituras Dapper sobre `ntf.Notificaciones`, `ntf.NotificacionesVisualizadas`, `ntf.TiposNotificacion`, `ntf.NotificacionesEntrega`, `bot.CuentasTelegram`, `sgr.Usuarios`, `sgr.Perfiles`, `tkt.CanalesTicket` (requiere DB-001 y DB-002 aplicados). |
| `backend:cuartaquinientos-api` | Nuevo `NotificacionesController` (`/NTF/Notificaciones`), `INotificacionService`/`NotificacionService`, `NotificacionRepository`, DTOs y validadores. |
| `integrations:cuartaquinientos-bot` | Solo contrato de outbox: filas `PENDIENTE` canal `TELEGRAM` que consumirá BOT-BE-020. Sin cambios en el bot Python. |

## Invariantes — reglas existentes que DEBEN sobrevivir al cambio

| # | Regla existente que NO se toca | Fuente |
|---|---|---|
| INV-1 | Cada notificación pertenece a un `UsuarioID` (FK) y a un `TipoNotificacionID` (FK) del catálogo. | `specs/notificaciones.md` INV-1 |
| INV-2 | El badge cuenta las notificaciones del usuario con `bEliminado = 0` sin fila en `ntf.NotificacionesVisualizadas`. | `specs/notificaciones.md` INV-2; readme §3.2 |
| INV-3 | Marcar leída inserta fila en `ntf.NotificacionesVisualizadas` (`FechaLectura` = ahora) solo si la notificación es del usuario autenticado (`403` si no); idempotente; no borra la notificación. | `specs/notificaciones.md` INV-3; readme §6 Ticket 13 |
| INV-4 | Entrega Telegram idempotente: índice único `(NotificacionID, CanalID)` en `ntf.NotificacionesEntrega`. | `specs/notificaciones.md` INV-4; readme §2.5 |
| INV-5 | El aviso general genera una notificación por cada residente activo (perfil Residente, `sgr.Usuarios.bActivo = 1`) en una única transacción. | `specs/notificaciones.md` INV-5; readme §6 Ticket 13 |
| INV-6 | Soft delete `bEliminado`; nunca borrado físico. | `specs/notificaciones.md` INV-6; CLAUDE.md |
| INV-7 | `INotificacionService` es el único punto que inserta en `ntf.Notificaciones`; recibe conexión/transacción del llamador y encola `PENDIENTE` (canal TELEGRAM) si `bot.CuentasTelegram.Activo = 1`; un fallo de Telegram no revierte la operación de negocio. | `specs/notificaciones.md` INV-7; readme ADR-009 |
| INV-8 | Catálogos (tipo de notificación, canal) se resuelven por nombre; nada de IDs hardcodeados. | CLAUDE.md; readme §5 DoD; `specs/notificaciones.md` Catálogos |
| INV-9 | La identidad sale del JWT (`sub` = `UsuarioID`); nunca del cuerpo de la petición. | readme ADR-003; CLAUDE.md |

## Criterios de aceptación

- [ ] **CA-1 [M]**: bandeja propia paginada — **Dado** un usuario con 25 notificaciones propias (`bEliminado = 0`), 3 de ellas con fila en `ntf.NotificacionesVisualizadas`, y notificaciones de otros usuarios **Cuando** llama `GET /NTF/Notificaciones?pagina=1&tamano=20` con su JWT **Entonces** `NotificacionesController` responde `200` con 20 elementos solo de su `UsuarioID`, ordenados por `FechaCreacionNotificacion DESC`, y `totalNoLeidas = 22`.
- [ ] **CA-2 [M]**: paginación por defecto — **Dado** el mismo usuario **Cuando** llama `GET /NTF/Notificaciones` sin parámetros **Entonces** recibe la página 1 con tamaño 20; con `?pagina=2` recibe los 5 restantes.
- [ ] **CA-3 [M]**: bandeja vacía — **Dado** un usuario sin notificaciones **Cuando** llama `GET /NTF/Notificaciones` **Entonces** recibe `200` con lista vacía y `totalNoLeidas = 0` (readme §5.0.1 poke-hole 2).
- [ ] **CA-4 [M]**: marcar leída propia — **Dado** una notificación propia sin fila de lectura **Cuando** llama `PATCH /NTF/Notificaciones/{id}/leida` **Entonces** `NotificacionService` inserta una fila en `ntf.NotificacionesVisualizadas` con su `UsuarioID` y `FechaLectura` = ahora, y el siguiente `GET` devuelve `totalNoLeidas` reducido en 1.
- [ ] **CA-5 [M]**: marcar leída ajena — **Dado** una notificación de otro usuario **Cuando** llama `PATCH /NTF/Notificaciones/{id}/leida` **Entonces** responde `403` `ProblemDetails` con `code = FORBIDDEN` y no se inserta ninguna fila.
- [ ] **CA-6 [M]**: aviso masivo — **Dado** 3 residentes activos, 1 residente con `bActivo = 0` y 1 Guardia activo **Cuando** un Administrador llama `POST /NTF/Notificaciones/aviso` con `titulo` y `mensaje` **Entonces** `AvisoGeneralAsync` inserta exactamente 3 filas en `ntf.Notificaciones` con el tipo `AVISO_GENERAL` resuelto por nombre, dentro de una sola transacción.
- [ ] **CA-7 [M]**: aviso por no-Administrador — **Dado** un usuario con perfil Residente, Guardia o Trabajador **Cuando** llama `POST /NTF/Notificaciones/aviso` **Entonces** responde `403` y no se inserta nada.
- [ ] **CA-8 [M]**: encolado Telegram — **Dado** que 2 de los 3 residentes activos tienen `bot.CuentasTelegram.Activo = 1` **Cuando** se ejecuta el aviso de CA-6 **Entonces** existen exactamente 2 filas en `ntf.NotificacionesEntrega` con `Estado = 'PENDIENTE'` y el `CanalID` resuelto por nombre `TELEGRAM` en `tkt.CanalesTicket`, y ninguna para el residente sin vínculo.
- [ ] **CA-9 [M]**: transacción del llamador — **Dado** un servicio consumidor (p. ej. `TicketService` de TKT-BE-001) que llama `NotificarAdministradoresAsync(conn, tx, "TICKET_NUEVO", …)` **Cuando** su transacción hace rollback **Entonces** no queda ninguna fila en `ntf.Notificaciones` ni en `ntf.NotificacionesEntrega`.
- [ ] **CA-10 [M]**: auditoría — **Dado** cualquier insert de `NotificacionService` **Cuando** se consulta la fila **Entonces** `Creado` = correo del autor (claim `correo`), `UsuarioCreacionID` = `UsuarioID` del autor, `FechaCreacion` poblada y `bEliminado = 0`.
- [ ] **CA-11 [S]**: validación de entrada — **Dado** `tamano = 0`, `pagina = 0` o un aviso con `titulo` vacío **Cuando** se llama el endpoint **Entonces** responde `400` `ProblemDetails` `VALIDATION_ERROR` (asumido: límite máximo de `tamano` en Preguntas abiertas).
- [ ] **CA-12 [S]**: notificación inexistente — **Dado** un `id` que no existe o tiene `bEliminado = 1` **Cuando** se llama `PATCH /NTF/Notificaciones/{id}/leida` **Entonces** responde `404` `NOT_FOUND` (asumido).
- [ ] **CA-13 [M]**: tipo no sembrado — **Dado** que `ntf.TiposNotificacion` no contiene el nombre solicitado **Cuando** `NotificacionService` intenta notificar **Entonces** lanza error explícito, no inserta con un ID por defecto y la transacción del llamador se revierte (asumido: código de error).
- [ ] **CA-R1 [M]**: regresión de INV-3 — **Dado** una notificación propia ya marcada como leída **Cuando** se llama de nuevo `PATCH /NTF/Notificaciones/{id}/leida` **Entonces** responde éxito, sigue existiendo exactamente una fila en `ntf.NotificacionesVisualizadas` para ese par (`NotificacionID`, `UsuarioID`) y la notificación no se borra.
- [ ] **CA-R2 [M]**: regresión de INV-7 — **Dado** el código de `GraphApi` **Cuando** se busca `INSERT INTO ntf.Notificaciones` **Entonces** solo aparece en `NotificacionRepository`, invocado únicamente desde `NotificacionService`.
- [ ] **CA-R3 [M]**: regresión de §3.2 / INV-2 — **Dado** notificaciones con `ntf.Notificaciones.Leido` en cualquier valor **Cuando** se calcula `totalNoLeidas` **Entonces** el resultado depende solo de la ausencia de fila en `ntf.NotificacionesVisualizadas` y ninguna consulta referencia `Leido`.

## Reutilización detectada (evidencia de la escalera — regla 6)

- `ntf.NotificacionesVisualizadas` (tabla ya existente en el físico) → se reutiliza como marca de leído (readme §3.2); descartado añadir columnas nuevas o usar `Leido`.
- `tkt.CanalesTicket` (WEB|TELEGRAM) → se reutiliza como catálogo único de canales para `ntf.NotificacionesEntrega.CanalID` (readme §2.5).
- `sgr.Usuarios` + `sgr.Perfiles` (`bActivo`, perfil Residente, `bAdministrador`) → destinatarios de aviso y de `NotificarAdministradoresAsync` ([specs/notificaciones.md](../../specs/notificaciones.md) Reutilización).
- `ICatalogoService` (resolución por nombre, diseñado en [TKT-BE-001](../tkt-be-001/design.md)) → se reutiliza para `TipoNotificacion` y `Canal` si ya existe al implementar; si no, resolución local por nombre (asumido).
- Vistas `vs*` → evaluado y descartado: ninguna vista es del esquema `ntf` ([specs/notificaciones.md](../../specs/notificaciones.md)); lectura Dapper con joins.

## Definition of Ready

- [x] **I**ndependent — depende de USR-BE-007 (JWT) y DB-001/DB-002, documentados como bloqueos en `_index.md`
- [x] **N**egotiable — Should/Could recortables vía escalación
- [x] **V**aluable — cada Must entrega bandeja, badge, aviso o el servicio que consumen TKT/FNZ
- [x] **E**stimable — 3 horas (readme §6 Ticket 13)
- [x] **S**mall — cada Must cabe en una sesión de implementador
- [x] **T**estable — cada Must tiene CA en Given/When/Then

- [x] Todos los Must tienen criterio de aceptación verificable en Given/When/Then
- [ ] Ningún Must depende de un dato/objeto no confirmado por MCP ni declarado aquí — BD no desplegada; verificación MCP pendiente Entrega 2 (objetos declarados en readme §3.2/§2.5)
- [x] Cada Must cabe en una sesión de implementador (regla "Small")
- [x] Instancias en scope identificadas (`target:instancia`)
- [x] Sin preguntas abiertas que afecten un Must
- [x] Sin dependencias con requerimientos no archivados (o documentadas y aceptadas)
- [x] Reutilización evaluada (peldaños 2-3 de la escalera) antes de proponer crear
- [x] Toda cita a otro TKT/objeto se releyó una vez más antes de cerrar

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Doble `PATCH` concurrente crea dos filas de lectura (no hay índice único declarado en `ntf.NotificacionesVisualizadas`) | Media | `INSERT … WHERE NOT EXISTS` en la misma sentencia; conteo por `NOT EXISTS` tolera duplicados; índice único queda en Preguntas abiertas |
| Aviso masivo con muchos residentes bloquea la transacción | Baja | `INSERT … SELECT` en una sola sentencia (readme Ticket 13); un solo condominio en Fase 1 |
| DB-002 no aplicado → tipo `AVISO_GENERAL` inexistente | Media | CA-13: error explícito y rollback; bloqueo documentado en `_index.md` |
| Consumidores (TKT-BE-001, FNZ-BE-011) inician antes que este ticket | Media | Contrato de `INotificacionService` fijado en `design.md`; readme permite mock en paralelo |
| Código nuevo lee `Leido` por inercia del esquema físico | Baja | CA-R3 + revisión de `auditor-codigo` |

## Preguntas abiertas

- Límite máximo de `tamano` (propuesta 100 → `400` si se excede) → **pendiente (asumido 100)**
- Código HTTP de `PATCH /leida` (propuesta `204`) y de `POST /aviso` (propuesta `201` con `{ destinatarios }`) → **pendiente (asumido)**
- ¿Se agrega índice único `(NotificacionID, UsuarioID)` en `ntf.NotificacionesVisualizadas` en un DB-00N futuro? → **pendiente** (no afecta Must: la idempotencia se garantiza en la sentencia)
- ¿El aviso general incluye a los propios Administradores o a Guardia/Trabajador? → **respondida: no; solo perfil Residente con `bActivo = 1` (readme §6 Ticket 13)**
- Longitudes de `titulo`/`mensaje` del aviso → **pendiente (asumido: las del DDL de `ntf.Notificaciones`, verificables en Entrega 2)**
- ¿`AvisoGeneralAsync` filtra también `sgr.Usuarios.bEliminado = 0`? → **respondida: sí, convención soft delete (CLAUDE.md)**

## Quick Checks — antes del handoff al implementador

- [x] Todo CA nombra el actor real (SP/controller/endpoint exacto) — sin "el sistema hace X"
- [x] Todo CA tiene criterio medible en Given/When/Then — sin adjetivos vagos
- [x] Reutilización evaluada (peldaños 2-3 escalera) antes de proponer crear
- [ ] Ningún Must depende de objeto no confirmado por MCP o declarado explícitamente — declarados en readme; MCP pendiente Entrega 2
- [x] Contexto/problema: actor real nombrado en la causa raíz — sin falsa agencia
- [x] Instancias en scope identificadas para cada Must (`target:instancia`)
- [x] Definition of Ready completa — ningún ítem con `(asumido)` sin notarlo en Preguntas abiertas
