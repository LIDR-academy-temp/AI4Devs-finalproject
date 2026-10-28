# tkt-fe-crud-004: Residente — UX + CRUD propio

## Estado

ARCHIVADO

fecha_cierre: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | Creado 2026-10-27 |
| Test | Matriz Vitest en [design.md](design.md) § Plan de pruebas | /test | N/A SQL — tests en `/ejecutar` |
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
| APIs Front | — | /revisar | No aplica |
| Delta | [delta.md](delta.md) | /completar | Creado |

## Metadata

- requerimiento: FE-CRUD-004
- slug: residente-ux
- size: L
- branch: `feature/fe-crud-004-residente-ux`
- created: 2026-10-26
- updated: 2026-10-27
- objetos_clave: `downloadAuthenticated`, `useCrearTicket`, `AreasYReservacionesPage`, hooks visitas, inventario M5 residente

## Depende de

- [[FE-PAT-002]] · [[FE-CRUD-002]] · [[FE-CRUD-003]] · [[SGR-FE-001]]

## Dominios

[[frontend]] · [[tickets]] · [[visitas-areas]] · [[vehiculos]] · [[mascotas]] · [[archivos]] · [[anuncios]] · [[encuestas]] · [[juntas]] · [[finanzas]] · [[usuarios]]

## Related requerimientos

- [[FE-QA-001]] — smoke E2E transversal
- [[FE-MOD-ENC-001]] — admin encuestas (no bloquea residente)

## Log de estados

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-26 | — | SPEC PENDIENTE | (borrador) | spec/design esqueleto |
| 2026-10-27 | SPEC PENDIENTE | SPEC PENDIENTE | /definir | spec canónica |
| 2026-10-27 | SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | /diseñar | design + matriz Vitest; REST ticket + downloadAuthenticated |
| 2026-10-27 | DISEÑO PENDIENTE REVISIÓN | EN REVISIÓN | /ejecutar | Fases 0–4; Vitest 185/185; CA-4 parcial (fases 5–7) |
| 2026-10-27 | EN REVISIÓN | REQUIERE CAMBIOS | /revisar | CA-4 [M] abierto; auditor-codigo OK en scope 1–4 |
| 2026-10-27 | REQUIERE CAMBIOS | EN REVISIÓN | /ejecutar | Fases 5–7 + TC-RES-1; Vitest 186/186; CA-4 cerrado en código |
| 2026-10-27 | EN REVISIÓN | LISTO PARA PR | /revisar | Fix hooks visitas; Vitest 188/188; CA Must verificados |
| 2026-10-27 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs + graph; meta-sdd: 3 propuestas (sin aplicar) |

## Pasada adversarial diseño

Ver tabla final en [design.md](design.md). Sin bloqueos.

## meta-sdd (2026-10-27)

Propuestas documentadas (no aplicadas): contrato `apiGet` en `14_tech_react`; auth blob `downloadAuthenticated`; plantilla `PATRON_RESIDENTE.md`. Sin cambios automáticos a rules.

## Resumen final

### Objetivo cumplido

- M1–M5 residente: auth HTTP uniforme, tickets REST, reservas Zod, kit UI sin Bootstrap, inventario rutas con loading/error/empty.

### Archivos modificados

- Ver [impl.md](impl.md) y [delta.md](delta.md) (solo `Web/`).

### Auditorías finales

- auditor-sql: N/A
- auditor-codigo: APROBADO (post F001 hooks visitas)

### Correcciones automáticas aplicadas

- `/revisar`: `useAreasComunes`, `useReservaciones`, banners error, `PerfilPage` loading/auth.

### Pruebas ejecutadas

- T-SQL: N/A
- C# xUnit: N/A
- API `.http`: N/A
- Vitest: **188/188** PASS; `tsc --noEmit` OK

### Riesgos residuales

- Sin test E2E redirect `/403` (CA-R1 delegable a [[FE-QA-001]]).
- Rama/commit pendiente en repo `Web`.

### Decisiones técnicas relevantes

- Creación ticket residente solo REST (ADR en [delta.md](delta.md)).
- Descargas vía `downloadAuthenticated`.

### Documentación actualizada

- [specs/frontend.md](../../specs/frontend.md), [tickets.md](../../specs/tickets.md), [archivos.md](../../specs/archivos.md), [visitas-areas.md](../../specs/visitas-areas.md)
- [_graph.md](../../_graph.md), [ROADMAP_DISENO_Y_CRUD.md](../ROADMAP_DISENO_Y_CRUD.md)
