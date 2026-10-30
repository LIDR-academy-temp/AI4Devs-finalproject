[← delta](delta.md) | [index](_index.md)

# release.md — FE-NAV-ENT1-001

## Piezas

1. **Web SPA** — manifest + `useNavegacionMenus`
2. **SQL** (opcional) — `20261030_sgr_menus_entrega1_off_nav_efg.sql`

## Orden

1. SQL (si BD aún muestra ítems en API)
2. Web — hard refresh (Ctrl+Shift+R) o reiniciar `npm run dev`

## Smoke

- Admin: sidebar **Gestión** sin Reportes / Integración BOT / Aviso general
- Admin: `/admin/reportes` → guard 403 (ruta no permitida)

## Rollback entrega 2

- Manifest `implemented: true` ×3
- Script inverso SQL o permisos menú en UI
