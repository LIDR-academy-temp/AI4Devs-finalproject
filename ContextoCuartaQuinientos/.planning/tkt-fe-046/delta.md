# FE-046: Delta — UI Juntas

## Páginas nuevas

| Archivo | Ruta | Acceso |
|---------|------|--------|
| `JuntasPage.tsx` | /juntas | [Authorize] |
| `JuntaDetallePage.tsx` | /juntas/:id | [Authorize] |
| `AdminJuntasPage.tsx` | /admin/juntas | [Authorize Admin] |

## Hooks nuevos

| Archivo | Endpoint |
|---------|----------|
| `features/juntas/useJuntas.ts` | GET /JNT/Juntas |
| `features/juntas/useJuntaDetalle.ts` | GET /JNT/Juntas/:id |

## Tipos nuevos

`shared/types/juntas.ts` — `JuntaListItem`, `JuntaDetalle`, `JuntaArchivo`, `JuntaCrearRequest`, `JuntaActualizarRequest`.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `App.tsx` | +3 rutas: /juntas, /juntas/:id, /admin/juntas |

## Tests

- Vitest: 8/8 ✅ (`AdminJuntasPage.test.tsx`)
- `tsc --noEmit` limpio

## Notas

- Hooks usan apiGet con bug de asignación de respuesta completa al estado — refactor post-entrega.
- Archivos de acta se enlazan por ruta directa (sin apiClient para descarga).
