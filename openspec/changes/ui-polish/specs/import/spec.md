## ADDED Requirements

### Requirement: Pantallas Upload Files y Column Mapping: un bloque por archivo
En los pasos Files y Mapping, cada archivo del import SHALL verse como un bloque con un tono suave propio, distinto del fondo de la página y del archivo vecino, y una cabecera de archivo marcada con su nombre en negrita y su número de hojas. El mismo archivo SHALL tener el mismo tono en los dos pasos. Los archivos de la cola (pendientes, subiendo o rechazados) SHALL no tomar tono hasta que el API los acepta.

#### Scenario: Batch repartido en dos archivos
- **GIVEN** el import de `batch-split` con `part1` y `part2`
- **WHEN** `analyst` abre el paso Files y después el paso Mapping a 1280 px
- **THEN** en los dos pasos cada archivo es un bloque con su cabecera (`Recon_Template_ProviderA-USD_batch-split_part1.xlsx` y `…_part2.xlsx`, cada uno con su número de hojas, `10 sheets`), los dos bloques tienen tonos distintos entre sí y del fondo, y `part1` tiene el mismo tono en Files que en Mapping

#### Scenario: Nombre largo
- **GIVEN** un archivo cuyo nombre no cabe en una línea
- **THEN** su cabecera parte el nombre en varias líneas sin desplazamiento horizontal, a 1280 y a 1024 px

#### Scenario: Archivo en cola
- **WHEN** `analyst` suelta un archivo y aparece como `Uploading…`
- **THEN** su entrada se ve sin tono, con el borde discontinuo de la cola, hasta que el API lo acepta

## MODIFIED Requirements

### Requirement: Pantalla Column Mapping: readiness por archivo
La barra de readiness SHALL agrupar sus elementos por archivo bajo su nombre, con lo del import sin hoja antes, y dentro de cada archivo lo accionable primero. Las notas puramente informativas (hoja sin filas, hoja oculta, hoja ignorada por regla) SHALL plegarse dentro de su archivo bajo `N informational notes`. En cada elemento, el nombre de la hoja (o `Import`) SHALL ir en negrita y separado de su descripción, también cuando la barra dice `Ready to analyze`.

#### Scenario: Notas por archivo
- **GIVEN** el import de `batch-split` recién subido
- **WHEN** abre el paso Mapping
- **THEN** la barra muestra un grupo por archivo con su nombre; en `part1`, el elemento de `DEC` (`Fixed status Declined with rows: the DEC range will open at validation`) a la vista y `8 informational notes` plegadas; en `part2`, solo `6 informational notes` plegadas

#### Scenario: Nombre de hoja destacado
- **GIVEN** el import de `batch-split` recién subido
- **WHEN** mira el elemento de `DEC` en el grupo de `part1`
- **THEN** `DEC` está en negrita en su propio elemento, separado de `Fixed status Declined with rows: the DEC range will open at validation`, y el elemento se lee entero como `DEC: Fixed status Declined with rows: the DEC range will open at validation`

#### Scenario: Ready to analyze
- **GIVEN** el import de `batch-clean` con el pareo confirmado
- **WHEN** la barra dice `Ready to analyze` y despliega las notas informativas
- **THEN** cada nota muestra el nombre de su hoja en negrita, separado de su descripción, como `CHB Alerts` y `The sheet has no rows`

### Requirement: Resultado del análisis: tabla de filas
El paso Analysis SHALL mostrar las filas de `GET rows` paginadas en el servidor (50 por página), en el orden del API, con hoja y archivo (la hoja primero y siempre visible; el archivo entero, partido en líneas si no cabe, y con su nombre completo también como tooltip), fila, ID leído como texto, ciclo, resultado y motivo, estado, importe, canal y advertencias. SHALL permitir filtrar por resultado. Una fila ambigua SHALL mostrar sus candidatas sin acción.

#### Scenario: No asociadas primero
- **GIVEN** el import de `batch-issues` analizado
- **WHEN** abre el paso Analysis
- **THEN** la primera fila de la tabla es la de `4260465812403708` con `Unmatched` y `No match`, y la paginación indica `770` filas

#### Scenario: Filtro y página
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** filtra por `Matched` y va a la página 16
- **THEN** la tabla muestra 30 filas, todas `Matched`, y se pidió `GET rows?match=matched&page=16&pageSize=50`

#### Scenario: Transacción de otro merchant
- **WHEN** una fila trae `transaction = null` y `out_of_scope_transaction` en `warnings`
- **THEN** la fila muestra `Matched` y `Transaction of another merchant`, sin canal ni importe

#### Scenario: Fila ambigua
- **WHEN** una fila es `ambiguous` con candidatas en dos gateways
- **THEN** muestra `Ambiguous` y el nombre de gateway de cada candidata, sin control para elegir

#### Scenario: Hoja y archivo de cada fila
- **GIVEN** el import de `batch-split` analizado
- **WHEN** abre el paso Analysis
- **THEN** cada fila muestra primero el nombre de su hoja y después el nombre entero de su archivo, sin cortar, partido en líneas dentro de su columna y con el nombre completo como tooltip
