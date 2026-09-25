[← index](_index.md) | [← spec](spec.md)

# design.md — FE-039: Frontend: finanzas admin

## Estrategia técnica

`src/features/admin/finanzas/`: `FinanzasAdminPage` con tabs Morosos | Cuotas residente | Generar período. Hooks: `useCuotasUsuario`, `useRegistrarPago`, `useMorosos`, `useGenerarCuotas`. Formularios RHF+Zod.

## frontend:cuartaquinientos-web

| Pieza | API |
|---|---|
| `RegistrarPagoModal` | `PATCH /FNZ/Cuotas/{id}/pago` |
| `MorososTable` | `GET /Reports/Reportes/Morosos` |
| `GenerarCuotasForm` | `POST /FNZ/Cuotas/generar` |
| `CuotasTable` | `GET /FNZ/Cuotas?usuarioId=` |

## Orden

1. Tipos Zod schemas → 2. Hooks → 3. UI tabs → 4. Tests modal → 5. `tsc`+`vite build`

## Plan de pruebas

`RegistrarPagoModal.test.tsx` (CA-2,3,6); `MorososTable.test.tsx` (CA-4); `GenerarCuotasForm.test.tsx` (CA-5).

## Autoverificación

- [x] TC-ERR (409, validación) presente.
