[← index](_index.md)

# Delta: FE-045

## Páginas nuevas

| Componente | Ruta | Rol | Descripción |
|-----------|------|-----|-------------|
| `ArchivosPage` | `/archivos` | Residente | Lista documentos con filtro por tipo; descarga con JWT |
| `AdminArchivosPage` | `/admin/archivos` | Admin | Tabla + modal subir (multipart) + eliminar + descarga |

## Hooks nuevos

| Hook | Endpoint | Retorno |
|------|---------|---------|
| `useArchivos` | `GET /ARC/Archivos` | `{ archivos, loading, error, refetch }` |
| `useTiposArchivo` | `GET /ARC/TiposArchivo` | `{ tipos, loading }` |

## Tipos nuevos (`shared/types/archivos.ts`)

`ArchivoListItem`, `TipoArchivoItem`

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `App.tsx` | +2 rutas ARC (residente + admin) |
| `appNavigation.ts` | +2 entradas nav (`/archivos` residente, `/admin/archivos` admin) |

## Pruebas

- **Vitest**: 9 tests OK (`AdminArchivosPage.test.tsx`)
- **tsc --noEmit**: limpio

## Nota

Descarga y upload usan `fetch` directo (blob/multipart) — no `apiClient`. JWT adjuntado manualmente desde `localStorage`.
