# Spec Delta

## MODIFIED Requirements

### Requirement: Intentos de batch
Procesar SHALL crear un `SettlementBatch` con `batchNo` propuesto (último + 1, editable) y `attemptNo`; solo un intento vigente por (cuenta, batchNo) y por import. Deshacer SHALL marcar el intento `undone`, devolver el import a `analyzed` y conservar todo; el siguiente intento incrementa `attemptNo`. El `attemptNo` de un número SHALL ser el mayor intento de ese (cuenta, batchNo) en cualquier estado + 1, o 1 si no hay ninguno.

#### Scenario: Número de batch propuesto y editable
- GIVEN un import en `validated` de una cuenta cuyo último batch es el 117
- WHEN el analista abre Settlement Review
- THEN ve propuesto el batch 118 y puede cambiarlo antes de confirmar

#### Scenario: Número con intento vigente rechazado
- GIVEN la cuenta ya tiene un intento vigente del batch 118
- WHEN se procesa otro import con `batchNo = 118`
- THEN la API responde 409 con `code = "batch_no_taken"` y no se crea ningún intento

#### Scenario: Deshacer y reprocesar con el mismo número
- GIVEN el intento 1 del batch 118 en `processed`
- WHEN el analista lo deshace indicando el motivo
- THEN el intento pasa a `undone` conservando sus datos, autor y motivo, y el import vuelve a `analyzed`
- AND al validarlo y procesarlo de nuevo con `batchNo = 118` se acepta como intento 2

#### Scenario: Un batch pagado no se deshace
- GIVEN un batch en `paid`
- WHEN el analista intenta deshacerlo sin retirar antes la marca de pago
- THEN se rechaza y el batch sigue `paid`

#### Scenario: Intento siguiente a uno deshecho
- GIVEN la cuenta tiene el batch 118 con un intento 1 `undone` y ningún intento vigente con ese número
- WHEN se procesa un import validado con `batchNo = 118`
- THEN se crea el intento 2 del batch 118 en `processed`

#### Scenario: El mismo número en dos imports de la cuenta a la vez
- GIVEN dos imports `validated` de la misma cuenta
- WHEN los dos se procesan con `batchNo = 118` y uno confirma mientras el otro espera dentro de su transacción
- THEN el que confirma crea el intento 1 del batch 118 y el otro responde `409 batch_no_taken`, sin dejar ningún dato suyo ni cambiar su import, que sigue `validated`

### Requirement: Movimientos por ciclo
Cada fila incluida SHALL producir una `SettlementTransaction` con su `cycle`, estado al procesarse, importe USD del gateway, fees aplicados por fecha de evento y, en E, reserva retenida según `appliedReservePct`; en R, reserva liberada referenciando la misma transacción. Un movimiento SHALL corresponder a una fila de origen: único por (`batchId`, `sheetId`, `rowNo`), de modo que dos filas incluidas de la misma transacción y ciclo dan dos movimientos.

#### Scenario: Summary del batch limpio
- WHEN se procesa `data/samples/batch-clean` con todas las filas incluidas
- THEN `qty`, `amounts`, `fees` y `amountPayable` coinciden con `expected.summary`

#### Scenario: Movimientos de batch-clean
- GIVEN `data/samples/batch-clean` validado en ProviderA-USD
- WHEN se procesa con el número propuesto
- THEN el batch tiene 450 movimientos E, 10 I y 320 R (`expected.byCycle`), cada uno con la hoja y la fila de la que salió

#### Scenario: Refund y Chargeback de la misma transacción en un batch
- GIVEN un import cuya transacción aparece en la hoja REF y en la hoja CHB (colisión en I, las dos apariciones incluidas por defecto)
- WHEN se procesa
- THEN el batch tiene dos movimientos I de esa transacción, uno `Refund` y otro `Chargeback`, cada uno con su importe y su fee

#### Scenario: Chargeback y CHB 2 del mismo movimiento
- GIVEN un archivo legacy con un `Chargeback` y un `CHB 2` de la misma transacción
- WHEN se procesa
- THEN hay dos movimientos I `Chargeback`, el segundo con `excludeAmount = true`

#### Scenario: Duplicado incluido a mano
- GIVEN un duplicado E en el batch cuya segunda aparición el analista incluyó a mano
- WHEN se procesa
- THEN el batch tiene dos movimientos E de esa transacción, uno por fila

### Requirement: Fees por batch prellenados
Las filas de `Other Fees` SHALL aparecer en Settlement Review como `SettlementBatchFee` propuestos (`source = file`), con el tipo resuelto por nombre contra `FeeType`; un tipo desconocido SHALL quedar como importe libre con advertencia. El analista puede ajustar, quitar o añadir (`source = manual`). Cada fee procesado SHALL guardar `feeTypeId` de un tipo no transaccional, el `feeId` del preestablecido de la cuenta o `null`, el importe y quién lo registró; `null` en `feeId` exige un tipo con `allowsFreeAmount` salvo en los de `source = file`.

#### Scenario: Fees de Other Fees prellenados
- GIVEN un import en `validated` cuya hoja `Other Fees` trae `Monthly Fee` por 150.0000 USD
- WHEN el analista abre Settlement Review
- THEN ve un fee por batch propuesto con el tipo `Monthly Fee` resuelto contra el catálogo y el importe del archivo
- AND puede confirmarlo, ajustar su importe o quitarlo antes de procesar

#### Scenario: Tipo desconocido como importe libre
- GIVEN la hoja `Other Fees` trae una fila cuyo tipo no existe en el catálogo
- WHEN el analista abre Settlement Review
- THEN esa fila aparece con una advertencia, como importe libre con su texto

#### Scenario: Fee añadido a mano
- WHEN el analista añade un fee no transaccional preestablecido de la cuenta con importe ajustado, o uno de importe libre con su categoría y descripción
- THEN se refleja en el resumen previo y queda registrado con su usuario

#### Scenario: Prellenados de batch-clean procesados
- GIVEN `batch-clean` validado, con `Wire Fee` 25 y `Settlement Fee` 15 prellenados (`expected.batchFeesPrefilled`) y sin preestablecidos de esos tipos en la cuenta
- WHEN se procesa con esos dos fees, `source = "file"` y `feeId = null`
- THEN el batch guarda dos `SettlementBatchFee` con `source = file`, el usuario que procesó y `otherFeeAmt = 40.0000`

#### Scenario: Preestablecido solo con porcentaje
- GIVEN un fee no transaccional de la cuenta con `percentage` y sin `fixedAmount` (p. ej. `Chargeback over 1%` en ProviderA-USD)
- WHEN el analista lo agrega como fee por batch
- THEN el sistema no calcula su importe: se procesa con el importe que escribe el analista y su `feeId`

#### Scenario: Importe libre en un tipo que no lo admite
- WHEN se procesa con un fee `source = "manual"`, `feeId = null` y un tipo sin `allowsFreeAmount`
- THEN la API responde `400 batch_fee_invalid` con `details = { index, reason: "free_amount_not_allowed" }` y no se crea nada

#### Scenario: Preestablecido de otra cuenta o de otro tipo
- WHEN se procesa con un `feeId` que no es un fee no transaccional de la cuenta del import, o cuyo tipo no es el `feeTypeId` indicado
- THEN la API responde `400 batch_fee_invalid` con `reason` `fee_not_in_account` o `fee_type_mismatch`

#### Scenario: Preestablecido no vigente en la fecha del batch
- GIVEN un preestablecido con vigencia NULL…2026-10-15
- WHEN se procesa con `settlementDate = "2026-10-24"` y ese `feeId`
- THEN la API responde `400 batch_fee_invalid` con `reason = "fee_not_in_force"`

#### Scenario: Tipo transaccional como fee por batch
- WHEN se procesa con un fee por batch cuyo `feeTypeId` es transaccional o no existe
- THEN la API responde `400 batch_fee_invalid` con `reason` `transactional_fee_type` o `unknown_fee_type`

## ADDED Requirements

### Requirement: Precondición de procesar
`POST /api/v1/imports/{id}/settlements` SHALL exigir `settlement.process`, un import `validated` y en el cuerpo el `runId` revisado. Dentro de su transacción, tras la guarda sobre `Import`, SHALL comprobar que ese `runId` es la corrida vigente, que no está bloqueada y que su revisión sigue válida. Fuera de `validated` responde `409 import_not_validated` con `details.status`.

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

### Requirement: Procesamiento atómico y auditado
El procesamiento SHALL ocurrir en una sola transacción: intento, movimientos, fees, totales, asociación de canales, resolución de faltantes, paso del import a `processed` con `currentBatchId` y auditoría. Cualquier error SHALL deshacerlo todo. La auditoría SHALL incluir `settlement.process` con el usuario, la corrida, el número, el intento, los conteos y la nota.

#### Scenario: Procesado correcto
- GIVEN `batch-clean` validado
- WHEN se procesa
- THEN responde `201` con el intento en `processed`, el import queda `processed` con `currentBatchId` igual al `batchId` y hay una fila `settlement.process` en `AuditLog` con el usuario

#### Scenario: Fallo a mitad
- GIVEN un proceso que falla al escribir los totales
- WHEN termina
- THEN no queda ningún `SettlementBatch`, movimiento, fee, asociación ni auditoría suya, y el import sigue `validated`

#### Scenario: Procesar dos veces el mismo import
- GIVEN dos peticiones de procesar el mismo import, una esperando dentro de su transacción mientras la otra confirma
- WHEN la primera continúa
- THEN responde `409 import_not_validated` con `details.status = "processed"` y existe un solo intento

### Requirement: Inclusión de las apariciones al procesar
Una fila asociada SHALL procesarse si ninguna de sus apariciones `current_import` de la corrida vigente tiene `includeInSettlement = false`. Una fila en varios hallazgos se excluye si cualquiera de ellos la excluye. Una fila sin apariciones SHALL procesarse. Así ningún movimiento se cuenta dos veces por defecto.

#### Scenario: Fila excluida en un hallazgo e incluida en otro
- GIVEN una fila incluida como primera aparición de un `duplicate` / `in_batch` y excluida en un `duplicate` / `across_batches`
- WHEN se procesa
- THEN esa fila no produce movimiento

#### Scenario: Inclusión manual respetada
- GIVEN la segunda aparición de un `duplicate` / `in_batch` en E que el analista incluyó a mano y que no figura en ningún otro hallazgo
- WHEN se procesa
- THEN esa fila produce su movimiento

#### Scenario: Colisión con todas incluidas
- GIVEN `batch-issues`, donde `911545593909470` aparece en APP y en DEC con las dos apariciones incluidas por defecto
- WHEN se procesa
- THEN hay dos movimientos E de esa transacción, uno `Successful` y otro `Declined`

### Requirement: Filas que no se procesan
No SHALL producir movimiento ni descartarse en silencio: las filas sin asociar, ambiguas o ignoradas; las E o I con estado no resuelto; las cuyo propio estado es `Pending`; las excluidas por inclusión. Una fila con otro estado cuya transacción está en `Pending` en el gateway SHALL procesarse con el estado de la fila. La vista previa y la respuesta SHALL contar las saltadas en `skipped` por motivo, y la auditoría SHALL guardar esos conteos.

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

### Requirement: Importe, estado y fecha de cada movimiento
El movimiento E y el I SHALL llevar el estado de su fila y el importe USD de la transacción; un E `Declined` lleva importe 0. El R SHALL llevar el estado vigente de la transacción e importe 0. La fecha del evento SHALL ser la de creación (E); en I, la fecha del proveedor de la fila, o si falta el último cambio de estado cuando coincide con el estado de la fila; en R, el vencimiento de la reserva.

#### Scenario: RDR con importe
- GIVEN una fila RDR de una transacción de 120.0000 USD
- WHEN se procesa
- THEN su movimiento I `RDR` tiene `amount = 120.0000` y resta en el amount payable como un Chargeback o un Refund

#### Scenario: Fecha del proveedor en un ajuste
- GIVEN una fila CHB con la columna de fecha pareada (`txnDate`) a 2026-10-02T00:00:00 y una transacción con `lastStatusChangedAt` 2026-10-03
- WHEN se procesa
- THEN su movimiento I tiene `eventDate` 2026-10-02T00:00:00

#### Scenario: Ajuste sin fecha
- GIVEN una fila CHB sin fecha del proveedor cuya transacción está en el gateway en `Refund` (no coincide con la fila) o no tiene fecha de cambio de estado
- WHEN se procesa
- THEN su movimiento I tiene `eventDate = null` y la respuesta trae la advertencia `undated_adjustment` con esa transacción; no se usa la fecha del batch ni la actual

#### Scenario: Fecha de un movimiento R
- GIVEN una fila RR de una transacción creada el 2026-04-01T10:00:00 en un canal de 180 días
- WHEN se procesa
- THEN su movimiento R tiene `eventDate` 2026-09-28T10:00:00, `reserveDaysUsed = 180` y el estado vigente de la transacción

### Requirement: Reserva retenida y liberada
Un movimiento E `Successful` SHALL retener `appliedReservePct` de la transacción × su importe, a 4 decimales (mitad hacia arriba en el cuarto), con `reserveDaysUsed` y `expectedReserveReleaseAt` del plazo del canal. Un movimiento R SHALL liberar el mismo cálculo sobre su transacción. Llegar a `expectedReserveReleaseAt` no confiere Settled.

#### Scenario: Reservas de batch-clean
- WHEN se procesa `batch-clean`
- THEN la suma de `reserveHeldAmt` de los movimientos E y la de `reserveReleasedAmt` de los R coinciden con `expected.summary.amounts.reserveHeld` y `reserveReleased`

#### Scenario: Reserva con más de 4 decimales
- GIVEN una aprobada de 123.4565 USD con `appliedReservePct = 0.100000`
- WHEN se procesa
- THEN `reserveHeldAmt = 12.3457` (12.34565 redondeado mitad hacia arriba en el cuarto decimal; no 12.35, porque no se redondea a céntimos)

#### Scenario: Declinada sin reserva
- WHEN se procesa una fila DEC
- THEN su movimiento E tiene `reserveHeldAmt = 0` y `expectedReserveReleaseAt = null`

### Requirement: Ronda del movimiento I
Un movimiento I SHALL llevar `roundNo = 1` si el mismo batch tiene un movimiento E de su transacción, `roundNo = 2` si ese E está en un intento vigente anterior de cualquier cuenta del proveedor, y `null` si no hay ninguno. La ronda no cambia el cálculo.

#### Scenario: Ronda 1
- GIVEN un import con la fila APP y la fila CHB de la misma transacción
- WHEN se procesa
- THEN el movimiento I tiene `roundNo = 1`

#### Scenario: Ronda 2
- GIVEN una transacción liquidada en E en un batch `paid` anterior de otra cuenta del proveedor
- WHEN se procesa su chargeback
- THEN el movimiento I tiene `roundNo = 2`

### Requirement: Asociación de canales al procesar
Si los movimientos del batch incluyen canales sin asociar o cuya cuenta principal es otra, procesar SHALL exigir `confirmChannelAssignment: true` (si no, `409 channel_assignment_not_confirmed` con los canales). Al procesar, cada canal del batch SHALL quedar con esta cuenta como principal (`isPrimary`) y la anterior perderla, con auditoría.

#### Scenario: Canal nuevo de batch-clean
- GIVEN `batch-clean`, que trae `RAM-07` sin asociar (`expected.warnings.newChannels`)
- WHEN se procesa con `confirmChannelAssignment: true`
- THEN `RAM-07` queda asociado a ProviderA-USD como principal, con `assignedInBatchId` del batch y el usuario, la respuesta lo lista con `assignment = "new_primary"` y hay una fila `account_channel.assign` en `AuditLog`

#### Scenario: Sin confirmar
- GIVEN el mismo import
- WHEN se procesa sin `confirmChannelAssignment` o con `false`
- THEN responde `409 channel_assignment_not_confirmed` con `details.channels = [{ channelId, name, assignment }]` y no escribe nada

#### Scenario: Principal que se mueve
- GIVEN un canal cuya cuenta principal es ProviderA-EUR
- WHEN un batch de ProviderA-USD con movimientos de ese canal se procesa con la asociación confirmada
- THEN ProviderA-USD pasa a ser la principal, ProviderA-EUR conserva la asociación sin `isPrimary` y la respuesta lo lista con `assignment = "primary_moved_from"` y la cuenta anterior

#### Scenario: Canales ya principales
- GIVEN un import cuyos canales ya tienen esta cuenta como principal
- WHEN se procesa sin `confirmChannelAssignment`
- THEN se procesa y `channelsAssigned` está vacío

### Requirement: Totales del batch y amount payable
El batch SHALL guardar totales por categoría (`deposit`, `declined`, `chargeback`, `refund`, `rdr`: cantidad, importe positivo y fees), por marca de los depósitos, `otherFeeAmt`, reservas retenidas y liberadas, y `amountPayable` = depósitos − chargebacks sin `excludeAmount` − refunds − RDR − fees transaccionales − `otherFeeAmt` − retenida + liberada + liberada por chargeback, todo a 4 decimales.

#### Scenario: CHB 2 en los totales
- GIVEN `data/samples/legacy-provider`, con una fila `CHB 2` (`expected.excludeAmountRows`) y un fee de Chargeback en ProviderC-Alt
- WHEN se procesa
- THEN la categoría `chargeback` tiene `qty = 1`, `amount = 0.0000` y en `feeAmount` el fee de Chargeback del movimiento, como dice `expected.summary`

#### Scenario: Fees por batch en el payable
- GIVEN `batch-clean` validado
- WHEN se procesa con los dos fees prellenados
- THEN `amountPayable` es el de `expected.summary.amountPayable`, que ya resta `otherFeeAmt` (40.0000)
- AND procesado con `batchFees: []`, `amountPayable` es ese importe más 40.0000

#### Scenario: Dinero como texto
- WHEN se lee cualquier respuesta de procesar o de la vista previa
- THEN todo importe es un string decimal con cuatro decimales y todo porcentaje un string con seis, nunca un número JSON

### Requirement: Desglose del amount payable
Toda vista del batch (vista previa, respuesta de procesar y lecturas posteriores) SHALL traer `payableBreakdown`: líneas `{ code, label, sign, amount }` en orden fijo (depósitos, chargebacks, refunds, RDR, fees transaccionales, fees por batch, reserva retenida, reserva liberada, liberación anticipada), calculadas por el servidor, cuya suma con signo SHALL ser exactamente `amountPayable`.

#### Scenario: Suma del desglose
- WHEN se procesa o se pide la vista previa de `batch-clean` con los dos fees prellenados
- THEN `payableBreakdown` tiene nueve líneas en el orden fijo, con `sign` `+` en depósitos, reserva liberada y liberación anticipada, y `-` en las demás
- AND la suma con signo de sus `amount` es igual a `amountPayable`

#### Scenario: Líneas en cero
- GIVEN un batch sin RDR ni liberación anticipada
- WHEN se lee su vista
- THEN las líneas `rdr` y `reserve_early_released` están presentes con `amount = "0.0000"`

### Requirement: Advertencias del procesamiento
La vista previa y la respuesta SHALL traer `warnings` con código y, cuando aplica, transacción, hoja y fila. Entre ellas: `undated_adjustment`, `no_transactional_fees`, `reserve_cap_not_applied` (cuenta con tope de reserva, que no se aplica en el MVP) y `chargeback_reserve_policy_not_applied` (cuenta `release_on_chargeback` mientras la política no esté implementada, #62).

#### Scenario: Cuenta release_on_chargeback
- GIVEN un import validado de ProviderB-Main (`release_on_chargeback`) con un chargeback de una transacción con reserva retenida
- WHEN se procesa
- THEN el movimiento I tiene `reserveEarlyReleasedAmt = 0.0000`, la reserva sigue retenida y la respuesta trae la advertencia `chargeback_reserve_policy_not_applied`

#### Scenario: Cuenta con tope de reserva
- GIVEN ProviderA-EUR, con `rollingReserveCapAmt`
- WHEN se procesa un import suyo
- THEN la reserva se calcula sin tope y la respuesta trae la advertencia `reserve_cap_not_applied`

### Requirement: Vista previa del procesamiento
`POST /api/v1/imports/{id}/settlements/preview` SHALL exigir `settlement.process` y un import `validated`, aceptar el mismo cuerpo que procesar y devolver el número y el intento que se usarían, los totales, los fees, las reservas, el amount payable con su desglose, los canales a asociar, `skipped` y las advertencias, sin escribir nada ni auditar.

#### Scenario: Resumen previo de batch-clean
- GIVEN `batch-clean` validado
- WHEN `analyst` pide la vista previa con los dos fees prellenados
- THEN recibe `200` con `batchNo = 123`, los totales y el `amountPayable` de `expected.summary`, `otherFeeAmt = 40.0000` y `RAM-07` entre los canales a asociar
- AND no existe ningún `SettlementBatch` nuevo ni fila de auditoría

#### Scenario: Número ocupado en la vista previa
- WHEN la vista previa pide un `batchNo` con intento vigente en la cuenta
- THEN responde `200` con `batchNoAvailable = false`, para que el formulario lo avise antes de procesar

### Requirement: Siguiente número de batch
`GET /api/v1/accounts/{id}/batch-number/next` SHALL devolver el mayor `batchNo` de la cuenta en cualquier estado + 1 con `attemptNo = 1`. Con `importId` de un import de la cuenta que tiene un intento `undone` y ningún vigente, SHALL devolver ese mismo número y su siguiente intento (`reason = "reprocess"`). Exige autenticación y alcance.

#### Scenario: Número propuesto de batch-clean
- WHEN `analyst` pide el siguiente número de ProviderA-USD
- THEN recibe `{ batchNo: 123, attemptNo: 1, reason: "next" }` (`expected.proposedBatchNo`)

#### Scenario: Cuenta fuera del alcance
- WHEN `viewer` pide el siguiente número de ProviderC-Alt (merchant 2) o de una cuenta inexistente
- THEN recibe el mismo `404 not_found` en los dos casos

### Requirement: Alcance y permisos del procesamiento
Procesar y la vista previa SHALL responder `403 forbidden` sin `settlement.process` (antes de mirar el alcance) y `404 not_found` idéntico para un import inexistente o de un merchant fuera del alcance.

#### Scenario: Viewer
- WHEN `viewer` procesa o pide la vista previa de cualquier import
- THEN recibe `403` con `code = "forbidden"`

#### Scenario: Import de otro merchant
- GIVEN un usuario con `settlement.process` y solo el merchant 1
- WHEN procesa un import de ProviderC-Alt (merchant 2)
- THEN recibe el mismo `404` que para un import inexistente

### Requirement: Faltantes resueltos al procesar
Procesar SHALL pasar a `resolved`, con el `batchId` y la fecha, los hallazgos `missing` persistentes de corridas vigentes de cualquier import del proveedor cuyo `(transactionId, cycle)` tenga un movimiento en el batch, y devolver cuántos en `validationSummary.resolvedMissing`.

#### Scenario: Faltante de otro import resuelto
- GIVEN un faltante `missing` persistente en ciclo I de la transacción X, en la corrida vigente de un import procesado del proveedor
- WHEN se procesa un batch posterior del proveedor que incluye a X en I
- THEN el hallazgo pasa a `resolved` con `resolvedInBatchId` del batch nuevo y `resolvedAt`, y `validationSummary.resolvedMissing = 1`

#### Scenario: Otro ciclo no resuelve
- GIVEN el mismo faltante en ciclo I
- WHEN el batch incluye a X solo en E
- THEN el hallazgo sigue `persistent`
