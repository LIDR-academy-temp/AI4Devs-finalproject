# Spec Delta

## MODIFIED Requirements

### Requirement: Consulta de una solicitud de firma
`GET /api/v1/signature-requests/{id}` SHALL responder `200` con `id`, `status`, `provider`, `certificate`, `created_at`, `signed_at` y el bloque `document`. Ese bloque describe la versión vigente del documento con `id`, `external_document_id`, `version_number`, `is_active_version`, `signing_status`, `signature_level`, `file_name`, `size_bytes` y `download_url`. `download_url` MUST ser la URL absoluta del endpoint de descarga de esa versión.

#### Scenario: Solicitud recién creada
- **WHEN** se consulta una solicitud recién creada sobre un PDF de 1234 bytes llamado `resolucion.pdf`
- **THEN** la respuesta es `200` con `status` = `pending`, `provider` = `local`, `certificate` nulo y `signed_at` nulo
- **AND** `document` tiene `version_number` = 1, `is_active_version` = verdadero, `signing_status` = `pending_signature`, `file_name` = `resolucion.pdf`, `size_bytes` = 1234 y una `download_url` que termina en `/documents/{document_id}/versions/1/download`

#### Scenario: Solicitud firmada
- **WHEN** se consulta una solicitud `signed` tras completar el proveedor `local`
- **THEN** la respuesta es `200` con `status` = `signed`, `signed_at` no nulo y `certificate` con `subject` y `serial_number`
- **AND** `document` tiene `version_number` = 2, `signing_status` = `signed`, `signature_level` coherente con PAdES B-B y una `download_url` que termina en `/versions/2/download`

#### Scenario: Solicitud inexistente
- **WHEN** se consulta un `id` que no corresponde a ninguna solicitud
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Identificador mal formado
- **WHEN** se consulta un `id` que no es un UUID
- **THEN** la respuesta es `422` con `code` = `validation_error`