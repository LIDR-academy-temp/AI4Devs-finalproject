# FE-047: Delta — UI Visitas y reservas

## Páginas nuevas

| Archivo | Ruta | Acceso |
|---------|------|--------|
| `AdminVisitasPage.tsx` | /admin/visitas | [Authorize Admin] |
| `AreasYReservacionesPage.tsx` | /areas-comunes | [Authorize] |

## Hooks nuevos

| Archivo | Endpoint |
|---------|----------|
| `features/visitas/useVisitas.ts` | GET /VTS/Visitas |
| `features/visitas/useAreasComunes.ts` | GET /VTS/AreasComunes |
| `features/visitas/useReservaciones.ts` | GET /VTS/ReservacionesArea/mias |

## Tipos nuevos

`shared/types/visitas.ts` — `VisitaListItem`, `AreaComun`, `ReservacionArea`, `RegistrarVisitaRequest`, `CrearReservacionRequest`.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `App.tsx` | +2 rutas: /areas-comunes, /admin/visitas |

## Tests

- Vitest: 8/8 ✅ (`AdminVisitasPage.test.tsx`)
- `tsc --noEmit` limpio

## Notas

- Tres hooks con bug apiGet (raw response → estado) — refactor post-entrega.
- FechaSalida null se muestra como "En visita" en la tabla admin.
