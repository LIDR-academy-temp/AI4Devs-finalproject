# accounts

## Purpose
Jerarquía de solo lectura que llega de los gateways (Gateway → Merchant → Provider → Channel), cuentas, canales asociados y cuenta principal, con el alcance por merchant aplicado a cada consulta. README §1.2 y §3.2 "Catálogo" (Gateway, Merchant, Provider, Channel, Account, AccountChannel), §4.4 filas Catálogo.

## Requirements

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

### Requirement: Canal nuevo y cuenta principal
Al analizar un import, los canales con filas que no estén en `AccountChannel` SHALL avisarse como "not assigned yet" o "principal en otra cuenta". Al procesar, SHALL asociarse a la cuenta y esta SHALL pasar a ser la principal del canal (una sola principal por canal; índice `UX_AccountChannel_primary`). Deshacer un batch no revierte la cuenta principal.

#### Scenario: RAM-07 en el batch limpio
- WHEN se procesa `data/samples/batch-clean`
- THEN RAM-07 queda asociado a ProviderA-USD como principal

### Requirement: Alcance por merchant
Toda consulta de merchants, proveedores, canales, cuentas, imports y batches SHALL filtrarse por los merchants del usuario: con `merchantScope = "assigned"`, los de `UserMerchant` (ninguno si no tiene asignaciones); con `"all"`, todos. Un recurso cuyo merchant no esté en el alcance SHALL responder `404` con `code = "not_found"`, nunca `403`, con el mismo cuerpo que un recurso inexistente, para no revelar su existencia.

#### Scenario: Un solo merchant asignado
- **GIVEN** el usuario `viewer` (merchant 1)
- **WHEN** llama a `GET /api/v1/merchants`
- **THEN** recibe solo `{ merchantId: 1, name: "Merchant A" }`

#### Scenario: Cuenta de otro merchant responde 404
- **GIVEN** el usuario `viewer`
- **WHEN** llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderC-USD` (merchant 2)
- **THEN** recibe `404` con `code = "not_found"`, byte a byte igual que para un UUID que no existe, y nunca `403`

#### Scenario: Usuario sin merchants asignados
- **GIVEN** un usuario con `merchantScope = "assigned"` y ninguna fila en `UserMerchant`
- **WHEN** llama a `GET /api/v1/merchants` y a `GET /api/v1/channels`
- **THEN** recibe `200` con listas vacías en ambos casos, nunca el catálogo completo

### Requirement: Jerarquía visible de merchants y proveedores
`GET /api/v1/merchants` SHALL responder `200` con los merchants del alcance del usuario (`{ merchantId, name, isActive }`, ordenados por `merchantId`), incluidos los inactivos con su marca. `GET /api/v1/merchants/{id}/providers` SHALL responder los proveedores de ese merchant (`{ providerId, merchantId, name, isActive }`, ordenados por `providerId`), o `404` si el merchant no existe o no está en el alcance.

#### Scenario: Alcance total
- **GIVEN** el usuario sembrado `admin` (`merchantScope = "all"`)
- **WHEN** llama a `GET /api/v1/merchants`
- **THEN** recibe `200` con exactamente `[{ merchantId: 1, name: "Merchant A" }, { merchantId: 2, name: "Merchant B" }]`, ambos `isActive = true`

#### Scenario: Proveedores de un merchant visible
- **GIVEN** el usuario `viewer` (merchant 1 asignado)
- **WHEN** llama a `GET /api/v1/merchants/1/providers`
- **THEN** recibe `200` con `Provider A` (101) y `Provider B` (102), en ese orden, ambos con `merchantId = 1`

#### Scenario: Proveedores de un merchant fuera del alcance
- **GIVEN** el usuario `viewer`
- **WHEN** llama a `GET /api/v1/merchants/2/providers`
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo que para `GET /api/v1/merchants/999/providers`

### Requirement: Detalle de proveedor
`GET /api/v1/providers/{id}` SHALL responder `200` con el proveedor (`providerId`, `merchantId`, `name`, `isActive`), su `merchant` (`{ merchantId, name }`), sus `accounts` (ordenadas por nombre, con la forma de "Cuentas de un proveedor") y sus `channels` (con la forma de "Canales de un proveedor"). Proveedor inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Provider A con sus cuentas y canales
- **GIVEN** el usuario `analyst` (merchants 1 y 2)
- **WHEN** llama a `GET /api/v1/providers/101`
- **THEN** recibe `200` con `name = "Provider A"`, `merchant = { merchantId: 1, name: "Merchant A" }`, `accounts` con los nombres `ProviderA-EUR` y `ProviderA-USD`, y `channels` con `RAM-01`, `RAM-02`, `RAM-03` y `RAM-07` (1001, 1002, 1003, 1007), todos con `gatewayId = 1`, `settlementTermDays = 14`, `rollingReservePct = "0.100000"` y `rollingReserveDays = 180`

#### Scenario: Proveedor fuera del alcance
- **GIVEN** el usuario `viewer`
- **WHEN** llama a `GET /api/v1/providers/201`
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo que para `GET /api/v1/providers/999`

### Requirement: Canales de un proveedor
`GET /api/v1/providers/{id}/channels` SHALL responder `200` con los canales del proveedor ordenados por `channelId`, cada uno con `channelId`, `gatewayId`, `providerId`, `name`, `isActive`, `settlementTermDays`, `rollingReservePct` (string decimal de seis decimales) y `rollingReserveDays`. Proveedor inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Parámetros distintos por canal
- **WHEN** `admin` llama a `GET /api/v1/providers/102/channels`
- **THEN** recibe `RAM-11`, `RAM-12` y `RAM-13`, con `settlementTermDays = 10` los tres y `RAM-13` con `rollingReservePct = "0.050000"` y `rollingReserveDays = 120`

#### Scenario: Canal sin reserva
- **WHEN** `admin` llama a `GET /api/v1/providers/201/channels`
- **THEN** `RAM-U1` (2001) tiene `gatewayId = 2`, `settlementTermDays = 7`, `rollingReservePct = "0.000000"` y `rollingReserveDays = 0`

#### Scenario: Canales de un proveedor fuera del alcance
- **GIVEN** el usuario `viewer`
- **WHEN** llama a `GET /api/v1/providers/201/channels`
- **THEN** recibe `404` con `code = "not_found"`

### Requirement: Cuentas de un proveedor
`GET /api/v1/providers/{id}/accounts` SHALL responder `200` con las cuentas del proveedor ordenadas por nombre, cada una con `accountId` (UUID), `providerId`, `name`, `chargebackReservePolicy`, `rollingReserveCapAmt` (string decimal de cuatro decimales o `null`), `matchingRuleSetId` (entero o `null`), `isActive` y `createdAt`; incluidas las cerradas (`isActive = false`). Proveedor inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Cuentas de Provider C
- **WHEN** `admin` llama a `GET /api/v1/providers/201/accounts`
- **THEN** recibe `ProviderC-Alt` y `ProviderC-USD`, en ese orden, ambas con `providerId = 201` y `chargebackReservePolicy = "hold_until_term"`

#### Scenario: Política de liberación por chargeback
- **WHEN** `viewer` llama a `GET /api/v1/providers/102/accounts`
- **THEN** recibe solo `ProviderB-Main`, con `chargebackReservePolicy = "release_on_chargeback"` y `rollingReserveCapAmt = null`

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

### Requirement: Lecturas de catálogo autenticadas sin permiso específico
Todas las rutas de lectura del catálogo SHALL exigir un access token válido (`401 unauthorized` sin él) y SHALL no exigir ningún `permissionCode`: cualquier rol autenticado, incluido `viewer`, puede leerlas dentro de su alcance (README §4.4, columna Permiso vacía).

#### Scenario: Sin token
- **WHEN** se llama a `GET /api/v1/merchants` sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Rol sin permisos de gestión
- **GIVEN** el usuario `viewer` (permisos `fee.view`, `reports.view`)
- **WHEN** llama a `GET /api/v1/providers/101/accounts`
- **THEN** recibe `200`, no `403`

### Requirement: Pantalla Accounts: selección merchant → proveedor
La pantalla Accounts (Administration › Accounts) SHALL ofrecer los merchants visibles para el usuario y, elegido uno, sus proveedores. Si el usuario ve un solo merchant, o el merchant tiene un solo proveedor, SHALL preseleccionarse. La selección SHALL reflejarse en la dirección (`merchantId`, `providerId`) para que recargar o compartir el enlace muestre lo mismo.

#### Scenario: Un solo merchant visible
- **GIVEN** el usuario `viewer` (merchant 1)
- **WHEN** abre Accounts
- **THEN** el selector de merchant ofrece solo `Merchant A`, ya seleccionado, y el de proveedor ofrece `Provider A` y `Provider B`

#### Scenario: Varios merchants visibles
- **GIVEN** el usuario `analyst` (merchants 1 y 2)
- **WHEN** abre Accounts y elige `Merchant B`
- **THEN** el selector de proveedor ofrece solo `Provider C`, ya seleccionado, y se muestran sus cuentas

#### Scenario: Enlace directo
- **GIVEN** el usuario `admin`
- **WHEN** abre `/accounts?merchantId=1&providerId=102`
- **THEN** ve seleccionados `Merchant A` y `Provider B` y las cuentas de Provider B

#### Scenario: Proveedor fuera del alcance en el enlace
- **GIVEN** el usuario `viewer`
- **WHEN** abre `/accounts?merchantId=2&providerId=201`
- **THEN** ve el mensaje `This merchant or provider is not available.` y ningún dato de Provider C, y puede elegir entre sus merchants visibles

### Requirement: Pantalla Accounts: cuentas del proveedor
Con un proveedor elegido, la pantalla SHALL listar sus cuentas ordenadas por nombre con nombre, política de reserva ante chargeback, tope de reserva y estado (`active` / `closed`). El nombre SHALL enlazar a la ficha de la cuenta (Account Detail). El tope SHALL mostrarse a partir del string decimal del API, sin convertirlo a número, y `none` cuando es `null`. Un proveedor sin cuentas SHALL mostrar un estado vacío. Quien tiene `account.manage` SHALL ver **New account**.

#### Scenario: Cuentas de Provider A
- **GIVEN** el usuario `viewer`
- **WHEN** elige `Provider A`
- **THEN** ve `ProviderA-EUR` y `ProviderA-USD`, en ese orden, ambas `active` y con `hold_until_term`
- **AND** el tope de `ProviderA-EUR` se muestra `50,000.0000` y el de `ProviderA-USD` `none`

#### Scenario: Política de liberación
- **WHEN** `viewer` elige `Provider B`
- **THEN** ve solo `ProviderB-Main` con `release_on_chargeback`

#### Scenario: Proveedor sin cuentas
- **GIVEN** un proveedor visible sin cuentas
- **WHEN** se elige
- **THEN** ve `This provider has no accounts yet.` en lugar de la tabla

#### Scenario: Enlace a la ficha
- **WHEN** `viewer` pulsa `ProviderA-USD` en la lista de Provider A
- **THEN** llega a `/accounts/<ProviderA-USD>` con la pestaña Overview

#### Scenario: New account solo con account.manage
- **WHEN** `admin` abre Accounts con Provider C elegido
- **THEN** ve **New account**; `analyst` y `viewer` no lo ven

### Requirement: Pantalla Accounts: canales de cada cuenta y cuenta principal
Cada cuenta de la lista SHALL mostrar sus canales asociados, distinguiendo los que tienen la cuenta como principal (`primary`) de los históricos; un canal histórico SHALL indicar cuál es su cuenta principal actual, o que no tiene ninguna. Una cuenta sin canales SHALL indicarlo (`No channels yet`).

#### Scenario: Canales principales de Provider A
- **GIVEN** el usuario `viewer`
- **WHEN** elige `Provider A`
- **THEN** `ProviderA-USD` muestra `RAM-01` y `RAM-02` como `primary`, y `ProviderA-EUR` muestra `RAM-03` como `primary`

#### Scenario: Canal histórico
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en `ProviderA-EUR` con `isPrimary = false`
- **WHEN** `admin` elige `Provider A`
- **THEN** `ProviderA-EUR` muestra `RAM-01` como histórico con `primary in ProviderA-USD`, además de `RAM-03` como `primary`

### Requirement: Pantalla Accounts: aviso de canales sin asignar
Con un proveedor elegido, si alguno de sus canales tiene transacciones y ninguna cuenta (*not assigned yet*, según `GET /channels?unassigned=true`), la pantalla SHALL mostrar un aviso de advertencia no bloqueante (ámbar) que nombre esos canales y explique que se asociarán a la cuenta que procese su primer settlement. Sin canales en esa situación SHALL no mostrarse aviso.

#### Scenario: RAM-07 en Provider A
- **GIVEN** el seed
- **WHEN** `viewer` elige `Provider A`
- **THEN** ve el aviso con `RAM-07` como canal not assigned yet, y no aparece `RAM-13`

#### Scenario: RAM-13 en Provider B
- **WHEN** `viewer` elige `Provider B`
- **THEN** ve el aviso con `RAM-13`, y no aparece `RAM-07`

#### Scenario: Proveedor sin canales pendientes
- **WHEN** `admin` elige `Provider C`
- **THEN** no se muestra ningún aviso de canales sin asignar

### Requirement: Pantalla Accounts: carga y errores
Mientras cargan los datos la pantalla SHALL indicar que está cargando sin mostrar datos de otro proveedor. Si una consulta falla (que no sea por sesión expirada) SHALL mostrar `Could not load accounts.` con la acción **Retry**, que vuelve a pedir los datos.

#### Scenario: Error del servidor y reintento
- **GIVEN** que `GET /providers/101` responde `500` una vez y después `200`
- **WHEN** `viewer` elige `Provider A` y pulsa **Retry** tras ver el error
- **THEN** ve las cuentas de Provider A

#### Scenario: Cambio de proveedor
- **WHEN** `viewer` pasa de `Provider A` a `Provider B` y la respuesta de Provider B aún no ha llegado
- **THEN** no se muestran las cuentas ni el aviso de Provider A como si fueran de Provider B

### Requirement: Pantalla Accounts: enlace a los settlements de cada cuenta
Cada cuenta de la lista, activa o cerrada, SHALL ofrecer un enlace a su Settlement List (`/settlements` con su merchant, su proveedor y la cuenta en la dirección), con nombre accesible `Settlements of <cuenta>`, para todos los roles que ven la pantalla.

#### Scenario: Desde Provider A
- **GIVEN** el usuario `viewer`
- **WHEN** elige `Provider A` y pulsa `Settlements of ProviderA-USD`
- **THEN** llega a Settlement List con Merchant A, Provider A y ProviderA-USD elegidos y ve sus settlements

#### Scenario: Cuenta cerrada
- **GIVEN** una cuenta `closed` del proveedor elegido
- **THEN** su fila también ofrece el enlace a sus settlements

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

### Requirement: Pantalla Account Detail: acceso y cabecera
`/accounts/<accountId>` SHALL mostrarse a todos los roles con la cuenta en su alcance. La cabecera SHALL mostrar el nombre de la cuenta como título, su estado (`active` / `closed`), merchant y proveedor, y un enlace **Settlements** a su Settlement List. Una cuenta inexistente, fuera del alcance o con un identificador mal formado SHALL mostrar `This account is not available.` sin datos de la cuenta.

#### Scenario: Ficha de ProviderA-USD
- **GIVEN** `viewer`
- **WHEN** abre `/accounts/<ProviderA-USD>`
- **THEN** ve el título `ProviderA-USD`, `active`, `Merchant A › Provider A` y **Settlements**, que lleva a `/settlements` con Merchant A, Provider A y ProviderA-USD elegidos

#### Scenario: Cuenta de otro merchant
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre la ficha de ProviderC-Alt (merchant 2), la de un uuid inexistente o `/accounts/not-a-uuid`
- **THEN** ve `This account is not available.` en los tres casos

#### Scenario: Migas
- **WHEN** `viewer` abre la ficha de una cuenta
- **THEN** ve `Dashboard › Administration › Accounts › Account detail`, con Dashboard como enlace

### Requirement: Pantalla Account Detail: acciones de la cabecera
La cabecera SHALL ofrecer **Edit** y **Close…** (cuenta abierta) o **Reopen…** (cuenta cerrada) solo a quien tiene `account.manage`, y **New reconciliation** solo a quien tiene `settlement.process` y solo si la cuenta está abierta; este último SHALL llevar a New Reconciliation con merchant, proveedor y cuenta elegidos.

#### Scenario: admin en una cuenta abierta
- **WHEN** `admin` abre la ficha de ProviderA-USD
- **THEN** ve **Edit**, **Close…** y **New reconciliation**, y no **Reopen…**

#### Scenario: analyst
- **WHEN** `analyst` abre la ficha de ProviderA-USD
- **THEN** ve **New reconciliation**, que lleva a `/reconciliations/new` con Merchant A, Provider A y ProviderA-USD elegidos, y no ve **Edit**, **Close…** ni **Reopen…**

#### Scenario: viewer
- **WHEN** `viewer` abre la ficha de ProviderA-USD
- **THEN** no ve ninguna de las cuatro acciones

#### Scenario: Cuenta cerrada
- **GIVEN** una cuenta cerrada del alcance de `admin`
- **WHEN** `admin` abre su ficha
- **THEN** ve `closed`, **Edit** y **Reopen…**, y no **Close…** ni **New reconciliation**

### Requirement: Pantalla Account Detail: pestañas
La ficha SHALL tener dos pestañas, cada una con su dirección: **Overview** (`/accounts/<accountId>`) y **Fees** (`/accounts/<accountId>/fees`, solo con `fee.view`). Recargar o compartir la dirección SHALL mostrar la misma pestaña. Las pestañas SHALL ser enlaces de una navegación (`Account sections`), sin roles `tab`/`tablist`/`tabpanel`, y la actual SHALL marcarse con `aria-current="page"`. No SHALL haber pestañas de reglas de pareo, settlements ni actividad.

#### Scenario: Cambiar de pestaña
- **GIVEN** `viewer` en la Overview de ProviderA-USD
- **WHEN** pulsa la pestaña **Fees**
- **THEN** la dirección pasa a `/accounts/<ProviderA-USD>/fees`, la pestaña Fees queda seleccionada y la cabecera de la cuenta sigue visible

#### Scenario: Enlace directo a la pestaña
- **WHEN** `viewer` abre `/accounts/<ProviderA-USD>/fees`
- **THEN** ve la ficha de ProviderA-USD con la pestaña Fees seleccionada

### Requirement: Pantalla Account Detail: Overview
La pestaña Overview SHALL mostrar:
- la política de reserva ante chargeback;
- el tope: `none` si es `null`, a partir del string decimal sin convertirlo a número;
- el conjunto de reglas de pareo por su nombre, como enlace a su detalle en Matching Rules. Si no tiene conjunto, `None · global rules` como enlace a las reglas globales;
- la fecha de creación y quién la creó;
- la última modificación en hora de Nueva York.

No SHALL haber pestaña de reglas: el conjunto es del proveedor.

#### Scenario: Cuenta con tope
- **WHEN** `viewer` abre la Overview de ProviderA-EUR
- **THEN** ve `hold_until_term`, el tope `50,000.0000`, `None · global rules`, la creación con `by admin` y la fecha de `createdAt` en hora de Nueva York, y la última modificación de `updatedAt`
- **AND** `None · global rules` enlaza a `/matching-rules/global`

#### Scenario: Cuenta enlazada a un conjunto
- **WHEN** `admin` abre la Overview de ProviderC-Alt
- **THEN** ve `Provider C legacy` como reglas de pareo, con enlace a `/matching-rules/3`, y el tope `none`

#### Scenario: Sin pestaña de reglas
- **WHEN** `admin` abre la ficha de ProviderC-Alt
- **THEN** las pestañas son solo Overview y Fees

### Requirement: Pantalla Account Detail: canales
La Overview SHALL listar los canales de la cuenta con su gateway (`Gateway <id>`), su papel en la cuenta (`primary`, o `historical` con la cuenta principal actual del canal o `no primary`), el batch de la asociación (`batch <n>`, o `—` si no la creó ningún batch), y term y reserva (`14 d · 10 % / 180 d`). Una cuenta sin canales SHALL decirlo. SHALL explicar que los canales no se asignan a mano.

#### Scenario: Canales principales
- **WHEN** `viewer` abre la Overview de ProviderA-USD
- **THEN** ve `RAM-01` y `RAM-02` como `primary`, cada uno con `Gateway 1`, `batch <assignedInBatchNo>` y `14 d · 10 % / 180 d`

#### Scenario: Canal histórico
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en ProviderA-EUR con `isPrimary = false`
- **WHEN** `admin` abre la Overview de ProviderA-EUR
- **THEN** ve `RAM-01` como `historical · primary in ProviderA-USD` y `RAM-03` como `primary`

#### Scenario: Asociación sin batch
- **GIVEN** un canal de la cuenta con `assignedInBatchNo = null`
- **THEN** su fila muestra `—` en la columna del batch

#### Scenario: Cuenta sin canales
- **GIVEN** una cuenta recién creada
- **WHEN** se abre su Overview
- **THEN** ve `No channels yet. Channels join an account with the first processed settlement that includes them.`

### Requirement: Pantalla Account Detail: carga y errores
Mientras carga, la ficha SHALL indicar que está cargando sin mostrar datos de otra cuenta. Si una consulta falla (que no sea por sesión expirada ni `404`) SHALL mostrar `Could not load the account.` con **Retry**, que vuelve a pedir solo lo que falló.

#### Scenario: Error y reintento
- **GIVEN** que `GET /accounts/{id}/channels` responde `500` una vez y después `200`
- **WHEN** `viewer` abre la ficha de ProviderA-USD y pulsa **Retry**
- **THEN** ve los canales de ProviderA-USD

#### Scenario: Conjunto de reglas no disponible
- **GIVEN** que `GET /providers/{id}/matching-rule-sets` falla
- **WHEN** `admin` abre la Overview de ProviderC-Alt
- **THEN** ve el resto de la cuenta y, en lugar del nombre del conjunto, `Rule set 3` sin bloquear la pantalla

### Requirement: Pantalla New account: formulario
Quien tiene `account.manage` SHALL ver **New account** en Accounts, que abre un diálogo con nombre, merchant, proveedor (preseleccionados con los de la página), política de reserva ante chargeback (`hold_until_term` por defecto), tope opcional, fees y reglas de pareo. **Create account** SHALL enviar `POST /providers/{id}/accounts` una sola vez aunque se pulse dos veces y, con `201`, llevar a la ficha de la cuenta nueva. El texto de ayuda SHALL decir `Name must be unique`.

#### Scenario: Sin account.manage
- **WHEN** `analyst` o `viewer` abren Accounts
- **THEN** no ven **New account**

#### Scenario: Cuenta mínima
- **GIVEN** `admin` en Accounts con Merchant B y Provider C elegidos
- **WHEN** abre **New account**, escribe `ProviderC-New` y pulsa **Create account**
- **THEN** se envía `{ name: "ProviderC-New", chargebackReservePolicy: "hold_until_term", rollingReserveCapAmt: null, matchingRuleSetId: null, copyFeesFromAccountId: null }` a `POST /providers/201/accounts` y llega a la ficha de `ProviderC-New`

#### Scenario: Tope como texto
- **WHEN** `admin` escribe `25000.5` como tope y crea la cuenta
- **THEN** el cuerpo lleva `rollingReserveCapAmt = "25000.5"` como string

#### Scenario: Validación local
- **WHEN** `admin` pulsa **Create account** con el nombre vacío, de 51 caracteres, o con el tope `-1` o `1.23456`
- **THEN** ve el error junto a ese campo, el foco va al primer campo con error y no se envía nada

#### Scenario: Cancelar
- **WHEN** `admin` cierra el diálogo con **Cancel** o Escape
- **THEN** no se envía nada y el foco vuelve a **New account**

### Requirement: Pantalla New account: fees y reglas de pareo
El campo Fees SHALL ofrecer `No fees` (por defecto) y las cuentas del proveedor elegido, abiertas y cerradas (`(closed)`); explicará que se copian solo los fees activos, con vigencia abierta. El campo Matching rules SHALL ofrecer `None · global rules` (por defecto) y los conjuntos activos del proveedor. Cambiar de proveedor SHALL volver los dos campos a su valor por defecto.

#### Scenario: Copiar fees y enlazar conjunto en Provider C
- **GIVEN** `admin` en el diálogo con Provider C
- **WHEN** elige `ProviderC-USD` en Fees y `Provider C legacy` en Matching rules y crea la cuenta
- **THEN** el cuerpo lleva `copyFeesFromAccountId` = el `accountId` de ProviderC-USD y `matchingRuleSetId` = el `ruleSetId` de Provider C legacy

#### Scenario: Proveedor sin conjuntos
- **WHEN** `admin` elige Provider A en el diálogo
- **THEN** Matching rules solo ofrece `None · global rules`, y Fees ofrece `No fees`, `ProviderA-EUR` y `ProviderA-USD`

#### Scenario: Cambio de proveedor
- **GIVEN** `admin` con `ProviderC-USD` elegida en Fees
- **WHEN** cambia a Merchant A y Provider A
- **THEN** Fees vuelve a `No fees` y Matching rules a `None · global rules`

### Requirement: Pantalla Edit account
**Edit** SHALL abrir un panel lateral con nombre, política de reserva, tope, reglas de pareo (conjuntos activos del proveedor, más el actual aunque esté inactivo) y un motivo opcional (hasta 500 caracteres). **Save** SHALL enviar a `PATCH /accounts/{id}` solo los campos cambiados (el tope se compara como texto decimal normalizado) y el motivo si se escribió; sin cambios SHALL mostrar `Nothing to save.` sin enviar nada. Con `200`, el panel se cierra y la ficha muestra la respuesta.

#### Scenario: Cambiar política y tope
- **GIVEN** `admin` en la ficha de ProviderA-USD
- **WHEN** abre **Edit**, elige `release_on_chargeback`, escribe `1000` como tope y guarda
- **THEN** se envía `{ chargebackReservePolicy: "release_on_chargeback", rollingReserveCapAmt: "1000" }` y la Overview muestra `release_on_chargeback` y `1,000.0000`

#### Scenario: Mismo tope con otra escala
- **GIVEN** ProviderA-EUR con tope `50000.0000`
- **WHEN** `admin` escribe `50000` en el tope y guarda sin tocar nada más
- **THEN** ve `Nothing to save.` y no se envía nada

#### Scenario: Desenlazar el conjunto
- **GIVEN** ProviderC-Alt enlazada a Provider C legacy y sin tope
- **WHEN** `admin` elige `None · global rules` y guarda
- **THEN** se envía solo `{ matchingRuleSetId: null }` y la Overview muestra `None · global rules`

#### Scenario: Quitar el tope
- **GIVEN** ProviderA-EUR con tope `50000.0000`
- **WHEN** `admin` vacía el tope y guarda
- **THEN** se envía solo `{ rollingReserveCapAmt: null }` y la Overview muestra `none`

#### Scenario: Renombrar con motivo
- **WHEN** `admin` cambia el nombre de una cuenta a `ProviderA-USD2` con el motivo `typo` y guarda
- **THEN** se envía `{ name: "ProviderA-USD2", reason: "typo" }` y el título de la ficha pasa a `ProviderA-USD2`

### Requirement: Pantalla Close / Reopen de una cuenta
**Close…** y **Reopen…** SHALL pedir confirmación con un motivo opcional (hasta 500 caracteres) y explicar la consecuencia: una cuenta cerrada no admite imports nuevos, lo que ya estaba abierto sigue su curso y sus canales conservan su cuenta principal. Confirmar SHALL enviar `PATCH /accounts/{id}` con `isActive` y el motivo si lo hay, una sola vez; mientras la petición está en curso el diálogo no se cierra.

#### Scenario: Cerrar
- **GIVEN** `admin` en la ficha de ProviderA-USD
- **WHEN** pulsa **Close…**, escribe `provider stopped` y confirma
- **THEN** se envía `{ isActive: false, reason: "provider stopped" }`, la cabecera muestra `closed` y **Reopen…**, y desaparece **New reconciliation**

#### Scenario: Reabrir sin motivo
- **GIVEN** una cuenta cerrada
- **WHEN** `admin` pulsa **Reopen…** y confirma sin motivo
- **THEN** se envía `{ isActive: true }` y la cabecera muestra `active`

#### Scenario: Cancelar
- **WHEN** `admin` cancela el diálogo
- **THEN** no se envía nada y el foco vuelve a la acción

### Requirement: Formularios de cuenta: errores del API
Ante un error del API, el diálogo o el panel SHALL seguir abiertos con todo lo escrito. `409 account_name_taken` SHALL mostrarse en el campo Name; `400 validation_error` con `details.field` junto a ese campo; el resto (`400` sin campo, `403`, `404`, `5xx`, red) como mensaje del formulario, distinguiendo un `5xx` de un fallo de red. El foco SHALL ir al campo con error o al mensaje, también si el mensaje se repite.

#### Scenario: Nombre en uso
- **GIVEN** que `POST /providers/201/accounts` responde `409 account_name_taken`
- **WHEN** `admin` crea `ProviderA-USD` en Provider C
- **THEN** el campo Name muestra `This name is already used by another account. Name must be unique.`, el diálogo sigue abierto con los valores escritos y el foco en Name

#### Scenario: Conjunto ya no válido
- **GIVEN** que `PATCH /accounts/{id}` responde `400 validation_error` con `details.field = "matchingRuleSetId"`
- **WHEN** `admin` guarda el panel Edit
- **THEN** Matching rules muestra `This rule set is no longer available for this provider.` y el panel conserva lo escrito

#### Scenario: Cuenta origen de fees no válida
- **GIVEN** que `POST /providers/{id}/accounts` responde `400` con `details.field = "copyFeesFromAccountId"`
- **WHEN** `admin` crea la cuenta
- **THEN** el campo Fees muestra `Fees cannot be copied from this account.`

#### Scenario: Sin permiso, error del servidor o sin red
- **GIVEN** que la escritura responde `403` o `500`, o la red falla
- **WHEN** `admin` envía el formulario
- **THEN** ve el mensaje del formulario (`You don't have permission to manage accounts.`, `The account could not be saved. Try again.` o `Could not reach the server. Try again.`), con el foco en él, y lo escrito se conserva

#### Scenario: El mismo mensaje otra vez
- **GIVEN** que la escritura responde `403` en dos envíos seguidos
- **WHEN** `admin` mueve el foco a un campo y vuelve a enviar
- **THEN** el mensaje del formulario recupera el foco

### Requirement: Pantalla Channel Assignment: acceso y filtros
Administration › Channel Assignment (`/channel-assignment`) SHALL mostrarse a todos los roles, ser de solo lectura y ofrecer filtros opcionales de merchant (`All merchants`) y proveedor (`All providers`, del merchant elegido) reflejados en la dirección. Un merchant o proveedor fuera del alcance en la dirección SHALL mostrar `This merchant or provider is not available.` sin datos. SHALL explicar que la asignación ocurre al procesar settlements y que deshacer un batch no mueve la principal.

#### Scenario: viewer sin filtros
- **WHEN** `viewer` abre Channel Assignment
- **THEN** ve los canales de Provider A y Provider B, ninguno de Provider C, y ninguna acción para asignar o mover canales

#### Scenario: Filtro por proveedor
- **WHEN** `admin` elige Merchant A y Provider B
- **THEN** la dirección lleva `merchantId=1&providerId=102` y solo se ven `RAM-11`, `RAM-12` y `RAM-13`

#### Scenario: Proveedor fuera del alcance
- **WHEN** `viewer` abre `/channel-assignment?merchantId=2&providerId=201`
- **THEN** ve `This merchant or provider is not available.`

### Requirement: Pantalla Channel Assignment: canales sin asignar
La sección **Not assigned yet** SHALL listar los canales con transacciones y sin cuenta, con su gateway (`Gateway <id>`), merchant y proveedor, y term y reserva. Sin ninguno SHALL decir `Every channel with transactions has an account.`

#### Scenario: Canales nuevos del seed
- **WHEN** `viewer` abre Channel Assignment
- **THEN** **Not assigned yet (2)** lista `RAM-07` (`Merchant A › Provider A`) y `RAM-13` (`Merchant A › Provider B`)

#### Scenario: Sin canales sin asignar
- **WHEN** `admin` filtra por Provider C
- **THEN** ve `Every channel with transactions has an account.` en esa sección

### Requirement: Pantalla Channel Assignment: cuenta principal por canal
La sección **Primary account per channel** SHALL listar los demás canales visibles con su proveedor, su cuenta principal (enlace a su ficha, o `—` si no tiene o no es visible), desde qué batch lo es (`batch <n>`, o `—`) y sus cuentas históricas (o `—`).

#### Scenario: Principales de Provider A
- **WHEN** `viewer` filtra por Provider A
- **THEN** ve `RAM-01` y `RAM-02` con `ProviderA-USD` y `RAM-03` con `ProviderA-EUR`, cada uno con `batch <assignedInBatchNo>` y sin históricas, y `RAM-07` no aparece en esta sección

#### Scenario: Canal con histórica
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en ProviderA-EUR con `isPrimary = false`
- **WHEN** `admin` abre Channel Assignment
- **THEN** `RAM-01` muestra `ProviderA-USD` como principal y `ProviderA-EUR` como histórica

#### Scenario: Ir a la cuenta
- **WHEN** `viewer` pulsa `ProviderA-EUR` en la fila de `RAM-03`
- **THEN** llega a la ficha de ProviderA-EUR

### Requirement: Pantalla Channel Assignment: carga y errores
Mientras carga, la pantalla SHALL indicar que está cargando. Si una consulta falla (que no sea por sesión expirada) SHALL mostrar `Could not load channels.` con **Retry**, que vuelve a pedir solo lo que falló.

#### Scenario: Error y reintento
- **GIVEN** que `GET /channels` responde `500` una vez y después `200`
- **WHEN** `viewer` abre Channel Assignment y pulsa **Retry**
- **THEN** ve las dos secciones con sus canales
