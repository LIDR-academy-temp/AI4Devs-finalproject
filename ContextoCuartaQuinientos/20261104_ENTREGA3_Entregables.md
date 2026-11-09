# 20261104 — Entrega 3 (final-project-AFS) — Entregables

## SQL

- `bi.KpiSnapshots` — DDL `SQL/DB-010_bi_kpi_snapshots.sql`
- `sgr.PerfilMenus` / menús — `SQL/20261104_sgr_menus_bi_rpt_reactivate.sql`
- Demo opcional — `SQL/DB-010_bi_snapshots_demo.sql`

## API (NUEVO / CAMBIO BI-RPT-001)

- `GET Reports/Bi/tendencias`
- `GET Reports/Bi/export`
- `GET Reports/Reportes/FinanzasMes/export`
- `GET Reports/Reportes/TicketsPeriodo/export`
- `POST NTF/Notificaciones/aviso` (UI admin scoped)

## Frontend

- `/admin/reportes`, `/admin/notificaciones/aviso`
- Gates: `entrega3ModulosTdd.test.ts`, `ModulosTddCoverageTests.cs`

## Pruebas y evidencia

- Runner: `scripts/Invoke-Entrega3Tests.ps1` (Vitest 325 + xUnit 188 filtrado)
- E2E: `scripts/Invoke-E2ESmoke.ps1` — [`EVIDENCIA_E2E_ENTREGA3.md`](evidencia/20261104_E2E_CRITICO/EVIDENCIA_E2E_ENTREGA3.md)
- API prod: [`EVIDENCIA_API_SMOKE_POSTDEPLOY.md`](evidencia/20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md)
- Matriz: [`MATRIZ_TDD_ENTREGA3.md`](MATRIZ_TDD_ENTREGA3.md)
- IA fase 3: [`prompts.md`](../prompts.md#entrega-3--cierre-tests-e2e-y-entrega-final-noviembre-2026)

## Orden de despliegue

Ver [`SQL/20261104_BI-RPT-001_INVENTARIO_CAMBIOS.md`](../SQL/20261104_BI-RPT-001_INVENTARIO_CAMBIOS.md) y `tkt-bi-rpt-001/release.md`.
