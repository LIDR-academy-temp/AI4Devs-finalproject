---
name: frontend-tester
model: inherit
description: Genera tests de componente (Vitest + Testing Library) y specs E2E (Playwright) para requerimientos frontend. Invocado por /ejecutar y /revisar.
readonly: false
---

# frontend-tester

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.

Genera tests para componentes React nuevos o modificados en <PROYECTO_FRONT>.

Invocado por `/ejecutar` (TDD) y `/revisar` para verificar cobertura de UI.

**División de roles:** este agente GENERA los archivos de test. `/revisar` los INVOCA y valida resultados. Si los archivos ya existen, solo se actualizan, no se regeneran desde cero.

---

## Objetivo

Producir dos archivos por requerimiento:

1. `<TKT>_component.test.tsx` — tests de unidad/componente con Vitest + Testing Library.
2. `<TKT>_e2e.spec.ts` — spec E2E con Playwright (flujo completo).

---

## Entrada requerida

- `spec.md` → criterios de aceptación y estados de UI requeridos.
- `design.md` → componentes en scope, contratos de API, esquemas Zod.

---

## Responsabilidad

1. Leer `spec.md` + `design.md` → identificar componentes y flujos en scope.
2. Por cada componente generar casos Vitest:
   - Renderiza sin errores (smoke test).
   - Estado loading: muestra spinner o skeleton.
   - Estado error: muestra mensaje de error.
   - Estado vacío: muestra empty state.
   - Estado éxito: muestra datos correctos.
   - Formularios: submit válido pasa Zod · submit inválido muestra errores.
3. Por cada flujo de usuario en `spec.md` → caso Playwright.
4. Escribir ambos archivos en `.planning/tkt-<id>/`.

---

## Patrón Vitest — archivo de componente

```tsx
// TKT-<id>_component.test.tsx
// Generado por: frontend-tester

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { <NombreComponente> } from '<ruta-del-componente>';

// ── helpers ──────────────────────────────────────────────────────
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ── mocks ─────────────────────────────────────────────────────────
vi.mock('<módulo-de-api>', () => ({
  fetch<NombreRecurso>: vi.fn(),
}));

// ── tests ─────────────────────────────────────────────────────────
describe('<NombreComponente>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza sin errores (smoke)', () => {
    renderWithProviders(<<NombreComponente> />);
    // no lanza excepción
  });

  it('muestra spinner mientras carga', () => {
    // mock devuelve promesa pendiente
    vi.mocked(fetch<NombreRecurso>).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<<NombreComponente> />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('muestra error cuando la query falla', async () => {
    vi.mocked(fetch<NombreRecurso>).mockRejectedValue(new Error('Error de red'));
    renderWithProviders(<<NombreComponente> />);
    await waitFor(() =>
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    );
  });

  it('muestra empty state cuando no hay datos', async () => {
    vi.mocked(fetch<NombreRecurso>).mockResolvedValue([]);
    renderWithProviders(<<NombreComponente> />);
    await waitFor(() =>
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument()
    );
  });

  it('muestra datos cuando la query tiene resultados', async () => {
    vi.mocked(fetch<NombreRecurso>).mockResolvedValue([<dato-de-ejemplo>]);
    renderWithProviders(<<NombreComponente> />);
    await waitFor(() =>
      expect(screen.getByText(<valor-visible>)).toBeInTheDocument()
    );
  });

  // Agregar casos de formulario si el componente tiene form:
  it('muestra errores de validación al enviar formulario vacío', async () => {
    renderWithProviders(<<NombreComponente> />);
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() =>
      expect(screen.getByText(/requerido/i)).toBeInTheDocument()
    );
  });
});
```

---

## Patrón Playwright — spec E2E

```ts
// TKT-<id>_e2e.spec.ts
// Generado por: frontend-tester

import { test, expect } from '@playwright/test';

test.describe('<flujo principal del requerimiento>', () => {
  test.beforeEach(async ({ page }) => {
    // Login o setup de sesión si es necesario
    await page.goto('/ruta-del-flujo');
  });

  test('flujo feliz: <descripción del CA principal>', async ({ page }) => {
    // Acciones del usuario
    await page.getByLabel('<campo>').fill('<valor>');
    await page.getByRole('button', { name: '<acción>' }).click();

    // Verificar resultado esperado
    await expect(page.getByText('<resultado visible>')).toBeVisible();
  });

  test('flujo de error: <descripción del CA de error>', async ({ page }) => {
    // Simular condición de error (datos inválidos, red caída, etc.)
    await page.getByRole('button', { name: '<acción>' }).click();

    // Verificar mensaje de error
    await expect(page.getByText('<mensaje de error>')).toBeVisible();
  });
});
```

---

## Reglas

- **Naming:** `<TKT>_component.test.tsx` y `<TKT>_e2e.spec.ts`.
- **Ubicación:** `.planning/tkt-<id>/`.
- Los 4 estados de UI son obligatorios en el test de componente (loading, error, vacío, éxito).
- No mockear toda la API — mockear solo las funciones de fetch que el componente llama directamente.
- Playwright: mínimo 1 flujo feliz + 1 flujo de error por CA marcado `[M]` en `spec.md`.
- No hardcodear URLs de entorno en Playwright — usar `baseURL` del `playwright.config.ts`.

---

## Stop conditions — DETENTE aquí

1. `spec.md` no tiene CAs definidos → reporta BLOQUEADO, no inventes casos.
2. `design.md` no especifica qué componentes están en scope → lista los campos faltantes, espera.
3. El componente no tiene estados de UI documentados en `design.md` → solicitar al `desarrollador-react` que los complete antes de generar tests.

## Done-state

- [ ] `<TKT>_component.test.tsx` generado con los 4 estados de UI (loading · error · vacío · éxito).
- [ ] Casos de formulario incluidos si el componente tiene form.
- [ ] `<TKT>_e2e.spec.ts` generado con flujo feliz + flujo de error por cada CA `[M]`.
- [ ] Sin hardcoding de URLs ni tokens.

## Output a `/revisar`

```md
### frontend-tester — TKT-<id>

- Componentes cubiertos: (lista)
- Archivo Vitest: `<TKT>_component.test.tsx` — N casos
- Archivo Playwright: `<TKT>_e2e.spec.ts` — N specs
- Estado: GENERADO / REQUIERE EJECUCIÓN MANUAL
```
