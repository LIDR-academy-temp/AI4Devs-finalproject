# VTS-BE-026: Delta — Visitas y reservas API Cuarta

## Endpoints nuevos (Cuarta)

| Verbo | Ruta | Auth | Respuesta OK |
|-------|------|------|--------------|
| GET | /VTS/Visitas | JWT Admin | 200 `VisitaListItemDto[]` |
| POST | /VTS/Visitas | JWT | 201 `VisitaListItemDto` |
| PATCH | /VTS/Visitas/{id}/salida | JWT | 204 |
| GET | /VTS/AreasComunes | JWT | 200 `AreaComunDto[]` |
| POST | /VTS/ReservacionesArea | JWT | 201 `ReservacionAreaDto` |
| GET | /VTS/ReservacionesArea/mias | JWT | 200 `ReservacionAreaDto[]` |

## SQL ejecutado en runtime

| Operación | Tabla | Descripción |
|-----------|-------|-------------|
| SELECT + JOINs | vts.Visitas + vts.TipoIdentificacion + sgr.Casas | Listar visitas con filtros opcionales |
| SELECT TOP 1 | vts.TipoIdentificacion | Resolver ID por nombre (en tx) |
| INSERT + SCOPE_IDENTITY | vts.Visitas | Registrar entrada |
| UPDATE FechaSalida=GETDATE() | vts.Visitas | Registrar salida (WHERE FechaSalida IS NULL) |
| SELECT | vts.AreasComunes | Listar áreas comunes activas |
| SELECT COUNT(1) overlap | vts.ReservacionesArea + vts.ReservacionesEstados | Verificar solapamiento (excluye 'Cancelada') |
| SELECT TOP 1 | vts.ReservacionesEstados | Resolver estado "Pendiente" por nombre |
| INSERT + SCOPE_IDENTITY | vts.ReservacionesArea | Crear reservación |
| SELECT + JOINs | vts.ReservacionesArea + vts.AreasComunes + vts.ReservacionesEstados | Listar reservaciones del usuario |

## Códigos de error de negocio

| Code | Status | Condición |
|------|--------|-----------|
| VTS_NOMBRE_REQUERIDO | 422 | VisitanteNombre vacío |
| VTS_IDENTIFICACION_REQUERIDA | 422 | NumeroIdentificacion vacío |
| VTS_TIPO_IDENT_INVALIDO | 422 | TipoIdentificacion no existe en catálogo |
| VTS_NOT_FOUND_OR_SALIDA | 404 | VisitaID no existe, ya eliminada, o ya tiene FechaSalida |
| VTS_FECHAS_INVALIDAS | 422 | FechaFin ≤ FechaInicio en reservación |
| VTS_SOLAPAMIENTO | 409 | Área ya reservada en ese rango (excluyendo 'Cancelada') |

## Tests

- xUnit: 9/9 ✅

## Decisiones clave
- `RegistrarSalida` es idempotente: el WHERE incluye `FechaSalida IS NULL` → doble-salida retorna 404.
- Estado inicial de reservación resuelto por nombre en tx (catalog lookup).
- Controladores legacy (ReservacionesEstados, TipoIdentificacion, LogUsoVisitas, VisitasGeneradas) preexisten; no se modifican en este ticket.
