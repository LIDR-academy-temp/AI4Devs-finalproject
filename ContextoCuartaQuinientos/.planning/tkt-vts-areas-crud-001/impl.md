[← index](_index.md) | [design](design.md)

# Impl — VTS-AREAS-CRUD-001

## Backend
- `AreaComunUpsertRequest`, CRUD repo/service, `AreasComunesController` POST/PUT/DELETE admin.
- `PATCH /VTS/ReservacionesArea/{id}/cancelar`.
- INV-2 en `CrearReservacionAsync`; DTOs camelCase.

## Frontend
- `AdminAreasComunesSection` + tab en `AdminAreasReservasPage`.
- Cancelar reserva en listado admin.

## Pruebas
- `CuartaVisitasServiceTests` (+ área no reservable, CRUD smoke).
- `AreaComunDtoJsonTests`.

## Deploy prod
1. `DB-001` + `DB-009` + seed `20261029_vts_areas_menus_y_seed.sql` si aplica.
2. Publicar GraphApi + Web.

## Estado
**ARCHIVADO** — smoke prod 2026-10-30; `dotnet test` CuartaVisitas 25/25.
