# specs/almacen.md — Almacén / WMS (source of truth SDD)
> Contexto de dominio SDD-Nice; se lee en /definir antes de spec.md. Solo lo verificado; lo nuevo (delta).

## Propósito
Inventario y préstamo de herramientas y materiales del fraccionamiento (control de existencias y salidas al personal de mantenimiento). **Dominio delta completo**: no existe en la base de datos de referencia; se modela de cero en el esquema nuevo `wms`. En la referencia solo hay un stub `WMS/Inventory/InventoryDateController` sin tablas SQL — se descarta y se redefine limpiamente.

## Objetos del dominio (tablas + vistas reales)
Esquema **nuevo `wms` (delta completo)**:
- `wms.Articulos (ArticuloID, Nombre, CategoriaID, Stock, StockMinimo, Ubicacion)` — (delta) artículo de inventario.
- `wms.Prestamos (PrestamoID, ArticuloID FK, UsuarioID FK, Cantidad, FechaPrestamo, FechaDevolucion, Estado)` — (delta) préstamo/devolución de un artículo a un usuario/trabajador.
- Todas comparten el patrón de auditoría del sistema (`Creado`, `Modificado`, `UsuarioCreacionID`, `UsuarioModificacionID`, `FechaCreacion`, `FechaModificacion`) + **soft delete** `bEliminado` (delta, se crean con el patrón estándar).
- Catálogo de categorías `wms.CategoriasArticulo` `(asumido)` para resolver `CategoriaID`.
- Vista `wms.vsArticulos` / `wms.vsPrestamos` `(asumido)` para listados (no existen aún; se crean si se sigue la convención `vs*`).

## Catálogos y estados
- Estado de préstamo `wms.Prestamos.Estado`: **PRESTADO → DEVUELTO** (valores del readme; catálogo o cadena controlada `(asumido)`).
- Categoría de artículo: `CategoriaID` FK a catálogo `wms.CategoriasArticulo` `(asumido)`.

## Invariantes (INV-x)
- **INV-1**: `wms.Articulos.Stock >= 0` en todo momento; un préstamo no puede dejar el stock negativo.
- **INV-2**: al crear préstamo (`Estado = PRESTADO`) el stock disponible baja por `Cantidad`; al registrar devolución (`Estado = DEVUELTO`) el stock se restablece.
- **INV-3**: artículo bajo mínimo cuando `Stock < StockMinimo` (se destaca en el inventario).
- **INV-4**: borrado lógico con `bEliminado`; nunca DELETE físico.
- **INV-5**: alta/ajuste de artículos y registro de préstamos restringido a Administrador (`bAdministrador = 1`); el trabajador consulta/solicita vía bot.
- **INV-6**: `wms.Prestamos.UsuarioID` referencia un `sgr.Usuarios` vivo; `ArticuloID` un `wms.Articulos` vivo.

## Historias del dominio (HU-XXX [M/S/C] + 1 línea)
- **HU-WMS-01 [C]** — Consultar inventario (Admin): ver artículos con stock actual, stock mínimo y ubicación (`wms.Articulos`); los que están bajo mínimo se destacan.
- **HU-WMS-02 [C]** — Alta y ajuste de artículos (Admin): registrar artículos (nombre, categoría, stock, stock mínimo, ubicación) y ajustar existencias, con auditoría.
- **HU-WMS-03 [C]** — Préstamo y devolución de herramienta: prestar a un trabajador (crea `wms.Prestamos` en PRESTADO, baja stock) y registrar devolución (pasa a DEVUELTO, restablece stock); consultable/solicitable desde «C500 Asiste».

## Endpoints (/{Dominio}/{Controller})
Base `/WMS` (nuevo; CRUD estándar; JWT + validación de perfil):
- `/WMS/Articulos` — inventario (GET lista, GET `/{id}`, POST alta, PUT ajuste, DELETE lógico).
- `/WMS/Prestamos` — préstamos (POST prestar, PUT/PATCH devolver, GET lista/`{id}`).

Nota: en la referencia solo existe el stub `WMS/Inventory/InventoryDateController` (sin tablas); los controllers `Articulos`/`Prestamos` son delta a construir.

## Reutilización / objetos existentes (escalera)
1. **Reutilizar patrón**: auditoría + `bEliminado`, acceso Dapper + vistas `vs*` + servicios C#, sin stored procedures (igual que el resto del sistema).
2. **Reutilizar**: `sgr.Usuarios` como sujeto del préstamo (trabajador); autorización por perfil vía menús dinámicos `sgr.*`.
3. **Reutilizar**: el bot «C500 Asiste» y sus endpoints de dominio para consulta/solicitud (no duplica lógica).
4. Lo demás es nuevo: no hay tablas ni vistas `wms` en la referencia.

## Deltas del proyecto (nuevo)
- (delta) **Esquema completo `wms`**: `wms.Articulos`, `wms.Prestamos` (+ catálogo de categorías y vistas `vs*` asumidos). Todo el dominio es delta.
- (delta) Endpoints `/WMS/Articulos` y `/WMS/Prestamos`.
- (delta) Integración con el bot: el trabajador consulta sus préstamos y solicita herramienta desde el chat.

## Notas
- Dominio modelado **de cero**: no existe en la referencia (solo un stub sin tablas). Marcar todo `wms.*` como (delta).
- Sin stored procedures: Dapper + servicios C# + (a crear) vistas `vs*`.
- Nombres en español, `bEliminado` para soft delete, siguiendo la convención real del proyecto aunque el esquema sea nuevo.
- SPA admin: `AdminAlmacenPage` (`/admin/almacen`) — tabs Bootstrap + split + `ConfirmDialog`; tablas sin `AdminFilterableTable` en v1 ([[FE-CRUD-003]], deuda CA-1).

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|---------------|--------|
| 2026-10-26 | [[FE-CRUD-003]] | UI admin almacén migrada desde modales Tailwind (parcial vs DoD tabla filtrable) |
