[← index](_index.md)

# Spec — VTS áreas y reservas (módulo completo)

## User story
Como **administrador**, doy de alta/edito/elimino áreas comunes y gestiono reservas del condominio.  
Como **residente**, reservo amenidades desde `/areas-comunes`.

## Alcance
- CRUD REST Cuarta en `/VTS/AreasComunes` (sin legacy NESGo en SPA).
- Validación INV-2 al crear reserva (`RequiereReservacion=1`).
- Admin cancela reserva (`PATCH .../cancelar`).
- UI admin pestaña **Áreas comunes** en `/admin/areas-reservas`.

## Fuera de alcance
- GraphQL legacy AreasComunes.
- Confirmar reserva (solo cancelar admin en este ticket).

## Criterios de aceptación
- [x] CA-1 GET áreas devuelve array camelCase; residente ve áreas reservables.
- [x] CA-2 Admin CRUD áreas persiste en `vts.AreasComunes` (soft delete).
- [x] CA-3 POST reserva 201 o 409 solape; 422 si área no reservable.
- [x] CA-4 Admin listado + calendario + cancelar en UI.
- [x] CA-5 Tests API/unit en verde.
