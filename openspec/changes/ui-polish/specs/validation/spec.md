## MODIFIED Requirements

### Requirement: Pantalla Analysis & Validations: cabecera de la corrida
Con corrida vigente, la pantalla SHALL mostrar el estado global (`Blocked` si `run.blocked`; si no, `Warnings` si alguna validación es `warning`; si no, `Passed`), el número de corrida con su fecha y su usuario, la tabla `Date ranges used by the validations` con el rango usado por ciclo y estado, y los contadores informativos `pendingInRangeCount`, `undatedAdjustmentCount` y `undatedCandidateCount`, cada uno con una explicación corta de qué cuenta.

#### Scenario: Corrida con advertencias
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el paso Analysis
- **THEN** ve `Warnings`, `Run #<runId>` con su fecha en `ET` y `analyst`, la tabla `Date ranges used by the validations` con sus seis filas y su rango con fecha y hora mínima y máxima en `ET`, y `Pending in range 0`, `Undated adjustments 1`, `Undated candidates 0`

#### Scenario: Filas de la tabla de rangos
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** mira la tabla de rangos
- **THEN** las filas son, en este orden, `E` `APP` con el rango APP, `E` `DEC` con el rango DEC, `I` `CHB`, `I` `REF` e `I` `RDR` con una sola celda de rango I que abarca las tres, y `R` `—` con el rango R
- **AND** la tabla tiene las columnas `Cycle`, `Status` y `Date range`, sin `Transactions`, porque el API no da el conteo por estado de la corrida (#87)

#### Scenario: Contadores explicados
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** mira los contadores
- **THEN** cada uno muestra su valor y una explicación de una línea: `Pending in range` cuenta las transacciones de los canales de la cuenta que siguen `Pending` en el gateway con fecha de creación dentro del rango APP o DEC; `Undated adjustments`, las filas I del batch sin fecha de cambio de estado; `Undated candidates`, las transacciones del gateway en un estado de I sin fecha de cambio de estado, que no se comparan con el rango I; ninguno es un hallazgo

#### Scenario: Corrida bloqueada
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** abre el paso Analysis
- **THEN** el estado global es `Blocked`

#### Scenario: Rango sin filas
- **WHEN** la corrida trae `ranges.DEC = null`
- **THEN** la fila `E` `DEC` muestra `—` como rango
