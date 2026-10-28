# specs/notificaciones.md — Notificaciones (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Avisar al usuario sobre eventos relevantes del sistema (ticket nuevo/asignado/cambio de estado, pago registrado, cuota vencida, encuesta publicada, junta convocada, reserva confirmada, aviso general), con **tipado** y **marca de leído**. La **entrega por Telegram es un delta aditivo** por outbox `ntf.NotificacionesEntrega` (ADR-009): en Fase 1 solo se **encola** (`PENDIENTE`); el envío lo hace BOT-BE-020 en Fase 2.

## Objetos del dominio (tablas + vistas reales)
Esquema `ntf`:
- `ntf.Notificaciones` — aviso al usuario. Campos: `NotificacionID` (PK), `UsuarioID` (FK), `Titulo`, `Mensaje`, `FechaCreacionNotificacion`, `TipoNotificacionID` (FK). (NO tiene `Channel` EMAIL/SMS/PUSH ni `EnviadaTelegram` — eso es delta.) La columna física heredada `Leido` no se lee ni se escribe (readme §3.2).
- `ntf.NotificacionesVisualizadas` — registro de lectura por usuario: `NotificacionVisualizadaID` (PK), `NotificacionID` (FK), `UsuarioID` (FK), `FechaLectura` (verificado en `SQL/cuartaquinientos_schema.sql`).
- `ntf.TiposNotificacion` — catálogo de tipos; columna de nombre `TipoNotificacion` (DB-001 renombra la errata del físico antes de escribir código; el código usa solo `TipoNotificacion`).

Auditoría (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) + soft delete `bEliminado` en todas.

Vistas: ninguna de las 18 vistas `vs*` es del esquema `ntf` (verificado en el DDL); lectura por Dapper + joins.

## Catálogos y estados
- **`ntf.TiposNotificacion`** — 9 tipos sembrados por DB-002: `TICKET_NUEVO`, `TICKET_ESTADO`, `TICKET_ASIGNADO`, `PAGO_REGISTRADO`, `CUOTA_VENCIDA`, `ENCUESTA_PUBLICADA`, `JUNTA_CONVOCADA`, `RESERVA_CONFIRMADA`, `AVISO_GENERAL`. Se resuelven por nombre (`WHERE TipoNotificacion = '…'`).
- Estado de lectura: fila en `ntf.NotificacionesVisualizadas`; "no leída" = sin fila (alimenta el badge).
- **`ntf.NotificacionesEntrega` (delta)** — estado de entrega por canal: `Estado` ∈ [`PENDIENTE`|`ENVIADA`|`FALLIDA`].

## Invariantes (INV-x)
- **INV-1** Cada notificación pertenece a un `UsuarioID` (FK) y a un `TipoNotificacionID` (FK) del catálogo.
- **INV-2** El badge de no leídas cuenta las notificaciones del usuario con `bEliminado=0` sin fila en `ntf.NotificacionesVisualizadas`.
- **INV-3** Marcar leída inserta una fila en `ntf.NotificacionesVisualizadas` (`FechaLectura` = ahora) solo si la notificación es del usuario autenticado (`403` si no); idempotente (si ya existe no inserta otra); no borra la notificación.
- **INV-4 (delta)** La entrega a Telegram es idempotente: índice único `(NotificacionID, CanalID)` en `ntf.NotificacionesEntrega` (DB-001); un fallo deja `Estado=FALLIDA` (`MotivoError`) y se reintenta sin duplicar.
- **INV-5** El aviso general (HU-NTF-03) genera una notificación por cada residente activo (perfil Residente, `sgr.Usuarios.bActivo=1`) en una única transacción.
- **INV-6** Soft delete `bEliminado`; nunca borrado físico.
- **INV-7** `INotificacionService` es el **único** punto que inserta en `ntf.Notificaciones`; recibe la conexión/transacción del llamador y, si el usuario tiene `bot.CuentasTelegram.Activo = 1`, encola una fila `PENDIENTE` (canal TELEGRAM) en `ntf.NotificacionesEntrega`. Un fallo de Telegram no revierte la operación de negocio.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-NTF-01 [M]** — Recibir notificaciones del sistema: al ocurrir un evento (ticket, pago) llega notificación con título/estado; las no leídas (sin fila en `NotificacionesVisualizadas`) muestran badge con el número.
- **HU-NTF-02 [S]** — Marcar notificaciones como leídas: el usuario limpia su bandeja registrando la lectura en `ntf.NotificacionesVisualizadas`.
- **HU-NTF-03 [S]** — Enviar aviso general (Admin): todos los residentes activos lo reciben en portal; los vinculados también en Telegram (encolado en `ntf.NotificacionesEntrega`; envío en Fase 2).

## Endpoints (/{Dominio}/{Controller})
Readme §6 NTF-BE-013:
- `GET /NTF/Notificaciones?pagina=1&tamano=20` — bandeja del usuario (`UsuarioID = sub`, `bEliminado=0`, orden `FechaCreacionNotificacion DESC`) + `totalNoLeidas`.
- `PATCH /NTF/Notificaciones/{id}/leida` — marcar leída (`403` si no es suya).
- `POST /NTF/Notificaciones/aviso` — aviso masivo (`bAdministrador=1`, tipo `AVISO_GENERAL`).
- `/NTF/NotificacionesVisualizadas`, `/NTF/TiposNotificacion` — controladores del inventario §4 (verbos sin detallar en §6).

## UI web
- Campana en `AppShell` (FE-040): badge `totalNoLeidas`, dropdown con `PATCH …/leida`.

## Reutilización / objetos existentes (escalera)
- **Reutiliza** `sgr.Usuarios` (destinatario, `bActivo`) y `sgr.Perfiles` (`bAdministrador` para aviso general).
- **Reutilizada por** otros dominios vía `INotificacionService`: TKT (ticket nuevo/asignado/estado), FNZ (pago/cuota), ENC (encuesta publicada), JNT (junta convocada), VTS (reserva confirmada).
- **Fase 2:** el notificador saliente (BOT-BE-020) consume las filas `PENDIENTE`, llama a Telegram Bot API (`sendMessage`) y actualiza el estado de entrega.
- Patrón Dapper + servicios + FluentValidation, sin SPs.

## Deltas del proyecto (nuevo)
1. **Alineación de naming (DB-001):** columna `ntf.TiposNotificacion.TipoNotificacion` (renombra la errata del físico).
2. **Tipos sembrados (DB-002):** los 9 listados en Catálogos.
3. **`ntf.NotificacionesEntrega` (tabla nueva/delta):** `NotificacionEntregaID` (PK), `NotificacionID` (FK), `CanalID` (FK → `tkt.CanalesTicket`, DB-001), `Estado` [PENDIENTE|ENVIADA|FALLIDA], `FechaEnvio`, `Reintentos`, `MotivoError` (DB-001) — outbox idempotente hacia Telegram.
4. Notificador saliente backend → Telegram Bot API (Fase 2, BOT-BE-020).

## Notas
- Sin stored procedures.
- `ntf.Notificaciones` NO tiene canal ni bandera Telegram nativos; el canal se modela en `ntf.NotificacionesEntrega` (delta).
- DB-001 se ejecuta antes del primer endpoint: todo query usa `TipoNotificacion`, nunca el nombre físico con errata.
