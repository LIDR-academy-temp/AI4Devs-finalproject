## MODIFIED Requirements

### Requirement: Política de reserva ante chargeback
Con `release_on_chargeback`, el primer movimiento I (`Chargeback`, también `CHB 2`, `Refund` o `RDR`) de una transacción con reserva retenida en un E vigente, sin R ni liberación anticipada vigentes, SHALL guardar en `reserveEarlyReleasedAmt` todo el `reserveHeldAmt` de ese E, sin prorratear, y sumarlo en `amountPayable`. Con `hold_until_term` o sin reserva retenida SHALL valer 0. Todo movimiento I SHALL guardar en `reservePolicySnapshot` la política y su resultado.

#### Scenario: Liberación inmediata
- GIVEN `data/samples/batch-issues` validado en ProviderB-Main (`release_on_chargeback`) con las inclusiones por defecto, cuyos ajustes CHB, REF y RDR tienen la reserva retenida en batches `paid` anteriores
- WHEN se procesa
- THEN cada movimiento I de `expected.reserveEarlyRelease.released` tiene `reserveEarlyReleasedAmt` igual a su `amount` del oráculo y `reservePolicySnapshot = { policy: "release_on_chargeback", applied: true, outcome: "released", heldInBatchId: <batch que lo retuvo> }`
- AND la vista trae `reserveEarlyReleasedAmt = expected.reserveEarlyRelease.reserveEarlyReleasedAmt`, la línea `reserve_early_released` de `payableBreakdown` con ese importe y signo `+`, y la suma con signo del desglose sigue siendo `amountPayable`

#### Scenario: Ajuste sin reserva retenida
- GIVEN el mismo batch, cuyo chargeback de RAM-13 (`expected.affectedIds.non_recorded_adjustment`) no tiene ningún E liquidado
- WHEN se procesa
- THEN ese movimiento I tiene `reserveEarlyReleasedAmt = 0.0000` y `outcome = "no_held_reserve"`

#### Scenario: Reserva retenida en el mismo batch
- GIVEN un import de una cuenta `release_on_chargeback` con la fila APP y la fila CHB de la misma transacción, cuyo E retiene 12.3457
- WHEN se procesa
- THEN el movimiento I tiene `reserveEarlyReleasedAmt = 12.3457` y `heldInBatchId = null`, y en el batch la reserva retenida y la liberada se compensan en `amountPayable`

#### Scenario: Refund y RDR liberan como un chargeback
- GIVEN una cuenta `release_on_chargeback` y dos transacciones con reserva retenida en un intento vigente, una en la hoja REF y otra en la hoja RDR
- WHEN se procesa
- THEN cada movimiento I libera el `reserveHeldAmt` de su E con `outcome = "released"`, y esas reservas dejan de esperarse en R

#### Scenario: Ajuste parcial libera toda la reserva
- GIVEN una cuenta `release_on_chargeback` y una transacción de 200.0000 USD cuyo E retuvo 20.0000, con una fila REF de 50.0000 en el archivo
- WHEN se procesa
- THEN el movimiento I `Refund` tiene `reserveEarlyReleasedAmt = 20.0000`: se libera toda la reserva retenida, sin prorratear por el importe del ajuste

#### Scenario: Reserva retenida en otra cuenta del proveedor
- GIVEN una transacción cuyo E `Successful` con reserva está en un intento vigente de otra cuenta del proveedor con `hold_until_term`
- WHEN una cuenta `release_on_chargeback` del mismo proveedor procesa su ajuste
- THEN se libera la reserva de ese E y el snapshot guarda la política de la cuenta que procesa el ajuste

#### Scenario: Retención hasta el plazo
- GIVEN una cuenta con `hold_until_term` y transacciones `Successful` liquidadas en E con reserva retenida, con un `Chargeback`, un `Refund` y un `RDR`
- WHEN un batch procesa esos ajustes
- THEN los tres tienen `reserveEarlyReleasedAmt = 0.0000` y `reservePolicySnapshot = { policy: "hold_until_term", applied: true, outcome: "held_until_term", heldInBatchId: null }`, y las reservas siguen retenidas hasta cumplir el plazo del canal

#### Scenario: Chargeback y CHB 2 del mismo movimiento
- GIVEN una cuenta `release_on_chargeback` y un `Chargeback` y un `CHB 2` de la misma transacción con reserva retenida en el mismo import
- WHEN se procesa
- THEN solo el primero en orden de proceso libera la reserva; el segundo tiene `reserveEarlyReleasedAmt = 0.0000` y `outcome = "already_released"`

#### Scenario: Refund y Chargeback de la misma transacción
- GIVEN una cuenta `release_on_chargeback` y una transacción con reserva retenida que aparece en la hoja REF y en la hoja CHB del mismo import
- WHEN se procesa
- THEN el primer movimiento I en orden de proceso libera la reserva y el otro tiene `reserveEarlyReleasedAmt = 0.0000` y `outcome = "already_released"`

#### Scenario: Reserva ya liberada en un batch anterior
- GIVEN una transacción cuya reserva liberó un ajuste de un intento vigente anterior
- WHEN se procesa otro ajuste suyo, de cualquiera de los tres estados
- THEN el movimiento nuevo tiene `reserveEarlyReleasedAmt = 0.0000` y `outcome = "already_released"`

#### Scenario: Reserva liberada en R
- GIVEN una transacción con un movimiento R vigente, o con una fila RR en el mismo import
- WHEN una cuenta `release_on_chargeback` procesa su ajuste
- THEN el movimiento I tiene `reserveEarlyReleasedAmt = 0.0000` y `outcome = "released_in_r"`, y la R libera su importe completo

#### Scenario: Liberación de un intento deshecho
- GIVEN un intento que liberó por un ajuste la reserva de una transacción y que después se deshizo
- WHEN se reprocesa el import o se procesa otro ajuste de esa transacción
- THEN la liberación deshecha no cuenta: el movimiento nuevo vuelve a liberar la reserva con `outcome = "released"`

#### Scenario: Vista previa igual que procesar
- GIVEN `batch-issues` validado
- WHEN se pide la vista previa y después se procesa con el mismo cuerpo
- THEN las dos traen el mismo `reserveEarlyReleasedAmt`, el mismo `payableBreakdown` y el mismo `amountPayable`

### Requirement: Reserva retenida y liberada
Un movimiento E `Successful` SHALL retener `appliedReservePct` de la transacción × su importe, a 4 decimales (mitad hacia arriba en el cuarto), con `reserveDaysUsed` y `expectedReserveReleaseAt` del plazo del canal. Un movimiento R SHALL liberar el mismo cálculo sobre su transacción, salvo que su reserva ya la liberara un ajuste (requisito "Reserva ya liberada por un ajuste"). Llegar a `expectedReserveReleaseAt` no confiere Settled.

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

### Requirement: Advertencias del procesamiento
La vista previa y la respuesta SHALL traer `warnings` con código y, cuando aplica, transacción, hoja y fila. Entre ellas: `undated_adjustment`, `no_transactional_fees`, `reserve_cap_not_applied` (cuenta con tope de reserva, que no se aplica en el MVP) y `reserve_already_released`. `chargeback_reserve_policy_not_applied` SHALL NOT emitirse más: solo la conservan los intentos procesados antes de aplicarse la política.

#### Scenario: Cuenta release_on_chargeback
- GIVEN un import validado de ProviderB-Main (`release_on_chargeback`) con un ajuste de una transacción con reserva retenida
- WHEN se procesa
- THEN el movimiento I libera la reserva y la respuesta no trae `chargeback_reserve_policy_not_applied`

#### Scenario: Intento procesado antes de la política
- GIVEN un intento cuya auditoría `settlement.process` guardó la advertencia `chargeback_reserve_policy_not_applied`
- WHEN se lee su vista o se descarga su summary
- THEN la advertencia sigue apareciendo y sus movimientos I conservan `reserveEarlyReleasedAmt = 0.0000`

#### Scenario: Cuenta con tope de reserva
- GIVEN ProviderA-EUR, con `rollingReserveCapAmt`
- WHEN se procesa un import suyo
- THEN la reserva se calcula sin tope y la respuesta trae la advertencia `reserve_cap_not_applied`

## ADDED Requirements

### Requirement: Reserva ya liberada por un ajuste
Una fila RR de una transacción cuya reserva liberó un ajuste (`Chargeback`, `Refund` o `RDR`) en un movimiento I de un intento vigente SHALL producir su movimiento R con `reserveReleasedAmt = 0` y la advertencia `reserve_already_released`, con la transacción, la hoja y la fila. Ese movimiento SHALL contar en `reservesReleasedQty` y salir en el RR, porque una reserva no se libera dos veces.

#### Scenario: RR de una reserva liberada por un ajuste
- GIVEN una transacción cuya reserva liberó un chargeback, un refund o un RDR de un intento vigente de ProviderB-Main
- WHEN se procesa un import con su fila RR
- THEN su movimiento R tiene `reserveReleasedAmt = 0.0000`, la respuesta trae `reserve_already_released` con esa transacción, hoja y fila, y el RR la lista con `Description = Batch <batchNo>`

#### Scenario: RR tras deshacer la liberación
- GIVEN la misma transacción, cuyo intento con la liberación se deshizo
- WHEN se procesa un import con su fila RR
- THEN su movimiento R libera el importe completo y no hay advertencia `reserve_already_released`

#### Scenario: Advertencia en el summary
- GIVEN un intento con la advertencia `reserve_already_released` de una transacción
- WHEN se descarga el summary
- THEN el bloque de advertencias muestra el ID de origen de esa transacción
