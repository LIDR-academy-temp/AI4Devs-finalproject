## MODIFIED Requirements

### Requirement: Pantalla Settlement Summary: estado y cabecera del intento
Settlement Summary SHALL mostrar en una rejilla compacta la cuenta, el batch con su intento, el estado (`Processed · pending payment`, `Paid` o `Undone`), quién lo procesó y cuándo, y la fecha de liquidación; debajo, la tabla `Date ranges of this batch` con el rango y los movimientos por ciclo y estado, tal como llegan en la vista. SHALL decir que un intento `processed` no tiene movimientos Settled.

#### Scenario: Recién procesado (HU3 CA6)
- **GIVEN** la respuesta `201` de procesar `batch-clean`
- **THEN** ve `Settlement Summary · batch 123` y la rejilla con `Account` `ProviderA-USD`, `Batch` `123 · attempt 1`, `Status` `Processed · pending payment`, `Processed by` `analyst · <fecha y hora> ET` y `Settlement date` `2026-10-24`
- **AND** ve `Movements are not Settled yet: that happens when the batch is marked as paid.`

#### Scenario: Sin fecha de liquidación
- **GIVEN** un intento con `settlementDate = null`
- **THEN** la rejilla muestra `Settlement date` `Not set`

#### Scenario: Tabla de rangos del batch
- **GIVEN** la vista de `batch-clean` procesado
- **WHEN** mira `Date ranges of this batch`
- **THEN** tiene las columnas `Cycle`, `Status`, `Transactions` y `Date range` y las filas, en este orden, `E` `APP`, `E` `DEC`, `I` `CHB`, `I` `REF`, `I` `RDR` y `R` `—`, con una sola celda de rango I que abarca las tres filas de I
- **AND** `Transactions` es el `qty` de la categoría de cada fila (`deposit`, `declined`, `chargeback`, `refund`, `rdr`) y, en R, `movements.R`, tal como llegan, sin sumar nada en el navegador

#### Scenario: Rango nulo
- **GIVEN** una vista con `dateRanges.R = null`
- **THEN** la fila `R` muestra `—` como rango

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio SHALL mostrarse con los dígitos recibidos, sin convertir: las que solo son un día (`settlementDate`, vigencias de los fees, `expectedReserveReleaseAt`) sin sufijo de zona, y las que llevan hora (`dateRanges`, `eventDate` de los movimientos) con sufijo `ET`. Las de auditoría (`processedAt`, también en Settlement List) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11.000Z"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24`, sin `ET`, `2026-09-28 00:04 ET` y `2026-10-19 11:40 ET`

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
