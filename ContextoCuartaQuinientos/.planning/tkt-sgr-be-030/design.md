[← spec](spec.md) | [← index](_index.md)

# design.md — SGR-BE-030

## Estrategia

- Nuevo namespace `GraphApi.Services.SGR.CuartaNavegacion` + `Repositories` con Dapper (ADR-001).
- Reusar vistas `sgr.vsPerfilMenus` / tablas directas según performance.
- Controller `NavegacionController` o ampliar `MenusController` con regiones `#region Cuarta JWT`.

## Escalera decisión

1. Reusar `IMenusService` legacy → **no** (headers distintos).
2. Servicio Cuarta nuevo → **sí** (mínimo).

## Orden implementación

| # | Entregable | Dep |
|---|------------|-----|
| 1 | DTOs `MenuNodoDto`, `PerfilDto`, `PerfilMenuAsignacionRequest` | — |
| 2 | `GET /SGR/Navegacion/menus` | 1 |
| 3 | Admin CRUD Menus (JWT) | 1 |
| 4 | `PUT /SGR/Perfiles/{id}/permisos-menus` | 2,3 |
| 5 | Tests API + `.http` | 2–4 |
| 6 | Script seed opcional DB-006 | 3 |

## Pruebas (matriz)

| TC | Caso | Esperado |
|----|------|----------|
| TC-01 | GET menus admin | 200, árbol con hijos |
| TC-02 | GET menus residente | 200, sin rutas `/admin/*` |
| TC-03 | POST menú sin token | 401 |
| TC-04 | POST menú residente | 403 |
| TC-ERR | PUT permisos menú inexistente | 422 + code negocio |

## Riesgos

- Drift rutas MVC (`Admin/Menus`) vs SPA (`/admin/menus`) → tabla de mapeo `Ruta` en seed.
