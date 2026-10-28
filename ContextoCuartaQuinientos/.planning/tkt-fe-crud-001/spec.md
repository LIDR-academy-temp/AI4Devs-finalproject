[← index](_index.md) | [design →](design.md)

# spec.md — FE-CRUD-001: CRUD completo — Gestión

## Alcance pantallas

| Página | Ruta | API | Gaps actuales |
|--------|------|-----|----------------|
| AdminTicketsPage | `/admin/tickets` | TKT | Panel detalle OK; falta patrón visual + adjuntos si API |
| AdminUsuariosPage | `/admin/usuarios` | SGR/Usuarios | Migrar a patrón Casas (`prompt`/`confirm` hoy) |
| AdminCasasPage | `/admin/casas` | SGR/Casas | Referencia FE-PAT-002; solo fixes menores |
| FinanzasAdminPage | `/admin/finanzas` | FNZ | Tabs: tablas → `AdminFilterableTable`; pagos pueden usar `FormModal` |

## Patrón obligatorio

Clonar estructura de `AdminCasasPage.tsx` ([PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)): `AdminListToolbar` → card + `AdminFilterableTable` → `AdminSplitLayout` + `AdminSidePanel` + RHF/Zod + `ConfirmDialog`.

## Must (DoD por pantalla)

- Listar + filtros columna/cliente + vacío/carga/error.
- Alta/edición en **panel lateral** (excepción: flujos solo modal documentados en `impl.md`).
- Baja lógica con **ConfirmDialog**.
- Sin `window.prompt` / `window.confirm`.
- `*TableFilter.ts` + `*AdminSchemas.ts` por entidad con tabla.
- Tests Vitest (listado error, panel save mock, delete confirm).

## CA globales

- CA-1: Las 4 rutas pasan checklist DoD en `design.md`.
- CA-2: `apiPost`/`apiPut`/`apiDelete` usan token (regresión cubierta en FE-QA-001).
