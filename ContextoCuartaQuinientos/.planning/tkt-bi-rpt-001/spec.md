[← index](_index.md) | [design →](design.md)

# spec.md — BI-RPT-001: Reportes operativos + tablero BI (web)

> **Tipo:** Feature  
> **Epic:** [[NAV-ROOT-001]] fases E + G (fase F fuera de alcance)  
> **Decisión 2026-11-04:** integrar RPT/BI demostrables en web; **omitir bot e IA** por completo en este ticket.

## User story

**Como** administrador del condominio, **quiero** una sección **Reportes** con morosos, reportes exportables (finanzas/tickets) y un tablero BI con **tendencias** entre meses, **para** preparar asambleas y seguimiento operativo sin depender de Telegram ni del asistente IA.

## Contexto / problema

- Fases A–D de [[NAV-ROOT-001]] están en producto; E/G quedaron ocultas vía [[FE-NAV-ENT1-001]].
- Existe `GET /Reports/Reportes/Morosos` y Dashboard operativo; **no** hay `GET /Reports/Bi/tendencias`, worker de snapshots ni `AdminReportesPage`.
- Tabla `bi.KpiSnapshots` en schema **incompleta** vs modelo (faltan columnas de tendencia documentadas en readme).
- Bot/IA (`HU-BI-03`, fase F, KPI adopción Telegram) se posponen a un ticket futuro en dominio [[bot-ia]].

## Alcance (MoSCoW)

### Must

1. **Navegación:** menú **Reportes** → `/admin/reportes`; `implemented: true` solo para `admin-reportes` (BOT/aviso G se activan en el mismo ticket solo para rutas de este scope — ver CA-G).
2. **Morosos:** pestaña reutiliza `GET /Reports/Reportes/Morosos` (sin duplicar regla de morosidad).
3. **BI tendencias (HU-BI-01):** ampliar `bi.KpiSnapshots`; `BiSnapshotWorker` + `GET /Reports/Bi/tendencias?meses=N`; gráficas Chart.js (tickets/resolución, flujo MXN, morosidad % ocupación).
4. **Reportes período (HU-RPT-01, HU-RPT-02):** export financiero mensual y reporte de tickets vía stack existente (QuestPDF/ClosedXML / ReportEngine Cuarta) desde UI Reportes.
5. **Export BI (HU-BI-02):** descarga PDF y/o Excel del período visible en tablero BI.
6. **Aviso general (CA-G2 NAV):** `/admin/notificaciones/aviso` + menú; `POST /NTF/Notificaciones/aviso` (solo admin).
7. Regresión: admin accede reportes; residente **403** en `/admin/reportes`.

### Should

8. Seed demo `DB-009` (6 meses, 1 condominio) para demo académica si BD vacía.
9. Export PNG por gráfica (Chart.js) en tab BI.

### Could

10. Pestaña “Catálogo” listando reportes ReportEngine (`GET` catálogo) si ya hay definiciones Cuarta.

### Won't — explícito (este ticket)

- **Fase F** [[NAV-ROOT-001]]: `/admin/integraciones/bot`, menú BOT, APIs telegram admin.
- **HU-BI-03:** resumen BI por Telegram; comando `/bi`; cualquier llamada a `IAssistantService` / esquema `ia.*` para BI.
- Gráfica **adopción bot (WEB vs TELEGRAM)** hasta existir bot + columna `tkt.Tickets.Canal` (ticket [[bot-ia]] futuro).
- Reimplementar bot Python o ampliar permisos vía integraciones.

## Instancias en scope

| Target | Impacto |
|--------|---------|
| `database:CuartaQuinientos` | ALTER `bi.KpiSnapshots`; opcional `DB-009` seed |
| `backend:cuartaquinientos-api` | Bi tendencias, worker, servicios cálculo KPI; exports RPT/BI |
| `frontend:cuartaquinientos-web` | `AdminReportesPage`, rutas, Chart.js, reactivación nav parcial |
| `integrations:cuartaquinientos-bot` | **Sin cambios** |

## Invariantes

| # | Regla | Fuente |
|---|--------|--------|
| INV-1 | RPT/BI solo lectura sobre dominios origen | [[specs/reportes-bi]] INV-1 |
| INV-2 | Morosidad = `Pagado=0` y `FechaVencimiento < hoy` | reportes-bi INV-2, dashboard |
| INV-3 | Solo administrador en reportes/BI/aviso | reportes-bi INV-3 |
| INV-4 | Tendencias vía filas `bi.KpiSnapshots`, no recomputo histórico ad hoc | reportes-bi INV-4 |
| INV-5 | Sin SPs de negocio; Dapper + servicios C# | ADR-001 |
| INV-6 | NTF aviso vía `INotificacionService` | [[specs/notificaciones]] |

## Criterios de aceptación

### Navegación y seguridad

- [ ] **CA-N1:** Admin ve **Reportes** en sidebar; residente no.
- [ ] **CA-N2:** URL `/admin/reportes` → 403 para no admin.
- [ ] **CA-N3:** `/admin/integraciones/bot` sigue **no** expuesto (manifest `implemented: false` o guard).

### Morosos + RPT

- [ ] **CA-R1:** Pestaña morosos lista datos de `GET /Reports/Reportes/Morosos`.
- [ ] **CA-R2:** Admin descarga reporte financiero mensual (PDF o Excel) con parámetros mes/año.
- [ ] **CA-R3:** Admin descarga reporte de tickets por período (PDF o Excel).

### BI

- [ ] **CA-B1:** Columnas KPI en `bi.KpiSnapshots` alineadas a design (sin `TicketsWeb`/`TicketsTelegram` obligatorias).
- [ ] **CA-B2:** Worker crea máximo un snapshot por condominio y fecha; idempotente.
- [ ] **CA-B3:** `GET /Reports/Bi/tendencias?meses=6` → array ordenado por `Fecha ASC`; admin 200, residente 403.
- [ ] **CA-B4:** UI muestra **3** gráficas de tendencia + export BI PDF/Excel del período.

### NTF (fase G)

- [ ] **CA-G1:** Menú y pantalla aviso general; POST aviso persiste vía servicio NTF.

### Regresión

- [ ] **CA-T1:** Vitest TC-NAV-06 activo; `.http` TC-NAV-09 verde; `tsc` + `vite build` OK.

## Estimación (ideal, sin buffer 30 %)

| Bloque | h |
|--------|---|
| SQL + seed | 3 |
| API BI + worker | 10 |
| UI Reportes + Chart.js | 8 |
| Export RPT/BI | 5 |
| NTF aviso UI | 3 |
| Pruebas + docs | 3 |
| **Total** | **~32** |

*(Núcleo BI-BE-023 readme: 13 h — resto RPT export + G + SQL.)*

## Dependencias

- Dashboard + morosos + tickets admin (**cerrados** en entrega módulos).
- [[FE-NAV-ENT1-001]] reversible parcialmente (reportes + aviso, no bot).

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Snapshots vacíos en demo | `DB-009` seed |
| ReportEngine sin plantillas Cuarta | Añadir definiciones mínimas en design o endpoints dedicados Dapper |
| Columnas BI faltantes en BD desplegada | Script idempotente ALTER en deploy |

## Preguntas abiertas

- *(ninguna bloqueante — bot/IA explícitamente fuera)*
