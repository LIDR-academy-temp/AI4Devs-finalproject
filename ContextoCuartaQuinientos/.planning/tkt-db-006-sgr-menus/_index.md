# DB-006 (SGR) — Seed menús SPA

| Estado | **ARCHIVADO** |
| Script | `SQL/DB-007_sgr_menus_seed.sql` (numeración física; `DB-006_arc_*` ya ocupado) |
| Habilita | CA-1/CA-2 [[SGR-FE-001]] |

## Ejecución

```powershell
sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/DB-007_sgr_menus_seed.sql
```

## Verificado

| Ambiente | Fecha | Notas |
|----------|-------|--------|
| Local | 2026-10-27 | 32 nodos `sgr.Menus`; Admin 19 / Residente 14 ítems PerfilMenus |
| Prod | 2026-10-30 | Menús operativos (incl. `/visitas/pases`) — [PULIR_01](../../PULIR_01_PROD_REPO.md) §1.1 |

## Log

| Fecha | Nota |
|-------|------|
| 2026-10-27 | Script LISTO; verificado local |
| 2026-10-30 | **ARCHIVADO** — alineado cierre entrega 2; prod OK |
