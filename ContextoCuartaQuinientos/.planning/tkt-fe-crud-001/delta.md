# Delta: tkt-fe-crud-001-gestion-admin

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Pantallas admin de **Gestión** usan el stack canónico [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md): `cq-admin-page`, `AdminListToolbar`, `AdminFilterableTable`, `AdminSplitLayout` / `AdminSidePanel`, `ConfirmDialog` donde aplica.
- Artefactos de filtro cliente: `usuariosTableFilter.ts`, `ticketsAdminTableFilter.ts`, `morososTableFilter.ts`.
- Esquemas Zod admin usuarios: `usuariosAdminSchemas.ts` (alta/edición en panel).

## Comportamiento modificado

- **(Antes)** `AdminUsuariosPage`: Tailwind, modal centrado, `window.prompt` / `window.confirm`.
- **(Después)** Panel lateral, tabla filtrable, RHF+Zod, `ConfirmDialog`, errores API visibles (incl. toggle activo).

- **(Antes)** `AdminTicketsPage`: lista Tailwind + detalle en columna.
- **(Después)** Tabla filtrable + panel lateral (cambio de estado, asignación trabajador); acción «Ver ticket» accesible.

- **(Antes)** `FinanzasAdminPage` / `MorososTable`: tabla Tailwind simple.
- **(Después)** Shell admin Bootstrap; morosos con `AdminFilterableTable`; pagos siguen en `RegistrarPagoModal` (`FormModal`).

- **(Antes)** `AdminCasasPage` ya era referencia FE-PAT-002.
- **(Después)** Sin cambios en este ticket.

## Comportamiento eliminado

- `window.prompt` y `window.confirm` en `AdminUsuariosPage`.

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Ninguno |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Ninguno (mismos contratos REST existentes) |

## Para el reviewer

- **Qué se hizo**: Migración UI admin de usuarios, tickets y morosos al patrón Casas/FE-PAT-002.
- **Por qué**: FE-CRUD-001 — CRUD gestión alineado a `Web_diseño` y DoD PAT.
- **Riesgo**: Bajo (solo SPA; APIs sin cambio).
- **Qué probar**: `/admin/usuarios`, `/admin/tickets`, `/admin/finanzas` (tab Morosos); crear/editar/eliminar usuario; ver ticket y cambiar estado; filtros de tabla.
- **Rollback**: Revertir commit en `Web/`; sin migración BD.
