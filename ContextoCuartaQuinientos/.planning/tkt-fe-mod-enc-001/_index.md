# FE-MOD-ENC-001 — Módulo encuestas (admin + residente)

| Campo | Valor |
|-------|-------|
| Estado | **ARCHIVADO** |
| Rama propuesta | `feature/fe-mod-enc-001-modulo-encuestas` |
| Talla | **L** (FE + BE Cuarta) |
| Dominio | [[encuestas]] |

## Documentos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Entradas | [ENTRADAS.md](ENTRADAS.md) | ✅ |
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Test | `CuartaEncuestasServiceTests` + `FE-MOD-ENC-001_api_tests.http` | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | ✅ |
| APIs Front | [TKT-FE-MOD-ENC-001-APIS.md](TKT-FE-MOD-ENC-001-APIS.md) | ✅ |

## Navegación

[← _graph.md](../../_graph.md) | [spec.md](spec.md) | [design.md](design.md)

## Depende de

- [[FE-044]] (UI encuestas mínima — **reemplazar flujo admin incorrecto**)
- [[ENC-BE-024]] (API Cuarta ENC base)
- [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)
- Referencia UX: `Web_diseño/Web/Views/Encuestas/*`

## Resumen final

### Objetivo cumplido

- Admin encuestas con flujo bandeja (metadatos) → detalle (preguntas/opciones) → publicar → resultados; API Cuarta CRUD alineada.

### Archivos modificados (principales)

- `GraphApi/Controllers/ENC/Encuestas/EncuestasController.cs`, `Repositories/ENC/CuartaEncuestasRepository.cs`
- `Web/src/pages/AdminEncuestasPage.tsx`, `AdminEncuestaDetallePage.tsx`, `ResultadosEncuestaPage.tsx`
- Tests: `AdminEncuestasPage.test.tsx`, `ResultadosEncuestaPage.test.tsx`, `AdminArchivosPage.test.tsx` (router)

### Auditorías finales

- auditor-sql: N/A
- auditor-codigo: APROBADO
- auditor-seguridad: APROBADO (revisión estática)

### Pruebas ejecutadas

- T-SQL: N/A
- C# `CuartaEncuestasServiceTests`: 5/5
- Vitest: 180/180
- API `.http`: manual (JWT)

### Riesgos residuales

- E2E residente/admin no Playwright; paridad visual M-6 parcial; `.http` sin CI.

### meta-sdd

- Sin patrones nuevos que exijan rule/agente adicional. Refuerzo documental: ENC admin usa `tipoPreguntaId`; Vitest con `MemoryRouter` si hay `Link`.

### Documentación actualizada

- [specs/encuestas.md](../../specs/encuestas.md), [_graph.md](../../_graph.md), [delta.md](delta.md)

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-23 | SPEC PENDIENTE REVISIÓN | SDD generado tras validación vs `Web_diseño` |
| 2026-10-26 | EN REVISIÓN | Design aprobado; BE+FE flujo bandeja→detalle |
| 2026-10-26 | REQUIERE CAMBIOS | `/revisar`: Must M-1/3/4/6, CA-3/4/5; Vitest 6 fail |
| 2026-10-26 | EN REVISIÓN | `/ejecutar` gaps |
| 2026-10-26 | LISTO PARA PR | `/revisar`: Vitest 180/180, APIS.md |
| 2026-10-26 | ARCHIVADO | `/completar`: delta + specs + graph |
