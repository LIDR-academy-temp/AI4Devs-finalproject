# Spec Delta

## Purpose

Define cómo se consulta una solicitud de firma: su estado, su proveedor y la versión vigente del documento, con los datos que necesita el widget para mostrarlo y descargarlo.

## ADDED Requirements

### Requirement: Consulta de una solicitud de firma
`GET /api/v1/signature-requests/{id}` SHALL responder `200` con `id`, `status`, `provider`, `certificate`, `created_at`, `signed_at` y el bloque `document`. Ese bloque describe la versión vigente del documento con `id`, `external_document_id`, `version_number`, `is_active_version`, `signing_status`, `signature_level`, `file_name`, `size_bytes` y `download_url`. `download_url` MUST ser la URL absoluta del endpoint de descarga de esa versión.

#### Scenario: Solicitud recién creada
- **WHEN** se consulta una solicitud recién creada sobre un PDF de 1234 bytes llamado `resolucion.pdf`
- **THEN** la respuesta es `200` con `status` = `pending`, `provider` = `local`, `certificate` nulo y `signed_at` nulo
- **AND** `document` tiene `version_number` = 1, `is_active_version` = verdadero, `signing_status` = `pending_signature`, `file_name` = `resolucion.pdf`, `size_bytes` = 1234 y una `download_url` que termina en `/documents/{document_id}/versions/1/download`

#### Scenario: Solicitud inexistente
- **WHEN** se consulta un `id` que no corresponde a ninguna solicitud
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Identificador mal formado
- **WHEN** se consulta un `id` que no es un UUID
- **THEN** la respuesta es `422` con `code` = `validation_error`

### Requirement: Credenciales admitidas para consultar una solicitud
La consulta SHALL aceptar la API key del integrador que creó la solicitud o el `X-Signing-Token` de esa misma solicitud. Una solicitud de otro integrador, o el token de otra solicitud, MUST responderse como inexistente. Sin credenciales MUST responder `401`.

#### Scenario: Consulta con el enlace de firma
- **WHEN** el widget consulta su solicitud con el `X-Signing-Token` de esa solicitud
- **THEN** la respuesta es `200`

#### Scenario: Consulta por el integrador dueño
- **WHEN** el integrador que creó la solicitud la consulta con su `X-API-Key`
- **THEN** la respuesta es `200`

#### Scenario: Token de otra solicitud
- **WHEN** se consulta la solicitud A con el `X-Signing-Token` de la solicitud B
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Solicitud de otro integrador o cargada desde el panel
- **WHEN** un integrador consulta una solicitud creada por otro integrador o desde el panel
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Sin credenciales o con enlace vencido
- **WHEN** se consulta sin credenciales o con un `X-Signing-Token` vencido
- **THEN** la respuesta es `401` con `code` = `unauthorized`
