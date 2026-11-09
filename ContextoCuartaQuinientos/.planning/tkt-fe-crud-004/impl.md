# Impl: tkt-fe-crud-004 — Residente UX

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-10-27] `/ejecutar` con design en `DISEÑO PENDIENTE REVISIÓN` — aceptado por comando explícito del usuario.
- [2026-10-27] Segunda pasada `/ejecutar`: fases 5–7 + `TC-RES-1`; sin `window.confirm` en vehículos/mascotas (`ConfirmDialog`).
- [2026-10-27] `/revisar`: F001 — `useAreasComunes` / `useReservaciones` desestructuran `apiGet`; F002 banners error en reservas; F003–F004 `PerfilPage` loading + auth default; tests `useVisitasHooks.test.ts`.

## Implementación realizada

- **M1:** `downloadAuthenticated` con JWT de `accessTokenStore` + refresh 401.
- **M2:** `useCrearTicket` → `POST /TKT/Tickets`; eliminado `tickets.gql.ts`.
- **M3:** `AreasYReservacionesPage` con Zod (`reservasSchemas`), `FormModal`, manejo `problem` en POST; test `TC-RES-1`.
- **M4:** Kit admin (`PageHeader`, `AlertBanner`, `EmptyState`, `FormModal`, `ConfirmDialog`) en inventario M5 residente.
- **Archivos:** `ArchivosPage` sin `localStorage`; descarga vía helper autenticado.
- **Fase 5:** Zod `vehiculoResidenteSchemas` / `mascotaResidenteSchemas`; fix `useMascotas` y catálogos tipos/razas (`apiGet` desestructurado).
- **Fase 6–7:** Anuncios, encuestas, juntas (lista + detalle), estado de cuenta, perfil con kit UI.

## Archivos modificados

- `Web/src/shared/lib/downloadAuthenticated.ts` + `.test.ts`
- `Web/src/features/tickets/useCrearTicket.ts` + `.test.ts`, `useMisTickets.ts`
- `Web/src/features/visitas/reservasSchemas.ts`, `useAreasComunes.ts`, `useReservaciones.ts`, `useVisitasHooks.test.ts`
- `Web/src/features/vehiculos/vehiculoResidenteSchemas.ts`
- `Web/src/features/mascotas/mascotaResidenteSchemas.ts`, `useMascotas.ts`
- `Web/src/pages/TicketsPage.tsx`, `NuevoTicketPage.tsx`, `ArchivosPage.tsx`, `AreasYReservacionesPage.tsx`
- `Web/src/pages/MisVehiculosPage.tsx`, `MisMascotasPage.tsx`
- `Web/src/pages/AnunciosPage.tsx`, `AnuncioDetallePage.tsx`, `EncuestasPage.tsx`, `EncuestaDetallePage.tsx`
- `Web/src/pages/JuntasPage.tsx`, `JuntaDetallePage.tsx`, `EstadoCuentaPage.tsx`, `PerfilPage.tsx`
- Tests: `ArchivosPage`, `AreasYReservacionesPage`, `MisVehiculosPage`
- Eliminado: `Web/src/features/tickets/tickets.gql.ts`

## Auditoría SQL

- Estado: No aplica
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: **APROBADO** (post-corrección F001–F004 en `/revisar`)
- Hallazgos corregidos: hooks visitas `apiGet`; errores de carga en reservas; perfil loading/auth
- Correcciones: ver ajustes 2026-10-27 `/revisar`

## Scripts de prueba creados

### T-SQL unitarias

- No aplica

### Vitest

- `downloadAuthenticated.test.ts`, `useCrearTicket.test.ts`
- Ampliados: `ArchivosPage.test.tsx`, `AreasYReservacionesPage.test.tsx` (TC-ERR-RES-1, TC-RES-1), `MisVehiculosPage.test.tsx`
- **188/188** pasando; `tsc --noEmit` OK; `vite build --mode development` OK (revisión)

### API `.http`

- No aplica

## Resultado contra criterios de aceptación

- [x] **CA-1** — reserva 409 + happy path TC-RES-1 (201 + mensaje + refetch)
- [x] **CA-2** — `useCrearTicket` REST + navegación
- [x] **CA-3** — descarga vía `downloadAuthenticated`
- [x] **CA-4** — inventario M5 con kit UI + Zod en vehículos/mascotas/reservas/perfil
- [x] **CA-R1** — sin cambios en `NavMenuGuard` (regresión suite)
- [x] **CA-R2** — admin tests en verde en suite global

## Verificación final

### Criterios de aceptación

- [x] CA-1 — TC-ERR-RES-1 + TC-RES-1
- [x] CA-2 — `useCrearTicket.test.ts`
- [x] CA-3 — `downloadAuthenticated` + `ArchivosPage.test.tsx`
- [x] CA-4 — rutas M5 con PageHeader/estados; Zod vehículos/mascotas
- [x] CA-R1 / CA-R2 — suite global

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica

### Vitest / frontend

- **188/188** PASS (`npm test --run`)
- `tsc --noEmit` OK
- Matriz design: TC-TKT-1, TC-ERR-TKT-1, TC-RES-1, TC-ERR-RES-1, TC-ARC-1 (+ `useAnuncios.test` PATCH visto ≈ TC-ANM-1); CA-R1 sin cambio en `NavMenuGuard` + `menuToNav.test.ts`; CA-R2 suite admin en verde

### QA Checklist

- [x] Happy path tickets, reservas, archivos, CRUD vehículos/mascotas
- [x] Casos negativos (409 reserva, errores API, hooks visitas)
- [x] Regresión admin/residente en suite global
- [x] Sin `localStorage` token / sin `window.confirm` en residente

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **REQUIERE CAMBIOS** → corregido F001–F004 → **APROBADO** post-fix
- auditor-flutter: No aplica
- auditor-seguridad: No aplica (sin endpoints nuevos)

### Desviaciones detectadas

- TC-INV-NAV-1: no hay test E2E de redirect `/403`; regresión asumida por no tocar `NavMenuGuard` + test unitario de paths de menú (delegable [[FE-QA-001]])

### Pendientes

- Rama `feature/fe-crud-004-residente-ux` — commit + PR (mensaje en cierre `/completar`)

### APIs para Front

- APIS.md: No aplica (sin endpoints)
