[← index](_index.md) | [← design](design.md)

# Impl: DB-000 — estado

## Hecho en repo (verificado 2026-10-16)

- `SQL/cuartaquinientos_schema.sql`: sin `USE [db…]`, guarda `DB_NAME()` sistema, esquemas `IF SCHEMA_ID`, `CREATE OR ALTER VIEW` (p. ej. `usr.vsMascotas` una vez).
- `SQL/README.md`, `SQL/ORDEN_DESPLIEGUE.md`.

## Cierre 2026-10-16

- 73 tablas con `IF OBJECT_ID … IS NULL` (`SQL/tools/wrap_create_tables.py`).
- Guarda BD + `SET NOEXEC ON`.
- `SQL/pruebas/DB-000_PruebasIntegracion.sql`.

## Pendiente

- Ejecutar suite en BD test (MCP/sqlcmd).
