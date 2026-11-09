[← spec](spec.md) | [← index](_index.md)

# design.md — FE-CRUD-001

[Patrón canónico](../PATRON_CRUD_ADMIN.md) · Referencia: `AdminCasasPage.tsx`

## Orden sugerido

| # | Pantalla | Estado |
|---|----------|--------|
| 1 | **AdminUsuariosPage** — tabla + panel (sustituir `prompt`/`confirm`) | ✓ Hecho |
| 2 | **AdminTicketsPage** — split detalle en panel | ✓ Hecho |
| 3 | **FinanzasAdminPage** — morosos + shell admin; pagos `FormModal` | ✓ Hecho (tab cuotas sin tabla filtrable — alcance mínimo) |
| 4 | **AdminCasasPage** — gaps FE-PAT-002 | ✓ N/A (ya referencia) |

## Por pantalla (artefactos nuevos)

| Página | `*TableFilter.ts` | `*Schemas.ts` | Notas |
|--------|-------------------|---------------|--------|
| AdminUsuariosPage | `features/admin/usuarios/usuariosTableFilter.ts` | `usuariosAdminSchemas.ts` | KPI: activos, con casa |
| AdminTicketsPage | `features/tickets/ticketsAdminTableFilter.ts` | según DTO TKT | Filtro estado/prioridad |
| FinanzasAdminPage | por tab (morosos, etc.) | según tab | Reusar `MorososTable` → migrar a `AdminFilterableTable` |

## Pruebas

Misma matriz que FE-PAT-002 T-7–T-9 por pantalla migrada.
