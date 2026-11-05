## MODIFIED Requirements

### Requirement: Resultado del análisis: tabla de filas
El paso Analysis SHALL mostrar las filas de `GET rows` paginadas en el servidor (50 por página), en el orden del API, con hoja y archivo (la hoja primero y siempre visible; el archivo entero, partido en líneas si no cabe, y con su nombre completo también como tooltip), fila, ID leído como texto, ciclo, resultado y motivo, estado, importe, canal y advertencias. SHALL permitir filtrar por resultado. Una fila ambigua SHALL mostrar el nombre de gateway de cada candidata; elegir una es la resolución desde la pantalla, que solo se ofrece con permiso y en `analyzed`.

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
- **THEN** muestra `Ambiguous` y el nombre de gateway de cada candidata; la de otro merchant, como `<gateway> (another merchant)` y sin canal, estado ni importe

#### Scenario: Hoja y archivo de cada fila
- **GIVEN** el import de `batch-split` analizado
- **WHEN** abre el paso Analysis
- **THEN** cada fila muestra primero el nombre de su hoja y después el nombre entero de su archivo, sin cortar, partido en líneas dentro de su columna y con el nombre completo como tooltip

## ADDED Requirements

### Requirement: Resolver una fila ambigua desde la pantalla
Con `settlement.process` y el import en `analyzed`, cada candidata de una fila `ambiguous` SHALL ofrecer elegirla, también la de otro merchant. Solo al confirmar la elección SHALL llamarse a `PATCH /imports/{id}/rows/{sheetId}/{rowNo}` con `{ gatewayId }`; cerrar la confirmación no SHALL llamar al API.

#### Scenario: Elegir el gateway
- **GIVEN** un import `analyzed` y una fila `ambiguous` con candidatas en `Gateway Numeric` y `Gateway Shared`
- **WHEN** `analyst` elige `Gateway Shared` y confirma
- **THEN** se llama a `PATCH` con `{ gatewayId }` de `Gateway Shared`

#### Scenario: Candidata de otro merchant
- **GIVEN** una fila `ambiguous` con una candidata `outOfScope`
- **WHEN** `analyst` la elige y confirma
- **THEN** se llama a `PATCH` con su `gatewayId`

#### Scenario: Desistir
- **WHEN** `analyst` elige una candidata y cierra la confirmación sin confirmar
- **THEN** no se llama a `PATCH` y la fila sigue `Ambiguous`

### Requirement: Confirmación al resolver una fila ambigua
La confirmación SHALL nombrar la fila y el gateway elegido (`<gateway> (another merchant)` para una candidata de otro merchant, sin canal, estado ni importe) y decir que la fila pasará a `Matched` y que la elección queda registrada. Si la corrida de validaciones vigente existe o aún no se conoce, SHALL avisar además de que se descarta y hay que validar de nuevo; si se sabe que no hay corrida, no SHALL mencionarla.

#### Scenario: Sin corrida de validaciones
- **GIVEN** un import `analyzed` sin corrida de validaciones y una fila `ambiguous`
- **WHEN** `analyst` elige una candidata
- **THEN** la confirmación nombra la fila y el gateway y no menciona la corrida

#### Scenario: Con una corrida vigente
- **GIVEN** un import `analyzed` con una corrida de validaciones vigente y una fila `ambiguous`
- **WHEN** `analyst` elige una candidata
- **THEN** la confirmación avisa de que se descarta la corrida vigente y hay que validar de nuevo

#### Scenario: Candidata de otro merchant en la confirmación
- **WHEN** `analyst` elige una candidata `outOfScope`
- **THEN** la confirmación la nombra como `<gateway> (another merchant)` sin canal, estado ni importe

### Requirement: Después de resolver una fila ambigua
Tras un `200` del `PATCH`, la pantalla SHALL volver a pedir el detalle del import, sus filas y sus validaciones. Un `409` o un `400` SHALL mostrar un mensaje y volver a pedir lo que el error deja desactualizado.

#### Scenario: Fila resuelta
- **GIVEN** un import `analyzed` con una fila `ambiguous`
- **WHEN** `analyst` resuelve la fila
- **THEN** la fila se muestra `Matched` y el contador `Ambiguous` baja en 1

#### Scenario: Corrida descartada
- **GIVEN** un import `analyzed` con una corrida de validaciones vigente y una fila `ambiguous`
- **WHEN** `analyst` resuelve la fila
- **THEN** la sección de validaciones muestra que no hay corrida y Continue exige validar otra vez

#### Scenario: El import ya no está en analyzed
- **WHEN** el `PATCH` responde `409 import_not_editable`
- **THEN** ve `This row can no longer be resolved (<estado>).` y el import se recarga

#### Scenario: La fila ya no es ambigua
- **WHEN** el `PATCH` responde `409 row_not_ambiguous`
- **THEN** ve `This row is no longer ambiguous.` y se vuelven a pedir el import y sus filas

#### Scenario: El gateway ya no es candidato
- **WHEN** el `PATCH` responde `400 validation_error`
- **THEN** ve `That gateway is no longer a candidate for this row.` y se vuelven a pedir las filas

### Requirement: Fila ambigua sin resolución posible
En `validated`, con `settlement.process`, las candidatas de una fila `ambiguous` SHALL verse con el control deshabilitado y un texto que explica que para elegir el gateway hay que validar de nuevo, lo que devuelve el import a `analyzed`. Sin `settlement.process`, o con el import en `processed` o `cancelled`, las candidatas SHALL verse sin control.

#### Scenario: Import validado
- **GIVEN** un import `validated` con una fila `ambiguous`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve las candidatas con el control deshabilitado y `Run the validations again to choose a gateway: the import goes back to Analyzed.`, y no se llama a `PATCH`

#### Scenario: Sin permiso
- **GIVEN** un import `analyzed` con una fila `ambiguous`
- **WHEN** `viewer` abre el paso Analysis
- **THEN** ve las candidatas sin control para elegir

#### Scenario: Import cancelado
- **GIVEN** un import `cancelled` con análisis y una fila `ambiguous`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve las candidatas sin control para elegir
