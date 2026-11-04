# BI-RPT-001 — Reportes + BI web (sin bot / IA)

## Estado

**ARCHIVADO**

| Campo | Valor |
|-------|--------|
| Talla | **L** (~28–32 h ideales) |
| Dominios | [[reportes-bi]] · [[frontend]] · [[sgr]] · [[finanzas]] · [[tickets]] · [[notificaciones]] |
| Epic padre | [[NAV-ROOT-001]] fases **E** + **G** (fase **F** excluida) |
| Rama única de trabajo | **`final-project-AFS`** |

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir | ✅ |
| Design | [design.md](design.md) | /diseñar | ✅ |
| Test | [20261104_BI-RPT-001_PruebasUnitarias.sql](20261104_BI-RPT-001_PruebasUnitarias.sql) · [BI-RPT-001_api_tests.http](BI-RPT-001_api_tests.http) | /test | **7/7 SQL** · `.http` smoke pendiente |
| Impl | [impl.md](impl.md) | /ejecutar | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |
| Release | [release.md](release.md) | /completar | Esqueleto |
| APIs Front | [TKT-BI-RPT-001-APIS.md](TKT-BI-RPT-001-APIS.md) | /revisar | ✅ |

## Resumen final

### Objetivo cumplido
- Reportes admin web: morosos, exports RPT/BI, tendencias Chart.js, aviso NTF; menús SGR; sin bot/IA.

### Archivos clave
- SQL: `DB-010_bi_kpi_snapshots.sql`, `20261104_sgr_menus_bi_rpt_reactivate.sql`, `DB-010_bi_snapshots_demo.sql`
- API: `BiTendenciasController`, `ReportesPeriodoController`, `BiKpiSnapshot*`, `NotificacionRepository`
- Web: `AdminReportesPage`, `BiTrendsPanel`, `AdminAvisoNotificacionPage`

### Auditorías finales
- auditor-sql: **APROBADO**
- auditor-codigo: **APROBADO**
- auditor-seguridad: **APROBADO**

### Pruebas ejecutadas
- T-SQL: **7/7** PASS (local + prod)
- xUnit BI: **4** PASS
- Vitest: **6** PASS (+ TC-NAV-07 skip bot)
- API `.http`: pendiente post-deploy API

### Riesgos residuales
- Smoke `.http` no ejecutado en CI.
- Admin multi-condominio sin casa: scope al condominio de menor ID.
- Avisos anuncios/encuestas sin filtro condominio (comportamiento previo).

### meta-sdd (2026-11-04)
- **Patrones:** cache `SqlSchemaCompat` en ctor antes de transacciones; JWT `condominioId` para admin; Dapper `DateOnly`; backfill snapshots para BI.
- Sin nueva rule obligatoria; recomendación documentada en [delta.md](delta.md) § Aprendizajes.

## Log

| Fecha | De | A | Nota |
|-------|----|---|------|
| 2026-11-04 | — | SPEC + DESIGN | Decisión: todo RPT/BI aplicable sin bot/ia |
| 2026-11-04 | LISTO PARA EJECUTAR | EN REVISIÓN | /ejecutar |
| 2026-11-04 | EN REVISIÓN | LISTO PARA PR | /revisar · SQL 7/7 |
| 2026-11-04 | LISTO PARA PR | **ARCHIVADO** | /completar · delta · specs · graph |
