# fees

## Purpose
Fees por cuenta con vigencia abierta, historial y vista global. README §3.2 "Fees", §4.1.

## Requirements

### Requirement: Vigencia con NULL como infinito
`startDate NULL` SHALL significar "desde siempre" y `endDate NULL` "sin fin". Dos fees del mismo (cuenta, tipo) SHALL no solaparse, evaluando los NULL como centinelas. El caso de uso lo valida y el trigger `TR_Fee_NoOverlap` lo respalda. Cambiar un fee SHALL cerrar el vigente con `endDate = nuevo startDate − 1 día` y abrir el nuevo. Los fees no se borran.

#### Scenario: Solapamiento rechazado
- GIVEN un fee MDR vigente NULL…NULL en ProviderA-USD
- WHEN se crea otro MDR con startDate 2026-11-01 sin cerrar el anterior
- THEN la API responde `409 fee_overlap` con el fee vigente en `details.conflicts` y la base no cambia

#### Scenario: Tipos distintos no se solapan
- GIVEN un fee MDR NULL…NULL
- WHEN se crea un `Annual Fee` NULL…NULL en la misma cuenta
- THEN se crea sin conflicto

#### Scenario: Bordes contiguos
- GIVEN un fee de `Wire Fee` NULL…2026-12-31
- WHEN se crea otro de `Wire Fee` 2027-01-01…NULL
- THEN se crea sin conflicto

#### Scenario: Respaldo del trigger
- WHEN una escritura directa en la base inserta un fee solapado con otro del mismo tipo y cuenta
- THEN el trigger la rechaza

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
`POST /providers/{id}/accounts` con `copyFeesFromAccountId` SHALL copiar solo los fees activos de otra cuenta del mismo proveedor, cada uno con vigencia NULL…NULL, registrando `FeeHistory.action = copied` y auditoría. Sin ese campo la cuenta nace sin fees. Un fee es activo si su `status` es `active` respecto al día de hoy en Nueva York; los `scheduled` y `closed` no se copian. La cuenta origen MAY estar cerrada. Una cuenta origen inexistente, de otro proveedor o fuera del alcance SHALL responder `400 validation_error` con `details.field = "copyFeesFromAccountId"` sin crear nada.

#### Scenario: Se copian solo los fees activos, con vigencia abierta
- GIVEN una cuenta del proveedor con un fee MDR activo con vigencia 2026-01-01…NULL y un fee de Chargeback cerrado
- WHEN se crea otra cuenta del mismo proveedor con `copyFeesFromAccountId` apuntando a la primera
- THEN la cuenta nueva tiene solo la copia del MDR, con vigencia NULL…NULL y sin el historial del original
- AND la copia queda auditada

#### Scenario: Cuenta sin fees por defecto
- WHEN se crea una cuenta sin `copyFeesFromAccountId`
- THEN la cuenta nace sin fees

#### Scenario: Copia de los cinco fees de ProviderC-USD
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `copyFeesFromAccountId` = `ProviderC-USD`
- **THEN** `GET /api/v1/accounts/{id}/fees` de la cuenta nueva devuelve cinco fees con los tipos 1–5, los mismos `fixedAmount`, `percentage`, variantes y `description` que los de `ProviderC-USD`, `startDate = null`, `endDate = null`, `status = "active"`, `inUse = false` y `createdBy.userName = "admin"`
- **AND** los fees de `ProviderC-USD` no cambian

#### Scenario: Un fee programado no se copia
- **GIVEN** la cuenta origen con un fee de un tipo que empieza mañana (día de Nueva York)
- **WHEN** se crea una cuenta copiando de ella
- **THEN** la cuenta nueva no tiene ese fee

#### Scenario: Historial de la copia
- **WHEN** se crea una cuenta copiando dos fees
- **THEN** cada copia tiene una sola fila de historial con `action = "copied"`, `before = null`, `after` con su configuración (vigencia NULL…NULL), `changedBy` el usuario de la petición y `reason = null`
- **AND** la entrada `account.create` de `AuditLog` lleva `copyFeesFromAccountId` y `copiedFees` con un par `{ sourceFeeId, feeId }` por copia

#### Scenario: Cuenta origen cerrada
- **GIVEN** una cuenta del proveedor cerrada con fees activos
- **WHEN** se crea una cuenta copiando de ella
- **THEN** recibe `201` y la cuenta nueva tiene la copia de esos fees

#### Scenario: Cuenta origen de otro proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `copyFeesFromAccountId` = `ProviderA-USD` (proveedor 101)
- **THEN** recibe `400` con `code = "validation_error"` y `details.field = "copyFeesFromAccountId"`, y no se crea ninguna cuenta ni ningún fee

#### Scenario: Cuenta origen inexistente
- **WHEN** `admin` crea una cuenta con `copyFeesFromAccountId = "00000000-0000-4000-8000-00000000ffff"`
- **THEN** recibe `400` con `details.field = "copyFeesFromAccountId"`

#### Scenario: Copia y cambio de fee simultáneos
- **GIVEN** un cambio de un fee de la cuenta origen en curso
- **WHEN** a la vez se crea una cuenta copiando de ella
- **THEN** la copia ve el estado de antes o de después del cambio, nunca una mezcla, y la cuenta nueva no tiene dos fees del mismo tipo

### Requirement: Historial
Toda creación, edición o cierre SHALL dejar una fila en `FeeHistory`: usuario, fecha, acción, la fila antes y después en JSON (dinero como string decimal y fechas `YYYY-MM-DD`) y el `reason` opcional (1–500 caracteres).

#### Scenario: Cambiar un fee cierra el vigente y abre el nuevo
- GIVEN un fee MDR vigente NULL…NULL en una cuenta
- WHEN `admin` lo cambia con un nuevo valor desde 2026-10-03
- THEN el fee anterior queda con `endDate = 2026-10-02` y no se borra, y existe un fee nuevo con `startDate = 2026-10-03`
- AND `FeeHistory` tiene una fila `closed` para el anterior y una `created` para el nuevo, cada una con usuario, fecha, `beforeJson` y `afterJson`

#### Scenario: Motivo demasiado largo
- WHEN `admin` envía `reason` con 501 caracteres
- THEN recibe `400 validation_error` y la base no cambia

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

### Requirement: Permisos y alcance de la administración de fees
Las escrituras (`POST /accounts/{id}/fees`, `PATCH /fees/{id}`) SHALL exigir `fee.manage` y las lecturas de administración (`GET /fees`, `GET /fees/{id}/history`), `fee.view`. El permiso SHALL comprobarse antes que el alcance y que los datos; la validación de esquema puede responder antes (#72). Un fee o una cuenta inexistentes o de un merchant fuera del alcance SHALL responder el mismo `404 not_found`. Sin sesión, `401`.

#### Scenario: Sin permiso de administración
- GIVEN el usuario `analyst` (sin `fee.manage`)
- WHEN pide `POST /accounts/{ProviderA-USD}/fees` o `PATCH /fees/{id}` con un cuerpo válido
- THEN recibe `403 forbidden` y la base no cambia

#### Scenario: Permiso antes que el alcance
- GIVEN el usuario `analyst`
- WHEN pide `PATCH /fees/{id}` con un cuerpo válido para un fee que no existe
- THEN recibe `403 forbidden`, no `404`

#### Scenario: Fee fuera del alcance
- GIVEN el usuario `viewer` (merchant 1)
- WHEN pide `GET /fees/{id}/history` de un fee de ProviderC-Alt (merchant 2) o de un `feeId` inexistente
- THEN recibe el mismo `404 not_found` en los dos casos

#### Scenario: Sin sesión
- WHEN se pide `GET /fees` sin `Authorization`
- THEN la respuesta es `401 unauthorized`

### Requirement: Crear un fee
`POST /api/v1/accounts/{accountId}/fees` SHALL crear un fee de la cuenta con:
- `feeTypeId` de un tipo activo;
- `fixedAmount` y/o `percentage`;
- las variantes opcionales (`conditionalPercentage`, `conditionThresholdAmt`, `brandFixedAmount`, `brandPercentage`);
- `startDate` y `endDate` (`null` = −∞ / +∞);
- `description` (hasta 100 caracteres).

Responde `201` con la `AccountFee`. Las variantes SHALL guardarse tal como llegan, aunque el motor de settlement no las aplica.

#### Scenario: Fee creado con vigencia abierta
- GIVEN una cuenta sin fee de `Wire Fee`
- WHEN `admin` crea `{ feeTypeId: Wire Fee, fixedAmount: "15.0000", startDate: null, endDate: null }`
- THEN recibe `201` con `fixedAmount = "15.0000"`, `percentage = null`, `startDate = null`, `endDate = null`, `status = "active"`, `inUse = false`, `lastAppliedEventDate = null` y `createdBy.userName = "admin"`

#### Scenario: Fee programado junto al vigente
- GIVEN un fee `Wire Fee` con vigencia NULL…2026-12-31 en la cuenta
- WHEN `admin` crea otro `Wire Fee` con vigencia 2027-01-01…NULL
- THEN recibe `201`, el nuevo tiene `status = "scheduled"` y los dos coexisten

### Requirement: Formato de los datos de un fee
Importes y porcentajes SHALL viajar como strings decimales: los importes con hasta 4 decimales y los porcentajes como fracción de 0 a 1 con hasta 6 decimales. Las fechas de vigencia, como `YYYY-MM-DD` o `null`. Un número JSON, una fecha con otro formato o un campo desconocido SHALL responder `400 validation_error`, tanto al crear como al editar.

#### Scenario: Importe como número JSON
- WHEN `admin` envía `fixedAmount: 15`
- THEN recibe `400 validation_error` y la base no cambia

#### Scenario: Porcentaje con demasiados decimales
- WHEN `admin` envía `percentage: "0.0250001"`
- THEN recibe `400 validation_error`

### Requirement: Reglas de un fee válido
Un fee, al crearlo o tras editarlo, SHALL tener al menos `fixedAmount` o `percentage`. También SHALL cumplir `endDate ≥ startDate` cuando ambos están informados y ser de un tipo activo del catálogo. Si incumple alguna, responde `400 validation_error` con `details.field` (`fixedAmount`, `endDate` o `feeTypeId`).

#### Scenario: Ni importe ni porcentaje
- WHEN `admin` crea un fee sin `fixedAmount` ni `percentage`
- THEN recibe `400 validation_error` con `details.field = "fixedAmount"` y la base no cambia

#### Scenario: Fin anterior al inicio
- WHEN `admin` crea un fee con `startDate = 2027-02-01` y `endDate = 2027-01-31`
- THEN recibe `400 validation_error` con `details.field = "endDate"`

#### Scenario: Tipo inactivo o inexistente
- WHEN `admin` crea un fee con un `feeTypeId` que no está activo en el catálogo
- THEN recibe `400 validation_error` con `details.field = "feeTypeId"`

### Requirement: Uso de un fee
Un fee SHALL estar en uso (`inUse = true`) si lo referencia el desglose de algún movimiento o algún fee por batch, de cualquier intento, incluidos los deshechos. Su `lastAppliedEventDate` SHALL ser el mayor de estos días: el de negocio de las fechas de evento de sus desgloses y la `settlementDate` de los batches que lo usan como fee por batch. Las apariciones sin fecha no cuentan. Sin uso, es `null`.

#### Scenario: Fee aplicado por settlements procesados
- GIVEN un fee de una cuenta con batches procesados que lo aplicaron
- WHEN se lee con `GET /accounts/{id}/fees`
- THEN sale con `inUse = true` y `lastAppliedEventDate` igual al día del último evento al que se aplicó

#### Scenario: Fee usado solo como fee por batch
- GIVEN un fee sin desgloses que un batch con `settlementDate` D cobró como fee por batch
- WHEN se lee con `GET /accounts/{id}/fees`
- THEN sale con `inUse = true` y `lastAppliedEventDate = D`

#### Scenario: Intento deshecho
- GIVEN un fee con un desglose de 2020-01-15 y un fee por batch en un intento `undone` con `settlementDate` posterior
- WHEN se lee con `GET /accounts/{id}/fees`
- THEN sigue en uso y su `lastAppliedEventDate` es la `settlementDate` de ese intento

#### Scenario: Fee recién creado
- WHEN se crea un fee
- THEN sale con `inUse = false` y `lastAppliedEventDate = null` hasta que un settlement lo aplique

### Requirement: Corregir un fee en el sitio
`PATCH /api/v1/fees/{feeId}` sin `effectiveFrom` SHALL corregir el fee en el sitio:
- Un fee sin uso admite cualquiera de `fixedAmount`, `percentage`, las variantes, `startDate`, `endDate` y `description`.
- `feeTypeId` y `accountId` no se editan nunca (`400 validation_error`).
- El resultado SHALL cumplir las reglas de un fee válido y no solaparse.

Responde `200` con `{ fee, successor: null }`.

#### Scenario: Corrección completa de un fee sin uso
- GIVEN un fee `Wire Fee` sin uso con `fixedAmount = "15.0000"` y vigencia NULL…NULL
- WHEN `admin` envía `{ fixedAmount: "16.5", startDate: "2026-01-01", reason: "typo" }`
- THEN recibe `200` con `fixedAmount = "16.5000"` y `startDate = "2026-01-01"`, y `FeeHistory` tiene una fila `updated` con `reason = "typo"`, `beforeJson` con 15.0000 y `afterJson` con 16.5000

#### Scenario: Campo no editable
- WHEN `admin` envía `{ feeTypeId: 2 }`
- THEN recibe `400 validation_error` y la base no cambia

#### Scenario: Cuerpo vacío
- WHEN `admin` envía `{}`
- THEN recibe `400 validation_error`

### Requirement: Corrección sin cambios
En una corrección en el sitio, un valor igual al guardado (los importes y porcentajes, comparados como decimales) SHALL no contar como cambio. Si ningún campo cambia, `PATCH /fees/{id}` SHALL responder `200` con el fee tal cual, sin escribir en `FeeHistory` ni en `AuditLog`, aunque el fee esté en uso.

#### Scenario: Mismo valor con otra escritura
- GIVEN un fee MDR en uso con `percentage = "0.100000"`
- WHEN `admin` envía `{ percentage: "0.1" }`
- THEN recibe `200` con el fee sin cambios, y no se escribe ninguna fila en `FeeHistory` ni en `AuditLog`

### Requirement: Campos editables de un fee en uso
Un fee en uso SHALL admitir en el sitio solo `description` y `endDate`. Cualquier otro campo SHALL responder `409 fee_in_use` con `details.fields`, la lista de campos rechazados. Para cambiar sus valores se usa el cambio desde una fecha.

#### Scenario: Cambiar el valor de un fee en uso
- GIVEN un fee MDR en uso
- WHEN `admin` envía `{ percentage: "0.030000" }`
- THEN recibe `409 fee_in_use` con `details.fields = ["percentage"]` y la base no cambia

#### Scenario: Descripción de un fee en uso
- GIVEN un fee en uso
- WHEN `admin` envía `{ description: "Renegotiated in 2027" }`
- THEN recibe `200` y solo cambia la descripción

### Requirement: Cerrar la vigencia de un fee
Cerrar un fee SHALL ser ponerle `endDate` con `PATCH`. La acción del historial es `closed` cuando solo cambia `endDate` y pasa de `null` a una fecha, y `updated` en otro caso. En un fee en uso, `endDate` SHALL ser ≥ `lastAppliedEventDate`; si no, `409 fee_in_use` con `details.lastAppliedEventDate`. Cerrar nunca recalcula movimientos ya procesados.

#### Scenario: Cierre en el último evento aplicado
- GIVEN un fee de `TRX Fee - Deposit` NULL…NULL con `lastAppliedEventDate = 2026-10-02`
- WHEN `admin` envía `{ endDate: "2026-10-02" }`
- THEN recibe `200` con `endDate = "2026-10-02"` y `FeeHistory` tiene una fila `closed`

#### Scenario: Cierre que dejaría fuera eventos ya aplicados
- GIVEN el mismo fee
- WHEN `admin` envía `{ endDate: "2026-10-01" }`
- THEN recibe `409 fee_in_use` con `details.lastAppliedEventDate = "2026-10-02"` y la base no cambia

### Requirement: Cambiar un fee desde una fecha
`PATCH /api/v1/fees/{feeId}` con `effectiveFrom` (`YYYY-MM-DD`) y al menos un valor nuevo (`fixedAmount`, `percentage`, variantes, `description`) SHALL hacer el cambio en una transacción:
- cierra el fee con `endDate = effectiveFrom − 1 día` (historial `closed`);
- crea un sucesor de la misma cuenta y tipo, con `startDate = effectiveFrom`, el `endDate` original y los valores del original sustituidos por los enviados (historial `created`).

Responde `200` con `{ fee, successor }`.

#### Scenario: Sucesor con el valor nuevo y el resto heredado
- GIVEN un fee MDR vigente NULL…NULL con `percentage = "0.100000"` y `lastAppliedEventDate = 2026-10-02`
- WHEN `admin` envía `{ effectiveFrom: "2026-10-03", percentage: "0.095000" }`
- THEN recibe `200` con `fee.endDate = "2026-10-02"` y un `successor` con `startDate = "2026-10-03"`, `endDate = null`, `percentage = "0.095000"`, sin uso y con el resto de la configuración del original

#### Scenario: Los movimientos procesados no cambian
- GIVEN desgloses de movimientos (`SettlementTransactionFee`) que aplicaron el fee MDR
- WHEN el fee se cambia desde una fecha posterior a su último evento
- THEN esas filas de `SettlementTransactionFee` siguen con el mismo importe y la misma configuración aplicada que antes

### Requirement: Límites del cambio desde una fecha
`effectiveFrom` SHALL ser posterior al `startDate` del fee (cualquiera si es `null`) y no posterior a su `endDate`. Si no, `400 validation_error` con `details.field = "effectiveFrom"`. `effectiveFrom − 1` SHALL ser ≥ `lastAppliedEventDate`; si no, `409 fee_in_use` con `details.lastAppliedEventDate`. Combinar `effectiveFrom` con `startDate` o `endDate`, o enviarlo sin valores nuevos, SHALL responder `400 validation_error`.

#### Scenario: Cambio con fecha anterior a eventos ya aplicados
- GIVEN un fee MDR con `lastAppliedEventDate = 2026-10-02`
- WHEN `admin` envía `{ effectiveFrom: "2026-10-02", percentage: "0.095000" }`
- THEN recibe `409 fee_in_use` con `details.lastAppliedEventDate = "2026-10-02"` y no se crea ningún fee

#### Scenario: Fecha fuera de la vigencia del fee
- GIVEN un fee `Wire Fee` con vigencia 2027-01-01…NULL
- WHEN `admin` envía `{ effectiveFrom: "2027-01-01", fixedAmount: "1.0000" }`
- THEN recibe `400 validation_error` con `details.field = "effectiveFrom"`

#### Scenario: effectiveFrom con startDate
- WHEN `admin` envía `{ effectiveFrom: "2027-01-01", startDate: "2027-01-01", fixedAmount: "1.0000" }`
- THEN recibe `400 validation_error`

### Requirement: Vista global de fees
`GET /api/v1/fees` SHALL devolver los fees de las cuentas del alcance del usuario, paginados en servidor (`page` desde 1, `pageSize` 1–500, 50 por defecto), como `{ items, page, pageSize, total }`. Cada elemento SHALL llevar los campos de `AccountFee` más `merchant`, `provider` y `account` (`{ id, name }`). Un parámetro inválido o desconocido SHALL responder `400 validation_error`.

#### Scenario: Paginación estable
- WHEN se piden dos páginas consecutivas con `pageSize = 5`
- THEN no se repite ni se pierde ningún fee entre ellas, y `total` es el mismo en las dos

#### Scenario: Tamaño de página inválido
- WHEN se pide `GET /fees?pageSize=0`
- THEN la respuesta es `400 validation_error`

### Requirement: Orden de la vista global
Los elementos de `GET /fees` SHALL ordenarse de forma estable entre páginas por:
1. nombre del merchant;
2. nombre del proveedor;
3. nombre de la cuenta;
4. título del tipo;
5. `startDate`, con `null` primero;
6. `feeId`.

Así, el front puede mostrar el grupo merchant › proveedor › cuenta como columnas sin cortar el orden.

#### Scenario: Activos de un merchant
- GIVEN el usuario `analyst`
- WHEN pide `GET /fees?merchantId=1&status=active`
- THEN recibe solo fees de cuentas del merchant 1, vigentes hoy, ordenados por proveedor, cuenta, tipo y `startDate`

### Requirement: Filtros de la vista global
`GET /fees` SHALL admitir estos filtros, combinables:
- `merchantId`, `providerId`, `accountId`;
- `kind`: `transactional`, o, entre los no transaccionales, `preset` (`allowsFreeAmount = false`) y `free_amount`;
- `status`: `active`, `scheduled` o `closed`. Sin `status` se devuelven todos;
- `q`, sin distinguir mayúsculas: nombre de la cuenta, código y título del tipo y descripción.

Un `merchantId`, `providerId` o `accountId` inexistente o fuera del alcance SHALL responder `404 not_found`.

#### Scenario: Preestablecidos por batch
- WHEN `analyst` pide `GET /fees?accountId={ProviderB-Main}&kind=preset`
- THEN recibe el `Monthly Fee` con `fixedAmount = "250.0000"` y ningún fee transaccional

#### Scenario: Alcance
- GIVEN el usuario `viewer` (merchant 1)
- WHEN pide `GET /fees` sin filtros
- THEN ningún elemento es de una cuenta del merchant 2
- AND `GET /fees?merchantId=2` responde `404 not_found`

#### Scenario: Búsqueda
- WHEN `analyst` pide `GET /fees?q=chargeback`
- THEN todos los elementos tienen "chargeback" en el nombre de la cuenta, el tipo o la descripción

### Requirement: Estado de un fee
El `status` de un fee SHALL derivarse del día de calendario de hoy en Nueva York, en este orden:
- `scheduled` si `startDate` es posterior a hoy;
- `closed` si `endDate` es anterior a hoy;
- `active` en otro caso.

#### Scenario: Programado, cerrado y activo
- GIVEN hoy es 2026-11-03 en Nueva York
- WHEN se leen tres fees con vigencias 2026-11-04…NULL, NULL…2026-11-02 y NULL…2026-11-03
- THEN sus `status` son `scheduled`, `closed` y `active`

### Requirement: Historial de un fee por API
`GET /api/v1/fees/{feeId}/history?scope=fee|type` SHALL devolver, de la más reciente a la más antigua, las filas de `FeeHistory`: las del fee (`scope=fee`, por defecto) o las de todos los fees del mismo tipo en su cuenta (`scope=type`). Cada fila lleva `feeHistoryId`, `feeId`, `action`, `changedAt`, `changedBy`, `reason`, `before` y `after`; estos dos, con la forma de la API.

#### Scenario: Cadena de un tipo
- GIVEN un MDR cambiado desde el día siguiente a su último evento aplicado (un `closed` del original y un `created` del sucesor)
- WHEN `analyst` pide `GET /fees/{sucesor}/history?scope=type`
- THEN recibe las dos filas nuevas y la `created` del seed del original, de la más reciente a la más antigua

#### Scenario: Historial del seed
- WHEN se pide el historial de un fee del seed
- THEN su fila `created` trae `after.percentage` como string decimal (por ejemplo, `"0.100000"`), no como número

#### Scenario: Alcance inválido
- WHEN se pide `GET /fees/{id}/history?scope=account`
- THEN la respuesta es `400 validation_error`

### Requirement: Auditoría de los cambios de fees
Toda escritura de fees SHALL dejar una entrada en `AuditLog` en la misma transacción que el cambio y que su fila de `FeeHistory`: `fee.create`, `fee.update`, `fee.close` o `fee.change`, con el `feeId` y, en `fee.change`, el del sucesor. Si una de las escrituras falla, el cambio no se aplica.

#### Scenario: Corrección auditada
- WHEN `admin` corrige la descripción de un fee
- THEN `AuditLog` tiene una entrada `fee.update` del usuario `admin` con ese `feeId`

#### Scenario: Cambio desde una fecha auditado
- WHEN `admin` cambia un fee desde una fecha
- THEN `AuditLog` tiene una entrada `fee.change` con el `feeId` original y el del sucesor

#### Scenario: Fallo a mitad
- WHEN la escritura de la auditoría falla durante un cambio
- THEN no queda ni el cambio del `Fee` ni su fila de `FeeHistory`

### Requirement: Solapes al administrar fees
Crear, corregir o cambiar desde una fecha un fee que se solape con otro del mismo tipo en la cuenta SHALL responder `409 fee_overlap` con `details.conflicts`, una lista de `{ feeId, startDate, endDate }`, sin cambiar la base. Dos escrituras simultáneas sobre la misma cuenta SHALL serializarse.

#### Scenario: Solapamiento al corregir
- GIVEN dos fees de `Wire Fee` sin uso, NULL…2026-12-31 y 2027-01-01…NULL
- WHEN se corrige el segundo con `startDate = 2026-12-15`
- THEN la API responde `409 fee_overlap` con el primero en `details.conflicts`

#### Scenario: Dos altas simultáneas
- WHEN dos peticiones crean a la vez un fee del mismo tipo y con vigencias solapadas en la misma cuenta
- THEN una responde `201` y la otra `409 fee_overlap`, y la cuenta queda con un solo fee de ese tipo en ese rango

### Requirement: Campos ampliados de un fee de la cuenta
Cada `AccountFee` SHALL llevar, además de sus campos previos y sin cambiarlos:
- las variantes condicionales y por marca, como texto o `null`;
- `status`, `inUse` y `lastAppliedEventDate` (`YYYY-MM-DD` o `null`);
- `createdBy` (`{ userId, userName }`), `createdAt` y `updatedAt`.

Esto vale para `GET /accounts/{id}/fees`, para la vista global (calculado solo para la página pedida) y para las respuestas de escritura.

#### Scenario: Campos ampliados
- WHEN `analyst` pide los fees de ProviderA-USD
- THEN cada fee trae `status`, `inUse`, `lastAppliedEventDate`, `createdBy.userName = "admin"`, y el `Chargeback over 1%` trae `conditionalPercentage = "0.020000"`

### Requirement: Pantalla Fees: acceso
Administration › Fees (`/fees`) SHALL exigir `fee.view`; sin él, la guarda de ruta muestra `You don't have access to this page` sin llamar a `GET /fees`. La pantalla SHALL ser de solo lectura para todos los usuarios, también para quien tiene `fee.manage`: crear, editar y cerrar se hace en la página de fees de cada cuenta.

#### Scenario: Usuario con fee.view
- **WHEN** `viewer` abre `/fees`
- **THEN** ve `Fees · all accounts` con la tabla y ningún botón para crear, editar o cerrar

#### Scenario: admin tampoco edita aquí
- **WHEN** `admin` abre `/fees`
- **THEN** no ve **Add fee**, **Edit**, **Change from date…** ni **Close…**, y cada cuenta enlaza a su página de fees

#### Scenario: Sin fee.view
- **GIVEN** un usuario sin `fee.view`
- **WHEN** escribe `/fees` en el navegador
- **THEN** ve `You don't have access to this page` y no se llama a `GET /fees`

### Requirement: Pantalla Fees: columnas y orden
Cada fila SHALL mostrar la cuenta (enlace a `/accounts/<accountId>/fees`) con su merchant y su proveedor debajo, en la misma celda, tipo, a qué aplica (ciclo y estado, o `batch · preset` / `batch · free amount`), valor (importe con 4 decimales y/o porcentaje como `2.900 %`), `Valid from` (`always` si es `null`), `Valid to` (`open` si es `null`), estado (`Active`, `Scheduled`, `Closed`) y el día del último cambio en Nueva York (quién lo hizo está en el historial: el API no lo da en la fila). Las filas SHALL seguir el orden del API, sin reordenarse ni agruparse en la pantalla.

#### Scenario: Fee abierto por los dos lados
- **GIVEN** un MDR de ProviderA-USD con `percentage = "0.029000"`, `startDate = null` y `endDate = null`
- **THEN** su fila muestra `ProviderA-USD` con `Merchant A · Provider A` debajo, `MDR`, `E · Successful`, `2.900 %`, `always`, `open` y `Active`

#### Scenario: Programado
- **GIVEN** un fee con `status = "scheduled"`
- **THEN** su fila muestra el estado `Scheduled` con su color de estado

#### Scenario: Sin cabeceras de grupo
- **GIVEN** una página cuyo primer elemento es de `Provider A` y el último de `Provider C`
- **THEN** la tabla no tiene filas de cabecera `Merchant › Provider`: merchant y proveedor van bajo la cuenta en cada fila

#### Scenario: A 1024 px
- **GIVEN** la vista global a 1024 px de ancho, con la barra lateral
- **THEN** la tabla cabe en su tarjeta sin desplazamiento: `Merchant A · Provider A` solo se parte tras el separador, el tipo puede ocupar dos líneas, y la cuenta, los importes y los días quedan en una línea

### Requirement: Pantalla Fees: filtros en la dirección
La pantalla SHALL filtrar por merchant, proveedor y cuenta (en cascada, solo los del alcance), tipo (`All kinds`, `Transactional`, `Batch preset`, `Free amount`), estado (`Active`, `Scheduled`, `Closed`, `All statuses`) y búsqueda. Sin estado en la dirección SHALL pedir `status=active`; `All statuses` SHALL pedir sin `status`. Cada filtro SHALL escribirse en la dirección y volver a la primera página; la búsqueda, con espera entre pulsaciones. Valores inválidos de la dirección SHALL descartarse.

#### Scenario: Por defecto, los activos
- **WHEN** `analyst` abre `/fees`
- **THEN** la pantalla pide `GET /fees?status=active&page=1` y el filtro de estado muestra `Active`

#### Scenario: Todos los estados
- **WHEN** elige `All statuses`
- **THEN** la dirección lleva `status=all`, se pide `GET /fees` sin `status` y se vuelve a la página 1

#### Scenario: Recargar con filtros
- **GIVEN** `/fees?merchantId=1&kind=preset&q=monthly&page=2`
- **WHEN** se recarga
- **THEN** los filtros muestran esos valores y se pide esa misma consulta

#### Scenario: Atrás y adelante con la búsqueda
- **GIVEN** la búsqueda `monthly` ya escrita en la dirección
- **WHEN** vuelve atrás y luego adelante
- **THEN** el campo de búsqueda queda vacío y luego vuelve a `monthly`, igual que la dirección, y el texto anterior no se vuelve a escribir en ella

#### Scenario: Valor inválido en la dirección
- **WHEN** se abre `/fees?status=withdrawn&kind=other`
- **THEN** se ignoran los dos valores y se piden los fees activos de todos los tipos

#### Scenario: Merchant fuera del alcance
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre `/fees?merchantId=2`
- **THEN** ve que la selección no está disponible, no ve fees del merchant 2 y puede volver a elegir

### Requirement: Pantalla Fees: paginación, carga y errores
La tabla SHALL paginarse en servidor con **Previous** / **Next**, el resumen `Page N of M · T fees` y la página en la dirección; una página posterior a la última SHALL llevar a la última sin dejarla en el historial. Mientras carga SHALL mostrar un esqueleto; sin resultados, `No fees match these filters.`; ante un error, un mensaje con **Retry**.

#### Scenario: Siguiente página
- **GIVEN** `total = 120` y `pageSize = 50`
- **WHEN** pulsa **Next**
- **THEN** la dirección lleva `page=2`, se pide `page=2` y el resumen dice `Page 2 of 3 · 120 fees`

#### Scenario: Página que ya no existe
- **WHEN** se abre `/fees?page=9` y el API dice `total = 60`
- **THEN** la dirección pasa a `page=2` sin añadir una entrada al historial

#### Scenario: Sin resultados
- **WHEN** la búsqueda no encuentra ningún fee
- **THEN** ve `No fees match these filters.`

#### Scenario: Fallo del API
- **WHEN** `GET /fees` responde `500`
- **THEN** ve el mensaje de error y **Retry** vuelve a pedir la misma página

### Requirement: Pantalla Account Fees: acceso y contenido
`/accounts/<accountId>/fees` SHALL exigir `fee.view` y mostrar el nombre de la cuenta, su merchant y proveedor, y todos sus fees (activos, programados y cerrados) con las columnas de la vista global salvo merchant, proveedor y cuenta, más el uso (`In use` o nada). Se llega desde el enlace de la cuenta en `/fees` y desde el enlace **Fees** de cada cuenta en Administration › Accounts. Una cuenta inexistente o fuera del alcance SHALL mostrar `This account is not available.`

#### Scenario: Desde Accounts
- **GIVEN** `viewer` en Administration › Accounts con Provider A elegido
- **WHEN** pulsa **Fees** en la fila de ProviderA-USD
- **THEN** llega a `/accounts/<ProviderA-USD>/fees` y ve `Fees · ProviderA-USD` con sus fees

#### Scenario: Desde la vista global
- **WHEN** pulsa `ProviderA-USD` en una fila de `/fees`
- **THEN** llega a la página de fees de esa cuenta

#### Scenario: Cuenta de otro merchant
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre la página de fees de ProviderC-Alt (merchant 2) o de un uuid inexistente
- **THEN** ve `This account is not available.` en los dos casos

#### Scenario: Cerrado
- **GIVEN** un fee con `status = "closed"` y `endDate = "2025-12-31"`
- **THEN** su fila muestra `Closed` y `2025-12-31`, y no ofrece **Close…**

### Requirement: Pantalla Account Fees: acciones según permiso y uso
Las acciones SHALL ofrecerse solo a quien tiene `fee.manage`: **Add fee** en la cabecera y, por fila, **Edit** (completo si `inUse = false`; limitado a descripción y fecha de fin si `inUse = true`), **Change from date…** solo si `inUse = true`, y **Close…** si el fee no está cerrado y su `endDate` es `null`. **History** SHALL ofrecerse a todos. No SHALL existir acción para retirar o borrar un fee.

#### Scenario: Sin fee.manage
- **WHEN** `analyst` abre la página de fees de ProviderA-USD
- **THEN** ve la tabla y **History** en cada fila, y no ve **Add fee**, **Edit**, **Change from date…** ni **Close…**

#### Scenario: Fee sin uso
- **GIVEN** `admin` y un fee con `inUse = false` y `endDate = null`
- **THEN** su fila ofrece **Edit**, **Close…** y **History**, y no **Change from date…**

#### Scenario: Fee en uso
- **GIVEN** `admin` y un fee con `inUse = true` y `endDate = null`
- **THEN** su fila ofrece **Edit**, **Change from date…**, **Close…** y **History**

#### Scenario: Sin retirar
- **GIVEN** `admin` y un fee programado sin uso
- **THEN** ninguna acción lo retira o lo borra: se corrige con **Edit**

### Requirement: Pantalla Account Fees: alta
**Add fee** SHALL abrir un formulario con tipo (los de `GET /fee-types`), importe fijo, porcentaje (en tanto por ciento), `Valid from` con la casilla `always (no start date)`, `Valid to` con `no end date` y descripción (hasta 100 caracteres). SHALL exigir al menos importe o porcentaje antes de enviar. El porcentaje SHALL enviarse como fracción en texto (`2.75` → `"0.027500"`) y el importe con hasta 4 decimales, nunca como número JSON. Al crearse, la lista SHALL mostrar el fee nuevo.

#### Scenario: Alta válida
- **GIVEN** `admin` en la página de fees de ProviderA-USD
- **WHEN** crea `Wire Fee` con importe `15`, `always` y `no end date`
- **THEN** se envía `POST /accounts/<ProviderA-USD>/fees` con `{ feeTypeId: 121, fixedAmount: "15", startDate: null, endDate: null }`, el formulario se cierra y la lista muestra el `Wire Fee` con `15.0000`

#### Scenario: Porcentaje
- **WHEN** crea un MDR con porcentaje `2.75` desde `2027-01-01`
- **THEN** el cuerpo lleva `percentage: "0.027500"` y `startDate: "2027-01-01"`, y la fila sale `Scheduled` con `2.750 %`

#### Scenario: Ni importe ni porcentaje
- **WHEN** intenta guardar sin importe ni porcentaje
- **THEN** ve `Enter a fixed amount, a percentage or both.` junto a los dos campos y no se envía nada

#### Scenario: Doble clic
- **WHEN** pulsa **Save fee** dos veces seguidas
- **THEN** se envía un solo `POST`

### Requirement: Pantalla Account Fees: corrección en el sitio
**Edit** SHALL abrir el formulario con los valores del fee. Sin uso, todos los campos menos el tipo son editables. En uso, solo descripción y `Valid to`, con la explicación `This fee has been applied to settlements: change its values from a date instead.` SHALL enviar `PATCH /fees/{id}` con solo los campos cambiados y el motivo opcional.

#### Scenario: Corrección de un fee sin uso
- **GIVEN** un MDR sin uso al `2.500 %`
- **WHEN** `admin` lo cambia a `2.75` con motivo `typo`
- **THEN** se envía `PATCH` con `{ percentage: "0.027500", reason: "typo" }` y la fila muestra `2.750 %`

#### Scenario: Fee en uso
- **GIVEN** un fee con `inUse = true`
- **WHEN** `admin` pulsa **Edit**
- **THEN** importe, porcentaje y `Valid from` se ven pero no se pueden editar, y la explicación está asociada al formulario

#### Scenario: Sin cambios
- **WHEN** abre **Edit** y guarda sin cambiar nada
- **THEN** ve `Nothing to save.` y no se envía nada

### Requirement: Pantalla Account Fees: cambio desde una fecha
**Change from date…** SHALL pedir `Effective from` y los valores nuevos (importe, porcentaje, descripción; prellenados con los actuales) y enviar `PATCH /fees/{id}` con `effectiveFrom` y solo los valores cambiados. SHALL explicar que el fee actual termina el día anterior y que los settlements ya procesados no cambian. Al aplicarse, la lista SHALL mostrar el fee cerrado y su sucesor.

#### Scenario: Cambio aplicado
- **GIVEN** un MDR en uso al `10.000 %`, `NULL…NULL`, con `lastAppliedEventDate = "2026-10-15"`
- **WHEN** `admin` lo cambia a `9.5` desde `2026-11-01`
- **THEN** se envía `{ effectiveFrom: "2026-11-01", percentage: "0.095000" }` y la lista muestra el MDR hasta `2026-10-31` y el nuevo desde `2026-11-01` al `9.500 %`

#### Scenario: Sin valores nuevos
- **WHEN** elige la fecha sin cambiar ningún valor
- **THEN** ve `Change at least one value.` y no se envía nada

### Requirement: Pantalla Account Fees: cierre de la vigencia
**Close…** SHALL pedir `Valid to`, por defecto el día de hoy en Nueva York, y un motivo opcional, y enviar `PATCH /fees/{id}` con `endDate`. Si el fee tiene `lastAppliedEventDate`, SHALL mostrarlo como fecha mínima (`Applied up to <fecha>: the end date cannot be earlier.`) y no SHALL dejar enviar una fecha anterior. Si el valor por defecto es anterior a ese mínimo, el campo SHALL empezar en el mínimo. El límite final lo pone el API.

#### Scenario: Valor por defecto
- **GIVEN** hoy es 2026-11-03 en Nueva York y son las 22:30 (ya 2026-11-04 en UTC)
- **WHEN** `admin` abre **Close…** de un fee sin uso
- **THEN** `Valid to` vale `2026-11-03`

#### Scenario: Cierre válido
- **GIVEN** un fee de Chargeback con `lastAppliedEventDate = "2026-10-15"`
- **WHEN** lo cierra el `2026-10-31`
- **THEN** se envía `{ endDate: "2026-10-31" }` y la fila muestra `2026-10-31`

#### Scenario: Antes del último evento aplicado
- **GIVEN** el mismo fee
- **WHEN** escribe `2026-10-01`
- **THEN** ve el mensaje del mínimo, **Close fee** está deshabilitado con el motivo asociado y no se envía nada

### Requirement: Pantalla Account Fees: errores del API
Un `400 validation_error` con `details.field` SHALL mostrarse junto a ese campo. `409 fee_overlap` SHALL listar los conflictos de `details.conflicts` con su vigencia. `409 fee_in_use` SHALL mostrar `details.fields` o `details.lastAppliedEventDate` y volver a pedir los fees de la cuenta. Ante cualquier error, también `403` o red, el formulario SHALL seguir abierto con lo escrito.

#### Scenario: Solape
- **GIVEN** un MDR vigente `2026-01-01…open` en la cuenta
- **WHEN** `admin` crea otro MDR desde `2026-11-01` y el API responde `409 fee_overlap` con ese conflicto
- **THEN** ve `Overlaps another MDR fee:` con `2026-01-01 → open`, y el formulario sigue abierto con sus valores

#### Scenario: Campo rechazado por el dominio
- **WHEN** el API responde `400 validation_error` con `details.field = "endDate"`
- **THEN** el mensaje sale junto a `Valid to`

#### Scenario: El fee pasó a estar en uso
- **GIVEN** un fee que la pantalla ve sin uso
- **WHEN** `admin` corrige su porcentaje y el API responde `409 fee_in_use` con `details.fields = ["percentage"]`
- **THEN** ve que ese campo ya no se puede editar porque el fee se ha aplicado, y la lista se vuelve a pedir y lo muestra `In use`

### Requirement: Pantalla Account Fees: historial
**History** SHALL abrir un panel lateral con el historial de la cadena del tipo en la cuenta (`GET /fees/{id}/history?scope=type`), del cambio más reciente al más antiguo: acción (`Created`, `Updated`, `Closed`, `Copied`), fecha y hora en Nueva York con `ET`, usuario, motivo si lo hay y lo que cambió entre `before` y `after`. Tras una escritura, el historial abierto SHALL actualizarse.

#### Scenario: Cadena tras un cambio desde una fecha
- **GIVEN** un MDR cambiado desde `2026-11-01`
- **WHEN** `analyst` abre **History** del sucesor
- **THEN** ve `Created` del sucesor, `Closed` del original con `Valid to: open → 2026-10-31` y la `Created` del seed, en ese orden

#### Scenario: Corrección con motivo
- **GIVEN** una fila `updated` con `reason = "typo"` y el porcentaje de `0.025000` a `0.027500`
- **THEN** el panel muestra `Updated`, `typo` y `Percentage: 2.500 % → 2.750 %`

#### Scenario: Teclado
- **WHEN** cierra el panel con Escape
- **THEN** el foco vuelve al botón **History** que lo abrió

### Requirement: Pantalla Account Fees: foco tras escribir y ante un error local
Cuando el API acepta un alta, una corrección, un cambio desde una fecha o un cierre, el foco SHALL ir al botón **History** de ese fee, aunque su fila haya cambiado de nombre o de sitio; si el fee ya no está en la lista, al título de la tabla. Si la validación local rechaza el formulario, el foco SHALL ir al primer campo con error, en el orden en que se muestran.

#### Scenario: Tras una corrección o un cierre
- **WHEN** `admin` guarda una corrección o cierra un fee
- **THEN** el foco queda en **History** de ese fee

#### Scenario: La fila cambia de nombre
- **WHEN** la corrección le da `Valid from = 2027-01-01` a un MDR que era `always`
- **THEN** el foco queda en `History of MDR from 2027-01-01`

#### Scenario: Error local
- **WHEN** `admin` pulsa **Save fee** en un alta sin tipo
- **THEN** el foco queda en `Fee type`; si luego elige el tipo y escribe `2,5` como porcentaje, queda en `Percentage (%)`
