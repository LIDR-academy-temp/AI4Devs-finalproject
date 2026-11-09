# Delta: tkt-fe-pat-002-casas-web-diseno

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Dependencias SPA: `bootstrap@5.3.3`, `@mdi/font` con variables Pantone en `bootstrap-pantone.css`.
- Estilos admin portados: `cq-admin.css` (clases `cq-split`, `cq-form-pane`, `cq-tf-*`, `cq-list-*`) bajo `.cq-admin-page`.
- Stack reutilizable CRUD admin:
  - `AdminListToolbar`, `AdminSplitLayout`, `AdminSidePanel`
  - `AdminFilterableTable` + `useClientTableFilter` + `filterClientTableRows` (`shared/types/tableFilter.ts`)
- Config por dominio (piloto): `features/admin/casas/casasTableFilter.ts`.
- `AdminCasasPage`: paridad `Web_diseño/Casas.cshtml` — toolbar única, tabla filtrable, panel lateral 390px, delete con `ConfirmDialog` (error API en el diálogo).

## Comportamiento modificado

- **(Antes)** Piloto Casas post FE-PAT-001: modal centrado + componentes Tailwind (`PageHeader` / `SectionHero` / `AdminDataTable`).
- **(Después)** Bootstrap scoped + split tabla/panel; KPIs en `AdminListToolbar`; filtros columna + búsqueda global + contador `N de M`.

## Comportamiento eliminado

- Flujo principal create/edit en `FormModal` centrado en desktop (sustituido por panel lateral).
- Componente `CasasHero` (sustituido por `AdminListToolbar`).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Ninguno |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Sin cambio de contrato (`/SGR/Casas` igual) |

## Para el reviewer

- **Qué se hizo**: Paridad visual Casas + patrón tabla filtrable/split reutilizable para admin.
- **Por qué**: FE-PAT-002 — cerrar gap con `Web_diseño` y habilitar FE-CRUD-* / [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md).
- **Riesgo**: Medio-bajo (Bootstrap CSS import en ruta admin puede afectar shell; smoke sidebar/login recomendado).
- **Qué probar**: `/admin/casas` — toolbar, filtros, panel alta/edición, DELETE con error simulado, Vitest 173/173.
- **Rollback**: Revertir `Web/`; quitar imports Bootstrap de `AdminCasasPage`; kit FE-PAT-001 permanece en `shared/components/admin`.

## Aprendizajes

| Target | Aprendizaje | Acción | Evidencia |
|--------|-------------|--------|-----------|
| frontend | Errores de `apiDelete` deben mostrarse **dentro** de `ConfirmDialog`, no bajo el overlay | Patrón alineado a `AdminUsuariosPage` | Fix `/revisar` + test Vitest |

## Decisiones (ADR)

- ADR-BS-1..11 en `design.md` (Bootstrap scoped, stack genérico filtros, anti-redundancia toolbar).
