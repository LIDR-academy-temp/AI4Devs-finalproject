# Delta — PROD-ADMIN-001

> [← index](_index.md) | [← impl](impl.md)

## Comportamiento agregado

- CRUD admin JWT: tipos de anuncio (`POST/PUT/DELETE /ANM/TiposAnuncio`).
- CRUD admin JWT: perfiles (`POST/PUT/DELETE /SGR/Perfiles/.../admin`).
- UI: pestañas en archivos y anuncios; acciones CRUD en perfiles.

## Comportamiento modificado

- Prod BD alineada: esquema `wms`, columna `FechaCreacion` en `arc.vsArchivos`, vistas usr vía DB-009.
- Resultados encuesta admin: agregación sin 500 por GROUP BY/casts.
- Altas mascotas/vehículos: FK inválida → 422 (no 500).

## Objetos SQL (deploy)

| Objeto | Acción |
|--------|--------|
| wms.* | Creado vía DB-005 / APLICAR_FALTANTES |
| arc.vsArchivos | Vista con FechaCreacion (DB-006) |

## Riesgos residuales

- Redirect `/admin/archivos/tipos` → tab (Should; bookmark legacy puede requerir `?tab=tipos`).
- Checklist automatizado pre-deploy (Could) no implementado.
