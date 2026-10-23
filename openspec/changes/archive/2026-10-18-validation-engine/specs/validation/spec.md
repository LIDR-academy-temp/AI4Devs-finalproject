# Spec Delta — validation

## MODIFIED Requirements

### Requirement: Ocho validaciones en orden fijo
Una corrida SHALL producir exactamente ocho resultados con `validationCode` en este orden: provider_mismatch, non_recorded_adjustment, duplicate_in_batch, status_collision_in_batch, duplicate_across_batches, status_collision_across_batches, missing_previous_to_batch, missing_in_range; cada uno con `outcome` ∈ passed | warning | blocked | not_applicable | not_implemented y `issueCount`. Una corrida nueva SHALL marcar la anterior como superada sin borrarla.

#### Scenario: Batch limpio
- **WHEN** se valida `data/samples/batch-clean` (o `batch-split`, con el mismo resultado)
- **THEN** las ocho validaciones son `passed` (o `not_applicable` donde no hay rango) con `issueCount = 0`
- **AND** ninguna es `warning`, `blocked` ni `not_implemented`

#### Scenario: Batch con incidencias
- **WHEN** se valida `data/samples/batch-issues`
- **THEN** los conteos coinciden con `expected.validations` y los IDs con `expected.affectedIds`
- **AND** `non_recorded_adjustment` tiene `issueCount = 3`: 1 hallazgo `non_recorded_adjustment` y 2 `status_mismatch`
- **AND** las validaciones con hallazgos son `warning` y ninguna es `blocked`

#### Scenario: Orden y forma del informe
- **WHEN** se valida cualquier import analizado
- **THEN** el informe trae ocho resultados, uno por código, en el orden fijo, aunque alguno no tenga hallazgos

### Requirement: Solo provider_mismatch bloquea
`provider_mismatch` SHALL ser el único hallazgo con `blocking = 1`; con uno o más, el import no puede procesarse y la única salida es cancelar. Las demás validaciones SHALL permitir continuar con una decisión única para todo el import, registrada con el usuario.

#### Scenario: Canal de otro proveedor
- **WHEN** se valida `data/samples/batch-blocked`
- **THEN** `provider_mismatch = 1`, su resultado es `blocked`, el resultado global es `blocked = true` y el botón de continuar no está disponible

#### Scenario: Advertencias no bloquean
- **WHEN** se valida `data/samples/batch-issues`
- **THEN** ningún hallazgo tiene `blocking = 1` y el resultado global es `blocked = false`

### Requirement: Clave de duplicado y colisión
Duplicados y colisiones SHALL evaluarse por `(transactionId, cycle)`: mismo estado → duplicado; estados distintos del mismo ciclo → colisión. En el ciclo R el estado no cuenta: dos apariciones R de la misma transacción SHALL ser siempre duplicado. Las apariciones SHALL guardarse en `ConflictOccurrence` (N por hallazgo). Valores por defecto de inclusión: duplicate in_batch → primera incluida; duplicate across_batches → actual excluida; collision in_batch → todas incluidas; collision across_batches → actual incluida. El analista puede cambiar la inclusión y queda auditado.

#### Scenario: Duplicado en el batch con sus dos apariciones
- **GIVEN** `data/samples/batch-issues`, donde la transacción `441706751475644` aparece dos veces en la hoja APP
- **WHEN** se valida
- **THEN** hay un hallazgo `duplicate` / `in_batch` en ciclo E con dos apariciones `current_import`, la primera con `defaultIncluded = true` y la segunda con `defaultIncluded = false`

#### Scenario: E y su reserva R no se comparan
- **GIVEN** una transacción con una fila en APP (ciclo E) y otra en RR (ciclo R) del mismo import
- **WHEN** se valida
- **THEN** no se produce ningún duplicado ni colisión

#### Scenario: Dos filas RR de la misma transacción
- **GIVEN** un import con dos filas RR de la misma transacción, una con estado `Successful` y otra con `Chargeback`
- **WHEN** se valida
- **THEN** hay un `duplicate` / `in_batch` (la primera incluida, la segunda excluida) y ninguna colisión

#### Scenario: Colisión en el batch
- **GIVEN** `data/samples/batch-issues`, donde `911545593909470` aparece en APP y en DEC
- **WHEN** se valida
- **THEN** hay un hallazgo `collision` / `in_batch` en ciclo E con dos apariciones (`Successful` y `Declined`), ambas incluidas por defecto

### Requirement: Rangos y faltantes
Los rangos APP, DEC, I y R SHALL derivarse de las filas asociadas del batch. `missing_previous_to_batch` SHALL listar transacciones de los canales de la cuenta anteriores al rango de su ciclo sin liquidar; `missing_in_range`, las que caen dentro del rango y no vienen en el archivo. Para R, las candidatas son las reservas retenidas vencidas no liberadas ni liberadas anticipadamente. DEC vacía SHALL no abrir rango DEC. Transacciones `Pending` SHALL contarse aparte (informativo).

#### Scenario: Declinadas del primer día omitidas
- **GIVEN** `data/samples/batch-issues`, donde el archivo omite todas las DEC del 2026-09-28
- **THEN** `missing_previous_to_batch.E = 10` y `missing_in_range.E = 3`, `missing_in_range.R = 3`, con los IDs de `affectedIds.missing_previous_to_batch_DEC`, `missing_in_range_E` y `missing_in_range_R`

#### Scenario: Rangos de un batch completo
- **WHEN** se valida `data/samples/batch-clean`
- **THEN** los rangos son APP 2026-09-28…2026-10-07, DEC 2026-09-28…2026-10-07, I 2026-09-28…2026-10-11 y R 2026-03-31…2026-04-09 (`expected.ranges`)

#### Scenario: Sin declinadas en el archivo
- **GIVEN** un import sin filas `Declined`
- **WHEN** se valida
- **THEN** no hay rango DEC y ninguna transacción `Declined` se evalúa como faltante

### Requirement: Los hallazgos persisten
Un faltante SHALL registrarse una sola vez por proveedor, ciclo y transacción y pasar a `resolved` cuando un batch `processed` posterior de cualquier cuenta del proveedor lo incluya; volver a `persistent` si ese batch se deshace. Cuentan como ya registrados solo los faltantes persistentes de imports que tienen un `SettlementBatch` `processed` o `paid`; los de imports sin procesar o cuyo batch está `undone` SHALL seguir saliendo como faltantes.

#### Scenario: Faltante ya registrado por un import procesado
- **GIVEN** una transacción `Declined` anterior al rango DEC que figura como faltante persistente del proveedor en ciclo E, registrado por la corrida vigente de otro import que tiene un batch `processed`
- **WHEN** se valida un import nuevo de una cuenta del proveedor
- **THEN** esa transacción no vuelve a aparecer como hallazgo `missing`

#### Scenario: Faltante de un import sin procesar
- **GIVEN** la misma transacción registrada como faltante solo por la corrida de otro import que aún no tiene batch
- **WHEN** se valida un import nuevo de una cuenta del proveedor
- **THEN** la transacción aparece como hallazgo `missing`

#### Scenario: Faltante de un import cuyo batch se deshizo
- **GIVEN** la misma transacción registrada como faltante por un import cuyo único batch está `undone`
- **WHEN** se valida un import nuevo de una cuenta del proveedor
- **THEN** la transacción aparece como hallazgo `missing`

#### Scenario: Corrida repetida del mismo import
- **GIVEN** una corrida anterior del mismo import, sin procesar, que encontró faltantes
- **WHEN** se valida de nuevo el import
- **THEN** los mismos faltantes vuelven a aparecer en la corrida nueva

## ADDED Requirements

### Requirement: Resultado derivado de los hallazgos
El `outcome` de cada validación SHALL derivarse de sus hallazgos: `passed` sin hallazgos; `warning` con hallazgos y ninguno bloqueante; `blocked` con al menos un hallazgo `blocking`; `not_applicable` cuando no hay movimientos o histórico sobre los que correr; `not_implemented` si la validación no existe. `not_applicable` y `not_implemented` nunca cuentan como aprobadas. El resultado global SHALL ser `blocked` si alguna validación lo es.

#### Scenario: Validación con advertencias
- **WHEN** `duplicate_in_batch` produce un hallazgo no bloqueante
- **THEN** su `outcome` es `warning` e `issueCount = 1`

#### Scenario: Validación sin hallazgos
- **WHEN** `provider_mismatch` corre sobre filas asociadas y no encuentra ninguna de otro proveedor
- **THEN** su `outcome` es `passed`

#### Scenario: No implementada no aprueba
- **WHEN** una validación aún no implementada forma parte del informe
- **THEN** su `outcome` es `not_implemented`, no cuenta como aprobada y el informe sigue teniendo ocho resultados

#### Scenario: Ya no existe failed
- **WHEN** se produce cualquier informe
- **THEN** ningún `outcome` vale `failed`

### Requirement: provider_mismatch
Una fila `matched` cuya transacción pertenece a un proveedor distinto del de la cuenta del import SHALL producir un hallazgo `provider_mismatch`, `blocking`, con la fila de origen, `transactionIdRaw`, `transactionId`, ciclo y el estado reportado en la fila. Esa fila SHALL quedar fuera de las validaciones 2–8 y de los rangos. Sin filas `matched`, el resultado es `not_applicable`.

#### Scenario: Transacción de un canal de otro proveedor
- **GIVEN** `data/samples/batch-blocked` (cuenta ProviderB-Main) con una fila de RAM-01 (Provider A)
- **WHEN** se valida
- **THEN** hay un hallazgo `provider_mismatch` con `transactionIdRaw = 252570479111759` y `blocking = 1`

#### Scenario: La fila ajena no alimenta otras validaciones
- **GIVEN** una fila de otro proveedor repetida dos veces en APP
- **WHEN** se valida
- **THEN** producen hallazgos `provider_mismatch` pero ningún `duplicate`, y su fecha no amplía el rango APP

### Requirement: Nada de otro merchant en el informe
Ningún hallazgo ni aparición del informe SHALL contener canal, cuenta, importe, fecha ni estado del gateway de una transacción de otro proveedor; de ella solo SHALL figurar `transactionId` y lo que trae la propia fila del archivo. El histórico de todas las cuentas del proveedor sí aparece (es del mismo merchant).

#### Scenario: Transacción de otro merchant
- **GIVEN** una fila de la cuenta ProviderB-Main (merchant 1) asociada a una transacción de Provider C (merchant 2)
- **WHEN** se valida
- **THEN** el hallazgo `provider_mismatch` no incluye el canal, el proveedor, el importe, la fecha ni el estado de esa transacción

### Requirement: non_recorded_adjustment
La validación `non_recorded_adjustment` SHALL detectar, sobre filas del proveedor de la cuenta, las filas cuyo estado reportado no cuadra con el del gateway, con dos `issueType`: `non_recorded_adjustment` en ciclo I y `status_mismatch` en ciclo E. Ambos SHALL ser no bloqueantes, con la fila incluida por defecto, llevar el estado reportado y el del gateway, y resolverse a mano tras verificar el gateway. Sin ninguna fila `matched`, de cualquier ciclo, el resultado es `not_applicable`.

#### Scenario: Sin filas de ciclo I pero con filas asociadas
- **GIVEN** `data/samples/batch-blocked`, sin filas de ciclo I y con 20 filas APP del proveedor de la cuenta
- **WHEN** se valida
- **THEN** `non_recorded_adjustment` es `passed`, no `not_applicable`

#### Scenario: Sin filas asociadas
- **GIVEN** un import sin ninguna fila `matched`
- **WHEN** se valida
- **THEN** `non_recorded_adjustment` es `not_applicable`

### Requirement: Ajuste no registrado en ciclo I
Una fila de ciclo I cuya transacción está en el gateway en un estado de ciclo natural E (`Pending`, `Successful`, `Declined`) SHALL producir un hallazgo `issueType = non_recorded_adjustment`.

#### Scenario: Chargeback de una aprobación nunca liquidada
- **GIVEN** `data/samples/batch-issues`, con un chargeback de RAM-13 cuya transacción sigue `Successful` en el gateway
- **WHEN** se valida
- **THEN** hay un hallazgo `non_recorded_adjustment` para `281520820250015` con `blocking = 0`

### Requirement: status_mismatch en ciclo E
Una fila E reportada `Declined` cuya transacción está `Successful`, `Chargeback`, `Refund` o `RDR` en el gateway, o reportada `Successful` cuya transacción está `Declined`, SHALL producir un hallazgo `issueType = status_mismatch`. Una fila E con el gateway en `Pending` SHALL no compararse, y una fila reportada `Successful` cuya transacción está en estado de ciclo I SHALL no producir hallazgo (ronda 1).

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
- **THEN** no hay hallazgo `status_mismatch` para ellas

### Requirement: Colisiones permitidas y CHB 2
Approved + Declined en E y Refund + Chargeback en I SHALL ser colisión con advertencia, nunca bloqueo. Un `Chargeback` y un `Chargeback` con `excludeAmount` (`CHB 2`) del mismo movimiento SHALL no generar hallazgo, ni en el batch ni contra el histórico; dos `CHB 2` del mismo movimiento son duplicado y `CHB 2` frente a `Refund` es colisión.

#### Scenario: Refund y Chargeback del mismo movimiento
- **GIVEN** un import con un `Refund` y un `Chargeback` de la misma transacción en ciclo I
- **WHEN** se valida
- **THEN** hay un hallazgo `collision` / `in_batch` no bloqueante con las dos apariciones incluidas

#### Scenario: Chargeback y CHB 2 en el mismo archivo legacy
- **GIVEN** un archivo legacy con `CHB` y `CHB 2` de la misma transacción en la hoja `CB`
- **WHEN** se valida
- **THEN** no hay duplicado ni colisión para esa transacción

#### Scenario: Chargeback, CHB 2 y Refund del mismo movimiento
- **GIVEN** un import con un `Chargeback`, un `CHB 2` y un `Refund` de la misma transacción en ciclo I
- **WHEN** se valida
- **THEN** hay una sola `collision` / `in_batch` con las tres apariciones incluidas, y ningún `duplicate`

#### Scenario: Colisión contra el histórico con un CHB 2 liquidado
- **GIVEN** un `Chargeback` en el import y, en batches vigentes anteriores, un `CHB 2` y un `Refund` de la misma transacción
- **WHEN** se valida
- **THEN** hay una `collision` / `across_batches` que lista la aparición actual (incluida), el `CHB 2` y el `Refund` históricos, igual que la colisión en el batch

#### Scenario: CHB 2 contra un Chargeback ya liquidado
- **GIVEN** un `CHB 2` en el import y un `Chargeback` sin `excludeAmount` de la misma transacción en un batch vigente anterior
- **WHEN** se valida
- **THEN** no hay `duplicate_across_batches` ni `status_collision_across_batches`

#### Scenario: Muestra legacy
- **WHEN** se valida `data/samples/legacy-provider`
- **THEN** la fila `df14616d-4b26-4ffb-9984-72717ebff6a6` cuenta como `Chargeback` con `excludeAmount` y no produce duplicado ni colisión
- **AND** `missing_previous_to_batch` cuenta I = 3 (los refunds de la ventana omitidos de la hoja `CB` con cambio de estado anterior al rango I, `affectedIds.missing_previous_to_batch_I`) y las demás validaciones no tienen hallazgos

### Requirement: Grupos de tres o más apariciones
Dentro de una clave `(transactionId, cycle)` del batch, cada estado repetido SHALL producir un `duplicate` (primera aparición incluida, demás excluidas) y la presencia de estados distintos SHALL producir una `collision` con la primera aparición de cada estado, todas incluidas, para que ninguna aparición se cuente dos veces. La primera aparición es la del archivo subido antes, la hoja anterior en el libro y el `rowNo` menor.

#### Scenario: Dos aprobaciones y una declinación
- **GIVEN** la misma transacción dos veces en APP y una en DEC
- **WHEN** se valida
- **THEN** hay un `duplicate` / `in_batch` (dos apariciones `Successful`, la segunda excluida) y una `collision` / `in_batch` (la primera `Successful` y la `Declined`, ambas incluidas)

### Requirement: Estado no resuelto en duplicados y colisiones
Una aparición cuyo estado no se pudo resolver (`status_unresolved`) SHALL compararse como un estado distinto de cualquier otro, incluido otro no resuelto: frente a otra aparición de la misma `(transactionId, cycle)`, del batch o de un batch anterior vigente, SHALL producir una colisión no bloqueante con todas las apariciones actuales incluidas, y nunca un duplicado. Ninguna aparición se excluye en silencio.

#### Scenario: Estado no resuelto frente a una aprobación del batch
- **GIVEN** una transacción con una fila APP `Successful` y otra fila E de la misma transacción cuyo estado no se resolvió
- **WHEN** se valida
- **THEN** hay una `collision` / `in_batch` con las dos apariciones incluidas, la segunda sin estado, y ningún `duplicate`

#### Scenario: Dos apariciones sin estado
- **GIVEN** dos filas E de la misma transacción con el estado sin resolver
- **WHEN** se valida
- **THEN** hay una `collision` / `in_batch` con las dos apariciones incluidas

#### Scenario: Estado no resuelto frente al histórico
- **GIVEN** una fila E sin estado resuelto de una transacción liquidada en E en un batch vigente anterior
- **WHEN** se valida
- **THEN** hay una `collision` / `across_batches` con la aparición actual incluida y ningún `duplicate_across_batches`

### Requirement: Comparación con batches anteriores
Las filas del import SHALL compararse por `(transactionId, cycle)` con los movimientos de los intentos no deshechos (`processed` o `paid`) de todas las cuentas del proveedor: mismo estado → `duplicate_across_batches` (actual excluida, histórica como evidencia); estado distinto → `status_collision_across_batches` (actual incluida). Sin intentos anteriores del proveedor, ambas son `not_applicable`.

#### Scenario: Aprobación ya liquidada
- **GIVEN** `data/samples/batch-issues`, donde `504712738863260` ya está en E en el batch anterior de ProviderB-Main
- **WHEN** se valida
- **THEN** hay un `duplicate` / `across_batches` con la aparición `previous_batch` (batch e intento) y la aparición `current_import` excluida por defecto

#### Scenario: Aprobación anterior reportada como declinada
- **GIVEN** `data/samples/batch-issues`, donde `381797111970492` se liquidó `Successful` en el batch anterior y ahora viene en DEC
- **WHEN** se valida
- **THEN** hay una `collision` / `across_batches` con la aparición actual incluida

#### Scenario: Reserva ya liberada que vuelve en RR
- **GIVEN** un movimiento R de un batch vigente anterior con estado `Successful` y, en el import, una fila RR de la misma transacción cuyo estado actual es `Chargeback`
- **WHEN** se valida
- **THEN** hay un `duplicate` / `across_batches` con la fila actual excluida por defecto, y ninguna `collision` (la reserva no se libera dos veces)

#### Scenario: Batch deshecho
- **GIVEN** una transacción cuyo único movimiento E anterior pertenece a un intento `undone`
- **WHEN** se valida un import que la incluye en APP
- **THEN** no hay hallazgo *across batches* para ella

#### Scenario: Otra cuenta del mismo proveedor
- **GIVEN** una transacción liquidada en E en un batch vigente de ProviderA-EUR
- **WHEN** se valida un import de ProviderA-USD que la incluye en APP
- **THEN** hay un `duplicate` / `across_batches` cuya aparición histórica es de ese batch

#### Scenario: Sin batches anteriores
- **GIVEN** un proveedor sin ningún intento no deshecho
- **WHEN** se valida
- **THEN** `duplicate_across_batches` y `status_collision_across_batches` son `not_applicable`

### Requirement: Filas que forman cada rango
APP SHALL formarse con las filas E asociadas cuya transacción no está `Declined` ni `Pending` en el gateway (fecha de creación); DEC con las filas E cuya transacción está `Declined` (fecha de creación); I con las filas I cuya transacción está en el gateway en el mismo estado que la fila (fecha del último cambio de estado); R con las filas R (vencimiento de la reserva: creación + `rollingReserveDays` de su canal). Las filas I sin fecha válida se cuentan aparte, de forma informativa.

#### Scenario: Declinada en el archivo, aprobada en el gateway
- **GIVEN** `data/samples/batch-issues`, donde una transacción de la ventana anterior, `Successful` en el gateway, viene en DEC
- **WHEN** se calculan los rangos
- **THEN** esa fila no adelanta el mínimo de DEC, que sigue siendo 2026-09-29

#### Scenario: Ajuste sin fecha
- **GIVEN** una fila de ciclo I cuya transacción está `Successful` en el gateway
- **WHEN** se calculan los rangos
- **THEN** la fila no aporta fecha al rango I y el informe la cuenta en `undatedAdjustmentCount`

### Requirement: Candidatas a faltante
Las candidatas SHALL ser transacciones de los canales cuya cuenta principal es la del import: APP `Successful`, DEC `Declined`, I en estado de ciclo I y R movimientos E vigentes con reserva vencida, sin liberación anticipada. Una reserva vence en su creación + `rollingReserveDays` de su canal, y se compara por esa fecha con el rango R, también de vencimiento. Se excluyen las presentes en el batch o procesadas en ese ciclo en un intento vigente del proveedor y las ya registradas.

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
- **GIVEN** un movimiento E vigente con `reserveHeldAmt > 0` y `reserveEarlyReleasedAmt > 0`, con vencimiento dentro del rango R
- **WHEN** se valida un import que no lo trae en RR
- **THEN** no es faltante de R

#### Scenario: Posterior al máximo
- **GIVEN** una transacción `Successful` sin liquidar con fecha posterior al máximo del rango APP
- **WHEN** se valida
- **THEN** no aparece en ninguna de las dos validaciones de faltantes

#### Scenario: Límites inclusivos
- **GIVEN** candidatas con fecha igual al mínimo y al máximo del rango APP
- **WHEN** se valida
- **THEN** ambas son `missing_in_range`, y una con fecha anterior al mínimo es `missing_previous_to_batch`

### Requirement: Candidatas sin el histórico liquidado
La fuente de candidatas SHALL devolver solo transacciones no procesadas en ese ciclo en un intento vigente del proveedor, para que su volumen no crezca con el histórico; el motor SHALL volver a comprobarlo y descartar cualquier candidata procesada que reciba.

#### Scenario: Candidata ya procesada devuelta por error
- **GIVEN** una candidata `Successful` con fecha dentro del rango APP que tiene un movimiento E en un intento vigente del proveedor
- **WHEN** la fuente de candidatas la devuelve de todos modos y se valida
- **THEN** no es faltante

### Requirement: Faltantes por rango y por ciclo
Cada hallazgo `missing` SHALL llevar ciclo, rango (APP, DEC, I o R), `missingType` (`previous_to_batch` o `in_range`), `relevantDate` y el estado esperado. Los conteos SHALL poder leerse por rango y por ciclo (E = APP + DEC). Si ningún ciclo tiene rango, ambas validaciones de faltantes son `not_applicable`.

#### Scenario: Conteo por ciclo
- **WHEN** se valida `data/samples/batch-issues`
- **THEN** `missing_previous_to_batch` cuenta E 10 / I 0 / R 0 (las 10 en el rango DEC) y `missing_in_range` E 3 / I 0 / R 3 (las 3 de E en el rango APP)

#### Scenario: Sin rangos
- **GIVEN** un import sin ninguna fila asociada de ciclo E, I ni R del proveedor
- **WHEN** se valida
- **THEN** `missing_previous_to_batch` y `missing_in_range` son `not_applicable`

### Requirement: Plazo de retención de una reserva
El vencimiento de una reserva SHALL calcularse con el plazo vigente de su canal (`Channel.rollingReserveDays`), no con el aplicado al liquidar (`SettlementTransaction.reserveDaysUsed`, `expectedReserveReleaseAt`); el plazo de un canal no cambia con el tiempo, así que el vigente coincide con el aplicado. La fuente de reservas retenidas SHALL filtrar con el mismo cálculo que el motor.

#### Scenario: Fuente y motor con el mismo vencimiento
- **GIVEN** una reserva retenida de un canal de 120 días cuyo vencimiento (creación + 120 días) cae dentro del rango R
- **WHEN** la fuente carga las reservas retenidas con `rMax` del rango R y se valida
- **THEN** la fuente la devuelve y el motor la clasifica `missing_in_range`, con el mismo vencimiento en los dos

### Requirement: Candidatas I sin fecha
Una candidata I sin `lastStatusChangedAt` SHALL no producir hallazgo y SHALL contarse, una vez por transacción, en `undatedCandidateCount`, de forma informativa. La fuente de candidatas SHALL devolverlas (`lastStatusChangedAt <= máximo` o NULL).

#### Scenario: Ajuste sin fecha de cambio
- **GIVEN** una transacción `Chargeback` de un canal de la cuenta sin `lastStatusChangedAt`, con rango I en el import
- **WHEN** se valida
- **THEN** no aparece en ninguna validación de faltantes y `undatedCandidateCount = 1`

### Requirement: Pending aparte
Las transacciones `Pending` SHALL excluirse de los faltantes y contarse en `pendingInRangeCount`: las de los canales de la cuenta con fecha de creación dentro del rango APP o del DEC, una vez cada una.

#### Scenario: Pending dentro del rango
- **GIVEN** dos transacciones `Pending` de un canal de la cuenta con fecha dentro del rango APP
- **WHEN** se valida
- **THEN** no hay hallazgo `missing` para ellas y `pendingInRangeCount = 2`

### Requirement: Motor puro sobre una entrada explícita
Las validaciones SHALL ejecutarse sin base de datos ni HTTP, sobre una entrada que contiene: filas del import con los datos de su transacción, cuenta (proveedor y canales), movimientos de intentos no deshechos del proveedor, transacciones candidatas, faltantes ya registrados y catálogo de estados. La misma entrada SHALL producir siempre el mismo informe.

#### Scenario: Muestras sin base de datos
- **WHEN** se construye la entrada de cada muestra a partir del mundo sintético del seed y se valida
- **THEN** los resultados coinciden con su `expected.json` sin conectarse a SQL Server

#### Scenario: Determinismo
- **WHEN** se valida dos veces la misma entrada, con las filas en distinto orden de llegada
- **THEN** los dos informes son idénticos, incluido el orden de hallazgos y apariciones

### Requirement: Rendimiento del motor
Validar 2 000 filas contra 50 000 movimientos anteriores SHALL tardar menos de 2 segundos en el motor (sin contar la carga desde la base, que mide el caso de uso), medido en local y anotado en el PR. En CI la aserción SHALL tener margen (menos de 4 segundos) para no ser intermitente.

#### Scenario: Volumen de referencia
- **GIVEN** una entrada generada con 2 000 filas, 50 000 movimientos anteriores y unas 25 000 transacciones candidatas
- **WHEN** se ejecutan las ocho validaciones
- **THEN** terminan en menos de 2 s en local
- **AND** el test de CI afirma menos de 4 s
