# Spec Delta

## MODIFIED Requirements

### Requirement: Los hallazgos persisten
Un faltante SHALL registrarse una sola vez por proveedor, ciclo y transacción y pasar a `resolved` cuando un batch `processed` posterior de cualquier cuenta del proveedor lo incluya; volver a `persistent` si ese batch se deshace. Cuentan como ya registrados solo los faltantes persistentes de imports que tienen un `SettlementBatch` `processed` o `paid`; los de imports sin procesar o cuyo batch está `undone` SHALL seguir saliendo como faltantes. La resolución y la reapertura SHALL ocurrir dentro de la transacción que procesa o deshace el batch y afectar solo a hallazgos de corridas vigentes.

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

#### Scenario: Resuelto por un batch processed de otra cuenta
- **GIVEN** un faltante persistente de la transacción X en ciclo E, en la corrida vigente de un import de ProviderA-USD
- **WHEN** se procesa un batch de ProviderA-EUR (mismo proveedor) que incluye a X en E
- **THEN** el hallazgo pasa a `resolved` con `resolvedInBatchId` de ese batch y `resolvedAt`, sin `resolvedByUserId` (no es una resolución a mano)

#### Scenario: Hallazgo de una corrida superada
- **GIVEN** el mismo faltante en una corrida ya superada y no en la vigente
- **WHEN** se procesa el batch que incluye a X en E
- **THEN** el hallazgo de la corrida superada sigue `persistent`

#### Scenario: Reapertura al deshacer
- **GIVEN** un faltante resuelto por el batch B
- **WHEN** se deshace B (la reapertura se ejecuta dentro de esa transacción)
- **THEN** el hallazgo vuelve a `persistent` con `resolvedInBatchId` y `resolvedAt` vacíos; los hallazgos resueltos por otros batches o a mano no cambian

#### Scenario: Fallo del procesamiento
- **GIVEN** un proceso que resolvería un faltante y falla después
- **WHEN** termina
- **THEN** el faltante sigue `persistent`

### Requirement: Rangos y faltantes
Los rangos APP, DEC, I y R SHALL derivarse de las filas asociadas del batch. `missing_previous_to_batch` SHALL listar transacciones de los canales de la cuenta anteriores al rango de su ciclo sin liquidar; `missing_in_range`, las que caen dentro del rango y no vienen en el archivo. Para R, las candidatas son las reservas retenidas vencidas no liberadas ni liberadas anticipadamente. DEC vacía SHALL no abrir rango DEC. Transacciones `Pending` SHALL contarse aparte (informativo).

#### Scenario: Declinadas del primer día omitidas
- **GIVEN** `data/samples/batch-issues`, donde el archivo omite todas las DEC del 2026-09-28
- **THEN** `missing_previous_to_batch.E = 10` y `missing_in_range.E = 3`, `missing_in_range.R = 3`, con los IDs de `affectedIds.missing_previous_to_batch_DEC`, `missing_in_range_E` y `missing_in_range_R`

#### Scenario: Rangos de un batch completo
- **WHEN** se valida `data/samples/batch-clean`
- **THEN** los rangos son APP 2026-09-28…2026-10-07, DEC 2026-09-28…2026-10-07, I 2026-09-28…2026-10-11 y R 2026-09-27…2026-10-06 (`expected.ranges`; R por fecha de vencimiento de la reserva, creación + `rollingReserveDays`)

#### Scenario: Sin declinadas en el archivo
- **GIVEN** un import sin filas `Declined`
- **WHEN** se valida
- **THEN** no hay rango DEC y ninguna transacción `Declined` se evalúa como faltante

### Requirement: Clave de duplicado y colisión
Duplicados y colisiones SHALL evaluarse por `(transactionId, cycle)`: mismo estado → duplicado; estados distintos del mismo ciclo → colisión. Las apariciones SHALL guardarse en `ConflictOccurrence` (N por hallazgo). Valores por defecto de inclusión: duplicate in_batch → primera incluida; duplicate across_batches → actual excluida; collision in_batch → todas incluidas; collision across_batches → actual incluida. El analista puede cambiar la inclusión y queda auditado. Una aparición histórica SHALL corresponder a un movimiento concreto, también cuando su batch tiene varios de la misma clave.

#### Scenario: Duplicado en el batch con sus dos apariciones
- **GIVEN** `data/samples/batch-issues`, donde la transacción `441706751475644` aparece dos veces en la hoja APP
- **WHEN** se valida
- **THEN** hay un hallazgo `duplicate` / `in_batch` en ciclo E con dos apariciones `current_import`, la primera con `defaultIncluded = true` y la segunda con `defaultIncluded = false`

#### Scenario: E y su reserva R no se comparan
- **GIVEN** una transacción con una fila en APP (ciclo E) y otra en RR (ciclo R) del mismo import
- **WHEN** se valida
- **THEN** no se produce ningún duplicado ni colisión

#### Scenario: Colisión en el batch
- **GIVEN** `data/samples/batch-issues`, donde `911545593909470` aparece en APP y en DEC
- **WHEN** se valida
- **THEN** hay un hallazgo `collision` / `in_batch` en ciclo E con dos apariciones (`Successful` y `Declined`), ambas incluidas por defecto

#### Scenario: Dos movimientos históricos de la misma clave en un batch
- **GIVEN** un batch vigente con dos movimientos I `Chargeback` de la misma transacción, el segundo con `excludeAmount` (`CHB 2`), y un import nuevo que trae un `Refund` de esa transacción
- **WHEN** se valida y se abre el detalle de la colisión
- **THEN** cada aparición histórica muestra su propia hoja, fila y `excludeAmount`
