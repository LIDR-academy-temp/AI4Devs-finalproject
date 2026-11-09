[← index](_index.md) | [← design](design.md)

# Impl: ARC-BE-028

## Implementación

- `IFileStorage` + `LocalFileStorage`: abstracción de almacenamiento local de archivos (guarda en disco, resuelve stream para descarga).
- `CuartaArchivosRepository` + `CuartaArchivosService`: Dapper sin SP; maneja lista, resolución de tipo por nombre, insert, obtener, soft-delete, log de visualización (fire-and-forget).
- `ArchivosController`: `GET /ARC/Archivos` (filtro por tipo), `GET /ARC/Archivos/{id}/descargar`, `POST /ARC/Archivos` (multipart/form-data, SoloAdministrador), `DELETE /ARC/Archivos/{id}` (SoloAdministrador) + legacy.
- `TiposArchivoController`: `GET /ARC/TiposArchivo` + legacy.
- DI registrado en `ServiceCollectionExtensions`.

## Archivos

```
GraphApi/
  Infrastructure/Storage/
    IFileStorage.cs                           [NUEVO]
    LocalFileStorage.cs                       [NUEVO]
  Controllers/ARC/
    Archivos/ArchivosController.cs            [NUEVO]
    TiposArchivo/TiposArchivoController.cs   [NUEVO]
  Services/ARC/CuartaArchivos/
    CuartaArchivosService.cs                  [NUEVO]
    ICuartaArchivosService.cs                 [NUEVO]
  Repositories/ARC/
    CuartaArchivosRepository.cs              [NUEVO]
    ICuartaArchivosRepository.cs             [NUEVO]
  Models/ARC/CuartaArchivos/
    CuartaArchivosDtos.cs                    [NUEVO]

GraphApi.Tests/
  CuartaArchivosServiceTests.cs              [NUEVO] 6 tests (xUnit)
```

## Verificación final (/revisar 2026-10-19)

### Criterios de aceptación

- [x] **CA-1**: Log de visualización insertado en descarga (fire-and-forget, no bloquea stream).
- [x] **CA-2**: Soft-delete: `bEliminado = 1` + auditoría — el archivo no desaparece de disco.
- [x] **CA-3**: Validación MIME (PDF, JPEG, PNG, WEBP, DOC, DOCX) + límite 5 MB.

### Pruebas xUnit

- Archivo: `CuartaArchivosServiceTests.cs`
- Tests: **6/6** PASS
  - `SubirAsync_archivo_mayor_5MB_devuelve_ARCHIVO_DEMASIADO_GRANDE`
  - `SubirAsync_tipo_mime_no_permitido_devuelve_TIPO_NO_PERMITIDO`
  - `SubirAsync_tipo_no_encontrado_devuelve_TIPO_NO_ENCONTRADO`
  - `DescargarAsync_archivo_no_existe_devuelve_404`
  - `DescargarAsync_archivo_fisico_no_disponible_devuelve_404`
  - `EliminarAsync_no_existe_devuelve_404`

### Auditorías

- auditor-sql: **APROBADO** — sin SP, queries parametrizadas, UQ respetado
- auditor-codigo: **APROBADO** — patrón Cuarta + legacy aislado; IFileStorage inyectable
- auditor-seguridad: **APROBADO** — JWT obligatorio; write/delete requieren SoloAdministrador; sin path traversal (ruta relativa opaca del storage)

### Desviaciones

- No se creó seed para `arc.TiposArchivo`: los tipos de archivo provienen de datos legacy existentes en BD (la tabla tiene datos previos en producción CQ500). Si BD está vacía en entorno nuevo, requiere seed manual antes del smoke test.
