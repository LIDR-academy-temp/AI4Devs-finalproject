# specs/dashboard.md — Dashboard (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Panel de indicadores clave (KPIs). Dominio **sin tablas propias**: agrega y lee datos de otros dominios a través de las vistas `vs*` y de las tablas base ya usadas por otros módulos. Un único endpoint con respuesta por perfil: **Administrador** (KPIs del fraccionamiento, `tipo = ADMIN`) y **Residente** (resumen personal, `tipo = RESIDENTE`); Guardia/Trabajador → `403`.

## Objetos del dominio (tablas + vistas reales)
- **No tiene tablas propias.** Fuentes (readme §6 DASH-BE-014):
  - `tkt.vsTickets` — conteos por estado (Nuevo, En seguimiento) y tickets activos del residente (estado ≠ Cerrado).
  - `tkt.Tickets.CanalID` (→ `tkt.CanalesTicket`) — desglose de tickets del mes por canal.
  - `fnz.Cuotas` — morosos, monto cobrado / pendiente del mes, cuota del mes del residente.
  - `sgr.CasaOcupantes` (`Vigente = 1`) + `sgr.Casas` — ocupación.
  - `ntf.Notificaciones` + `ntf.NotificacionesVisualizadas` — no leídas del residente (sin fila de lectura).
- Acceso Dapper sobre vistas + servicios C# de agregación. Sin stored procedures.

## Catálogos y estados
- No define catálogos propios; consume estados de los dominios origen (p. ej. estados de ticket: Nuevo, En seguimiento, Resuelto, Cerrado).

## Invariantes (INV-x)
- **INV-1**: Dashboard es **solo lectura**; no persiste datos propios.
- **INV-2**: el perfil se detecta por el claim `bAdministrador`: `1` → `ResumenAdmin`; Residente → `ResumenResidente`; Guardia/Trabajador → `403` (perfil sin tablero).
- **INV-3**: `morososMes` = `COUNT DISTINCT UsuarioID` de `fnz.Cuotas` con `Pagado = 0` y `FechaVencimiento < hoy` (definición única de morosidad, compartida con RPT/BI).
- **INV-4**: `ticketsPorCanal` (`web`, `telegram`) agrupa los tickets del mes por `tkt.Tickets.CanalID` (Fase 1; catálogo sembrado en DB-002).
- **INV-5**: el resumen personal del residente muestra únicamente datos del `UsuarioID` autenticado (`sub` del JWT).
- **INV-6**: sin datos en el período los KPI valen 0 (no error); "hoy"/mes en curso en `America/Mexico_City`.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-DASH-01 [M]** — KPIs del fraccionamiento (Admin): ver tickets nuevos, tickets en seguimiento, morosos del mes, monto cobrado, monto pendiente y ocupación, más desglose de tickets por canal (WEB vs TELEGRAM).
- **HU-DASH-02 [M]** — Resumen personal (Residente): ver mis tickets activos, estado de mi cuota del mes y últimas notificaciones, con aviso destacado si hay cuota vencida.

## Endpoints (/{Dominio}/{Controller})
Base `/Dashboard`:
- `GET /Dashboard/Resumen?mes={1-12}&anio={>=2024}` (readme §4 Endpoint 3; `bearerAuth`; parámetros opcionales, por defecto mes en curso — la UI de Fase 1 siempre pide el mes en curso). Respuesta `oneOf`:
  - `ResumenAdmin`: `tipo` (`ADMIN`), `ticketsNuevos`, `ticketsEnSeguimiento`, `morososMes`, `montoCobrado`, `montoPendiente`, `ocupacion` (% de casas con al menos un ocupante vigente en `sgr.CasaOcupantes`), `ticketsPorCanal { web, telegram }`.
  - `ResumenResidente`: `tipo` (`RESIDENTE`), `ticketsActivos`, `estadoCuotaMes { monto, fechaVencimiento, estado [Pagada|Pendiente|Vencida] }`, `notificacionesNoLeidas`, `avisoVencida`.
  - `401` no autenticado · `403` perfil sin tablero (Guardia, Trabajador).

Controller backend real: `Dashboard/Resumen` (`ResumenController`).

## UI web
- `/` (FE-040): tarjetas según `tipo` (`ADMIN` | `RESIDENTE`); aviso vencida enlaza a `/finanzas/cuenta`.

## Reutilización / objetos existentes (escalera)
1. **Reutilizar al 100%**: no crea tablas; compone las vistas `vs*` existentes.
2. Comparte la definición de morosidad con RPT/BI (no duplicar la regla).
3. Autorización por claim `bAdministrador` / `perfil` del JWT.
4. El resumen personal reutiliza `tkt.vsTickets`, `fnz.Cuotas` y `ntf.Notificaciones` filtrados por `UsuarioID`.

## Deltas del proyecto (nuevo)
- (delta) KPI `ticketsPorCanal { web, telegram }` sobre la columna `tkt.Tickets.CanalID` (FK → `tkt.CanalesTicket`).
- (delta) `ocupacion` depende de `sgr.CasaOcupantes`.
- (delta) Adopción del bot como métrica del panel (relacionado con BI; ver reportes-bi.md).

## Notas
- Sin tablas ni stored procedures propios: Dapper sobre vistas `vs*` + servicios C#.
- Los KPIs con **tendencia** (comparativa entre períodos) pertenecen al módulo BI (`bi.KpiSnapshots`), no al Dashboard operativo; ver reportes-bi.md.
