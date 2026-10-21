## MODIFIED Requirements

### Requirement: Pantalla Analysis & Validations: cabecera de la corrida
Con corrida vigente, la pantalla SHALL mostrar junto al título `Validations` la etiqueta `Overall result` y el estado global (`Blocked` si `run.blocked`; si no, `Warnings` si alguna validación es `warning`; si no, `Passed`), seguido en texto secundario del número de corrida con su fecha y su usuario. Debajo SHALL mostrar, en su tarjeta y con el formato de las demás tablas, la tabla `Date ranges used by the validations` con el rango usado por ciclo y estado, salvo con estado `Blocked`, y los contadores informativos `pendingInRangeCount`, `undatedAdjustmentCount` y `undatedCandidateCount`, cada uno con una explicación corta de qué cuenta.

#### Scenario: Corrida con advertencias
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el paso Analysis
- **THEN** ve junto al título `Validations` la etiqueta `Overall result` y `Warnings`, y en texto secundario `Run #<runId>` con su fecha en `ET` y `analyst`
- **AND** ve la tabla `Date ranges used by the validations` con sus seis filas y su rango con fecha y hora mínima y máxima en `ET`, y `Pending in range 0`, `Undated adjustments 1`, `Undated candidates 0`

#### Scenario: Filas de la tabla de rangos
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** mira la tabla de rangos
- **THEN** las filas son, en este orden, `E` `APP` con el rango APP, `E` `DEC` con el rango DEC, `I` `CHB`, `I` `REF` e `I` `RDR` con una sola celda de rango I que abarca las tres, y `R` `—` con el rango R
- **AND** la tabla tiene las columnas `Cycle`, `Status` y `Date range`, sin `Transactions`, porque el API no da el conteo por estado de la corrida (#87)
- **AND** está en una tarjeta con el título `Date ranges used by the validations`, alineada a la izquierda y con el ancho de su contenido

#### Scenario: Contadores explicados
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** mira los contadores
- **THEN** cada uno muestra su valor y una explicación de una línea: `Pending in range` cuenta las transacciones de los canales de la cuenta que siguen `Pending` en el gateway con fecha de creación dentro del rango APP o DEC; `Undated adjustments`, las filas I del batch sin fecha de cambio de estado; `Undated candidates`, las transacciones del gateway en un estado de I sin fecha de cambio de estado, que no se comparan con el rango I; ninguno es un hallazgo

#### Scenario: Corrida bloqueada
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** abre el paso Analysis
- **THEN** junto al título ve `Overall result` y `Blocked`
- **AND** no ve la tabla `Date ranges used by the validations`

#### Scenario: Rango sin filas
- **WHEN** la corrida trae `ranges.DEC = null`
- **THEN** la fila `E` `DEC` muestra `—` como rango

### Requirement: Pantalla Analysis & Validations: detalle de un hallazgo
Abrir un hallazgo SHALL mostrar en un panel lateral todas sus apariciones: las del import, con archivo, hoja y fila, y las de batches anteriores, con número de batch, intento, cuenta y estado actual del batch. De cada una SHALL mostrar el estado (`Unresolved status` si es nulo), `CHB 2` si `excludeAmount`, si está incluida por defecto, si está incluida ahora y quién y cuándo la cambió. Debajo, la resolución y el historial con usuario y fecha. Un faltante de la corrida vigente SHALL mostrar además el rango del batch de su ciclo y estado, tal como lo da la corrida, y una línea que diga por qué es faltante.

#### Scenario: Duplicado en el batch (HU2 CA2)
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el hallazgo `Duplicate in batch` de `441706751475644`
- **THEN** ve dos apariciones de `Recon_Template_ProviderB-Main_batch-issues.xlsx` · `APP`, en las filas 12 y 338, ambas `Successful`; la primera `Included by default` e incluida, y la segunda excluida por defecto

#### Scenario: Aparición de un batch anterior
- **WHEN** abre el hallazgo `Duplicate across batches` de `504712738863260`
- **THEN** la aparición `previous_batch` muestra el número de batch, el intento, la cuenta y el estado del batch, y la del import aparece excluida por defecto

#### Scenario: Estado no resuelto
- **WHEN** una aparición llega con `status = null`
- **THEN** se muestra `Unresolved status` y la aparición no se oculta

#### Scenario: Hallazgo de una sola fila
- **WHEN** abre un hallazgo `Non-recorded adjustment`, `Status mismatch` o `Provider mismatch`, que el API devuelve con su fila en `source` y sin apariciones
- **THEN** ve la fila en `Row` (archivo, hoja y fila) y no la sección de apariciones ni ningún aviso de que la transacción no está en el batch

#### Scenario: Faltante sin apariciones
- **WHEN** abre un hallazgo `Missing previous to batch` o `Missing in range`
- **THEN** ve `No occurrences: the transaction is not in this batch.`

#### Scenario: Rango del batch de un faltante en rango
- **GIVEN** la corrida vigente con `ranges.APP` de `2026-09-28 00:04 ET` a `2026-10-07 23:58 ET`
- **WHEN** abre un hallazgo `Missing in range` con `missingRange = APP`
- **THEN** ve `Batch range (E/APP)` `2026-09-28 00:04 ET – 2026-10-07 23:58 ET`, leído de la corrida sin calcular nada en el navegador
- **AND** ve `Its date is inside the batch range, but it is not in this batch and no batch processed it in this cycle.`

#### Scenario: Rango del batch de un faltante anterior
- **WHEN** abre un hallazgo `Missing previous to batch` con `missingRange = I` y estado del gateway `Chargeback`
- **THEN** ve `Batch range (I/CHB)` con el rango I de la corrida
- **AND** ve `Its date is before the batch range and no batch processed it in this cycle.`

#### Scenario: Faltante de una corrida anterior
- **WHEN** abre un faltante cuya corrida ya no es la vigente
- **THEN** no ve `Batch range`, porque la pantalla solo tiene los rangos de la corrida vigente, y ve el ciclo en `Range` como hasta ahora

#### Scenario: Teclado
- **WHEN** el usuario abre un hallazgo con Enter desde la lista y pulsa Escape
- **THEN** el panel se abre con el foco dentro y, al cerrarse, el foco vuelve al hallazgo de la lista
