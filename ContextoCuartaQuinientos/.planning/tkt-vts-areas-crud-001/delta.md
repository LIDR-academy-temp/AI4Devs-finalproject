# Delta — VTS-AREAS-CRUD-001

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- CRUD admin JWT en `POST/PUT/DELETE /VTS/AreasComunes` con soft delete.
- `PATCH /VTS/ReservacionesArea/{id}/cancelar` (admin).
- Pestaña **Áreas comunes** en `AdminAreasReservasPage` + cancelación en listado.

## Comportamiento modificado

- Reservas: validación INV-2 (`RequiereReservacion`) centralizada en `CrearReservacionAsync`.
- Contrato JSON camelCase en DTOs de áreas (`AreaComunUpsertRequest`, `[JsonPropertyName]`).

## Endpoints API

| Método | Ruta | Acción |
|--------|------|--------|
| POST | /VTS/AreasComunes | NUEVO (admin) |
| PUT | /VTS/AreasComunes/{id} | NUEVO (admin) |
| DELETE | /VTS/AreasComunes/{id} | NUEVO (admin) |
| PATCH | /VTS/ReservacionesArea/{id}/cancelar | NUEVO (admin) |

## Para el reviewer

- **Riesgo:** Bajo tras smoke prod 2026-10-30.
- **Probar:** CRUD área; reserva residente; cancelar admin.
