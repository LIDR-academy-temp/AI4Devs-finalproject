# FE-043: Frontend — Anuncios (Admin + Residente)

## Estado

ARCHIVADO

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | Creado |
| Design | [design.md](design.md) | /diseñar | Creado |
| Test | — | /test | N/A (Vitest en design) |
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
| APIs Front | — | /revisar | No aplica — [ANM-BE-027-APIS](../tkt-anm-be-027/ANM-BE-027-APIS.md) |
| Delta | [delta.md](delta.md) | /completar | Creado |

## Metadata

- requerimiento: tkt-fe-043
- slug: anuncios-ui
- size: M
- created: 2026-10-19
- updated: 2026-10-19
- branch (frontend): `feature/fe-043-anuncios-ui`

## Depende de

- [[ANM-BE-027]] — contrato REST JWT
- [[FE-SHELL-001]] — shell y sidebar (LISTO PARA PR)

## Dominios

- [[anuncios]]

## Related requerimientos

- [[ENTREGA_MODULOS]](../ENTREGA_MODULOS.md) módulo ANM
- HU-ANM-01 (residente) · HU-ANM-02 (admin)

## Log de estados

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-19 | — | SPEC PENDIENTE | /definir | Spec + adversarial |
| 2026-10-19 | SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | /diseñar | design (bloqueado impl hasta ANM-BE-027) |
| 2026-10-19 | EN REVISIÓN | REQUIERE CAMBIOS | /revisar | tsc/vitest/build OK; falta columna vigencia admin; PATCH error silencioso |
| 2026-10-19 | REQUIERE CAMBIOS | EN REVISIÓN | /ejecutar | Columna vigencia, errores delete/PATCH, modal a11y |
| 2026-10-19 | EN REVISIÓN | REQUIERE CAMBIOS | /revisar | CA-1..3 Must sin smoke E2E; CA-4/5 OK |
| 2026-10-19 | REQUIERE CAMBIOS | EN REVISIÓN | /revisar | Reintento: tests Vitest CA-1..3 |
| 2026-10-19 | EN REVISIÓN | LISTO PARA PR | /revisar | Vitest 35/35; tsc + build OK; auditor-codigo APROBADO |
| 2026-10-19 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs/anuncios + _graph |

## Resumen final

### Objetivo cumplido

- UI residente y admin para comunicados ANM vía REST JWT (HU-ANM-01/02).

### Archivos modificados

- `Web/src/pages/AnunciosPage.tsx`, `AnuncioDetallePage.tsx`, `AdminAnunciosPage.tsx`
- `Web/src/features/anuncios/useAnuncios.ts`, `useAnuncios.test.ts`
- `Web/src/shared/types/anuncios.ts`
- `Web/src/App.tsx`, `appNavigation.ts`
- `Web/src/pages/AnunciosPage.test.tsx`

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: **APROBADO**

### Pruebas ejecutadas

- T-SQL: N/A
- C# xUnit: N/A
- API `.http`: N/A (consumidor)
- Vitest: **35/35** (excl. smoke); `tsc` + `vite build` OK

### Riesgos residuales

- Smoke E2E `fase1Routes.test.tsx` requiere GraphApi en `:5180`.
- Despliegue requiere ANM-BE-027 + seed tipos DB-003.

### Decisiones técnicas relevantes

- Mock Vitest para CA Must en lugar de E2E obligatorio en PR (ver `delta.md`).

### Documentación actualizada

- [specs/anuncios.md](../../specs/anuncios.md) — sección UI web + changelog
- [_graph.md](../../_graph.md) — entrada FE-043

### meta-sdd

Sin patrones nuevos que requieran cambio en rules/comandos; nota informativa: módulos FE pueden cerrar CA REST con tests de contrato mock (documentar en design si se repite ≥3 veces).
