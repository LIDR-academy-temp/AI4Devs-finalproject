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
- `/VTS/TipoIdentificacion`, `/VTS/LogUsoVisitas`

Verbos concretos `(asumido)`: GET (bitácora/áreas/reservas), POST (registrar visita/crear reserva), PATCH (salida/cambio de estado de reserva).

## Reutilización / objetos existentes (escalera)
- **Reutiliza** vistas `vts.vsReservacionesArea` y `vts.vsVisitasGeneradas` para lectura (patrón Dapper + vistas, sin SPs).
- **Reutiliza** `sgr.Usuarios` (residente/visitado) y `sgr.Casas` (casa a visitar).
- **Reutiliza** Notificaciones: reserva confirmada → `ntf.Notificaciones` tipo `RESERVA_CONFIRMADA` (delta sembrado) + entrega Telegram.
- **Reutilizado por** el bot (HU-BOT-08) que orquesta la reserva llamando al endpoint de dominio (no duplica lógica).
- Pase QR / visitas generadas: la referencia frontend tiene cobertura (`PaseQr`, `GestionPaseQr`).

## Deltas del proyecto (nuevo)
- Tipo de notificación `RESERVA_CONFIRMADA` sembrado en `ntf.TiposNotificacion` (delta).
- Reserva por bot (HU-BOT-08) como nuevo canal de la misma capacidad (sin cambio de esquema; reutiliza `vts.ReservacionesArea`).
- No hay deltas de esquema propios de `vts` (el modelo de visitas/áreas se conserva).

## Notas
- Sin stored procedures.
- Corrección de dominio: `VTS` = Visitas y Áreas Comunes, NO Vehículos (alucinación del borrador viejo).
- Nombres reales del esquema español; soft delete `bEliminado`.
- SPA admin: `AdminVisitasPage` (`/admin/visitas`) — split + `usuarioVisitadoId` en alta; salida sin `alert` ([[FE-CRUD-003]]).
- SPA residente: `AreasYReservacionesPage` (`/areas-comunes`) — Zod + `FormModal`, `POST /VTS/ReservacionesArea`, hooks `useAreasComunes`/`useReservaciones` con `apiGet` desestructurado ([[FE-CRUD-004]]).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-26 | [[FE-CRUD-003]] | UI admin visitas al patrón `cq-admin` (sin cambio de contrato API VTS) |
| 2026-10-27 | [[FE-CRUD-004]] | Residente reservas: kit UI + fix contrato `apiGet` en hooks visitas |
