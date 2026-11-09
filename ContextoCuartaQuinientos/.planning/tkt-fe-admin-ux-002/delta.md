[← index](_index.md) | [← impl](impl.md)

# Delta — FE-ADMIN-UX-002

## ADDED

### API

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/SGR/Menus/admin/{menuId}/permisos-perfiles` | Administrador |
| PUT | `/SGR/Menus/admin/{menuId}/permisos-perfiles` | Administrador |

### UI Web

- Panel **Perfiles con acceso** en `/admin/menus` (`MenuPerfilPermisosPanel`).
- Árbol admin menús con búsqueda, iconos, acción submenú.
- Tablas filtrables: finanzas **Cuotas residente**, **Movimientos**.
- Tests: `menuAdminFormUtils.test.ts`, `anunciosAdminSchemas.test.ts`.

## MODIFIED

- **Regla vigencia anuncios:** listado residente usa `CAST(VigenteHasta AS date) >= CAST(SYSUTCDATETIME() AS date)`.
- **Form admin anuncios:** `vigenteHastaToIso` envía fin de día local para `type=date`.
- Documentación consumo: [TKT-SGR-BE-030-APIS.md](../tkt-sgr-be-030/TKT-SGR-BE-030-APIS.md) §2.5.

## REMOVED

- N/A

## Objetos SQL

| Objeto | Cambio |
|--------|--------|
| `sgr.PerfilMenus` | DML vía API (sin script repo) |
| `anm.Anuncios` | Sin DDL; lectura vía vista existente |

## Para el reviewer

- Probar flujo: admin publica anuncio vigente hoy → residente `/anuncios`.
- Probar: admin menú → asignar Residente → sidebar residente tras refresh nav.
