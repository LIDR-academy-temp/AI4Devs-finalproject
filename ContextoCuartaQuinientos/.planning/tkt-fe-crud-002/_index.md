# FE-CRUD-002 — Comunidad admin

| Campo | Valor |
|-------|-------|
| Estado | **ARCHIVADO** |
| Rama | `feature/fe-crud-002-comunidad-admin` |
| Talla | M |

## Documentos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | Creado |
| Test | Vitest | ✅ 179/179 (suite completa; scope ticket 29 tests páginas comunidad) |
| APIs Front | — | No aplica |

## Depende de

- [[FE-PAT-002]] · [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)

## Alcance (orden design)

Anuncios → Archivos → Juntas → Encuestas (+ resultados solo lectura).

## Resumen final

### Objetivo cumplido

- Cuatro listados admin Comunidad + resultados encuesta al patrón CRUD admin; CA-1 y CA-2 verificados en Vitest.

### Archivos modificados (Web)

- Páginas: `AdminAnunciosPage`, `AdminArchivosPage`, `AdminJuntasPage`, `AdminEncuestasPage`, `ResultadosEncuestaPage` + tests.
- Features: `features/admin/{anuncios,juntas,encuestas,archivos}/*`, `archivoUploadErrors`, `useArchivos`.

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO (2026-10-23; auth archivos + schemas)

### Correcciones automáticas aplicadas

- `getAccessToken()` en upload archivos; `archivosAdminSchemas.ts`; test publicar encuesta; Zod opciones ≥2.

### Pruebas ejecutadas

- Vitest: **176/176**
- `tsc --noEmit`, `vite build --mode development`: OK
- T-SQL / API: N/A

### Riesgos residuales

- Smoke E2E manual upload real (opcional).
- `ArchivosPage` residente aún usa `localStorage` token (fuera de scope).
- Encuestas evolucionaron después en [[FE-MOD-ENC-001]] (preguntas/opciones); este ticket cerró la oleada PATRON base.

### Decisiones técnicas relevantes

- CA-2 validado con test unitario `mapArchivoUploadHttpError` (no E2E FormData en jsdom).
- Anuncios: split panel en lugar de modal (alineado a `PATRON_CRUD_ADMIN`).

### Documentación actualizada

- `specs/anuncios.md`, `specs/archivos.md`, `specs/juntas.md`, `specs/encuestas.md` (changelog)
- `_graph.md`, `_sdd_evolution.md`

### meta-sdd

- **Sin patrones nuevos** que requieran rule/agente adicional (3.er ticket de la oleada `PATRON_CRUD_ADMIN` tras [[FE-PAT-002]] y [[FE-CRUD-001]]).
- Observación: sello `revisar` no registrado (`SIN SELLO` al `/completar`); cierre con `impl.md` + estado LISTO PARA PR y confirmación implícita vía `/completar`.

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-23 | SPEC PENDIENTE | Spec + design inicial |
| 2026-10-23 | LISTO PARA EJECUTAR | Diseño aceptado por Luis |
| 2026-10-23 | EN REVISIÓN | `/ejecutar` — patrón CRUD admin comunidad |
| 2026-10-23 | LISTO PARA PR | `/revisar` — Vitest 176/176, CA-1/CA-2 OK |
| 2026-10-26 | ARCHIVADO | `/completar` — delta + specs + graph; sello revisar N/A |
