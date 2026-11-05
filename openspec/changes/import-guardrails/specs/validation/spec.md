## MODIFIED Requirements

### Requirement: status_mismatch en ciclo E
Una fila E reportada `Declined` cuya transacción está `Successful`, `Chargeback`, `Refund` o `RDR` en el gateway, o reportada `Successful` cuya transacción está `Declined`, SHALL producir un hallazgo `issueType = status_mismatch`. Una fila E con un estado resuelto distinto de `Pending` cuya transacción está `Pending` en el gateway SHALL producir también un `status_mismatch` (#63): se procesa con el estado de la fila y el desajuste se corrige del lado del merchant. Una fila E cuyo propio estado es `Pending` o no está resuelto SHALL no compararse, y una fila reportada `Successful` cuya transacción está en estado de ciclo I SHALL no producir hallazgo (ronda 1).

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
- **GIVEN** una transacción `Pending` de un canal de `ProviderA-USD`, creada por el test, y un import de `ProviderA-USD` que la trae en APP
- **WHEN** se valida y se lee el hallazgo con `GET /api/v1/validation-issues/{id}`
- **THEN** es `status_mismatch` en ciclo E con estado reportado `Successful` y del gateway `Pending`, se resuelve a mano con `PATCH` y nota, y procesar el import produce un movimiento E `Successful` de esa transacción

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

### Requirement: Decisión de conjunto
`POST /api/v1/imports/{id}/review` con `{ runId, confirmEmptyBatch? }` SHALL exigir `settlement.process` y el import en `analyzed`. Solo con la corrida vigente, sin bloqueantes y, si el import no tiene filas asociadas (`requiresEmptyBatchConfirmation`), con `confirmEmptyBatch: true`, SHALL pasar el import a `validated` y registrar la aprobación en `AuditLog` con el usuario, sin exigir decisión por hallazgo; los hallazgos SHALL seguir `persistent`. Responde `200` con la corrida y la revisión.

#### Scenario: Continuar con advertencias
- **GIVEN** `batch-issues` analizado y validado, con un cambio de inclusión hecho
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente
- **THEN** recibe `200` con `importStatus = "validated"` y la revisión con `analyst` y su fecha
- **AND** los 23 hallazgos siguen `persistent`, el cambio de inclusión sigue guardado y hay una fila de `AuditLog` con `action = "import.review"`, `entityId = importId` y `detailJson` con `runId` y el número de hallazgos por validación (criterio 3 del issue, HU2 CA6), sin `emptyBatchConfirmed`

#### Scenario: Provider mismatch
- **GIVEN** `batch-blocked` analizado y validado
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente
- **THEN** recibe `409 blocking_validation_issue` con un mensaje que dice que el import debe cancelarse y procesarse con el proveedor correcto y `details` con `runId`, `validationCodes = ["provider_mismatch"]` e `issueIds`; el import sigue `analyzed` y no hay forma de forzarlo (HU2 CA5)

#### Scenario: Corrida superada
- **GIVEN** que `analyst` revisó la corrida 1 y después se ejecutó la corrida 2
- **WHEN** envía `POST review` con `runId` = 1
- **THEN** recibe `409 validation_run_superseded` con `details.currentRunId` = 2 y el import sigue `analyzed`

#### Scenario: Sin corrida vigente
- **WHEN** se llama a `POST review` sobre un import `analyzed` sin corrida vigente
- **THEN** recibe `409 validation_run_required`

#### Scenario: Import no analizado
- **WHEN** se llama a `POST review` sobre un import `validated`, `processed` o `cancelled`
- **THEN** recibe `409 import_not_analyzed` con `details.status`

#### Scenario: Sin permiso
- **WHEN** `viewer` llama a `POST review`
- **THEN** recibe `403 forbidden`

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

### Requirement: Pantalla Analysis & Validations: continuar o cancelar
La pantalla SHALL ofrecer una sola decisión de conjunto: **Continue to settlement review**, que llama a `POST review` con el `runId` de la corrida mostrada, y **Cancel and reprocess**, con confirmación. Continue SHALL estar deshabilitado sin corrida vigente o con la corrida bloqueada, con el motivo visible y asociado al botón. Si el import trae `analysis.requiresEmptyBatchConfirmation`, la pantalla SHALL avisar de que no hay filas asociadas (y de la cuenta probablemente equivocada si `likelyWrongAccount`) y pedir la casilla **Continue with batch fees only**; sin marcarla, Continue SHALL estar deshabilitado con su motivo, y marcada, el cuerpo SHALL llevar `confirmEmptyBatch: true`.

#### Scenario: provider_mismatch (criterio 1 del issue, HU2 CA5)
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** **Continue to settlement review** está deshabilitado y ve `provider_mismatch: cancel the import and process it under the correct provider.`, con un enlace al hallazgo de `252570479111759`, y **Cancel and reprocess** está disponible

#### Scenario: Sin corrida
- **GIVEN** el import analizado sin corrida vigente
- **THEN** **Continue to settlement review** está deshabilitado con `Run the validations before continuing.`

#### Scenario: Solo advertencias (criterio 3 del issue, HU2 CA6)
- **GIVEN** la corrida vigente de `batch-issues` sin cambios
- **WHEN** `analyst` pulsa **Continue to settlement review**
- **THEN** se llama a `POST /imports/<importId>/review` con `{ "runId": <runId> }`, el import muestra `validated`, ve `Reviewed by analyst on <fecha>` y se ofrece **Settlement Review**

#### Scenario: Corrida superada al continuar
- **WHEN** `POST review` responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before continuing.`, se relee la corrida y Continue usa el `runId` nuevo solo cuando se vuelva a pulsar

#### Scenario: Cancelar y reprocesar (HU2 CA8)
- **WHEN** `analyst` pulsa **Cancel and reprocess** y confirma
- **THEN** se llama a `POST cancel`, el import muestra `cancelled` y la corrida, la tabla y los hallazgos siguen visibles en solo lectura

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
