# settlement

## Purpose
Procesar un import validado como intento de batch, calcular movimientos por ciclo, fees, reservas y summary, exportar y registrar el pago. README §3.2 (SettlementBatch, SettlementTransaction, SettlementBatchFee), §4.3, HU3, doc 04 (export Back-Office).

## Requirements

### Requirement: Intentos de batch
Procesar SHALL crear un `SettlementBatch` con `batchNo` propuesto (último + 1, editable) y `attemptNo`; solo un intento vigente por (cuenta, batchNo) y por import. El `attemptNo` de un número SHALL ser el mayor intento de ese (cuenta, batchNo) en cualquier estado + 1, o 1 si no hay ninguno.

#### Scenario: Número de batch propuesto y editable
- GIVEN un import en `validated` de una cuenta cuyo último batch es el 117
- WHEN el analista abre Settlement Review
- THEN ve propuesto el batch 118 y puede cambiarlo antes de confirmar

#### Scenario: Número con intento vigente rechazado
- GIVEN la cuenta ya tiene un intento vigente del batch 118
- WHEN se procesa otro import con `batchNo = 118`
- THEN la API responde 409 con `code = "batch_no_taken"` y no se crea ningún intento

#### Scenario: Intento siguiente a uno deshecho
- GIVEN la cuenta tiene el batch 118 con un intento 1 `undone` y ningún intento vigente con ese número
- WHEN se procesa un import validado con `batchNo = 118`
- THEN se crea el intento 2 del batch 118 en `processed`

#### Scenario: El mismo número en dos imports de la cuenta a la vez
- GIVEN dos imports `validated` de la misma cuenta
- WHEN los dos se procesan con `batchNo = 118` y uno confirma mientras el otro espera dentro de su transacción
- THEN el que confirma crea el intento 1 del batch 118 y el otro responde `409 batch_no_taken`, sin dejar ningún dato suyo ni cambiar su import, que sigue `validated`

### Requirement: Deshacer un intento
Deshacer SHALL marcar el intento `undone`, devolver el import a `analyzed` y conservar todo; el siguiente intento incrementa `attemptNo`.

Nota: deshacer y pagar (y sus rutas) llegan en el tramo 6. Los escenarios "Deshacer y reprocesar con el mismo número" y "Un batch pagado no se deshace" se conservan como requisito vigente de esa entrega; hasta entonces, el intento `undone` se prepara en los tests.

#### Scenario: Deshacer y reprocesar con el mismo número
- GIVEN el intento 1 del batch 118 en `processed`
- WHEN el analista lo deshace indicando el motivo
- THEN el intento pasa a `undone` conservando sus datos, autor y motivo, y el import vuelve a `analyzed`
- AND al validarlo y procesarlo de nuevo con `batchNo = 118` se acepta como intento 2

#### Scenario: Un batch pagado no se deshace
- GIVEN un batch en `paid`
- WHEN el analista intenta deshacerlo sin retirar antes la marca de pago
- THEN se rechaza y el batch sigue `paid`

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
Las filas de `Other Fees` SHALL aparecer en Settlement Review como `SettlementBatchFee` propuestos (`source = file`), con el tipo resuelto por nombre contra `FeeType`; un tipo desconocido SHALL quedar como importe libre con advertencia. El analista puede ajustar, quitar o añadir (`source = manual`).

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

### Requirement: Fee por batch procesado
Cada fee procesado SHALL guardar `feeTypeId` de un tipo no transaccional, el `feeId` del preestablecido de la cuenta o `null`, el importe y quién lo registró; `null` en `feeId` exige un tipo con `allowsFreeAmount` salvo en los de `source = file` cuyo tipo se prellenó de verdad desde `Other Fees` en ese import.

#### Scenario: Prellenados de batch-clean procesados
- GIVEN `batch-clean` validado, con `Wire Fee` 25 y `Settlement Fee` 15 prellenados (`expected.batchFeesPrefilled`) y sin preestablecidos de esos tipos en la cuenta
- WHEN se procesa con esos dos fees, `source = "file"` y `feeId = null`
- THEN el batch guarda dos `SettlementBatchFee` con `source = file`, el usuario que procesó y `otherFeeAmt = 40.0000`

#### Scenario: Preestablecido solo con porcentaje
- GIVEN un fee no transaccional de la cuenta con `percentage` y sin `fixedAmount` (p. ej. `Chargeback over 1%` en ProviderA-USD)
- WHEN el analista lo agrega como fee por batch
- THEN el sistema no calcula su importe: se procesa con el importe que escribe el analista y su `feeId`

#### Scenario: Importe libre sin descripción
- WHEN se procesa o se pide la vista previa con un fee `source = "manual"`, `feeId = null`, un tipo con `allowsFreeAmount` y `description` ausente o vacía tras quitar espacios
- THEN la API responde `400 batch_fee_invalid` con `details = { index, reason: "description_required" }` y no se crea nada

#### Scenario: Orden de los fees por batch
- GIVEN un request con tres fees por batch en un orden dado
- WHEN se pide la vista previa y después se procesa
- THEN las dos respuestas devuelven `batchFees` en el orden del request

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

### Requirement: Política de reserva ante chargeback
Con `release_on_chargeback`, un chargeback sobre una transacción con reserva retenida SHALL liberar esa reserva en el mismo batch (`reserveEarlyReleasedAmt`) y dejar de esperarse en R; con `hold_until_term` la reserva sigue su plazo.

#### Scenario: Liberación inmediata
- GIVEN una cuenta con `release_on_chargeback` y una transacción `Successful` liquidada en E con reserva retenida
- WHEN un batch procesa su chargeback
- THEN la reserva se libera en ese batch como `reserveEarlyReleasedAmt`, se conserva la regla aplicada, deja de reportarse como pendiente de liberación y no se espera en R

#### Scenario: Retención hasta el plazo
- GIVEN una cuenta con `hold_until_term` y la misma situación
- WHEN un batch procesa su chargeback
- THEN la reserva sigue retenida hasta cumplir el plazo del canal y `reserveEarlyReleasedAmt` es 0

### Requirement: Settled solo al pagar
Un movimiento SHALL considerarse Settled únicamente cuando su batch está `paid`; marcar pagado y retirar la marca SHALL auditarse con usuario y fecha.

#### Scenario: Procesado no es Settled
- WHEN se procesa un batch
- THEN su estado es `processed` y ninguno de sus movimientos está Settled

#### Scenario: Marcar pagado
- GIVEN un batch `processed` y un usuario con `payment.process`
- WHEN marca el batch como pagado
- THEN el batch pasa a `paid`, sus movimientos E, I y R quedan Settled y la acción queda auditada con usuario y fecha

#### Scenario: Retirar la marca de pago
- GIVEN un batch `paid`
- WHEN un usuario con `payment.process` retira la marca
- THEN el batch vuelve a `processed`, sus movimientos dejan de estar Settled y la acción queda auditada con usuario y fecha

### Requirement: Exports
El intento SHALL exportar (a) el summary para el merchant, (b) el CSV Back-Office de transacciones (TXN) con columnas `ID, Status` y (c) el CSV de reservas (RR) con columnas `ID, Description`. `ID` SHALL ser el identificador de origen de la transacción escrito tal cual, como texto y sin ningún formato para Excel. Descargarlos no SHALL cambiar ningún estado.

#### Scenario: Exports disponibles al procesar, sin efecto en el pago
- GIVEN un batch recién procesado
- WHEN el analista descarga el summary y los dos CSV
- THEN cada export está identificado por su intento y la descarga no cambia el estado del batch ni marca nada como Settled

#### Scenario: IDs como texto
- GIVEN un batch con transacciones de ID numérico de 15 y de 16 dígitos y de ID UUID
- WHEN se exportan los CSV y el summary
- THEN cada ID se escribe con exactamente los caracteres de su identificador de origen, sin notación científica, sin pérdida de dígitos y sin `="…"`, apóstrofo, prefijo ni comillas que RFC 4180 no exija

### Requirement: Contenido del TXN y del RR
El TXN SHALL contener los movimientos E `Successful` (`SUC`) y los I `Chargeback` (`CHB`, también los de `excludeAmount`), `Refund` (`REF`) y `RDR` (`RDR`), sin `Declined`, una fila por par (`ID`, `Status`) distinto. El RR SHALL contener los movimientos R con `Description = "Batch <batchNo>"`, una fila por `ID` distinto.

#### Scenario: TXN de batch-clean
- GIVEN `batch-clean` procesado como batch 123 de ProviderA-USD
- WHEN se descarga `type=transactions`
- THEN el archivo tiene la cabecera `ID,Status` y 350 filas: 340 `SUC`, 2 `CHB`, 6 `REF` y 2 `RDR` (`expected.summary.qty`), y ninguna de las 110 declinadas

#### Scenario: RR de batch-clean
- GIVEN el mismo batch
- WHEN se descarga `type=reserves`
- THEN el archivo tiene la cabecera `ID,Description` y 320 filas (`expected.summary.qty.reservesReleased`), todas con `Description = Batch 123`

#### Scenario: CHB 2 en el TXN
- GIVEN `legacy-provider` procesado, con su fila `CHB 2` (`expected.excludeAmountRows`)
- WHEN se descarga `type=transactions`
- THEN esa transacción sale con `Status = CHB`, y el archivo tiene 61 filas: 60 `SUC` y 1 `CHB`

#### Scenario: Refund y Chargeback de la misma transacción
- GIVEN un intento con dos movimientos I de la misma transacción, uno `Refund` y otro `Chargeback`
- WHEN se descarga el TXN
- THEN la transacción sale en dos filas, una `REF` y otra `CHB`

#### Scenario: Chargeback y CHB 2 de la misma transacción
- GIVEN un intento con un movimiento I `Chargeback` y otro `Chargeback` con `excludeAmount` de la misma transacción
- WHEN se descarga el TXN
- THEN la transacción sale en una sola fila `CHB`

### Requirement: Archivo por intento y auditoría de la descarga
Los archivos SHALL generarse a partir de lo escrito al procesar, en cualquier estado del intento, e identificarse por intento con el nombre `<cuenta>_B<batchNo>_A<attemptNo>_<type>.csv`. Cada descarga SHALL quedar auditada.

#### Scenario: Nombre del archivo por intento
- GIVEN el intento 2 del batch 118 de la cuenta `ProviderA-USD`
- WHEN se descarga `type=reserves`
- THEN la respuesta lleva `Content-Disposition: attachment; filename="ProviderA-USD_B118_A2_reserves.csv"`

#### Scenario: Nombre de cuenta con caracteres fuera de la lista blanca
- GIVEN una cuenta llamada `Provider X / EU` y su intento 1 del batch 5
- WHEN se descarga `type=summary`
- THEN el nombre del archivo es `Provider_X_EU_B5_A1_summary.csv`

#### Scenario: Tres descargas seguidas
- GIVEN un batch `processed`
- WHEN el mismo usuario descarga tres veces el TXN
- THEN el batch sigue `processed`, ningún movimiento cambia y hay tres filas `settlement.export` en `AuditLog` con el usuario, el `batchId`, el tipo y el nombre del archivo

#### Scenario: Export de un intento deshecho
- GIVEN un intento `undone`
- WHEN se descarga cualquiera de los tres exports
- THEN responde `200` con el archivo de ese intento, identificado por su `attemptNo`

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

### Requirement: Formato de los CSV
Los tres exports SHALL ser CSV RFC 4180: separador `,`, fila de cabecera, CRLF, UTF-8 sin BOM, y comillas dobles (con las internas duplicadas) solo en valores con `,`, `"` o salto de línea. Los importes SHALL llevar punto decimal, cuatro decimales, sin separador de miles y `-` si son negativos, sin pasar por coma flotante. La respuesta SHALL llevar `Content-Type: text/csv; charset=utf-8` y `Cache-Control: no-store`.

#### Scenario: Cabeceras HTTP del export
- WHEN se descarga cualquier export
- THEN la respuesta es `200` con `Content-Type: text/csv; charset=utf-8`, `Cache-Control: no-store` y `Content-Disposition: attachment` con el nombre del archivo

#### Scenario: Bytes del TXN
- GIVEN un intento con un único movimiento E `Successful` de la transacción `911545593909470`
- WHEN se descarga el TXN
- THEN el cuerpo empieza sin BOM por `ID,Status`, las líneas terminan en CRLF y la fila de datos contiene el ID completo y `SUC`

#### Scenario: Descripción con coma en el summary
- GIVEN un fee por batch con descripción `Wire fee, October`
- WHEN se descarga el summary
- THEN esa celda sale entre comillas dobles y el archivo sigue teniendo el mismo número de columnas en ese bloque

### Requirement: Summary del merchant
El export `summary` SHALL tener nueve bloques con cabecera, separados por una línea vacía: intento, totales, marcas, fees por batch, reservas, amount payable (nueve líneas con signo e importe y la fila `Amount payable`), incidencias, filas no procesadas y advertencias. Las cifras SHALL ser las de la vista, sin recalcular. Las fechas de negocio SHALL ir sin convertir y `processedAt` en hora de Nueva York (`ET`). Una advertencia con transacción SHALL llevar su ID de origen.

#### Scenario: Summary de batch-clean
- GIVEN `batch-clean` procesado con los dos fees prellenados
- WHEN se descarga `type=summary`
- THEN los totales por categoría, las reservas, `otherFeeAmt = 40.0000` y `Amount payable = 33771.3600` coinciden con `expected.summary`
- AND el bloque del amount payable tiene las nueve líneas en el orden fijo, y la suma con signo de sus importes es `33771.3600`

#### Scenario: Fechas del summary
- GIVEN un intento procesado el `2026-10-19T15:40:03.120Z` con rango APP máximo `2026-10-07T23:58:40.000Z`
- WHEN se descarga el summary
- THEN el intento muestra `2026-10-19 11:40:03 ET` como fecha de proceso y el rango APP termina en `2026-10-07 23:58:40`, sin convertir

#### Scenario: Intento sin auditoría de procesado
- GIVEN un batch del seed, que no tiene fila `settlement.process`
- WHEN se descarga su summary
- THEN el bloque de incidencias y el de filas no procesadas dicen `Not available` en lugar de ceros, y el resto de bloques sale con las cifras del batch

#### Scenario: Advertencia con el ID de origen
- GIVEN un intento con una advertencia `undated_adjustment` de la transacción interna `40711`, cuyo ID de origen es `911545598812004`
- WHEN se descarga el summary
- THEN el bloque de advertencias (`Code,Transaction ID,Detail`) muestra `911545598812004` y no `40711`

### Requirement: Texto del summary sin fórmulas
En el export `summary`, toda celda de texto (nombre de la cuenta, usuarios, canales, marcas, tipo y descripción de los fees por batch) que empiece por `=`, `+`, `-`, `@`, tabulador o retorno de carro SHALL llevar un apóstrofo delante, para que una hoja de cálculo la muestre y no la ejecute. Las cifras (también los importes negativos), las fechas y los IDs no SHALL cambiar. TXN y RR no llevan texto libre y no cambian.

#### Scenario: Texto que empieza como una fórmula
- GIVEN un fee por batch con descripción `=HYPERLINK("http://example.test","click")` y otro con importe `-25.0000`
- WHEN se descarga el summary
- THEN la descripción sale como `'=HYPERLINK(…)` (con las comillas de RFC 4180) y el importe sale `-25.0000`, sin apóstrofo

### Requirement: Lectura del intento
`GET /api/v1/settlements/{id}` SHALL responder `200` con la vista del intento, la misma forma que la respuesta `201` de procesar, construida a partir de lo escrito. También SHALL servir los intentos sin auditoría `settlement.process` (los del seed), con `validationSummary = null`, `skipped` en 0 y sin advertencias ni canales asociados. `settledStatus` SHALL derivarse del estado del intento: `processed` → `pending_payment`, `paid` → `settled`, `undone` → `undone`.

#### Scenario: Recargar el intento recién procesado
- GIVEN `batch-clean` procesado, con la respuesta `201` guardada
- WHEN `analyst` pide `GET /settlements/{batchId}`
- THEN recibe `200` con un cuerpo igual a la respuesta `201`, salvo el orden de las claves

#### Scenario: Batch del seed
- GIVEN un batch sembrado `paid` de ProviderA-USD
- WHEN `analyst` lo pide
- THEN recibe `200` con `status = paid`, `settledStatus = settled` y `validationSummary = null`, y el desglose del payable suma su `amountPayable`

#### Scenario: Cuenta anterior de otro merchant
- GIVEN `batch-clean` procesado (merchant 1) con un canal cuya cuenta primaria anterior era de un merchant 2
- WHEN `analyst` (merchants 1 y 2) y `viewer` (solo merchant 1) piden `GET /settlements/{batchId}`
- THEN `analyst` ve esa cuenta en `channelsAssigned[].previousAccount` y `viewer` recibe `{ accountId: null, name: null, outOfScope: true }`, como en la respuesta de procesar

### Requirement: Movimientos del intento
`GET /api/v1/settlements/{id}/transactions` SHALL exigir `type` ∈ `E` | `I` | `R` y devolver, paginados (`page` desde 1, `pageSize` 1–500, 50 por defecto) y con `total`, los movimientos del ciclo en orden estable. Cada uno SHALL traer transacción, estado, fila de origen, importes, fees con su desglose, fecha del evento (o `null`), reserva y `settled`, y los de la misma transacción y ciclo SHALL salir por separado.

#### Scenario: Ajustes de batch-clean
- GIVEN `batch-clean` procesado
- WHEN se piden sus movimientos `type=I`
- THEN `total = 10` (2 `Chargeback`, 6 `Refund`, 2 `RDR`) y cada movimiento trae su desglose de fees, cuya suma es su `feeAmount`

#### Scenario: Paginación estable
- GIVEN `batch-clean` procesado
- WHEN se piden las páginas 1 a 7 de `type=E` con `pageSize = 70`
- THEN entre todas salen los 450 movimientos E, cada uno una sola vez, y repetir una página devuelve los mismos movimientos en el mismo orden

#### Scenario: Ciclo inválido
- WHEN se pide `type=X`, sin `type` o con `pageSize = 501`
- THEN responde `400 validation_error`

### Requirement: Settled derivado del intento en las lecturas
Toda lectura de un intento y de sus movimientos SHALL derivar Settled del estado del intento (`paid`), nunca de `settlementStatusId`.

#### Scenario: Procesado frente a pagado
- GIVEN un intento `processed` y un batch sembrado `paid`
- WHEN se piden sus movimientos
- THEN los del intento `processed` traen `settled = false` y los del `paid`, `settled = true`

### Requirement: Intentos de un import
`GET /api/v1/imports/{id}/settlements` SHALL responder `200` con los intentos del import (vigente y deshechos), del más reciente al más antiguo por `processedAt`, cada uno con `batchId`, `batchNo`, `attemptNo`, `status`, `settledStatus`, `processedAt`, quién lo aprobó, `amountPayable` e `isCurrent` (es el `currentBatchId` del import). Un import sin intentos SHALL devolver una lista vacía.

#### Scenario: Import procesado
- GIVEN `batch-clean` procesado
- WHEN se piden sus intentos
- THEN hay uno, con `batchNo = 123`, `attemptNo = 1`, `status = processed`, `settledStatus = pending_payment` e `isCurrent = true`

#### Scenario: Import sin procesar
- GIVEN un import `validated`
- WHEN se piden sus intentos
- THEN la lista está vacía

### Requirement: Alcance y permisos de las lecturas y los exports
Las lecturas SHALL exigir autenticación y el export además `reports.view`, comprobado antes que el alcance (`403 forbidden`). Un intento o un import inexistente o de un merchant fuera del alcance del usuario SHALL responder el mismo `404 not_found` (`"Settlement not found"`, `"Import not found"`). Sin token SHALL responder `401 unauthorized`. Los errores SHALL ser JSON (`{ code, message, details? }`) también en la ruta del export.

#### Scenario: Batch de otro merchant
- GIVEN un batch sembrado de ProviderC-Alt (merchant 2)
- WHEN `viewer` (solo merchant 1) pide la vista, los movimientos o un export
- THEN recibe el mismo `404` que para un `batchId` inexistente

#### Scenario: Sin reports.view
- GIVEN un usuario autenticado sin `reports.view`
- WHEN pide un export de un batch de otro merchant o inexistente
- THEN recibe `403` con `code = "forbidden"` antes de mirar el alcance

#### Scenario: Tipo de export inválido
- WHEN se pide `type=pdf` o sin `type`
- THEN responde `400 validation_error` en JSON y no se escribe auditoría

#### Scenario: Sin token
- WHEN se pide cualquiera de las cuatro rutas sin `Authorization`
- THEN responde `401` con `code = "unauthorized"`

### Requirement: Pantalla Settlement Review: acceso y estado del import
Settlement Review SHALL ser una pantalla del import que exige `settlement.process`. Sin el permiso SHALL mostrar `You don't have access to this page` sin llamar a ningún endpoint de la pantalla. Con el permiso, SHALL mostrar el formulario solo si el import está `validated`. En otro estado SHALL decir por qué y SHALL enlazar a donde se puede seguir, sin formulario ni **Process**.

#### Scenario: viewer por enlace directo
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `viewer` abre su Settlement Review por la dirección
- **THEN** ve `You don't have access to this page` y no se llama a `batch-number/next`, `fees`, `fee-types` ni `settlements/preview`

#### Scenario: Import analizado
- **GIVEN** el import de `batch-clean` `analyzed`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** ve `This import is not validated. Review its validations before processing.` con un enlace al paso Analysis, sin formulario ni **Process**, y no se llama a `settlements/preview`

#### Scenario: Import ya procesado
- **GIVEN** el import de `batch-clean` `processed` con `currentBatchId`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** ve `This import is already processed.` con **View settlement summary**, que lleva al Settlement Summary de ese intento

### Requirement: Pantalla Settlement Review: número de batch propuesto y editable
Al abrir Settlement Review de un import `validated`, el campo **Batch number** SHALL llegar con el número de `GET /accounts/{accountId}/batch-number/next?importId=` y SHALL poder editarse. Solo SHALL admitir un entero positivo. La pantalla SHALL mostrar el intento que devuelve la vista previa, y SHALL decir cuándo el número propuesto es el de un intento deshecho del mismo import.

#### Scenario: Número propuesto de batch-clean (HU3 CA1)
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** el campo **Batch number** vale `123`, ve `Proposed: 123 · attempt 1` y puede escribir otro número

#### Scenario: Reproceso tras deshacer
- **GIVEN** `batch-number/next` responde `{ batchNo: 118, attemptNo: 2, reason: "reprocess" }`
- **WHEN** `analyst` abre Settlement Review
- **THEN** el campo vale `118` y ve `Proposed: 118 · attempt 2 (the previous attempt of this import was undone)`

#### Scenario: Número no válido
- **WHEN** `analyst` escribe `0` o `12a` en **Batch number**
- **THEN** ve `Enter a positive whole number.` en el campo y no se pide una vista previa con ese valor

### Requirement: Pantalla Settlement Review: número de batch en uso
Un número con intento vigente en la cuenta SHALL avisarse en el propio campo, tanto si lo dice la vista previa (`batchNoAvailable = false`) como si lo dice el `409 batch_no_taken` al procesar. Mientras el aviso esté a la vista, **Process** SHALL estar deshabilitado con su motivo. Tras el `409` no SHALL haberse creado nada y la pantalla SHALL seguir con lo que el analista escribió.

#### Scenario: Aviso desde la vista previa
- **GIVEN** la vista previa con `batchNo = 117` responde `batchNoAvailable = false`
- **WHEN** `analyst` escribe `117`
- **THEN** ve `Batch 117 already has an active attempt for this account.` en el campo y **Process** está deshabilitado con `Choose a batch number that is not in use.`

#### Scenario: Número tomado al procesar (criterio 1 del issue)
- **GIVEN** la vista previa de `123` decía `batchNoAvailable = true`
- **WHEN** `analyst` pulsa **Process** y el API responde `409 batch_no_taken` con `details.batchNo = 123`
- **THEN** ve `Batch 123 already has an active attempt for this account.` en el campo **Batch number**, sigue en Settlement Review con sus fees y su fecha, y se vuelve a pedir la vista previa

### Requirement: Pantalla Settlement Review: fecha de liquidación
**Settlement date** SHALL ser una fecha de negocio obligatoria (`YYYY-MM-DD`), vacía al abrir hasta que el analista la elige, y enviada tal cual en `settlementDate` (P8 de #11). Sin ella SHALL NOT pedirse la vista previa ni procesarse, y el campo SHALL mostrar su motivo. La fecha SHALL NOT convertirse de zona.

#### Scenario: Al abrir
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** **Settlement date** está vacía con `Choose the settlement date.`, el resumen previo dice `Choose the settlement date to see the pre-summary.`, **Process** está deshabilitado con `Choose the settlement date.` y no se llama a `settlements/preview`

#### Scenario: Fecha elegida
- **WHEN** `analyst` elige `2026-10-24` en **Settlement date**
- **THEN** se pide la vista previa con `"settlementDate": "2026-10-24"` y el procesamiento envía la misma fecha

#### Scenario: Fecha borrada
- **GIVEN** una vista previa con `2026-10-24`
- **WHEN** `analyst` borra **Settlement date**
- **THEN** ve `Choose the settlement date.` en el campo, el resumen previo queda desactualizado y **Process** se deshabilita con ese motivo

### Requirement: Pantalla Settlement Review: fees prellenados desde Other Fees
Los `batchFees` de `GET /imports/{id}` SHALL aparecer como filas de fees por batch con su tipo, su importe y origen `From file` (`source = file`), y el analista SHALL poder ajustar el importe, cambiar la descripción o quitarlas. Una fila con `feeTypeId = null` SHALL mostrarse marcada hasta que el analista le elija un tipo con `allowsFreeAmount` o la quite. Una fila sin importe SHALL exigir el importe.

#### Scenario: Prellenados de batch-clean
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review y elige **Settlement date**
- **THEN** ve dos filas `From file`: `Wire Fee` con `25.0000` y `Settlement Fee` con `15.0000`
- **AND** la vista previa se pide con esos dos fees, `source = "file"` y `feeId = null`

#### Scenario: Ajustar un prellenado (criterio 2 del issue)
- **WHEN** `analyst` cambia el importe de `Wire Fee` a `30.0000`
- **THEN** la siguiente vista previa envía ese fee con `"amount": "30.0000"` y `source = "file"`, y el resumen previo pinta lo que el API devuelve

#### Scenario: Quitar un prellenado
- **WHEN** `analyst` pulsa **Remove** en `Settlement Fee`
- **THEN** la fila desaparece y la siguiente vista previa envía solo `Wire Fee`

#### Scenario: Tipo desconocido en el archivo
- **GIVEN** `GET /imports/{id}` trae un fee con `feeTypeId = null`, `title = "Bank charge"` y su advertencia
- **WHEN** `analyst` abre Settlement Review
- **THEN** la fila aparece marcada con `Unknown fee type in the file: choose a free-amount type or remove the fee.`, el selector solo ofrece tipos con `allowsFreeAmount`, **Process** está deshabilitado con `Choose a type for the fees of unknown type, or remove them.` y no se pide la vista previa

#### Scenario: Tipo elegido para la fila desconocida
- **WHEN** `analyst` elige `Special Adjustment` para la fila `Bank charge`
- **THEN** la fila deja de estar marcada y la vista previa la envía con ese `feeTypeId`, `feeId = null` y `source = "file"`

#### Scenario: Fila desconocida quitada
- **WHEN** `analyst` pulsa **Remove** en la fila `Bank charge`
- **THEN** la fila desaparece, el motivo de **Process** se va y la vista previa se pide sin ella

### Requirement: Pantalla Settlement Review: añadir un fee preestablecido
**Add preset fee** SHALL ofrecer los fees no transaccionales de la cuenta vigentes en **Settlement date** (`GET /accounts/{id}/fees?transactional=false&asOf=<settlementDate>`), y SHALL estar deshabilitado con su motivo mientras no haya fecha. Con `fixedAmount` el importe SHALL llegar con ese valor y ser editable. Con solo porcentaje SHALL llegar vacío para que lo escriba el analista: la pantalla SHALL NOT calcular ningún importe.

#### Scenario: Sin fecha todavía
- **GIVEN** **Settlement date** vacía
- **THEN** **Add preset fee** está deshabilitado con `Choose the settlement date first.` y no se llama a `GET /accounts/{id}/fees`

#### Scenario: Preestablecidos de la fecha
- **WHEN** `analyst` elige `2026-10-24` en **Settlement date** y abre **Add preset fee**
- **THEN** se llama a `GET /accounts/<ProviderA-USD>/fees?transactional=false&asOf=2026-10-24` y ve sus preestablecidos con su configuración y su vigencia

#### Scenario: Preestablecido con importe fijo (HU3 CA2)
- **GIVEN** una cuenta con el preestablecido `Monthly Fee` de `fixedAmount = 250.0000`
- **WHEN** `analyst` lo añade y cambia el importe a `240.0000`
- **THEN** la fila muestra `Preset` y la vista previa la envía con su `feeId`, `feeTypeId`, `"amount": "240.0000"` y `source = "manual"`

#### Scenario: Preestablecido solo con porcentaje
- **GIVEN** ProviderA-USD con el preestablecido `Chargeback over 1%` con `percentage = 0.010000` y `fixedAmount = null`
- **WHEN** `analyst` lo añade
- **THEN** el importe está vacío con `Percentage-only fee (rate 0.010000): enter the amount.` y no se pide otra vista previa hasta que el analista escriba un importe

### Requirement: Pantalla Settlement Review: añadir un fee de importe libre
**Add free-amount fee** SHALL ofrecer solo los tipos no transaccionales con `allowsFreeAmount` de `GET /fee-types`. La fila SHALL pedir importe y descripción (1–200 caracteres, obligatoria también en el API) y SHALL enviarse con `feeId = null` y `source = "manual"`.

#### Scenario: Ajuste negativo (HU3 CA2)
- **WHEN** `analyst` añade un fee de importe libre `Special Adjustment` con `-42.5000` y la descripción `Duplicate in batch 118`
- **THEN** la vista previa lo envía con `"feeId": null`, `"amount": "-42.5000"`, la descripción y `source = "manual"`

#### Scenario: Tipos ofrecidos
- **WHEN** `analyst` abre **Add free-amount fee**
- **THEN** ve `Special Adjustment` y `Bram Fine` y no ve `Wire Fee` (sin importe libre) ni ningún tipo transaccional

#### Scenario: Sin descripción
- **WHEN** deja vacía la descripción de un fee de importe libre
- **THEN** ve `Write a description for a free-amount fee.` y no se pide otra vista previa hasta que la escriba

### Requirement: Pantalla Settlement Review: importes de los fees
El importe de cada fee SHALL escribirse y enviarse como texto decimal con signo opcional, hasta 4 decimales y distinto de cero. Un importe no válido SHALL marcarse en su fila y, mientras el formulario tenga un campo no válido, SHALL NOT pedirse otra vista previa. El importe SHALL NOT convertirse a número en ningún paso.

#### Scenario: Importe no válido
- **WHEN** `analyst` escribe `12.34567`, `0`, `-0.0000` o `1,5` en un importe
- **THEN** ve `Enter an amount with up to 4 decimals, other than zero.` en esa fila y no se pide una vista previa con ese valor

#### Scenario: Importe con muchos dígitos
- **WHEN** `analyst` escribe `123456789012345.1234`
- **THEN** la vista previa lo envía exactamente como `"123456789012345.1234"`

### Requirement: Pantalla Settlement Review: fee rechazado por el API
Un `400 batch_fee_invalid` de la vista previa o del procesamiento SHALL mostrarse en la fila de `details.index` con el texto de su `reason`, y **Process** SHALL quedar deshabilitado hasta que esa fila cambie o se quite.

#### Scenario: Importe libre no admitido
- **WHEN** la vista previa responde `400 batch_fee_invalid` con `{ index: 1, reason: "free_amount_not_allowed" }`
- **THEN** la segunda fila muestra `This fee type does not accept a free amount.` y **Process** está deshabilitado con `Fix the highlighted fields.`

#### Scenario: Preestablecido fuera de vigencia
- **WHEN** la vista previa responde `400 batch_fee_invalid` con `reason = "fee_not_in_force"` para la fila 0
- **THEN** la primera fila muestra `This preset fee is not in force on the settlement date.`

#### Scenario: Descripción exigida por el API
- **WHEN** la vista previa o el procesamiento responde `400 batch_fee_invalid` con `{ index: 2, reason: "description_required" }`
- **THEN** la descripción de la tercera fila muestra `Write a description for a free-amount fee.`

### Requirement: Pantalla Settlement Review: resumen previo
Tras cada cambio válido del formulario, con debounce, la pantalla SHALL pedir `POST /imports/{id}/settlements/preview` con el `runId` revisado y SHALL pintar los movimientos E/I/R, los totales de las cinco categorías, las nueve líneas de `payableBreakdown` con su signo, `amountPayable`, `skipped` por motivo y las advertencias. Toda cifra SHALL salir de la respuesta: la pantalla SHALL NOT calcular ni sumar importes.

#### Scenario: Resumen previo de batch-clean
- **GIVEN** el import de `batch-clean` `validated` con sus dos fees prellenados
- **WHEN** `analyst` abre su Settlement Review y elige `2026-10-24` en **Settlement date**
- **THEN** se pide una vista previa con el `runId` de la corrida revisada y ve las cinco categorías, las nueve líneas del desglose en el orden del API con `+` o `−`, `Batch fees` con el `otherFeeAmt` de la respuesta y **Amount payable** con el `amountPayable` de la respuesta, todos con separador de miles y sus cuatro decimales

#### Scenario: Filas que no se procesan
- **GIVEN** la vista previa con `skipped = { ignored: 3, unmatched: 0, ambiguous: 0, excluded: 2, unresolvedStatus: 0, pending: 0 }`
- **THEN** ve `Not processed: 3 ignored · 2 excluded` y ningún motivo con 0

#### Scenario: Advertencias
- **GIVEN** la vista previa trae `undated_adjustment` de `441706751475644` y `reserve_cap_not_applied`
- **THEN** ve `Adjustment 441706751475644 has no event date: it is processed without one.` y `The reserve cap of the account is not applied yet.`

#### Scenario: Una cifra que no cuadra con la suma
- **GIVEN** una vista previa guionizada cuyo `amountPayable` no es la suma de sus líneas
- **THEN** la pantalla pinta el `amountPayable` de la respuesta tal cual, sin corregirlo

### Requirement: Pantalla Settlement Review: resumen previo al día
Mientras el formulario tenga cambios sin vista previa, o una vista previa esté en curso, el resumen previo SHALL marcarse como desactualizado y **Process** SHALL estar deshabilitado. Cambios seguidos dentro del debounce SHALL producir una sola petición, y la respuesta de una petición superada SHALL NOT pintarse.

#### Scenario: Escritura seguida
- **WHEN** `analyst` escribe `3`, `0` y `.5` seguidos en un importe
- **THEN** se pide una sola vista previa, con `"30.5"`, y mientras tanto ve `Updating the pre-summary…` y **Process** deshabilitado con `Waiting for the pre-summary.`

#### Scenario: Respuesta fuera de orden
- **GIVEN** una vista previa A retenida y una posterior B ya respondida
- **WHEN** A responde
- **THEN** la pantalla sigue pintando B

### Requirement: Pantalla Settlement Review: canales a asociar
Si la vista previa trae `requiresChannelConfirmation = true`, la pantalla SHALL listar `channelsToAssign` (sin cuenta, el nombre de la otra cuenta o, si esa cuenta es de un comercio fuera del alcance, solo que es de otro comercio) y SHALL pedir la casilla **Assign these channels to this account as primary**. Sin marcarla, **Process** SHALL estar deshabilitado con su motivo. Marcada, el cuerpo SHALL llevar `confirmChannelAssignment: true`.

#### Scenario: RAM-07 sin cuenta (HU3 CA5)
- **GIVEN** la vista previa de `batch-clean` con `RAM-07` `unassigned` en `channelsToAssign`
- **THEN** ve `RAM-07 · not assigned yet`, la casilla sin marcar y **Process** deshabilitado con `Confirm the channel assignment.`
- **AND** al marcarla, **Process** se habilita y el procesamiento envía `"confirmChannelAssignment": true`

#### Scenario: Canales cambiados al procesar
- **WHEN** **Process** responde `409 channel_assignment_not_confirmed` con `RAM-03` en `details.channels`
- **THEN** ve `RAM-03` en la lista, la casilla vuelve a estar sin marcar y se pide otra vista previa

#### Scenario: Sin canales que asociar
- **GIVEN** la vista previa con `requiresChannelConfirmation = false`
- **THEN** no hay casilla ni aviso, y el cuerpo no lleva `confirmChannelAssignment`

#### Scenario: Cuenta principal de otro comercio
- **GIVEN** la vista previa con `RAM-08` `assigned_to_other_account` y `otherAccount = { accountId: null, name: null, outOfScope: true }`
- **THEN** ve `RAM-08 · primary account: an account of another merchant`

### Requirement: Pantalla Settlement Review: procesar
**Process batch N** SHALL enviar a `POST /imports/{id}/settlements` exactamente el cuerpo de la vista previa a la vista más la confirmación de canales, una sola vez aunque se pulse dos veces, y SHALL estar deshabilitado con cada motivo visible y asociado al botón. Con `201` SHALL llevar al Settlement Summary del intento devuelto y pintar esa respuesta sin otra petición.

#### Scenario: Procesar batch-clean (HU3 CA6)
- **GIVEN** la vista previa de `batch-clean` al día y la casilla de canales marcada
- **WHEN** `analyst` pulsa **Process batch 123** dos veces seguidas
- **THEN** el API recibe un solo `POST /imports/<importId>/settlements` con `runId`, `batchNo = 123`, los dos fees prellenados y `confirmChannelAssignment = true`, y con el `201` la pantalla pasa al Settlement Summary del `batchId` devuelto sin pedir `GET /settlements/<batchId>`

#### Scenario: Botón deshabilitado mientras procesa
- **WHEN** el `POST` está retenido
- **THEN** **Process** y los campos están deshabilitados y ve `Processing the batch…`

#### Scenario: Import que ya no está validado
- **WHEN** **Process** responde `409 import_not_validated` con `details.status = analyzed`
- **THEN** ve `The import is no longer validated (status: analyzed). Review its validations again.`, se relee el import y la pantalla pasa al estado de import no validado

#### Scenario: Corrida superada
- **WHEN** **Process** o la vista previa responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before processing.` con un enlace al paso Analysis y **Process** deshabilitado

#### Scenario: Fallo de red
- **WHEN** **Process** falla sin respuesta del API
- **THEN** ve `The batch could not be processed. Try again.`, sigue en Settlement Review con lo escrito y **Process** vuelve a estar disponible

#### Scenario: Procesamiento ocupado
- **WHEN** **Process** responde `409 settlement_busy`
- **THEN** ve `Another settlement is being processed for this provider. Try again.` con **Retry**, sigue en Settlement Review con lo escrito y la vista previa no se vuelve a pedir
- **AND** **Retry** envía otra vez el mismo cuerpo, y con el `201` pasa al Settlement Summary
- **AND** **Retry** se deshabilita con los mismos motivos que **Process** (por ejemplo, la casilla de canales desmarcada), y cambiar un campo quita el aviso

### Requirement: Pantalla Settlement Summary: estado y cabecera del intento
Settlement Summary SHALL mostrar el intento (cuenta, batch, intento), su estado (`Processed · pending payment`, `Paid` o `Undone`), quién lo procesó y cuándo, la fecha de liquidación y los rangos de fechas, y SHALL decir que un intento `processed` no tiene movimientos Settled.

#### Scenario: Recién procesado (HU3 CA6)
- **GIVEN** la respuesta `201` de procesar `batch-clean`
- **THEN** ve `Settlement Summary · batch 123`, `ProviderA-USD · attempt 1`, `Processed · pending payment`, `Processed by analyst on <fecha>` y `Movements are not Settled yet: that happens when the batch is marked as paid.`

### Requirement: Pantalla Settlement Summary: totales y amount payable auditable
La pantalla SHALL mostrar los movimientos E/I/R, los totales de las cinco categorías con cantidad, importe y fee, los totales por marca, `reservesReleasedQty`, y las nueve líneas de `payableBreakdown` en el orden del API, con su etiqueta, su signo y su importe, hasta `amountPayable`. Toda cifra SHALL salir de la vista del API sin recalcularse.

#### Scenario: Desglose de batch-clean
- **GIVEN** la vista del intento de `batch-clean`
- **THEN** ve las líneas `+ Deposits`, `− Chargebacks`, `− Refunds`, `− RDR`, `− Transaction fees`, `− Batch fees`, `− Reserve held`, `+ Reserve released` y `+ Reserve released on chargeback` con los importes de la respuesta y, debajo, **Amount payable** con su `amountPayable`

#### Scenario: Línea en cero
- **GIVEN** la vista con `reserve_early_released` en `0.0000`
- **THEN** la línea aparece con `0.0000`, no se oculta

### Requirement: Pantalla Settlement Summary: fees, reservas, canales e incidencias
La pantalla SHALL mostrar los fees transaccionales (`transactionalFeeAmt`, `mdrAmt` y su tasa), cada fee por batch con su origen y su usuario, las reservas retenida, liberada y liberada por chargeback, los canales asociados en el intento, el resumen de incidencias de la corrida, `skipped` y las advertencias.

#### Scenario: Fee ajustado con mi usuario (criterio 2 del issue)
- **GIVEN** `batch-clean` procesado por `analyst` con `Wire Fee` ajustado a `30.0000`
- **THEN** ve `Wire Fee · From file · 30.0000 · entered by analyst`

#### Scenario: Canal asociado
- **GIVEN** la vista con `RAM-07` en `channelsAssigned` como `new_primary`
- **THEN** ve `RAM-07 · assigned to this account as primary`

#### Scenario: Cuenta anterior de otro comercio
- **GIVEN** la vista con `RAM-03` como `primary_moved_from` y `previousAccount = { accountId: null, name: null, outOfScope: true }`
- **THEN** ve `RAM-03 · primary account moved here from an account of another merchant`

#### Scenario: Intento sin resumen de incidencias
- **GIVEN** la vista con `validationSummary = null` (un intento sin auditoría de `settlement.process`, como el historial sembrado)
- **THEN** ve `The validation summary of this attempt is not available.` y el enlace al paso Analysis, sin contadores

#### Scenario: Incidencias
- **GIVEN** `validationSummary = { persistent: 13, resolved: 2, blocking: 0, resolvedMissing: 4 }`
- **THEN** ve `13 persistent · 2 resolved · 0 blocking · 4 missing resolved by this batch` con un enlace al paso Analysis del import

### Requirement: Pantalla Settlement Summary: recarga por su enlace
Al abrir o recargar `/settlements/<batchId>`, la pantalla SHALL pedir `GET /settlements/{batchId}`. Un `404` SHALL mostrar `Settlement not found` con un enlace a Dashboard.

#### Scenario: Recargar
- **GIVEN** `analyst` en el Settlement Summary del batch recién procesado
- **WHEN** recarga la página
- **THEN** se pide `GET /settlements/<batchId>` y ve el mismo intento

#### Scenario: Intento inexistente o fuera del alcance
- **WHEN** `GET /settlements/<batchId>` responde `404`
- **THEN** ve `Settlement not found` y un enlace a Dashboard

### Requirement: Pantalla Settlement Summary: descargas
La pantalla SHALL ofrecer **Merchant summary**, **Transactions (CSV)** y **Reserves (CSV)** a quien tenga `reports.view`. Mientras las descargas del API no existan, SHALL mostrarlas deshabilitadas con su motivo. Disponibles, cada una SHALL descargar el archivo con el nombre identificado por intento, y descargar SHALL NOT cambiar nada en pantalla. Junto a los CSV del Back-Office SHALL avisar de que no se abren con Excel antes de subirlos.

#### Scenario: Antes de las descargas del API
- **GIVEN** las descargas aún no disponibles
- **THEN** los tres botones están deshabilitados con `Downloads are not available yet.` asociado a cada uno, y no hay enlaces de descarga

#### Scenario: Descargar los tres (criterio 3 del issue)
- **GIVEN** las descargas disponibles y un intento `processed`
- **WHEN** `analyst` pulsa los tres botones
- **THEN** se descargan `ProviderA-USD_B123_A1_summary.csv`, `ProviderA-USD_B123_A1_transactions.csv` y `ProviderA-USD_B123_A1_reserves.csv` y el estado sigue `Processed · pending payment`

#### Scenario: Aviso de Excel en los CSV del Back-Office
- **GIVEN** las descargas disponibles
- **THEN** junto a los botones se lee que los CSV se suben al Back-Office tal como se descargan, sin abrirlos ni guardarlos con Excel, y que para mirarlos se usa Data → From Text/CSV con la columna ID como Text
- **AND** ese aviso describe **Transactions (CSV)** y **Reserves (CSV)**, y no **Merchant summary**

#### Scenario: Sin reports.view
- **GIVEN** un usuario sin `reports.view`
- **THEN** no ve los botones de descarga

### Requirement: Pantalla Settlement Summary: solo lectura
`viewer` SHALL poder abrir Settlement Summary de un intento de su alcance y verlo entero, sin acciones que escriban. Ninguna pantalla de settlement SHALL ofrecer pagar, retirar el pago ni deshacer.

#### Scenario: viewer
- **WHEN** `viewer` abre el Settlement Summary del intento de `batch-clean`
- **THEN** ve el intento, los totales, el desglose, los fees y las descargas que su permiso admite, y ningún botón de pagar ni de deshacer

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio (`dateRanges`, `settlementDate`, vigencias de los fees) SHALL mostrarse con los dígitos recibidos y sufijo `ET`, sin convertir. Las de auditoría (`processedAt`) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11.000Z"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24 ET`, `2026-09-28 00:04 ET` y `2026-10-19 11:40 ET`

### Requirement: Pantallas de settlement: teclado y motivos
Todas las acciones de Settlement Review y Settlement Summary SHALL poder hacerse solo con teclado. Todo botón deshabilitado SHALL llevar su motivo en texto visible asociado con `aria-describedby`.

#### Scenario: Procesar con teclado
- **WHEN** `analyst` recorre Settlement Review con Tab, Enter y Espacio
- **THEN** puede editar el número, añadir y quitar fees, marcar la casilla de canales y pulsar **Process**, y cada botón deshabilitado anuncia su motivo

#### Scenario: Summary con teclado
- **GIVEN** las descargas disponibles
- **WHEN** `analyst` recorre el Settlement Summary con Tab
- **THEN** llega a **Merchant summary**, **Transactions (CSV)**, **Reserves (CSV)**, **View the validations** y **Back to Dashboard**
