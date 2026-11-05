## MODIFIED Requirements

### Requirement: Candidatas a faltante
Las candidatas SHALL ser transacciones de los canales cuya cuenta principal es la del import: APP `Successful`, DEC `Declined`, I en estado de ciclo I y R movimientos E vigentes con reserva vencida, sin liberación anticipada vigente. Una reserva vence en su creación + `rollingReserveDays` de su canal, y se compara por esa fecha con el rango R, también de vencimiento. Se excluyen las presentes en el batch o procesadas en ese ciclo en un intento vigente del proveedor y las ya registradas.

#### Scenario: Canal sin asignar presente en el import
- **GIVEN** `data/samples/batch-issues`, donde también faltan las DEC de RAM-13 (sin cuenta) del 2026-09-28
- **WHEN** se valida
- **THEN** solo cuentan las 10 de RAM-11 y RAM-12: `missing_previous_to_batch.E = 10`

#### Scenario: Reserva vencida antes del rango R
- **GIVEN** un movimiento E vigente con `reserveHeldAmt > 0`, sin liberación anticipada ni movimiento R, cuya reserva venció antes del mínimo del rango R
- **WHEN** se valida un import que no lo trae en RR
- **THEN** es `missing_previous_to_batch` en R, con su fecha de vencimiento como `relevantDate`

#### Scenario: Reserva todavía no vencida
- **GIVEN** la misma reserva con fecha de vencimiento posterior al máximo del rango R
- **WHEN** se valida
- **THEN** no aparece en ninguna de las dos validaciones de faltantes

#### Scenario: Cuenta con plazos de retención mezclados
- **GIVEN** una cuenta con un canal de 180 días y otro de 120, filas RR de ambos y una reserva de 180 días creada entre esas filas que aún no ha vencido
- **WHEN** se valida un import que no la trae en RR
- **THEN** no aparece como faltante: el rango R y la reserva se comparan por fecha de vencimiento

#### Scenario: Reserva liberada anticipadamente
- **GIVEN** un movimiento E vigente con `reserveHeldAmt > 0`, con vencimiento dentro del rango R, y un movimiento I de la misma transacción (`Chargeback`, `Refund` o `RDR`) en un intento vigente de cualquier cuenta del proveedor con `reserveEarlyReleasedAmt > 0`
- **WHEN** se valida un import que no lo trae en RR
- **THEN** no es faltante de R

#### Scenario: Reserva liberada por un refund o un RDR
- **GIVEN** dos reservas vencidas dentro del rango R, una liberada por un movimiento I `Refund` vigente y otra por un `RDR` vigente, los dos con `reserveEarlyReleasedAmt > 0`
- **WHEN** se valida un import que no las trae en RR
- **THEN** ninguna es faltante de R

#### Scenario: Liberación de un intento deshecho
- **GIVEN** la misma reserva, cuya liberación por un ajuste está en un intento `undone`
- **WHEN** se valida un import que no la trae en RR
- **THEN** es faltante de R, porque una liberación deshecha no cuenta

#### Scenario: Ajuste sin liberación
- **GIVEN** la misma reserva con un movimiento I vigente (`Chargeback`, `Refund` o `RDR`) de `reserveEarlyReleasedAmt = 0` (cuenta `hold_until_term` o intento anterior a la política)
- **WHEN** se valida un import que no la trae en RR
- **THEN** es faltante de R

#### Scenario: Posterior al máximo
- **GIVEN** una transacción `Successful` sin liquidar con fecha posterior al máximo del rango APP
- **WHEN** se valida
- **THEN** no aparece en ninguna de las dos validaciones de faltantes

#### Scenario: Límites inclusivos
- **GIVEN** candidatas con fecha igual al mínimo y al máximo del rango APP
- **WHEN** se valida
- **THEN** ambas son `missing_in_range`, y una con fecha anterior al mínimo es `missing_previous_to_batch`
