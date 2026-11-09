# 20261104_BI-RPT-001 — Inventario de cambios

## SQL (DDL/DML)

- `bi.KpiSnapshots` — **`DB-010_bi_kpi_snapshots.sql`** (schema `bi` + tabla + índice único; columnas BI-RPT-001). **No** confundir con `DB-009_fix_views_y_tablas.sql`.
- `sgr.PerfilMenus` — `20261104_sgr_menus_bi_rpt_reactivate.sql` (reportes + aviso visibles; bot sigue oculto).

## API

- `GET Reports/Bi/tendencias` — NUEVO
- `GET Reports/Bi/export` — NUEVO
- `GET Reports/Reportes/FinanzasMes/export` — NUEVO (PDF/XLSX con cuotas y transacciones del condominio JWT)
- `GET Reports/Reportes/TicketsPeriodo/export` — NUEVO (PDF/XLSX con tickets del periodo, scoped condominio)
- `POST NTF/Notificaciones/aviso` — existente (UI admin)

## Frontend

- Rutas `/admin/reportes`, `/admin/notificaciones/aviso`
- Nav: `admin-reportes`, `admin-ntf-aviso` implementados

## Orden de despliegue

1. `SQL/DB-010_bi_kpi_snapshots.sql`
2. `SQL/20261104_sgr_menus_bi_rpt_reactivate.sql` (crea menús BI si faltan + PerfilMenus admin visible; BOT sigue oculto)
3. GraphApi (worker + controllers)
4. Web SPA

## Notas FE-NAV-ENT1

Reactivación parcial: solo entradas reportes/aviso; `admin-bot` sigue `implemented: false`.
