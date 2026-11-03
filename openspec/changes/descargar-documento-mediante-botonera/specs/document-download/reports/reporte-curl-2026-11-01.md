# Reporte curl — descargar-documento-mediante-botonera (2026-11-01)

Ambiente: local, Development, `BDSUPEN_Des`. API `http://localhost:61101` → MAPI `http://localhost:61100`. Sin token (`RequiereJwt=False`). Sin secretos. Documento real 110 (`.docx`).

| Solicitud (API, `?api-version=1.0`) | Respuesta |
|---|---|
| `GET /Documentos/110/Archivo` | 200; `Content-Length: 567300`; `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`; `X-Content-Type-Options: nosniff`; `Content-Disposition: inline; filename="Tab y val contableV22.docx"` |
| `GET /Documentos/110` | 200 `application/json` |
| `GET /Documentos/999999/Archivo` | 404 `application/problem+json` |
| `GET /Documentos/0/Archivo` | 400 `text/plain` |
| `GET /Documentos/abc/Archivo` | 404 (sin cuerpo; no coincide la ruta) |

Observaciones:
- Se confirma `inline` + `nosniff`; la descarga la dispara la UI desde el blob.
- Las respuestas 401/403 no se pueden verificar: en Development la autenticación está desactivada y el fallback local no es evidencia. Excepción aceptada (tarea 3.3).
- 413/415 no se probaron con datos reales (no hay documentos de tamaño excedido ni formato no permitido); existen pruebas unitarias del endpoint de apertura.
- Servidores no productivos y de producción: sin acceso.
