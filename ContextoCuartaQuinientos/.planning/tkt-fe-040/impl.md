[← index](_index.md) | [← design](design.md)

# Impl: FE-040

## Implementación

- `/` (`HomePage`): `useDashboardResumen` → cards por `data.tipo` (sin `if (rol)`).
- `AppShell` + `NotificationBell` en `PrivateRoute` y `AdminRoute`.
- Bandeja: `GET /NTF/Notificaciones`, `PATCH …/leida`, badge local.

## Archivos

- `Web/src/features/dashboard/*`, `Web/src/features/notifications/*`
- `Web/src/shared/components/AppShell.tsx`
- `Web/src/pages/HomePage.tsx`
- Tests: `HomePage.test.tsx`, `NotificationBell.test.tsx`

## Pruebas

- `npm test` → 10/10; `tsc` + `vite build` OK

## Verificación /revisar (2026-10-16)

| CA | Evidencia |
|----|-----------|
| CA-1..2 | `HomePage.test.tsx` |
| CA-3..4 | `NotificationBell.test.tsx` |
| CA-5 | `HomePage` error + Reintentar |
