[← spec](spec.md) | [← index](_index.md)

# design.md — BI-RPT-001

## Estrategia

Ejecutar [[NAV-ROOT-001]] **fase E** completa + **fase G** (aviso NTF) + exports RPT/BI (**HU-RPT-01/02**, **HU-BI-02**), **sin** fase F ni dependencias `bot`/`ia`. Detalle epic en [nav-root-001/design.md](../tkt-nav-root-001/design.md); este design acota deltas y orden de deploy.

### Escalera de decisión

| Capacidad | Peldaño | Entregable |
|-----------|---------|------------|
| Morosos en UI | 3 | Reusar `finanzasAdmin.api` / `GET Morosos` |
| KPI histórico | 5 | `bi.KpiSnapshots` + worker + GET tendencias |
| Reportes PDF/Excel | 3 | QuestPDF/ClosedXML / ReportEngine existente |
| Menú reportes | 4 | Manifest + script visibilidad parcial vs FE-NAV-ENT1 |

## database:CuartaQuinientos

| Script | Acción |
|--------|--------|
| `DB-010_bi_kpi_snapshots.sql` | Schema `bi` + tabla `KpiSnapshots` (columnas completas) + índice único; idempotente (prod greenfield o ALTER) |
| `20261104_sgr_menus_bi_rpt_reactivate.sql` | Inverso parcial FE-NAV-ENT1: `bVisible=1` reportes + aviso; **no** bot |
| `DB-010_bi_snapshots_demo.sql` | *(Should)* INSERT 6 fechas demo condominio seed |

Deploy: `DB-008` ya aplicado → **`DB-010_bi_kpi_snapshots.sql`** (+ menú reactivate si FE-NAV-ENT1) → API → Web.

## backend:cuartaquinientos-api

| Componente | Acción |
|------------|--------|
| `IBiKpiCalculator` / `BiKpiCalculator` | Agrega KPI del día desde `vs*` + reglas dashboard (morosos, tickets, fnz transacciones, ocupación `CasaOcupantes`) |
| `BiSnapshotWorker` | `BackgroundService`: al arranque + diario; insert si no existe fila `(CondominioID, Fecha)` |
| `BiTendenciasController` | `GET /Reports/Bi/tendencias?meses=6` — `[Authorize]` admin |
| `BiExportService` | PDF/Excel snapshot período (QuestPDF/ClosedXML) — HU-BI-02 |
| Reportes período | Endpoints o ReportEngine templates **FinanzasMes** / **TicketsPeriodo** (Dapper sobre `fnz.vsTransacciones`, `tkt.vsTickets`) |

Sin SPs; transacciones solo en escritura snapshot.

## frontend:cuartaquinientos-web

| Artefacto | Detalle |
|-----------|---------|
| `AdminReportesPage` | Tabs: Morosos · Reportes export · BI tendencias |
| Dependencia | `chart.js` + `react-chartjs-2` (o wrapper proyecto) |
| Rutas | `/admin/reportes`; `/admin/notificaciones/aviso` |
| Manifest | `admin-reportes` + `admin-ntf-aviso` → `implemented: true`; **`admin-bot` permanece `false`** |
| Nav SQL | `20261104_sgr_menus_bi_rpt_reactivate.sql` (solo claves reportes + aviso) |

## integrations:cuartaquinientos-bot

Sin cambios. Documentar en release que BI Telegram queda en backlog [[bot-ia]].

## Plan de pruebas (`/test`)

Matriz con **Expected congelado** (fuente única para SQL, `.http`, Vitest, xUnit).

| ID | Capa | Caso | Expected |
|----|------|------|----------|
| TC-DB-CHAR-01 | T-SQL | Tabla `bi.KpiSnapshots` existe | `OBJECT_ID` not null |
| TC-DB-ROJO-01 | T-SQL | Columna `TiempoMedioResolucionHoras` | EXISTS |
| TC-DB-ROJO-02 | T-SQL | Columna `CasasTotales` | EXISTS |
| TC-DB-ROJO-03 | T-SQL | Columna `CasasOcupadas` | EXISTS |
| TC-DB-CHAR-02 | T-SQL | Índice único `UX_bi_KpiSnapshots_Condominio_Fecha` | EXISTS |
| TC-DB-ROJO-04 | T-SQL | Menú `/admin/reportes` visible admin (`PerfilMenus.bVisible=1`) | `>=1` |
| TC-DB-ERR-01 | T-SQL | Índice único impide 2 filas mismo `(CondominioID,Fecha)` en TRAN | `1` fila tras 2 INSERT |
| TC-BIRPT-03 | xUnit | Schema columnas BI extendidas (live DB) | 3 columnas presentes |
| TC-BIRPT-04 | xUnit | Índice único Condominio+Fecha en live DB | EXISTS |
| TC-BIRPT-01 | Vitest | `AdminReportesPage` módulo existe | glob defined |
| TC-BIRPT-02 | Vitest | Manifest: `admin-reportes`/`admin-ntf-aviso` `implemented:true`; `admin-bot` `false` | flags |
| TC-BIRPT-05 | `.http` | `GET /Reports/Bi/tendencias?meses=6` admin | `200` + array |
| TC-BIRPT-05-ERR | `.http` | Mismo GET residente | `403` |
| TC-BIRPT-06 | `.http` | Export BI (endpoint TBD en impl) admin | `200` + PDF o Excel content-type |
| TC-BIRPT-07 | `.http` | `GET /Reports/Reportes/Morosos` admin (regresión) | `200` |
| TC-BIRPT-08 | `.http` | `POST /NTF/Notificaciones/aviso` admin smoke | `201` o `200` |
| TC-NAV-06 | Vitest | Heredado — `AdminReportesPage` existe | *(activar en biRpt001)* |

**Mutantes críticos (validar en `/ejecutar`):** (1) quitar filtro `bEliminado=0` en tendencias → TC-BIRPT-05 debe fallar; (2) duplicar snapshot mismo día sin guard → TC-DB-ERR-01; (3) morosidad distinta a dashboard → TC-BIRPT-07 datos incoherentes con dashboard.

## Orden de implementación

1. SQL DB-009 extend (+ demo opcional)
2. Calculator + worker + GET tendencias + tests API
3. Export RPT/BI backend
4. `AdminReportesPage` + Chart.js + exports UI
5. `AdminAvisoNotificacionPage` + menú aviso
6. Reactivar nav parcial + inventario + `/revisar`

## Pasada adversarial

| Punto | Respuesta |
|-------|-----------|
| Sin bot, sin gráfica adopción | 3 gráficas; columnas Telegram fuera de scope |
| ReportEngine genérico vs Cuarta | Preferir servicios Cuarta dedicados si catálogo vacío |
| FE-NAV-ENT1 | Reversión **parcial** documentada en inventario |

## Rama de trabajo

**`final-project-AFS`** — compartida con [[FE-THEME-001]]; no crear ramas feature separadas para este ticket.

## Estado

**LISTO PARA PR** — revisado `/revisar` 2026-11-04.
