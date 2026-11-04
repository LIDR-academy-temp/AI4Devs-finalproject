# specs/reportes-bi.md — Reportes y BI (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Alcance activo (post [[BI-RPT-001]] — ARCHIVADO 2026-11-04)

| Incluye | Fuera (backlog [[bot-ia]]) |
|---------|------------------------------|
| Web `/admin/reportes`: morosos (selección + exports), RPT export (HU-RPT-01/02), tablero tendencias (HU-BI-01) con `BiTrendsPanel`, export BI (HU-BI-02) | Comando `/bi`, HU-BI-03, resumen redactado por IA |
| `bi.KpiSnapshots` + `BiSnapshotWorker` + `GET /Reports/Bi/tendencias?meses=` + export BI | KPI adopción WEB/Telegram |
| `/admin/notificaciones/aviso` + `POST /NTF/Notificaciones/aviso` (residentes del condominio JWT) | Pantalla integración BOT (NAV fase F) |
| Menús SGR Reportes/Aviso (`20261104_sgr_menus_bi_rpt_reactivate.sql`) | Export PNG por gráfica (Should, no implementado) |

## Propósito
Dos capas: **RPT (Reportes)** — generación y exportación de reportes operativos/financieros a PDF (QuestPDF) y Excel (ClosedXML) sobre vistas `vs*` + servicios C#; y **BI (nuevo)** — KPIs con **tendencia** entre períodos alimentados por vistas `vs*` + snapshots periódicos `bi.KpiSnapshots`. Resumen BI por Telegram (`/bi` + IA) queda en dominio [[bot-ia]], no en BI-RPT-001.

## Objetos del dominio (tablas + vistas reales)
- RPT: **sin tablas propias**; lee vistas `vs*` (`fnz.vsTransacciones`, `tkt.vsTickets`, `vts.vsReservacionesArea`, etc.) vía Dapper y compone reportes con servicios C#.
- Exportación: QuestPDF (PDF) + ClosedXML (Excel) — dependencias reales del `.csproj`.
- BI (delta):
  - `bi.KpiSnapshots` — columnas: `TicketsAbiertos`, `TicketsCerrados`, `TiempoMedioResolucionHoras`, `IngresosMXN`, `EgresosMXN`, `ResidentesMorosos`, `CasasTotales`, `CasasOcupadas`, auditoría + `bEliminado`; índice único `(CondominioID, Fecha)`.

## Catálogos y estados
- No define catálogos propios; reutiliza estados de los dominios origen (estados de ticket, `Pagado` de cuotas, estados de reservación).
- Lista de morosos (HU-FNZ-03 / FNZ-BE-012): `GET /Reports/Reportes/Morosos` — datos desde `fnz.Cuotas`, dominio REST `/Reports`.

## Invariantes (INV-x)
- **INV-1**: RPT y BI son **solo lectura** sobre los dominios origen; no mutan datos operativos.
- **INV-2**: morosidad = cuotas con `Pagado = 0` y `FechaVencimiento < hoy` (misma definición que Dashboard).
- **INV-3**: acceso a reportes/BI restringido a Administrador (`bAdministrador = 1`); un residente que pide `/bi` es rechazado por perfil.
- **INV-4**: cada corte de KPIs se persiste como una fila en `bi.KpiSnapshots` con su `Fecha`; las tendencias se calculan comparando snapshots (no recomputan histórico desde cero).
- **INV-5**: `bi.KpiSnapshots` comparte patrón de auditoría + `bEliminado` (delta, esquema nuevo).

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-RPT-01 [S]** — Reporte financiero mensual (Admin): reporte del mes con cuotas cobradas, pendientes y morosos.
- **HU-RPT-02 [C]** — Reporte de tickets por período (Admin): exportar tickets para evaluar tiempos de resolución y carga.
- **HU-BI-01 [M]** — Tablero BI con tendencias: cobranza y morosidad del período, tickets abiertos y tiempo medio de resolución, ocupación y adopción del bot, con comparativa vs períodos anteriores (`bi.KpiSnapshots`).
- **HU-BI-02 [S]** — Exportar BI (PDF/Excel): obtener PDF (QuestPDF) y/o Excel (ClosedXML) con KPIs y gráficas del período.
- **HU-BI-03 [S]** — Resumen BI por Telegram: el Administrador pide `/bi` y recibe un resumen ejecutivo con indicadores y 2–3 hallazgos redactados por el asistente (IA sobre `bi.KpiSnapshots` + vistas); residente rechazado.

## Endpoints (/{Dominio}/{Controller})
- Base `/Reports`:
  - `/Reports/Reportes` (`ReportesController`) — reporte financiero, de tickets, de ocupación; export PDF/Excel.
- BI: `GET /Reports/Bi/tendencias?meses=N` y `GET /Reports/Bi/export?formato=pdf|xlsx` — [[BI-RPT-001]].
- Aviso admin: `POST /NTF/Notificaciones/aviso` — residentes del condominio del JWT (admin).
- *(Backlog bot-ia)* Resumen BI por bot: `/bi` → asistente IA sobre snapshots; solo Administrador.

Controller backend real: `Reports/Reportes` (`ReportesController`).

## Reutilización / objetos existentes (escalera)
1. **Reutilizar**: vistas `vs*` de todos los dominios como fuente única de verdad de los reportes.
2. **Reutilizar**: QuestPDF + ClosedXML ya presentes en el stack.
3. RPT comparte reglas (morosidad, ocupación) con Dashboard; BI las persiste como snapshots para tendencia.
4. BI por Telegram reutiliza el asistente IA y los endpoints de dominio; no duplica lógica.

## Deltas del proyecto (nuevo)

- Esquema `bi` + `bi.KpiSnapshots` — **cerrado** [[BI-RPT-001]].
- Módulo BI web + exports RPT en `/admin/reportes` — **cerrado** [[BI-RPT-001]].
- *(delta backlog)* Comando `/bi` + resumen IA (`bot`/`ia`).
- *(delta backlog)* KPI adopción bot (WEB vs TELEGRAM) cuando exista `tkt.Tickets.Canal` y bot operativo.

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-11-04 | [[BI-RPT-001]] | Reportes/BI web, worker snapshots, menús, aviso NTF scoped; ver [delta](.planning/tkt-bi-rpt-001/delta.md) |

## Registro de cambios de contexto
- **2026-11-04** — Alcance web RPT/BI acotado en [[BI-RPT-001]]; bot/IA explícitamente excluidos del hito actual.
- **2026-11-04** — Cierre ARCHIVADO: specs alineadas a implementación (JWT condominio, SqlSchemaCompat NTF, demo SQL opcional).

## Notas
- Sin stored procedures: Dapper sobre vistas `vs*` + servicios C# + QuestPDF/ClosedXML.
- Distinción clave: **Dashboard** = KPIs operativos del momento; **BI** = KPIs con tendencia histórica vía `bi.KpiSnapshots` (delta).
- `bi.*` marcado como (delta) en todo el archivo; el resto es reutilización verificada.
