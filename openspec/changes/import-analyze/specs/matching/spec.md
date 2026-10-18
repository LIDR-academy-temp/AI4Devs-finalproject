# Spec Delta — matching

## MODIFIED Requirements

### Requirement: Reglas globales y conjuntos por proveedor
Las reglas con `ruleSetId NULL` SHALL actuar como valores por defecto; una regla del conjunto enlazado a la cuenta SHALL prevalecer sobre la global con el mismo patrón; una cuenta sin conjunto SHALL usar solo las globales. La propuesta SHALL evaluar primero las reglas activas del conjunto de la cuenta y, si ninguna coincide, las globales; dentro de cada grupo gana la de menor `priority` y, a igualdad, la regla de columna con `sheetPattern` antes que la genérica.

#### Scenario: Conjunto legacy del proveedor C
- **GIVEN** la cuenta ProviderC-Alt enlazada a "Provider C legacy"
- **WHEN** se importa `data/samples/legacy-provider`, se confirma la propuesta tal cual y se analiza
- **THEN** la propuesta es TRX→E con estado por columna `Order Status`, Fail→E/Declined, CB→I con estado por columna, Summary→ignore, `Merchant Order No#`→transactionId, `Amount USD`→amount; y el análisis produce `rows = { total: 81, matched: 81, unmatched: 0, ambiguous: 0, ignored: 0 }`, `byCycle = { E: 80, I: 1, R: 0 }`, las filas de `Fail` con `statusName = "Declined"`, las de `CB` con `Chargeback`, y ninguna fila de `Summary`

#### Scenario: Origen de cada propuesta
- **WHEN** se propone el pareo de `legacy-provider` para `ProviderC-Alt`
- **THEN** las cuatro hojas y las columnas `Merchant Order No#`, `Order Status` y `Amount USD` llevan `source = account`, aunque `Merchant Order No#` y `Order Status` también existan como reglas globales
- **AND** para `batch-clean` en `ProviderA-USD` (sin conjunto) todas las hojas y columnas llevan `source = global`

#### Scenario: Igualdad sin mayúsculas y patrón regex
- **GIVEN** las reglas globales de la plantilla
- **WHEN** un libro trae las hojas `app`, ` DEC ` y `Other fees`
- **THEN** se proponen como APP, DEC y `Other Fees` con `source = global`
- **AND** una regla de columna `isRegex = true` con patrón `^amount( usd)?$` parea tanto `Amount` como `Amount USD`

#### Scenario: Sin regla
- **WHEN** una hoja o una cabecera no coincide con ninguna regla de la cuenta ni global
- **THEN** su propuesta es `source = none` con `kind` (o `targetField`) `null`, y nunca se adivina un valor

#### Scenario: Un campo destino por hoja
- **GIVEN** una hoja con cabecera `ID, Transaction ID, Amount`
- **WHEN** se propone el pareo con las reglas globales
- **THEN** `ID → transactionId` (origen `global`) y `Transaction ID` queda con `targetField = null` y `source = none`

### Requirement: Alias de estado globales
El texto de estado leído SHALL resolverse por `MatchingStatusAlias` (sin distinguir mayúsculas ni espacios); `CHB 2` SHALL resolver a `Chargeback` con `excludeAmount = 1` (cuenta y aplica fee, no suma importe). En la propuesta, toda columna `status` SHALL listar sus valores distintos resueltos; un valor sin alias queda con `statusId = null` y aviso en `readiness.notes`. Al analizar, cada fila SHALL resolverse igual: sin alias → `statusId = null` y advertencia `status_unresolved`, sin bloqueo.

#### Scenario: CHB 2 legacy
- **GIVEN** `legacy-provider` analizado en `ProviderC-Alt`
- **WHEN** se consultan las filas de la hoja `CB`
- **THEN** la fila con `statusRaw = "CHB 2"` tiene `statusId = 4`, `statusName = "Chargeback"`, `excludeAmount = true` y `matchResult = "matched"`, su `transactionIdRaw` es el único elemento de `expected.excludeAmountRows` (`df14616d-4b26-4ffb-9984-72717ebff6a6`), y ninguna otra fila del import tiene `excludeAmount = true`

#### Scenario: CHB 2 reconocido en la propuesta
- **WHEN** se sube `legacy-provider` a `ProviderC-Alt`
- **THEN** la columna `Order Status` de la hoja CB trae `statusValues = [{ value: "CHB 2", statusId: 4, statusName: "Chargeback", excludeAmount: true }]`, la de TRX `[{ value: "Successful", statusId: 2, … excludeAmount: false }]` y la de Fail `[{ value: "Failed", statusId: 3, statusName: "Declined", excludeAmount: false }]`

#### Scenario: Alias sin distinguir mayúsculas
- **WHEN** una columna de estado trae `successful`, `APPROVED` y ` chb 2 `
- **THEN** resuelven a `Successful`, `Successful` y `Chargeback` con `excludeAmount = true`, respectivamente

#### Scenario: Valor sin alias
- **WHEN** una columna de estado trae el valor `Weird`
- **THEN** aparece en `statusValues` con `statusId = null`, `readiness.notes` lo avisa nombrando la hoja y el valor, y `readiness.canAnalyze` no cambia por ello

#### Scenario: Valor sin alias en el análisis
- **GIVEN** una hoja `TRX` (ciclo E, estado por columna) con una fila `Order Status = "Weird"`
- **WHEN** se analiza
- **THEN** la fila conserva `statusRaw = "Weird"`, `statusId = null`, `warnings` incluye `"status_unresolved"`, el cruce por ID se hace igual y `analysis.warnings.status_unresolved = 1`

### Requirement: Pareo confirmado es la fuente de verdad
La propuesta de pareo SHALL poder editarse por el analista y, una vez confirmada, `ImportSheetColumnMap` e `ImportSheet.cycle/statusId/kind` SHALL gobernar el parseo aunque la regla cambie después; la propuesta recalculada (`proposed`, `columns`) SHALL seguir devolviéndose solo como referencia. Mientras ninguna hoja esté confirmada (`mappingConfirmed = false`), la propuesta SHALL recalcularse con las reglas vigentes y no SHALL existir ninguna fila de `ImportSheetColumnMap`.

#### Scenario: Antes de confirmar
- **GIVEN** un import recién subido
- **WHEN** se consulta `GET /api/v1/imports/{id}`
- **THEN** todas sus hojas tienen `mappingConfirmed = false`, no hay filas de `ImportSheetColumnMap`, y `proposed` y `columns` coinciden con lo que devolvió la subida

#### Scenario: La regla cambia después de confirmar
- **GIVEN** un import `mapped` cuyo pareo confirmado de `APP` es `E`/`Successful` con `ID → transactionId`
- **WHEN** la regla global de la hoja `APP` pasa a proponer `Declined` y se analiza
- **THEN** todas las filas de `APP` tienen `statusId = 2` (`Successful`), `mapping` sigue mostrando lo confirmado y `proposed` muestra la nueva propuesta con `source = global`

#### Scenario: Columna no pareada se conserva
- **GIVEN** un pareo confirmado de `APP` sin `Currency`
- **WHEN** se analiza
- **THEN** `ImportRow.currency = null`, `rawData.Currency` conserva el texto y no hay advertencia `currency_invalid`

### Requirement: Coherencia ciclo–estado
Una fila cuyo estado resuelto tenga ciclo natural distinto del ciclo de la hoja (p. ej. estado Chargeback en hoja E) SHALL generar la advertencia `cycle_mismatch`, no un bloqueo, y SHALL contarse en `analysis.warnings.cycle_mismatch`. La propuesta de pareo SHALL anticipar esa advertencia en `readiness.notes` cuando un valor distinto de una columna `status` resuelva a un estado cuyo ciclo natural difiera del ciclo propuesto para la hoja.

#### Scenario: Estado de ciclo E en una hoja de ciclo I
- **GIVEN** una cuenta cuyo conjunto parea la hoja `CB` a ciclo I con estado por columna
- **WHEN** la columna `Order Status` de CB trae los valores `CHB` y `Successful`
- **THEN** `readiness.notes` avisa de que `Successful` (ciclo E) no corresponde al ciclo I de la hoja, y `readiness.canAnalyze` sigue siendo `true`

#### Scenario: Advertencia por fila en el análisis
- **GIVEN** esa misma hoja `CB` confirmada y analizada
- **WHEN** se consulta la fila con `Order Status = "Successful"`
- **THEN** `cycle = "I"`, `statusId = 2`, `warnings` incluye `"cycle_mismatch"`, la fila está `matched` si su ID existe, y `analysis.warnings.cycle_mismatch = 1`; las filas `CHB` no llevan la advertencia

## ADDED Requirements

### Requirement: Conjunto de reglas por proveedor
`MatchingRuleSet` SHALL pertenecer a un proveedor; una cuenta SHALL enlazarse a uno de los conjuntos de su proveedor o a ninguno, y un cambio de conjunto SHALL aplicar al siguiente import, nunca a imports ya analizados.

#### Scenario: Cuenta enlazada y cuenta sin conjunto
- **WHEN** se consultan las cuentas del seed
- **THEN** `ProviderC-Alt` está enlazada a "Provider C legacy" (proveedor 201) y `ProviderA-USD`, `ProviderA-EUR`, `ProviderB-Main` y `ProviderC-USD` no tienen conjunto, de modo que sus propuestas salen solo de las reglas globales

#### Scenario: El cambio de conjunto no toca imports analizados
- **GIVEN** un import de `ProviderC-Alt` ya `analyzed`
- **WHEN** la cuenta se desenlaza del conjunto legacy
- **THEN** las filas y el pareo confirmado de ese import no cambian, y solo un import nuevo recibe propuestas de las reglas globales

### Requirement: Comparación de patrones
Un patrón sin `isRegex` SHALL compararse por igualdad con el nombre de hoja o cabecera sin distinguir mayúsculas ni espacios de borde; con `isRegex`, como expresión regular sin distinguir mayúsculas. Una regla inactiva (`isActive = 0`) no SHALL aplicarse.

#### Scenario: Patrón literal y regex
- **GIVEN** la regla global `APP` sin `isRegex` y una regla de columna `isRegex = true` con `^amount( usd)?$`
- **WHEN** un libro trae la hoja `app ` y las cabeceras `Amount` y `AMOUNT USD`
- **THEN** la hoja se propone como APP y ambas cabeceras como `amount`

#### Scenario: Regla inactiva
- **GIVEN** una regla del conjunto de la cuenta con `isActive = 0` que parearía la hoja `Bonus`
- **WHEN** se propone el pareo
- **THEN** `Bonus` no recibe propuesta de esa regla (`source = none` si ninguna otra coincide)

### Requirement: Origen de cada propuesta
Cada propuesta de hoja y de columna SHALL indicar su origen: `account` (regla del conjunto enlazado a la cuenta), `global` (regla global) o `none` (sin propuesta).

#### Scenario: Origen por hoja y por columna
- **WHEN** se propone `legacy-provider` para `ProviderC-Alt` y `batch-clean` para `ProviderA-USD`
- **THEN** en el primero las hojas `TRX`, `Fail`, `CB`, `Summary` y las columnas `Merchant Order No#`, `Order Status`, `Amount USD` llevan `source = account`; en el segundo todo lleva `source = global`; y una hoja `Bonus` sin regla lleva `source = none`

### Requirement: Un campo destino por hoja
Un `targetField` SHALL proponerse como máximo una vez por hoja: cuando dos cabeceras resuelven al mismo campo, gana la columna más a la izquierda y la otra queda sin propuesta (`targetField = null`, `source = none`).

#### Scenario: Dos cabeceras para el mismo campo
- **GIVEN** una hoja con cabecera `Amount, ID, Amount USD` y las reglas globales
- **WHEN** se propone el pareo
- **THEN** `Amount → amount` y `ID → transactionId` con `source = global`, y `Amount USD` queda con `targetField = null` y `source = none`

### Requirement: Estado fijo por hoja frente a columna de estado
Cuando el pareo confirmado de una hoja `transactions` tiene estado fijo (`statusId`) y además una columna `status`, el estado fijo SHALL gobernar `ImportRow.statusId`; `statusRaw` SHALL conservar el texto de la columna y, si ese texto resuelve a un estado distinto del fijo, la fila SHALL llevar la advertencia `status_differs_from_sheet`. Sin estado fijo, la columna gobierna.

#### Scenario: Columna coincide con el estado fijo
- **GIVEN** `legacy-provider`, hoja `Fail` confirmada como `E`/`Declined` con `Order Status → status`
- **WHEN** se analiza
- **THEN** las 20 filas de `Fail` tienen `statusId = 3`, `statusRaw = "Failed"` y ninguna advertencia `status_differs_from_sheet`

#### Scenario: Columna discrepa del estado fijo
- **GIVEN** una hoja `APP` confirmada como `E`/`Successful` con una columna `Status → status` cuya fila trae `Declined`
- **WHEN** se analiza
- **THEN** la fila tiene `statusId = 2`, `statusRaw = "Declined"`, `warnings` incluye `"status_differs_from_sheet"` y `analysis.warnings.status_differs_from_sheet = 1`
