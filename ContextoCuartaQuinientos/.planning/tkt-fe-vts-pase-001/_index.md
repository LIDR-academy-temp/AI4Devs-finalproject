# FE-VTS-PASE-001 — Pase de visita QR

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-28
fecha_cierre: 2026-10-28

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test | Matriz en [design.md](design.md) | /test | N/A (xUnit/Vitest) |
| Impl | [impl.md](impl.md) | /ejecutar | Creado |
| API tests | [FE-VTS-PASE-001_api_tests.http](FE-VTS-PASE-001_api_tests.http) | /revisar | Creado |
| APIs Front | [TKT-FE-VTS-PASE-001-APIS.md](TKT-FE-VTS-PASE-001-APIS.md) | /revisar | Creado |
| Delta | [delta.md](delta.md) | /completar | Creado |
| Release | [release.md](release.md) | /completar | Esqueleto |

## Metadata

- requerimiento: FE-VTS-PASE-001
- slug: vts-pase-qr
- size: L
- branch: `feature/fe-vts-pase-001-vts-pase-qr`
- dominios: [[visitas-areas]] · [[frontend]] · [[backend]]

## Depende de

- [[VTS-BE-026]] · [[FE-047]] · tabla `vts.VisitasGeneradas`

## Related

- [[GAPS_MVP_ROADMAP]]
- Paridad: `Web_diseño` (`PaseQr`, GraphQL `VisitasGeneradas`)

## Log

| Fecha | De | A | Nota |
|-------|----|---|------|
| 2026-10-28 | — | DISEÑO PENDIENTE REVISIÓN | spec + design generados |
| 2026-10-28 | DISEÑO PENDIENTE REVISIÓN | LISTO PARA EJECUTAR | Diseño aceptado (Luis) |
| 2026-10-28 | EN REVISIÓN | REQUIERE CAMBIOS | /revisar | Falta smoke `.http` runtime + APIS.md |
| 2026-10-28 | REQUIERE CAMBIOS | REQUIERE CAMBIOS | /revisar | xUnit 5/5; API off; `.http` token/base corregidos |
| 2026-10-28 | REQUIERE CAMBIOS | REQUIERE CAMBIOS | /revisar | API :5180 OK; login 401 (password local); smoke/APIS.md bloqueados |
| 2026-10-28 | REQUIERE CAMBIOS | LISTO PARA PR | /revisar | Fix tx post-commit + vista vsVisitasGeneradas; smoke OK; APIS.md; xUnit 5/5 |
| 2026-10-28 | LISTO PARA PR | ARCHIVADO | /completar | delta + specs + graph; sello revisar N/A |

## Resumen final

### Objetivo cumplido
- Pase visita QR (residente + guardia) en SPA Cuarta y API JWT, sin GraphQL en `Web/`.

### Archivos modificados
- **GraphApi:** `CuartaVisitasGeneradas*`, `VisitasGeneradasController`, `ServiceCollectionExtensions`, tests xUnit.
- **Web:** rutas pases/validar, componentes QR/WhatsApp, nav guardia.
- **SQL:** `cuartaquinientos_schema.sql` — vista `vts.vsVisitasGeneradas`.

### Auditorías finales
- auditor-sql: APROBADO
- auditor-codigo: APROBADO

### Pruebas ejecutadas
- T-SQL: N/A
- xUnit: 5/5 PASS
- API smoke: PASS (`FE-VTS-PASE-001_api_tests.http`)

### Riesgos residuales
- Desplegar vista corregida en entornos con definición legacy.
- S-2 PNG QR y catálogo `PASE_*` pendientes (Should).

### meta-sdd (2026-10-28)
- **Patrón nuevo (documentar en reviews):** Dapper — no consultar tras `Commit()` con `using var tx` aún activo; usar bloque `using (tx) { Commit(); }` antes de lecturas.
- Sin propuesta de rule/agente adicional (cluster ya cubierto por `tech_sql` + auditorías).

### Documentación actualizada
- [specs/visitas-areas.md](../../specs/visitas-areas.md), [_graph.md](../../_graph.md), [delta.md](delta.md), [TKT-FE-VTS-PASE-001-APIS.md](TKT-FE-VTS-PASE-001-APIS.md)
