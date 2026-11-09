# VTS-BE-026: Impl — Visitas y reservas API Cuarta

## Archivos nuevos

### `GraphApi/Repositories/VTS/ICuartaVisitasRepository.cs` + `CuartaVisitasRepository.cs`
Implementación con Dapper + `IDbConnection` (primary-constructor).

| Método | SQL | Tablas |
|--------|-----|--------|
| `ListarVisitasAsync(casaId, desde, hasta)` | SELECT vts.Visitas JOIN TipoIdentificacion LEFT JOIN sgr.Casas WHERE bEliminado=0 + filtros opcionales | vts.Visitas, vts.TipoIdentificacion, sgr.Casas |
| `ResolverTipoIdentificacionIdAsync(tipo)` | SELECT TOP 1 TipoIdentificacionID WHERE TipoIdentificacion=@v | vts.TipoIdentificacion |
| `InsertVisitaAsync(request, tipoId, correo, userId, tx)` | INSERT vts.Visitas + SCOPE_IDENTITY | vts.Visitas |
| `RegistrarSalidaAsync(visitaId, correo, userId, tx)` | UPDATE FechaSalida=GETDATE() WHERE FechaSalida IS NULL | vts.Visitas |
| `ListarAreasAsync()` | SELECT vts.AreasComunes WHERE bEliminado=0 ORDER BY Nombre | vts.AreasComunes |
| `HaySolapamientoAsync(areaComunId, inicio, fin, excluirId)` | SELECT COUNT(1) con overlap r.FechaInicio < @Fin AND r.FechaFin > @Inicio, excluye estado 'Cancelada' | vts.ReservacionesArea, vts.ReservacionesEstados |
| `ResolverEstadoReservacionIdAsync(estado)` | SELECT TOP 1 ReservacionEstadoID | vts.ReservacionesEstados |
| `InsertReservacionAsync(request, estadoId, correo, userId, tx)` | INSERT vts.ReservacionesArea + SCOPE_IDENTITY | vts.ReservacionesArea |
| `ListarReservacionesMiasAsync(userId)` | SELECT JOIN AreasComunes JOIN ReservacionesEstados WHERE UsuarioID=@UserId ORDER BY FechaInicio DESC | vts.ReservacionesArea, vts.AreasComunes, vts.ReservacionesEstados |

### `GraphApi/Services/VTS/CuartaVisitas/ICuartaVisitasService.cs` + `CuartaVisitasService.cs`

| Método | Validaciones | Error codes |
|--------|-------------|-------------|
| `ListarVisitasAsync` | — | — |
| `RegistrarEntradaAsync` | VisitanteNombre vacío → 422; NumeroIdentificacion vacío → 422; TipoIdentificacion no encontrado → 422 | VTS_NOMBRE_REQUERIDO, VTS_IDENTIFICACION_REQUERIDA, VTS_TIPO_IDENT_INVALIDO |
| `RegistrarSalidaAsync` | repo retorna false → 404 | VTS_NOT_FOUND_OR_SALIDA |
| `ListarAreasAsync` | — | — |
| `CrearReservacionAsync` | FechaFin ≤ FechaInicio → 422; solapamiento → 409; resuelve estado "Pendiente" antes de insert | VTS_FECHAS_INVALIDAS, VTS_SOLAPAMIENTO |
| `ListarReservacionesMiasAsync` | — | — |

### `GraphApi/Models/VTS/CuartaVisitas/CuartaVisitasDtos.cs`
`VisitaListItemDto`, `RegistrarVisitaRequest`, `AreaComunDto`, `ReservacionAreaDto`, `CrearReservacionRequest`.

### Controllers nuevos (patrón Cuarta)

#### `GraphApi/Controllers/VTS/Visitas/VisitasController.cs`
Inyecta `ICuartaVisitasService` + `IVisitasService` (legacy).

| Verbo | Ruta | Auth | Handler |
|-------|------|------|---------|
| GET | /VTS/Visitas | JWT Admin (SoloAdministrador) | `ListarVisitasAsync(casaId,desde,hasta)` → 200 |
| POST | /VTS/Visitas | JWT | `RegistrarEntradaAsync` → 201/422 |
| PATCH | /VTS/Visitas/{id}/salida | JWT | `RegistrarSalidaAsync` → 204/404 |
| GET | /VTS/Visitas/legacy | legacy | filtros dinámicos |
| POST/PATCH/DELETE | /VTS/Visitas/legacy | legacy | CRUD legacy |

#### `GraphApi/Controllers/VTS/AreasComunes/AreasComunesController.cs`
Inyecta `ICuartaVisitasService` + `IAreasComunesService` (legacy).

| Verbo | Ruta | Auth | Handler |
|-------|------|------|---------|
| GET | /VTS/AreasComunes | JWT | `ListarAreasAsync` → 200 |
| GET | /VTS/AreasComunes/legacy | legacy | filtros dinámicos |

#### `GraphApi/Controllers/VTS/ReservacionesArea/ReservacionesAreaController.cs`
Inyecta `ICuartaVisitasService` + `IReservacionesAreaService` (legacy).

| Verbo | Ruta | Auth | Handler |
|-------|------|------|---------|
| POST | /VTS/ReservacionesArea | JWT | `CrearReservacionAsync` → 201/409/422 |
| GET | /VTS/ReservacionesArea/mias | JWT | `ListarReservacionesMiasAsync(userId)` → 200 |
| GET | /VTS/ReservacionesArea/legacy | legacy | filtros dinámicos |

## Controladores legacy existentes (sin cambio Cuarta)
`ReservacionesEstadosController`, `TipoIdentificacionController`, `LogUsoVisitasController`, `VisitasGeneradasController` — patrón UserID/WindowName, GET/POST/PATCH/DELETE dinámico.

## Tests

### `GraphApi/GraphApi.Tests/CuartaVisitasServiceTests.cs`
9 xUnit `[Fact]` — Moq sobre `ICuartaVisitasRepository` + `IDbConnection`/`IDbTransaction`.

| # | Test | Assert |
|---|------|--------|
| 1 | `RegistrarEntrada_NombreVacio_Retorna422` | VTS_NOMBRE_REQUERIDO, 422 |
| 2 | `RegistrarEntrada_IdentificacionVacia_Retorna422` | VTS_IDENTIFICACION_REQUERIDA, 422 |
| 3 | `RegistrarEntrada_TipoIdentNoEncontrado_Retorna422` | VTS_TIPO_IDENT_INVALIDO, 422 |
| 4 | `RegistrarEntrada_Valido_InsertaYRetorna201` | visita≠null, status=201, tx.Commit×1 |
| 5 | `RegistrarSalida_NotFound_Retorna404` | VTS_NOT_FOUND_OR_SALIDA, 404 |
| 6 | `RegistrarSalida_Valido_Retorna204` | ok=true, status=204, tx.Commit×1 |
| 7 | `CrearReservacion_FechasInvalidas_Retorna422` | VTS_FECHAS_INVALIDAS, 422 |
| 8 | `CrearReservacion_Solapamiento_Retorna409` | VTS_SOLAPAMIENTO, 409 |
| 9 | `CrearReservacion_Valido_InsertaYRetorna201` | res≠null, status=201, tx.Commit×1 |

Resultado: 9/9 ✅

## Decisiones de diseño
- `IDbConnection` inyectado directamente; tx manuales por operación de escritura en el servicio.
- `RegistrarSalida` sólo actualiza visitas con `FechaSalida IS NULL` — garantiza idempotencia de doble-salida.
- Solapamiento excluye reservaciones en estado 'Cancelada'.
- Estado inicial de reservación resuelto por nombre ("Pendiente") vía catalog lookup en tx.
- No hay seed VTS en DB-004; las tablas de catálogo (TipoIdentificacion, ReservacionesEstados) deben existir previamente (legacy DB).
