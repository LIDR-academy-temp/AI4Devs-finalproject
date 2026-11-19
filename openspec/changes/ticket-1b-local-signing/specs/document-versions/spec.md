# Spec Delta

## ADDED Requirements

### Requirement: Coexistencia de versión original y firmada
Tras firmar con proveedor `local`, `GET /api/v1/documents/{id}/versions/{version_number}/download` SHALL servir v1 y v2 por separado. La v1 MUST conservar el binario cargado y la v2 MUST ser el PDF con firma PAdES.

#### Scenario: Descarga de v2 firmada
- **WHEN** se descarga la v2 de un documento recién firmado con credencial válida
- **THEN** la respuesta es `200` con `Content-Type` = `application/pdf`
- **AND** el contenido incluye al menos una firma PAdES verificable

#### Scenario: v1 sin cambios tras firmar
- **WHEN** se descarga la v1 del mismo documento después de crear la v2
- **THEN** la respuesta es `200` con los mismos bytes que la subida original

#### Scenario: v2 inexistente antes de firmar
- **WHEN** se pide la versión 2 de un documento que solo tiene v1
- **THEN** la respuesta es `404` con `code` = `not_found`