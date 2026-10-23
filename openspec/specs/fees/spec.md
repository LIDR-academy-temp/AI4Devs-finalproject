# fees

## Purpose
Fees por cuenta con vigencia abierta, historial y vista global. README §3.2 "Fees", §4.1.

## Requirements

### Requirement: Vigencia con NULL como infinito
`startDate NULL` SHALL significar "desde siempre" y `endDate NULL` "sin fin". Dos fees del mismo (cuenta, tipo) SHALL no solaparse evaluando los NULL como centinelas; el caso de uso lo valida y el trigger `TR_Fee_NoOverlap` lo respalda. Cambiar un fee SHALL cerrar el vigente con `endDate = nuevo startDate − 1 día` y abrir el nuevo; los fees no se borran.

#### Scenario: Solapamiento rechazado
- GIVEN un fee MDR vigente NULL…NULL en ProviderA-USD
- WHEN se crea otro MDR con startDate 2026-11-01 sin cerrar el anterior
- THEN la API responde 409 y la base no cambia

### Requirement: Selección por fecha de evento
El fee aplicado a un movimiento SHALL ser el vigente en `eventDate`: `(startDate IS NULL OR startDate <= d) AND (endDate IS NULL OR endDate >= d)`.

#### Scenario: Fee elegido por la fecha del evento, no la del batch
- GIVEN en una cuenta un fee de Chargeback con vigencia NULL…2026-10-31 y otro con vigencia 2026-11-01…NULL
- WHEN se procesa en un batch de noviembre un chargeback cuya fecha de evento en el gateway es 2026-10-15
- THEN el movimiento recibe el fee que termina el 2026-10-31, aunque el batch sea posterior

#### Scenario: Fee sin límites aplica a cualquier evento
- GIVEN en una cuenta un único fee MDR con vigencia NULL…NULL
- WHEN se procesa un movimiento con cualquier fecha de evento
- THEN el movimiento recibe ese fee

#### Scenario: Ajuste sin fecha con un fee abierto
- GIVEN un movimiento I sin fecha de evento y un único fee de su tipo con vigencia NULL…NULL
- WHEN se procesa
- THEN recibe ese fee (vale para cualquier fecha)

#### Scenario: Ajuste sin fecha con fees fechados
- GIVEN un movimiento I sin fecha de evento y fees de su tipo con vigencias cerradas
- WHEN se procesa
- THEN no recibe fee de ese tipo y la respuesta trae la advertencia `undated_adjustment` con `feeSkipped = true`

### Requirement: Día de negocio del evento
`d` SHALL ser el día de la fecha de negocio del evento (hora de pared de Nueva York, sin zona), nunca la hora actual, la del batch ni una fecha de auditoría.

#### Scenario: Último instante del día de fin
- GIVEN un fee de Refund con vigencia NULL…2026-10-31
- WHEN se procesa un refund con fecha de evento 2026-10-31T23:59:59 (hora de Nueva York)
- THEN el movimiento recibe ese fee

### Requirement: Desglose de fees por movimiento
Cada tipo transaccional cuyo `appliesToStatusId` es el estado del movimiento SHALL aportar una fila de desglose con su importe a 4 decimales (lo que da más se redondea mitad hacia arriba en el cuarto) y la configuración aplicada.

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

### Requirement: Copia de fees al crear cuenta
`POST /providers/{id}/accounts` con `copyFeesFromAccountId` SHALL copiar solo los fees activos de otra cuenta del mismo proveedor, cada uno con vigencia NULL…NULL, registrando `FeeHistory.action = copied` y auditoría. Sin ese campo la cuenta nace sin fees.

#### Scenario: Se copian solo los fees activos, con vigencia abierta
- GIVEN una cuenta del proveedor con un fee MDR activo con vigencia 2026-01-01…NULL y un fee de Chargeback cerrado
- WHEN se crea otra cuenta del mismo proveedor con `copyFeesFromAccountId` apuntando a la primera
- THEN la cuenta nueva tiene solo la copia del MDR, con vigencia NULL…NULL y sin el historial del original
- AND la copia queda auditada

#### Scenario: Cuenta sin fees por defecto
- WHEN se crea una cuenta sin `copyFeesFromAccountId`
- THEN la cuenta nace sin fees

### Requirement: Historial
Toda creación, edición o cierre SHALL dejar una fila en `FeeHistory` con la fila antes y después en JSON.

#### Scenario: Cambiar un fee cierra el vigente y abre el nuevo
- GIVEN un fee MDR vigente NULL…NULL en una cuenta
- WHEN el analista lo cambia con un nuevo valor desde 2026-11-01
- THEN el fee anterior queda con `endDate = 2026-10-31` y no se borra, y existe un fee nuevo con `startDate = 2026-11-01`
- AND `FeeHistory` tiene una fila `closed` para el anterior y una `created` para el nuevo, cada una con usuario, fecha, `beforeJson` y `afterJson`

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
