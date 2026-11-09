# Impl: tkt-fe-pat-002

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- Columna **Estado** muestra “Activa” (el listado API excluye `bEliminado`; DTO sin flag).
- KPI “Con correo” deriva del padrón de usuarios, no del DTO de casa.
- `/revisar`: error DELETE visible en `ConfirmDialog`; clases BS5 (`me-1`, sin `form-group`); eliminado `CasasHero` muerto; tests búsqueda global + delete fallido.

## Implementación realizada

- Deps: `bootstrap@5.3.3`, `@mdi/font@7.4.47`.
- Estilos: `Web/src/styles/bootstrap-pantone.css`, `cq-admin.css` (import en `AdminCasasPage`).
- Componentes shared: `AdminSplitLayout`, `AdminSidePanel`, `AdminListToolbar`, `AdminFilterableTable`, `useClientTableFilter`, `clientTableFilter.ts`.
- `AdminCasasPage`: split + panel lateral + tabla filtrable; `ConfirmDialog` para delete.
- Config dominio: `features/admin/casas/casasTableFilter.ts`.

## Archivos modificados

- `Web/package.json`, `package-lock.json`
- `Web/src/pages/AdminCasasPage.tsx`, `AdminCasasPage.test.tsx`
- `Web/src/styles/*`, `Web/src/shared/components/admin/*`, `Web/src/shared/lib/clientTableFilter.ts`, hooks, types
- `Web/src/features/admin/casas/casasTableFilter.ts`
- `ContextoCuartaQuinientos/referencia/ui-referencia-visual.md`

## Verificación final

### Criterios de aceptación

- [x] CA-1 Paridad checklist design §3 (toolbar + split + tabla/panel)
- [x] CA-2 Bootstrap en package; scoped `.cq-admin-page` en Casas
- [x] CA-3 Variables Pantone en `bootstrap-pantone.css`
- [x] CA-4 Panel lateral + `cq-row-active`
- [x] CA-5 Tests panel, POST/PUT, delete confirm (+ error en diálogo)
- [x] CA-6 Build verde
- [x] CA-7 Filtros thead + búsqueda global + contador `N de M`
- [x] CA-8 Stack genérico shared + accessors Casas
- [x] CA-9 `AdminListToolbar` única barra; sin hero/listado duplicado

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica (sin cambio de endpoints)

### Vitest / matriz design T-1–T-10

| ID | Resultado |
|----|-----------|
| T-1 AdminListToolbar KPIs | PASS (`AdminCasasPage.test.tsx`) |
| T-10 Sin textos redundantes | PASS |
| T-2 Nueva casa → panel | PASS |
| T-3 Editar + fila activa | PASS |
| T-4 POST/PUT panel | PASS |
| T-5 Delete ConfirmDialog | PASS |
| T-6 tsc + vite build | PASS (2026-10-27) |
| T-7 Filtro columna dirección | PASS |
| T-8 `clientTableFilter.test.ts` | PASS |
| T-9 Integración Casas + hook | PASS |
| Extra | Búsqueda global + contador; DELETE error en diálogo |

- Suite completa: **173/173** (`npm test -- --run`, 2026-10-27)

### QA Checklist

- [x] Happy path alta/edición/delete
- [x] Error listado API (alert dismissible)
- [x] Error DELETE en diálogo (no oculto bajo modal)
- [x] Filtro columna + búsqueda global
- [ ] Smoke manual sidebar/login tras cargar Casas (recomendado pre-PR)
- [x] Mutation / T-SQL — N/A

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (post corrección F001–F004 en `/revisar`)
- auditor-seguridad: No aplica (sin endpoints nuevos)
- auditor-flutter: No aplica

### Desviaciones detectadas

- Estado siempre “Activa” hasta que API exponga `bEliminado` (documentado; F005 informativo).
- Bootstrap CSS import global en módulo de página (riesgo shell — validación manual pendiente).
- Should: drawer `<768px` no verificado en tests automatizados.

### Pendientes

- Rama `feature/fe-pat-002-casas-web-diseno` si aún no existe.
- `TKT-FE-PAT-002-APIS.md`: No aplica (sin endpoints).
- Sello `revisar`: **SIN SELLO** (ticket solo frontend; sin objetos SQL en sello.py).
