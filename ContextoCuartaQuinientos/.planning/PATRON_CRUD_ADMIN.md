# Patrón canónico — CRUD admin (post FE-PAT-001 / FE-PAT-002)

> **Referencia de código:** `Web/src/pages/AdminCasasPage.tsx`  
> **No copiar** pantallas viejas con Tailwind suelto + `window.prompt` como plantilla.

## Stack obligatorio por pantalla listado + alta/edición

| Capa | Qué usar |
|------|----------|
| Contenedor | `div.cq-admin-page.container-fluid.py-4` |
| Estilos | `bootstrap-pantone.css` + `cq-admin.css` (+ `bootstrap` CSS en la página hasta globalizar) |
| Iconos | MDI (`@mdi/font`) en labels y acciones |
| Cabecera | `AdminListToolbar` (título, KPIs, filtro API, CTA) — **sin** segundo h1 ni hero duplicado |
| Tabla | `AdminFilterableTable` + `useClientTableFilter` + `features/**/<entidad>TableFilter.ts` |
| Layout form | `AdminSplitLayout` + `AdminSidePanel` (alta/edición lateral, no modal centrado) |
| Baja | `ConfirmDialog` (nunca `window.confirm`) |
| Formulario | `react-hook-form` + `zodResolver` → schemas en `features/**/<entidad>Schemas.ts` |
| Errores API | `problem.detail` en alert dentro del panel o dismissible arriba |
| Vacío | `cq-empty-state` o `EmptyState` según densidad del mock |

## Artefactos por ticket FE-CRUD-*

1. `Web/src/features/admin/<modulo>/<entidad>TableFilter.ts` (si hay tabla)
2. `Web/src/features/admin/<modulo>/<entidad>AdminSchemas.ts` (Zod)
3. Hook de datos existente o `use<Entidad>Admin.ts` — **sin** cambiar contrato API salvo ticket BE
4. Página en `Web/src/pages/Admin*Page.tsx` siguiendo estructura Casas
5. Tests: página (happy + error listado + confirm delete) + unit accessors si hay lógica filtro

## Cuándo usar otros componentes PAT-001

| Caso | Componente |
|------|------------|
| Wizard o formulario sin tabla | `FormModal` o página dedicada |
| Solo lectura / detalle | `PageHeader` + `SectionHero` opcional |
| Tabla simple sin filtros columna | `AdminDataTable` (excepción documentada en `impl.md`) |

## Checklist Definition of Done (cada pantalla)

- [ ] Imports `cq-admin` + patrones desde `shared/components/admin`
- [ ] Sin `window.prompt` / `window.confirm`
- [ ] Split panel o modal documentado; CRUD lista → **split** por defecto
- [ ] Filtros cliente en tabla cuando ≥4 columnas o mock MVC `cq-filterable`
- [ ] `npm test`, `tsc --noEmit`, `vite build`

## SDD detalle

- Kit base: [tkt-fe-pat-001/design.md](tkt-fe-pat-001/design.md)
- Split + tabla filtrable + toolbar: [tkt-fe-pat-002/design.md](tkt-fe-pat-002/design.md) §8–§9
