# specs/visitas-areas.md — Visitas y Áreas Comunes (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Dos capacidades del esquema `vts`: (1) **bitácora de control de acceso** de visitantes (entrada/salida, identificación, autorización) y (2) **reserva de amenidades/áreas comunes** (salón, terraza, etc.) por horario y estado. **VTS NO es Vehículos** (los vehículos viven en `usr` — ver vehiculos.md). El bot también puede reservar áreas por chat (HU-BOT-08).

## Objetos del dominio (tablas + vistas reales)
Esquema `vts`:
- `vts.Visitas` — bitácora de acceso. Campos: `VisitaID` (PK), `VisitanteNombre`, `UsuarioVisitadoID` (FK), `CasaID` (FK), `TipoIdentificacionID` (FK), `NumeroIdentificacion`, `RutaDocumento`, `FechaEntrada`, `FechaSalida`, `Autorizado`.
- `vts.VisitasGeneradas` — visitas generadas/pre-registradas (p. ej. pase QR).
- `vts.AreasComunes` — amenidades. Campos: `AreaID` (PK), `Nombre`, `Capacidad`, `RequiereReservacion` (bit).
- `vts.ReservacionesArea` — reservas. Campos: `AreaID` (FK), `UsuarioID` (FK), `FechaInicio`, `FechaFin`, `ReservacionEstadoID` (FK).
- `vts.ReservacionesEstados` — catálogo de estados de reserva.
- `vts.TipoIdentificacion` — catálogo de tipos de identificación.
- `vts.LogUsoVisitas` — bitácora de uso.

Vistas reales:
- `vts.vsReservacionesArea` — reservas desnormalizadas (área, usuario, estado).
- `vts.vsVisitasGeneradas` — visitas generadas desnormalizadas.

Auditoría estándar + soft delete `bEliminado` en todas.

## Catálogos y estados
- `vts.TipoIdentificacion` — tipos de identificación (INE, pasaporte, etc. `(asumido)`).
- `vts.ReservacionesEstados` — estados de reserva (p. ej. inicial/pendiente, confirmada, cancelada `(asumido)`); referenciado por `vts.ReservacionesArea.ReservacionEstadoID`.
- `vts.AreasComunes.RequiereReservacion` (bit) — controla si el área exige reserva.
- Acceso: `vts.Visitas.Autorizado` (bit), `FechaEntrada`/`FechaSalida`.

## Invariantes (INV-x)
- **INV-1** Una visita liga `UsuarioVisitadoID` + `CasaID`; la salida (`FechaSalida`) solo se registra tras la entrada (`FechaEntrada`).
- **INV-2** Reservar solo áreas con `RequiereReservacion=1`.
- **INV-3** No se permite solapamiento: si el horario (`FechaInicio`–`FechaFin`) ya está reservado para el `AreaID`, la reserva se rechaza ("El área no está disponible en ese horario").
- **INV-4** Toda reserva nace en estado inicial (`ReservacionEstadoID` inicial de `vts.ReservacionesEstados`).
- **INV-5** `vts.ReservacionesArea.ReservacionEstadoID` debe existir en `vts.ReservacionesEstados` (FK de catálogo).
- **INV-6** Soft delete `bEliminado`; nunca borrado físico.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-VTS-01 [S]** — Registrar visitante (Vigilancia): registra nombre, identificación, casa a visitar y autorización → `FechaEntrada`; registra salida → `FechaSalida`.
- **HU-VTS-02 [S]** — Reservar área común: residente reserva amenidad libre (`RequiereReservacion=1`) por fecha; nace en estado inicial (`vts.ReservacionesArea`); horario ocupado → error.
- **HU-VTS-03 [S]** — Consultar bitácora de accesos (Admin): consultar entradas/salidas para investigar incidencias.
- **HU-BOT-08 [S]** — Reservar la terraza / área común por chat: si el área/horario está libre, el bot crea la reserva (`vts.ReservacionesArea`) y confirma; si el reglamento fija aforo/costo, el asistente lo cita; horario ocupado → ofrece alternativas.

## Endpoints (/{Dominio}/{Controller})
Controllers reales VTS (`/{DOMINIO}/{Controller}`):
- `/VTS/Visitas`, `/VTS/VisitasGeneradas`
- `/VTS/AreasComunes`, `/VTS/ReservacionesArea`, `/VTS/ReservacionesEstados`
- `/VTS/TiposIdentificacion` — catálogo tipos ID (GET; **POST/PUT/DELETE** admin [[FE-ADMIN-CAT-001]]; ruta REST plural en API).
- `/VTS/LogUsoVisitas`

**Reservas Cuarta (JWT — [[FE-047]], [[FE-CRUD-004]], [[VTS-AREAS-CRUD-001]]):**
- `GET /VTS/AreasComunes` — listado (JWT).
- `POST /VTS/AreasComunes` · `PUT /VTS/AreasComunes/{id}` · `DELETE /VTS/AreasComunes/{id}` — CRUD admin.
- `GET /VTS/ReservacionesArea/mias` — reservas del `sub`.
- `POST /VTS/ReservacionesArea` — crear reserva (anti-solape; INV-2 `RequiereReservacion`).
- `GET /VTS/ReservacionesArea/calendario` — ocupación comunitaria por `areaComunId` + rango `desde`/`hasta` (sin PII; excluye estado Cancelada por nombre) [[FE-VTS-CAL-001]].
- `GET /VTS/ReservacionesArea/admin` — listado paginado admin.
- `PATCH /VTS/ReservacionesArea/{id}/cancelar` — cancelación admin.

**Pase QR (JWT Cuarta — [[FE-VTS-PASE-001]]):**
- `GET /VTS/VisitasGeneradas/mias` — pases del `sub` (residente).
- `POST /VTS/VisitasGeneradas` — crear pase (201, `codigoQr` servidor).
- `POST /VTS/VisitasGeneradas/validar` — estado del QR (policy `AdminOGuardia`).
- `POST /VTS/VisitasGeneradas/{id}/usar` — marcar `bUsado=1`.
- Legacy con headers: GET raíz + alias `/legacy`; escritura `POST/PATCH/DELETE` bajo `*/legacy`.

Verbos concretos `(asumido)`: GET (bitácora/áreas/reservas), POST (registrar visita/crear reserva), PATCH (salida/cambio de estado de reserva).

## Reutilización / objetos existentes (escalera)
- **Reutiliza** vistas `vts.vsReservacionesArea` y `vts.vsVisitasGeneradas` para lectura (patrón Dapper + vistas, sin SPs).
- **Reutiliza** `sgr.Usuarios` (residente/visitado) y `sgr.Casas` (casa a visitar).
- **Reutiliza** Notificaciones: reserva confirmada → `ntf.Notificaciones` tipo `RESERVA_CONFIRMADA` (delta sembrado) + entrega Telegram.
- **Reutilizado por** el bot (HU-BOT-08) que orquesta la reserva llamando al endpoint de dominio (no duplica lógica).
- Pase QR / visitas generadas: SPA Cuarta `/visitas/pases`, `/guardia/validar-pase` + API JWT arriba ([[FE-VTS-PASE-001]]); referencia legacy `Web_diseño` (`PaseQr`).

## Deltas del proyecto (nuevo)
- Tipo de notificación `RESERVA_CONFIRMADA` sembrado en `ntf.TiposNotificacion` (delta).
- Reserva por bot (HU-BOT-08) como nuevo canal de la misma capacidad (sin cambio de esquema; reutiliza `vts.ReservacionesArea`).
- Vista `vts.vsVisitasGeneradas`: definición alineada DB-001 en repo SQL ([[FE-VTS-PASE-001]]); desplegar en BDs con binding roto.

## Notas
- Sin stored procedures.
- Corrección de dominio: `VTS` = Visitas y Áreas Comunes, NO Vehículos (alucinación del borrador viejo).
- Nombres reales del esquema español; soft delete `bEliminado`.
- SPA admin: `AdminVisitasPage` (`/admin/visitas`) — split + `usuarioVisitadoId` en alta; salida sin `alert` ([[FE-CRUD-003]]).
- SPA residente: `AreasYReservacionesPage` (`/areas-comunes`) — Zod + `FormModal`, `POST /VTS/ReservacionesArea`, hooks `useAreasComunes`/`useReservaciones` ([[FE-CRUD-004]]); calendario [[FE-VTS-CAL-001]].
- SPA admin: `AdminAreasReservasPage` (`/admin/areas-reservas`) — pestañas Áreas (CRUD) · Calendario · Listado (+ cancelar reserva) [[VTS-AREAS-CRUD-001]].

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-30 | [[PROD-RES-001]] | Menú residente `/visitas/pases` (SQL + nav supplement); combo Tipo ID en `MisPasesVisitaPage`. |
| 2026-10-30 | [[PROD-UX-001]] | Admin pases QR (badge vigente, panel CRUD); `bUnaOcasion`; usar → bitácora |
| 2026-10-30 | [[PROD-ADMIN-001]] | Cierre retro-SDD admin prod (SQL WMS/ARC, CRUD ANM/SGR, UI tabs); ARCHIVADO |
| 2026-10-30 | [[VTS-AREAS-CRUD-001]] | ARCHIVADO; smoke prod OK |
| 2026-10-29 | [[VTS-AREAS-CRUD-001]] | CRUD admin áreas REST + UI admin + cancelar reserva; contrato camelCase |
| 2026-10-28 | [[FE-VTS-CAL-001]] | GET calendario comunitario + UI semanal en `/areas-comunes` |
| 2026-10-26 | [[FE-CRUD-003]] | UI admin visitas al patrón `cq-admin` (sin cambio de contrato API VTS) |
| 2026-10-27 | [[FE-CRUD-004]] | Residente reservas: kit UI + fix contrato `apiGet` en hooks visitas |
| 2026-10-27 | [[FE-ADMIN-CAT-001]] | Tab Tipos de ID + CRUD; seed `DB-008`; casa en filtros admin |
| 2026-10-28 | [[FE-VTS-PASE-001]] | Pase QR JWT + SPA; vista `vsVisitasGeneradas` corregida; legacy write en `*/legacy` |
