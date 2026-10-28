# DB-006 (SGR) — Seed menús SPA

| Estado | **LISTO** (script) |
| Script | `SQL/DB-007_sgr_menus_seed.sql` (numeración física; `DB-006_arc_*` ya ocupado) |
| Habilita | CA-1/CA-2 [[SGR-FE-001]] |

## Ejecución

```powershell
sqlcmd -S localhost -E -d CuartaQuinientos -i SQL/DB-007_sgr_menus_seed.sql
```

## Verificado local (2026-10-27)

- 32 nodos `sgr.Menus`
- `PerfilMenus`: Administrador 19, Residente 14
- Residente **sin** `/admin/menus` ni `/admin/perfiles`
