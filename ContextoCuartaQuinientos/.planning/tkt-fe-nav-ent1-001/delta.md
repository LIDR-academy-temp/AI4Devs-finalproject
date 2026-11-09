[← impl](impl.md) | [index](_index.md)

# Delta: FE-NAV-ENT1-001

## Comportamiento modificado

- **(Antes)** Ítems NAV E/F/G visibles si estaban en manifest `implemented: true`, aunque `PerfilMenus.bVisible = 0` (supplement los re-añadía).
- **(Después)** Manifest marca E/F/G como no implementados para entrega 1; hook de navegación filtra rutas con `implemented: false`; `allowedPaths` coherente con sidebar.

## Comportamiento agregado

- Helpers `filterNavItemsByManifest` / `filterNavGroupsForItems` en `appNavigation.ts`.
- Script SQL documentado para alinear BD: `20261030_sgr_menus_entrega1_off_nav_efg.sql`.

## Comportamiento eliminado

- (ninguno en BD; menús siguen en `sgr.Menus` y DB-008)

## Rutas afectadas (UI)

| Ruta | Clave manifest | Fase NAV-ROOT |
|------|----------------|---------------|
| `/admin/reportes` | admin-reportes | E |
| `/admin/integraciones/bot` | admin-bot | F |
| `/admin/notificaciones/aviso` | admin-ntf-aviso | G |

## Para el reviewer

- **Qué**: Cierre alcance entrega 1 vs epic NAV E–G.
- **Probar**: Login admin → sidebar sin tres ítems; URL directa → 403 guard (si ruta no permitida).
- **Rollback**: Revert Web + manifest `implemented: true` + SQL visible ON.
