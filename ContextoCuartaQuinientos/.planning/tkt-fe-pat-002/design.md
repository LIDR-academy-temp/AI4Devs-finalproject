[← spec](spec.md) | [← index](_index.md)

# design.md — FE-PAT-002

## 1. ADRs

| ID | Decisión |
|----|----------|
| ADR-BS-1 | **Sí Bootstrap 5.3** en `Web` — ticket explícito revoca “sin nueva dep UI” de FE-PAT-001 solo para stack admin scoped. |
| ADR-BS-2 | **No** portar Admin Pro / jQuery del MVC; solo CSS Bootstrap + CSS `cq-*` portado. |
| ADR-BS-3 | Cargar Bootstrap **solo en ruta admin Casas** vía `import 'bootstrap/dist/css/bootstrap.min.css'` en `AdminCasasPage.tsx` o en `cq-admin.css` importado por esa página — evitar regresión visual en Login/Home. |
| ADR-BS-4 | Tailwind coexistencia: raíz `<div className="cq-admin-page">` envuelve todo el contenido Bootstrap; no mezclar `btn` y `rounded-md bg-primary` en el mismo control. |
| ADR-BS-5 | Panel lateral = componente nuevo `AdminSplitLayout` + `AdminSidePanel` en `shared/components/admin/` (reutilizable FE-CRUD-001). |
| ADR-BS-6 | Iconos: `@mdi/font` (paridad mock) import una vez en `cq-admin.css` o `main` condicional. |
| ADR-BS-7 | Filtros tabla **genéricos**: UI `AdminFilterableTable`, estado `useClientTableFilter`, motor `filterClientTableRows` + tipos en `shared/types/tableFilter.ts`; tipos columna `text` / `select` / `none` como `data-type` en MVC; **sin** paginado JS en v1. |
| ADR-BS-8 | Config por dominio en `features/<dominio>/*TableFilter.ts` (columnas + accessors); **prohibido** copiar markup de filtros en cada página. |
| ADR-BS-9 | Estilos `cq-tf-*`: importar `cq-admin.css` en la página o envolver en `.cq-admin-page` (Bootstrap scoped). |
| ADR-BS-11 | Tablas filtrables: `table-striped` por defecto en `AdminFilterableTable` (zebra con tokens Pantone en `cq-admin.css`). |
| ADR-BS-10 | **Anti-redundancia listados:** `AdminListToolbar` (título + métricas inline + `filterSlot` + CTA). No usar `CasasHero` + `h1` + «Listado de…» en la misma vista. Conteo de filas **solo** en toolbar de tabla (`cq-tf-count`). |

### Variables Bootstrap ↔ Pantone

En `Web/src/styles/bootstrap-pantone.scss` o bloque CSS post-import:

```css
:root {
  --bs-primary: var(--color-primary);
  --bs-primary-rgb: 96, 150, 186;
  --bs-danger: var(--color-danger);
  --bs-success: var(--color-success);
  --bs-body-bg: var(--color-surface-alt);
  --bs-border-color: var(--color-neutral-100);
}
```

(Ajustar rgb al compilar o documentar valores exactos de `index.css`.)

## 2. Mapa Web_diseño → React (Casas)

| Bloque `Casas.cshtml` | Implementación |
|----------------------|----------------|
| L13–34 alerts | `Alert` Bootstrap o `AlertBanner` con clases `alert alert-*` |
| L46–59 `cq-reserva-hero` | **Sustituido** por `AdminListToolbar` (KPIs compactos; hero completo solo si mock lo exige en otra pantalla) |
| L62–159 `cq-split` + tabla | `AdminSplitLayout` + `AdminFilterableTable` |
| `cq-table-filter.js` | `AdminFilterableTable` + `useClientTableFilter` |
| L161–310 `cq-form-pane` | `AdminSidePanel` + form RHF existente |
| L315–454 `<style>` | `Web/src/styles/cq-admin.css` |
| L534–577 Topbar | Opcional Should: integrar filtros en `PageHeader` admin o segunda barra bajo shell |
| `confirm()` delete | `ConfirmDialog` (mantener) |

## 3. Checklist paridad visual (CA-1)

- [x] Barra única: título + KPIs inline + filtro condominio + CTA
- [x] ~~Hero marketing + «Listado de casas»~~ eliminados (CA-9)
- [x] Tabla hover + fila activa al editar
- [x] Panel 390px con header icono + cerrar
- [x] Botones primario/secundario en pie del formulario
- [x] Empty state centrado con icono casa
- [x] Fila de filtros bajo títulos de columna + búsqueda global

## 4. Orden de implementación

| Paso | Entregable | Estado |
|------|------------|--------|
| 1 | `npm i bootstrap @mdi/font`; `bootstrap-pantone.css` + `cq-admin.css` | ✓ Hecho |
| 2 | `AdminSplitLayout`, `AdminSidePanel`, `CasasHero` | ✓ Hecho |
| 3 | Refactor `AdminCasasPage` (panel CRUD, quitar modal centrado desktop) | ✓ Hecho |
| 4 | Tests Vitest panel + KPI + delete | ✓ Hecho |
| 5 | Actualizar `ui-referencia-visual.md` (sección Bootstrap scoped) | ✓ Hecho |
| 6 | `impl.md` | ✓ Hecho |

## 5. Plan de pruebas

| ID | Tipo | Descripción |
|----|------|-------------|
| T-1 | UI | `AdminListToolbar` muestra KPIs coherentes con listado |
| T-10 | UI | Sin textos «Listado de…» ni doble conteo registro(s) |
| T-2 | UI | Click “Nueva casa” abre panel (`panel-open`) |
| T-3 | UI | Editar resalta fila y precarga formulario |
| T-4 | API mock | POST/PUT desde panel |
| T-5 | UI | Delete usa ConfirmDialog |
| T-6 | Build | tsc + vite |
| T-7 | Filtro | Columna dirección reduce filas visibles |
| T-8 | Unit | `clientTableFilter.test.ts` (genérico) |
| T-9 | Integración | `AdminCasasPage` usa hook + accessors Casas |

## 6. Contenido configurable

Literales de marco UI en hero/subtítulos (español fijo hasta catálogo back); errores API vía `problem.detail`.

## 7. Rollback

Quitar imports Bootstrap de la página y restaurar layout FE-PAT-001 (git); patrones `shared/components/admin` sin Bootstrap permanecen para otros CRUD.

## 8. Patrón tabla filtrable (todo el proyecto)

### Artefactos compartidos (no tocar por CRUD)

| Artefacto | Ruta |
|-----------|------|
| Tipos | `Web/src/shared/types/tableFilter.ts` |
| Motor filtro | `Web/src/shared/lib/clientTableFilter.ts` |
| Hook | `Web/src/shared/hooks/useClientTableFilter.ts` |
| UI tabla | `Web/src/shared/components/admin/AdminFilterableTable.tsx` |
| Barra listado | `Web/src/shared/components/admin/AdminListToolbar.tsx` (clases `cq-list-*`) |
| Estilos | `Web/src/styles/cq-admin.css` (clases `cq-tf-*`, `cq-list-*`) |

### Por cada nueva pantalla con tabla admin

1. Crear `features/<dominio>/<entidad>TableFilter.ts` con `*_TABLE_COLUMNS` y `create*TableAccessors(...)`.
2. En la página: `useMemo` de accessors; `useClientTableFilter(rows, columns, accessors)`.
3. Renderizar `<AdminFilterableTable {...hook}>` y mapear `filteredRows` en `<tbody>`.
4. Si no hay filas tras filtro: fila única “Sin resultados para los filtros aplicados.”
5. Importar `cq-admin.css` (+ Bootstrap si aplica) o usar contenedor `.cq-admin-page`.
6. Tests: unit del accessor/motor si hay reglas no triviales; integración mínima en la página.

### Ejemplo referencia

- Columnas + accessors: `Web/src/features/admin/casas/casasTableFilter.ts`
- Consumo: `Web/src/pages/AdminCasasPage.tsx`

### FE-CRUD-*

Usuarios, tickets, finanzas, etc. deben adoptar este patrón en lugar de tablas planas o `AdminDataTable` cuando el mock MVC lleve `cq-filterable`.

## 9. Patrón cabecera listado CRUD (anti-redundancia)

### Jerarquía visual (una pantalla)

1. `AdminListToolbar` — título H1, métricas opcionales (`metrics[]`), filtro de ámbito API (`filterSlot`), acción primaria.
2. Card tabla — solo empty/loading/`AdminFilterableTable` (búsqueda + conteo + filtros columna).
3. `AdminSplitLayout` — panel lateral si aplica.

### Prohibido

- Título de página repetido (`h1` + `card-title` con el mismo dominio).
- Hero con copy largo encima de una tabla que ya se explica sola.
- Badge «N registro(s)» fuera de `cq-tf-count` cuando la tabla es filtrable.

### Plantilla página

```tsx
<AdminListToolbar title="Casas" metrics={kpis} filterSlot={...} primaryAction={...} />
<AdminSplitLayout tablePane={<card><AdminFilterableTable ... /></card>} formPane={...} />
```
