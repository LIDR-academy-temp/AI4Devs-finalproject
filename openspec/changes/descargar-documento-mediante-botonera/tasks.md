# Tasks

## 1. HU04-T01 — Especificar el contrato documento → archivo

- [x] 1.1 Crear la rama de trabajo `feature/hu04-t01-document-download-contract` desde la rama base correspondiente a cada componente afectado y verificar que no se modifiquen ramas compartidas.
- [x] 1.2 Documentar el contrato existente `Documentos/{codigoDocumento}/Archivo`, incluyendo identificador, nombre, bytes, MIME, headers, estados 400/401/403/404/413/415 y errores controlados; verificarlo contra `DocumentosController.cs`, `Constantes.js` y la especificación `document-download`. _Ver `reports/contrato-descarga-2026-11-01.md`._
- [ ] 1.3 Resolver y registrar con el responsable funcional los valores aprobados de extensiones, MIME y tamaño máximo; mientras no exista aprobación, conservar los valores actuales como referencia y marcar la decisión pendiente.
- [x] 1.4 Definir explícitamente que la respuesta conserva `Content-Disposition: inline` y que la UI dispara la descarga desde un blob; verificar que la decisión no contradiga la previsualización existente. _Ver contrato; apertura sigue pasando._
- [x] 1.5 Revisar y actualizar las pruebas de contrato del API/SI.SG relacionadas con archivo; ejecutar la suite aplicable y registrar el reporte de verificación en `openspec/changes/descargar-documento-mediante-botonera/specs/document-download/reports/`. _API 196/196 y SI.SG 224/224; ver contrato._
- [x] 1.6 Actualizar la documentación técnica del contrato y verificar que no incluya credenciales, tokens, datos institucionales ni rutas inventadas. _`ComoCrearUnNuevoEndpoint.md` y el contrato en reports._

## 2. HU04-T02 — Preparar fixtures y casos negativos

- [ ] 2.1 Crear o confirmar la rama de trabajo `feature/hu04-t02-document-download-fixtures` y verificar que se base en la rama de integración indicada por el README del componente.
- [ ] 2.2 Preparar un PDF sintético versionable y casos controlados de archivo ausente, identificador inexistente, formato no permitido, tamaño excedido y error del origen; verificar que ningún fixture contenga datos institucionales.
- [ ] 2.3 Añadir pruebas UI/API/MAPI aisladas para respuestas vacías, errores y metadatos de archivo; ejecutar las suites correspondientes y registrar el reporte de unidad/estado de base de datos en `openspec/changes/descargar-documento-mediante-botonera/specs/document-download/reports/`.
- [ ] 2.4 Verificar con pruebas que una respuesta fallida no crea un archivo falso, no expone detalles técnicos y no altera el estado del listado.
- [ ] 2.5 Actualizar la documentación de fixtures y verificar que los comandos de prueba sean reproducibles sin SQL mutante, credenciales reales ni servicios de producción.

## 3. HU04-T03 — Diseñar e integrar el adaptador de descarga protegido

- [x] 3.1 Crear la rama `feature/hu04-t03-protected-document-download` desde la rama base de cada componente afectado y verificar el flujo UI → API → MAPI.
- [x] 3.2 Implementar o ajustar el adaptador UI/API para enviar únicamente `CodigoDocumento`, reutilizar el endpoint existente y manejar blob, nombre, MIME y liberación de recursos sin acceso directo a MAPI o SQL; verificarlo con pruebas unitarias.
- [x] 3.3 Mantener la validación del servidor para autenticación, permiso Descargar, identificador, disponibilidad, MIME, extensión, tamaño y headers; verificar 400/401/403/404/413/415 con pruebas API/MAPI. _Excepción aceptada por el usuario (2026-11-01): el permiso Descargar se controla solo por la opción de la botonera (base de datos), como Abrir; el endpoint `Archivo` no lo valida y 401/403 no se verificaron (Development usa `RequiereJwt=False`)._
- [x] 3.4 Integrar la consulta de opciones de seguridad de la botonera con denegación por defecto: si el usuario de pruebas no recibe Descargar, la UI no muestra la acción; verificarlo con la prueba de permisos existente.
- [x] 3.5 Ejecutar pruebas unitarias y verificar el estado de base de datos cuando aplique; generar el reporte requerido en `openspec/changes/descargar-documento-mediante-botonera/specs/document-download/reports/`. _Reporte: `reports/reporte-pruebas-2026-11-01.md`._
- [x] 3.6 Ejecutar pruebas manuales con `curl` en un ambiente no productivo y documentar URLs, respuestas y bloqueos sin secretos; no considerar el fallback de `localhost` como evidencia de 401/403. _Ver `reports/reporte-curl-2026-11-01.md`; 401/403/413/415 no verificados._
- [x] 3.7 Actualizar la documentación de API/MAPI/UI y verificar que refleje `inline`, el límite pendiente y la autorización del servidor. _Actualizado `ComoCrearUnNuevoEndpoint.md`._

## 4. HU04-T04 — Conectar Descargar a la selección y conservar contexto

- [x] 4.1 Crear la rama `feature/hu04-t04-botonera-download` desde la rama base UI y verificar que se reutilice el componente común `Botonera` en lugar de crear controles paralelos.
- [x] 4.2 Conectar Descargar en `ConsultaDocumentos.jsx` únicamente para una fila seleccionada y una opción de seguridad disponible; verificar el mensaje de no selección y que no se realice la solicitud en ese caso.
- [x] 4.3 Disparar la descarga desde el blob usando el nombre autorizado, liberar recursos temporales y mantener filtro, orden, página, selección y desplazamiento; verificarlo con pruebas React Testing Library.
- [x] 4.4 Revisar y actualizar las pruebas existentes de apertura, preview y restauración para demostrar que Descargar no introduce regresiones; ejecutar Vitest y registrar el reporte de unidad. _25/25 en `src/Documentacion/Documentos`; ver reporte._
- [x] 4.5 Ejecutar la prueba E2E aplicable con Playwright MCP en un ambiente no productivo; verificar la botonera, selección, descarga y conservación del contexto, o registrar explícitamente el bloqueo. _Ejecutada 2026-11-01 con `OREAMUNOAE`: botón visible, sin selección informa, documento 110 descargado (200, 567 300 bytes; archivo visualizado por el usuario). Error de origen no concluyente (solo prueba unitaria)._
- [x] 4.6 Actualizar documentación UI/UX y verificar accesibilidad, estados de carga/error y ausencia de acciones fuera del alcance. _Sección «Descarga» en `VES/Bccr.Supen.Ves.UI/Documentacion/DEVELOPMENT.md`; sin acciones nuevas fuera de la botonera común._

## 5. HU04-T05 — Ejecutar y registrar PF-04

- [ ] 5.1 Crear la rama `feature/hu04-t05-pf04-download` o continuar la rama de integración aprobada y verificar que incluya únicamente la evidencia de HU-04.
- [ ] 5.2 Ejecutar PF-04 con un usuario real del ambiente de pruebas que tenga Descargar: PDF sintético autorizado, nombre, MIME y bytes contra fixture; registrar evidencia sin credenciales.
- [ ] 5.3 Ejecutar PF-04 con un usuario del ambiente de pruebas que no tenga Descargar; verificar que la opción no esté disponible y, si se prueba una solicitud directa autorizadamente, que el servidor no entregue bytes.
- [ ] 5.4 Ejecutar los escenarios sin selección, archivo ausente, identificador inexistente y error del origen; verificar mensajes controlados, ausencia de archivo falso y contexto preservado.
- [ ] 5.5 Ejecutar las suites unitarias, la prueba manual con `curl`, la prueba E2E aplicable y la verificación de estado de base de datos; generar el reporte obligatorio en `openspec/changes/descargar-documento-mediante-botonera/specs/document-download/reports/`.
- [ ] 5.6 Actualizar la documentación y la matriz de evidencia de PF-04; marcar cada escenario como verificado o bloqueado y no cerrar HU-04 ni sus tareas sin evidencia suficiente.
