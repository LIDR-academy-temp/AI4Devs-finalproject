# SGR-BE-030 — API JWT menús, perfiles y permisos

## Estado

**ARCHIVADO**

| Campo | Valor |
|-------|-------|
| Prioridad | 2 |
| Rama | `feature/sgr-be-030-jwt-menus` |
| Talla | M |

## Documentos

| Artefacto | Archivo |
|-----------|---------|
| Spec | [spec.md](spec.md) |
| Design | [design.md](design.md) |
| Impl | [impl.md](impl.md) |
| Delta | [delta.md](delta.md) |
| API tests | [SGR-BE-030_api_tests.http](SGR-BE-030_api_tests.http) |
| APIs Front | [TKT-SGR-BE-030-APIS.md](TKT-SGR-BE-030-APIS.md) |

## Depende de

- Tablas `sgr.Menus`, `MenusBotones`, `PerfilMenus`, `PerfilMenuBotones`, `Perfiles` (DB-001)

## Habilita

- [[SGR-FE-001]]

## Dominios

- [[sgr]] · [[auth]] · [[usuarios]]

## Resumen final

### Objetivo cumplido

- API JWT para menú dinámico y administración de menús/permisos-perfil (MVP adversarial), legacy sin romper.

### Archivos modificados (GraphApi)

- `Controllers/SGR/Navegacion/NavegacionController.cs`
- `Controllers/SGR/Menus/MenusController.cs`, `Perfiles/PerfilesController.cs` (regiones JWT)
- `Services/SGR/Navegacion/*`, `Repositories/SGR/CuartaNavegacionRepository.cs`
- `Models/SGR/Navegacion/*`, `Infrastructure/SqlSchemaCompat.cs`
- `GraphApi.Tests/CuartaNavegacionServiceTests.cs`, `NavegacionAuthorizationTests.cs`

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO
- auditor-seguridad: APROBADO (scope JWT; legacy sin `SoloAdministrador` — seguimiento aparte)

### Pruebas ejecutadas

- xUnit Navegación: **9/9 PASS**
- Smoke HTTP: GET menus/admin **200** (BD sin filas menú)
- T-SQL: N/A

### Riesgos residuales

- Seed menús (DB-006) pendiente para datos no vacíos en UI.
- Legacy `POST/PATCH` menús/perfiles sin política admin.

### Decisiones técnicas relevantes

- Servicio Cuarta separado de `IMenusService` legacy.
- `Perfil` vs `Nombre` en `sgr.Perfiles` vía `SqlSchemaCompat`.

### Documentación actualizada

- [specs/usuarios.md](../../specs/usuarios.md), [_graph.md](../../_graph.md), [_sdd_evolution.md](../../_sdd_evolution.md)

### meta-sdd

Sin patrones nuevos que requieran rule/comando; observación: reutilizar `SqlSchemaCompat` al tocar `sgr.Perfiles` en nuevos repos Dapper.

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | EN REVISIÓN | `/ejecutar` | MVP backend JWT |
| 2026-10-27 | EN REVISIÓN | REQUIERE CAMBIOS | `/revisar` | Tests 9/9; falta smoke |
| 2026-10-27 | REQUIERE CAMBIOS | REQUIERE CAMBIOS | `/revisar` (2ª) | Login 401 |
| 2026-10-27 | REQUIERE CAMBIOS | LISTO PARA PR | `/revisar` (3ª) | Fix Perfil/Nombre; smoke 200 |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | `/completar` | delta + specs + graph |
