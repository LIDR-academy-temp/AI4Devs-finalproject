# SDD evolution log — CuartaQuinientos

## Métricas de proceso

| Fecha cierre | TKT | Dominio(s) | Talla | Días spec→cierre | Targets en scope | Auditoría a la 1ª | Ciclos REQUIERE CAMBIOS | Tests T-SQL | Estructura |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-23 | FE-CRUD-001 | frontend, usuarios, tickets, finanzas | M | 0 | frontend | No (1 ciclo en ejecutar) | 1 | N/A | estándar |
| 2026-10-19 | FE-043 | anuncios | M | 0 | frontend | No (2 ciclos revisar) | 2 | N/A | estándar |
| 2026-10-26 | FE-MOD-ENC-001 | encuestas | L | 3 | backend, frontend | No (1 ciclo REQUIERE CAMBIOS) | 1 | N/A | estándar |
| 2026-10-26 | FE-CRUD-002 | anuncios, archivos, juntas, encuestas | M | 3 | frontend | No (fixes post-auditoría en ejecutar) | 1 | N/A | estándar |
| 2026-10-26 | FE-CRUD-003 | visitas-areas, vehiculos, mascotas, almacen, frontend | L | 0 | backend, frontend | Sí (sin ciclo REQUIERE CAMBIOS) | 0 | N/A | estándar |
| 2026-10-27 | FE-PAT-001 | frontend, ux | M | 4 | frontend | No (fixes F001–F004 en ejecutar) | 1 | N/A | estándar |
| 2026-10-27 | FE-PAT-002 | frontend, ux | M | 4 | frontend | No (1 ciclo REQUIERE CAMBIOS en revisar) | 1 | N/A | estándar |
| 2026-10-27 | SGR-BE-030 | usuarios, auth, sgr | M | 0 | backend | No (2 ciclos revisar + fix Perfil/Nombre) | 2 | N/A | estándar |
| 2026-10-27 | SGR-FE-001 | frontend, sgr, usuarios | M | 0 | frontend, backend (add-on) | No (REQUIERE DECISIÓN → defer DB-006) | 0 | N/A | estándar |
| 2026-10-27 | FE-CRUD-004 | frontend (+ dominios M5) | L | 1 | frontend | No (2 ciclos REQUIERE CAMBIOS) | 2 | N/A | estándar |
| 2026-10-27 | FE-QA-001 | frontend | S | 0 | frontend | Sí | 0 | N/A | estándar |
| 2026-10-27 | FE-UX-002 | frontend, ux | M | 0 | frontend | Sí (fixes TS/tests en ejecutar) | 0 | N/A | estándar |

## 2026-10-16 — Fase 1 núcleo cerrada

- **Qué:** 24 tickets SDD (SETUP → DB → USR → TKT → FNZ → DASH/FE) implementados y archivados en `.planning/`.
- **Evidencia:** `dotnet test` 57/57, `npm test` 22/22; detalle en [.planning/FASE1_CIERRE.md](.planning/FASE1_CIERRE.md).
- **Riesgo residual:** BD productiva/test debe ejecutar pipeline SQL completo; hub MCP con esquema parcial.
- **Patrón:** repos con `SqlSchemaCompat` pre/post DB-001; refresh JWT deduplicado en Web (`refreshSession.ts`).

### FE-UX-002 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-spec-design-drift` — cerrado en `/completar` (spec M2 + `ui-referencia-visual.md` + delta).
- **Tema:** `fe-wcag-manual-should` — cluster FE-DS/UX; opcional checklist en `frontend-tester` (no bloqueante).

### FE-QA-001 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-http-contract` — PROPUESTA: documentar pirámide Vitest (`apiClient.integration` + UI + Playwright) en `14_tech_react` / `frontend-tester`.
- **Tema:** `fe-e2e-opt-in` — PROPUESTA: alinear agente E2E con `Web/e2e/` y gate `E2E_SMOKE=1`.

### FE-UX-002 — observaciones meta-sdd (2026-10-27)

- **Tema:** `fe-spec-design-drift` — OBSERVACIÓN: spec M2 hover-rail vs design/impl toggle + `localStorage`; alinear `spec.md` y fila sidebar en `ui-referencia-visual.md` en `/completar` (delta.md pendiente).
- **Tema:** `fe-wcag-manual-should` — PATRÓN emergente (FE-DS-001, FE-UX-001, FE-UX-002): AC contraste/foco “Should” sin gate CI; sin propuesta formal aún (cluster=3, candidato baja prioridad).
- Sin hallazgos nuevos ≥3 para rule/comando/agente distintos de cobertura ya existente (`20_ui_fuente`, `frontend-design-master`, Vitest en `14_tech_react`).

## Tendencias

_(vacío — ejecutar `/retrospectiva` tras más entregas)_
