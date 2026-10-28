# impl.md — tkt-veh-be-018 (VEH BE)

## Dominio y ubicación
El módulo VEH vive dentro del dominio **USR** (no en una carpeta VEH propia):
- Controller: `GraphApi/Controllers/USR/Automoviles/AutomovilesController.cs`
- Service: `GraphApi/Services/USR/CuartaAutomoviles/CuartaAutomovilesService.cs`
- Repository: `GraphApi/Repositories/USR/CuartaAutomovilesRepository.cs`
- Interface: `GraphApi/Repositories/USR/ICuartaAutomovilesRepository.cs`
- Tests: `GraphApi/GraphApi.Tests/CuartaAutomovilesServiceTests.cs`

---

## AutomovilesController

Ruta base: `USR/Automoviles`  
Inyecta: `ICuartaAutomovilesService` (Cuarta) + `IAutomovilesService` (legacy)

### Endpoints Cuarta

| Método | Ruta | Policy | Respuestas |
|--------|------|--------|------------|
| GET | `/USR/Automoviles` | Autenticado | 200 `List<AutomovilListItemDto>` |
| GET | `/USR/Automoviles/buscar?placas=` | `AdminOGuardia` | 200 / 400 VEH_PLACAS_REQUERIDAS |
| POST | `/USR/Automoviles` | Autenticado | 201 `AutomovilListItemDto` / 409 / 422 |
| PUT | `/USR/Automoviles/{id}` | Autenticado | 204 / 404 / 409 |
| DELETE | `/USR/Automoviles/{id}` | Autenticado | 204 / 404 |

Claims extraídos: `userId` (NameIdentifier → `int`), `correo` (Email claim).

### Endpoints Legacy (sin cambios)

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/USR/Automoviles/legacy` | UserID/WindowName headers |
| POST | `/USR/Automoviles/legacy` | — |
| PATCH | `/USR/Automoviles/legacy/{id}` | — |
| DELETE | `/USR/Automoviles/legacy/{id}` | — |

---

## CuartaAutomovilesService

| Método | Descripción | Errores |
|--------|-------------|---------|
| `ListarMisAsync(userId)` | Lista vehículos del usuario autenticado | — |
| `BuscarPorPlacasAsync(placas)` | Búsqueda LIKE sin tx | — |
| `ListarMarcasAsync()` | Catálogo marcas | — |
| `ListarModelosAsync()` | Catálogo modelos | — |
| `CrearAsync(req, correo, userId)` | Valida placas, checa duplicado, inserta en tx, retorna dto | VEH_PLACAS_REQUERIDAS 422, VEH_PLACAS_DUPLICADAS 409 |
| `ActualizarAsync(id, req, correo, userId)` | Checa ownership primero; luego duplicado si viene Placas | VEH_NOT_FOUND 404, VEH_PLACAS_DUPLICADAS 409 |
| `EliminarAsync(id, correo, userId)` | Checa ownership, soft-delete en tx | VEH_NOT_FOUND 404 |

Notas de implementación:
- `Placas` se normaliza a `Trim().ToUpperInvariant()` antes de persistir.
- Ownership se verifica con `EsDuenioAsync` (combina automovilId + userId + bEliminado=0); si falla → 404 (no se expone si el auto existe pero pertenece a otro).
- `ActualizarAsync`: solo llama `ExistePlacaAsync` si el request trae `Placas` no nulo; pasa `excludeId = id` para ignorar el propio registro.

---

## CuartaAutomovilesRepository

| Método | Tabla / SQL | Notas |
|--------|-------------|-------|
| `ListarMisAsync(userId)` | SELECT usr.Automoviles + JOINs Usuarios, Marcas, Modelos, Casas | WHERE UsuarioID=@uid AND bEliminado=0 |
| `BuscarPorPlacasAsync(placas)` | mismo SELECT con WHERE Placas LIKE '%'+@Placas+'%' | — |
| `ExistePlacaAsync(placas, excludeId, tx)` | COUNT(1) WHERE Placas=@p AND bEliminado=0 AND (excludeId IS NULL OR AutomovilID<>@eid) | — |
| `InsertAsync(req, correo, userId, tx)` | INSERT + SCOPE_IDENTITY() | — |
| `ActualizarAsync(id, req, correo, tx)` | UPDATE COALESCE para campos opcionales | rows>0 → bool |
| `SoftDeleteAsync(id, correo, tx)` | UPDATE bEliminado=1, Modificado, FechaModificacion | rows>0 → bool |
| `EsDuenioAsync(automovilId, userId)` | COUNT(1) WHERE AutomovilID AND UsuarioID AND bEliminado=0 | sin tx |
| `ListarMarcasAsync()` | SELECT usr.Marcas WHERE bEliminado=0 ORDER BY Marca | — |
| `ListarModelosAsync()` | SELECT usr.Modelos WHERE bEliminado=0 ORDER BY Modelo | — |

---

## Pruebas unitarias (xUnit — 6 [Fact])

| Test | Escenario | Assert |
|------|-----------|--------|
| `CrearAsync_PlacasVacias_Retorna422` | `Placas = ""` | code=VEH_PLACAS_REQUERIDAS, status=422 |
| `CrearAsync_PlacasDuplicadas_Retorna409` | `ExistePlaca → true` | code=VEH_PLACAS_DUPLICADAS, status=409 |
| `CrearAsync_Valido_InsertaYRetorna201` | Insert OK, ListarMis retorna item | auto!=null, status=201, tx.Commit×1 |
| `ActualizarAsync_NoEsDuenio_Retorna404` | `EsDuenio → false` | code=VEH_NOT_FOUND, status=404 |
| `EliminarAsync_NoEsDuenio_Retorna404` | `EsDuenio → false` | code=VEH_NOT_FOUND, status=404 |
| `EliminarAsync_Valido_Retorna204` | `EsDuenio → true`, SoftDelete → true | ok=true, status=204, tx.Commit×1 |

Mock: `Mock<ICuartaAutomovilesRepository>` + `Mock<IDbConnection>` (State=Open) + `Mock<IDbTransaction>`
