# Spec Delta

## MODIFIED Requirements

### Requirement: Resultado del análisis: tabla de filas
El paso Analysis SHALL mostrar las filas de `GET rows` paginadas en el servidor (50 por página), en el orden del API, con: hoja y número de fila en una línea, y debajo el archivo en una línea y con tooltip; ID como texto; ciclo; resultado y motivo; estado; importe y moneda sin partirse; canal; advertencias. SHALL permitir filtrar por resultado. Una fila ambigua SHALL mostrar el gateway de cada candidata; elegir una solo se ofrece con permiso y en `analyzed`.

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
- **THEN** la fila muestra `Matched` y `Transaction of another merchant`, sin canal, importe ni moneda

#### Scenario: Fila ambigua
- **WHEN** una fila es `ambiguous` con candidatas en dos gateways
- **THEN** muestra `Ambiguous` y el nombre de gateway de cada candidata; la de otro merchant, como `<gateway> (another merchant)` y sin canal, estado ni importe

#### Scenario: Hoja y archivo de cada fila
- **GIVEN** el import de `batch-split` analizado
- **WHEN** abre el paso Analysis
- **THEN** cada fila muestra primero su hoja con su número de fila (`APP · row 2`) en una línea y debajo el nombre entero de su archivo en una sola línea, sin partir, con el nombre completo como tooltip; la tabla no tiene columna `Row`

#### Scenario: Importe con su moneda
- **WHEN** una fila trae `amount = "50000.0000"` y `currency = "EUR"`
- **THEN** la columna `Amount` muestra `50,000.0000 EUR` en una pieza que no se parte, y la tabla no tiene columna `Currency`

## ADDED Requirements

### Requirement: Resultado del análisis: archivo en una línea en la tabla de filas
En la tabla de filas, la línea del archivo SHALL poder pasar por debajo de las columnas vecinas, pero nunca superponerse al texto de otra columna ni al de su hoja, aunque un ID con guiones o una hoja larga ocupen varias líneas. Un nombre más largo que el ancho de la fila SHALL cortarse con "…" y conservar el nombre completo como tooltip. La tabla SHALL seguir cabiendo sin desplazamiento horizontal a 1024 px.

#### Scenario: Fila de dos líneas
- **GIVEN** el import de `batch-split` analizado
- **WHEN** `analyst` mira la tabla de filas a 1280 y a 1024 px
- **THEN** una fila cuyas demás columnas caben en una línea ocupa dos: `APP · row N` y, debajo, `Recon_Template_ProviderA-USD_batch-split_part1.xlsx` entero en una sola línea

#### Scenario: ID con guiones partido
- **GIVEN** el import de `batch-wrong-account` analizado, con IDs UUID
- **WHEN** mira la tabla de filas a 1024 px y un ID se parte después de sus guiones
- **THEN** la línea del archivo de esa fila queda por debajo de la última línea del ID, sin superponerse

#### Scenario: Hoja larga
- **WHEN** una fila trae `sheetName = "Transactions approved by issuer"` y la hoja se parte en dos líneas
- **THEN** la línea del archivo queda por debajo de la hoja y de su número de fila, sin superponerse

#### Scenario: Fila ambigua con candidatas
- **GIVEN** `analyst` y un import `analyzed` con una fila `ambiguous` con dos candidatas y su botón **Choose**
- **WHEN** mira la tabla de filas
- **THEN** la línea del archivo de esa fila queda por debajo del último **Choose**, sin superponerse, y el foco en ese botón no tapa el nombre del archivo

#### Scenario: Nombre más largo que la fila
- **WHEN** una fila trae un nombre de archivo más largo que el ancho de la fila
- **THEN** la línea del archivo termina en "…" dentro de la tabla, conserva el nombre completo como tooltip y la tabla no se desborda

#### Scenario: Tabla a 1024 px
- **GIVEN** los imports de `batch-split` y `batch-wrong-account` analizados
- **WHEN** mira la tabla de filas a 1024 px
- **THEN** la tabla cabe en su tarjeta sin desplazamiento horizontal (#132)
