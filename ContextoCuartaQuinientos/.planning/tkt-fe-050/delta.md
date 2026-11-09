# delta.md — tkt-fe-050 (WMS Almacén Frontend)

## Fecha
2026-10-22

## Archivos entregados

| Archivo | Descripción |
|---------|-------------|
| `src/shared/types/almacen.ts` | 7 tipos: 4 para artículos, 1 categoría, 2 para préstamos |
| `src/features/almacen/useAlmacen.ts` | 3 hooks: useArticulos, useCategorias, usePrestamos |
| `src/pages/AdminAlmacenPage.tsx` | Página única — CRUD artículos + gestión préstamos |
| `src/pages/AdminAlmacenPage.test.tsx` | 7 tests Vitest |

## Endpoints consumidos

| Hook/Acción | Endpoint | Método |
|-------------|----------|--------|
| `useArticulos` | `/WMS/Articulos` | GET |
| `useCategorias` | `/WMS/Articulos/categorias` | GET |
| `usePrestamos` | `/WMS/Prestamos` | GET |
| Crear artículo | `/WMS/Articulos` | POST |
| Actualizar artículo | `/WMS/Articulos/{id}` | PUT |
| Eliminar artículo | `/WMS/Articulos/{id}` | DELETE |
| Detalle artículo | `/WMS/Articulos/{id}` | GET |
| Registrar préstamo | `/WMS/Prestamos` | POST |
| Registrar devolución | `/WMS/Prestamos/{id}/devolver` | PATCH |

## Decisiones clave

1. **WMS es exclusivamente administrador**: No hay página para residentes, no hay rutas bajo `/mis-*`. El módulo WMS no expone funcionalidad al residente.

2. **Una sola página**: A diferencia de otros módulos (VEH, MAS) que tienen `MisPágina` + `AdminPágina`, WMS consolida toda la interfaz en `AdminAlmacenPage`. Incluye gestión de artículos y registro de préstamos/devoluciones.

3. **Bug apiGet documentado (post-entrega)**: Los 3 hooks asignan el objeto completo de `apiGet<T>()` al estado en lugar de `.data`. Patrón idéntico al resto de módulos. Pendiente refactor coordinado post-entrega.

4. **`useArticulos` y `usePrestamos` exponen `recargar`**: Para refetch manual tras operaciones de mutación (crear/actualizar/eliminar artículo o prestar/devolver), sin necesidad de recargar la página completa.

5. **Estado `bajoMinimo` como boolean**: El tipo `ArticuloListItem.bajoMinimo` es un campo computado que viene de la vista `wms.vsArticulos` (Stock < StockMinimo). La UI puede usarlo para resaltar artículos con stock crítico sin cálculo adicional en el cliente.

6. **Tipo unión literal para estado del préstamo**: `estado: 'PRESTADO' | 'DEVUELTO'` — tipado estricto que permite discriminación en la UI para mostrar el botón de devolución solo cuando aplica.
