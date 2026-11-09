[← index](_index.md) | [spec](spec.md)

# Design — VTS-AREAS-CRUD-001

## Estrategia
Peldaño 4: extender `ICuartaVisitasRepository` + `AreasComunesController` (patrón `TiposIdentificacionController`).

## Backend
- DTO `AreaComunUpsertRequest` + `[JsonPropertyName]`.
- Repo: `ObtenerAreaAsync`, `Insert/Update/SoftDeleteAreaComunAsync`, `CancelarReservacionAsync`.
- Service: validaciones nombre, INV-2 en `CrearReservacionAsync`.

## Frontend
- `AdminAreasComunesSection` (clone ligero `AdminTiposIdentificacionSection`).
- Tab **Áreas comunes** en `AdminAreasReservasPage`.
- Acción cancelar en listado admin.

## Orden deploy
1. `DB-001` + `DB-009` en BD prod.
2. API.
3. SPA.

## Pruebas
- Unit: `CuartaVisitasServiceTests` área CRUD + cancelar (mock repo).
- JSON: `AreaComunDtoJsonTests`.
