# release.md — TKT-BI-RPT-001: Reportes + BI web

> Esqueleto `/completar` · Llenar al desplegar TEST/PROD

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
| 1 | PROD | 2026-11-04 | equipo | sqlcmd | suite 7/7 | ✅ (usuario) |
| 4 | local | | | dotnet run | `.http` tendencias | pendiente |

## Verificación post-deploy

- [ ] `GET /Reports/Bi/tendencias?meses=6` → 200 + array (admin JWT con `condominioId`).
- [ ] `POST /NTF/Notificaciones/aviso` → 201.
- [ ] `/admin/reportes` morosos + BI + export en Web.

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
