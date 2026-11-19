# document-intake Specification

## Purpose
Define cómo entra un documento PDF a Firmadoc, desde el panel o desde un sistema integrador, y qué deja creado: el firmante, el documento, su versión original y una solicitud de firma con la `signing_url` para el widget.

## Requirements

### Requirement: Carga de un PDF desde el panel
`POST /api/v1/admin/signing-uploads` SHALL recibir `multipart/form-data` con `file`, `signer_full_name`, `signer_identifier`, `signer_email` opcional y `provider` opcional (`local` por defecto), y responder `201` con `id`, `document_id`, `status` = `pending`, `signing_url` y `created_at`.

#### Scenario: Carga válida desde el panel
- **WHEN** el panel envía un PDF válido con nombre y CUIL del firmante
- **THEN** la respuesta es `201` con `status` = `pending` y una `signing_url`
- **AND** el documento queda con una única versión v1 de origen `uploaded`, marcada como vigente y sin sistema integrador asociado

#### Scenario: Carga sin archivo
- **WHEN** el panel envía el formulario sin `file`
- **THEN** la respuesta es `422` con `code` = `validation_error` y no se crea ningún registro

### Requirement: Envío de un PDF por un sistema integrador
`POST /api/v1/signature-requests` SHALL recibir JSON con `document_base64` y `file_name`, `signer`, `provider` opcional, `external_document_id` opcional y `callback_url` opcional, y responder `201` con el mismo cuerpo que la carga desde el panel. El documento queda asociado al integrador autenticado.

#### Scenario: Envío válido
- **WHEN** un integrador envía un PDF válido en base64 con su `external_document_id`
- **THEN** la respuesta es `201` con `signing_url`, `document_id` y `status` = `pending`
- **AND** el documento queda asociado a ese integrador con el `external_document_id` recibido

#### Scenario: Base64 inválido
- **WHEN** `document_base64` no es base64 válido
- **THEN** la respuesta es `422` con `code` = `invalid_pdf`

### Requirement: Validación del PDF recibido
Antes de guardar nada, el sistema SHALL verificar que el archivo empieza con `%PDF-`, que se puede leer como PDF, que no está cifrado y que no supera `FIRMADOC_MAX_UPLOAD_MB`. Si alguna verificación falla, MUST responder `422` sin crear ningún registro.

#### Scenario: Archivo que no es PDF
- **WHEN** se carga un archivo de texto o una imagen
- **THEN** la respuesta es `422` con `code` = `invalid_pdf` y no se crea ningún firmante, documento, versión ni solicitud

#### Scenario: PDF corrupto
- **WHEN** se carga un archivo que empieza con `%PDF-` pero cuya estructura no se puede leer
- **THEN** la respuesta es `422` con `code` = `invalid_pdf`

#### Scenario: PDF cifrado
- **WHEN** se carga un PDF protegido con contraseña
- **THEN** la respuesta es `422` con `code` = `invalid_pdf`

#### Scenario: PDF demasiado grande
- **WHEN** el archivo supera `FIRMADOC_MAX_UPLOAD_MB` megabytes
- **THEN** la respuesta es `422` con `code` = `file_too_large`

### Requirement: Registro del firmante
Toda solicitud SHALL tener un firmante con nombre y CUIL de exactamente 11 dígitos. Si ya existe un firmante con ese CUIL, MUST reutilizarse sin crear un duplicado ni modificar sus datos.

#### Scenario: Firmante nuevo
- **WHEN** se carga un documento con un CUIL que no existe
- **THEN** se crea un firmante con ese nombre, CUIL y email

#### Scenario: Firmante existente
- **WHEN** se carga un segundo documento con un CUIL ya registrado y otro nombre
- **THEN** la solicitud usa el firmante existente y sigue habiendo un único firmante con ese CUIL, con su nombre original

#### Scenario: CUIL inválido
- **WHEN** `signer_identifier` tiene guiones, menos de 11 dígitos o letras
- **THEN** la respuesta es `422` con `code` = `validation_error` y no se crea ningún registro

#### Scenario: Nombre del firmante ausente
- **WHEN** falta el nombre del firmante o está vacío
- **THEN** la respuesta es `422` con `code` = `validation_error`

### Requirement: Nueva solicitud sobre un documento existente
Un integrador SHALL poder enviar `document_id` en lugar de `document_base64` para firmar la versión vigente de un documento suyo, sin reenviar el binario ni crear una versión nueva. Exactamente uno de los dos campos MUST estar presente.

#### Scenario: Reutilización de document_id
- **WHEN** un integrador crea una solicitud con el `document_id` de un documento propio
- **THEN** la respuesta es `201` con ese mismo `document_id`
- **AND** el documento conserva la misma cantidad de versiones y queda con dos solicitudes de firma

#### Scenario: document_id desconocido o ajeno
- **WHEN** el `document_id` no existe o pertenece a otro integrador
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Ambos campos o ninguno
- **WHEN** el cuerpo trae `document_base64` y `document_id` a la vez, o ninguno de los dos
- **THEN** la respuesta es `422` con `code` = `validation_error`

### Requirement: Identificador externo único por integrador
`external_document_id` SHALL ser único dentro de cada sistema integrador. Enviar un documento nuevo con un identificador ya usado por ese integrador MUST rechazarse con `409`, indicando que se use el `document_id` existente.

#### Scenario: Identificador externo repetido
- **WHEN** un integrador envía un PDF nuevo con un `external_document_id` que ya usó
- **THEN** la respuesta es `409` con `code` = `duplicate_external_document_id` y en `details` el `document_id` existente

#### Scenario: Mismo identificador en otro integrador
- **WHEN** dos integradores distintos envían documentos con el mismo `external_document_id`
- **THEN** ambos reciben `201`

### Requirement: Proveedores admitidos y URL de aviso
El sistema SHALL aceptar los proveedores `local` y `token` y guardar `callback_url` en la solicitud. El proveedor `firmar` y una `callback_url` que no sea `http` o `https` MUST rechazarse con `422`.

#### Scenario: Proveedor reservado
- **WHEN** se crea una solicitud con `provider` = `firmar`
- **THEN** la respuesta es `422` con `code` = `unsupported_provider`

#### Scenario: callback_url guardada
- **WHEN** un integrador envía `callback_url` = `https://gestor.example.org/webhooks/firmadoc`
- **THEN** la solicitud creada guarda esa URL

#### Scenario: callback_url inválida
- **WHEN** `callback_url` es `ftp://gestor.example.org` o no es una URL
- **THEN** la respuesta es `422` con `code` = `validation_error`

### Requirement: Nombre de archivo conservado
El sistema SHALL guardar como nombre de la versión solo el nombre base del archivo recibido, sin rutas, con un máximo de 255 caracteres. Un nombre vacío tras quitar la ruta MUST rechazarse con `422`.

#### Scenario: Nombre con ruta
- **WHEN** se carga un archivo llamado `C:\expedientes\resolucion-0457.pdf`
- **THEN** la versión guarda `resolucion-0457.pdf` como nombre

#### Scenario: Nombre vacío
- **WHEN** `file_name` es vacío o solo una ruta como `carpeta/`
- **THEN** la respuesta es `422` con `code` = `validation_error`
