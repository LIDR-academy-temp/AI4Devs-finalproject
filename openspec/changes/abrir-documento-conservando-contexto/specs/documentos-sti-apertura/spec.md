# Spec Delta

## Purpose

Permite a las personas usuarias autorizadas abrir un documento STI desde el listado para ver sus datos, verificar su archivo y previsualizarlo, y regresar al listado con su contexto de trabajo intacto.

## ADDED Requirements

### Requirement: Acción Abrir en el listado
El listado SHALL ofrecer la acción **Abrir**, con etiqueta accesible que incluya el título del documento, y SHALL ser una operación de solo lectura.

#### Scenario: Abrir desde una fila
- **WHEN** la persona usuaria activa **Abrir** en una fila
- **THEN** el sistema navega al detalle del documento identificado por su código sin modificar datos

#### Scenario: Activación con teclado
- **WHEN** la persona usuaria selecciona una fila y presiona Enter
- **THEN** el sistema abre el documento igual que con la acción **Abrir**

### Requirement: Datos del documento
El detalle SHALL mostrar código, título, tipo, nombre de archivo, fecha de publicación (`yyyy-MM-dd`), usuario que publicó, fecha de caducidad (mostrando «Vigencia indefinida» cuando no exista caducidad) y el resumen en un campo multilínea de solo lectura.

#### Scenario: Documento con resumen y usuario
- **WHEN** se abre un documento con resumen y usuario que publicó
- **THEN** el detalle muestra el usuario en «Publicado por» y el resumen completo en un campo multilínea de solo lectura que conserva los saltos de línea

#### Scenario: Documento sin resumen
- **WHEN** se abre un documento con resumen nulo o vacío
- **THEN** el campo de resumen se muestra vacío con el texto «Sin resumen»

#### Scenario: Documento con caducidad
- **WHEN** se abre un documento con fecha de caducidad
- **THEN** el detalle muestra la fecha en formato `yyyy-MM-dd`

#### Scenario: Documento sin caducidad
- **WHEN** se abre un documento con `FechaCaduca` nula
- **THEN** el detalle muestra «Vigencia indefinida»

#### Scenario: Documento inexistente o no elegible
- **WHEN** el código no existe o el documento dejó de ser elegible
- **THEN** el API responde 404 y la UI muestra «El documento no está disponible» con opción de volver al listado

### Requirement: Datos sin contenido binario
Los metadatos y el listado MUST NOT incluir el contenido binario del documento; el binario SHALL obtenerse solo mediante el endpoint de archivo.

#### Scenario: Respuesta de metadatos
- **WHEN** se consultan los metadatos de un documento
- **THEN** la respuesta no contiene `Documento` ni su equivalente serializado

### Requirement: Disponibilidad del archivo
La UI SHALL indicar si el archivo está **Disponible**, **No disponible** o **No se pudo verificar**, usando los metadatos y la respuesta 404 del endpoint de archivo cuando el contenido es nulo.

#### Scenario: Archivo disponible
- **WHEN** el documento tiene nombre de archivo y contenido
- **THEN** la UI muestra «Disponible»

#### Scenario: Archivo no disponible
- **WHEN** el nombre de archivo o el contenido es nulo
- **THEN** la UI muestra «No disponible» y no intenta la previsualización

#### Scenario: Fallo al verificar
- **WHEN** la verificación falla por error de red o de servicio
- **THEN** la UI muestra «No se pudo verificar», ofrece reintentar y conserva los datos del documento

### Requirement: Previsualización del archivo
La UI SHALL previsualizar dentro del detalle los archivos PDF disponibles y MUST NOT ejecutar scripts ni inyectar el contenido como HTML.

#### Scenario: Archivo PDF
- **WHEN** el archivo disponible es PDF y no excede el límite de tamaño
- **THEN** la UI lo muestra en un contenedor con título accesible

#### Scenario: Formato no previsualizable
- **WHEN** el archivo es `.doc`, `.docx`, `.ppt` o `.pptx`
- **THEN** la UI muestra «Vista previa no disponible para este formato» sin error y conserva los datos y la disponibilidad

#### Scenario: Archivo excede el límite
- **WHEN** el archivo supera el límite de tamaño definido
- **THEN** la UI informa que no se previsualiza y no descarga su contenido

#### Scenario: Salida del detalle
- **WHEN** la persona usuaria sale del detalle
- **THEN** la UI libera la URL temporal del archivo y no deja el contenido persistido en el navegador

#### Scenario: Fallo de previsualización aislado
- **WHEN** la previsualización falla
- **THEN** los datos del documento y la acción de volver siguen disponibles

### Requirement: Listado ordenable y paginado
El listado SHALL permitir ordenar y paginar los documentos, conservando el orden por defecto de `FechaPublicacion` descendente.

#### Scenario: Cambio de orden
- **WHEN** la persona usuaria ordena por una columna
- **THEN** el listado se reorganiza según la columna y dirección elegidas

#### Scenario: Cambio de página
- **WHEN** la persona usuaria cambia de página o de tamaño de página
- **THEN** el listado muestra el conjunto de filas correspondiente

### Requirement: Restauración del contexto del listado
Al regresar del detalle, el sistema SHALL restaurar el filtro por tipo, el ordenamiento, la paginación, la selección y la posición de desplazamiento del listado, y SHALL devolver el foco a la acción **Abrir** de la fila seleccionada.

#### Scenario: Volver al listado
- **WHEN** la persona usuaria activa **Volver al listado**
- **THEN** el listado reaparece con el estado previo y vuelve a consultar con los parámetros guardados

#### Scenario: Botón Atrás del navegador
- **WHEN** la persona usuaria usa «Atrás» desde el detalle
- **THEN** el listado se restaura igual que con **Volver al listado**

#### Scenario: Recarga del detalle
- **WHEN** la persona usuaria recarga el detalle y luego regresa en la misma pestaña
- **THEN** el listado conserva el estado guardado

#### Scenario: Desplazamiento y selección tras la carga
- **WHEN** termina la carga de datos del listado restaurado
- **THEN** se aplican la selección y la posición de desplazamiento guardadas

### Requirement: Estado restaurado obsoleto o inválido
El sistema SHALL degradar sin errores visibles cuando el estado guardado ya no es válido.

#### Scenario: Tipo ya no activo
- **WHEN** el tipo guardado ya no figura entre los tipos activos
- **THEN** el listado usa el filtro **Todos**

#### Scenario: Página o selección inexistente
- **WHEN** la página guardada excede el total o el documento seleccionado ya no figura
- **THEN** el listado muestra la última página válida o sin selección

#### Scenario: Estado corrupto
- **WHEN** el estado guardado es ilegible o inválido
- **THEN** se ignora y se muestra el listado por defecto

### Requirement: Alcance del estado guardado
El estado guardado SHALL ser por pestaña, contener solo parámetros de consulta e identificadores, y descartarse al cerrar sesión.

#### Scenario: Contenido del estado
- **WHEN** se guarda el estado del listado
- **THEN** no incluye datos de documentos ni contenido binario

#### Scenario: Cierre de sesión
- **WHEN** la persona usuaria cierra sesión
- **THEN** el estado guardado se elimina

### Requirement: Endpoints de apertura protegidos
Los endpoints de metadatos y de archivo SHALL requerir usuario autenticado y autorizado, validar el código como entero positivo y devolver errores genéricos en español.

#### Scenario: Solicitud no autenticada
- **WHEN** se invoca un endpoint sin credenciales válidas
- **THEN** responde 401 o 403 sin entregar contenido

#### Scenario: Código inválido
- **WHEN** el código no es un entero positivo
- **THEN** responde 400 con mensaje comprensible en español

#### Scenario: Error interno
- **WHEN** ocurre un error en API, MAPI o base de datos
- **THEN** la respuesta es un mensaje genérico en español y el detalle técnico queda solo en el registro del servidor

### Requirement: Entrega segura del archivo
El endpoint de archivo SHALL devolver el binario con el tipo de contenido validado contra las extensiones permitidas, `X-Content-Type-Options: nosniff` y un nombre de archivo saneado.

#### Scenario: Archivo existente
- **WHEN** se solicita el archivo de un documento elegible
- **THEN** responde 200 con el binario, tipo de contenido permitido y `Content-Disposition: inline`

#### Scenario: Archivo inexistente
- **WHEN** el documento no existe o su archivo es nulo
- **THEN** responde 404
