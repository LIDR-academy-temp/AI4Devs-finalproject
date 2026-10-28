# impl.md — tkt-wms-be-029 (WMS Almacén Backend)

## Fecha
2026-10-22

## Controladores

### ArticulosController
- **Ruta base**: `WMS/Articulos`
- **Política**: `SoloAdministrador` (toda la clase)
- **Dependencias inyectadas**: `ICuartaAlmacenService`
- Sin endpoints legacy (controlador puro Cuarta)

| Método | Ruta | Acción service | Respuestas |
|--------|------|----------------|------------|
| GET | `/WMS/Articulos` | `ListarArticulosAsync()` | 200 |
| GET | `/WMS/Articulos/{id}` | `ObtenerArticuloAsync(id)` | 200 / 404 |
| GET | `/WMS/Articulos/categorias` | `ListarCategoriasAsync()` | 200 |
| POST | `/WMS/Articulos` | `CrearArticuloAsync(req, email, userId)` | 201 (`CreatedAtAction → Obtener, { articuloId }`) / 422 |
| PUT | `/WMS/Articulos/{id}` | `ActualizarArticuloAsync(id, req, email, userId)` | 204 / 404 / 422 |
| DELETE | `/WMS/Articulos/{id}` | `EliminarArticuloAsync(id, email, userId)` | 204 / 404 |

### PrestamosController
- **Ruta base**: `WMS/Prestamos`
- **Política**: `SoloAdministrador` (toda la clase)
- **Dependencias inyectadas**: `ICuartaAlmacenService`
- Sin endpoints legacy (controlador puro Cuarta)

| Método | Ruta | Acción service | Respuestas |
|--------|------|----------------|------------|
| GET | `/WMS/Prestamos` | `ListarPrestamosAsync()` | 200 |
| GET | `/WMS/Prestamos/{id}` | `ObtenerPrestamoAsync(id)` | 200 / 404 |
| POST | `/WMS/Prestamos` | `PrestarAsync(req, email, userId)` | 201 (`CreatedAtAction → Obtener, { prestamoId }`) / 404 / 409 / 422 |
| PATCH | `/WMS/Prestamos/{id}/devolver` | `DevolverAsync(id, email, userId)` | 204 / 404 |

---

## Servicio — CuartaAlmacenService

Implementa `ICuartaAlmacenService`. Inyecta `ICuartaAlmacenRepository repo` + `IDbConnection db`.
Patrón: `db.Open()` → `db.BeginTransaction()` → try/commit/catch rollback/throw.

### Métodos

#### `ListarCategoriasAsync()` → passthrough a repo

#### `ListarArticulosAsync()` → passthrough a repo

#### `ObtenerArticuloAsync(int articuloId)` → passthrough a repo

#### `CrearArticuloAsync(ArticuloCrearRequest req, string correoUsuario, int usuarioId)`
1. Nombre vacío o whitespace → (422, null, error)
2. `req.Stock < 0` → (422, null, "El stock no puede ser negativo (INV-1).")
3. `req.StockMinimo < 0` → (422, null, error)
4. `db.Open()` + tx → `repo.InsertArticuloAsync(req, email, userId, tx)` → commit → (201, id, null)

#### `ActualizarArticuloAsync(int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId)`
1. `db.Open()` + tx
2. `!repo.ExisteArticuloAsync(articuloId, tx)` → rollback → (404, "Artículo no encontrado.")
3. `req.Stock.HasValue && req.Stock.Value < 0` → rollback → (422, error)
4. `repo.ActualizarArticuloAsync(articuloId, req, email, userId, tx)` → commit → (204, null)

#### `EliminarArticuloAsync(int articuloId, string correoUsuario, int usuarioId)`
1. `db.Open()` + tx
2. `!repo.ExisteArticuloAsync(articuloId, tx)` → rollback → (404, "Artículo no encontrado.")
3. `repo.SoftDeleteArticuloAsync(articuloId, email, userId, tx)` → commit → (204, null)

#### `PrestarAsync(PrestamoCrearRequest req, string correoUsuario, int usuarioId)`
1. `req.Cantidad <= 0` → (422, null, "La cantidad debe ser mayor a cero.")
2. `db.Open()` + tx
3. `!repo.ExisteArticuloAsync(req.ArticuloId, tx)` → rollback → (404, null, "Artículo no encontrado.")
4. `stock = repo.ObtenerStockAsync(req.ArticuloId, tx)` → si `stock - req.Cantidad < 0` → rollback → (409, null, "Stock insuficiente. Stock actual: {stock}, solicitado: {cantidad} (INV-1).")
5. `repo.AjustarStockAsync(req.ArticuloId, -req.Cantidad, email, userId, tx)` (baja stock)
6. `repo.InsertPrestamoAsync(req, email, userId, tx)` → commit → (201, id, null)

#### `DevolverAsync(int prestamoId, string correoUsuario, int usuarioId)`
1. `prestamo = await repo.ObtenerPrestamoAsync(prestamoId)` (sin tx — lectura previa)
2. Si prestamo es null o `Estado != "PRESTADO"` → (404, "Préstamo no encontrado o ya devuelto.")
3. `db.Open()` + tx
4. Re-valida: `!repo.EsPrestamoActivoAsync(prestamoId, tx)` → rollback → (404, error) (evita TOCTOU)
5. `repo.AjustarStockAsync(prestamo.ArticuloId, prestamo.Cantidad, email, userId, tx)` (sube stock)
6. `repo.DevolverPrestamoAsync(prestamoId, email, userId, tx)` → commit → (204, null)

---

## Repositorio — CuartaAlmacenRepository

Implementa `ICuartaAlmacenRepository`. Inyecta `IDbConnection db`.

| Método | Operación SQL |
|--------|---------------|
| `ListarCategoriasAsync()` | SELECT `wms.CategoriasArticulo` WHERE bEliminado=0 ORDER BY Nombre |
| `ListarArticulosAsync()` | SELECT `wms.vsArticulos` WHERE bEliminado=0 ORDER BY Nombre |
| `ObtenerArticuloAsync(id)` | SELECT `wms.vsArticulos` WHERE ArticuloID + bEliminado=0 (FirstOrDefault) |
| `ExisteArticuloAsync(id, tx?)` | COUNT `wms.Articulos` WHERE ArticuloID + bEliminado=0 |
| `InsertArticuloAsync(req, email, userId, tx)` | INSERT `wms.Articulos` OUTPUT INSERTED.ArticuloID |
| `ActualizarArticuloAsync(id, req, email, userId, tx)` | UPDATE COALESCE todos los campos |
| `SoftDeleteArticuloAsync(id, email, userId, tx)` | UPDATE bEliminado=1 |
| `ObtenerStockAsync(id, tx)` | SELECT Stock FROM `wms.Articulos` |
| `AjustarStockAsync(id, delta, email, userId, tx)` | UPDATE Stock = Stock + @delta |
| `ListarPrestamosAsync()` | SELECT `wms.vsPrestamos` WHERE bEliminado=0 ORDER BY FechaPrestamo DESC |
| `ObtenerPrestamoAsync(id)` | SELECT `wms.vsPrestamos` WHERE PrestamoID + bEliminado=0 (FirstOrDefault) |
| `EsPrestamoActivoAsync(id, tx?)` | COUNT `wms.Prestamos` WHERE PrestamoID + Estado='PRESTADO' + bEliminado=0 |
| `InsertPrestamoAsync(req, email, userId, tx)` | INSERT `wms.Prestamos` OUTPUT INSERTED.PrestamoID (Estado=N'PRESTADO') |
| `DevolverPrestamoAsync(id, email, userId, tx)` | UPDATE Estado='DEVUELTO', FechaDevolucion=GETDATE() |
| `ObtenerCantidadPrestamoAsync(id, tx)` | SELECT Cantidad (método muerto — no usado por servicio) |

### Notas SQL
- `wms.vsArticulos`: vista con JOIN wms.Articulos + wms.CategoriasArticulo. Expone `BajoMinimo` (computed: Stock < StockMinimo).
- `wms.vsPrestamos`: vista con JOIN wms.Prestamos + sgr.Usuarios + wms.Articulos. Expone campos denormalizados (NombreArticulo, NombreUsuario, CorreoUsuario).
- INSERT usa `OUTPUT INSERTED.ArticuloID` / `OUTPUT INSERTED.PrestamoID` (no SCOPE_IDENTITY()).

---

## Tests xUnit — CuartaAlmacenServiceTests (7 [Fact])

Helper `BuildService(out repoMock, out connMock, out txMock)`:
- `IDbConnection.State = Closed` (mismo patrón que MAS)
- `connMock.Setup(BeginTransaction())` → txMock

| # | Test | Verifica |
|---|------|---------|
| CA-1 | `Prestar_StockSuficiente_BajaStockYDevuelve201` | Stock suficiente → AjustarStock(-3), InsertPrestamo, Commit, returns 201+id |
| CA-2 | `Devolver_PrestamoActivo_ResumeStockYDevuelve204` | Prestamo PRESTADO → AjustarStock(+2), DevolverPrestamo, Commit, returns 204 |
| CA-3 | `Prestar_StockInsuficiente_Devuelve409SinCommit` | stock=1, cantidad=5 → 409, AjustarStock Never, Commit Never, Rollback Once |
| 4 | `CrearArticulo_NombreVacio_Devuelve422` | Nombre="" → 422 sin tx |
| 5 | `CrearArticulo_StockNegativo_Devuelve422` | Stock=-1 → 422 sin tx |
| 6 | `ActualizarArticulo_NoExiste_Devuelve404` | ExisteArticulo=false → 404 |
| 7 | `Devolver_PrestamoYaDevuelto_Devuelve404` | Estado="DEVUELTO" → 404 sin abrir tx |
