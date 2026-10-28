# JNT-BE-025: Impl — Juntas API Cuarta

## Archivos nuevos

### `GraphApi/Repositories/JNT/ICuartaJuntasRepository.cs`
Interfaz del repositorio: `ListarAsync`, `ObtenerAsync`, `InsertJuntaAsync`, `InsertDetalleAsync`, `ActualizarAsync`, `SoftDeleteAsync`.

### `GraphApi/Repositories/JNT/CuartaJuntasRepository.cs`
Implementación con Dapper + `IDbConnection` inyectada vía primary-constructor.

| Método | SQL | Notas |
|--------|-----|-------|
| `ListarAsync` | SELECT FROM jnt.Juntas WHERE bEliminado=0 ORDER BY FechaProgramada DESC | Devuelve `IReadOnlyList<JuntaListItemDto>` |
| `ObtenerAsync` | SELECT jnt.Juntas LEFT JOIN jnt.JuntaDetalle + segunda query para archivos | Dos queries: junta+detalle, luego archivos si hay JuntaDetalleId |
| `InsertJuntaAsync` | INSERT INTO jnt.Juntas + SCOPE_IDENTITY() | Dentro de tx, retorna nuevo JuntaID |
| `InsertDetalleAsync` | INSERT INTO jnt.JuntaDetalle | Dentro de tx; Contenido, FechaRegistro=GETDATE() |
| `ActualizarAsync` | UPDATE jnt.Juntas SET ... COALESCE para campos opcionales; luego UPDATE/INSERT jnt.JuntaDetalle si Contenido presente | Retorna false si 0 rows |
| `SoftDeleteAsync` | UPDATE jnt.Juntas SET bEliminado=1 WHERE JuntaID=@id | Retorna bool |

### `GraphApi/Services/JNT/CuartaJuntas/ICuartaJuntasService.cs`
Interfaz con: `ListarAsync`, `ObtenerAsync`, `CrearAsync`, `ActualizarAsync`, `EliminarAsync`.

### `GraphApi/Services/JNT/CuartaJuntas/CuartaJuntasService.cs`
Servicio con validaciones y transacciones. Recibe `ICuartaJuntasRepository` + `IDbConnection`.

| Método | Flujo |
|--------|-------|
| `ListarAsync` | Delega al repo sin tx |
| `ObtenerAsync` | Delega al repo; retorna 404 si null |
| `CrearAsync` | Valida Titulo no vacío (JNT_TITULO_REQUERIDO 422) y FechaProgramada != default (JNT_FECHA_REQUERIDA 422); abre tx; InsertJuntaAsync; InsertDetalleAsync si Contenido presente; Commit; ObtenerAsync |
| `ActualizarAsync` | tx; ActualizarAsync repo; false → JNT_NOT_FOUND 404; Commit |
| `EliminarAsync` | tx; SoftDeleteAsync repo; false → JNT_NOT_FOUND 404; Commit |

### `GraphApi/Models/JNT/CuartaJuntas/CuartaJuntasDtos.cs`
Records: `JuntaListItemDto`, `JuntaDetalleDto` (with `Archivos`), `JuntaArchivoDto`, `JuntaCrearRequest`, `JuntaActualizarRequest`.

### `GraphApi/Controllers/JNT/Juntas/JuntasController.cs`
Route: `JNT/Juntas`. Todos los endpoints usan JWT (`sub`=adminId, `email`=correo).

| Verbo | Ruta | Rol | Handler |
|-------|------|-----|---------|
| GET | /JNT/Juntas | [Authorize] | `ListarAsync` → 200 |
| GET | /JNT/Juntas/{id} | [Authorize] | `ObtenerAsync` → 200/404 |
| POST | /JNT/Juntas | [Authorize("Admin")] | `CrearAsync` → 201/422 |
| PUT | /JNT/Juntas/{id} | [Authorize("Admin")] | `ActualizarAsync` → 204/404/422 |
| DELETE | /JNT/Juntas/{id} | [Authorize("Admin")] | `EliminarAsync` → 204/404 |

## Archivos existentes modificados

### `GraphApi/Controllers/JNT/JuntaDetalle/JuntaDetalleController.cs`
Controlador legacy (UserID/WindowName headers, GET/POST/PATCH/DELETE dinámico). Sin cambios al patrón Cuarta; mantiene ruta `JNT/JuntaDetalle`.

### `GraphApi/Controllers/JNT/JuntaDetalleArchivos/JuntaDetalleArchivosController.cs`
Controlador legacy (UserID/WindowName headers, GET/POST/PATCH/DELETE dinámico). Ruta `JNT/JuntaDetalleArchivos`.

## Tests

### `GraphApi/GraphApi.Tests/CuartaJuntasServiceTests.cs`
5 xUnit `[Fact]` — Moq sobre `ICuartaJuntasRepository` + `IDbConnection`/`IDbTransaction`.

| # | Test | Assert |
|---|------|--------|
| 1 | `CrearAsync_TituloVacio_Retorna422` | code=JNT_TITULO_REQUERIDO, status=422 |
| 2 | `CrearAsync_FechaDefault_Retorna422` | code=JNT_FECHA_REQUERIDA, status=422 |
| 3 | `CrearAsync_Valido_CreaJuntaYDetalle` | status=201, junta≠null, tx.Commit×1 |
| 4 | `ActualizarAsync_NotFound_Retorna404` | code=JNT_NOT_FOUND, status=404 |
| 5 | `EliminarAsync_NotFound_Retorna404` | code=JNT_NOT_FOUND, status=404 |

Resultado: 5/5 ✅

## Decisiones de diseño

- `IDbConnection` inyectado directamente (no IUnitOfWork); transacciones manuales por método en el servicio.
- `ActualizarAsync` usa UPDATE…COALESCE para campos opcionales (patch semántico en PUT).
- En `ActualizarAsync`, si jnt.JuntaDetalle no existe aún (0 rows del UPDATE), se hace INSERT del detalle automáticamente.
- No hay seed para tablas jnt.*; las tablas deben existir en la BD (provistas por DB-001/legacy).
