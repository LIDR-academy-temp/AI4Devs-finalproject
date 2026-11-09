[← index](_index.md) | [design →](design.md)

# spec.md — FE-QA-001: Tests que detectan fallos reales

## Problema

Tests de página con mocks no detectan bugs como `apiPost` sin Bearer.

## Must

- Suite `apiClient.*.test.ts`: GET/POST/PUT/PATCH/DELETE envían `Authorization` cuando hay token en store.
- Retry 401 + refresh documentado en tests.
- Playwright (o Vitest + MSW opcional): smoke `login → admin/casas → crear casa` contra API local (marcado `skip` en CI sin API).
- Checklist en `impl.md` para ejecutar smoke manual antes de release.

## CA

- CA-1: Regresión `apiPost` cubierta (ya iniciada).
- CA-2: Al menos 1 spec E2E feliz en repo (puede requerir `VITE_API_URL`).
