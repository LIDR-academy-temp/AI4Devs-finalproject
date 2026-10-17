# matching

## Purpose
Reglas que convierten nombres de hoja y columna en ciclo, estado y campos; conjuntos por proveedor y reglas globales. README §3.2 "Reglas de pareo", §1.2.

## Requirements

### Requirement: Reglas globales y conjuntos por proveedor
Las reglas con `ruleSetId NULL` SHALL actuar como valores por defecto; una regla del conjunto enlazado a la cuenta SHALL prevalecer sobre la global con el mismo patrón; una cuenta sin conjunto SHALL usar solo las globales. `MatchingRuleSet` pertenece a un proveedor y una cuenta se enlaza a uno o a ninguno; el cambio aplica al siguiente import. La propuesta SHALL evaluar primero las reglas activas del conjunto de la cuenta y, si ninguna coincide, las globales; dentro de cada grupo gana la de menor `priority` y, a igualdad, la regla de columna con `sheetPattern` antes que la genérica. Un patrón sin `isRegex` SHALL compararse por igualdad sin distinguir mayúsculas ni espacios de borde; con `isRegex`, como expresión regular sin distinguir mayúsculas. Cada propuesta SHALL indicar su origen: `account`, `global` o `none`. Un `targetField` SHALL proponerse como máximo una vez por hoja (gana la columna más a la izquierda).

#### Scenario: Conjunto legacy del proveedor C
- GIVEN la cuenta ProviderC-Alt enlazada a "Provider C legacy"
- WHEN se importa `data/samples/legacy-provider`
- THEN TRX→E con estado por columna `Order Status`, Fail→E/Declined, CB→I con estado por columna, Summary→ignore, `Merchant Order No#`→transactionId, `Amount USD`→amount

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
El texto de estado leído SHALL resolverse por `MatchingStatusAlias` (sin distinguir mayúsculas ni espacios de borde); `CHB 2` SHALL resolver a `Chargeback` con `excludeAmount = 1` (cuenta y aplica fee, no suma importe). En la propuesta de pareo, toda columna propuesta como `status` SHALL listar sus valores distintos con el estado resuelto; un valor sin alias SHALL quedar con `statusId = null` y generar un aviso en `readiness.notes`, no un bloqueo.

#### Scenario: CHB 2 legacy
- WHEN la hoja CB trae una fila con `Order Status = CHB 2`
- THEN el movimiento se procesa como Chargeback con `excludeAmount = 1` y queda listado en `excludeAmountRows`

#### Scenario: CHB 2 reconocido en la propuesta
- **WHEN** se sube `legacy-provider` a `ProviderC-Alt`
- **THEN** la columna `Order Status` de la hoja CB trae `statusValues = [{ value: "CHB 2", statusId: 4, statusName: "Chargeback", excludeAmount: true }]`, la de TRX `[{ value: "Successful", statusId: 2, … excludeAmount: false }]` y la de Fail `[{ value: "Failed", statusId: 3, statusName: "Declined", excludeAmount: false }]`

#### Scenario: Alias sin distinguir mayúsculas
- **WHEN** una columna de estado trae `successful`, `APPROVED` y ` chb 2 `
- **THEN** resuelven a `Successful`, `Successful` y `Chargeback` con `excludeAmount = true`, respectivamente

#### Scenario: Valor sin alias
- **WHEN** una columna de estado trae el valor `Weird`
- **THEN** aparece en `statusValues` con `statusId = null`, `readiness.notes` lo avisa nombrando la hoja y el valor, y `readiness.canAnalyze` no cambia por ello

### Requirement: Pareo confirmado es la fuente de verdad
La propuesta de pareo SHALL poder editarse por el analista y, una vez confirmada, `ImportSheetColumnMap` e `ImportSheet.cycle/statusId/kind` SHALL gobernar el parseo aunque la regla cambie después. Mientras ninguna hoja esté confirmada (`mappingConfirmed = false`), la propuesta devuelta por el detalle del import SHALL recalcularse con las reglas vigentes de la cuenta y no SHALL existir ninguna fila de `ImportSheetColumnMap`.

#### Scenario: Antes de confirmar
- **GIVEN** un import recién subido
- **WHEN** se consulta `GET /api/v1/imports/{id}`
- **THEN** todas sus hojas tienen `mappingConfirmed = false`, no hay filas de `ImportSheetColumnMap`, y `proposed` y `columns` coinciden con lo que devolvió la subida

### Requirement: Coherencia ciclo–estado
Una fila cuyo estado resuelto tenga ciclo natural distinto del ciclo de la hoja (p. ej. estado Chargeback en hoja E) SHALL generar advertencia, no bloqueo. La propuesta de pareo SHALL anticipar esa advertencia en `readiness.notes` cuando un valor distinto de una columna `status` resuelva a un estado cuyo ciclo natural difiera del ciclo propuesto para la hoja.

#### Scenario: Estado de ciclo E en una hoja de ciclo I
- **GIVEN** una cuenta cuyo conjunto parea la hoja `CB` a ciclo I con estado por columna
- **WHEN** la columna `Order Status` de CB trae los valores `CHB` y `Successful`
- **THEN** `readiness.notes` avisa de que `Successful` (ciclo E) no corresponde al ciclo I de la hoja, y `readiness.canAnalyze` sigue siendo `true`
