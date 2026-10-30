# Spec Delta

## Purpose

Define la consulta autorizada y de solo lectura de documentos STI, incluidos el filtro por tipo, los criterios de elegibilidad, los campos de respuesta y los estados de carga, lista vacía y error visibles para la persona usuaria.

## ADDED Requirements

### Requirement: Consulta de tipos activos
El sistema MUST proporcionar a las personas usuarias autenticadas los tipos de documento STI cuyo estado sea activo (`Estado = 'A'`).

#### Scenario: Listar tipos activos
- **WHEN** an authenticated user opens the document consultation
- **THEN** the type selector contains only types whose state is `A`, with each type's code and name

#### Scenario: No hay tipos activos
- **WHEN** the type catalog contains no active types
- **THEN** the selector contains no document types and the consultation does not present inactive types as selectable

### Requirement: Filtrar documentos por tipo seleccionado
El sistema MUST devolver únicamente documentos elegibles asociados con el código del tipo seleccionado.

#### Scenario: Consultar un tipo seleccionado
- **WHEN** an authenticated user selects an active document type
- **THEN** the result contains only eligible documents associated with that type code

#### Scenario: El tipo seleccionado no tiene documentos elegibles
- **WHEN** the selected type has no eligible documents
- **THEN** the document list is empty and the UI displays a comprehensible empty-list message in Spanish

### Requirement: Consultar todos los tipos
El sistema MUST permitir el filtro **Todos**, que incluye documentos elegibles asociados con cualquier tipo no nulo, activo o inactivo.

#### Scenario: Consultar Todos
- **WHEN** an authenticated user selects **Todos**
- **THEN** the result includes eligible documents of active and inactive types and excludes documents without an associated type

### Requirement: Elegibilidad por archivo asociado
El sistema MUST incluir solo documentos con valores no nulos en `NombreArchivo` y en el binario `Documento`, sin devolver el valor binario.

#### Scenario: Documento con nombre y contenido
- **WHEN** a document has a non-null file name and non-null binary content
- **THEN** it remains eligible for the other consultation filters

#### Scenario: Documento sin nombre o sin contenido
- **WHEN** a document has a null `NombreArchivo` or null `Documento`
- **THEN** it is excluded from the result

### Requirement: Elegibilidad por vigencia
_Decisión 2026-10-22 (solicitante): el listado muestra también los documentos caducados; la fecha de caducidad no excluye documentos._

El sistema MUST incluir documentos independientemente de su `FechaCaduca` (nula, futura, de hoy o vencida).

#### Scenario: Documento sin fecha de caducidad
- **WHEN** an otherwise eligible document has `FechaCaduca` set to null
- **THEN** it is included

#### Scenario: Documento con caducidad hoy
- **WHEN** an otherwise eligible document's `FechaCaduca` falls on the database server's current calendar date, including a timestamp at midnight
- **THEN** it is included

#### Scenario: Documento vencido
- **WHEN** an otherwise eligible document's `FechaCaduca` falls before the database server's current calendar date
- **THEN** it is included

### Requirement: Ordenar documentos por fecha de publicación
El sistema MUST devolver los documentos coincidentes ordenados por `FechaPublicacion` descendente, de la fecha más reciente a la más antigua.

#### Scenario: Resultados con distintas fechas
- **WHEN** two or more eligible documents match the selected filter
- **THEN** documents are returned in descending `FechaPublicacion` order

### Requirement: Limitar los campos del resultado
El sistema MUST devolver por fila únicamente el código del documento, nombre de archivo, nombre del tipo, título y fecha de publicación; MUST NOT serializar el binario `Documento`.

#### Scenario: Devolver una fila del listado
- **WHEN** an eligible document is returned
- **THEN** the row contains the document code, file name, type name, title, and `FechaPublicacion` formatted as `yyyy-MM-dd`, and contains no binary document data

### Requirement: Mostrar estados de consulta y errores comprensibles
La UI MUST indicar que la consulta está cargando mientras obtiene tipos o documentos, mostrar un mensaje de lista vacía si no hay coincidencias y presentar un error comprensible en español sin detalles técnicos cuando falle una solicitud.

#### Scenario: Carga de tipos o documentos
- **WHEN** the UI is waiting for a type or document request to complete
- **THEN** it indicates that the consultation is loading

#### Scenario: Error al consultar
- **WHEN** a type or document request fails
- **THEN** the UI displays a Spanish message that does not expose exception details, SQL, or infrastructure information

### Requirement: Proteger la consulta de documentos
La API MUST requerir una persona usuaria VES autenticada y autorizada para consultar tipos y documentos, y MUST NOT devolver datos de documentos ante solicitudes no autenticadas o no autorizadas.

#### Scenario: Solicitud sin autenticación
- **WHEN** a request to either API consultation operation has no accepted user authentication
- **THEN** the API denies access with the authentication response configured for VES and returns no catalog or document data

#### Scenario: Solicitud de usuario autenticado
- **WHEN** an authorized user calls a consultation operation
- **THEN** the API obtains the result through the configured API-to-MAPI service path

### Requirement: Validar el parámetro del filtro
La operación de lista MUST aceptar un código de tipo positivo o el valor heredado `-1` para **Todos**, y MUST rechazar valores que no representen ninguna de esas opciones.

#### Scenario: Parámetro inválido
- **WHEN** the document-list operation receives a type value that is neither a positive integer nor `-1`
- **THEN** the API returns a client error and the UI shows a comprehensible Spanish message without technical details

#### Scenario: Ningún resultado para un código válido
- **WHEN** a positive type code is valid as an integer but has no eligible documents
- **THEN** the operation returns an empty list rather than treating the result as a technical error
