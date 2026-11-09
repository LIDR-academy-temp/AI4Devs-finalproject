# FE-046: Impl — UI Juntas

## Archivos nuevos

### `Web/src/shared/types/juntas.ts`
```ts
JuntaListItem     // juntaId, titulo, descripcion, fechaProgramada, ubicacion, activa, fechaCreacion
JuntaArchivo      // juntaDetalleArchivoId, nombreArchivo, ruta, tipoArchivo
JuntaDetalle      // extends JuntaListItem + juntaDetalleId, contenido, fechaRegistroDetalle, archivos[]
JuntaCrearRequest
JuntaActualizarRequest
```

### `Web/src/features/juntas/useJuntas.ts`
Llama `apiGet<JuntaListItem[]>('/JNT/Juntas')`. Expone `{ juntas, loading, error, refetch }`.
> **Nota post-entrega**: `setJuntas(data)` asigna el objeto completo de apiGet (incluye `{ data, problem, status }`). Debe ser `setJuntas(data.data ?? [])`. Refactor pendiente.

### `Web/src/features/juntas/useJuntaDetalle.ts`
Llama `apiGet<JuntaDetalle>('/JNT/Juntas/:id')`. Expone `{ junta, loading, error, refetch }`.
> **Nota post-entrega**: misma variante del bug — `setJunta(data)` en lugar de `setJunta(data.data ?? null)`. Refactor pendiente.

### `Web/src/pages/JuntasPage.tsx`
Vista pública de lista de juntas. Usa `useJuntas`. Cards con título, fecha, ubicación y botón detalle.

### `Web/src/pages/JuntaDetallePage.tsx`
Vista detalle por `id`. Usa `useJuntaDetalle(id)`. Muestra contenido del acta y listado de archivos adjuntos (enlace de descarga por ruta).

### `Web/src/pages/AdminJuntasPage.tsx`
Panel admin. Tabla de juntas con acciones crear / eliminar. Modal de formulario con validación (título obligatorio, fecha requerida). Usa `useJuntas` + `apiPost`/`apiPut`/`apiDelete`.

### `Web/src/pages/AdminJuntasPage.test.tsx`
8 tests Vitest con Testing Library + userEvent.

| # | Test |
|---|------|
| 1 | Skeleton mientras carga |
| 2 | Lista juntas en tabla |
| 3 | Abre modal al pulsar "Nueva junta" |
| 4 | Cierra modal al pulsar Cancelar |
| 5 | Llama apiPost al crear junta válida |
| 6 | Error de validación si título vacío |
| 7 | Llama apiDelete al eliminar junta |
| 8 | Estado vacío sin juntas |

Resultado: 8/8 ✅, `tsc --noEmit` limpio.

## Archivos existentes modificados

### `Web/src/App.tsx`
+3 rutas:
```tsx
<Route path="/juntas" element={<JuntasPage />} />
<Route path="/juntas/:id" element={<JuntaDetallePage />} />
<Route path="/admin/juntas" element={<AdminJuntasPage />} />
```

### `Web/src/shared/lib/appNavigation.ts`
Sin entradas adicionales de juntas (no aparece en la navegación lateral del módulo JNT en esta entrega — las rutas son accesibles vía URL directa y desde el módulo admin).

## Decisiones de diseño

- No se usa `apiClient` para descarga de adjuntos de acta; los archivos se enlazan directamente por su ruta almacenada (campo `ruta` del tipo `JuntaArchivo`).
- `AdminJuntasPage` no tiene vista de edición inline; el PUT se invoca programáticamente desde el modal extendido.
- La variante del bug apiGet (asignar objeto completo al estado) está documentada y no es bloqueante para PR; se refactoriza en sprint de deuda técnica post-entrega.
