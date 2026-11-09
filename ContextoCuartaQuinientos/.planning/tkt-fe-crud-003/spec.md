[← index](_index.md) | [design →](design.md)

# spec.md — FE-CRUD-003: CRUD — Registro (admin)

## Objetivo

Migrar las cuatro pantallas de **registro operativo** (visitas, vehículos, mascotas, almacén) al patrón admin canónico post [[FE-PAT-002]] ([PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md)), reemplazando Tailwind suelto, modales centrados y `alert`/`prompt` por split panel, tablas filtrables y `ConfirmDialog`.

## Pantallas

| Página | Ruta | API principal |
|--------|------|---------------|
| AdminVisitasPage | `/admin/visitas` | `GET/POST/PATCH /VTS/Visitas` |
| AdminVehiculosPage | `/admin/vehiculos` | `GET /USR/Automoviles/padron`, `buscar`, `admin` CRUD |
| AdminMascotasPage | `/admin/mascotas` | `GET /USR/Mascotas/padron` |
| AdminAlmacenPage | `/admin/almacen` | `WMS/Articulos`, `WMS/Prestamos` |

## Gaps actuales (repo)

| Página | Hoy | Debe quedar |
|--------|-----|-------------|
| Visitas | Tailwind + modal; sin `usuarioVisitadoId`; salida con `alert` | Split + Zod + filtros |
| Vehículos | Solo `buscar`; sin CRUD admin en API | **Nuevos endpoints admin** + split CRUD (patrón Casas) |
| Mascotas | Tabla Tailwind simple | `AdminFilterableTable` + estados carga/error/vacío |
| Almacén | Tabs + modales Tailwind | Tabs Bootstrap + split CRUD |

## Patrón obligatorio

[PATRON_CRUD_ADMIN.md](../PATRON_CRUD_ADMIN.md) en Visitas, **Vehículos** y Almacén. **Mascotas:** lectura admin (padrón).

## Must

- Visitas: split panel registrar + tabla filtrable + acciones entrada/salida.
- Vehículos: tabla filtrable (placas) + panel alta/edición/baja admin (`ConfirmDialog`).
- Mascotas: tabla filtrable; sin `window.prompt`.
- Almacén: artículos y préstamos con stack Casas (dos tabs en una ruta).

## Invariantes

- INV-1: Sin `window.prompt` / `window.confirm` / `alert` para flujos de negocio.
- INV-2: Contenedor `cq-admin-page` + imports `bootstrap-pantone.css` / `cq-admin.css` en cada página migrada.
- INV-3: Endpoints **residente** (`POST/PUT/DELETE` sin sufijo `admin`) sin cambio de semántica; rutas **nuevas** solo bajo `SoloAdministrador`.
- INV-4: `usuarioId` en alta admin vehículo = propietario del vehículo (no el admin JWT).

## Criterios de aceptación

| ID | Criterio |
|----|----------|
| CA-1 | Las 4 rutas pasan checklist DoD en `PATRON_CRUD_ADMIN.md`. |
| CA-2 | Visitas: `POST /VTS/Visitas` con `usuarioVisitadoId` > 0; filtros fecha/casa en toolbar. |
| CA-3 | Visitas: `PATCH …/salida` sin `alert`. |
| CA-4 | Vehículos: listado (`padron` o post-búsqueda) en `AdminFilterableTable`; panel crear/editar; `DELETE` con `ConfirmDialog`. |
| CA-5 | API: `POST/PUT/DELETE /USR/Automoviles/admin…` solo administrador; placas duplicadas → 409; residente sigue usando rutas actuales. |
| CA-6 | Mascotas: padrón con carga, error, vacío y filtros columna. |
| CA-7 | Almacén: inventario split + préstamos sin modales Tailwind sueltos. |
| CA-8 | `dotnet test GraphApi.Tests` (casos vehículos admin) + `npm test` / `tsc` / `vite build` en verde. |

## Depende de

- [[FE-PAT-002]] · [[FE-CRUD-001]]

DoD: `PATRON_CRUD_ADMIN.md`.
