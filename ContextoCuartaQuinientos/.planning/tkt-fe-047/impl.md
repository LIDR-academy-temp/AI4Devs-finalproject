# FE-047: Impl — UI Visitas y reservas

## Archivos nuevos

### `Web/src/shared/types/visitas.ts`
```ts
VisitaListItem         // visitaId, visitanteNombre, casaId?, numeroCasa?, tipoIdentificacion, numeroIdentificacion, fechaEntrada, fechaSalida?, autorizado
AreaComun              // areaComunId, nombre, descripcion?, capacidad?, requiereReservacion
ReservacionArea        // reservacionAreaId, areaComunId, areaComun?, fechaInicio, fechaFin, estado, fechaCreacion
RegistrarVisitaRequest
CrearReservacionRequest
```

### `Web/src/features/visitas/useVisitas.ts`
Llama `apiGet<VisitaListItem[]>('/VTS/Visitas?casaId=…&desde=…&hasta=…')`. Acepta params opcionales. Expone `{ visitas, loading, error, refetch }`.
> **Nota post-entrega**: `setVisitas(data)` asigna objeto completo de apiGet. Debe ser `setVisitas(data.data ?? [])`. Refactor pendiente.

### `Web/src/features/visitas/useAreasComunes.ts`
Llama `apiGet<AreaComun[]>('/VTS/AreasComunes')`. Expone `{ areas, loading, error, refetch }`.
> **Nota post-entrega**: misma variante del bug apiGet.

### `Web/src/features/visitas/useReservaciones.ts`
Llama `apiGet<ReservacionArea[]>('/VTS/ReservacionesArea/mias')`. Expone `{ reservaciones, loading, error, refetch }`.
> **Nota post-entrega**: misma variante del bug apiGet.

### `Web/src/pages/AdminVisitasPage.tsx`
Panel admin de visitas. Tabla con registros de entradas/salidas. Modal para registrar entrada (nombre, tipo ID, número ID, casaId). Botón de salida por visita activa. Usa `useVisitas` + `apiPost`/`apiPatch`.

### `Web/src/pages/AreasYReservacionesPage.tsx`
Vista residente. Lista áreas comunes (`useAreasComunes`) y reservaciones propias (`useReservaciones`). Formulario inline para crear reservación (`apiPost`).

### `Web/src/pages/AdminVisitasPage.test.tsx`
8 tests Vitest con Testing Library + userEvent.

| # | Test |
|---|------|
| 1 | Skeleton mientras carga |
| 2 | Tabla con visitas |
| 3 | "En visita" si no hay fecha de salida |
| 4 | Abre modal al pulsar "+ Registrar entrada" |
| 5 | Cierra modal al pulsar Cancelar |
| 6 | Llama apiPost al registrar entrada válida |
| 7 | Estado vacío si no hay visitas |
| 8 | Llama apiPatch al registrar salida |

Resultado: 8/8 ✅, `tsc --noEmit` limpio.

## Archivos existentes modificados

### `Web/src/App.tsx`
+2 rutas:
```tsx
<Route path="/areas-comunes" element={<AreasYReservacionesPage />} />
<Route path="/admin/visitas" element={<AdminVisitasPage />} />
```

### `Web/src/shared/lib/appNavigation.ts`
Sin entradas adicionales explícitas de VTS (rutas accesibles por URL directa y desde panel admin).

## Decisiones de diseño
- `AdminVisitasPage` muestra columna "FechaSalida" con texto "En visita" cuando es `null/undefined`.
- `AreasYReservacionesPage` combina áreas y reservaciones propias en una sola vista para el residente.
- Variante del bug apiGet documentada en los tres hooks — no bloqueante para PR, refactor post-entrega.
