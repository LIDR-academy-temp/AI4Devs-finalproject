[← design](design.md) | [index](_index.md) | [delta →](delta.md)

# impl.md — FE-NAV-ENT1-001

## Web

| Archivo | Cambio |
|---------|--------|
| `navCatalog.manifest.ts` | `admin-reportes`, `admin-bot`, `admin-ntf-aviso` → `implemented: false` |
| `appNavigation.ts` | `MANIFEST_HIDDEN_PATHS`, `filterNavItemsByManifest`, `filterNavGroupsForItems` |
| `useNavegacionMenus.ts` | Filtra ítems/grupos; `allowedPaths` desde ítems visibles |
| `appNavigation.manifestVisibility.test.ts` | TC-NAV-ENT1-01 |

## SQL (operación / inventario)

| Script | Propósito |
|--------|-----------|
| `SQL/20261030_sgr_menus_entrega1_off_nav_efg.sql` | `PerfilMenus.bVisible = 0` para rutas E/F/G (opcional si ya hecho a mano) |

## Verificación

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` Web | OK |
| Vitest `src/shared/navigation` + `menuToNav.test.ts` | OK (sesión 2026-10-30) |

## Auditoría

| Agente | Veredicto | Notas |
|--------|-----------|-------|
| auditor-sql | **APROBADO** | UPDATE acotado por rutas; sin soft-delete menús |
| auditor-codigo | **APROBADO** | Filtro único fuente manifest; sin duplicar listas hardcode |

## Hallazgo operativo

Ocultar solo en **Admin → Perfiles** o SQL **no** ocultaba sidebar hasta este fix Web (supplement re-inyectaba).
