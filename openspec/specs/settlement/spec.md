# settlement

## Purpose
Procesar un import validado como intento de batch, calcular movimientos por ciclo, fees, reservas y summary, exportar y registrar el pago. README §3.2 (SettlementBatch, SettlementTransaction, SettlementBatchFee), §4.3, HU3, doc 04 (export Back-Office).

## Requirements

### Requirement: Intentos de batch
Procesar SHALL crear un `SettlementBatch` con `batchNo` propuesto (último + 1, editable) y `attemptNo`; solo un intento vigente por (cuenta, batchNo) y por import. Deshacer SHALL marcar el intento `undone`, devolver el import a `analyzed` y conservar todo; el siguiente intento incrementa `attemptNo`.

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

### Requirement: Movimientos por ciclo
Cada fila incluida SHALL producir una `SettlementTransaction` con su `cycle`, estado al procesarse, importe USD del gateway, fees aplicados por fecha de evento y, en E, reserva retenida según `appliedReservePct`; en R, reserva liberada referenciando la misma transacción. `UNIQUE (transactionId, cycle, batchId)`.

#### Scenario: Summary del batch limpio
- WHEN se procesa `data/samples/batch-clean` con todas las filas incluidas
- THEN `qty`, `amounts`, `fees` y `amountPayable` coinciden con `expected.summary`

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
El batch SHALL exportar (a) el summary, (b) CSV Back-Office de transacciones con columnas `ID, Status` (`SUC/CHB/REF/RDR`, sin Declined; ciclos E e I) y (c) CSV de reservas con `ID, Description` = `Batch <batchNo>`. Los IDs SHALL escribirse como texto. Los exports se identifican por intento.

#### Scenario: Exports disponibles al procesar, sin efecto en el pago
- GIVEN un batch recién procesado
- WHEN el analista descarga el summary y los dos CSV
- THEN cada export está identificado por su intento y la descarga no cambia el estado del batch ni marca nada como Settled

#### Scenario: IDs como texto
- GIVEN un batch con transacciones de ID numérico de 15 dígitos
- WHEN se exportan los CSV y el summary
- THEN los IDs se escriben como texto, sin notación científica ni pérdida de dígitos
