# Impl: tkt-fe-crud-001-gestion-admin

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-10-23] KPI usuarios: `Activos` / `Inactivos` en lugar de «con casa» — el padrón no expone `casaId` en listado.
- [2026-10-23] AdminCasasPage sin cambios — ya cumple patrón FE-PAT-002 (solo gaps menores no bloqueantes).

## Implementación realizada

1. **AdminUsuariosPage** — stack `AdminListToolbar` + `AdminFilterableTable` + `AdminSplitLayout`/`AdminSidePanel`, RHF/Zod, `ConfirmDialog`; sin `prompt`/`confirm`.
2. **AdminTicketsPage** — tabla filtrable + panel lateral detalle (estado / asignación).
3. **FinanzasAdminPage** — shell `cq-admin`, tabs Bootstrap; morosos vía `MorososTable` → `AdminFilterableTable`.
4. **AdminCasasPage** — referencia intacta.

## Archivos modificados

- `Web/src/pages/AdminUsuariosPage.tsx`
- `Web/src/pages/AdminTicketsPage.tsx`
- `Web/src/pages/FinanzasAdminPage.tsx`
- `Web/src/pages/AdminUsuariosPage.test.tsx`
- `Web/src/pages/AdminTicketsPage.test.tsx`
- `Web/src/pages/FinanzasAdminPage.test.tsx`
- `Web/src/features/admin/usuarios/usuariosAdminSchemas.ts` (nuevo)
- `Web/src/features/admin/usuarios/usuariosTableFilter.ts` (nuevo)
- `Web/src/features/admin/tickets/ticketsAdminTableFilter.ts` (nuevo)
- `Web/src/features/admin/finanzas/morososTableFilter.ts` (nuevo)
- `Web/src/features/admin/finanzas/MorososTable.tsx`
- `Web/src/features/admin/finanzas/MorososTable.test.tsx`

## Auditoría SQL

- Estado: No aplica
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO (tras corrección F001–F003)
- Hallazgos: toggle sin error, fila ticket solo click, test panel tickets
- Correcciones: `actionError`, botón Ver ticket, test `apiPatch` + POST create

## Scripts de prueba creados

### T-SQL unitarias
- No aplica

### Contrato C# xUnit
- No aplica

### Vitest
- Actualizados/ampliados tests en páginas migradas (listado, error, panel, delete confirm).

## Resultado contra criterios de aceptación

- [x] CA-1: 4 rutas alineadas al patrón CRUD admin (Casas ya referencia; Usuarios/Tickets/Finanzas migrados).
- [x] CA-2: Sin cambios en `apiClient` — token vía FE-QA-001.

## Verificación final

### Criterios de aceptación

- [x] **CA-1**: Usuarios/Tickets/Finanzas (morosos) al patrón CRUD admin; Casas sin cambios (referencia FE-PAT-002). *Excepción documentada:* tab **cuotas** Finanzas sin `AdminFilterableTable` (design §orden #3).
- [x] **CA-2**: Sin cambios en `apiClient`; token en FE-QA-001.

### Must por pantalla (spec)

| Pantalla | Listado/filtros | Panel/modal | ConfirmDialog | TableFilter | Schemas | Vitest DoD |
|----------|-----------------|-------------|---------------|-------------|---------|------------|
| Usuarios | ✓ | ✓ lateral | ✓ | ✓ | ✓ | ✓ error, POST, PUT, DELETE |
| Tickets | ✓ | ✓ detalle | N/A (sin baja) | ✓ | N/A (sin form CRUD) | ✓ error, panel `apiPatch` |
| Finanzas morosos | ✓ | N/A | N/A | ✓ | N/A (pagos `FormModal`) | ✓ tab + MorososTable |
| Casas | ✓ (previo) | ✓ | ✓ | ✓ | ✓ | ✓ (FE-PAT-002) |

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica (sin endpoints nuevos)

### Frontend (Vitest + build)

- `npm test -- --run`: **178/178** passed (2026-10-23 `/revisar`)
- `tsc --noEmit`: OK
- `vite build --mode development`: OK (ejecutar)

### QA Checklist

- [x] Happy path listados + paneles
- [x] Casos error (listado API, toggle activo, delete en diálogo)
- [x] Sin `window.prompt` / `window.confirm` en páginas migradas
- [x] Regresión: suite global en verde

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (post F001–F003 en `/ejecutar`)
- auditor-flutter: No aplica
- auditor-seguridad: No aplica (sin endpoints/SQL nuevo)

### Desviaciones detectadas

- Ruta `ticketsAdminTableFilter.ts` bajo `features/admin/tickets/` (design citaba `features/tickets/`).
- KPI usuarios sin «con casa» (ver Ajustes).
- Tab cuotas Finanzas: UI legacy aceptada en design.

### Pendientes

- Tab **cuotas** Finanzas → `AdminFilterableTable` (follow-up opcional).
- Adjuntos en tickets admin si expone API TKT.
- **APIS.md**: No aplica (sin endpoints).
- Sello `verde`/`revisar` SQL: N/A (solo frontend).
