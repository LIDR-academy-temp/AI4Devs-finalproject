# Spec Delta

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
- **AND** está en una tarjeta con el título `Date ranges used by the validations`, centrada en la sección y con el ancho de su contenido

#### Scenario: Contadores explicados
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** mira los contadores
- **THEN** cada uno muestra su valor en su tarjeta y su explicación de una línea en un tooltip: `Pending in range` cuenta las transacciones de los canales de la cuenta que siguen `Pending` en el gateway con fecha de creación dentro del rango APP o DEC; `Undated adjustments`, las filas I del batch sin fecha de cambio de estado; `Undated candidates`, las transacciones del gateway en un estado de I sin fecha de cambio de estado, que no se comparan con el rango I; ninguno es un hallazgo, nota que sigue a la vista

#### Scenario: Corrida bloqueada
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** abre el paso Analysis
- **THEN** junto al título ve `Overall result` y `Blocked`
- **AND** no ve la tabla `Date ranges used by the validations`

#### Scenario: Rango sin filas
- **WHEN** la corrida trae `ranges.DEC = null`
- **THEN** la fila `E` `DEC` muestra `—` como rango

## ADDED Requirements

### Requirement: Pantalla Analysis & Validations: tarjetas de la cabecera
La tarjeta `Date ranges used by the validations` SHALL estar centrada horizontalmente en la sección, con el ancho de su contenido. Cada contador informativo SHALL ir en su tarjeta, con el aspecto de las de contadores del análisis (etiqueta pequeña atenuada y número grande), en tres columnas desde el ancho `sm` y una por fila por debajo, separadas de la tarjeta de rangos y de la tabla de validaciones. Ninguna SHALL cambiar de tono por tener un valor mayor que 0.

#### Scenario: Cabecera de una corrida con advertencias
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** `analyst` mira Validations a 1280 y a 1024 px
- **THEN** la tarjeta de rangos está centrada horizontalmente y tiene el ancho de su tabla
- **AND** `Pending in range 0`, `Undated adjustments 1` y `Undated candidates 0` están cada uno en su tarjeta, en una misma fila, entre la tarjeta de rangos y la tabla de validaciones

#### Scenario: Un contador mayor que 0 no es una advertencia
- **GIVEN** la corrida vigente de `batch-issues`, con `undatedAdjustmentCount = 1`
- **WHEN** mira la tarjeta `Undated adjustments`
- **THEN** tiene el mismo tono que `Pending in range 0` y no se resalta como advertencia

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es menor que `sm`
- **THEN** las tres tarjetas de contadores van una por fila

### Requirement: Pantalla Analysis & Validations: explicación de los contadores en un tooltip
La explicación de cada contador informativo SHALL mostrarse en un tooltip, detrás de un botón de información junto a su etiqueta, que se alcanza con Tab y tiene el nombre accesible `About <etiqueta>`. El tooltip SHALL abrirse al pasar el ratón o al recibir el foco, y cerrarse con Escape sin que el foco salga del botón. La explicación SHALL quedar asociada al contador para lectores de pantalla también con el tooltip cerrado. La nota de que ninguno es un hallazgo SHALL seguir a la vista.

#### Scenario: Explicación con teclado
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** `analyst` llega con Tab al botón `About Pending in range`
- **THEN** ve el tooltip con la explicación de `Pending in range`
- **AND** al pulsar Escape el tooltip se cierra y el foco sigue en el botón

#### Scenario: Explicación con el ratón
- **WHEN** pasa el ratón por el botón `About Undated candidates`
- **THEN** ve el tooltip con la explicación de `Undated candidates`

#### Scenario: Lector de pantalla
- **WHEN** un lector de pantalla recorre la tarjeta `Undated adjustments` con el tooltip cerrado
- **THEN** el botón `About Undated adjustments` tiene como descripción accesible la explicación de `Undated adjustments`, y la tarjeta la contiene como texto una sola vez

#### Scenario: Nota a la vista
- **WHEN** mira los contadores sin abrir ningún tooltip
- **THEN** ve la nota `Informative: none of them is a finding.`
