# Spec Delta

## MODIFIED Requirements

### Requirement: Selección por fecha de evento
El fee aplicado a un movimiento SHALL ser el vigente en `eventDate`: `(startDate IS NULL OR startDate <= d) AND (endDate IS NULL OR endDate >= d)`. `d` SHALL ser el día de la fecha de negocio del evento (hora de pared de Nueva York, sin zona), nunca la hora actual, la del batch ni una fecha de auditoría. Cada tipo transaccional cuyo `appliesToStatusId` es el estado del movimiento SHALL aportar una fila de desglose con su importe a 4 decimales (lo que da más se redondea mitad hacia arriba en el cuarto) y la configuración aplicada.

#### Scenario: Fee elegido por la fecha del evento, no la del batch
- GIVEN en una cuenta un fee de Chargeback con vigencia NULL…2026-10-31 y otro con vigencia 2026-11-01…NULL
- WHEN se procesa en un batch de noviembre un chargeback cuya fecha de evento en el gateway es 2026-10-15
- THEN el movimiento recibe el fee que termina el 2026-10-31, aunque el batch sea posterior

#### Scenario: Fee sin límites aplica a cualquier evento
- GIVEN en una cuenta un único fee MDR con vigencia NULL…NULL
- WHEN se procesa un movimiento con cualquier fecha de evento
- THEN el movimiento recibe ese fee

#### Scenario: Último instante del día de fin
- GIVEN un fee de Refund con vigencia NULL…2026-10-31
- WHEN se procesa un refund con fecha de evento 2026-10-31T23:59:59 (hora de Nueva York)
- THEN el movimiento recibe ese fee

#### Scenario: Varios fees en un movimiento
- GIVEN ProviderA-USD con MDR 10 % y `TRX Fee - Deposit` 0.65 vigentes NULL…NULL
- WHEN se procesa una aprobada de 100.0000 USD
- THEN el movimiento tiene dos filas de desglose (10.0000 y 0.6500), cada una con su `feeId`, `feeTypeId`, fecha del evento y configuración aplicada, y `feeAmount = 10.6500`

#### Scenario: Cuatro decimales sin redondear a céntimos
- GIVEN un MDR del 10 %
- WHEN se procesa una aprobada de 12.3450 USD
- THEN la fila MDR vale 1.2345, no 1.2300

#### Scenario: Empate en el quinto decimal
- GIVEN un MDR del 10 %
- WHEN se procesa una aprobada de 12.3445 USD (1.23445)
- THEN la fila MDR vale 1.2345 (mitad hacia arriba en el cuarto decimal), no 1.2344

#### Scenario: Fees de batch-clean
- WHEN se procesa `data/samples/batch-clean`
- THEN la suma de fees por categoría y el total coinciden con `expected.summary.fees`, salvo `mdrIncludedInDeposit`, que el oráculo calcula sobre el total y puede diferir de la suma por movimiento (P15)

#### Scenario: Ajuste sin fecha con un fee abierto
- GIVEN un movimiento I sin fecha de evento y un único fee de su tipo con vigencia NULL…NULL
- WHEN se procesa
- THEN recibe ese fee (vale para cualquier fecha)

#### Scenario: Ajuste sin fecha con fees fechados
- GIVEN un movimiento I sin fecha de evento y fees de su tipo con vigencias cerradas
- WHEN se procesa
- THEN no recibe fee de ese tipo y la respuesta trae la advertencia `undated_adjustment` con `feeSkipped = true`

#### Scenario: Solo el fee de Chargeback
- GIVEN `legacy-provider` (ProviderC-Alt, con un único fee transaccional, el de Chargeback)
- WHEN se procesa
- THEN el movimiento `CHB 2` lleva ese fee y los movimientos E tienen `feeAmount = 0.0000` sin filas de desglose, como dice `expected.summary.fees`

#### Scenario: Cuenta sin fees
- GIVEN una cuenta de fixture sin ningún fee transaccional
- WHEN se procesa un import suyo
- THEN todos los movimientos tienen `feeAmount = 0.0000`, sin filas de desglose, y la respuesta trae la advertencia `no_transactional_fees`

#### Scenario: Ediciones posteriores no recalculan
- GIVEN un movimiento procesado con un fee
- WHEN después se cierra o edita ese fee
- THEN el desglose del movimiento conserva su importe y su `configurationSnapshot`

## ADDED Requirements

### Requirement: Fees de la cuenta vigentes a una fecha
`GET /api/v1/accounts/{id}/fees?transactional=&asOf=` SHALL exigir `fee.view` y alcance, y devolver los fees de la cuenta, filtrados por tipo transaccional o no, y vigentes en `asOf` (fecha de negocio) si se indica. Cada uno con tipo, importe fijo y porcentaje como texto, y vigencia con `null` para "always".

#### Scenario: Preestablecidos de ProviderB-Main
- WHEN `analyst` pide `GET /accounts/{ProviderB-Main}/fees?transactional=false`
- THEN recibe el fee `Monthly Fee` con `fixedAmount = "250.0000"`, `startDate = null` y `endDate = null`

#### Scenario: Vigentes a una fecha
- GIVEN un fee con vigencia NULL…2026-10-31 y otro del mismo tipo 2026-11-01…NULL
- WHEN se pide `asOf=2026-10-15`
- THEN solo se devuelve el primero

#### Scenario: Cuenta de otro merchant
- WHEN `viewer` pide los fees de ProviderC-Alt (merchant 2) o de una cuenta inexistente
- THEN recibe el mismo `404 not_found`

### Requirement: Catálogo de tipos de fee
`GET /api/v1/fee-types` SHALL exigir autenticación y devolver los tipos activos con `feeTypeId`, `code`, `title`, `isTransactional`, `appliesToStatusId` y `allowsFreeAmount`, para elegir la categoría de un fee de importe libre.

#### Scenario: Categorías de importe libre
- WHEN `analyst` pide `GET /fee-types`
- THEN recibe los 6 tipos transaccionales y los 21 no transaccionales, y `Special Adjustment` tiene `allowsFreeAmount = true`
