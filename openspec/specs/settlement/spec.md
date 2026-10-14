# settlement

## Purpose
Procesar un import validado como intento de batch, calcular movimientos por ciclo, fees, reservas y summary, exportar y registrar el pago. README §3.2 (SettlementBatch, SettlementTransaction, SettlementBatchFee), §4.3, HU3, doc 04 (export Back-Office).

## Requirements

### Requirement: Intentos de batch
Procesar SHALL crear un `SettlementBatch` con `batchNo` propuesto (último + 1, editable) y `attemptNo`; solo un intento vigente por (cuenta, batchNo) y por import. Deshacer SHALL marcar el intento `undone`, devolver el import a `analyzed` y conservar todo; el siguiente intento incrementa `attemptNo`.

### Requirement: Movimientos por ciclo
Cada fila incluida SHALL producir una `SettlementTransaction` con su `cycle`, estado al procesarse, importe USD del gateway, fees aplicados por fecha de evento y, en E, reserva retenida según `appliedReservePct`; en R, reserva liberada referenciando la misma transacción. `UNIQUE (transactionId, cycle, batchId)`.

#### Scenario: Summary del batch limpio
- WHEN se procesa `data/samples/batch-clean` con todas las filas incluidas
- THEN `qty`, `amounts`, `fees` y `amountPayable` coinciden con `expected.summary`

### Requirement: Fees por batch prellenados
Las filas de `Other Fees` SHALL aparecer en Settlement Review como `SettlementBatchFee` propuestos (`source = file`), con el tipo resuelto por nombre contra `FeeType`; un tipo desconocido SHALL quedar como importe libre con advertencia. El analista puede ajustar, quitar o añadir (`source = manual`).

### Requirement: Política de reserva ante chargeback
Con `release_on_chargeback`, un chargeback sobre una transacción con reserva retenida SHALL liberar esa reserva en el mismo batch (`reserveEarlyReleasedAmt`) y dejar de esperarse en R; con `hold_until_term` la reserva sigue su plazo.

### Requirement: Settled solo al pagar
Un movimiento SHALL considerarse Settled únicamente cuando su batch está `paid`; marcar pagado y retirar la marca SHALL auditarse con usuario y fecha.

### Requirement: Exports
El batch SHALL exportar (a) el summary, (b) CSV Back-Office de transacciones con columnas `ID, Status` (`SUC/CHB/REF/RDR`, sin Declined; ciclos E e I) y (c) CSV de reservas con `ID, Description` = `Batch <batchNo>`. Los IDs SHALL escribirse como texto. Los exports se identifican por intento.
