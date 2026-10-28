# FE-PAT-001 — Patrones UI admin (paridad Web_diseño)

| Campo | Valor |
|-------|-------|
| Estado | **ARCHIVADO** |
| Prioridad | 1 (bloqueante del resto) |
| Rama sugerida | `feature/fe-pat-001-admin-patterns` |
| Talla | M |

## Documentos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Roadmap | [ROADMAP_DISENO_Y_CRUD.md](../ROADMAP_DISENO_Y_CRUD.md) | ✅ |
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | Creado |

## Depende de

- [[FE-DS-001]] · [[FE-SHELL-001]] · [[FE-UX-001]] (shell/sidebar ya en repo)

## Habilita

- [[FE-PAT-002]] (patrón visual Casas) → luego [[SGR-FE-001]] · [[FE-CRUD-001]] … [[FE-CRUD-004]]

Patrón unificado documentado en [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md).

## Dominios

- [[frontend]] · [[ux]]

## Resumen final

### Objetivo cumplido

- Kit admin reutilizable + piloto `AdminCasasPage` sin diálogos nativos; CA Must verificados.

### Archivos modificados

- `Web/src/shared/components/admin/*` (nuevo)
- `Web/src/pages/AdminCasasPage.tsx`, `AdminCasasPage.test.tsx`
- `ContextoCuartaQuinientos/referencia/ui-referencia-visual.md`
- `design.md` §6 guía migración

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO (post F001–F004 en `/ejecutar`)

### Correcciones automáticas aplicadas

- Zod+RHF en formularios; manejo error delete/listado; ajuste focus trap `FormModal` (deps `[open]`).

### Pruebas ejecutadas

- T-SQL (`tester-sql`): N/A
- C# xUnit: N/A
- API `.http`: N/A
- Vitest: **166/166**; `tsc --noEmit` + `vite build` OK (2026-10-23)

### Riesgos residuales

- Should no implementado: `ResponsiveTable`, `/dev/patterns`.
- Menores a11y: scroll lock modal (F005), `aria-describedby` en confirm (F006); tests PUT/error modal pendientes (FE-CRUD-001).
- Rama dedicada puede no estar creada (trabajo en rama paralela).

### Decisiones técnicas relevantes

- ADR-PAT-1..4 en `design.md`; sin Radix/shadcn/Bootstrap en fase 1 del kit.

### Documentación actualizada

- [delta.md](delta.md) · [specs/frontend.md](../../specs/frontend.md) · [_graph.md](../../_graph.md) · `ui-referencia-visual.md`

### meta-sdd

- **Sin patrones nuevos** que requieran rule/agente (umbral ≥3 tickets). Observación: focus trap en modales — documentar deps `[open]` en futuros modales admin (ver `impl.md`).

### Sellos

- `_sellos.jsonl`: **SIN SELLO** (cierre con `/completar` explícito del usuario; revisión `/revisar` 2026-10-23).

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-23 | SPEC PENDIENTE | SDD generado tras gap Web vs Web_diseño |
| 2026-10-23 | LISTO PARA EJECUTAR | Diseño aceptado |
| 2026-10-23 | EN REVISIÓN | `/ejecutar` — patrones admin + piloto Casas |
| 2026-10-23 | LISTO PARA PR | `/revisar` — CA Must OK; Vitest 166/166; build OK |
| 2026-10-23 | — | Gap visual vs `Web_diseño/Casas.cshtml` → [[FE-PAT-002]] |
| 2026-10-27 | ARCHIVADO | `/completar` — delta, specs/frontend, graph, métricas |
