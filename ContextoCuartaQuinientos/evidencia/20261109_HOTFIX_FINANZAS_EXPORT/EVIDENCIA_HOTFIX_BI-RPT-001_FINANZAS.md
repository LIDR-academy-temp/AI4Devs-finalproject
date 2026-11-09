# Hotfix BI-RPT-001 — Export Finanzas mes (PDF/XLSX)

| Campo | Valor |
|-------|--------|
| Fecha | 2026-11-09 |
| Ticket | [[BI-RPT-001]] |
| Síntoma | HTTP 500 en `GET /Reports/Reportes/FinanzasMes/export?formato=pdf\|xlsx` (prod) |
| UI | `/admin/reportes` → Exportar RPT → Descargar PDF |

## Diagnóstico

- Prod: **500** FinanzasMes (pdf y xlsx); **200** `TicketsPeriodo` y **200** `/Reports/Bi/export` (mismo admin JWT). Sigue **500** tras publish si solo se desplegó Web.
- SQL CQ500 (1): `Invalid column name 'NombreUsuario'` → prod usa `sgr.Usuarios.Nombre`.
- SQL CQ500 (2): `Invalid column name 'Cuenta'` → prod usa `fnz.Cuentas.Nombre` (patrón `TransaccionesFnzRepository`).

## Solución

- `BiKpiSnapshotRepository`: `UsuarioColumns` + columna cuenta `Nombre`|`Cuenta` en ctor; alias `AS NombreUsuario` / `AS Cuenta`.
- **Publicar:** proyecto **GraphApi** en `apicuartaquinientos.runasp.net` (no basta el SPA).
- Smoke: **TC-BIRPT-09** en `scripts/Invoke-ApiSmokePostDeploy.ps1`.

## Verificación

| Paso | Estado |
|------|--------|
| MCP CQ500 — SQL corregido | OK |
| `dotnet build` GraphApi | OK |
| Prod tras redeploy + TC-BIRPT-09 | **OK** (usuario confirma descarga PDF UI 2026-11-09) |

## SDD

- [impl.md § Hotfix](../../.planning/tkt-bi-rpt-001/impl.md)
- [delta.md § Hotfix](../../.planning/tkt-bi-rpt-001/delta.md)
- [specs/reportes-bi.md](../../specs/reportes-bi.md) changelog 2026-11-09
