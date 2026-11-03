# Historia: Descargar mediante la botonera

## Original

### HU-04 — Descargar el archivo del documento seleccionado mediante la botonera

**Como** usuario autorizado del módulo documental de SUPEN, **quiero** seleccionar un documento del listado y ejecutar **Descargar** en la botonera, **para** obtener el archivo asociado cuando esté disponible y tenga permiso para ello.

**Criterios de aceptación:**

1. **Dado** un documento seleccionado, permiso obtenido de pruebas Descargar y archivo disponible, **cuando** pulso Descargar, **entonces** se inicia la descarga del archivo asociado a esa selección, con nombre y extensión coherentes.
2. **Dado** que no hay fila seleccionada, **cuando** intento descargar, **entonces** la acción no se ejecuta.
3. **Dado** un rol sin permiso obtenido de pruebas Descargar, **cuando** intenta la acción, **entonces** no obtiene el contenido; la demostración deja claro que el control de interfaz no reemplaza una validación real del servidor.
4. **Dado** un documento sin archivo, inexistente o con error del origen, **cuando** solicito descargar, **entonces** se informa el resultado sin generar un archivo incorrecto.
5. La descarga no modifica el filtro, la página ni la selección del listado, y el archivo sintético descargado coincide en contenido con el fixture original.

**Prueba funcional principal PF-04:** descargar el PDF de ejemplo y verificar nombre/contenido; repetir con permiso denegado, sin selección y archivo ausente, dejando evidencia o estado pendiente.

## Enhanced

### 1. Análisis de la historia

HU-04 está alineada con el README: cubre exclusivamente la descarga de solo
lectura del archivo asociado al documento seleccionado, mediante la botonera,
sin incluir creación, edición, carga, sustitución o eliminación de documentos.

La historia requiere dos capas que deben demostrarse por separado:

- La UI debe exponer y ejecutar **Descargar** únicamente para la selección y la
  opción autorizada.
- El servidor debe validar autenticación, autorización, identificador y archivo
  independientemente de la visibilidad de la opción en la UI.

El estado verificado es **parcial**. El backend ya expone una ruta de archivo y
la pantalla de detalle ya consulta ese recurso para disponibilidad y
previsualización. Sin embargo, la pantalla de listado actualmente registra en
la botonera únicamente la acción `abrir`; no se verificó una acción `Descargar`
conectada a la selección. Por ello no corresponde marcar HU-04 como terminada.

### 2. Verificación de documentación y código existente

#### Fuentes consultadas

| Fuente | Propósito | Resultado verificado |
|---|---|---|
| `readme.md`, HU-04 y HU04-T01..HU04-T05 | Fuente funcional primaria | Define alcance, criterios y PF-04. |
| `openspec/changes/consultar-documentos-filtrados-por-tipo` | Evidencia del listado | Respaldan consulta y filtrado, no la acción Descargar. |
| `openspec/changes/abrir-documento-conservando-contexto` | Evidencia de apertura | Respalda detalle, disponibilidad, previsualización y contexto, no la descarga desde botonera. |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentos.jsx` | Flujo y acciones del listado | La botonera contiene `abrir`; la selección conserva código, página, orden y desplazamiento. |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/DetalleDocumento.jsx` | Uso actual del archivo | Consulta el endpoint de archivo como `blob` para verificar disponibilidad y construir la vista previa. |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Constantes.js` | Contratos de URL | Existe `Documentos/{codigoDocumento}/Archivo`. |
| `VES/Bccr.Supen.Ves.Api/Codigo/API/Controllers/Version1/DocumentosController.cs` | Endpoint y controles HTTP | Existe `GET {codigoDocumento}/Archivo`, con `[Authorize]`, validación de código, 404, MIME permitido, límite de 10 MB y `nosniff`. |
| `VES/Bccr.Supen.Ves.Mapi/Codigo/DA/DocumentoConsultaDA.cs` | Acceso al archivo | Consulta `[VES].[BajarArchivo]` mediante `FromSqlInterpolated`. |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentosApertura.test.jsx` | Pruebas existentes | Cubren apertura, disponibilidad, PDF, errores y restauración; no cubren descarga por botonera. |
| Pruebas API/SI.SG relacionadas con documentos | Contratos de integración | Hay cobertura del flujo de archivo, pero debe ampliarse para PF-04 y autorización efectiva. |

#### Hechos, inferencias y pendientes

- **Hecho:** el endpoint de archivo existe y exige autenticación mediante
  `[Authorize]`.
- **Hecho:** el endpoint rechaza códigos no positivos, archivos ausentes,
  formatos no permitidos y archivos mayores de 10 MB.
- **Hecho:** la UI usa el endpoint para previsualización mediante `blob`.
- **Hecho:** `ConsultaDocumentos.jsx` no agrega actualmente una función
  `Descargar` a `laListaDeLasFuncionesDeLosBotones`.
- **Inferencia controlada:** puede reutilizarse el contrato de archivo existente
  para la descarga, pero todavía debe definirse el comportamiento del navegador,
  el encabezado de disposición (`inline` frente a `attachment`) y el control
  efectivo de la opción Descargar.
- **Pendiente:** demostrar permiso institucional de Descargar, contenido real,
  nombre final, denegación efectiva y conservación del contexto en PF-04.

### 3. Identificación de cambios e impactos

| Archivo o componente | Comportamiento actual verificado | Modificación sugerida | Impacto, riesgos y dependencias | Pruebas necesarias | Prioridad |
|---|---|---|---|---|---|
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentos.jsx` | Conserva selección y contexto; la botonera solo registra `abrir`. | Agregar callback Descargar que requiera selección, consulte el endpoint autorizado, inicie la descarga y preserve el estado del listado. | Impacta HU-02, la botonera y el flujo de selección. Riesgo de iniciar solicitudes sin selección o perder página/orden. Depende del contrato de permisos. | Sin selección, descarga autorizada, error, 404 y conservación de contexto. | Obligatorio |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Constantes.js` | Ya define `apiObtenerArchivoDocumentoSTI`. | Reutilizar la constante; modificarla solo si el contrato aprobado exige otra ruta. | Evita duplicar endpoints. | Validar URL y versión API. | Recomendado |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/DetalleDocumento.jsx` | Obtiene `blob` para disponibilidad y vista previa; libera URLs temporales. | Extraer un helper común solo si la descarga y la vista previa comparten comportamiento verificable. | Riesgo de duplicar manejo de blob, MIME o liberación de recursos. | Mantener pruebas de preview y agregar casos de descarga sin regresión. | Recomendado |
| `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentosApertura.test.jsx` | Prueba apertura, preview, ausencia y errores. | Agregar PF-04 con mocks explícitos para autorización, blob, nombre y errores. | No debe presentar mocks como autorización institucional real. | Verificar contenido, nombre, no selección, permiso denegado y contexto. | Obligatorio |
| `VES/Bccr.Supen.Ves.Api/Codigo/API/Controllers/Version1/DocumentosController.cs` | Tiene endpoint protegido; devuelve `Content-Disposition: inline`, MIME permitido, máximo 10 MB y `nosniff`. | Mantener `inline` y disparar la descarga desde un blob en la UI; confirmar formalmente extensiones, MIME y límite. | Evita romper preview. Depende de la aprobación de límites y del permiso efectivo. | Código inválido, 401/403, 404, 413, 415, headers y contenido. | Obligatorio |
| `VES/Bccr.Supen.Ves.Mapi/Codigo/DA/DocumentoConsultaDA.cs` | Ejecuta `[VES].[BajarArchivo]` y devuelve bytes. | Verificar contrato de datos y resultado vacío; no cambiar SQL sin evidencia o autorización. | Depende de base de datos de pruebas y acceso institucional. Riesgo de confundir disponibilidad con permiso. | Prueba de archivo válido, ausente e inexistente. | Obligatorio |
| Servicio de permisos de botonera / HU-02 | La pantalla recibe datos para la botonera, pero no se verificó permiso Descargar efectivo para HU-04. | Conectar la acción a la opción autorizada y dejar denegación por defecto ante fallo. | Dependencia de identidad, módulo, opción y ambiente de pruebas. | Permiso permitido, denegado y servicio no disponible. | Obligatorio |
| OpenSpec de HU-04 | Existen `historia.md`, `proposal.md`, `design.md`, `specs/document-download/spec.md` y `tasks.md`. | Usar los artifacts generados como contrato de implementación y aplicar las tareas individualmente. | `enrich-us` no crea ni modifica estos artifacts adicionales. | Validar trazabilidad HU04-T01..T05. | Obligatorio |

### 4. Propuesta de mejora

#### Versión mejorada de la historia

**Como** persona usuaria autenticada y autorizada del módulo documental de
SUPEN,

**quiero** seleccionar un documento del listado y ejecutar **Descargar** desde
la botonera,

**para** obtener el archivo asociado cuando exista y mi permiso de descarga
haya sido validado en el servidor, sin perder el contexto del listado.

La implementación debe reutilizar el identificador `CodigoDocumento` y el
contrato protegido de archivo. La UI no debe acceder directamente a SQL ni
considerar suficiente ocultar el botón. El servidor debe validar el permiso,
sanear el nombre, validar MIME y extensión, limitar el tamaño configurado y
devolver errores controlados.

#### Criterios de aceptación verificables

- [ ] Con selección, permiso autorizado y archivo disponible, la descarga
      inicia y conserva nombre, extensión, MIME y contenido.
- [ ] Sin selección no se solicita el archivo y se informa que debe
      seleccionarse un documento.
- [ ] Sin permiso, el servidor responde 401/403 sin entregar bytes, aunque la
      solicitud se construya manualmente.
- [ ] Un código inválido responde 400; un documento inexistente o sin archivo
      responde 404; un formato no permitido responde 415; un archivo mayor al
      límite responde 413.
- [ ] Un error interno no expone detalles técnicos, credenciales, tokens ni
      contenido institucional.
- [ ] La descarga no cambia filtro, orden, página, selección ni desplazamiento.
- [ ] Se liberan recursos temporales del navegador y no se persiste el binario
      fuera del flujo autorizado.
- [ ] PF-04 queda registrada con evidencia real o con bloqueo explícito; un mock
      local no se marca como autorización o integración institucional aprobada.

#### Prueba funcional principal PF-04

1. Seleccionar el PDF sintético autorizado y descargarlo.
2. Verificar nombre, extensión, MIME y bytes contra el fixture.
3. Repetir sin selección.
4. Repetir con permiso denegado.
5. Repetir con archivo ausente, identificador inexistente y error del origen.
6. Confirmar que el listado conserva su contexto y registrar evidencia o
   bloqueo de cada escenario.

#### Matriz de impacto

| Área | Impacto | Estado de evidencia |
|---|---|---|
| UI y botonera | Añadir la acción Descargar y conectar la selección. | Endpoint de archivo disponible; acción de botonera no implementada en el listado. |
| API | Confirmar contrato de descarga, disposición y autorización efectiva. | Endpoint protegido y controles básicos verificados en código. |
| MAPI/DA | Obtener bytes del documento sin acceso directo desde UI. | Consulta `[VES].[BajarArchivo]` verificada; falta validación institucional. |
| Seguridad | Validar permiso del lado servidor y denegar por defecto. | `[Authorize]` verificado; permiso específico Descargar pendiente de prueba. |
| Pruebas | Cubrir PF-04 y errores sin falsear integración. | Hay pruebas de preview; faltan pruebas de descarga por botonera. |
| OpenSpec/Azure Boards | Mantener trazabilidad de HU04-T01..T05 y estado parcial. | Artifacts técnicos de planificación completos; implementación aún no iniciada por este flujo. |

### 5. Relación con OpenSpec

- `proposal.md`: justificar la descarga como acción independiente de apertura y
  delimitarla a lectura de archivos existentes.
- `design.md`: documentar flujo UI → API → MAPI → base de datos, autorización,
  disposición de contenido, MIME, límite y conservación del contexto.
- `specs/.../spec.md`: convertir los criterios, errores y PF-04 en escenarios
  verificables.
- `tasks.md`: desglosar HU04-T01 a HU04-T05, incluyendo la integración de la
  botonera, pruebas de seguridad y validación institucional.

`enrich-us` no crea esos artifacts. Ya fueron generados mediante
`openspec-propose`; su aplicación requiere iniciar explícitamente
`openspec-apply`.

### 6. Restricciones obligatorias y decisiones pendientes

- No modificar código desde `enrich-us`.
- No afirmar que HU-04 está terminada mientras no exista la acción Descargar
  en la botonera y evidencia de PF-04.
- No sustituir la autorización institucional por ocultamiento de UI o por un
  mock.
- Confirmar si el endpoint debe usar `attachment` para descarga directa o
  conservar `inline` para compartir el recurso con la previsualización.
- Confirmar extensiones y MIME permitidos, límite de tamaño, permiso exacto,
  ambiente, cuenta y evidencia aceptable para PF-04.
- Mantener la historia en estado parcial/no terminada hasta completar esas
  verificaciones.

### 7. Plan de cambios propuesto

1. **Obligatorio:** crear los artifacts completos de OpenSpec mediante
   `openspec-propose`.
2. **Obligatorio:** aprobar el contrato de descarga y la autorización efectiva.
3. **Obligatorio:** conectar Descargar en `ConsultaDocumentos.jsx` sin alterar
   el contexto del listado.
4. **Obligatorio:** cubrir PF-04 y errores en UI, API y capas de integración.
5. **Recomendado:** decidir y documentar `inline` frente a `attachment` sin
   romper la previsualización.
6. **Recomendado:** sincronizar el estado de Azure Boards conforme a evidencia,
   sin cerrar HU-04 hasta completar PF-04.
