# document-versions Specification

## Purpose
Define cómo se accede a las versiones de un documento y cómo se descargan sin alterarlas, para quien tiene derecho a verlas: el integrador dueño, el panel o el portador del enlace de firma.

## Requirements

### Requirement: Descarga de una versión
`GET /api/v1/documents/{id}/versions/{version_number}/download` SHALL devolver el binario exacto de esa versión con `Content-Type: application/pdf` y `Content-Disposition: attachment` con el nombre original del archivo.

#### Scenario: Descarga de la versión original
- **WHEN** se descarga la v1 de un documento recién cargado
- **THEN** la respuesta es `200` con los mismos bytes que se cargaron
- **AND** `Content-Disposition` lleva el nombre original del archivo

#### Scenario: Versión inexistente
- **WHEN** se pide un `version_number` que el documento no tiene
- **THEN** la respuesta es `404` con `code` = `not_found`

#### Scenario: Documento inexistente
- **WHEN** se pide un `id` de documento que no existe
- **THEN** la respuesta es `404` con `code` = `not_found`

### Requirement: Credenciales admitidas para la descarga
La descarga SHALL aceptar la API key del integrador dueño del documento, el token de administración o el token del enlace de firma de una solicitud sobre ese documento. Sin ninguna de esas credenciales MUST responder `401`.

#### Scenario: Descarga por el integrador dueño
- **WHEN** el integrador que envió el documento lo descarga con su `X-API-Key`
- **THEN** la respuesta es `200`

#### Scenario: Descarga desde el panel
- **WHEN** el panel descarga cualquier documento con el token de administración
- **THEN** la respuesta es `200`

#### Scenario: Descarga con el enlace de firma
- **WHEN** el widget descarga el documento de su solicitud con `X-Signing-Token`
- **THEN** la respuesta es `200`

#### Scenario: Descarga sin credenciales
- **WHEN** se pide la descarga sin ninguna credencial
- **THEN** la respuesta es `401` con `code` = `unauthorized`

#### Scenario: Descarga por otro integrador
- **WHEN** un integrador intenta descargar un documento de otro integrador
- **THEN** la respuesta es `404` con `code` = `not_found`
