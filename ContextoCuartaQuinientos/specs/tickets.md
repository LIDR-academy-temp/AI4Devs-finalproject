# specs/tickets.md — Tickets (source of truth SDD)
> Contexto de dominio para SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo del proyecto se marca (delta).
#tickets #tkt #soporte #incidencias #mantenimiento

## Propósito
Dominio de tickets de servicio / incidencias (esquema `tkt`). El residente reporta una incidencia (desde el portal web o Telegram), la administración la gestiona, asigna a personal de mantenimiento (Trabajador) y la lleva por su ciclo de estados hasta el cierre, con comentarios, adjuntos y notificaciones. Es el dominio central del flujo del bot para residentes y trabajadores.

## Objetos del dominio (tablas + vistas reales)
- `tkt.Tickets` (vista `tkt.vsTickets`) — TicketID(PK), Titulo, Descripcion, UsuarioSolicitanteID(FK), PrioridadTicketID(FK), EstadoTicketID(FK), CategoriaTicketID(FK → `tkt.CategoriasTicket`), CanalID(FK → `tkt.CanalesTicket`), CasaID(FK, unidad del solicitante), FechaCreacionTicket, FechaCreacion (auditoría), FechaCierre. (Físico actual `TituloTicket`/`DescripcionTicket` → readme `Titulo`/`Descripcion`; `FechaCreacion NOT NULL DEFAULT SYSUTCDATETIME()` y `CasaID` los agrega DB-001.)
- `tkt.EstadosTickets` — catálogo de estados.
- `tkt.PrioridadesTicket` — catálogo de prioridades (físico actual `tkt.PrioridadEstickets` → readme `tkt.PrioridadesTicket`, DB-001).
- `tkt.ComentariosTicket` — ComentarioTicketID(PK), TicketID(FK), UsuarioID(FK), Comentario, EsInterno, FechaComentario.
- `tkt.DocumentosTicket` — DocumentoTicketID(PK), TicketID(FK), ArchivoID(FK → `arc.Archivos`) (físico actual `DocumentoID` → readme `ArchivoID`, DB-001). Adjuntos/evidencia: **Fase 2**.
- `tkt.DocumentosComentarioTicket` — adjuntos ligados a un comentario.
- `tkt.TicketsUsuariosAsignados` (vista `tkt.vsTicketsUsuariosAsignados`) — asignación N:M ticket↔usuario con bandera `Terminado`.
- Auditoría estándar en todas las tablas + soft delete `bEliminado`.

## Catálogos y estados
- `tkt.EstadosTickets` — valores sembrados REALES: **Nuevo**, **En seguimiento**, **Resuelto**, **Cerrado**. (NO OPEN/IN_PROGRESS/CLOSED.)
- `tkt.PrioridadesTicket` — valores REALES: **Baja**, **Media**, **Alta**, **Crítica**. (NO enteros 1-5.)
- `tkt.CategoriasTicket` (delta) — **Agua, Electricidad, Jardinería, Seguridad, Limpieza, Otro**.
- `tkt.CanalesTicket` (delta) — **WEB, TELEGRAM**.
- Todos los catálogos anteriores los siembra DB-002 y el código los resuelve por nombre.

### Máquina de estados (readme §3.2; la valida `TicketService`, otra transición → `422 INVALID_TRANSITION`)
| Desde | Hacia | Quién | Efecto |
|---|---|---|---|
| *(alta)* | Nuevo | Residente (web / bot) | `FechaCreacionTicket`; notifica a administradores |
| Nuevo | En seguimiento | Administrador o trabajador asignado | Notifica al solicitante |
| En seguimiento | Resuelto | Administrador o trabajador asignado | Registra `FechaCierre` y notifica al solicitante |
| Resuelto | En seguimiento | Administrador (reapertura) | Limpia `FechaCierre` y notifica al solicitante |
| Resuelto | Cerrado | Administrador | Cierre administrativo; `FechaCierre` no cambia; notifica al solicitante |

Toda transición notifica al solicitante con el tipo `TICKET_ESTADO` vía `INotificacionService` (readme §3.2).

## Invariantes (INV-x)
- **INV-1** Todo ticket nace en estado **Nuevo**.
- **INV-2** El `EstadoTicketID` y el `PrioridadTicketID` siempre referencian un valor del catálogo respectivo (nunca texto libre ni enteros arbitrarios).
- **INV-3** Al pasar el ticket a **Resuelto** se registra `FechaCierre` y se notifica al solicitante.
- **INV-4** Título máximo 200 caracteres (validación previa al envío).
- **INV-5** La asignación a personal se materializa en `tkt.TicketsUsuariosAsignados` (N:M con bandera `Terminado`); el técnico asignado recibe notificación.
- **INV-6** Un comentario con `EsInterno = 1` (delta) es visible solo para Administrador; los comentarios normales son visibles para todos los involucrados.
- **INV-7** El solicitante del ticket es el `UsuarioSolicitanteID` (claim `sub`, nunca del input); la casa (`CasaID`) se infiere de `sgr.CasaOcupantes` vigente; en el bot, la unidad y el solicitante no se preguntan.
- **INV-8** Los adjuntos/evidencia (Fase 2) se ligan vía `tkt.DocumentosTicket` (a nivel ticket) o `tkt.DocumentosComentarioTicket` (a nivel comentario); no se guardan blobs en las columnas del ticket.
- **INV-9** Soft delete con `bEliminado`; un ticket no se borra físicamente.
- **INV-10** Solo se permiten las transiciones de la máquina de estados; cualquier otra → `422 INVALID_TRANSITION` ("Transición de estado no permitida").
- **INV-11** Todo ticket tiene `CategoriaTicketID` y `CanalID` (default WEB) de catálogo; prioridad default Media.

## Historias del dominio
- **HU-TKT-01 [M]** Crear ticket desde el portal web — categoría/título/descripción (prioridad opcional, Media por defecto) → ticket **Nuevo**, ligado a la casa, canal WEB; notifica a administradores; título ≤ 200; doble envío crea un solo ticket. Adjunto: **Fase 2**.
- **HU-TKT-02 [M]** Consultar mis tickets — lista propia del más reciente al más antiguo (título, prioridad, estado, fecha); filtro por estado; mensaje vacío.
- **HU-TKT-03 [M]** Gestionar tickets (Admin) — ver todos con filtros por estado y prioridad; asignar a usuario activo con perfil Trabajador (`tkt.TicketsUsuariosAsignados` + notificación); marcar Resuelto (registra `FechaCierre`); transición no permitida → error.
- **HU-TKT-04 [S]** Comentar en ticket — comentario en `tkt.ComentariosTicket`; comentario interno (`EsInterno`, delta) solo para Administrador.
- **HU-TKT-05 [C]** Calificar resolución — retroalimentación del residente. **(delta — requiere modelado nuevo)**.
- **HU-BOT-02 [M]** Abrir ticket desde Telegram (Fase 2) — flujo por botones; `POST /TKT/Tickets` con canal TELEGRAM y responde ID + estado Nuevo.
- **HU-BOT-10 [M]** Trabajador: mi próxima tarea + evidencia (chat) — `/tarea` muestra el ticket asignado más prioritario (`tkt.TicketsUsuariosAsignados`: unidad, categoría, descripción); iniciarlo → **En seguimiento**; subir foto → evidencia en `tkt.DocumentosTicket`, ticket a **Resuelto**, notifica al residente y ofrece la siguiente tarea.
- **HU-BOT-11 [M]** Levantar un ticket en segundos — pide solo categoría (botones) + descripción (foto opcional); infiere unidad y solicitante del perfil.

## Endpoints (/TKT/{Controller})
- `POST /TKT/Tickets` (Residente, bot, SPA; `201` + `Location`) — TKT-BE-001; web residente usa `apiPost` vía `useCrearTicket` ([[FE-CRUD-004]]), mismo `ITicketService`.
- `GET /TKT/Tickets/mis?estadoTicketId=&categoriaTicketId=&pagina=&tamano=` (residente, por `UsuarioSolicitanteID = sub`) — TKT-BE-015.
- `GET /TKT/Tickets/{ticketId}` (JWT: solicitante, admin o trabajador asignado) — detalle; sin acceso → `404 NOT_FOUND`.
- `GET|POST /TKT/Tickets/{ticketId}/comentarios` — hilo; POST max 2000 chars; `esInterno` solo admin en efecto (INV-6).
- `GET /TKT/Tickets/admin?estadoTicketId=&prioridadTicketId=&pagina=&tamano=` (Admin) · `PATCH /TKT/Tickets/{ticketID}/estado/{estadoId}` (máquina de estados) · `POST /TKT/TicketsUsuariosAsignados` — TKT-BE-016.
- `POST /TKT/Tickets/admin` · `PATCH /TKT/Tickets/{ticketId}/admin` · `DELETE /TKT/Tickets/{ticketId}/admin` — metadatos admin (`SoloAdministrador`); PATCH bloqueado si **Cerrado**; DELETE soft (`bEliminado`).
- `GET /TKT/PrioridadesTicket` (JWT) — lista `{ id, nombre, orden? }`.
- `POST|PUT|DELETE /TKT/CategoriasTicket/.../admin` · `POST|PUT|DELETE /TKT/PrioridadesTicket/.../admin` — CRUD catálogo admin; delete en uso → `409 CATALOG_IN_USE`; duplicado → `CATALOG_DUPLICADO`.
- **Fase 2:** `POST /TKT/Tickets/{ticketId}/Documentos` (multipart, ≤ 5 MB), `GET /TKT/Tickets/asignados` (Trabajador, BOT-BE-021).
- `/TKT/ComentariosTicket`, `/TKT/DocumentosTicket`, `/TKT/DocumentosComentarioTicket`.
- `/TKT/EstadosTickets`, `/TKT/PrioridadesTicket`, `/TKT/CategoriasTicket`, `/TKT/CanalesTicket` — catálogos.

## Reutilización / objetos existentes (escalera)
- Reusar `tkt.vsTickets` y `tkt.vsTicketsUsuariosAsignados` para lecturas y listados.
- Reusar el catálogo de estados/prioridades existente — NO inventar valores en inglés ni enteros.
- Reusar el endpoint `PATCH .../estado/{id}` para cualquier transición de estado (web y bot).
- Adjuntos ya modelados (`DocumentosTicket`, `DocumentosComentarioTicket`) — no crear almacenamiento paralelo.
- El bot llama a los mismos endpoints REST con el JWT del usuario — no duplicar lógica de negocio en el bot.

## Deltas del proyecto (nuevo)
- **(delta)** `tkt.CategoriasTicket` (catálogo: Agua, Electricidad, Jardinería, Seguridad, Limpieza, Otro) + columna `tkt.Tickets.CategoriaTicketID FK`.
- **(delta)** `tkt.CanalesTicket` (catálogo: WEB, TELEGRAM) + columna `tkt.Tickets.CanalID FK` — métricas de adopción por canal (Fase 1, sembrado en DB-002).
- **(delta)** `tkt.Tickets.CasaID FK` y `FechaCreacion` (DB-001).
- **(delta)** `tkt.ComentariosTicket.EsInterno BIT` — comentario visible solo a Administrador.
- **(delta)** Calificación de resolución (HU-TKT-05) — modelado nuevo por definir.

## Frontend admin (SPA) — vigente

- Ruta `/admin/tickets` ([[FE-CRUD-001]], [[FE-TKT-DET-001]]): listado filtrable; panel lateral view/create/edit; detalle + comentarios (internos admin); transiciones estado y asignación; soft delete con confirmación; enlace **Catálogos** → `/admin/tickets/catalogos`.
- Ruta `/admin/tickets/catalogos`: CRUD categorías y prioridades; tab **Estados** solo lectura (matriz INV-10). Etiquetas admin EST-2 (Abierto / En trabajo / …) con tooltip del catálogo en listado y acciones de estado.
- Prioridades en forms admin y residente: opciones desde `GET /TKT/PrioridadesTicket` (no hardcode FE).

## Frontend residente (SPA) — vigente

- Rutas `/tickets`, `/tickets/nuevo`, `/tickets/:ticketId` ([[FE-CRUD-004]], [[FE-TKT-DET-001]]): listado `useMisTickets`; creación `POST /TKT/Tickets`; detalle + comentarios públicos vía REST.

## Notas
- Sin stored procedures: Dapper + vistas `vs*` + servicios C#; validación con FluentValidation; transacciones vía `IDbTransaction`.
- Autorización por perfil vía JWT en toda ruta; ej. `TicketService.CrearTicketAsync()` valida el perfil antes de tocar la BD.
- Soft delete con `bEliminado` (NO `IsActive`). No existe tabla de auditoría dedicada (TicketAudit): la auditoría es por columnas.

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-30 | [[PROD-RES-001]] | `POST /TKT/Tickets` tolera ausencia de `tkt.CanalesTicket`; notificación admins no revierte alta. |
| 2026-10-23 | [[FE-CRUD-001]] | Admin tickets: tabla filtrable + panel detalle (patrón CRUD admin) |
| 2026-10-27 | [[FE-CRUD-004]] | Residente: crear ticket vía REST `useCrearTicket`; eliminado `tickets.gql.ts` |
| 2026-10-28 | [[FE-TKT-DET-001]] | Detalle/comentarios JWT; CRUD admin ticket; CRUD catálogos CAT/PRI; EST-2 admin; `/admin/tickets/catalogos` |
