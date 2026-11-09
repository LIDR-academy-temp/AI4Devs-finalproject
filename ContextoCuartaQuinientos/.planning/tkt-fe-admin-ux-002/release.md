[← index](_index.md)

# Release — FE-ADMIN-UX-002

## Piezas

| Capa | Qué desplegar |
|------|----------------|
| GraphApi | Binario con `CuartaAnunciosRepository`, `CuartaNavegacion*` menús permisos |
| Web | Build Vite (`AdminMenusPage`, finanzas tablas, anuncios vigencia) |

## Orden

1. GraphApi (reinicio obligatorio)
2. Web estáticos

## Rollback

Revertir commit Web + GraphApi; datos `PerfilMenus` / `Anuncios` no requieren rollback SQL salvo permisos editados a mano.

## Canario

Admin: `/admin/menus`, `/admin/finanzas`, publicar anuncio vigente hoy → residente `/anuncios`.
