[← index](_index.md)

# Delta: ARC-BE-028

## Endpoints nuevos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /ARC/TiposArchivo | JWT Cuarta | Catálogo de tipos de archivo |
| GET | /ARC/Archivos | JWT Cuarta | Lista archivos; `?tipoArchivo=` para filtrar |
| GET | /ARC/Archivos/{id}/descargar | JWT Cuarta | Descarga stream + registra log |
| POST | /ARC/Archivos | JWT Cuarta (Admin) | Sube archivo multipart/form-data; 201 |
| DELETE | /ARC/Archivos/{id} | JWT Cuarta (Admin) | Soft-delete; 204 |

Legacy: todos con prefijo `*/legacy`.

## Objetos SQL afectados

| Objeto | Operación | Notas |
|--------|-----------|-------|
| `arc.Archivos` | INSERT / UPDATE (bEliminado) | Subir y eliminar lógicamente |
| `arc.LogVisualizacionArchivos` | INSERT | Auditoría de descarga (fire-and-forget) |
| `arc.TiposArchivo` | SELECT | Resolución por nombre; datos de BD legacy |

Sin seed nuevo — `arc.TiposArchivo` usa datos preexistentes en producción CQ500.

## Infraestructura nueva

| Clase | Descripción |
|-------|-------------|
| `IFileStorage` | Contrato: `SaveAsync`, `GetAsync`, `DeleteAsync` |
| `LocalFileStorage` | Implementación en disco local (configurable vía DI) |

## Archivos backend creados

```
GraphApi/
  Infrastructure/Storage/IFileStorage.cs       [NUEVO]
  Infrastructure/Storage/LocalFileStorage.cs   [NUEVO]
  Controllers/ARC/Archivos/ArchivosController.cs        [NUEVO]
  Controllers/ARC/TiposArchivo/TiposArchivoController.cs [NUEVO]
  Services/ARC/CuartaArchivos/CuartaArchivosService.cs  [NUEVO]
  Services/ARC/CuartaArchivos/ICuartaArchivosService.cs [NUEVO]
  Repositories/ARC/CuartaArchivosRepository.cs          [NUEVO]
  Repositories/ARC/ICuartaArchivosRepository.cs         [NUEVO]
  Models/ARC/CuartaArchivos/CuartaArchivosDtos.cs       [NUEVO]
  GraphApi.Tests/CuartaArchivosServiceTests.cs          [NUEVO]
```

## Códigos de error de negocio

| Code | Status | Condición |
|------|--------|-----------|
| `ARCHIVO_DEMASIADO_GRANDE` | 413 | Archivo > 5 MB |
| `TIPO_NO_PERMITIDO` | 415 | MIME no en allowlist |
| `TIPO_REQUERIDO` | 400 | Campo `tipoArchivo` vacío |
| `TIPO_NO_ENCONTRADO` | 422 | Nombre de tipo no existe en catálogo |
| `ARCHIVO_NO_ENCONTRADO` | 404 | ID no existe o ya eliminado |
| `ARCHIVO_NO_DISPONIBLE` | 404 | Archivo eliminado de disco (FileNotFoundException) |

## Resultados de pruebas

- **xUnit**: 6/6 PASS (`CuartaArchivosServiceTests`)
- **HTTP**: contrato en controllers — ejecución pendiente smoke con BD+storage

## Decisiones técnicas clave

1. **IFileStorage inyectable**: permite sustituir almacenamiento local por blob storage en producción sin cambiar servicio.
2. **Log fire-and-forget**: `InsertLogVisualizacionAsync` sin `await` en ruta de descarga — no bloquea el stream al usuario ni falla la descarga si el log falla.
3. **Soft-delete únicamente**: `bEliminado = 1` sin eliminar fichero de disco — consistente con política Cuarta; el `DeleteAsync` de `IFileStorage` solo se llamaría en hard-delete que no aplica.
4. **MIME + tamaño antes de transacción**: validaciones rápidas al inicio de `SubirAsync` evitan abrir transacción innecesaria.
