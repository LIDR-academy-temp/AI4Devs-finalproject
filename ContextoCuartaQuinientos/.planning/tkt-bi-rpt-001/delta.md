# Delta: tkt-bi-rpt-001 — Reportes + BI web

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- Menú admin **Reportes** (`/admin/reportes`) y **Aviso general** (`/admin/notificaciones/aviso`) vía `20261104_sgr_menus_bi_rpt_reactivate.sql`.
- Tabla `bi.KpiSnapshots` (schema `bi`, índice único `CondominioID`+`Fecha`) y worker `BiSnapshotWorker` con snapshots diarios.
- `GET /Reports/Bi/tendencias?meses=1..24` y `GET /Reports/Bi/export?meses=&formato=pdf|xlsx` (admin + `condominioId` en JWT).
- Exports RPT: `GET /Reports/Reportes/FinanzasMes/export`, `GET /Reports/Reportes/TicketsPeriodo/export` con datos scoped por condominio.
- `POST /NTF/Notificaciones/aviso` filtra residentes del condominio del admin (JWT).
- SPA: `AdminReportesPage` (Morosos / Tendencias BI / Export RPT), `AdminAvisoNotificacionPage`, panel BI (`BiTrendsPanel` + Chart.js).
- Script opcional demo: `SQL/DB-010_bi_snapshots_demo.sql`.
- JWT admin sin casa: `condominioId` del primer condominio activo en login (`UserRepository`).
- Dapper: type handlers `DateOnly` en arranque API.
- Backfill mensual de snapshots al consultar tendencias; KPIs financieros/tickets cerrados = acumulado del mes hasta la fecha del snapshot.

## Comportamiento modificado

- (Antes): `bi.KpiSnapshots` incompleta / sin worker ni endpoint tendencias.
- (Después): pipeline snapshot + lectura histórica para gráficas.
- (Antes): Export RPT stub.
- (Después): PDF/Excel con cuotas, transacciones y tickets del período (condominio JWT).
- (Antes): Aviso NTF masivo sin filtro condominio en algunos paths; columnas usuario detectadas en transacción → error `bActivoUsuario`.
- (Después): aviso a residentes del condominio; columnas `sgr.Usuarios` cacheadas en ctor de `NotificacionRepository`.

## Comportamiento eliminado

- Ninguno (BOT/IA/`/bi` siguen fuera de alcance; no se reactivó menú bot).

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| `bi.KpiSnapshots` | Tabla | Creado/ampliado (DB-010) |
| `bi` | Schema | Creado |
| `sgr.Menus` / `sgr.PerfilMenus` | DML | Modificado (script reactivate) |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| `/Reports/Bi/tendencias` | GET | Creado |
| `/Reports/Bi/export` | GET | Creado |
| `/Reports/Reportes/FinanzasMes/export` | GET | Modificado |
| `/Reports/Reportes/TicketsPeriodo/export` | GET | Modificado |
| `/NTF/Notificaciones/aviso` | POST | Modificado (scope condominio) |
| `/Reports/Reportes/Morosos` | GET | Reutilizado (sin cambio contrato) |

## Ronda post-revisión (2026-11-04, cierre)

- Fix UX Reportes: selección morosos operativa; tabs con `cq-admin-tabs` y cards.
- Rediseño Tendencias BI: KPI strip, toolbar 3m/6m/12m, gráficas en cards, normalización JSON.

## Hotfix (2026-11-09, post-archivo)

- **Modificado:** `BiKpiSnapshotRepository` — nombre de residente en export Finanzas (cuotas/transacciones) vía `SqlSchemaCompat.UsuarioColumns` (prod `Nombre` vs legado `NombreUsuario`).
- **Modificado:** `Invoke-ApiSmokePostDeploy.ps1` — caso **TC-BIRPT-09** `GET /Reports/Reportes/FinanzasMes/export?formato=pdf`.
- **Sin cambio de contrato API** ni SQL DDL.

## Para el reviewer

- **Qué se hizo**: Reportes admin con morosos, exports RPT/BI, tendencias Chart.js, aviso NTF y menús SGR.
- **Por qué**: [[NAV-ROOT-001]] fases E+G sin bot/IA ([[BI-RPT-001]]).
- **Riesgo**: medio — DDL `bi`, menús prod, JWT `condominioId`; multi-condominio admin usa condominio de menor ID si no tiene casa.
- **Qué probar**: SQL 7/7; login admin → `/admin/reportes` → Actualizar BI; export PDF; aviso NTF; morosos checks; `dotnet test` BI; Vitest nav/reportes.
- **Rollback**: soft-delete menús insertados; `DROP` índice/tabla `bi.KpiSnapshots` solo si no hay datos productivos; revert API/Web por commit.

## Aprendizajes

- No llamar `SqlSchemaCompat` dentro de transacción activa: cachear columnas en ctor del repositorio.
- Cualquier SQL nuevo sobre `sgr.Usuarios` debe usar `UsuarioColumns` (mismo patrón que `MorososRepository`); no asumir `NombreUsuario` en prod.
- Admin sin `CasaOcupante` necesita `condominioId` en JWT explícito (no fallback hardcoded).
- Dapper requiere handler `DateOnly` para `bi.KpiSnapshots`.
- Tendencias BI necesitan múltiples fechas snapshot (backfill o demo SQL), no solo el día actual.

## Decisiones (ADR)

| Fecha | Decisión | Alternativa descartada | Motivo |
|-------|----------|------------------------|--------|
| 2026-11-04 | KPI mes = acumulado MTD en fecha snapshot | Solo día calendario | Gráficas útiles con pocos días de worker |
| 2026-11-04 | `condominioId` admin = COALESCE(casa, TOP 1 condominio) | Fallback `condominioId=1` | Seguridad + demo single-tenant |
