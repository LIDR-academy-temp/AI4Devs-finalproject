# Delta: tkt-fe-pat-001-admin-patterns

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Kit de patrones admin en `Web/src/shared/components/admin/`: `PageHeader`, `SectionHero`, `AlertBanner`, `FormModal`, `ConfirmDialog`, `AdminDataTable`, `EmptyState` (barrel `index.ts`).
- Piloto **AdminCasasPage**: alta/edición en `FormModal`, borrado en `ConfirmDialog`, feedback con `AlertBanner`; sin `window.prompt` / `window.confirm`.
- Tests Vitest de componentes (`PageHeader`, `FormModal`, `ConfirmDialog`) y flujo página (`AdminCasasPage.test.tsx`).
- Guía de migración en `design.md` §6; tabla de patrones en `referencia/ui-referencia-visual.md`.

## Comportamiento modificado

- **(Antes)** `AdminCasasPage`: UI ad hoc, diálogos nativos del navegador para crear/editar/eliminar.
- **(Después)** Composición con kit admin; formularios RHF+Zod en modal; errores de listado en `AlertBanner`.

## Comportamiento eliminado

- Uso de `prompt` / `confirm` en el piloto Casas (sustituido por modales accesibles).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Ninguno |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Ninguno |

## Para el reviewer

- **Qué se hizo**: Componentes admin reutilizables + refactor visual de `AdminCasasPage` sin cambiar contratos REST.
- **Por qué**: FE-PAT-001 — jerarquía visual alineada a `Web_diseño` y base para CRUD admin (FE-PAT-002 / FE-CRUD-*).
- **Riesgo**: Bajo (solo SPA; APIs intactas).
- **Qué probar**: `/admin/casas` — listar, crear, editar, eliminar; modal (Escape, Tab); errores de API en banner.
- **Rollback**: Revertir commits en `Web/`; sin migración BD.

## Aprendizajes

| Target | Aprendizaje | Acción | Evidencia |
|--------|-------------|--------|-----------|
| frontend | `FormModal`: focus trap solo cuando `open` cambia (`useEffect` deps `[open]`); evita robar foco en cada keystroke | Documentado en `impl.md` | Corrección en `/ejecutar` |

## Decisiones (ADR)

- ADR-PAT-1..4 en `design.md` (carpeta `admin/`, tokens Tailwind existentes, `ConfirmDialog` z-50, sin nueva dependencia UI en fase 1).
