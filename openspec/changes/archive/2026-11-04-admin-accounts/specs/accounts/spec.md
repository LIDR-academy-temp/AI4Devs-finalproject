# Delta — accounts

## ADDED Requirements

### Requirement: Crear una cuenta
`POST /api/v1/providers/{id}/accounts` SHALL crear una cuenta activa en el proveedor con `name` (sin espacios de borde, 1–50 caracteres), `chargebackReservePolicy`, `rollingReserveCapAmt` opcional (string decimal `≥ 0` o `null`), `matchingRuleSetId` opcional y `copyFeesFromAccountId` opcional, con `createdBy` el usuario de la petición. SHALL responder `201` con el detalle de la cuenta.

#### Scenario: Cuenta mínima
- **GIVEN** `admin`
- **WHEN** envía `{ name: "  bruno-min  ", chargebackReservePolicy: "hold_until_term" }` a `POST /api/v1/providers/201/accounts`
- **THEN** recibe `201` con `name = "bruno-min"`, `providerId = 201`, `isActive = true`, `rollingReserveCapAmt = null`, `matchingRuleSetId = null`, `createdBy.userName = "admin"` y `merchant.merchantId = 2`
- **AND** `GET /api/v1/accounts/{id}/fees` de la cuenta nueva responde una lista vacía y `GET /api/v1/accounts/{id}/channels` también

#### Scenario: Tope de reserva normalizado
- **WHEN** `admin` crea una cuenta con `rollingReserveCapAmt = "25000"`
- **THEN** la respuesta trae `rollingReserveCapAmt = "25000.0000"`, como string

#### Scenario: Tope negativo
- **WHEN** `admin` crea una cuenta con `rollingReserveCapAmt = "-1"`
- **THEN** recibe `400` con `code = "validation_error"` y `details.field = "rollingReserveCapAmt"`, y no se crea nada

#### Scenario: Nombre vacío o demasiado largo
- **WHEN** `admin` crea una cuenta con `name = "   "` o con un nombre de 51 caracteres
- **THEN** recibe `400` con `code = "validation_error"` y no se crea nada

#### Scenario: Política desconocida
- **WHEN** `admin` crea una cuenta con `chargebackReservePolicy = "keep"`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Nombre de cuenta único en todo el sistema
El nombre de una cuenta SHALL ser único entre todas las cuentas de todos los proveedores y merchants, sin distinguir mayúsculas, abiertas o cerradas. Crear o renombrar con un nombre en uso SHALL responder `409 account_name_taken` sin escribir nada.

#### Scenario: Nombre de otra cuenta del mismo proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `name = "providerc-usd"`
- **THEN** recibe `409` con `code = "account_name_taken"`

#### Scenario: Nombre de una cuenta de otro proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 201 con `name = "ProviderA-USD"` (proveedor 101)
- **THEN** recibe `409` con `code = "account_name_taken"`

#### Scenario: Renombrar a un nombre en uso
- **WHEN** `admin` envía `{ name: "ProviderC-Alt" }` a `PATCH /api/v1/accounts/{id}` de una cuenta `bruno-` del proveedor 201
- **THEN** recibe `409` con `code = "account_name_taken"` y la cuenta conserva su nombre

#### Scenario: Dos altas simultáneas con el mismo nombre
- **WHEN** dos peticiones crean a la vez una cuenta con el mismo nombre nuevo
- **THEN** una recibe `201` y la otra `409 account_name_taken`, y existe una sola cuenta con ese nombre

### Requirement: Conjunto de reglas de una cuenta
`matchingRuleSetId`, al crear o al editar, SHALL ser un conjunto activo del mismo proveedor que la cuenta, o `null` (solo reglas globales). Un conjunto inexistente, inactivo o de otro proveedor SHALL responder `400 validation_error` con `details.field = "matchingRuleSetId"`. El cambio SHALL aplicar desde el siguiente import, sin tocar imports ya creados.

#### Scenario: Cuenta enlazada al conjunto del proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 201 con el `ruleSetId` de "Provider C legacy"
- **THEN** recibe `201` con ese `matchingRuleSetId`

#### Scenario: Conjunto de otro proveedor
- **WHEN** `admin` crea una cuenta en el proveedor 101 con el `ruleSetId` de "Provider C legacy" (proveedor 201)
- **THEN** recibe `400` con `code = "validation_error"` y `details.field = "matchingRuleSetId"`

#### Scenario: Conjunto inexistente
- **WHEN** `admin` envía `{ matchingRuleSetId: 999999 }` a `PATCH /api/v1/accounts/{id}`
- **THEN** recibe `400` con `details.field = "matchingRuleSetId"` y la cuenta no cambia

#### Scenario: Desenlazar
- **GIVEN** una cuenta `bruno-` enlazada a "Provider C legacy"
- **WHEN** `admin` envía `{ matchingRuleSetId: null }`
- **THEN** recibe `200` con `matchingRuleSetId = null`, y un import creado después propone el pareo solo con las reglas globales

### Requirement: Editar una cuenta
`PATCH /api/v1/accounts/{id}` SHALL admitir cualquier subconjunto de `name`, `chargebackReservePolicy`, `rollingReserveCapAmt` (`null` quita el tope), `matchingRuleSetId` e `isActive`, más `reason` opcional (1–500 caracteres), con las mismas reglas que al crear. SHALL responder `200` con el detalle actualizado. `providerId` no SHALL ser editable.

#### Scenario: Cambiar política y tope
- **GIVEN** una cuenta `bruno-` con `hold_until_term` y sin tope
- **WHEN** `admin` envía `{ chargebackReservePolicy: "release_on_chargeback", rollingReserveCapAmt: "1000" }`
- **THEN** recibe `200` con `release_on_chargeback`, `rollingReserveCapAmt = "1000.0000"` y `updatedAt` posterior al anterior

#### Scenario: Renombrar
- **WHEN** `admin` renombra una cuenta `bruno-x` a `bruno-y`
- **THEN** recibe `200` con `name = "bruno-y"`, y la auditoría guarda `name: { before: "bruno-x", after: "bruno-y" }`

#### Scenario: Campo no editable o desconocido
- **WHEN** `admin` envía `{ providerId: 101 }` o `{ color: "red" }`
- **THEN** recibe `400` con `code = "validation_error"` y la cuenta no cambia

#### Scenario: Cuerpo sin campos
- **WHEN** `admin` envía `{}` o solo `{ reason: "x" }`
- **THEN** recibe `400` con `code = "validation_error"`

#### Scenario: Cuerpo que no cambia nada
- **WHEN** `admin` envía los mismos valores que ya tiene la cuenta
- **THEN** recibe `200` con la cuenta, y no se escribe ninguna entrada en `AuditLog` ni cambia `updatedAt`

### Requirement: Cerrar y reabrir una cuenta
Con `isActive = false` la cuenta SHALL quedar cerrada; con `isActive = true`, reabierta. Una cuenta nunca SHALL borrarse. Cerrarla no SHALL cambiar sus fees, sus imports, sus batches ni sus filas de `AccountChannel` (tampoco `isPrimary`).

#### Scenario: Cerrar
- **GIVEN** una cuenta `bruno-` con un canal asociado como principal en una base de prueba
- **WHEN** `admin` envía `{ isActive: false, reason: "provider stopped" }`
- **THEN** recibe `200` con `isActive = false`; la cuenta sigue en `GET /api/v1/providers/201/accounts` con `isActive = false` y el canal conserva `isPrimary = true` en ella

#### Scenario: Reabrir
- **GIVEN** una cuenta `bruno-` cerrada
- **WHEN** `admin` envía `{ isActive: true }`
- **THEN** recibe `200` con `isActive = true` y admite imports nuevos otra vez

### Requirement: Escrituras de cuentas: permiso y alcance
Crear y editar cuentas SHALL exigir un access token (`401 unauthorized`) y el permiso `account.manage` (`403 forbidden`, comprobado antes que el alcance); solo el rol `admin` lo tiene. Un proveedor o una cuenta inexistentes o fuera del alcance SHALL responder `404 not_found` con el mismo cuerpo. La validación del esquema PUEDE responder `400` antes que el permiso (#72).

#### Scenario: Sin token
- **WHEN** se llama a `POST /api/v1/providers/201/accounts` sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Analyst sin account.manage
- **GIVEN** `analyst`, que tiene el proveedor 201 en su alcance
- **WHEN** crea una cuenta en el proveedor 201 o edita `ProviderC-USD`
- **THEN** recibe `403` con `code = "forbidden"` y no se escribe nada

#### Scenario: Viewer fuera del alcance recibe 403 antes que 404
- **GIVEN** `viewer` (merchant 1, sin `account.manage`)
- **WHEN** edita `ProviderC-USD` (merchant 2)
- **THEN** recibe `403` con `code = "forbidden"`

#### Scenario: Proveedor inexistente
- **WHEN** `admin` crea una cuenta en el proveedor 999
- **THEN** recibe `404` con `code = "not_found"`

#### Scenario: Cuenta inexistente
- **WHEN** `admin` edita el `accountId` `00000000-0000-4000-8000-00000000ffff`
- **THEN** recibe `404` con `code = "not_found"`

### Requirement: Auditoría de cuentas
Cada escritura de una cuenta SHALL dejar una entrada en `AuditLog` (`entityType = Account`, `entityId` = el `accountId`) en la misma transacción: `account.create` al crear (con los valores iniciales y los pares de fees copiados), y al editar `account.close` o `account.reopen` si cambia `isActive`, o `account.update` si no. El detalle de la edición SHALL llevar `changes` con `before` y `after` de cada campo cambiado y el `reason` si lo hay.

#### Scenario: Alta auditada
- **WHEN** `admin` crea una cuenta sin copiar fees
- **THEN** `AuditLog` tiene una entrada `account.create` de `admin` para la cuenta, con `name`, `providerId`, `chargebackReservePolicy`, `rollingReserveCapAmt`, `matchingRuleSetId`, `copyFeesFromAccountId = null` y `copiedFees = []`

#### Scenario: Cierre auditado con cambios
- **WHEN** `admin` envía `{ isActive: false, rollingReserveCapAmt: null, reason: "closing" }` a una cuenta con tope `"1000.0000"`
- **THEN** se escribe una sola entrada `account.close` con `changes.isActive = { before: true, after: false }`, `changes.rollingReserveCapAmt = { before: "1000.0000", after: null }` y `reason = "closing"`

#### Scenario: Escritura que falla no deja auditoría
- **WHEN** una creación termina en `409 account_name_taken` o en `400`
- **THEN** no queda ninguna entrada `account.*` ni ninguna cuenta, fee o fila de `FeeHistory` nueva

### Requirement: Canales de solo lectura
La aplicación SHALL no ofrecer ninguna operación para asociar, desasociar ni cambiar la cuenta principal de un canal: las filas de `AccountChannel` solo SHALL crearse y moverse al procesar un settlement (requisito "Canal nuevo y cuenta principal"). Crear, editar, cerrar o reabrir una cuenta no SHALL tocar `AccountChannel`.

#### Scenario: Cuenta nueva sin canales
- **WHEN** `admin` crea una cuenta en el proveedor 101
- **THEN** `GET /api/v1/accounts/{id}/channels` de la cuenta nueva responde `[]` y `GET /api/v1/channels?unassigned=true` sigue devolviendo `RAM-07` y `RAM-13`

## MODIFIED Requirements

### Requirement: Cuenta
Una cuenta SHALL pertenecer a un proveedor, tener nombre único en todo el sistema (sin distinguir mayúsculas), `chargebackReservePolicy`, tope de reserva opcional y conjunto de reglas opcional; se cierra (`isActive = 0`), no se borra. Las cuentas cuyo nombre empieza por `bruno-` son las que crea la colección Bruno; los escenarios sobre las cuentas del seed SHALL ignorarlas.

#### Scenario: Las cinco cuentas del seed
- **WHEN** `admin` consulta las cuentas de los proveedores 101, 102 y 201, sin contar las de prefijo `bruno-`
- **THEN** obtiene `ProviderA-USD` y `ProviderA-EUR` (101), `ProviderB-Main` (102), `ProviderC-USD` y `ProviderC-Alt` (201), con nombres distintos entre sí y todas `isActive = true`

#### Scenario: Tope y conjunto de reglas opcionales
- **WHEN** se consulta el detalle de `ProviderA-USD`
- **THEN** `rollingReserveCapAmt = null` y `matchingRuleSetId = null`; en `ProviderA-EUR` el tope es `"50000.0000"` y en `ProviderC-Alt` el conjunto es "Provider C legacy"

#### Scenario: Cuentas de la colección presentes
- **GIVEN** una base en la que la colección Bruno creó cuentas `bruno-` en el proveedor 201
- **WHEN** se ejecutan los tests de integración del catálogo
- **THEN** pasan igual que sobre una base recién sembrada

### Requirement: Detalle de cuenta
`GET /api/v1/accounts/{id}` SHALL responder `200` con los campos de la cuenta más `provider` (`{ providerId, merchantId, name, isActive }`), `merchant` (`{ merchantId, name }`), `createdBy` (`{ userId, userName }`) y `updatedAt`. Un `accountId` que no sea UUID SHALL responder `400 validation_error`; una cuenta inexistente o de un merchant fuera del alcance, `404` con el mismo cuerpo.

#### Scenario: Cuenta con tope de reserva
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderA-EUR`
- **THEN** recibe `200` con `chargebackReservePolicy = "hold_until_term"`, `rollingReserveCapAmt = "50000.0000"` (string, nunca número), `matchingRuleSetId = null`, `provider.providerId = 101` y `merchant.merchantId = 1`

#### Scenario: Cuenta enlazada a un conjunto de reglas
- **WHEN** `admin` llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderC-Alt`
- **THEN** `matchingRuleSetId` es el `ruleSetId` del conjunto "Provider C legacy" y `rollingReserveCapAmt = null`

#### Scenario: Identificador mal formado
- **WHEN** se llama a `GET /api/v1/accounts/not-a-uuid`
- **THEN** recibe `400` con `code = "validation_error"`

#### Scenario: Quién creó la cuenta
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderA-USD`
- **THEN** recibe `createdBy.userName = "admin"` y `updatedAt` como instante ISO 8601

### Requirement: Canales sin cuenta (not assigned yet)
`GET /api/v1/channels` SHALL responder `200` con los canales de los proveedores del alcance. Con `unassigned=true` SHALL devolver solo los canales que tienen al menos una transacción y ninguna fila en `AccountChannel`; sin el parámetro (o `unassigned=false`) SHALL devolver todos los del alcance. Cada fila usa la forma de canal del detalle de proveedor más `primaryAccount` (`{ accountId, name }` de su cuenta principal, o `null` si no tiene o es de un merchant fuera del alcance); orden por `channelId`.

#### Scenario: Los dos canales nuevos del seed
- **WHEN** `admin` llama a `GET /api/v1/channels?unassigned=true`
- **THEN** recibe exactamente `RAM-07` (1007, `providerId = 101`) y `RAM-13` (1013, `providerId = 102`), y ningún otro, ambos con `primaryAccount = null`

#### Scenario: Canales sin cuenta dentro del alcance
- **GIVEN** un usuario cuyo alcance no incluye el merchant 1
- **WHEN** llama a `GET /api/v1/channels?unassigned=true`
- **THEN** recibe `200` con una lista vacía

#### Scenario: Todos los canales visibles
- **WHEN** `viewer` llama a `GET /api/v1/channels`
- **THEN** recibe los 7 canales de los proveedores 101 y 102 y ninguno del proveedor 201; `admin` recibe los 9

#### Scenario: Cuenta principal de cada canal
- **WHEN** `viewer` llama a `GET /api/v1/channels`
- **THEN** `RAM-01` trae `primaryAccount.name = "ProviderA-USD"`, `RAM-03` trae `primaryAccount.name = "ProviderA-EUR"` y `RAM-07` trae `primaryAccount = null`

#### Scenario: Principal de otro merchant oculta
- **GIVEN** un canal visible cuya fila principal de `AccountChannel` es de una cuenta de un merchant fuera del alcance del usuario
- **WHEN** el usuario llama a `GET /api/v1/channels`
- **THEN** ese canal trae `primaryAccount = null`

### Requirement: Canales de una cuenta
`GET /api/v1/accounts/{id}/channels` SHALL responder `200` con cada fila de `AccountChannel` de la cuenta: los datos del canal, `isPrimary`, `assignedAt`, `assignedInBatchId`, `assignedInBatchNo` (el `batchNo` de ese batch, o `null`) y `primaryAccount` (`{ accountId, name }` de la cuenta principal actual del canal, o `null` si ninguna lo es). Cuenta inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Canales principales de ProviderA-USD
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}/channels` con el `accountId` de `ProviderA-USD`
- **THEN** recibe `RAM-01` y `RAM-02`, ambos con `isPrimary = true`, `primaryAccount.name = "ProviderA-USD"`, `assignedInBatchId` igual al `batchId` del último batch pagado de la cuenta y `assignedInBatchNo` igual a su `batchNo`

#### Scenario: Canal con historial en dos cuentas
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en `ProviderA-EUR` con `isPrimary = false`
- **WHEN** `admin` llama a `GET /api/v1/accounts/{id}/channels` de `ProviderA-EUR`
- **THEN** `RAM-01` aparece con `isPrimary = false` y `primaryAccount.name = "ProviderA-USD"`, y `RAM-03` con `isPrimary = true` y `primaryAccount.name = "ProviderA-EUR"`

#### Scenario: Cuenta fuera del alcance
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}/channels` con el `accountId` de `ProviderC-USD`
- **THEN** recibe `404` con `code = "not_found"`

#### Scenario: Asociación sin batch
- **GIVEN** una fila `AccountChannel` con `assignedInBatchId = null`
- **WHEN** se listan los canales de su cuenta
- **THEN** la fila trae `assignedInBatchNo = null`

### Requirement: Cuentas de un canal
`GET /api/v1/channels/{id}/accounts` SHALL responder `200` con las cuentas asociadas al canal (`{ accountId, name, providerId, isActive, isPrimary, assignedAt, assignedInBatchId, assignedInBatchNo }`), a lo sumo una con `isPrimary = true`, y lista vacía si el canal no tiene ninguna. Canal inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Canal con una cuenta principal y una histórica
- **GIVEN** la fila `AccountChannel` adicional de `RAM-01` en `ProviderA-EUR` con `isPrimary = false`
- **WHEN** `admin` llama a `GET /api/v1/channels/1001/accounts`
- **THEN** recibe `ProviderA-USD` con `isPrimary = true` y `ProviderA-EUR` con `isPrimary = false`, y ninguna más

#### Scenario: Canal sin cuenta asociada
- **WHEN** `admin` llama a `GET /api/v1/channels/1007/accounts`
- **THEN** recibe `200` con una lista vacía

#### Scenario: Canal fuera del alcance
- **WHEN** `viewer` llama a `GET /api/v1/channels/2001/accounts`
- **THEN** recibe `404` con `code = "not_found"`

#### Scenario: Número de batch de la asociación
- **WHEN** `admin` llama a `GET /api/v1/channels/1001/accounts`
- **THEN** la fila de `ProviderA-USD` trae `assignedInBatchNo` igual al `batchNo` del batch `assignedInBatchId`
