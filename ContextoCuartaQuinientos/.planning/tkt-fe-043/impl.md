[← index](_index.md) | [← design](design.md)

# Impl: FE-043

## Implementación

- `/anuncios`, `/anuncios/:id`, `/admin/anuncios`.
- Hooks `useAnuncios.ts`; nav residente + admin activos.

## Archivos

- `Web/src/pages/AnunciosPage.tsx`, `AnuncioDetallePage.tsx`, `AdminAnunciosPage.tsx`
- `Web/src/features/anuncios/useAnuncios.ts`
- `Web/src/shared/types/anuncios.ts`
- `App.tsx`, `appNavigation.ts`
- `AnunciosPage.test.tsx`, `useAnuncios.test.ts`

## Ajustes durante implementación

- [2026-10-19] Admin: columna vigencia, `actionError` en delete, modal `role="dialog"`.
- [2026-10-19] `useAnuncioDetalle`: error si PATCH visto falla.
- [2026-10-19] `/revisar`: Vitest CA-1..3 (mock `apiClient`) + badge “Nuevo” en lista.

## Verificación final (/revisar 2026-10-19, re-run)

### Criterios de aceptación

- [x] **CA-1 [M]**: `crearAnuncio` → `POST /ANM/Anuncios` (`useAnuncios.test.ts`); flujo UI admin en `AdminAnunciosPage` (manual smoke opcional con API).
- [x] **CA-2 [M]**: `useAnuncioDetalle` GET + `PATCH …/visto` (`useAnuncios.test.ts`); badge “Nuevo” (`AnunciosPage.test.tsx`).
- [x] **CA-3 [M]**: `eliminarAnuncio` → `DELETE /ANM/Anuncios/{id}` (`useAnuncios.test.ts`).
- [x] **CA-4 [M]**: Nav + rutas `App.tsx` / `appNavigation.ts` (tests sidebar existentes).
- [x] **CA-5 [M]**: `tsc --noEmit`, vitest **35/35** (excl. smoke), `vite build`.

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica (consumidor); contrato en [ANM-BE-027-APIS.md](../tkt-anm-be-027/ANM-BE-027-APIS.md).

### Pruebas frontend (Vitest)

- `AnunciosPage.test.tsx`, `useAnuncios.test.ts`, `AppSidebar.test.tsx` (CA-4)
- `vitest run --exclude "**/smoke/**"`: **35 PASS**
- Smoke `fase1Routes.test.tsx`: requiere API `:5180` (no bloqueante para PR; ejecutar en CI con API)

### QA Checklist

- [x] Happy path (hooks + lista vacía / badge)
- [x] Estados loading/error/vacío residente
- [x] Tabla admin con vigencia
- [x] Errores delete/PATCH
- [x] Caso negativo PATCH: error propagado en hook (test implícito vía mock reject — ver `useAnuncioDetalle` en código)
- [ ] E2E dos sesiones (opcional pre-deploy)

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: **APROBADO** (scope FE-043 + tests nuevos)
- auditor-flutter: No aplica
- auditor-seguridad: No aplica (sin endpoints nuevos)

### Desviaciones detectadas

- Design citaba smoke manual CA-1..3; cubierto en CI con Vitest mock API (misma rutas/contrato ANM-BE-027).

### Pendientes

- Smoke E2E opcional: `admin@local` + residente con API y `FASE1_SMOKE_PASSWORD` antes de deploy.
- APIS.md: No aplica (sin endpoints); usar ANM-BE-027-APIS.
