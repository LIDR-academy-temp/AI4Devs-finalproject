# Delta: tkt-sgr-be-030-jwt-menus

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Menú jerárquico JWT: `GET /SGR/Navegacion/menus` según claim `perfil` y `sgr.PerfilMenus` (`bVisible`, no eliminados).
- CRUD admin menús JWT: `GET/POST/PUT/DELETE /SGR/Menus/admin` (política `SoloAdministrador`).
- Permisos menú por perfil: `GET/PUT /SGR/Perfiles/{id}/permisos-menus`.
- Servicio `CuartaNavegacionService` + `CuartaNavegacionRepository` (Dapper); árbol en `MenuArbolBuilder`.

## Comportamiento modificado

- (Antes): menús solo vía controllers legacy con headers `UserID`/`WindowName`.
- (Después): mismos legacy intactos; rutas Cuarta JWT en paralelo (`#region Cuarta JWT` en `MenusController` / `PerfilesController`).
- `SqlSchemaCompat.PerfilNombreColumn`: resolución de perfil con columna `Perfil` o `Nombre` en `sgr.Perfiles`.

## Comportamiento eliminado

- Ninguno (MVP no incluye botones JWT ni CRUD perfiles JWT).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin DDL; solo lectura/escritura Dapper sobre tablas existentes |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/SGR/Navegacion/menus` | GET | Creado |
| `/SGR/Menus/admin` | GET, POST | Creado |
| `/SGR/Menus/admin/{id}` | GET, PUT, DELETE | Creado |
| `/SGR/Perfiles/{id}/permisos-menus` | GET, PUT | Creado |

## Para el reviewer

- **Qué se hizo**: API REST JWT para navegación por perfil y administración de menús/permisos.
- **Por qué**: [[SGR-BE-030]] — habilitar sidebar dinámico React ([[SGR-FE-001]]) sin headers legacy.
- **Riesgo**: **Medio** — legacy `Menus`/`Perfiles` sin `SoloAdministrador` sigue expuesto; seed de menús vacío hasta DB-006.
- **Qué probar**: `dotnet test --filter Navegacion`; login JWT → `GET /SGR/Navegacion/menus` 200; residente `POST /SGR/Menus/admin` 403.
- **Rollback**: revertir PR GraphApi (controllers + servicios SGR Navegación); sin migración BD.

## Aprendizajes

- En BD lógica (post DB-001), `sgr.Perfiles` usa `Nombre`, no `Perfil` — alinear con `SqlSchemaCompat` como en `UserRepository`.

## Decisiones (ADR)

- **ADR-SGR-030-1**: Servicio Cuarta nuevo (`ICuartaNavegacionService`) en lugar de extender `IMenusService` legacy (headers distintos) — acorde design MVP adversarial.
