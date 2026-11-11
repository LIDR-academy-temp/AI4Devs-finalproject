## ADDED Requirements

### Requirement: Batch sin filas asociadas en la colección
El flujo `20-flows/validations/batch-wrong-account` SHALL subir `batch-wrong-account` a `ProviderA-USD`, analizarlo, validarlo, comprobar el aviso y la confirmación de review, vista previa y procesar, y cancelar el import sin procesarlo, para no consumir números de batch de `ProviderA-USD`. La vista previa de `batch-clean` SHALL comprobar que no pide la confirmación. El flujo SHALL poder repetirse sin sembrar.

#### Scenario: Flujo del archivo de otra cuenta
- **GIVEN** `analyst` y el `accountId` de `ProviderA-USD`
- **WHEN** se ejecuta `20-flows/validations/batch-wrong-account`
- **THEN** analizar da `200` con `analysis.rows.matched = 0`, `analysis.requiresEmptyBatchConfirmation = true`, `analysis.likelyWrongAccount = true` y `unmatchedByReason.id_format` igual a las filas sin asociar
- **AND** `POST review` sin `confirmEmptyBatch` da `409 no_matched_rows` con `details.likelyWrongAccount = true`, y con `confirmEmptyBatch: true` da `200` con el import `validated`
- **AND** la vista previa da `200` con `requiresEmptyBatchConfirmation = true` y `emptyBatch.likelyWrongAccount = true`
- **AND** procesar sin `confirmEmptyBatch` da `409 no_matched_rows` sin crear ningún intento, y cancelar con motivo da `200 cancelled`

#### Scenario: batch-clean sin confirmación de batch vacío
- **WHEN** el flujo `batch-clean` pide la vista previa
- **THEN** la respuesta trae `requiresEmptyBatchConfirmation = false` y `emptyBatch = null`

#### Scenario: Canal de otro proveedor en batch-blocked
- **WHEN** el flujo `batch-blocked` analiza su import
- **THEN** RAM-01 viene en `channels` con `otherProvider = true`

#### Scenario: Dos pasadas seguidas
- **WHEN** se ejecuta `pnpm test:api` dos veces sin `pnpm db:seed` entre medias
- **THEN** el flujo `batch-wrong-account` pasa las dos veces y deja un import `cancelled` más por pasada, sin ningún intento nuevo en `ProviderA-USD`
