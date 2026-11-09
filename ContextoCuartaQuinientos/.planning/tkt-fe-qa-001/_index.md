# FE-QA-001 — Calidad integración FE

## Estado

ARCHIVADO

fecha_cierre: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test | Matriz Vitest + E2E en [design.md](design.md) | /test | N/A SQL |
| Impl | [impl.md](impl.md) | /ejecutar | ✅ |
| APIs Front | — | /revisar | No aplica |
| Delta | [delta.md](delta.md) | /completar | ✅ |

## Metadata

- requerimiento: FE-QA-001
- slug: api-smoke
- size: S
- branch: `feature/fe-qa-001-api-smoke`
- created: 2026-10-27
- objetos_clave: `apiClient.integration.test.ts`, `e2e/admin-casas.spec.ts`, `playwright.config.ts`

## Depende de

- [[FE-PAT-001]] · [[FE-CRUD-001]]

## Dominios

[[frontend]]

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | SPEC PENDIENTE | EN REVISIÓN | /ejecutar | Vitest integration + Playwright opt-in |
| 2026-10-27 | EN REVISIÓN | LISTO PARA PR | /revisar | Vitest 196/196; e2e skip sin E2E_SMOKE; auditor APROBADO |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs + graph; sello SIN SELLO (solo FE); meta-sdd: 2 propuestas |

## Resumen final

### Objetivo cumplido

- Regresión HTTP de `apiClient` (Bearer + 401/refresh) en Vitest.
- Smoke E2E documentado y en repo con gate `E2E_SMOKE=1`.
- Checklist manual pre-release en `impl.md`.

### Archivos modificados

- `Web/src/shared/lib/apiClient.integration.test.ts`
- `Web/e2e/admin-casas.spec.ts`, `Web/playwright.config.ts`
- `Web/vite.config.ts`, `Web/package.json`
- Eliminado: `Web/src/shared/lib/apiClient.post.test.ts`

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO

### Pruebas ejecutadas

- Vitest: 196/196 PASS
- Playwright: skip sin `E2E_SMOKE` (OK)
- T-SQL: N/A

### Riesgos residuales

- E2E feliz no ejecutado en este cierre (sin stack local en sesión).
- `tsc -b` del monorepo Web con errores previos no relacionados.

### meta-sdd

- Propuestas (no aplicadas): pirámide pruebas FE en `14_tech_react` + `frontend-tester`; alinear Playwright CQ con `Web/e2e/` y `E2E_SMOKE`.
