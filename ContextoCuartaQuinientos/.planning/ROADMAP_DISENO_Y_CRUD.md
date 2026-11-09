# Roadmap — Paridad visual Web_diseño + CRUD completos (SPA React)

> Hub de ejecución **uno a la vez**. Cada fila = carpeta `tkt-<id>/` con `_index.md`, `spec.md`, `design.md`.
> Referencia visual: `Web_diseño/Web` (MVC). Contrato producto: `readme.md` §3–§4.
> **Patrón CRUD admin:** [PATRON_CRUD_ADMIN.md](PATRON_CRUD_ADMIN.md) — código: `AdminCasasPage.tsx`.

## Orden obligatorio

| # | Ticket | Nombre corto | Depende de | Estado SDD |
|---|--------|--------------|------------|------------|
| 1 | [[FE-PAT-001]](tkt-fe-pat-001/_index.md) | Patrones UI admin (componentes + a11y; piloto mínimo) | FE-DS-001, FE-SHELL-001, FE-UX-001 | ARCHIVADO |
| 1b | [[FE-PAT-002]](tkt-fe-pat-002/_index.md) | Paridad Casas + stack tabla/toolbar/split | FE-PAT-001 | ARCHIVADO |
| 2 | [[SGR-BE-030]](tkt-sgr-be-030/_index.md) | API JWT menús / perfiles / permisos | DB-001 (tablas `sgr.*`) | ARCHIVADO |
| 3 | [[SGR-FE-001]](tkt-sgr-fe-001/_index.md) | Sidebar dinámico + pantallas SGR admin | FE-PAT-002, SGR-BE-030 | ARCHIVADO |
| 4 | [[FE-CRUD-001]](tkt-fe-crud-001/_index.md) | CRUD Gestión (tickets, usuarios, casas, finanzas) | FE-PAT-002 | ARCHIVADO |
| 5 | [[FE-CRUD-002]](tkt-fe-crud-002/_index.md) | CRUD Comunidad admin | FE-PAT-002 | ARCHIVADO |
| 6 | [[FE-CRUD-003]](tkt-fe-crud-003/_index.md) | CRUD Registro admin | FE-PAT-002 | ARCHIVADO |
| 7 | [[FE-CRUD-004]](tkt-fe-crud-004/_index.md) | CRUD / UX residente | FE-PAT-002 (admin); tokens residente | ARCHIVADO |
| 8 | [[FE-QA-001]](tkt-fe-qa-001/_index.md) | Calidad integración (apiClient + smoke E2E) | FE-CRUD-001 mínimo | ARCHIVADO |

## Reglas transversales (todos los tickets FE)

- Sin endpoints `*/legacy` en el SPA.
- DoD admin lista: [PATRON_CRUD_ADMIN.md](PATRON_CRUD_ADMIN.md) (toolbar + tabla filtrable + panel lateral).
- Prohibido `window.prompt` / `window.confirm` (`AdminSidePanel` + `ConfirmDialog`).
- Textos de negocio desde API/catálogo cuando existan; literales solo marco UI (readme regla contenido configurable).
- Tras cada ticket: `npm test`, `tsc --noEmit`, `vite build`.

## UX posterior (nueva cola)

| Ticket | Nombre | Estado SDD |
|--------|--------|------------|
| [[FE-UX-002]](tkt-fe-ux-002/_index.md) | Login premium + sidebar push (sin solapamiento) | ARCHIVADO |
| [[FE-UX-003]](tkt-fe-ux-003/_index.md) | Toasts, crumbs SGR, ModuleTitle, acordeón sidebar | ARCHIVADO |
| [[FE-UX-004]](tkt-fe-ux-004/_index.md) | Admin móvil (cards) + toasts en pilotos CRUD | ARCHIVADO |
| [[FE-UX-005]](tkt-fe-ux-005/_index.md) | Rollout cards + toasts (resto Admin*) | ARCHIVADO |
| [[FE-UX-006]](tkt-fe-ux-006/_index.md) | Residente (toasts detalle) + modo oscuro + onboarding | ARCHIVADO |

## Fuera de alcance de esta oleada

- Admin Pro / jQuery del MVC completo (Bootstrap 5 scoped solo en [[FE-PAT-002]] y derivados CRUD).
- Bot Telegram, BI/RPT avanzado.
- Tema sitio editable en runtime (Web_diseño `TemaSitio`) — ticket futuro **FE-THEME-001** si se pide.

## Comandos SDD por ticket

```
/definir  → revisar spec.md (gate entradas en spec §0)
/diseñar  → design.md + /test automático si hay SQL
/ejecutar → rama feature/<ticket>-<slug>
/revisar  → impl.md
/completar → delta.md + actualizar ENTREGA_MODULOS
```
