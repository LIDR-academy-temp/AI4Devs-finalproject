## MODIFIED Requirements

### Requirement: Resultado del análisis: tabla de filas
El paso Analysis SHALL mostrar las filas de `GET rows` paginadas en el servidor (50 por página), en el orden del API, con: hoja y número de fila en una línea, y el archivo entero, partido en líneas y con tooltip; ID como texto; ciclo; resultado y motivo; estado; importe y moneda sin partirse; canal; advertencias. SHALL permitir filtrar por resultado. Una fila ambigua SHALL mostrar el gateway de cada candidata; elegir una solo se ofrece con permiso y en `analyzed`.

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
- **THEN** cada fila muestra primero su hoja con su número de fila (`APP · row 2`) en una línea y después el nombre entero de su archivo, sin cortar, partido en líneas dentro de su columna y con el nombre completo como tooltip; la tabla no tiene columna `Row`

#### Scenario: Importe con su moneda
- **WHEN** una fila trae `amount = "50000.0000"` y `currency = "EUR"`
- **THEN** la columna `Amount` muestra `50,000.0000 EUR` en una pieza que no se parte, y la tabla no tiene columna `Currency`
