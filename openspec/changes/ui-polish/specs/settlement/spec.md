## MODIFIED Requirements

### Requirement: Pantalla Settlement Summary: estado y cabecera del intento
Settlement Summary SHALL mostrar en una rejilla compacta la cuenta, el batch con su intento, el estado (`Processed · pending payment`, `Paid` o `Undone`), quién lo procesó y cuándo, y la fecha de liquidación. Los rangos de fechas del batch SHALL verse en `Totals by type`, no en la cabecera. SHALL decir que un intento `processed` no tiene movimientos Settled.

#### Scenario: Recién procesado (HU3 CA6)
- **GIVEN** la respuesta `201` de procesar `batch-clean`
- **THEN** ve `Settlement Summary · batch 123` y la rejilla con `Account` `ProviderA-USD`, `Batch` `123 · attempt 1`, `Status` `Processed · pending payment`, `Processed by` `analyst · <fecha y hora> ET` y `Settlement date` `2026-10-24`
- **AND** ve `Movements are not Settled yet: that happens when the batch is marked as paid.`

#### Scenario: Sin fecha de liquidación
- **GIVEN** un intento con `settlementDate = null`
- **THEN** la rejilla muestra `Settlement date` `Not set`

#### Scenario: Sin tabla de rangos en la cabecera
- **GIVEN** la vista de `batch-clean` procesado
- **THEN** la cabecera no tiene la tabla `Date ranges of this batch`: los rangos están en la columna `Date range` de `Totals by type`

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio SHALL mostrarse con los dígitos recibidos, sin convertir: las que solo son un día (`settlementDate`, vigencias de los fees, `expectedReserveReleaseAt`) y los rangos de `Totals by type` (`dateRanges`, solo el día) sin sufijo de zona, y las que llevan hora (`eventDate` de los movimientos) con sufijo `ET`. Las de auditoría (`processedAt`, también en Settlement List) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11.000Z"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24`, sin `ET`, el rango de `Deposits` empezando en `2026-09-28`, sin hora ni `ET`, y `2026-10-19 11:40 ET`

#### Scenario: Fechas de la lista y de los movimientos
- **GIVEN** una fila de Settlement List con `settlementDate = "2026-10-24"` y `processedAt = "2026-10-19T15:40:03.120Z"`, y un movimiento con `eventDate = "2026-09-28T00:04:11.000Z"`, con el navegador en otra zona
- **THEN** la fila muestra `2026-10-24`, sin `ET`, y `2026-10-19 11:40 ET`, y el movimiento `2026-09-28 00:04 ET`

#### Scenario: Vigencia de un fee preestablecido
- **GIVEN** un fee preestablecido con `startDate = "2026-01-01"` y sin `endDate`
- **WHEN** `analyst` lo ve al añadirlo en Settlement Review
- **THEN** su vigencia empieza en `2026-01-01`, sin `ET`

### Requirement: Pantalla Settlement List: columnas
Cada fila SHALL mostrar el batch, el intento, el estado (`Processed · pending payment`, `Paid` o `Undone`), la fecha de liquidación, quién lo procesó y cuándo, el amount payable alineado a la derecha y los canales, tal como llegan del API. Ninguna cifra SHALL calcularse, sumarse ni reformatearse más allá del separador de miles. Un intento `undone` SHALL verse atenuado.

#### Scenario: Batch sembrado
- **GIVEN** la lista de ProviderA-USD del seed
- **THEN** la primera fila muestra `122`, `1`, `Paid`, su fecha de liquidación sin sufijo de zona, `analyst` con el instante de procesado en ET, su `amountPayable` con separador de miles y sus canales

#### Scenario: Sin fecha de liquidación
- **GIVEN** un intento con `settlementDate = null`
- **THEN** su celda dice `Not set`

#### Scenario: Importe sin pasar por number
- **GIVEN** un intento con `amountPayable = "123456789012345.1234"`
- **THEN** se ve `123,456,789,012,345.1234`

### Requirement: Pantalla Settlement Review: resumen previo
Tras cada cambio válido del formulario, con debounce, la pantalla SHALL pedir `POST /imports/{id}/settlements/preview` con el `runId` revisado y SHALL pintar los movimientos E/I/R, los totales de las cinco categorías con el rango de fechas de cada una, las nueve líneas de `payableBreakdown` con su signo, `amountPayable`, `skipped` por motivo y las advertencias. Toda cifra y todo rango SHALL salir de la respuesta: la pantalla SHALL NOT calcular ni sumar importes ni fechas.

#### Scenario: Resumen previo de batch-clean
- **GIVEN** el import de `batch-clean` `validated` con sus dos fees prellenados
- **WHEN** `analyst` abre su Settlement Review y elige `2026-10-24` en **Settlement date**
- **THEN** se pide una vista previa con el `runId` de la corrida revisada y ve las cinco categorías, las nueve líneas del desglose en el orden del API con `+` o `−`, `Batch fees` con el `otherFeeAmt` de la respuesta y **Amount payable** con el `amountPayable` de la respuesta, todos con separador de miles y sus cuatro decimales

#### Scenario: Rango de cada categoría
- **GIVEN** la vista previa con `dateRanges` APP, DEC e I
- **THEN** `Totals by type` tiene la columna `Date range` con el mismo formato que en el Settlement Summary

#### Scenario: Filas que no se procesan
- **GIVEN** la vista previa con `skipped = { ignored: 3, unmatched: 0, ambiguous: 0, excluded: 2, unresolvedStatus: 0, pending: 0 }`
- **THEN** ve `Not processed: 3 ignored · 2 excluded` y ningún motivo con 0

#### Scenario: Advertencias
- **GIVEN** la vista previa trae `undated_adjustment` de `441706751475644` y `reserve_cap_not_applied`
- **THEN** ve `Adjustment 441706751475644 has no event date: it is processed without one.` y `The reserve cap of the account is not applied yet.`

#### Scenario: Una cifra que no cuadra con la suma
- **GIVEN** una vista previa guionizada cuyo `amountPayable` no es la suma de sus líneas
- **THEN** la pantalla pinta el `amountPayable` de la respuesta tal cual, sin corregirlo

### Requirement: Pantalla Settlement Summary: totales y amount payable auditable
La pantalla SHALL mostrar los movimientos E/I/R, los totales de las cinco categorías con cantidad, importe, fee y rango de fechas, los totales por marca, `reservesReleasedQty` con el rango R, y las nueve líneas de `payableBreakdown` en el orden del API, con su etiqueta, su signo y su importe, hasta `amountPayable`. Toda cifra y todo rango SHALL salir de la vista del API sin recalcularse.

#### Scenario: Desglose de batch-clean
- **GIVEN** la vista del intento de `batch-clean`
- **THEN** ve las líneas `+ Deposits`, `− Chargebacks`, `− Refunds`, `− RDR`, `− Transaction fees`, `− Batch fees`, `− Reserve held`, `+ Reserve released` y `+ Reserve released on chargeback` con los importes de la respuesta y, debajo, **Amount payable** con su `amountPayable`

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
