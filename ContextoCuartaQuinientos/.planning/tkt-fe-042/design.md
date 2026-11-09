[← index](_index.md) | [← spec](spec.md)

# design.md — FE-042: UI Casas (Admin)

## Estrategia
Reutilizar `AdminCasasPage`, `useCasasAdmin`, tipos `casasAdmin.ts`. Sin legacy.

## frontend
| Ruta | API |
|------|-----|
| `/admin/casas` | GET/POST/PUT/DELETE `/SGR/Casas`, GET condominios |

## Orden
Validar impl existente → tests Vitest → cerrar delta.

## Orden implementación

| # | Paso | Verificación | Estado |
|---|------|--------------|--------|
| 1 | Rama `feature/fe-042` | branch activa | ⚠ Ajustado (repo en rama compartida) |
| 2 | Vitest `AdminCasasPage` | `npm test` | ✓ Hecho |
| 3 | Validar `AdminCasasPage` + hooks | ruta `/admin/casas`, sidebar | ✓ Hecho (preexistente) |
| 4 | `tsc` + `vite build` | sin errores | ✓ Hecho |

## Pasada adversarial (design)

Riesgo principal: legacy sin mover → **mitigar** rutas `*/legacy` primero. Veredicto: **APROBADO**.
