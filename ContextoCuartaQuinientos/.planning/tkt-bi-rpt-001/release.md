# release.md — TKT-BI-RPT-001: Reportes + BI web

> Bitácora de deploy PROD (2026-11-04) · Evidencia API: [EVIDENCIA_API_SMOKE_POSTDEPLOY.md](../../evidencia/20261104_API_SMOKE_POSTDEPLOY/EVIDENCIA_API_SMOKE_POSTDEPLOY.md)

## Piezas a desplegar (en orden)

| # | Pieza | Target | Script/Artefacto | Depende de |
|---|--------|--------|------------------|------------|
| 1 | Schema BI | `database:CuartaQuinientos` | `SQL/DB-010_bi_kpi_snapshots.sql` | DB-001 |
| 2 | Menús Reportes/Aviso | `database:CuartaQuinientos` | `SQL/20261104_sgr_menus_bi_rpt_reactivate.sql` | Perfil Administrador |
| 3 | Demo opcional BI | `database:CuartaQuinientos` | `SQL/DB-010_bi_snapshots_demo.sql` | #1 |
| 4 | API | `backend:cuartaquinientos-api` | deploy GraphApi | #1 |
| 5 | Web | `frontend:cuartaquinientos-web` | build SPA | #4 |

## Bitácora de despliegue

| Pieza | Ambiente | Fecha | Quién | Método | Smoke test | Resultado |
|---|---|---|---|---|---|---|
| 1 | PROD | 2026-11-04 | equipo | sqlcmd | suite SQL 8/8 | ✅ |
| 2 | PROD | 2026-11-04 | equipo | sqlcmd | TC-DB-ROJO-04 | ✅ |
| 4 | PROD | 2026-11-04 | equipo | Web Deploy | `Invoke-ApiSmokePostDeploy.ps1` | ✅ **16/16** |
| 5 | PROD | 2026-11-04 | equipo | Web Deploy | E2E `extra-bi-reportes` + reportes UI | ✅ (evidencia E2E Entrega 3) |
| 6 | PROD | 2026-11-09 | equipo | API Deploy | Hotfix `BiKpiSnapshotRepository` + TC-BIRPT-09 | ✅ PDF finanzas en UI · [evidencia](../../evidencia/20261109_HOTFIX_FINANZAS_EXPORT/EVIDENCIA_HOTFIX_BI-RPT-001_FINANZAS.md) |

## Verificación post-deploy

- [x] `GET /Reports/Bi/tendencias?meses=6` → 200 + array (admin JWT con `condominioId`) — TC-BIRPT-05
- [x] `POST /NTF/Notificaciones/aviso` → 201 — TC-BIRPT-08
- [x] `/admin/reportes` morosos + BI + export en Web — E2E + Vitest admin reportes

## Canario

| Sonda | Base | T+1h | T+1d | Umbral | Veredicto |
|---|---|---|---|---|---|
| — | — | — | — | — | No aplica |

## Rollback ejecutable

```sql
-- Menús (soft): ocultar PerfilMenus admin para rutas BI-RPT-001
-- BI: no DROP en prod con datos; revertir deploy API/Web primero
UPDATE sgr.PerfilMenus SET bVisible = 0
 WHERE MenuID IN (SELECT MenuID FROM sgr.Menus WHERE Ruta IN (N'/admin/reportes', N'/admin/notificaciones/aviso'));
```

## Incidencias durante el deploy

- Prod greenfield `bi`: requirió `DB-010` completo (no solo ALTER).
- Columna perfil `Nombre` vs `Perfil` en menú script (corregido en reactivate).
