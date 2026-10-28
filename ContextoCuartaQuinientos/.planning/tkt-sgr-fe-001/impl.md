[← design](design.md) | [← index](_index.md)

# impl.md — SGR-FE-001

## Implementado

- `useNavegacionMenus` + `NavegacionProvider` → `GET /SGR/Navegacion/menus`
- `AppSidebar` consume contexto; respuesta vacía → `APP_NAV` estático
- `NavMenuGuard` + `ForbiddenPage` cuando menú API tiene rutas y URL no permitida
- `/admin/menus`, `/admin/perfiles`, `/admin/perfiles/:id/permisos`
- `MenuTreeEditor`, `PerfilPermisosPanel`, CRUD menús vía APIs BE-030
- Listado perfiles: `GET /SGR/Perfiles/admin` (add-on BE, evita legacy `vsPerfiles`)
- `appNavigation.ts`: ítems Menús/Perfiles `implemented: true`
- Tests: `menuToNav.test.ts`, `useNavegacionMenus.test.tsx`, `AdminMenusPage.test.tsx`

## Add-on backend (mismo PR o follow-up)

- `GET /SGR/Perfiles/admin` en `PerfilesController` + `CuartaNavegacionRepository.ListarPerfilesAdminAsync`

## Verificación final

### Criterios de aceptación

- [x] **CA-3:** tests hook + `AdminMenusPage` (mock) — 179 Vitest PASS
- [x] **CA-1:** implementado (`refetch` tras permisos); **verificación E2E** → [[DB-006]] (escalado 2026-10-27)
- [x] **CA-2:** `NavMenuGuard` + sidebar API; **verificación E2E** → [[DB-006]] (escalado 2026-10-27)

### Must spec (implementación)

- [x] Hook → `GET /SGR/Navegacion/menus`
- [x] Rutas admin SGR + pantallas
- [x] Guard 403
- [~] Fallback error API: siempre usa estático hoy; flag `VITE_NAV_STATIC_FALLBACK` no cambia rama error (ambas → static)

### Pruebas T-SQL

- No aplica

### Pruebas API / Front

- `tsc --noEmit`: PASS
- `npm test`: **179/179** PASS
- `vite build --mode development`: PASS
- `GraphApi.Tests` Navegación: **9/9** PASS (add-on BE)
- APIs consumidas: [TKT-SGR-BE-030-APIS.md](../tkt-sgr-be-030/TKT-SGR-BE-030-APIS.md) (incl. `GET /SGR/Perfiles/admin`)

### QA Checklist

- [x] Happy path código (hook, páginas, sidebar estático pre-seed)
- [x] Tests unitarios CA-3
- [ ] CA-1/CA-2 smoke con BD sembrada (post DB-006)
- [ ] Test componente `NavMenuGuard` (opcional)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (alcance Web + add-on BE mínimo; sin secretos en cliente)
- auditor-seguridad: **APROBADO** (guard solo con menú API activo; admin vía `AdminRoute` + JWT en APIs)
- auditor-flutter: No aplica

### Desviaciones

- `PerfilPermisosPanel`: tabla checkboxes vs dual-list Web_diseño (aceptable MVP)
- Sin seed DB-006 el guard no aplica (sidebar estático)

### Pendientes (post-PR)

- **DB-006:** seed + smoke CA-1/CA-2
- Opcional: `SGR-FE-001_api_tests.http`
