## ADDED Requirements

### Requirement: status_mismatch con el gateway en Pending
Una fila E con un estado resuelto distinto de `Pending` cuya transacción está `Pending` en el gateway SHALL producir un hallazgo `status_mismatch` (#63), no bloqueante, con la fila incluida por defecto, el estado reportado y el del gateway, y resoluble a mano; suma al `issueCount` de `non_recorded_adjustment`. La fila se procesa con su propio estado. Una fila E cuyo propio estado es `Pending` o no está resuelto SHALL no compararse.

#### Scenario: APP y DEC con el gateway Pending
- **GIVEN** una fila DEC y una fila APP cuyas transacciones están `Pending` en el gateway
- **WHEN** se valida
- **THEN** hay dos hallazgos `status_mismatch` en ciclo E, con `blocking = 0`, la fila incluida por defecto, estado reportado `Declined` y `Successful` respectivamente y estado del gateway `Pending`
- **AND** `non_recorded_adjustment` es `warning` y su `issueCount` los cuenta

#### Scenario: Gateway Pending con un estado de ajuste en E
- **GIVEN** una fila E de una hoja con estado por columna que reporta `Refund`, cuya transacción está `Pending` en el gateway
- **WHEN** se valida
- **THEN** hay un hallazgo `status_mismatch` con estado reportado `Refund` y estado del gateway `Pending`

#### Scenario: Fila Pending o sin estado con el gateway Pending
- **GIVEN** una fila E cuyo estado leído es `Pending` y otra cuyo estado no se pudo resolver, ambas de transacciones `Pending` en el gateway
- **WHEN** se valida
- **THEN** ninguna produce hallazgo `status_mismatch`

#### Scenario: Gateway Pending contra la base
- **GIVEN** un proveedor, un canal y una cuenta aislados creados por el test (para no alterar los conteos de otras suites), con una transacción `Pending` que un import de esa cuenta trae en APP, otra `Pending` dentro del rango que no viene en el archivo y dos `Successful` que abren el rango APP
- **WHEN** se valida y se lee el hallazgo con `GET /api/v1/validation-issues/{id}`
- **THEN** es `status_mismatch` en ciclo E con estado reportado `Successful` y del gateway `Pending`, `pendingInRangeCount = 1`, se resuelve a mano con `PATCH` y nota, y procesar el import produce un movimiento E `Successful` de esa transacción

### Requirement: Batch sin filas asociadas al revisar
Si el import no tiene filas asociadas (`requiresEmptyBatchConfirmation`), `POST /api/v1/imports/{id}/review` SHALL exigir `confirmEmptyBatch: true` en el cuerpo; sin él (o con `false`) SHALL responder `409 no_matched_rows` con `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }`, sin cambiar el import. Las comprobaciones de la corrida van antes. Con la confirmación, la auditoría `import.review` SHALL llevar `emptyBatchConfirmed: true`.

#### Scenario: Batch sin filas asociadas sin confirmar
- **GIVEN** `batch-wrong-account` analizado y validado en `ProviderA-USD`
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente y sin `confirmEmptyBatch` (o con `false`)
- **THEN** recibe `409 no_matched_rows` con `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount: true }` según `expected.json`, el import sigue `analyzed` y no hay auditoría `import.review`

#### Scenario: Batch sin filas asociadas confirmado
- **GIVEN** `batch-wrong-account` analizado y validado
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente y `confirmEmptyBatch: true`
- **THEN** recibe `200` con `importStatus = "validated"` y la fila `import.review` de `AuditLog` lleva `emptyBatchConfirmed: true`

#### Scenario: Confirmación de más
- **GIVEN** `batch-issues` analizado y validado
- **WHEN** `analyst` llama a `POST review` con `confirmEmptyBatch: true`
- **THEN** recibe `200` como sin el campo, y la auditoría no lleva `emptyBatchConfirmed`

#### Scenario: Bloqueante antes que batch vacío
- **GIVEN** un import validado cuyas filas `matched` son todas de otro proveedor
- **WHEN** se llama a `POST review` sin `confirmEmptyBatch`
- **THEN** recibe `409 blocking_validation_issue`, no `no_matched_rows`

### Requirement: Pantalla Analysis & Validations: batch sin filas asociadas
Si el import trae `analysis.requiresEmptyBatchConfirmation`, la pantalla SHALL avisar de que no hay filas asociadas, y de la cuenta probablemente equivocada si `likelyWrongAccount`, y SHALL pedir la casilla **Continue with batch fees only**. Sin marcarla, Continue SHALL estar deshabilitado con su motivo; marcada, el cuerpo de `POST review` SHALL llevar `confirmEmptyBatch: true`.

#### Scenario: Cuenta probablemente equivocada
- **GIVEN** la corrida vigente de `batch-wrong-account`, con `requiresEmptyBatchConfirmation = true` y `likelyWrongAccount = true`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve `No row of the files matches a transaction of this account.` y `The IDs do not fit any gateway of this account: the files may belong to another account. Cancel and reprocess under the right account.`
- **AND** la casilla **Continue with batch fees only** sin marcar y **Continue to settlement review** deshabilitado con `Confirm that this batch has batch fees only.`
- **AND** al marcarla y pulsar Continue, se llama a `POST review` con `{ "runId": <runId>, "confirmEmptyBatch": true }`

#### Scenario: Sin filas asociadas por otro motivo
- **GIVEN** una corrida con `requiresEmptyBatchConfirmation = true` y `likelyWrongAccount = false`
- **THEN** ve `No row of the files matches a transaction of this account.` y la casilla, sin el texto de cuenta equivocada

#### Scenario: Batch con filas asociadas
- **GIVEN** la corrida vigente de `batch-issues`
- **THEN** no hay casilla ni aviso de batch vacío, y el cuerpo de `POST review` no lleva `confirmEmptyBatch`

#### Scenario: Batch vacío rechazado por el API
- **WHEN** `POST review` responde `409 no_matched_rows`
- **THEN** ve `This import has no matched rows. Confirm that the batch has batch fees only.`, se relee el import, y la casilla aparece sin marcar

## MODIFIED Requirements

### Requirement: status_mismatch en ciclo E
Una fila E reportada `Declined` cuya transacción está `Successful`, `Chargeback`, `Refund` o `RDR` en el gateway, o reportada `Successful` cuya transacción está `Declined`, SHALL producir un hallazgo `issueType = status_mismatch`. Una fila E con el gateway en `Pending` SHALL compararse según "status_mismatch con el gateway en Pending", y una fila reportada `Successful` cuya transacción está en estado de ciclo I SHALL no producir hallazgo (ronda 1).

#### Scenario: Declinada en el archivo, aprobada en el gateway
- **GIVEN** `data/samples/batch-issues`, donde `911545593909470` (también en APP) y `381797111970492` (liquidada `Successful` en el batch anterior) vienen en DEC y están `Successful` en el gateway
- **WHEN** se valida
- **THEN** hay dos hallazgos `status_mismatch` en ciclo E, uno por fila DEC, con `blocking = 0`, estado reportado `Declined` y estado del gateway `Successful`
- **AND** siguen existiendo la `collision` / `in_batch` de `911545593909470` y la `collision` / `across_batches` de `381797111970492`
- **AND** `non_recorded_adjustment` es `warning` con `issueCount = 3`

#### Scenario: Aprobada en el archivo, declinada en el gateway
- **GIVEN** una fila APP cuya transacción está `Declined` en el gateway
- **WHEN** se valida
- **THEN** hay un hallazgo `status_mismatch` en ciclo E con la fila incluida por defecto

#### Scenario: Ronda 1 no es discrepancia
- **GIVEN** `data/samples/batch-clean`, con filas APP cuya transacción ya pasó a `Chargeback` o `Refund`
- **WHEN** se valida
- **THEN** `non_recorded_adjustment` es `passed` con `issueCount = 0`

#### Scenario: Gateway Pending en E
- **GIVEN** una fila DEC y una fila APP cuyas transacciones están `Pending` en el gateway
- **WHEN** se valida
- **THEN** cada una produce un hallazgo `status_mismatch` (#63), como dice "status_mismatch con el gateway en Pending"

### Requirement: Pending aparte
Las transacciones `Pending` SHALL excluirse de los faltantes y contarse en `pendingInRangeCount`: las de los canales de la cuenta con fecha de creación dentro del rango APP o del DEC, una vez cada una, salvo las que ya son un hallazgo `status_mismatch` de la corrida. Una transacción `Pending` que viene en el batch con su propio estado `Pending` SHALL seguir contando.

#### Scenario: Pending dentro del rango
- **GIVEN** dos transacciones `Pending` de un canal de la cuenta con fecha dentro del rango APP
- **WHEN** se valida
- **THEN** no hay hallazgo `missing` para ellas y `pendingInRangeCount = 2`

#### Scenario: Pending del batch con otro estado
- **GIVEN** dos transacciones `Pending` de un canal de la cuenta con fecha dentro del rango APP, una de ellas en una fila APP del batch
- **WHEN** se valida
- **THEN** la del batch es `status_mismatch` y `pendingInRangeCount = 1`

#### Scenario: Pending del batch reportada Pending
- **GIVEN** una transacción `Pending` con fecha dentro del rango APP que viene en una fila E cuyo estado leído es `Pending`
- **WHEN** se valida
- **THEN** no hay hallazgo para ella y cuenta en `pendingInRangeCount`
