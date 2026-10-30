# Historia: Abrir un documento desde el listado conservando el contexto

## Original

> Como usuario autorizado del módulo documental de VES, quiero seleccionar un documento desde el listado de documentos y utilizar la acción estándar «Abrir» para consultar sus datos, verificar la disponibilidad de su archivo y previsualizarlo, para conocer su información sin perder el contexto de trabajo.
>
> Al regresar al listado, el sistema debe restaurar su estado previo, incluyendo filtros, ordenamiento, paginación, selección y posición de desplazamiento, según corresponda.

## Enhanced

### Historia de usuario

**Como** persona usuaria autenticada y autorizada del módulo documental de VES,

**quiero** seleccionar un documento del listado y ejecutar la acción estándar **Abrir** para ver sus datos, saber si su archivo está disponible y previsualizarlo,

**para** conocer su información sin perder el contexto de trabajo; al volver, el listado debe quedar tal como lo dejé.

### Estado actual verificado en el repositorio

- UI: [`ConsultaDocumentos.jsx`](../../../VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentos.jsx) solo tiene filtro por tipo (`codigoTipo`, `-1` = Todos) y estado en `useState` local. No hay paginación, ordenamiento interactivo, selección ni acción «Abrir»; el estado se pierde al desmontar el componente.
- API: [`IDocumentosController`](../../../VES/Bccr.Supen.Ves.Api/Codigo/Bccr.Supen.Ves.Abstracciones/API/IDocumentosController.cs) solo expone `GET Documentos/Tipos` y `GET Documentos?codigoTipo=`. No existen endpoints de metadatos, disponibilidad ni contenido del archivo en las capas `API`, `SI.SG`, `MAPI`, `BW` ni `DA`.
- El listado (historia `consultar-documentos-filtrados-por-tipo`) devuelve código, nombre de archivo, tipo, título y `FechaPublicacion`; no devuelve el binario `Documento`.
- `docs/exercise.md` y `prompts_etapa2.md` mencionan metadatos, `BajarArchivo`, extensiones `.doc/.docx/.pdf/.ppt/.pptx` y tope de 10 MB; esos contratos están **pendientes de verificar contra implementación real**.

Esta historia **depende** de que esos endpoints se implementen o confirmen; no se asume que existan.

### Alcance

**Incluye**
1. Acción **Abrir** por fila del listado (botón accesible; también Enter sobre la fila seleccionada).
2. Vista de detalle con datos del documento, estado de disponibilidad del archivo y previsualización.
3. Regreso al listado con restauración de estado: filtro por tipo, ordenamiento, paginación, selección y posición de desplazamiento.
4. Ordenamiento y paginación del listado, necesarios para que la restauración tenga sentido (ver D1).

**Excluye**: crear, editar, eliminar, subir archivos, edición de metadatos y funcionalidades del README evolucionado de VES Documentos. La descarga solo se incluye si se decide explícitamente (D4).

### Flujo funcional

1. La persona filtra, ordena y pagina el listado y selecciona una fila.
2. Ejecuta **Abrir**. Antes de navegar, la UI guarda el estado del listado.
3. La UI navega a una ruta de detalle identificada por `CodigoDocumento` (p. ej. `/documentos/:codigoDocumento`), compatible con recarga y botón «Atrás».
4. El detalle carga metadatos, disponibilidad y previsualización; cada parte muestra su propio estado de carga/error sin bloquear a las demás.
5. La persona regresa con **Volver al listado** o «Atrás». El listado reaparece con el estado guardado.

### Criterios de aceptación

**A. Acción Abrir**
1. **Abrir** se ofrece mediante la `Botonera` común (opciones de seguridad del usuario) y actúa sobre la fila seleccionada (también doble clic o Enter/espacio). _Decisión 2026-10-22: sustituye el botón por fila; las opciones de la Botonera sin implementar avisan «Opción no disponible aún»._ Sin selección avisa «Debe seleccionar un documento para abrirlo.».
2. Abrir es de solo lectura y no modifica datos.
3. Si el documento ya no existe, el detalle muestra «El documento no está disponible» y ofrece volver al listado. _Decisión 2026-10-22: un documento caducado sí se puede abrir (la caducidad solo filtra el listado)._

**B. Datos del documento**
4. El detalle muestra como mínimo: código, título, tipo, nombre de archivo, fecha de publicación (`yyyy-MM-dd`) y fecha de caducidad (o «Vigencia indefinida» si `FechaCaduca` es `NULL`).
5. `Resumen` (campo multilínea de solo lectura) y `UsuarioPublica` («Publicado por») se muestran en el detalle _(D3 aprobado 2026-10-22)_; `Publico` no se muestra.
6. Un código inexistente devuelve `404` y la UI muestra el mensaje del criterio 3.

**C. Disponibilidad del archivo**
7. La UI muestra: **Disponible**, **No disponible** (nombre de archivo o contenido nulo) o **No se pudo verificar** (error de red/servicio, con reintento).
8. La verificación no transfiere el binario; se resuelve con un indicador en los metadatos (`archivoDisponible`, `tamanioBytes`).

**D. Previsualización**
9. Si el archivo está disponible y es PDF, se muestra en el detalle dentro de un contenedor con título accesible.
10. Para `.doc`, `.docx`, `.ppt`, `.pptx` se muestra «Vista previa no disponible para este formato» sin error, conservando datos y estado (sujeto a D2).
11. El archivo no se carga en el listado ni se persiste en el navegador; la URL `blob:` se libera con `URL.revokeObjectURL` al salir del detalle.
12. Archivos que excedan el límite (10 MB según etapa 2, por confirmar) no se previsualizan y se informa.
13. Se valida que tipo de contenido y extensión estén permitidos antes de renderizar; el contenido nunca se inyecta como HTML.

**E. Restauración del contexto del listado**
14. Se restauran, según apliquen: `codigoTipo`, columna y dirección de orden, página y tamaño de página, documento seleccionado (`CodigoDocumento`) y posición de desplazamiento.
15. Funciona con **Volver al listado** y con «Atrás»; tras recargar el detalle, volver conserva el estado mientras la pestaña siga activa.
16. El estado es por pestaña (`sessionStorage` o URL/`location.state`), no entre usuarios, y solo contiene identificadores y parámetros de consulta, sin datos de documentos ni binarios. Se descarta al cerrar sesión.
17. Al restaurar, la UI vuelve a consultar con los parámetros guardados (no reutiliza datos obsoletos); desplazamiento y selección se aplican cuando terminó la carga.
18. Si el tipo guardado ya no está activo, la página ya no existe o el documento seleccionado ya no figura, se degrada sin errores: filtro **Todos**, última página válida o sin selección; el desplazamiento se ajusta.
19. Un estado guardado corrupto o inválido se ignora y se muestra el listado por defecto.
20. El foco de teclado regresa a la acción **Abrir** de la fila previamente seleccionada.

**F. Estados de la UI y errores**
21. Cada carga muestra indicador de progreso; los errores se muestran en español sin detalles técnicos, y el detalle se registra con el mecanismo existente.
22. Un fallo de previsualización no impide ver metadatos ni volver al listado.

**G. Autorización**
23. Los endpoints requieren usuario autenticado y autorizado (`[Authorize]` y autorización VES); sin credenciales responden `401/403` sin entregar contenido.
24. La ruta de detalle exige el mismo permiso que el listado.

### Contratos HTTP propuestos (pendientes de verificar contra implementación real)

| Método | Ruta | Resultado |
|---|---|---|
| `GET` | `/Documentos/{codigoDocumento}?api-version=1.0` | `200` metadatos y disponibilidad (sin binario); `404` si no existe; `400` si el código es inválido. |
| `GET` | `/Documentos/{codigoDocumento}/Archivo?api-version=1.0` | `200` binario con `Content-Type` y `Content-Disposition: inline`; `404` si no existe o el archivo es nulo. |
| `GET` | `/Documentos?codigoTipo={}&pagina={}&tamanioPagina={}&ordenarPor={}&direccion={}&api-version=1.0` | Extiende el listado con paginación/orden en servidor (sujeto a D1); parámetros opcionales para compatibilidad. |

Respuesta de metadatos (propuesta):

```json
{
  "codigo": 123,
  "titulo": "string",
  "tipo": "string",
  "nombreArchivo": "string",
  "fechaPublicacion": "yyyy-MM-dd",
  "fechaCaduca": "yyyy-MM-dd | null",
  "archivoDisponible": true,
  "tamanioBytes": 12345
}
```

Errores: `400`, `401`, `403`, `404`, `5xx` con mensaje público genérico en español y detalle solo en el registro del servidor.

### Componentes afectados (UI → API → MAPI → SQL Server)

- **UI** (`VES/Bccr.Supen.Ves.UI/Codigo/src`): `Documentacion/Documentos/ConsultaDocumentos.jsx` (acción Abrir, orden, paginación, selección, captura/restauración); nuevo `DetalleDocumento.jsx`; hook opcional de persistencia del estado del listado; `Dashboard.jsx`/navegación con `react-router-dom` (ya presente) y autorización; `Constantes.js` con los nuevos endpoints; reutilizar `httpCliente`, `AlertError` y MUI (`TablePagination`, `TableSortLabel`).
- **API** (`VES/Bccr.Supen.Ves.Api/Codigo`): ampliar `IDocumentosController`/`DocumentosController` v1, `IDocumentosSG`/`DocumentosSG` y contenedores (`DocumentoDetalle`); el endpoint de archivo retransmite el flujo desde MAPI.
- **MAPI** (`VES/Bccr.Supen.Ves.Mapi/Codigo`): `IDocumentosController`, `DocumentosController`, `IDocumentosBW`/`DocumentosBW`, `IDocumentosDA`/`DocumentoConsultaDA` y modelos; el archivo usa `BajarArchivo` y los metadatos se proyectan sin `Documento`.
- **SQL Server / DBA**: confirmar procedimientos de metadatos y descarga, y cómo calcular disponibilidad/tamaño sin leer el binario completo. Sin migraciones EF.
- **Documentación**: contrato de endpoints, `docs/data-model.md`, `docs/exercise.md` (estado de verificación) y guía de UI si cambia la navegación.

### Decisiones abiertas (resolver antes de implementar)

- **D1 – Paginación y orden**: ¿en servidor (cambia contrato y procedimientos) o en cliente? Hoy el listado ordena por `FechaPublicacion` descendente en SQL.
- **D2 – Previsualización**: ¿solo PDF nativo o conversión de Office?
- **D3 – Campos del detalle**: ¿se permiten `Resumen`, `Publico`, `UsuarioPublica`?
- **D4 – Descarga**: ¿botón «Descargar» o fuera de alcance?
- **D5 – Persistencia**: `sessionStorage` frente a parámetros en la URL. Recomendado: filtros/orden/página en la URL; selección y desplazamiento en `sessionStorage`.
- **D6 – «Según corresponda»**: confirmar qué elementos no se restauran (p. ej. selección tras recarga completa).
- **D7 – Límite de tamaño y permisos por tipo de documento**, si existen.

### Definición de terminado

- Criterios A–G implementados; contratos confirmados contra la implementación real y D1–D7 documentadas.
- Pruebas unitarias:
  - UI: acción Abrir y accesibilidad; detalle (disponible/no disponible/error/404); previsualización PDF y formato no soportado; liberación de `blob:`; ida y vuelta con restauración de filtro, orden, página, selección y desplazamiento; estado inválido/obsoleto; foco.
  - API y MAPI: controlador (200/400/401/403/404/5xx), `SG`, `BW`, `DA`; los metadatos no serializan `Documento`.
- Pasan las suites de UI, API y MAPI pertinentes; verificación de extremo a extremo en ambiente no productivo, sin afirmar que se consultó la base desplegada si no se hizo.
- Documentación actualizada; sin edición, eliminación ni subida de archivos.

### Requisitos no funcionales

- **Seguridad**: autorización en cada endpoint; validar `codigoDocumento` como entero positivo; no exponer rutas ni trazas; `X-Content-Type-Options: nosniff` y `Content-Disposition` con nombre saneado; previsualización sin ejecución de scripts (`<iframe sandbox>` o visor PDF); registrar accesos sin datos sensibles.
- **Rendimiento**: metadatos sin binario (objetivo p95 ≤ 1 s, a validar); archivo en flujo y con tope de tamaño; listado y detalle independientes; la restauración no genera más de una consulta de listado.
- **Accesibilidad**: teclado, ARIA, `aria-busy`, anuncio de estados y foco restaurado.
- **Observabilidad**: registrar aperturas, errores y tiempos con el logging actual y correlación.
- **Compatibilidad**: parámetros nuevos del listado opcionales; sin romper consumidores.
- **Idioma**: mensajes y etiquetas en español.
