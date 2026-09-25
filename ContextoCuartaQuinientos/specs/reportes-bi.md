# specs/reportes-bi.md — Reportes y BI (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Dos capas: **RPT (Reportes)** — generación y exportación de reportes operativos/financieros a PDF (QuestPDF) y Excel (ClosedXML) sobre vistas `vs*` + servicios C#; y **BI (nuevo)** — KPIs con **tendencia** entre períodos alimentados por vistas `vs*` + snapshots periódicos `bi.KpiSnapshots`. El resumen BI también se puede pedir por el bot (`/bi`), redactado por el asistente IA.

## Objetos del dominio (tablas + vistas reales)
- RPT: **sin tablas propias**; lee vistas `vs*` (`fnz.vsTransacciones`, `tkt.vsTickets`, `vts.vsReservacionesArea`, etc.) vía Dapper y compone reportes con servicios C#.
- Exportación: QuestPDF (PDF) + ClosedXML (Excel) — dependencias reales del `.csproj`.
- BI (delta):
  - `bi.KpiSnapshots (SnapshotID, CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, IngresosMXN, EgresosMXN, ResidentesMorosos, FechaCreacion)` — **(delta)** foto periódica de KPIs para tendencias (cobranza, morosidad, tickets abiertos y tiempo de resolución, ocupación, adopción del bot). Esquema nuevo `bi`, no existe en la referencia.

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
- BI: KPIs con tendencia servidos desde `/Reports` sobre `bi.KpiSnapshots` (endpoint BI dedicado `(asumido)`; convención `/{Dominio}/{Controller}`).
- Resumen BI por bot: `/bi` (comando del bot) -> orquesta el asistente IA (`/BOT/Asistente/Consultar`) sobre `bi.KpiSnapshots` + vistas; solo Administrador.

Controller backend real: `Reports/Reportes` (`ReportesController`).

## Reutilización / objetos existentes (escalera)
1. **Reutilizar**: vistas `vs*` de todos los dominios como fuente única de verdad de los reportes.
2. **Reutilizar**: QuestPDF + ClosedXML ya presentes en el stack.
3. RPT comparte reglas (morosidad, ocupación) con Dashboard; BI las persiste como snapshots para tendencia.
4. BI por Telegram reutiliza el asistente IA y los endpoints de dominio; no duplica lógica.

## Deltas del proyecto (nuevo)
- (delta) Esquema nuevo `bi` con `bi.KpiSnapshots` para tendencias — no existe en la referencia.
- (delta) Módulo BI (KPIs con comparativa entre períodos) sobre vistas `vs*` + snapshots.
- (delta) Comando `/bi` en el bot y resumen ejecutivo redactado por IA (esquemas `bot`/`ia`).
- (delta) KPI de adopción del bot (WEB vs TELEGRAM), dependiente del delta `tkt.Tickets.Canal`.

## Notas
- Sin stored procedures: Dapper sobre vistas `vs*` + servicios C# + QuestPDF/ClosedXML.
- Distinción clave: **Dashboard** = KPIs operativos del momento; **BI** = KPIs con tendencia histórica vía `bi.KpiSnapshots` (delta).
- `bi.*` marcado como (delta) en todo el archivo; el resto es reutilización verificada.
