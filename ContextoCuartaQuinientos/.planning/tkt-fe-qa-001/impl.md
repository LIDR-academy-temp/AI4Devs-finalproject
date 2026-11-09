[← design](design.md) | [← index](_index.md)

# impl.md — FE-QA-001

## Cambios

| Artefacto | Acción |
|-----------|--------|
| `Web/src/shared/lib/apiClient.integration.test.ts` | Suite Authorization + 401/refresh + DELETE 204 |
| `Web/src/shared/lib/apiClient.post.test.ts` | Eliminado (contenido fusionado) |
| `Web/e2e/admin-casas.spec.ts` | Smoke Playwright (opt-in `E2E_SMOKE=1`) |
| `Web/playwright.config.ts` | Config base URL `E2E_BASE_URL` |

## Pruebas ejecutadas

```powershell
cd Web
npm install
npm test
npx tsc --noEmit
```

E2E (local, API + Web arriba):

```powershell
$env:E2E_SMOKE='1'
$env:FASE1_SMOKE_PASSWORD='<tu password seed>'
# opcional: $env:E2E_ADMIN_CORREO='admin@local'
npx playwright install chromium   # primera vez
npm run test:e2e
```

## Checklist smoke manual (pre-release)

1. BD con seeds (`DB-002`, menús `DB-007` si sidebar dinámico).
2. `dotnet run` en `GraphApi` (`http://localhost:5000`).
3. `npm run dev` en `Web` (`http://localhost:5173`).
4. Login admin (`admin@local` o correo de tu seed).
5. `/admin/casas`: crear, editar y eliminar una casa de prueba.
6. Residente: login, crear ticket, reservar área (si aplica entrega).
7. `npm test` y `npm run test:e2e` con `E2E_SMOKE=1` en verde.

## Criterios de aceptación

| CA | Estado |
|----|--------|
| CA-1 Regresión `apiPost` + verbos con Bearer | Cubierto en Vitest |
| CA-2 ≥1 spec E2E feliz en repo | `e2e/admin-casas.spec.ts` (skip sin `E2E_SMOKE`) |

## Auditorías finales

- **auditor-sql:** No aplica.
- **auditor-codigo:** APROBADO (2026-10-27).

## Pruebas (resumen)

- Vitest: 196/196 PASS (`npm test`).
- Playwright: 1 skipped sin `E2E_SMOKE` (`npm run test:e2e`).
- `tsc`/`build`: errores preexistentes fuera de scope (vehículos, apollo) — no bloquean este ticket.
