# FE-PAT-002 — Paridad visual Casas (Web_diseño + Bootstrap)

| Campo | Valor |
|-------|-------|
| Estado | **ARCHIVADO** |
| Prioridad | 1b (cierra gap visual tras FE-PAT-001) |
| Rama sugerida | `feature/fe-pat-002-casas-web-diseno` |
| Talla | M |

## Documentos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | Creado |
| APIs Front | — | No aplica |

## Depende de

- [[FE-PAT-001]] (patrones base: `ConfirmDialog`, RHF+Zod — **no revertir** a `prompt`)

## Habilita

- [[FE-CRUD-001]] · [[FE-CRUD-002]] · [[FE-CRUD-003]] · [[SGR-FE-001]] — [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)

## Dominios

- [[frontend]] · [[ux]]

## Resumen final

### Objetivo cumplido

- Paridad Casas con `Web_diseño` + stack genérico tabla filtrable/split; CA Must verificados.

### Archivos modificados (principal)

- `Web/package.json` (bootstrap, mdi)
- `Web/src/pages/AdminCasasPage.tsx` + tests
- `Web/src/styles/bootstrap-pantone.css`, `cq-admin.css`
- `Web/src/shared/components/admin/*` (split, toolbar, filterable table)
- `Web/src/shared/lib/clientTableFilter.ts`, hooks, types
- `Web/src/features/admin/casas/casasTableFilter.ts`
- `referencia/ui-referencia-visual.md`

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO (post corrección en `/revisar`)

### Correcciones en revisión

- DELETE error en `ConfirmDialog`; clases BS5; tests búsqueda global + delete fallido; eliminado `CasasHero`.

### Pruebas ejecutadas

- Vitest: **173/173** (2026-10-27)
- T-SQL / API: N/A
- `tsc` + `vite build`: OK

### Riesgos residuales

- Bootstrap CSS import global en módulo de página — validar shell manualmente.
- Columna Estado fija “Activa” hasta DTO con `bEliminado`.
- Should responsive drawer sin test E2E.

### meta-sdd

- **Sin patrones nuevos** que requieran rule/agente (≥3 tickets). Observación: patrón `deleteError` en `ConfirmDialog.message` — reutilizar en nuevos CRUD admin.

### Sellos

- `_sellos.jsonl`: **SIN SELLO** (solo frontend; cierre con `/completar` tras `/revisar` 2026-10-27).

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-23 | SPEC PENDIENTE | SDD paridad Web_diseño + Bootstrap |
| 2026-10-23 | EN REVISIÓN | `/ejecutar` — split, filtros, toolbar |
| 2026-10-27 | LISTO PARA PR | `/revisar` — Vitest 173/173; auditor APROBADO |
| 2026-10-27 | ARCHIVADO | `/completar` — delta + specs + graph |
