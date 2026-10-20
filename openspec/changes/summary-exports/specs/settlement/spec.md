# Spec Delta

## MODIFIED Requirements

### Requirement: Exports
El intento SHALL exportar (a) el summary para el merchant, (b) el CSV Back-Office de transacciones (TXN) con columnas `ID, Status` y (c) el CSV de reservas (RR) con columnas `ID, Description`. El TXN SHALL contener los movimientos E `Successful` (`SUC`) y los I `Chargeback` (`CHB`, también los de `excludeAmount`), `Refund` (`REF`) y `RDR` (`RDR`), sin `Declined`, una fila por par (`ID`, `Status`) distinto. El RR SHALL contener los movimientos R con `Description = "Batch <batchNo>"`, una fila por `ID` distinto. `ID` SHALL ser el identificador de origen de la transacción escrito tal cual, como texto y sin ningún formato para Excel. Los archivos SHALL generarse a partir de lo escrito al procesar, en cualquier estado del intento, e identificarse por intento con el nombre `<cuenta>_B<batchNo>_A<attemptNo>_<type>.csv`. Descargarlos no SHALL cambiar ningún estado. Cada descarga SHALL quedar auditada.

#### Scenario: Exports disponibles al procesar, sin efecto en el pago
- GIVEN un batch recién procesado
- WHEN el analista descarga el summary y los dos CSV
- THEN cada export está identificado por su intento y la descarga no cambia el estado del batch ni marca nada como Settled

#### Scenario: IDs como texto
- GIVEN un batch con transacciones de ID numérico de 15 y de 16 dígitos y de ID UUID
- WHEN se exportan los CSV y el summary
- THEN cada ID se escribe con exactamente los caracteres de su identificador de origen, sin notación científica, sin pérdida de dígitos y sin `="…"`, apóstrofo, prefijo ni comillas que RFC 4180 no exija

#### Scenario: TXN de batch-clean
- GIVEN `batch-clean` procesado como batch 123 de ProviderA-USD
- WHEN se descarga `type=transactions`
- THEN el archivo tiene la cabecera `ID,Status` y 350 filas: 340 `SUC`, 2 `CHB`, 6 `REF` y 2 `RDR` (`expected.summary.qty`), y ninguna de las 110 declinadas

#### Scenario: RR de batch-clean
- GIVEN el mismo batch
- WHEN se descarga `type=reserves`
- THEN el archivo tiene la cabecera `ID,Description` y 320 filas (`expected.summary.qty.reservesReleased`), todas con `Description = Batch 123`

#### Scenario: CHB 2 en el TXN
- GIVEN `legacy-provider` procesado, con su fila `CHB 2` (`expected.excludeAmountRows`)
- WHEN se descarga `type=transactions`
- THEN esa transacción sale con `Status = CHB`, y el archivo tiene 61 filas: 60 `SUC` y 1 `CHB`

#### Scenario: Refund y Chargeback de la misma transacción
- GIVEN un intento con dos movimientos I de la misma transacción, uno `Refund` y otro `Chargeback`
- WHEN se descarga el TXN
- THEN la transacción sale en dos filas, una `REF` y otra `CHB`

#### Scenario: Chargeback y CHB 2 de la misma transacción
- GIVEN un intento con un movimiento I `Chargeback` y otro `Chargeback` con `excludeAmount` de la misma transacción
- WHEN se descarga el TXN
- THEN la transacción sale en una sola fila `CHB`

#### Scenario: Nombre del archivo por intento
- GIVEN el intento 2 del batch 118 de la cuenta `ProviderA-USD`
- WHEN se descarga `type=reserves`
- THEN la respuesta lleva `Content-Disposition: attachment; filename="ProviderA-USD_B118_A2_reserves.csv"`

#### Scenario: Nombre de cuenta con caracteres fuera de la lista blanca
- GIVEN una cuenta llamada `Provider X / EU` y su intento 1 del batch 5
- WHEN se descarga `type=summary`
- THEN el nombre del archivo es `Provider_X_EU_B5_A1_summary.csv`

#### Scenario: Tres descargas seguidas
- GIVEN un batch `processed`
- WHEN el mismo usuario descarga tres veces el TXN
- THEN el batch sigue `processed`, ningún movimiento cambia y hay tres filas `settlement.export` en `AuditLog` con el usuario, el `batchId`, el tipo y el nombre del archivo

#### Scenario: Export de un intento deshecho
- GIVEN un intento `undone`
- WHEN se descarga cualquiera de los tres exports
- THEN responde `200` con el archivo de ese intento, identificado por su `attemptNo`

## ADDED Requirements

### Requirement: Formato de los CSV
Los tres exports SHALL ser CSV RFC 4180: separador `,`, fila de cabecera, CRLF, UTF-8 sin BOM, y comillas dobles (con las internas duplicadas) solo en valores con `,`, `"` o salto de línea. Los importes SHALL llevar punto decimal, cuatro decimales, sin separador de miles y `-` si son negativos, sin pasar por coma flotante. La respuesta SHALL llevar `Content-Type: text/csv; charset=utf-8` y `Cache-Control: no-store`.

#### Scenario: Cabeceras HTTP del export
- WHEN se descarga cualquier export
- THEN la respuesta es `200` con `Content-Type: text/csv; charset=utf-8`, `Cache-Control: no-store` y `Content-Disposition: attachment` con el nombre del archivo

#### Scenario: Bytes del TXN
- GIVEN un intento con un único movimiento E `Successful` de la transacción `911545593909470`
- WHEN se descarga el TXN
- THEN el cuerpo empieza sin BOM por `ID,Status`, las líneas terminan en CRLF y la fila de datos contiene el ID completo y `SUC`

#### Scenario: Descripción con coma en el summary
- GIVEN un fee por batch con descripción `Wire fee, October`
- WHEN se descarga el summary
- THEN esa celda sale entre comillas dobles y el archivo sigue teniendo el mismo número de columnas en ese bloque

### Requirement: Summary del merchant
El export `summary` SHALL tener nueve bloques con cabecera, separados por una línea vacía: intento, totales, marcas, fees por batch, reservas, amount payable (nueve líneas con signo e importe y la fila `Amount payable`), incidencias, filas no procesadas y advertencias. Las cifras SHALL ser las de la vista, sin recalcular. Las fechas de negocio SHALL ir sin convertir y `processedAt` en hora de Nueva York (`ET`). Una advertencia con transacción SHALL llevar su ID de origen.

#### Scenario: Summary de batch-clean
- GIVEN `batch-clean` procesado con los dos fees prellenados
- WHEN se descarga `type=summary`
- THEN los totales por categoría, las reservas, `otherFeeAmt = 40.0000` y `Amount payable = 33771.3600` coinciden con `expected.summary`
- AND el bloque del amount payable tiene las nueve líneas en el orden fijo, y la suma con signo de sus importes es `33771.3600`

#### Scenario: Fechas del summary
- GIVEN un intento procesado el `2026-10-19T15:40:03.120Z` con rango APP máximo `2026-10-07T23:58:40.000Z`
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

### Requirement: Texto del summary sin fórmulas
En el export `summary`, toda celda de texto (nombre de la cuenta, usuarios, canales, marcas, tipo y descripción de los fees por batch) que empiece por `=`, `+`, `-`, `@`, tabulador o retorno de carro SHALL llevar un apóstrofo delante, para que una hoja de cálculo la muestre y no la ejecute. Las cifras (también los importes negativos), las fechas y los IDs no SHALL cambiar. TXN y RR no llevan texto libre y no cambian.

#### Scenario: Texto que empieza como una fórmula
- GIVEN un fee por batch con descripción `=HYPERLINK("http://example.test","click")` y otro con importe `-25.0000`
- WHEN se descarga el summary
- THEN la descripción sale como `'=HYPERLINK(…)` (con las comillas de RFC 4180) y el importe sale `-25.0000`, sin apóstrofo

### Requirement: Lectura del intento
`GET /api/v1/settlements/{id}` SHALL responder `200` con la vista del intento, la misma forma que la respuesta `201` de procesar, construida a partir de lo escrito. También SHALL servir los intentos sin auditoría `settlement.process` (los del seed), con `validationSummary = null`, `skipped` en 0 y sin advertencias ni canales asociados. `settledStatus` SHALL derivarse del estado del intento: `processed` → `pending_payment`, `paid` → `settled`, `undone` → `undone`.

#### Scenario: Recargar el intento recién procesado
- GIVEN `batch-clean` procesado, con la respuesta `201` guardada
- WHEN `analyst` pide `GET /settlements/{batchId}`
- THEN recibe `200` con un cuerpo igual a la respuesta `201`, salvo el orden de las claves

#### Scenario: Batch del seed
- GIVEN un batch sembrado `paid` de ProviderA-USD
- WHEN `analyst` lo pide
- THEN recibe `200` con `status = paid`, `settledStatus = settled` y `validationSummary = null`, y el desglose del payable suma su `amountPayable`

#### Scenario: Cuenta anterior de otro merchant
- GIVEN `batch-clean` procesado (merchant 1) con un canal cuya cuenta primaria anterior era de un merchant 2
- WHEN `analyst` (merchants 1 y 2) y `viewer` (solo merchant 1) piden `GET /settlements/{batchId}`
- THEN `analyst` ve esa cuenta en `channelsAssigned[].previousAccount` y `viewer` recibe `{ accountId: null, name: null, outOfScope: true }`, como en la respuesta de procesar

### Requirement: Movimientos del intento
`GET /api/v1/settlements/{id}/transactions` SHALL exigir `type` ∈ `E` | `I` | `R` y devolver, paginados (`page` desde 1, `pageSize` 1–500, 50 por defecto) y con `total`, los movimientos del ciclo en orden estable. Cada uno SHALL traer transacción, estado, fila de origen, importes, fees con su desglose, fecha del evento (o `null`), reserva y `settled`, y los de la misma transacción y ciclo SHALL salir por separado.

#### Scenario: Ajustes de batch-clean
- GIVEN `batch-clean` procesado
- WHEN se piden sus movimientos `type=I`
- THEN `total = 10` (2 `Chargeback`, 6 `Refund`, 2 `RDR`) y cada movimiento trae su desglose de fees, cuya suma es su `feeAmount`

#### Scenario: Paginación estable
- GIVEN `batch-clean` procesado
- WHEN se piden las páginas 1 a 7 de `type=E` con `pageSize = 70`
- THEN entre todas salen los 450 movimientos E, cada uno una sola vez, y repetir una página devuelve los mismos movimientos en el mismo orden

#### Scenario: Ciclo inválido
- WHEN se pide `type=X`, sin `type` o con `pageSize = 501`
- THEN responde `400 validation_error`

### Requirement: Settled derivado del intento en las lecturas
Toda lectura de un intento y de sus movimientos SHALL derivar Settled del estado del intento (`paid`), nunca de `settlementStatusId`.

#### Scenario: Procesado frente a pagado
- GIVEN un intento `processed` y un batch sembrado `paid`
- WHEN se piden sus movimientos
- THEN los del intento `processed` traen `settled = false` y los del `paid`, `settled = true`

### Requirement: Intentos de un import
`GET /api/v1/imports/{id}/settlements` SHALL responder `200` con los intentos del import (vigente y deshechos), del más reciente al más antiguo por `processedAt`, cada uno con `batchId`, `batchNo`, `attemptNo`, `status`, `settledStatus`, `processedAt`, quién lo aprobó, `amountPayable` e `isCurrent` (es el `currentBatchId` del import). Un import sin intentos SHALL devolver una lista vacía.

#### Scenario: Import procesado
- GIVEN `batch-clean` procesado
- WHEN se piden sus intentos
- THEN hay uno, con `batchNo = 123`, `attemptNo = 1`, `status = processed`, `settledStatus = pending_payment` e `isCurrent = true`

#### Scenario: Import sin procesar
- GIVEN un import `validated`
- WHEN se piden sus intentos
- THEN la lista está vacía

### Requirement: Alcance y permisos de las lecturas y los exports
Las lecturas SHALL exigir autenticación y el export además `reports.view`, comprobado antes que el alcance (`403 forbidden`). Un intento o un import inexistente o de un merchant fuera del alcance del usuario SHALL responder el mismo `404 not_found` (`"Settlement not found"`, `"Import not found"`). Sin token SHALL responder `401 unauthorized`. Los errores SHALL ser JSON (`{ code, message, details? }`) también en la ruta del export.

#### Scenario: Batch de otro merchant
- GIVEN un batch sembrado de ProviderC-Alt (merchant 2)
- WHEN `viewer` (solo merchant 1) pide la vista, los movimientos o un export
- THEN recibe el mismo `404` que para un `batchId` inexistente

#### Scenario: Sin reports.view
- GIVEN un usuario autenticado sin `reports.view`
- WHEN pide un export de un batch de otro merchant o inexistente
- THEN recibe `403` con `code = "forbidden"` antes de mirar el alcance

#### Scenario: Tipo de export inválido
- WHEN se pide `type=pdf` o sin `type`
- THEN responde `400 validation_error` en JSON y no se escribe auditoría

#### Scenario: Sin token
- WHEN se pide cualquiera de las cuatro rutas sin `Authorization`
- THEN responde `401` con `code = "unauthorized"`
