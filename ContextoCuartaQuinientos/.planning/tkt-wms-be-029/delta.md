# delta.md — tkt-wms-be-029 (WMS Almacén Backend)

## Fecha
2026-10-22

## Endpoints expuestos

| Método | Ruta | Status OK | Status Error |
|--------|------|-----------|--------------|
| GET | `/WMS/Articulos` | 200 | — |
| GET | `/WMS/Articulos/{id}` | 200 | 404 |
| GET | `/WMS/Articulos/categorias` | 200 | — |
| POST | `/WMS/Articulos` | 201 | 422 |
| PUT | `/WMS/Articulos/{id}` | 204 | 404, 422 |
| DELETE | `/WMS/Articulos/{id}` | 204 | 404 |
| GET | `/WMS/Prestamos` | 200 | — |
| GET | `/WMS/Prestamos/{id}` | 200 | 404 |
| POST | `/WMS/Prestamos` | 201 | 404, 409, 422 |
| PATCH | `/WMS/Prestamos/{id}/devolver` | 204 | 404 |

**Total**: 10 endpoints Cuarta. 0 endpoints legacy.

## Tablas / vistas afectadas

| Tabla/Vista | Operaciones |
|-------------|------------|
| `wms.CategoriasArticulo` | SELECT (solo lectura) |
| `wms.vsArticulos` | SELECT (vista computed con BajoMinimo) |
| `wms.Articulos` | SELECT COUNT, INSERT (OUTPUT), UPDATE COALESCE, UPDATE bEliminado=1, UPDATE Stock+delta |
| `wms.vsPrestamos` | SELECT (vista denormalizada) |
| `wms.Prestamos` | SELECT COUNT, INSERT (OUTPUT), UPDATE Estado+FechaDevolucion |

## Códigos de error de negocio

| Código | Status | Condición |
|--------|--------|-----------|
| — | 422 | Nombre del artículo vacío o whitespace |
| INV-1 | 422 | Stock o StockMinimo negativo al crear/actualizar |
| INV-1 | 422 | Cantidad de préstamo ≤ 0 |
| — | 404 | Artículo no encontrado (ExisteArticuloAsync = false) |
| STOCK_INSUFICIENTE (INV-1) | 409 | `stock - cantidad < 0` al prestar |
| — | 404 | Préstamo no encontrado o Estado ≠ "PRESTADO" |

## Decisiones clave

1. **Controlador puro Cuarta**: No hay endpoints legacy en WMS. Toda la funcionalidad de Artículos y Préstamos fue diseñada desde cero para Cuarta sin necesidad de retrocompatibilidad.

2. **Política SoloAdministrador global**: Aplicada a nivel de clase en ambos controladores (`[Authorize(Policy = "SoloAdministrador")]`). No hay rutas para residentes en WMS.

3. **Invariante INV-1 (stock no negativo)**: Se valida en dos puntos:
   - Al crear/actualizar artículo: `Stock < 0` → 422
   - Al prestar: `stock - cantidad < 0` → 409 (STOCK_INSUFICIENTE). Esto es un conflicto de negocio, no un error de validación del cliente.

4. **Patrón TOCTOU en devolución**: `DevolverAsync` hace dos lecturas: una fuera de tx (`ObtenerPrestamoAsync` para validar Estado rápido) y una dentro de tx (`EsPrestamoActivoAsync` para re-validar antes de mutar). El primer check evita abrir tx innecesariamente; el segundo garantiza consistencia.

5. **`AjustarStockAsync` con delta negativo/positivo**: Un único método maneja tanto la baja (préstamo, delta < 0) como la reposición (devolución, delta > 0). Reduce la superficie de la interfaz del repositorio.

6. **OUTPUT INSERTED vs SCOPE_IDENTITY()**: WMS usa `OUTPUT INSERTED.ArticuloID` / `OUTPUT INSERTED.PrestamoID` para obtener el ID generado — más idiomático en SQL Server moderno, seguro con múltiples INSERTs en una transacción.

7. **Método muerto `ObtenerCantidadPrestamoAsync`**: Existe en el repositorio pero no es llamado por el servicio. La cantidad se obtiene directamente de la entidad cargada por `ObtenerPrestamoAsync` en `DevolverAsync`.

8. **`IDbConnection.State = Closed` en tests**: El helper `BuildService` configura el mock de conexión en estado Closed (consistente con MAS). El servicio llama `db.Open()` explícitamente antes de cada transacción.
