[← spec](spec.md) | [← index](_index.md) | [delta →](delta.md)

# design.md — FE-QA-001

## Estrategia

- Vitest + `fetch` stub: contrato HTTP del `apiClient` (no mocks de páginas).
- Playwright: un happy path real contra stack local; CI sin API → skip por env.

## Matriz Vitest (`apiClient.integration.test.ts`)

| ID | Caso | Esperado |
|----|------|----------|
| TC-AUTH-1 | GET/POST/PUT/PATCH/DELETE con token en store | Header `Authorization: Bearer …` |
| TC-AUTH-2 | GET sin token | Sin header Authorization |
| TC-401-1 | GET 401 + `refreshOnce` true | 2º fetch con token refrescado; status 200 |
| TC-401-2 | POST 401 + `refreshOnce` false | Un solo fetch; status 401 |
| TC-DEL-1 | DELETE 204 | status 204 sin problem |

## E2E Playwright (`e2e/admin-casas.spec.ts`)

| ID | Flujo | Gate |
|----|-------|------|
| TC-E2E-1 | login → `/admin/casas` → Nueva casa → Crear | `E2E_SMOKE=1` + password env |

Variables: `E2E_BASE_URL` (default `http://localhost:5173`), `E2E_ADMIN_CORREO`, `E2E_ADMIN_PASSWORD` o `FASE1_SMOKE_PASSWORD`.

## Fuera de alcance

- Sustituir tests de página existentes.
- MSW / Vitest browser (opcional futuro).
