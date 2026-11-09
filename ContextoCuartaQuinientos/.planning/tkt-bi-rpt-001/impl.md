# Impl: tkt-bi-rpt-001

> [← index](_index.md) | [← design](design.md) | [delta →](delta.md)

## Hotfix post-archivo (2026-11-09)

- **Síntoma:** `GET /Reports/Reportes/FinanzasMes/export` (PDF/XLSX) HTTP **500** en prod (`apicuartaquinientos.runasp.net`); UI «Descargar PDF» en `/admin/reportes` → consola 500.
- **Causa (1):** `u.NombreUsuario` en prod → columna **`Nombre`** (`Invalid column name 'NombreUsuario'`).
- **Causa (2):** `c.Cuenta` en `fnz.Cuentas` → prod usa **`Nombre`** (`Invalid column name 'Cuenta'`). El export llama cuotas **y** transacciones; falla la segunda aunque cuotas esté bien.
- **Fix:** ctor — `SqlSchemaCompat.UsuarioColumns` + `HasColumn(..., Cuentas, Nombre)` → `c.Nombre` / `c.Cuenta` con alias `AS Cuenta`.
- **Deploy:** el fix es solo **API** (`GraphApi` → `apicuartaquinientos.runasp.net`). Publicar solo la **Web** no corrige el 500.
- **Archivos:** `GraphApi/Repositories/Reports/BiKpiSnapshotRepository.cs`; smoke `scripts/Invoke-ApiSmokePostDeploy.ps1` → **TC-BIRPT-09** (Finanzas PDF).
- **Verificación:** SQL corregido OK en MCP CQ500; `dotnet build` OK; prod **pendiente redeploy API** y `Invoke-ApiSmokePostDeploy.ps1 -Target Prod` (TC-BIRPT-09).
- **Gap detectado:** smoke 2026-11-04 (**16/16**) no cubría FinanzasMes; solo BI export PDF.

## Ajustes durante implementación

- Export finanzas/tickets: PDF/Excel con filas del periodo (cuotas, transacciones, tickets) scoped por condominio JWT.
- Métricas tickets en `CalculateAsync` sin filtro `CondominioID` en `tkt.Tickets` (modelo actual sin columna); casas/morosos sí filtran condominio — **riesgo residual** documentado.
- Tests servicio BI con Moq alineados a `EnsureSnapshotAsync` / `ExistsAsync` (no `Upsert`).
- **Post-auditoría (2026-11-04):** DB-010 + script menú; F003 sin fallback `condominioId=1`; KPI/export scoped por condominio; `FechaPago` ingresos; egresos vía `Cargo` transacciones; exports RPT con datos; aviso NTF filtrado; `AdminRoute` → `/403`; idempotencia insert SQL 2601/2627.

## Implementación realizada

- DDL `DB-010` aplicado en localhost; suite SQL **8 PASS / 0 ROJO**.
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

- Estado final: **APROBADO** (post-correcciones 2026-11-04).
- Hallazgos cerrados: F001 colisión DB-009, F002 suite vacía, F003 script nav, F004 schema drift, F005 tipos/DEFAULT (`TC-DB-CHAR-03` en suite).
- Prod/local: suite **8/8 PASS** documentada en cabecera del script SQL.

## Auditoría general

- Estado: **APROBADO**
- Riesgo residual: KPI tickets sin columna condominio en `tkt.Tickets`; smoke `.http` prod **16/16** — [`EVIDENCIA_API_SMOKE_POSTDEPLOY.md`](../../evidencia/20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md).

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

- Re-sellado 2026-11-04 post suite prod 8/8; sello `revisar` registrado.

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
- [x] **CA-B3:** Controller tendencias + policy admin (smoke prod PASS)
- [x] **CA-B4:** 3 gráficas Chart.js + export BI
- [x] **CA-G1:** Pantalla aviso + POST NTF scoped condominio
- [x] **CA-T1:** TC-NAV-06 Vitest activo; `tsc` + `vite build` OK

### Pruebas T-SQL (tester-sql)

- Script: `20261104_BI-RPT-001_PruebasUnitarias.sql`
- Resultado: **8/8** (localhost + prod reportado usuario)
- Casos fallidos: ninguno

### Pruebas contrato C# xUnit

- `dotnet test --filter BiRpt001|BiKpiSnapshot`: **4 PASS**

### Pruebas API

- Archivo: `BI-RPT-001_api_tests.http`
- Resultado: **PASS prod 2026-11-04** — `Invoke-ApiSmokePostDeploy.ps1 -Target Prod` (TC-BIRPT-05…08). Evidencia: [EVIDENCIA_API_SMOKE_POSTDEPLOY.md](../../evidencia/20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md)

### QA Checklist

- [x] Happy path SQL + unitarios front/back BI
- [x] Caso negativo TC-DB-ERR-01 (duplicado índice único)
- [x] Edge TC-DB-ERR-01 SKIP sin condominio
- [ ] Mutation Stryker.NET — N/A; mutantes T-SQL documentados en `design.md` (TC-DB-ERR-01)

### Auditorías verificadas

- auditor-sql: **APROBADO** (DB-010 + menú reactivate; prod 8/8)
- auditor-codigo: **APROBADO** (post-correcciones tenant/export)
- auditor-flutter: No aplica
- auditor-seguridad: **APROBADO** (sin fallback condominio; aviso scoped)

### Desviaciones detectadas

- Should **seed demo** 6 meses y export PNG por gráfica: no implementado (aceptable).
- Avisos desde anuncios/encuestas siguen `AvisoGeneralAsync` sin filtro condominio (comportamiento previo).

### Pendientes

- Opcional: `DB-010_bi_snapshots_demo.sql` para gráficas con histórico en demos vacías.
- Futuro: columna `CondominioID` en `tkt.Tickets` o vista scoped para KPI tickets multi-condominio.
