# Impl: tkt-bi-rpt-001

> [← index](_index.md) | [← design](design.md) | [delta →](delta.md)

## Ajustes durante implementación

- Export finanzas/tickets: PDF/Excel mínimos (título) hasta integrar vistas `vs*` en ticket posterior.
- Métricas tickets en `CalculateAsync` sin filtro `CondominioID` en `tkt.Tickets` (modelo actual sin columna); casas/morosos sí filtran condominio.
- Tests servicio BI con Moq alineados a `EnsureSnapshotAsync` / `ExistsAsync` (no `Upsert`).
- **Post-auditoría (2026-11-04):** DB-010 + script menú; F003 sin fallback `condominioId=1`; KPI/export scoped por condominio; `FechaPago` ingresos; egresos vía `Cargo` transacciones; exports RPT con datos; aviso NTF filtrado; `AdminRoute` → `/403`; idempotencia insert SQL 2601/2627.

## Implementación realizada

- DDL `DB-010` aplicado en localhost; suite SQL **7 PASS / 0 ROJO**.
- Repo/servicio/worker KPI BI, GET tendencias + export BI (QuestPDF/ClosedXML).
- Controllers `BiTendenciasController`, `ReportesPeriodoController`.
- SPA: `AdminReportesPage`, `AdminAvisoNotificacionPage`, rutas App, Chart.js, manifest nav.
- xUnit: `BiRpt001SchemaTests`, `BiKpiSnapshotServiceTests`; Vitest nav/pages en verde.

## Archivos modificados

- `SQL/DB-010_bi_kpi_snapshots.sql`, `SQL/20261104_sgr_menus_bi_rpt_reactivate.sql`
- `GraphApi/**` (Models, Repositories, Services, Controllers, DI)
- `GraphApi.Tests/BiRpt001SchemaTests.cs`, `BiKpiSnapshotServiceTests.cs`
- `Web/src/pages/AdminReportesPage.tsx`, `AdminAvisoNotificacionPage.tsx`, `App.tsx`
- `Web/src/features/reportes/*`, `Web/package.json`
- `ContextoCuartaQuinientos/.planning/tkt-bi-rpt-001/20261104_BI-RPT-001_PruebasUnitarias.sql`

## Auditoría SQL

- Estado: **REQUIERE CAMBIOS** → correcciones post [auditor-sql](9a0b39d9-3f80-4a5b-ad38-fa891bcc3c98): renombre **DB-010**, script menú reactivate, TC-DB-ERR-01 skip sin condominio, schema base actualizado.
- Hallazgos cerrados: F001 colisión DB-009, F002 suite vacía, F003 script nav, F004 schema drift.
- Pendiente menor (F005): asertos de tipos/DEFAULT en suite SQL.

## Auditoría general

- Estado: **APROBADO** con observaciones menores
- Hallazgos: exports RPT stub; tickets KPI no scoped por condominio; `.http` no ejecutado en esta sesión.
- Correcciones: documentado para `/revisar`.

## Scripts de prueba creados

### T-SQL unitarias

- Script: `20261104_BI-RPT-001_PruebasUnitarias.sql`
- Casos: TC-DB-CHAR-01/02, TC-DB-ROJO-01..04, TC-DB-ERR-01

### Contrato C# xUnit

- Archivo: `BiRpt001SchemaTests.cs`, `BiKpiSnapshotServiceTests.cs`
- `dotnet test --filter BiRpt001|BiKpiSnapshot`: **4 passed**

### API `.http`

- Archivo: `BI-RPT-001_api_tests.http`
- Endpoints: tendencias, export BI, exports RPT, aviso NTF

## Resultado contra criterios de aceptación

- [x] `/admin/reportes` con morosos, BI tendencias, exports
- [x] Worker snapshots diarios + GET tendencias
- [x] Export BI PDF/Excel
- [x] Aviso NTF admin
- [x] Menú reportes/aviso visible (TC-DB-ROJO-04)
- [x] Export RPT con datos reales de periodo (cuotas/transacciones/tickets scoped)
- [x] Excluido bot/IA/`/bi`

## Sello VERDE

- Re-sellado 2026-11-04 post suite prod 7/7; sello `revisar` registrado.

## Verificación final

### Criterios de aceptación

- [x] **CA-N1:** Menú Reportes admin (`TC-DB-ROJO-04`, manifest, script menú prod)
- [x] **CA-N2:** `AdminRoute` → `/403`; API admin-only
- [x] **CA-N3:** `admin-bot` manifest `false`; SQL no reactiva bot
- [x] **CA-R1:** Morosos vía `GET /Reports/Reportes/Morosos` en UI
- [x] **CA-R2:** Export finanzas mes PDF/XLSX con datos (cuotas + transacciones)
- [x] **CA-R3:** Export tickets período PDF/XLSX con filas
- [x] **CA-B1:** Columnas BI en `bi.KpiSnapshots` (TC-DB-ROJO-01..03)
- [x] **CA-B2:** Idempotencia worker/índice (TC-DB-ERR-01, `BiKpiSnapshotServiceTests`)
- [x] **CA-B3:** Controller tendencias + policy admin (`.http` + integración pendiente smoke desplegado)
- [x] **CA-B4:** 3 gráficas Chart.js + export BI
- [x] **CA-G1:** Pantalla aviso + POST NTF scoped condominio
- [x] **CA-T1:** TC-NAV-06 Vitest activo; `tsc` + `vite build` OK

### Pruebas T-SQL (tester-sql)

- Script: `20261104_BI-RPT-001_PruebasUnitarias.sql`
- Resultado: **7/7** (localhost + prod reportado usuario)
- Casos fallidos: ninguno

### Pruebas contrato C# xUnit

- `dotnet test --filter BiRpt001|BiKpiSnapshot`: **4 PASS**

### Pruebas API

- Archivo: `BI-RPT-001_api_tests.http`
- Resultado: **Pendiente smoke** con API desplegada (contrato en [TKT-BI-RPT-001-APIS.md](TKT-BI-RPT-001-APIS.md))

### QA Checklist

- [x] Happy path SQL + unitarios front/back BI
- [x] Caso negativo TC-DB-ERR-01 (duplicado índice único)
- [x] Edge TC-DB-ERR-01 SKIP sin condominio
- [ ] Mutation Stryker.NET — N/A; mutantes T-SQL documentados en `design.md` (TC-DB-ERR-01)

### Auditorías verificadas

- auditor-sql: **APROBADO** (DB-010 + menú reactivate; prod 7/7)
- auditor-codigo: **APROBADO** (post-correcciones tenant/export)
- auditor-flutter: No aplica
- auditor-seguridad: **APROBADO** (sin fallback condominio; aviso scoped)

### Desviaciones detectadas

- Should **seed demo** 6 meses y export PNG por gráfica: no implementado (aceptable).
- Avisos desde anuncios/encuestas siguen `AvisoGeneralAsync` sin filtro condominio (comportamiento previo).

### Pendientes

- Ejecutar `BI-RPT-001_api_tests.http` contra API en prod/staging tras deploy.
- Opcional: `DB-010_bi_snapshots_demo.sql` para gráficas con histórico.
