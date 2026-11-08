## ADDED Requirements

### Requirement: Etiqueta de la liberación por ajuste
La liberación anticipada de la reserva SHALL llamarse `Reserve released on adjustment`, porque la produce cualquier ajuste I (`Chargeback`, `Refund` o `RDR`): en la línea `reserve_early_released` de `payableBreakdown`, en toda vista del batch, y en el export `summary`, tanto en el bloque de reservas como en el del amount payable. El nombre de la política `release_on_chargeback` no cambia.

#### Scenario: Etiqueta de la liberación anticipada
- WHEN se lee la vista de cualquier intento, también uno procesado antes de este cambio
- THEN la línea `reserve_early_released` trae `label = "Reserve released on adjustment"`

#### Scenario: Etiqueta de la liberación anticipada en el CSV
- GIVEN `batch-clean` procesado, sin liberación anticipada
- WHEN se descarga el summary
- THEN el bloque de reservas trae la fila `Reserve released on adjustment,,0.0000` y el del amount payable su línea `Reserve released on adjustment`; ninguna fila dice `on chargeback`, y las columnas, el orden y los importes no cambian

### Requirement: Pantalla Settlement Review: canal sin cuenta principal
Un canal de `channelsToAssign` con `assignment = "assigned_to_other_account"` y `otherAccount = null` no tiene cuenta principal, y la pantalla SHALL mostrarlo como tal, sin atribuirlo a otra cuenta ni a otro comercio.

#### Scenario: Canal sin cuenta principal
- **GIVEN** la vista previa con `RAM-07` `assigned_to_other_account` y `otherAccount = null`
- **THEN** ve `RAM-07 · no primary account`, y no `another account` ni `another merchant`

### Requirement: Pantalla Settlement List: valores inválidos en la dirección
Un valor inválido de la dirección de Settlement List (estado, **Date**, día inexistente o página) SHALL descartarse también en la consulta al API, como si no estuviera.

#### Scenario: Valores inválidos en la dirección
- **WHEN** `analyst` abre la lista de ProviderA-USD con `status=foo&dateField=foo&from=2026-02-30&page=abc` en la dirección
- **THEN** se pide `GET /accounts/{id}/settlements` sin `status`, `dateField` ni `from` y con `page=1`, ve la lista de todos los intentos de la cuenta y no un error de carga

## MODIFIED Requirements

### Requirement: Pantalla Settlement Summary: totales y amount payable auditable
La pantalla SHALL mostrar los movimientos E/I/R, los totales de las cinco categorías con cantidad, importe, fee y rango de fechas, los totales por marca, `reservesReleasedQty` con el rango R, y las nueve líneas de `payableBreakdown` en el orden del API, con su etiqueta, su signo y su importe, hasta `amountPayable`. Toda cifra y todo rango SHALL salir de la vista del API sin recalcularse.

#### Scenario: Desglose de batch-clean
- **GIVEN** la vista del intento de `batch-clean`
- **THEN** ve las líneas `+ Deposits`, `− Chargebacks`, `− Refunds`, `− RDR`, `− Transaction fees`, `− Batch fees`, `− Reserve held`, `+ Reserve released` y `+ Reserve released on adjustment` con los importes de la respuesta y, debajo, **Amount payable** con su `amountPayable`

#### Scenario: Línea en cero
- **GIVEN** la vista con `reserve_early_released` en `0.0000`
- **THEN** la línea aparece con `0.0000`, no se oculta

#### Scenario: Rango de fechas de cada tipo
- **GIVEN** la vista con `dateRanges.APP` de `2026-09-28T00:04:11.000Z` a `2026-10-07T23:58:40.000Z`
- **WHEN** mira `Totals by type`
- **THEN** tiene las columnas `Type`, `Qty`, `Amount USD`, `Fees USD` y `Date range`
- **AND** `Deposits` muestra `2026-09-28 – 2026-10-07`, solo el día de Nueva York, sin hora ni `ET`; `Declined` el rango DEC; `Chargebacks`, `Refunds` y `RDR` el rango I, repetido en cada fila; y `R · Reserve released` el rango R

#### Scenario: Rango nulo
- **GIVEN** una vista con `dateRanges.R = null`
- **THEN** la fila `R · Reserve released` muestra `—` como rango

#### Scenario: A 1024 px
- **WHEN** mira `Totals by type` a 1024 px
- **THEN** ninguna cifra ni rango se recorta ni obliga a desplazar la tabla, y cada fecha del rango se lee entera en una línea

### Requirement: Pantalla Settlement Summary: fees, reservas, canales e incidencias
La pantalla SHALL mostrar los fees transaccionales (`transactionalFeeAmt`, `mdrAmt` y su tasa), cada fee por batch con su origen y su usuario, las reservas retenida, liberada y liberada por un ajuste, los canales asociados en el intento, el resumen de incidencias de la corrida, `skipped` y las advertencias.

#### Scenario: Fee ajustado con mi usuario (criterio 2 del issue)
- **GIVEN** `batch-clean` procesado por `analyst` con `Wire Fee` ajustado a `30.0000`
- **THEN** ve `Wire Fee · From file · 30.0000 · entered by analyst`

#### Scenario: Reservas del intento
- **GIVEN** la vista con `reserveHeldAmt`, `reserveReleasedAmt` y `reserveEarlyReleasedAmt`
- **THEN** el bloque de reservas muestra `Held in this batch`, `Released (R)` y `Released on adjustment` con esos importes, y ninguna línea dice `on chargeback`

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

### Requirement: Pantalla Settlement Summary: pestaña Movements
El Settlement Summary SHALL tener las pestañas **Summary** y **Movements**. **Movements** SHALL mostrar los movimientos del ciclo elegido (E, I o R, con E por defecto) en el orden del API, paginados en el servidor, con transacción, estado, ronda, fila de origen, fecha del evento, importe, fees con su desglose, reservas (en una columna **Reserves**) y Settled, tal como llegan. Pestaña, ciclo y página SHALL guardarse en la dirección.

#### Scenario: Reservas en una columna
- **GIVEN** un movimiento con `reserveHeldAmt = "11.5240"`, `reserveReleasedAmt = "7.2500"`, `reserveEarlyReleasedAmt = "1.1000"` y `expectedReserveReleaseAt = "2027-03-27T00:04:11.000Z"`
- **THEN** las columnas son **Transaction**, **Status**, **Round**, **Source row**, **Event date**, **Amount**, **Fees**, **Reserves** y **Settled**, y **Reserves** muestra `Held 11.5240`, `Released 7.2500`, `Released on adjustment 1.1000` y `Expected release 2027-03-27 ET`

#### Scenario: Movimientos E de batch-clean
- **GIVEN** `batch-clean` procesado
- **WHEN** `analyst` abre **Movements**
- **THEN** se pide `type=E&page=1`, ve los ciclos `E (450)`, `I (10)` y `R (320)` con los contadores de la vista y `Page 1 of 9 · 450 movements`

#### Scenario: Ajustes con su desglose
- **GIVEN** la pestaña **Movements**
- **WHEN** elige `I`
- **THEN** se pide `type=I&page=1`, ve los 10 movimientos con su estado, su ronda y su `feeAmount`, y al abrir el desglose de uno ve cada fee con su título y su `amountUsd`

#### Scenario: Movimiento sin fecha ni fila
- **GIVEN** un movimiento con `eventDate = null` y uno sembrado con `sheetId = null`
- **THEN** el primero dice `Undated` en la fecha y el segundo `—` en la fila de origen

#### Scenario: Settled según el intento
- **GIVEN** un batch sembrado `paid` y un intento `processed`
- **THEN** los movimientos del primero dicen `Settled` y los del segundo `Pending payment`

#### Scenario: Recargar en Movements
- **WHEN** recarga `/settlements/<batchId>?tab=movements&cycle=R&page=2`
- **THEN** ve **Movements** con `R` y la página 2

#### Scenario: Error al leer movimientos
- **WHEN** la lectura de movimientos falla
- **THEN** ve `The movements could not be loaded.` con **Retry**, y la pestaña **Summary** sigue disponible
