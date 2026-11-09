# Impl: tkt-fe-ux-005-admin-mobile-rollout

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- `/revisar`: `useTiposArchivo` expone `error` + `useQueryErrorToast` en TiposArchivo; tests toast error por página (M4); a11y Encuesta/Visita card.
- Cierre residual: toggle Juntas (F006); Could completo — Almacén (cards inventario/préstamos), Menús (lista móvil), Perfil permisos (cards), Finanzas (cuotas + morosos).

## Implementación realizada

- Patrón FE-UX-004 en 9 páginas: quitar banner dismissible de error de listado, `useQueryErrorToast`, `AdminMobileCardList` con mismo `filteredRows`, toasts `success` en mutaciones de página.
- 9 componentes `*AdminMobileCard` en `Web/src/features/`.
- Tests Vitest: `getAllBy*` donde tabla+card duplican texto; `stubToast.ts` para mocks; nuevo `AdminPerfilesPage.test.tsx`.

### Regresión por página

| Página | Mobile card | Toast listado | Toast mutación | Tests |
|--------|-------------|---------------|----------------|-------|
| AdminAnunciosPage | AnuncioAdminMobileCard | sí | save/delete | ajustado |
| AdminEncuestasPage | EncuestaAdminMobileCard | sí | create/edit/publish/delete | ajustado |
| AdminArchivosPage | ArchivoAdminMobileCard | sí | upload/edit/delete | ajustado |
| AdminTiposArchivoPage | TipoArchivoAdminMobileCard | sí (`useTiposArchivo.error`) | create/edit/delete | nuevo |
| AdminJuntasPage | JuntaAdminMobileCard | sí | create/edit/delete | ajustado |
| AdminVisitasPage | VisitaAdminMobileCard | sí | entrada/salida | ajustado |
| AdminVehiculosPage | VehiculoAdminMobileCard | sí (`error` + `searchError`) | create/edit/delete | ajustado |
| AdminMascotasPage | MascotaAdminMobileCard | sí | (previo FE-UX-004 scope) | ajustado |
| AdminPerfilesPage | PerfilAdminMobileCard | sí | N/A (solo lectura) | nuevo |

## Archivos modificados

- `Web/src/pages/AdminAnunciosPage.tsx` (previo sesión)
- `Web/src/pages/AdminEncuestasPage.tsx`
- `Web/src/pages/AdminArchivosPage.tsx`
- `Web/src/pages/AdminTiposArchivoPage.tsx`
- `Web/src/pages/AdminJuntasPage.tsx`
- `Web/src/pages/AdminVisitasPage.tsx`
- `Web/src/pages/AdminVehiculosPage.tsx`
- `Web/src/pages/AdminMascotasPage.tsx` (previo)
- `Web/src/pages/AdminPerfilesPage.tsx` (previo)
- `Web/src/features/admin/**/**MobileCard.tsx` (9 cards)
- `Web/src/pages/*.test.tsx` (8 ajustes + `AdminPerfilesPage.test.tsx`)
- `Web/src/test/stubToast.ts`

## Auditoría SQL

- Estado: N/A
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO (revisión mínima: patrón FE-UX-004, sin secretos, formError en panel)
- Hallazgos: ninguno bloqueante
- Correcciones: —

## Scripts de prueba creados

### T-SQL unitarias
- No aplica

### Contrato C# xUnit
- No aplica

### API `.http`
- No aplica

## Verificación

- `tsc --noEmit`: OK
- `npm test -- --run`: **228** tests OK (post cierre residual)
- `vite build --mode development`: OK

## Verificación final

### Criterios de aceptación

- [x] CA-1 — Cards en 9 listados admin
- [x] CA-2 — Visitas: toast error listado
- [x] CA-3 — Encuestas: `filteredEncuestas` compartido
- [x] CA-4 — Juntas: `formError` en panel
- [x] CA-5 — Vitest 226 pass (pilotos FE-UX-004 incluidos)
- [x] CA-R1 — Sin banner dismissible de listado

### Pruebas T-SQL (tester-sql)

- No aplica

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica

### QA Checklist

- [x] Happy path (cards + datos visibles)
- [x] Caso negativo: toast error listado (9 páginas con hook de error)
- [x] Edge: filtros comparten subset tabla/cards (Encuestas test filtro activas)
- [x] Regresión: suite global ≥214

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (tras corrección F001–F005)
- auditor-seguridad: No aplica (sin endpoints/SQL)

### Desviaciones detectadas

- Ninguna pendiente

### Pendientes

- Ninguno (2026-10-27 cierre residual): F006 toggle Juntas; Almacén error listado → toast (sin cards móvil).

### APIs para Front

- No aplica (sin endpoints)

## Resultado contra criterios de aceptación

- [x] CA-1 — Cards en listados admin (9 páginas)
- [x] CA-2 — Visitas: toast error listado, sin banner
- [x] CA-3 — Encuestas: mismo `filteredEncuestas` tabla/cards
- [x] CA-4 — Juntas: `formError` en panel
- [x] CA-5 — Vitest en verde (incl. pilotos)
- [x] CA-R1 — Sin banner dismissible de listado en las 9 páginas
