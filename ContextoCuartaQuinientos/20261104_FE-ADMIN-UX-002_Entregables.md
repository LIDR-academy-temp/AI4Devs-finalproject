# Entregables — FE-ADMIN-UX-002 (2026-11-04)

## SQL Objects

- Sin objetos DDL nuevos. Mutación `sgr.PerfilMenus` vía API.

## DTOs / tipos

| Archivo | Tipo |
|---------|------|
| `GraphApi/Models/SGR/Navegacion/CuartaNavegacionDtos.cs` | `MenuPerfilPermisoDto`, `MenuPerfilAsignacionRequest` |
| `Web/src/features/navegacion/types.ts` | `MenuPerfilPermiso` |

## APIs

| Método | Ruta | Tipo |
|--------|------|------|
| GET | `/SGR/Menus/admin/{menuId}/permisos-perfiles` | NUEVO |
| PUT | `/SGR/Menus/admin/{menuId}/permisos-perfiles` | NUEVO |

## UI

| Ruta | Cambio |
|------|--------|
| `/admin/menus` | CAMBIO — split panel + permisos perfiles |
| `/admin/finanzas` | CAMBIO — tablas filtrables cuotas/movimientos |
| `/admin/anuncios` | CAMBIO — vigencia fin de día |
| `/anuncios` | CAMBIO — listado tras fix backend vigencia |

## SDD

- Hub: [.planning/tkt-fe-admin-ux-002/_index.md](.planning/tkt-fe-admin-ux-002/_index.md)
