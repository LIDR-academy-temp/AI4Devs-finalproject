# 20261030 — VTS-AREAS-CRUD-001 — Entregables

Hub: [.planning/tkt-vts-areas-crud-001/_index.md](.planning/tkt-vts-areas-crud-001/_index.md)

## APIs

| Método | Ruta | Tipo |
|--------|------|------|
| POST | /VTS/AreasComunes | NUEVO |
| PUT | /VTS/AreasComunes/{id} | NUEVO |
| DELETE | /VTS/AreasComunes/{id} | NUEVO |
| PATCH | /VTS/ReservacionesArea/{id}/cancelar | NUEVO |

## DTOs / UI

- `AreaComunUpsertRequest`, `AdminAreasComunesSection`, tab en `AdminAreasReservasPage`

## Pruebas

- `CuartaVisitasServiceTests` — 25 tests PASS (Release, 2026-10-30)
- `AreaComunDtoJsonTests`
