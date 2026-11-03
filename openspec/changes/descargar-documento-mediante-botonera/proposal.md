# Proposal

## Why

HU-04 define la descarga de solo lectura del archivo asociado al documento
seleccionado, pero la pantalla del listado todavía expone únicamente la acción
`abrir` en la botonera. Aunque el API ya cuenta con un endpoint protegido para
obtener el archivo y la vista de detalle lo utiliza para disponibilidad y
previsualización, falta conectar la acción Descargar al flujo de selección,
demostrar la autorización efectiva y completar PF-04 sin perder el contexto del
listado.

## What Changes

- Incorporar la acción estándar **Descargar** en la botonera del listado de
  documentos, condicionada por selección y por la opción de seguridad recibida.
- Reutilizar el identificador `CodigoDocumento` y el endpoint protegido de
  archivo sin permitir acceso de la UI a MAPI o SQL Server.
- Iniciar la descarga en el navegador con nombre, extensión, MIME y contenido
  coherentes con el archivo autorizado.
- Mantener filtro, orden, página, selección y desplazamiento del listado después
  de la descarga.
- Validar en el servidor autenticación, autorización, identificador,
  disponibilidad, extensión, MIME y límite de tamaño, independientemente de la
  visibilidad del botón.
- Manejar sin generar archivos falsos la ausencia de selección, permiso
  denegado, identificador inválido, documento inexistente, archivo ausente,
  formato no permitido, tamaño excedido y errores del origen.
- Preparar fixtures sintéticos y pruebas para PF-04, distinguiendo evidencia
  local de autorización o integración institucional real.
- Documentar el contrato, las decisiones sobre `Content-Disposition`, los
  límites permitidos y las dependencias del ambiente de pruebas.

## Capabilities

### New Capabilities

- `document-download`: Descarga autorizada y segura del archivo de un documento
  seleccionado desde la botonera, con conservación del contexto del listado y
  manejo verificable de errores.

### Modified Capabilities

Ninguna. No existen especificaciones de capacidades previas en este workspace;
la consulta `openspec list --specs` no encontró specs existentes.

## Impact

- **UI:** `VES/Bccr.Supen.Ves.UI/Codigo/src/Documentacion/Documentos/ConsultaDocumentos.jsx`
  debe conectar Descargar a la selección y preservar el estado del listado.
  `DetalleDocumento.jsx` ya obtiene blobs para disponibilidad y previsualización;
  puede aportar lógica reutilizable si se confirma que no se mezclan sus
  responsabilidades.
- **Contrato UI/API:** `VES/Bccr.Supen.Ves.UI/Codigo/src/Constantes.js` ya define
  `Documentos/{codigoDocumento}/Archivo`; debe mantenerse como contrato único
  salvo que la especificación aprobada determine otro comportamiento.
- **API:** `DocumentosController.cs` ya expone el endpoint protegido, valida
  código, MIME, extensión y tamaño, y agrega `nosniff`. Debe confirmarse la
  disposición `inline` frente a `attachment` y la autorización específica de
  Descargar.
- **MAPI y datos:** `DocumentoConsultaDA.cs` obtiene bytes mediante
  `[VES].[BajarArchivo]`; no se contemplan cambios de esquema ni de
  procedimientos almacenados.
- **Seguridad:** la autorización efectiva debe validarse del lado servidor; el
  ocultamiento o habilitación de la opción en la botonera no es suficiente.
- **Pruebas:** ampliar las pruebas UI/API/MAPI existentes para selección,
  descarga, errores, headers, contenido y PF-04. Las pruebas manuales que
  requieran GAUDI, permisos institucionales o ambiente de pruebas deben
  registrarse como verificadas o bloqueadas, nunca simularse como aprobadas.
- **Trazabilidad:** HU04-T01 a HU04-T05 se mantienen como tareas individuales.
  Este cambio no implica cerrar HU-04 ni ninguna tarea por la sola existencia de
  la propuesta.