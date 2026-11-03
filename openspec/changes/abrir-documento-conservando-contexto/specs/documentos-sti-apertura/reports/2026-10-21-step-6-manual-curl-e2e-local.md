# Verificación manual local (curl y Playwright) — apertura de documentos

Entorno: prueba **local sin GAUDI**, con el usuario de Windows `OREAMUNOAE` (autenticación integrada contra la BD de desarrollo) y login manual de la UI. Servicios: MAPI `http://localhost:62528`, API `http://localhost:62525`, UI `http://localhost:3000`. No es verificación de producción.

Para evitar el fallo del logger de Event Log de BCCR (requiere administrador) se silenciaron las categorías de log con variables `Logging__LogLevel__*=None`.

## curl

| Capa | Petición | Resultado |
|---|---|---|
| MAPI | `GET Documentos/Tipos` | 200 |
| MAPI | `GET Documentos?codigoTipo=-1` | 200, 61 documentos |
| MAPI | `GET Documentos/110` | 200, `archivoDisponible: true` |
| MAPI | `GET Documentos/110/Archivo` | 200 (~756 KB) |
| MAPI | `GET Documentos/0` | 400 |
| MAPI | `GET Documentos/99999999` y `/Archivo` | 404 |
| API | `GET Documentos/110` | 200 |
| API | `GET Documentos/0` | 400 |
| API | `GET Documentos/110/Archivo` | 200, `nosniff`, `Content-Disposition: inline` con nombre saneado |
| API | `GET Documentos/99999999` y `/Archivo` | **500 (esperado 404)** |

Contrato real del detalle: `codigoDocumento, codigoTipoDoc, titulo, resumen, nombreArchivo, fechaPublicacion, usuarioPublica, fechaCaduca, archivoDisponible` (`resumen` y `usuarioPublica` se agregaron el 2026-10-22: verificado con `Documentos/46` y `Documentos/5`; el resumen se muestra en un campo multilínea de solo lectura).

### Pendiente / no verificado
- **404 → 500 en el API (resuelto 2026-10-22)**: el handler registraba un error y el logger de Event Log lanzaba `SecurityException` por fuente no registrada. Tras registrar las fuentes `VES` y `VES.API`, `GET Documentos/99999999` devuelve 404 y `Documentos/46` 200 (sin cambios de código).
- **Cambios de UI posteriores**: la acción Abrir se genera con la `Botonera` común (todas las opciones de seguridad; las no implementadas avisan «Opción no disponible aún»), detalle rediseñado en dos tarjetas y documentos caducados permitidos. Pruebas UI 95/95.
- **401/403 sin credenciales**: no verificable localmente (`Autenticacion:RequiereJwt=false`, sin token se autentica como `localhost`).

## Playwright

Recorrido con tipo «todos»: ordenar por Título, página 2 (6–10 de 61), abrir documentos y volver.

| Verificación | Resultado |
|---|---|
| Detalle de PDF (código 52) | Datos, vigencia y «Archivo: Disponible» correctos |
| Detalle de .docx (código 70) | Datos correctos y «Vista previa no disponible para este formato» |
| Volver al listado | Restaura página 6–10 de 61, orden por Título, fila 70 seleccionada, foco en «Abrir» y scroll 80 |
| Recarga del navegador | Vuelve al Dashboard: el módulo activo no está en la URL (diseño documentado) |

### Hallazgos
- **Corregido**: con `iframe sandbox=""` el visor de PDF de Chrome bloqueaba el blob (`ERR_BLOCKED_BY_CLIENT`). Se quitó `sandbox`, se usa `referrerPolicy="no-referrer"` y el blob se fuerza a `application/pdf`; design.md y DEVELOPMENT.md actualizados.
- **No verificado**: el renderizado visual del PDF. Tras el cambio, el navegador automatizado se cuelga («Page crashed») al cargar el iframe de PDF; no se pudo determinar si es una limitación del navegador de prueba o un defecto. Debe comprobarse manualmente en un navegador de escritorio.
- «Atrás» del navegador y captura de pantalla no se ejecutaron (el sandbox de Playwright no expone `process` para guardar archivos).
