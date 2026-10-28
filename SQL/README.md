# SQL — fuente de verdad

## Archivo único

| Archivo | Contenido |
|---------|-----------|
| **`cuartaquinientos_schema.sql`** | **Todo el SQL del proyecto:** tablas, vistas `vs*`, extensiones (`bot`, `ia`, `bi`, `wms`). |

> **Sin datos:** el script es solo estructura (DDL). No contiene `INSERT`/`UPDATE`; el proyecto está en construcción y la carga de catálogos se define en Entrega 2.

### Despliegue

```powershell
sqlcmd -S localhost -E -d master -Q "IF DB_ID('CuartaQuinientos') IS NULL CREATE DATABASE CuartaQuinientos;"
sqlcmd -S localhost -E -d CuartaQuinientos -b -I -i SQL/cuartaquinientos_schema.sql
sqlcmd -S localhost -E -d CuartaQuinientos -b -I -i SQL/DB-001_alineacion_modelo.sql
sqlcmd -S localhost -E -d CuartaQuinientos -b -I -i SQL/pruebas/DB-001_PruebasIntegracion.sql
$hash = dotnet run -c Release --project SQL/tools/hash_password -- "TuPasswordSeguro"
sqlcmd -S localhost -E -d CuartaQuinientos -b -I -i SQL/DB-002_seeds_catalogos.sql -v AdminCorreo="admin@local" AdminPasswordHash="$hash" Demo=0
```

(Ajusta servidor y autenticación. Helper: `SQL/tools/Invoke-SqlScript.ps1`. Hash BCrypt: `SQL/tools/hash_password`.)

> **Plan de corrección:** ticket **DB-000** — idempotencia (`IF OBJECT_ID` / `CREATE OR ALTER`) y suite `SQL/pruebas/DB-000_PruebasIntegracion.sql` (ver `tkt-db-000/`).

### Scripts previstos (Entrega 2)

| Orden | Script | Ticket | Contenido |
|------:|--------|--------|-----------|
| 1 | `cuartaquinientos_schema.sql` | DB-000 | Estructura base idempotente |
| 2 | `DB-001_alineacion_modelo.sql` | DB-001 | Renombres y columnas del diccionario lógico ↔ físico (`readme.md` §3.2, ADR-008) |
| 3 | `DB-002_seeds_catalogos.sql` | DB-002 | Catálogos + administrador inicial (`-v AdminCorreo=… AdminPasswordHash=…`; `Demo=1` opcional) |
| … | `DB-003` … `DB-006` | varios | Seeds dominio (anm, enc, arc, …) |
| 7 | `DB-007_sgr_menus_seed.sql` | **DB-006 (SGR)** / [[SGR-FE-001]] | Menús SPA + `PerfilMenus` (post DB-002) |

```powershell
sqlcmd -S localhost -E -d CuartaQuinientos -b -I -i SQL/DB-007_sgr_menus_seed.sql
```

> Los nombres de columnas de este script **todavía no** coinciden con el readme (p. ej. `CorreoUsuario`, `TipoNotiicfacion`); el contrato es el readme y DB-001 los alinea antes de escribir código.

### Diseño documentado

Entrega 1: modelo en **`readme.md` §3**. Este `.sql` es la implementación física (Entrega 2+).
