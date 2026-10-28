# Impl: tkt-fe-039-finanzas-admin

> [← index](_index.md) | [← design](design.md)

## Implementación

- Ruta `/admin/finanzas` (`AdminRoute`): tabs Cuotas residente | Morosos | Generar período.
- APIs: `GET /FNZ/Cuotas?usuarioId=`, `PATCH …/pago`, `GET /Reports/Reportes/Morosos`, `POST /FNZ/Cuotas/generar`.
- `apiPatch` acepta body JSON (pago).
- Modal pago: monto read-only, Zod referencia; 409 → mensaje readme.

## Archivos

- `Web/src/pages/FinanzasAdminPage.tsx`
- `Web/src/features/admin/finanzas/*`
- `Web/src/shared/types/finanzasAdmin.ts`
- `Web/src/App.tsx`, `HomePage.tsx`, `apiClient.ts`, `AdminTicketsPage.tsx`

## Pruebas

- `npm test` → 6/6 (modal + morosos empty + PrivateRoute)
- `npm run build` → OK

## Verificación /revisar (2026-10-16)

| CA | Evidencia |
|----|-----------|
| CA-1 | `FinanzasAdminPage` + `getCuotasUsuario` → `CuotasTable` |
| CA-2 | `submitPago` 204 → cierra modal + `loadCuotas` |
| CA-3 | 409 → mensaje readme + refetch (`RegistrarPagoModal.test`) |
| CA-4 | `MorososTable` empty exacto + test |
| CA-5 | `GenerarCuotasForm` muestra creadas/omitidas (sin test unitario CA-5) |
| CA-6 | `registrarPagoSchema` + test validación referencia |

Auditoría ligera: sin secretos en front; JWT vía `session.token`; rutas bajo `AdminRoute`.

## Estado AC

- [x] CA-1..CA-6 cubiertos en UI + tests parciales (409/validación/empty; CA-5 manual/UI)
