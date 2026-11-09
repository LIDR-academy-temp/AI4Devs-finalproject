# Delta: tkt-fe-qa-001 — Calidad integración FE

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Suite Vitest `apiClient.integration.test.ts`: Bearer en GET/POST/PUT/PATCH/DELETE, GET sin token, retry 401 + `refreshOnce`, DELETE 204.
- Smoke Playwright `e2e/admin-casas.spec.ts` (login → crear casa) activo solo con `E2E_SMOKE=1`.
- Script `npm run test:e2e`, `playwright.config.ts`, exclusión `e2e/**` en Vitest.
- Checklist smoke manual pre-release en `impl.md`.

## Comportamiento modificado

- **(Antes):** Solo `apiClient.post.test.ts` cubría POST + Bearer.
- **(Después):** Contrato HTTP centralizado en `apiClient.integration.test.ts`; `apiClient.post.test.ts` eliminado.

## Comportamiento eliminado

- `Web/src/shared/lib/apiClient.post.test.ts` (fusionado).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| — | — | Sin cambios |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| — | — | Sin cambios (E2E consume APIs existentes) |

## Para el reviewer

- **Qué se hizo:** Capa de pruebas que detecta regresiones reales de auth HTTP en `apiClient` + smoke E2E opt-in.
- **Por qué:** [[FE-QA-001]] — mocks de página no cubrían Bearer/401.
- **Riesgo:** Bajo — solo tooling/tests; sin cambio de runtime en producción.
- **Qué probar:** `cd Web && npm test` (196+); opcional `E2E_SMOKE=1` + API/Web locales → `npm run test:e2e`.
- **Rollback:** Revertir archivos Web del ticket; sin DDL.

## Aprendizajes

| target | aprendizaje |
|--------|-------------|
| frontend | Tests de página con `vi.mock('apiClient')` no sustituyen contrato `fetch` + headers; mantener `*.integration.test.ts` junto a cambios en `apiClient.ts`. |
| frontend | E2E Playwright en CI sin stack → `test.describe.skip` por `E2E_SMOKE`; Vitest debe excluir `e2e/`. |

## Decisiones (ADR)

### ADR-FE-QA-001-01 — E2E opt-in por variable

- **target:** frontend
- **Contexto:** CI ejecuta solo `npm test`; no hay API levantada en GitHub Actions.
- **Decisión:** Playwright corre solo con `E2E_SMOKE=1`; documentar password vía `FASE1_SMOKE_PASSWORD`.
- **Consecuencias:** CA-2 cumplido con spec en repo; verificación feliz es manual/local o pipeline dedicado futuro.
