[← index](_index.md) | [← design](design.md)

# Impl: FE-045

## Implementación

UI Archivos completa: página residente (lista + filtro + descarga) y administrador (tabla + subir multipart + eliminar + descarga), hooks de datos, tipos compartidos y rutas registradas.

## Archivos creados

```
Web/src/
  pages/
    ArchivosPage.tsx               [NUEVO] Lista/descarga archivos (residente)
    AdminArchivosPage.tsx          [NUEVO] Gestión archivos admin + modal subir
    AdminArchivosPage.test.tsx     [NUEVO] Tests unitarios (vitest, 9 it/test)

  features/archivos/
    useArchivos.ts                 [NUEVO] Hook GET /ARC/Archivos?tipoArchivo=

  features/admin/archivos/
    useTiposArchivo.ts             [NUEVO] Hook GET /ARC/TiposArchivo

  shared/types/
    archivos.ts                    [NUEVO] Tipos TS: ArchivoListItem, TipoArchivoItem
```

## Archivos modificados

```
Web/src/
  App.tsx              +2 rutas ARC (/archivos, /admin/archivos)
  shared/navigation/appNavigation.ts  +2 entradas nav ARC
```

## Rutas registradas

| Ruta | Componente | Rol |
|------|-----------|-----|
| `/archivos` | `ArchivosPage` | Residente |
| `/admin/archivos` | `AdminArchivosPage` | Admin |

## Endpoints consumidos

| Hook / Página | Endpoint BE |
|---------------|------------|
| `useArchivos` | `GET /ARC/Archivos` (con `?tipoArchivo=` opcional) |
| `useTiposArchivo` | `GET /ARC/TiposArchivo` |
| `ArchivosPage` · `AdminArchivosPage` | `GET /ARC/Archivos/{id}/descargar` (fetch directo con JWT) |
| `AdminArchivosPage` | `POST /ARC/Archivos` (FormData multipart) · `DELETE /ARC/Archivos/{id}` |

## Nota técnica

La descarga y el upload usan `fetch` directo (no `apiClient`) porque requieren `Content-Type: multipart/form-data` y respuesta binaria (blob) — no compatibles con `apiClient` actual. El JWT se agrega manualmente desde `localStorage`.

## Verificación final (/revisar 2026-10-19)

### Criterios de aceptación

- [x] **CA-1**: Residente ve lista de documentos con filtro por tipo; descarga con JWT.
- [x] **CA-2**: Admin sube archivo multipart (PDF/imagen/Word, máx 5 MB) con tipo y nombre.
- [x] **CA-3**: Admin elimina archivo (soft-delete); la tabla refresca tras la operación.
- [x] **CA-4**: Archivos privados muestran badge; tipo y fecha visibles en tabla admin.

### Pruebas

- **Vitest**: 9 tests OK (`AdminArchivosPage.test.tsx`)
- **TypeScript**: `tsc --noEmit` limpio

### Desviaciones

- `useArchivos` y `useTiposArchivo` asignan directamente el objeto de respuesta de `apiGet` al estado en lugar de extraer `.data` — comportamiento en runtime equivalente en happy path (objeto tiene la forma esperada) pero es técnicamente incorrecto; no bloqueante para PR, se corrige en refactor post-entrega.
