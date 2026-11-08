## ADDED Requirements

### Requirement: Fechas de negocio del settlement sin zona
Los `dateRanges` del intento, y la `eventDate` y `expectedReserveReleaseAt` de los movimientos y la `eventDate` de los fees aplicados SHALL salir en hora de pared de America/New_York sin zona ni milisegundos (`YYYY-MM-DDTHH:mm:ss`), con los dígitos guardados. `settlementDate` SHALL seguir siendo solo el día y las fechas de auditoría (`processedAt`, `paidAt`, `undoneAt`…) instantes UTC con `Z`.

#### Scenario: Intento procesado
- **GIVEN** un intento procesado de `batch-clean`
- **WHEN** `analyst` lo pide
- **THEN** cada `min` y `max` de `dateRanges` cumple `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$`, `settlementDate` es solo el día y `processedAt` termina en `Z`

#### Scenario: Movimientos
- **WHEN** `analyst` lista los movimientos `I` del intento
- **THEN** cada `eventDate` no lleva `Z` ni milisegundos

### Requirement: Fechas de los CSV del summary independientes de la zona del servidor
Los CSV del summary SHALL escribir las fechas de negocio como hoy (`2026-10-07 23:58:40`), con los dígitos guardados, sea cual sea la zona del proceso del API.

#### Scenario: CSV en un servidor fuera de UTC
- **GIVEN** el proceso del API con `TZ = America/New_York`
- **WHEN** `analyst` descarga el CSV del summary de un intento cuyo rango `APP` termina en `2026-10-07 23:58:40` guardado
- **THEN** la fila `APP range (ET)` termina en `2026-10-07 23:58:40`

## MODIFIED Requirements

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio SHALL mostrarse con los dígitos recibidos, sin convertir: las que solo son un día (`settlementDate`, vigencias de los fees, `expectedReserveReleaseAt`) y los rangos de `Totals by type` (`dateRanges`, solo el día) sin sufijo de zona, y las que llevan hora (`eventDate` de los movimientos) con sufijo `ET`. Las de auditoría (`processedAt`, y en Settlement List) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24`, sin `ET`, el rango de `Deposits` empezando en `2026-09-28`, sin hora ni `ET`, y `2026-10-19 11:40 ET`

#### Scenario: Fechas de la lista y de los movimientos
- **GIVEN** una fila de Settlement List con `settlementDate = "2026-10-24"` y `processedAt = "2026-10-19T15:40:03.120Z"`, y un movimiento con `eventDate = "2026-09-28T00:04:11"`, con el navegador en otra zona
- **THEN** la fila muestra `2026-10-24`, sin `ET`, y `2026-10-19 11:40 ET`, y el movimiento `2026-09-28 00:04 ET`

#### Scenario: Vigencia de un fee preestablecido
- **GIVEN** un fee preestablecido con `startDate = "2026-01-01"` y sin `endDate`
- **WHEN** `analyst` lo ve al añadirlo en Settlement Review
- **THEN** su vigencia empieza en `2026-01-01`, sin `ET`

### Requirement: Summary del merchant
El export `summary` SHALL tener nueve bloques con cabecera, separados por una línea vacía: intento, totales, marcas, fees por batch, reservas, amount payable (nueve líneas con signo e importe y la fila `Amount payable`), incidencias, filas no procesadas y advertencias. Las cifras SHALL ser las de la vista, sin recalcular. Las fechas de negocio SHALL ir sin convertir y `processedAt` en hora de Nueva York (`ET`). Una advertencia con transacción SHALL llevar su ID de origen.

#### Scenario: Summary de batch-clean
- GIVEN `batch-clean` procesado con los dos fees prellenados
- WHEN se descarga `type=summary`
- THEN los totales por categoría, las reservas, `otherFeeAmt = 40.0000` y `Amount payable = 33771.3600` coinciden con `expected.summary`
- AND el bloque del amount payable tiene las nueve líneas en el orden fijo, y la suma con signo de sus importes es `33771.3600`

#### Scenario: Fechas del summary
- GIVEN un intento procesado el `2026-10-19T15:40:03.120Z` con rango APP máximo `2026-10-07T23:58:40`
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

### Requirement: Pantalla Settlement Summary: totales y amount payable auditable
La pantalla SHALL mostrar los movimientos E/I/R, los totales de las cinco categorías con cantidad, importe, fee y rango de fechas, los totales por marca, `reservesReleasedQty` con el rango R, y las nueve líneas de `payableBreakdown` en el orden del API, con su etiqueta, su signo y su importe, hasta `amountPayable`. Toda cifra y todo rango SHALL salir de la vista del API sin recalcularse.

#### Scenario: Desglose de batch-clean
- **GIVEN** la vista del intento de `batch-clean`
- **THEN** ve las líneas `+ Deposits`, `− Chargebacks`, `− Refunds`, `− RDR`, `− Transaction fees`, `− Batch fees`, `− Reserve held`, `+ Reserve released` y `+ Reserve released on chargeback` con los importes de la respuesta y, debajo, **Amount payable** con su `amountPayable`

#### Scenario: Línea en cero
- **GIVEN** la vista con `reserve_early_released` en `0.0000`
- **THEN** la línea aparece con `0.0000`, no se oculta

#### Scenario: Rango de fechas de cada tipo
- **GIVEN** la vista con `dateRanges.APP` de `2026-09-28T00:04:11` a `2026-10-07T23:58:40`
- **WHEN** mira `Totals by type`
- **THEN** tiene las columnas `Type`, `Qty`, `Amount USD`, `Fees USD` y `Date range`
- **AND** `Deposits` muestra `2026-09-28 – 2026-10-07`, solo el día de Nueva York, sin hora ni `ET`; `Declined` el rango DEC; `Chargebacks`, `Refunds` y `RDR` el rango I, repetido en cada fila; y `R · Reserve released` el rango R

#### Scenario: Rango nulo
- **GIVEN** una vista con `dateRanges.R = null`
- **THEN** la fila `R · Reserve released` muestra `—` como rango

#### Scenario: A 1024 px
- **WHEN** mira `Totals by type` a 1024 px
- **THEN** ninguna cifra ni rango se recorta ni obliga a desplazar la tabla, y cada fecha del rango se lee entera en una línea

### Requirement: Pantalla Settlement Summary: pestaña Movements
El Settlement Summary SHALL tener las pestañas **Summary** y **Movements**. **Movements** SHALL mostrar los movimientos del ciclo elegido (E, I o R, con E por defecto) en el orden del API, paginados en el servidor, con transacción, estado, ronda, fila de origen, fecha del evento, importe, fees con su desglose, reservas (en una columna **Reserves**) y Settled, tal como llegan. Pestaña, ciclo y página SHALL guardarse en la dirección.

#### Scenario: Reservas en una columna
- **GIVEN** un movimiento con `reserveHeldAmt = "11.5240"`, `reserveReleasedAmt = "7.2500"`, `reserveEarlyReleasedAmt = "1.1000"` y `expectedReserveReleaseAt = "2027-03-27T00:04:11"`
- **THEN** las columnas son **Transaction**, **Status**, **Round**, **Source row**, **Event date**, **Amount**, **Fees**, **Reserves** y **Settled**, y **Reserves** muestra `Held 11.5240`, `Released 7.2500`, `Released on chargeback 1.1000` y `Expected release 2027-03-27 ET`

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
