[← index](_index.md) | [← design](design.md)

# impl.md — SGR-BE-030

## Implementado (MVP)

| Endpoint | Estado |
|----------|--------|
| `GET /SGR/Navegacion/menus` | OK |
| `GET/POST/PUT/DELETE /SGR/Menus/admin` | OK |
| `GET/PUT /SGR/Perfiles/{id}/permisos-menus` | OK |

## Capas

- `CuartaNavegacionRepository` + `CuartaNavegacionService` + `MenuArbolBuilder`
- Controllers: `NavegacionController`, regiones JWT en `MenusController` / `PerfilesController`
- Legacy `SGR/Menus` y `SGR/Perfiles` sin cambio de rutas
- **Corrección revisión:** `ResolverPerfilIdAsync` usa `SqlSchemaCompat.PerfilNombreColumn` (`Perfil` vs `Nombre` en `sgr.Perfiles`)

## Pruebas

- `CuartaNavegacionServiceTests` + `NavegacionAuthorizationTests` (9 tests)
- `SGR-BE-030_api_tests.http`
- Smoke HTTP 2026-10-27 (API `:5180`, JWT firmado con user-secrets)

## Fuera de MVP (spec adversarial)

- `GET /SGR/Navegacion/botones`, CRUD JWT `/SGR/Perfiles/admin/*`, seed DB-006

## Verificación final

### Criterios de aceptación

- [x] **CA-1:** Menús por `PerfilMenus`; residente **200** `[]` en smoke (sin rutas `/admin` en payload).
- [x] **CA-2:** Admin **200** en `GET /SGR/Navegacion/menus` y `GET /SGR/Menus/admin` (árbol vacío hasta seed menús).
- [x] **CA-3:** INSERT/UPDATE con auditoría en repositorio.
- [x] **CA-4:** Tests 401/403 + smoke admin 200 / residente POST admin 403.
- [x] **CA-5:** Legacy sin cambio de rutas.

### Pruebas T-SQL (tester-sql)

- No aplica.

### Pruebas contrato C# xUnit

- `dotnet test --filter Navegacion|CuartaNavegacion`: **9/9 PASS** (2026-10-27, tras fix `Perfil`/`Nombre`).

### Matriz design.md

| TC | Resultado |
|----|-----------|
| TC-01 | Smoke admin GET menus **200** `[]` |
| TC-02 | Smoke residente GET menus **200** `[]` |
| TC-03 | `Post_menu_admin_sin_token_401` |
| TC-04 | Smoke residente POST admin **403** |
| TC-ERR | Unit `MENU_NO_ENCONTRADO` 422 |

### Pruebas API

- Archivo: `SGR-BE-030_api_tests.http`
- Smoke ejecutado: `GET /SGR/Navegacion/menus`, `GET /SGR/Menus/admin`, `GET /SGR/Perfiles/1/permisos-menus` → **200**; residente POST admin → **403**
- Login `GenerateToken` con pwd por defecto sigue **401** en este entorno; smoke validado con JWT HS256 (misma clave que API).

### QA Checklist

- [x] Happy path HTTP 200
- [x] 401/403/422 cubiertos
- [x] Compat esquema `Perfiles.Nombre` vs `Perfil`

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (re-auditoría previa)
- auditor-seguridad: **APROBADO** (scope JWT)
- auditor-flutter: No aplica

### Desviaciones detectadas

- BD local sin filas en `sgr.Menus` / `PerfilMenus` — respuestas `[]` en smoke (válido).
- Seed DB-006 recomendado para menús reales en UI.

### Pendientes post-PR

- Script seed menús (DB-006) para datos no vacíos en FE.
- Legacy `Menus`/`Perfiles` sin `SoloAdministrador` — ticket seguridad aparte.
