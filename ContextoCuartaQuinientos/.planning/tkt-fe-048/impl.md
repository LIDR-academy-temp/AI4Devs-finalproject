# impl.md — tkt-fe-048 (VEH FE)

## Tipos — `Web/src/shared/types/vehiculos.ts`

| Tipo | Campos clave |
|------|-------------|
| `AutomovilListItem` | automovilId, usuarioId, nombreUsuario?, correoUsuario?, marcaId?, marca?, modeloId?, modelo?, modeloLibre?, placas?, color?, numeroCasa? |
| `MarcaDto` | marcaId, marca |
| `ModeloDto` | modeloId, modelo, marcaId |
| `AutomovilCrearRequest` | marcaId?, modeloId?, modeloLibre?, placas (requerido), color? |
| `AutomovilActualizarRequest` | marcaId?, modeloId?, modeloLibre?, placas?, color? (todos opcionales) |

---

## Hooks — `Web/src/features/vehiculos/useVehiculos.ts`

### useVehiculos()
- GET `/USR/Automoviles`
- ⚠️ **Bug apiGet**: `setVehiculos(data)` en lugar de `setVehiculos(data.data ?? [])` — el hook asigna el objeto completo de respuesta al estado. Documentado como refactor post-entrega.
- Retorna: `{ vehiculos, loading, error, refetch }`

### useMarcas()
- GET `/USR/Marcas`
- `.then(setMarcas)` directo — mismo bug apiGet
- Retorna: `{ marcas }`

### useModelos()
- GET `/USR/Modelos`
- `.then(setModelos)` directo — mismo bug apiGet
- Retorna: `{ modelos }`

---

## Páginas

### `Web/src/pages/MisVehiculosPage.tsx`
- Ruta: `/mis-vehiculos` (Residente)
- Usa `useVehiculos`, `useMarcas`, `useModelos`
- CRUD completo: listar autos del usuario, formulario crear (Placas requerido), editar, eliminar con confirmación
- Llama `apiPost('/USR/Automoviles', body)`, `apiPut('/USR/Automoviles/{id}', body)`, `apiDelete('/USR/Automoviles/{id}')`

### `Web/src/pages/AdminVehiculosPage.tsx`
- Ruta: `/admin/vehiculos` (Admin)
- Búsqueda por placas: input → uppercasing → GET `/USR/Automoviles/buscar?placas=ABC`
- Botón Buscar deshabilitado si input vacío
- Muestra tabla con resultados (nombreUsuario, placas, marca, modelo, color, numeroCasa)

---

## Pruebas — `Web/src/pages/AdminVehiculosPage.test.tsx`

11 tests Vitest (`it(` count = 11):

| Test | Descripción |
|------|-------------|
| renders search form | input placeholder + botón buscar presentes |
| button disabled when input is empty | botón deshabilitado con input vacío |
| button enabled when input has text | botón habilitado al escribir |
| calls apiGet with uppercased placas on submit | envía placas en UPPERCASE |
| shows results table after successful search | tabla renderiza con datos |
| shows empty message when no results | mensaje cuando array vacío |
| shows error message on failure | mensaje de error en catch |
| shows loading state | estado de carga visible |
| clears results on new search | resultados previos se limpian |
| shows vehicle details in table | columnas marca, modelo, placas, etc. |
| shows casa number in table | columna numeroCasa visible |

Mock: `vi.mock('../shared/lib/apiClient')` con `apiGet` como `vi.fn()`

---

## Rutas — `Web/src/App.tsx` + `appNavigation.ts`

| Ruta | Componente | Navlink label | Restricción |
|------|------------|---------------|-------------|
| `/mis-vehiculos` | `MisVehiculosPage` | "Mis Vehículos" | residentOnly |
| `/admin/vehiculos` | `AdminVehiculosPage` | "Vehículos" | adminOnly |
