[← spec](spec.md) | [← index](_index.md)

# design.md — SGR-FE-001

## Mapeo rutas SPA ↔ `sgr.Menus.Ruta`

| Menú BD (ejemplo) | Ruta React |
|-------------------|------------|
| `Gestion/Casas` | `/admin/casas` |
| `Admin/Menus` | `/admin/menus` |

Seed DB-006 debe alinear con `App.tsx`.

## Componentes

- Contenedor `.cq-admin-page` + imports `cq-admin.css` en `/admin/menus` y `/admin/perfiles`.
- `MenuTreeEditor` dentro de `AdminListToolbar` + card (árbol no requiere `AdminFilterableTable` salvo lista plana de menús).
- `PerfilPermisosPanel` (dual list) — patrón Web_diseño `PerfilPermisos.cshtml`; confirmaciones con `ConfirmDialog`.
- Listados SGR con filas: mismo stack que [PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md).

## Orden

1. Hook + integración sidebar  
2. Guard rutas  
3. Página Menus  
4. Página Perfiles + permisos  
5. Quitar fallback estático en prod (env)
