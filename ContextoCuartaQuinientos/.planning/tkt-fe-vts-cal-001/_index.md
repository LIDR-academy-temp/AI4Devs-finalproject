# FE-VTS-CAL-001 — Calendario comunitario de reservas

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-28

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test | Matriz en [design.md](design.md) + Vitest/xUnit | /test | ✅ |
| Impl | [impl.md](impl.md) | /ejecutar | ✅ |
| APIs Front | [FE-VTS-CAL-001-APIS.md](FE-VTS-CAL-001-APIS.md) | /revisar | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |

## Metadata

- requerimiento: FE-VTS-CAL-001
- slug: vts-calendario-reservas
- size: M
- branch: `feature/fe-vts-cal-001-vts-calendario-reservas`
- dominios: [[visitas-areas]] · [[frontend]] · [[backend]]

## Depende de

- [[FE-047]] · `CuartaVisitasService` (solapamiento ya implementado)

## Related

- [[GAPS_MVP_ROADMAP]]

## Log

| Fecha | De | A | Nota |
|-------|----|---|------|
| 2026-10-28 | — | DISEÑO PENDIENTE REVISIÓN | spec + design generados |
| 2026-10-28 | DISEÑO PENDIENTE REVISIÓN | LISTO PARA EJECUTAR | Diseño aceptado (Luis) |
| 2026-10-28 | LISTO PARA EJECUTAR | EN REVISIÓN | /ejecutar — calendario + GET + tests |
| 2026-10-28 | EN REVISIÓN | LISTO PARA PR | /revisar — xUnit 13/13, Vitest 7/7, APIS.md + .http |
| 2026-10-28 | LISTO PARA PR | ARCHIVADO | /completar — delta + specs + graph |

## Resumen final

### Objetivo cumplido

- Calendario comunitario semanal por área en `/areas-comunes` + `GET /VTS/ReservacionesArea/calendario`.

### Archivos modificados

- GraphApi: DTO, repo, servicio, controller, xUnit.
- Web: hook, componente calendario, página, Vitest.

### Auditorías finales

- auditor-sql: No aplica
- auditor-codigo: APROBADO
- auditor-seguridad: APROBADO

### Pruebas ejecutadas

- T-SQL: N/A
- C# xUnit: 13/13 PASS
- Vitest: 7/7 PASS
- API `.http`: archivo creado; smoke runtime pendiente manual

### Riesgos residuales

- Smoke HTTP GET no corrido en revisión (API apagada).
- Etiqueta `(Reservado)` hardcode (catálogo pendiente).

### meta-sdd

- **Sin patrones nuevos ≥3** para rule/agente formal.
- Observación (Tema `fe-calendario-slot-overlap`): eventos multi-hora requieren test de solapamiento de franja, no solo hora de inicio — registrar en evolución si se repite en otro módulo de calendario.

### Documentación actualizada

- [specs/visitas-areas.md](../../specs/visitas-areas.md)
- [_graph.md](../../_graph.md)
- [delta.md](delta.md)
