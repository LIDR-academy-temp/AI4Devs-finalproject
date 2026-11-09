# impl.md — tkt-fe-049 (MAS FE)

## Tipos — `Web/src/shared/types/mascotas.ts`

| Tipo | Campos clave |
|------|-------------|
| `MascotaListItem` | mascotaId, usuarioId, nombreUsuario?, correoUsuario?, nombreMascota, tipoMascotaId?, tipoMascota?, razaMascotaId?, razaMascota?, razaLibre?, vacunasAlDia?, fechaUltimaVacuna?, fechaNacimiento?, numeroCasa? |
| `TipoMascotaDto` | tipoMascotaId, tipoMascota |
| `RazaMascotaDto` | razaMascotaId, razaMascota, tipoMascotaId |
| `MascotaCrearRequest` | nombreMascota (requerido), tipoMascotaId?, razaMascotaId?, razaLibre?, vacunasAlDia?, fechaUltimaVacuna?, fechaNacimiento? |
| `MascotaActualizarRequest` | todos opcionales (mismos campos sin requerido) |

---

## Hooks — `Web/src/features/mascotas/useMascotas.ts`

### useMascotas()
- GET `/USR/Mascotas`
- ⚠️ **Bug apiGet**: `setMascotas(data ?? [])` — el hook usa `data` directamente (objeto completo de apiGet). Documentado como refactor post-entrega.
- Retorna: `{ mascotas, loading, error, reload }`

### useTiposMascota()
- GET `/USR/TiposMascota`
- `.then(d => setTipos(d ?? []))` — mismo bug apiGet (asigna respuesta completa)
- Retorna: `tipos` (array directo, no objeto)

### useRazasMascota()
- GET `/USR/RazasMascota`
- `.then(d => setRazas(d ?? []))` — mismo bug apiGet
- Retorna: `razas` (array directo)

### usePadronMascotas()
- GET `/USR/Mascotas/padron`
- `.then(data => setPadron(data ?? []))` — mismo bug apiGet
- Retorna: `{ padron, loading, reload }`

---

## Páginas

### `Web/src/pages/MisMascotasPage.tsx`
- Ruta: `/mis-mascotas` (Residente)
- Usa `useMascotas`, `useTiposMascota`, `useRazasMascota`
- CRUD completo: listar mascotas propias, formulario crear (NombreMascota requerido, selects tipo/raza o campo libre, vacunas, fechas), editar, eliminar con confirmación
- Llama `apiPost('/USR/Mascotas', body)`, `apiPut('/USR/Mascotas/{id}', body)`, `apiDelete('/USR/Mascotas/{id}')`

### `Web/src/pages/AdminMascotasPage.tsx`
- Ruta: `/admin/mascotas` (Admin)
- Usa `usePadronMascotas`
- Vista de padrón completo: tabla con nombreUsuario, nombreMascota, tipo, raza, vacunasAlDia, numeroCasa
- Sin CRUD (solo lectura del padrón)

---

## Pruebas

### `AdminMascotasPage.test.tsx` — 7 tests Vitest

| Test | Descripción |
|------|-------------|
| renders page title | título visible |
| shows loading state | spinner/loading |
| shows padron table | tabla con datos |
| shows empty state | mensaje sin mascotas |
| shows error state | mensaje de error |
| shows vacunas status | columna vacunas al día |
| shows numeroCasa | columna número de casa |

### `MisMascotasPage.test.tsx` — 8 tests Vitest

| Test | Descripción |
|------|-------------|
| renders add button | botón agregar visible |
| shows loading | estado carga |
| shows mascotas list | lista con datos |
| shows empty state | sin mascotas |
| opens create form | formulario crear |
| validates nombre required | validación nombre |
| shows edit button | botón editar |
| shows delete button | botón eliminar |

---

## Rutas — `Web/src/App.tsx` + `appNavigation.ts`

| Ruta | Componente | Navlink label | Restricción |
|------|------------|---------------|-------------|
| `/mis-mascotas` | `MisMascotasPage` | "Mis Mascotas" | residentOnly |
| `/admin/mascotas` | `AdminMascotasPage` | "Mascotas" | adminOnly |
