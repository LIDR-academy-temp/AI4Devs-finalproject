# Contrato de descarga y verificación de contrato (2026-11-01)

Fuentes verificadas: `DocumentosController.cs` (`ObtenerArchivoAsync`), `Constantes.js` (`apiObtenerArchivoDocumentoSTI`), `specs/document-download/spec.md`. Sin credenciales ni datos institucionales.

## Contrato `GET /Documentos/{codigoDocumento}/Archivo?api-version=1.0`

| Aspecto | Valor |
|---|---|
| Entrada | Solo `codigoDocumento` (entero en la ruta); la UI no envía rutas ni nombres |
| Éxito | 200, bytes del archivo, `Content-Type` según extensión, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline; filename="<nombre saneado>"` |
| 400 | código ≤ 0 |
| 404 | documento o archivo inexistente (en la ruta no entera, la ruta no coincide y responde 404 vacío) |
| 413 | contenido > 10 MB (valor actual `TamanioMaximoBytes`) |
| 415 | extensión fuera de pdf, doc, docx, ppt, pptx |
| 401/403 | no verificados: el controlador solo tiene `[Authorize]` y no valida el permiso Descargar; el permiso lo controla la botonera (excepción aceptada, tarea 3.3) |
| MAPI | ejecuta `[VES].[BajarArchivo]` |

## Decisiones

- 1.3 (pendiente): extensiones, MIME y tamaño máximo aprobados por el responsable funcional no se han recibido. Se conservan los valores actuales como referencia, con la decisión marcada como pendiente.
- 1.4: la respuesta conserva `inline`; la UI dispara la descarga desde un blob con `<a download>`. No contradice la previsualización de Abrir, que usa el mismo endpoint.

## Pruebas de contrato (1.5)

- `Bccr.Supen.Ves.Api.UnitTests`: 196/196 pasan.
- `SI.SG.Pruebas`: 224/224 pasan.
- Casos reales con curl: ver `reporte-curl-2026-11-01.md`.
