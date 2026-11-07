## ADDED Requirements

### Requirement: Inclusiones cambiadas en la colección
Toda petición de `POST review` de la colección SHALL enviar la `inclusionVersion` que devolvió la última lectura o corrida. El flujo `20-flows/validations/batch-issues` SHALL comprobar, después de cambiar una inclusión, que un review con la versión anterior da `409 inclusions_changed` y deja el import `analyzed`, y que el review con la vigente da `200`. `10-smoke` SHALL tener el `400` sin `inclusionVersion`.

#### Scenario: Review con una versión caducada
- **GIVEN** el flujo `batch-issues` con la versión guardada antes de cambiar una inclusión
- **WHEN** envía `POST review` con el `runId` vigente y esa versión
- **THEN** recibe `409` con `code = "inclusions_changed"`, `details.currentInclusionVersion` mayor que la versión enviada, y una lectura posterior de las validaciones trae `importStatus = "analyzed"`

#### Scenario: Review con la versión vigente
- **WHEN** el flujo envía después `POST review` con la `inclusionVersion` de la última lectura
- **THEN** recibe `200` con `importStatus = "validated"`

#### Scenario: Sin versión en smoke
- **WHEN** `10-smoke` envía `POST review` con solo `runId`
- **THEN** recibe `400` con `code = "validation_error"`
