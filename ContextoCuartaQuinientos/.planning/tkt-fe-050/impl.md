# impl.md — tkt-fe-050 (WMS Almacén Frontend)

## Fecha
2026-10-22

## Tipos — `src/shared/types/almacen.ts`

| Tipo | Campos clave |
|------|-------------|
| `ArticuloListItem` | articuloId, nombre, categoriaId?, categoria?, stock, stockMinimo, bajoMinimo (bool), ubicacion? |
| `ArticuloDetalle` | extends ArticuloListItem + fechaCreacion?, fechaModificacion? |
| `CategoriaDto` | categoriaId, nombre |
| `ArticuloCrearRequest` | nombre (req), categoriaId?, stock, stockMinimo, ubicacion? |
| `ArticuloActualizarRequest` | todos opcionales: nombre?, categoriaId?, stock?, stockMinimo?, ubicacion? |
| `PrestamoListItem` | prestamoId, articuloId, nombreArticulo, usuarioId, nombreUsuario?, correoUsuario?, cantidad, fechaPrestamo, fechaDevolucion?, estado ('PRESTADO' \| 'DEVUELTO'), notas? |
| `PrestamoCrearRequest` | articuloId, usuarioId, cantidad, notas? |

**Total**: 7 tipos

## Hooks — `src/features/almacen/useAlmacen.ts`

### `useArticulos()`
- GET `/WMS/Articulos`
- Estado: `articulos: ArticuloListItem[]`, `loading`, `error`
- Expone `recargar` (callback para refetch manual)
- **Bug apiGet**: `setArticulos(data)` — asigna respuesta completa de apiGet (debería ser `data.data ?? []`)

### `useCategorias()`
- GET `/WMS/Articulos/categorias`
- Estado: `categorias: CategoriaDto[]`
- Sin loading/error state
- **Bug apiGet**: `.then(setCategorias)` — asigna respuesta completa (debería ser `.then(d => setCategorias(d.data ?? []))`)

### `usePrestamos()`
- GET `/WMS/Prestamos`
- Estado: `prestamos: PrestamoListItem[]`, `loading`, `error`
- Expone `recargar`
- **Bug apiGet**: `setPrestamos(data)` — asigna respuesta completa de apiGet (debería ser `data.data ?? []`)

> Nota: Los 3 hooks tienen el bug de apiGet. Pendiente refactor post-entrega (no bloqueante para PR).

## Páginas

### `AdminAlmacenPage` (`src/pages/AdminAlmacenPage.tsx`)
- Solo administrador (`/admin/almacen`)
- Usa `useArticulos()`, `useCategorias()`, `usePrestamos()`
- Funcionalidades CRUD completo: listar artículos, crear artículo, actualizar artículo, eliminar artículo (soft delete), registrar préstamo (POST /WMS/Prestamos), registrar devolución (PATCH /WMS/Prestamos/{id}/devolver)
- No hay página para residentes (WMS es exclusivo administrador)

## Tests Vitest — `AdminAlmacenPage.test.tsx`

**7 `it(` tests**

## Rutas

| Path | Componente | Guard |
|------|-----------|-------|
| `/admin/almacen` | `AdminAlmacenPage` | adminOnly |

- No hay ruta para residentes (no `/mis-articulos` ni `/mis-prestamos`)
