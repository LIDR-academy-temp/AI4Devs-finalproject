# 20261029 — PROD-ADMIN-001 — Inventario de cambios

Ticket: [ContextoCuartaQuinientos/.planning/tkt-prod-admin-001/_index.md](../ContextoCuartaQuinientos/.planning/tkt-prod-admin-001/_index.md)

## SQL Objects

- `wms.*` — esquema almacén — `20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql` (incluye DB-005)
- `arc.vsArchivos` — columna `FechaCreacion` — mismo script / `DB-006_arc_vsarchivos_fechacreacion.sql`

## APIs REST

- POST PUT DELETE `/ANM/TiposAnuncio`
- POST PUT DELETE `/SGR/Perfiles/.../admin`
- GET `/ENC/Encuestas/{id}/resultados` — fix agregación
- POST `/USR/Mascotas/admin`, `/USR/Automoviles/admin` — 422 en FK

## Orden despliegue

1. SQL `APLICAR_FALTANTES` (+ VALIDAR_GAPS)
2. GraphApi
3. Web SPA
