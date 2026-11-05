## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Precondición de procesar
`POST /api/v1/imports/{id}/settlements` SHALL exigir `settlement.process`, un import `validated` y en el cuerpo el `runId` revisado. Dentro de su transacción, tras la guarda sobre `Import`, SHALL comprobar que ese `runId` es la corrida vigente, que no está bloqueada, que su revisión sigue válida y, si el import no tiene filas asociadas (`requiresEmptyBatchConfirmation`), que el cuerpo trae `confirmEmptyBatch: true`; sin él, `409 no_matched_rows`. Fuera de `validated` responde `409 import_not_validated` con `details.status`.

#### Scenario: Import no validado
- GIVEN un import en `analyzed`
- WHEN `analyst` lo procesa
- THEN recibe `409` con `code = "import_not_validated"`, `details.status = "analyzed"` y mensaje en inglés, y no se crea nada

#### Scenario: Revisión invalidada entre la pantalla y el proceso
- GIVEN un import `validated` cuyo proceso espera dentro de su transacción antes de la guarda
- WHEN mientras tanto otro usuario re-ejecuta las validaciones (el import vuelve a `analyzed`) y confirma
- THEN el proceso responde `409 import_not_validated` con `details.status = "analyzed"` y no escribe nada

#### Scenario: Otra corrida revisada entre medias
- GIVEN un analista que vio la corrida 11 y procesa con `runId = 11`
- WHEN antes de procesar se re-ejecutó y revisó la corrida 12, y el import vuelve a estar `validated`
- THEN responde `409 validation_run_superseded` con `details = { runId: 11, currentRunId: 12 }`

#### Scenario: Corrida bloqueada
- GIVEN un import cuya corrida vigente está bloqueada por `provider_mismatch`
- WHEN se intenta procesar
- THEN responde `409 blocking_validation_issue` sin override (en la práctica el import no llega a `validated`, y la comprobación es defensiva)

#### Scenario: Batch sin filas asociadas sin confirmar
- GIVEN `batch-wrong-account` validado con `confirmEmptyBatch: true` en el review
- WHEN `analyst` lo procesa sin `confirmEmptyBatch`
- THEN responde `409 no_matched_rows` con `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount: true }`, el import sigue `validated`, no se crea ningún intento y el número propuesto de la cuenta no cambia

#### Scenario: Batch solo de fees confirmado
- GIVEN `batch-wrong-account` validado
- WHEN `analyst` lo procesa con `confirmEmptyBatch: true`, un `batchNo` libre y el fee prellenado de `Other Fees`
- THEN responde `201` con `movements = { E: 0, I: 0, R: 0 }`, el fee por batch, `amountPayable` igual a menos ese fee, `channelsAssigned = []` y `skipped.unmatched` igual a `expected.rows.unmatched`

### Requirement: Procesamiento atómico y auditado
El procesamiento SHALL ocurrir en una sola transacción: intento, movimientos, fees, totales, asociación de canales, resolución de faltantes, paso del import a `processed` con `currentBatchId` y auditoría. Cualquier error SHALL deshacerlo todo. La auditoría SHALL incluir `settlement.process` con el usuario, la corrida, el número, el intento, los conteos y la nota, y `emptyBatchConfirmed: true` cuando el batch no tenía filas asociadas.

#### Scenario: Procesado correcto
- GIVEN `batch-clean` validado
- WHEN se procesa
- THEN responde `201` con el intento en `processed`, el import queda `processed` con `currentBatchId` igual al `batchId` y hay una fila `settlement.process` en `AuditLog` con el usuario, sin `emptyBatchConfirmed`

#### Scenario: Fallo a mitad
- GIVEN un proceso que falla al escribir los totales
- WHEN termina
- THEN no queda ningún `SettlementBatch`, movimiento, fee, asociación ni auditoría suya, y el import sigue `validated`

#### Scenario: Procesar dos veces el mismo import
- GIVEN dos peticiones de procesar el mismo import, una esperando dentro de su transacción mientras la otra confirma
- WHEN la primera continúa
- THEN responde `409 import_not_validated` con `details.status = "processed"` y existe un solo intento

#### Scenario: Auditoría de un batch solo de fees
- GIVEN `batch-wrong-account` procesado con `confirmEmptyBatch: true`
- THEN la fila `settlement.process` de `AuditLog` lleva `emptyBatchConfirmed: true`

### Requirement: Filas que no se procesan
No SHALL producir movimiento ni descartarse en silencio: las filas sin asociar, ambiguas o ignoradas; las E o I con estado no resuelto; las cuyo propio estado es `Pending`; las excluidas por inclusión. Una fila con otro estado cuya transacción está en `Pending` en el gateway SHALL procesarse con el estado de la fila. La vista previa y la respuesta SHALL contar las saltadas en `skipped` por motivo, y la auditoría SHALL guardar esos conteos. Una fila asociada a una transacción de otro proveedor nunca SHALL procesarse ni asociar su canal: si llega al cálculo (no debería, porque `provider_mismatch` bloquea), el procesamiento y la vista previa SHALL fallar con un error interno sin escribir nada; `skipped` no cambia de forma.

#### Scenario: Estado no resuelto
- GIVEN un import validado con una fila I cuyo estado no se pudo resolver (advertencia `status_unresolved` del análisis)
- WHEN se procesa
- THEN esa fila no produce movimiento y la respuesta trae `skipped.unresolvedStatus = 1`

#### Scenario: Fila con estado Pending
- GIVEN una fila E cuyo estado leído es `Pending` (por columna, vía alias)
- WHEN se procesa
- THEN no produce movimiento y cuenta en `skipped.pending`

#### Scenario: Transacción en Pending en el gateway
- GIVEN una fila APP cuya transacción está en `Pending` en el gateway
- WHEN se procesa
- THEN produce un movimiento E `Successful` con el importe del gateway y no cuenta en `skipped`

#### Scenario: Batch limpio sin filas saltadas
- WHEN se procesa `batch-clean`
- THEN `skipped` vale 0 en todos sus motivos salvo `ignored = 3` (las filas sin ID, `expected.rows.ignoredEmptyId`)

#### Scenario: Fila de otro proveedor en el cálculo
- GIVEN una entrada del cálculo con una fila `matched` cuya transacción es de otro proveedor que el de la cuenta (una corrida que, por un fallo, no la bloqueó)
- WHEN se calcula el settlement
- THEN falla con un error que nombra la hoja y la fila y dice que una fila de otro proveedor no se procesa, sin producir movimientos ni canales a asociar
- AND procesar con esa entrada no crea ningún intento ni movimiento, y el import sigue `validated` (en el API sería un `500 internal_error`)

### Requirement: Vista previa del procesamiento
`POST /api/v1/imports/{id}/settlements/preview` SHALL exigir `settlement.process` y un import `validated`, aceptar el mismo cuerpo que procesar y devolver el número y el intento que se usarían, los totales, los fees, las reservas, el amount payable con su desglose, los canales a asociar, `skipped` y las advertencias, sin escribir nada ni auditar. SHALL añadir `requiresEmptyBatchConfirmation` y `emptyBatch` (`{ rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }` o `null`) y no SHALL responder `no_matched_rows`.

#### Scenario: Resumen previo de batch-clean
- GIVEN `batch-clean` validado
- WHEN `analyst` pide la vista previa con los dos fees prellenados
- THEN recibe `200` con `batchNo = 123`, los totales y el `amountPayable` de `expected.summary`, `otherFeeAmt = 40.0000` y `RAM-07` entre los canales a asociar
- AND `requiresEmptyBatchConfirmation = false` y `emptyBatch = null`
- AND no existe ningún `SettlementBatch` nuevo ni fila de auditoría

#### Scenario: Número ocupado en la vista previa
- WHEN la vista previa pide un `batchNo` con intento vigente en la cuenta
- THEN responde `200` con `batchNoAvailable = false`, para que el formulario lo avise antes de procesar

#### Scenario: Vista previa de un batch sin filas asociadas
- GIVEN `batch-wrong-account` validado
- WHEN `analyst` pide la vista previa sin `confirmEmptyBatch`
- THEN recibe `200` con `requiresEmptyBatchConfirmation = true`, `emptyBatch` igual a los `details` de `no_matched_rows` (`likelyWrongAccount = true`), `movements = { E: 0, I: 0, R: 0 }`, `channelsToAssign = []` y el fee de `Other Fees` en el payable
