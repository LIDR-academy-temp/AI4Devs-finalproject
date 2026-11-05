## ADDED Requirements

### Requirement: Batch sin filas asociadas al procesar
Si el import no tiene filas asociadas (`requiresEmptyBatchConfirmation`), `POST /api/v1/imports/{id}/settlements` SHALL exigir `confirmEmptyBatch: true`; sin él SHALL responder `409 no_matched_rows` con `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }` sin escribir nada. Se comprueba dentro de la transacción, después de la corrida, el bloqueo y la revisión. Con la confirmación, la auditoría `settlement.process` SHALL llevar `emptyBatchConfirmed: true`.

#### Scenario: Batch sin filas asociadas sin confirmar
- **GIVEN** `batch-wrong-account` validado con `confirmEmptyBatch: true` en el review
- **WHEN** `analyst` lo procesa sin `confirmEmptyBatch`
- **THEN** responde `409 no_matched_rows` con `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount: true }`, el import sigue `validated`, no se crea ningún intento y el número propuesto de la cuenta no cambia

#### Scenario: Batch solo de fees confirmado
- **GIVEN** `batch-wrong-account` validado
- **WHEN** `analyst` lo procesa con `confirmEmptyBatch: true`, un `batchNo` libre y el fee prellenado de `Other Fees`
- **THEN** responde `201` con `movements = { E: 0, I: 0, R: 0 }`, el fee por batch, `amountPayable` igual a menos ese fee, `channelsAssigned = []` y `skipped.unmatched` igual a `expected.rows.unmatched`
- **AND** la fila `settlement.process` de `AuditLog` lleva `emptyBatchConfirmed: true`

#### Scenario: Batch con filas asociadas
- **GIVEN** `batch-clean` validado
- **WHEN** se procesa sin `confirmEmptyBatch`
- **THEN** responde `201` y la auditoría `settlement.process` no lleva `emptyBatchConfirmed`

#### Scenario: Import no validado antes que batch vacío
- **GIVEN** `batch-wrong-account` en `analyzed`
- **WHEN** se procesa sin `confirmEmptyBatch`
- **THEN** responde `409 import_not_validated`, no `no_matched_rows`

### Requirement: Vista previa de un batch sin filas asociadas
La vista previa SHALL traer `requiresEmptyBatchConfirmation` y `emptyBatch` (los mismos `details` que daría `409 no_matched_rows`, o `null` si no hace falta confirmar) y no SHALL responder `no_matched_rows`, igual que informa de los canales y del número ocupado en lugar de responder 409. La vista previa no lleva la confirmación.

#### Scenario: Vista previa de batch-wrong-account
- **GIVEN** `batch-wrong-account` validado
- **WHEN** `analyst` pide la vista previa sin `confirmEmptyBatch`
- **THEN** recibe `200` con `requiresEmptyBatchConfirmation = true`, `emptyBatch` igual a los `details` de `no_matched_rows` (`likelyWrongAccount = true`), `movements = { E: 0, I: 0, R: 0 }`, `channelsToAssign = []` y el fee de `Other Fees` en el payable

#### Scenario: Vista previa de batch-clean
- **GIVEN** `batch-clean` validado
- **WHEN** `analyst` pide la vista previa
- **THEN** recibe `200` con `requiresEmptyBatchConfirmation = false` y `emptyBatch = null`

### Requirement: Filas de otro proveedor nunca se procesan
Una fila asociada a una transacción de otro proveedor que el de la cuenta nunca SHALL producir movimiento ni asociar su canal. Si llega al cálculo (no debería, porque `provider_mismatch` bloquea), la vista previa y el procesamiento SHALL fallar con un error interno que nombra la hoja y la fila, sin escribir nada. `skipped` no cambia de forma.

#### Scenario: Fila de otro proveedor en el cálculo
- **GIVEN** una entrada del cálculo con una fila `matched` cuya transacción es de otro proveedor que el de la cuenta (una corrida que, por un fallo, no la bloqueó)
- **WHEN** se calcula el settlement
- **THEN** falla con un error que nombra la hoja y la fila y dice que una fila de otro proveedor no se procesa, sin producir movimientos ni canales a asociar
- **AND** procesar con esa entrada no crea ningún intento ni movimiento, y el import sigue `validated` (en el API sería un `500 internal_error`)

#### Scenario: Batch sin filas ajenas
- **WHEN** se calcula el settlement de `batch-clean`
- **THEN** no falla y `skipped` tiene sus seis motivos de siempre

### Requirement: Pantalla Settlement Review: batch sin filas asociadas
Si la vista previa trae `requiresEmptyBatchConfirmation = true`, la pantalla SHALL avisar de que el batch no tiene filas asociadas (y de la cuenta probablemente equivocada si `emptyBatch.likelyWrongAccount`) y SHALL pedir la casilla **Process a batch with batch fees only**, junto a la de canales. Sin marcarla, **Process** SHALL estar deshabilitado con su motivo; marcada, el cuerpo de procesar SHALL llevar `confirmEmptyBatch: true`. La vista previa no lleva la confirmación.

#### Scenario: Archivo de otra cuenta
- **GIVEN** la vista previa de `batch-wrong-account` validado, con `requiresEmptyBatchConfirmation = true` y `emptyBatch.likelyWrongAccount = true`
- **THEN** ve `No row of the files matches a transaction of this account: only the batch fees will be processed.` y `The IDs do not fit any gateway of this account: the files may belong to another account.`
- **AND** la casilla **Process a batch with batch fees only** sin marcar y **Process** deshabilitado con `Confirm that this batch has batch fees only.`
- **AND** al marcarla, **Process** se habilita y el procesamiento envía `"confirmEmptyBatch": true`; la vista previa se pidió sin ese campo

#### Scenario: Sin aviso de cuenta equivocada
- **GIVEN** la vista previa con `requiresEmptyBatchConfirmation = true` y `emptyBatch.likelyWrongAccount = false`
- **THEN** ve el aviso de batch sin filas asociadas y la casilla, sin el texto de cuenta equivocada

#### Scenario: Batch con filas asociadas
- **GIVEN** la vista previa de `batch-clean`
- **THEN** no hay casilla ni aviso de batch vacío, y el cuerpo de procesar no lleva `confirmEmptyBatch`

#### Scenario: Rechazado al procesar
- **WHEN** **Process** responde `409 no_matched_rows`
- **THEN** ve `This import has no matched rows. Confirm that the batch has batch fees only.`, la casilla aparece sin marcar y se pide otra vista previa
