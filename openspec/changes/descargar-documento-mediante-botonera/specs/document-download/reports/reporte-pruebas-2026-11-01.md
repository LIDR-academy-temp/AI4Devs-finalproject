# Reporte de pruebas — descargar-documento-mediante-botonera (2026-11-01)

Ambiente: local, Development, BD `BDSUPEN_Des`, sin GAUDI. No es producción. Sin secretos.

## 1. Pruebas de unidad

| Suite | Resultado |
|---|---|
| `Bccr.Supen.Ves.Api.UnitTests` | 17 pasan (línea base) |
| `SI.SG.Pruebas` | 9 pasan (línea base) |
| UI `src/Documentacion/Documentos` (Vitest) | 25/25 pasan |

UI: `ConsultaDocumentosDescarga.test.jsx` (5): nombre descargado y blob liberado, saneo de ruta, sin selección, errores 404/500/vacío, extensión no permitida.

Regresión (tarea 4.4): 3 pruebas de `ConsultaDocumentosApertura.test.jsx` fallaban antes de este cambio. Causa: `DetalleDocumento.jsx` cambió los textos de estado y se perdió «Reintentar». No dependían de servidores. Corrección: se restauró «Reintentar» (visible solo en «Sin verificar») y las pruebas usan `[Doc. disponible]`, `[Doc. no disponible]` y `[Sin verificar]`.

## 2. Prueba E2E manual (Playwright MCP + pila local)

MAPI `localhost:61100`, API `localhost:61101`, UI `localhost:3000` (los puertos 62525/62528 están excluidos por Windows). Usuario `OREAMUNOAE`.

| Caso | Resultado |
|---|---|
| Botón «Descargar» en la botonera | Visible |
| Pulsar sin selección | «Debe seleccionar un documento para descargarlo.» |
| Documento 110 (`Tab y val contableV22.docx`) | `GET /Documentos/110/Archivo` → 200, 567 300 bytes; MAPI ejecutó `EXEC [VES].[BajarArchivo]` |
| Archivo guardado | Confirmado visualmente por el responsable (sin hash) |

## 3. Limitaciones

- Excepción aceptada (3.3): el permiso Descargar lo controla solo la botonera; el servidor no lo valida. Un GET directo sin token devolvió 200 en Development (`RequiereJwt=False`). 401/403 no verificados y el fallback de `localhost` no es evidencia de ellos.
- Error de origen (MAPI detenido): no concluyente en E2E; cubierto solo por prueba unitaria.
- Lista vacía con datos reales: no probada.
- Servidores de producción y no producción: sin acceso, no probados.
- Límite de 10 MB: pendiente de aprobación.
