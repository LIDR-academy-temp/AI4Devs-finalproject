# TKT-PROD-ADMIN-001 — APIs REST

| Método | Ruta | Rol | Tipo |
|--------|------|-----|------|
| GET | /ARC/Archivos | Admin | (existente; requiere BD CA-1) |
| GET | /ENC/Encuestas/{id}/resultados | Admin | CAMBIO |
| POST | /WMS/Articulos | Admin | (existente; requiere WMS) |
| GET | /ANM/TiposAnuncio | JWT | (existente) |
| POST | /ANM/TiposAnuncio | Admin | NUEVO |
| PUT | /ANM/TiposAnuncio/{id} | Admin | NUEVO |
| DELETE | /ANM/TiposAnuncio/{id} | Admin | NUEVO |
| GET | /SGR/Perfiles/admin | Admin | (existente) |
| POST | /SGR/Perfiles/admin | Admin | NUEVO |
| PUT | /SGR/Perfiles/{id}/admin | Admin | NUEVO |
| DELETE | /SGR/Perfiles/{id}/admin | Admin | NUEVO |
| PUT | /SGR/Perfiles/{id}/permisos-menus | Admin | sin regresión CA-R2 |
| POST | /USR/Automoviles/admin | Admin | CAMBIO (422 FK) |
| POST | /USR/Mascotas/admin | Admin | CAMBIO (422 FK) |
