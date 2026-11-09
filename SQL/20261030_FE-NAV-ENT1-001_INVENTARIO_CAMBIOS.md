# 20261030 — FE-NAV-ENT1-001 — Inventario de cambios

Ticket: [ContextoCuartaQuinientos/.planning/tkt-fe-nav-ent1-001/_index.md](../ContextoCuartaQuinientos/.planning/tkt-fe-nav-ent1-001/_index.md)

## SQL Objects

- `sgr.PerfilMenus` — `bVisible = 0` para rutas E/F/G — `20261030_sgr_menus_entrega1_off_nav_efg.sql`

## DML (script completo)

Ver archivo `SQL/20261030_sgr_menus_entrega1_off_nav_efg.sql` (UPDATE por rutas; idempotente).

## Frontend (Web)

- `navCatalog.manifest.ts` — `implemented: false` (admin-reportes, admin-bot, admin-ntf-aviso)
- `appNavigation.ts` — filtros manifest
- `useNavegacionMenus.ts` — sidebar + allowedPaths

## Orden despliegue

1. SQL (opcional si ya ocultaste a mano en PerfilMenus)
2. Web SPA — refresh sesión admin

## Reversión entrega 2

- Web: `implemented: true` en las tres claves del manifest
- SQL: `UPDATE … SET bVisible = 1` con las mismas rutas (o UI Admin → Perfiles)
