# Spec Delta

## Purpose

Firma diferida con el proveedor `local`: el servidor prepara el PDF, firma con su clave de demostración y entrega una versión PAdES B-B vigente sin alterar versiones anteriores.

## ADDED Requirements

### Requirement: Preparación de firma con proveedor local
`POST /api/v1/signature-requests/{id}/prepare` SHALL aceptar solicitudes `pending` con `provider` = `local` autenticadas con el `X-Signing-Token` de esa solicitud. Con `local`, el cuerpo MUST omitirse o llegar vacío. La respuesta MUST ser `200` con al menos un desafío en `challenges` y `expires_at` en el futuro.

#### Scenario: Prepare exitoso
- **WHEN** se invoca `prepare` sobre una solicitud `pending` con proveedor `local` y token de enlace válido
- **THEN** la respuesta es `200` con un `challenge_id`, el nombre del archivo, `hash_algorithm` = `SHA-256` y `hash_to_sign` en base64
- **AND** la solicitud pasa a `signing`

#### Scenario: Solicitud no pendiente
- **WHEN** se invoca `prepare` sobre una solicitud ya `signed`
- **THEN** la respuesta es `409` con `code` coherente con el contrato OpenAPI

#### Scenario: Sin token de enlace
- **WHEN** se invoca `prepare` sin `X-Signing-Token`
- **THEN** la respuesta es `401` con `code` = `unauthorized`

### Requirement: Completado de firma con proveedor local
`POST /api/v1/signature-requests/{id}/complete` SHALL, con proveedor `local`, omitir `signatures` en el cuerpo, consumir el desafío vigente de la sesión, firmar con la clave del servidor, incrustar la firma PAdES como actualización incremental y devolver `200` con la solicitud en `signed` y el bloque `document` apuntando a la nueva versión vigente.

#### Scenario: Complete exitoso
- **WHEN** se invoca `complete` inmediatamente después de un `prepare` válido con el mismo token de enlace
- **THEN** la respuesta es `200` con `status` = `signed`, `signed_at` no nulo y `document.version_number` = 2
- **AND** `document.signing_status` = `signed` e `is_active_version` = verdadero
- **AND** el PDF de v2 verifica la integridad de la firma PAdES (nivel B-B en el MVP)

#### Scenario: Desafío ya consumido
- **WHEN** se invoca `complete` dos veces seguidas con el mismo desafío
- **THEN** la segunda respuesta es `409`

#### Scenario: Desafío vencido
- **WHEN** se invoca `complete` después de `expires_at` del prepare
- **THEN** la respuesta es `409`

### Requirement: Inmutabilidad de versiones al firmar
Al completar una firma, el sistema MUST crear una nueva fila `document_version` con `origin` = `signed` y MUST actualizar `document.current_version_id` sin modificar ni eliminar filas de `document_version` existentes.

#### Scenario: Versión original intacta
- **WHEN** se completa la firma de un documento con v1 cargada
- **THEN** la descarga de v1 devuelve exactamente los mismos bytes que antes de firmar
- **AND** la descarga de v2 devuelve el PDF firmado

#### Scenario: Segunda firma incremental
- **WHEN** se completa una nueva solicitud sobre el mismo documento ya firmado (nueva v3)
- **THEN** la firma anterior en v2 sigue siendo verificable en el PDF resultante