[← index](_index.md) | [← impl](impl.md)

# delta.md — FE-039: Frontend finanzas admin

## Resumen del cambio

Página `/admin/finanzas` con tabs: cuotas por `usuarioId`, registrar pago (modal), morosos (filtro mes/año), generar cuotas del período. `apiPatch` con body JSON.

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|
| frontend:cuartaquinientos-web | `FinanzasAdminPage`, `features/admin/finanzas/*` | NUEVO |
| frontend:cuartaquinientos-web | `shared/types/finanzasAdmin.ts`, `apiClient.apiPatch` | NUEVO/MODIFICADO |
| frontend:cuartaquinientos-web | `App.tsx`, `HomePage.tsx` | MODIFICADO |
| frontend:cuartaquinientos-web | `RegistrarPagoModal.test.tsx`, `MorososTable.test.tsx` | NUEVO |

## Invariantes verificados

| Invariante | Test | Resultado |
|---|---|---|
| INV-1 (monto read-only) | Modal + schema | ✅ |
| INV-2 (sin morosidad en cliente) | Solo consume API | ✅ |

## Desviaciones vs design.md

Hooks inline en página (sin archivos `use*` separados). Sin `GenerarCuotasForm.test.tsx` (CA-5 cubierto en UI).

## Specs de dominio a actualizar

- `specs/finanzas.md` — sección UI web.

## Actualización de _graph.md

- [[FE-039]] cierra HU-FNZ-02/03/06 en admin web.
