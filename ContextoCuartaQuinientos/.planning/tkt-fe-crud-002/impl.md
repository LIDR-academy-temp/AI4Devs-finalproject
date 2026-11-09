# Impl: tkt-fe-crud-002 — Comunidad admin

> [← index](_index.md) | [← design](design.md) | Siguiente: [delta →](delta.md)

## Ajustes durante implementación

- [2026-10-23] `ResultadosEncuestaPage`: corregido uso de `apiGet` (`{ data, problem, status }`) — bug documentado en design.
- [2026-10-23] `useArchivos`: alineado contrato `apiGet` (mismo patrón que otros hooks).
- [2026-10-23] CA-2 (413): helper `mapArchivoUploadHttpError` + test unitario (evita E2E frágil con `FormData` en jsdom).

## Implementación realizada

- Migración de Anuncios, Archivos, Juntas y Encuestas admin a [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md): toolbar, tabla filtrable, split panel, Zod/RHF, `ConfirmDialog`.
- Resultados encuesta: solo lectura con `PageHeader` + cards Bootstrap.
- Sin cambios API/SQL.

## Archivos modificados

- `Web/src/pages/AdminAnunciosPage.tsx` + test
- `Web/src/pages/AdminArchivosPage.tsx` + test
- `Web/src/pages/AdminJuntasPage.tsx` + test
- `Web/src/pages/AdminEncuestasPage.tsx` + test
- `Web/src/pages/ResultadosEncuestaPage.tsx` + test
- `Web/src/features/admin/{anuncios,juntas,encuestas,archivos}/*` (schemas, table filters, upload errors)
- `Web/src/features/archivos/useArchivos.ts`

## Auditoría SQL

- Estado: No aplica
- Hallazgos: —
- Correcciones: —

## Auditoría general

- Estado: APROBADO (post-corrección F001–F006)
- Hallazgos: auth archivos con `localStorage`; schema inline; test publicar ausente
- Correcciones: `getAccessToken()` + `credentials: 'include'`; `archivosAdminSchemas.ts`; test publicar; Zod opciones ≥2

## Scripts de prueba creados

### T-SQL unitarias

- No aplica

### Contrato C# xUnit

- No aplica

### API `.http`

- No aplica

### Vitest

- Páginas admin comunidad + `archivoUploadErrors.test.ts`

## Resultado contra criterios de aceptación

- [x] CA-1: Flujo crear → publicar → resultados (UI + `apiGet` corregido en resultados).
- [x] CA-2: Mensaje 413 amigable (`mapArchivoUploadHttpError`).

## Pruebas ejecutadas

- Vitest: **176/176**
- `tsc --noEmit`, `vite build --mode development`: OK

## Verificación final

### Criterios de aceptación

- [x] CA-1: crear borrador (panel + `apiPost`), publicar (`ConfirmDialog` + `apiPut`, test Vitest), resultados (`apiGet` corregido + `PageHeader`).
- [x] CA-2: `mapArchivoUploadHttpError(413)` + uso en upload; test unitario.
- [x] Must: patrón Casas en 4 listados admin (toolbar, tabla filtrable, split, Zod/RHF, sin `window.confirm` en scope).

### Pruebas T-SQL (tester-sql)

- No aplica (sin SQL)

### Pruebas contrato C# xUnit

- No aplica

### Pruebas API

- No aplica (sin endpoints nuevos)
- Contratos existentes: ANM, ARC, JNT, ENC sin cambio

### QA Checklist

- [x] Happy path cubierto en Vitest (listado, panel, delete/publicar confirm)
- [x] Caso negativo 413 (unit `archivoUploadErrors.test.ts`)
- [x] Error listado (`apiGet` / hooks)
- [x] Regresión: `grep` sin `confirm` en páginas del ticket

### Auditorías verificadas

- auditor-sql: No aplica
- auditor-codigo: APROBADO (revisión 2026-10-23; fixes auth archivos aplicados)
- auditor-flutter: No aplica
- auditor-seguridad: No aplica (sin endpoints nuevos; upload usa Bearer de `getAccessToken`)

### Desviaciones detectadas

- Ninguna bloqueante. Spec menciona “modal” en anuncios; implementación usa **split panel** (alineado a `PATRON_CRUD_ADMIN` y design).

### Pendientes

- Smoke manual E2E: login → subir archivo real → CA-2 en runtime (opcional pre-merge).
- `ArchivosPage.tsx` residente aún usa `localStorage` token (fuera de scope FE-CRUD-002).
- APIS.md: No aplica (sin endpoints).
