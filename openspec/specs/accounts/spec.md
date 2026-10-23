# accounts

## Purpose
Jerarquía de solo lectura que llega de los gateways (Gateway → Merchant → Provider → Channel), cuentas, canales asociados y cuenta principal, con el alcance por merchant aplicado a cada consulta. README §1.2 y §3.2 "Catálogo" (Gateway, Merchant, Provider, Channel, Account, AccountChannel), §4.4 filas Catálogo.

## Requirements

### Requirement: Cuenta
Una cuenta SHALL pertenecer a un proveedor, tener nombre único, `chargebackReservePolicy`, tope de reserva opcional y conjunto de reglas opcional; se cierra (`isActive = 0`), no se borra.

#### Scenario: Las cinco cuentas del seed
- **WHEN** `admin` consulta las cuentas de los proveedores 101, 102 y 201
- **THEN** obtiene `ProviderA-USD` y `ProviderA-EUR` (101), `ProviderB-Main` (102), `ProviderC-USD` y `ProviderC-Alt` (201), con nombres distintos entre sí y todas `isActive = true`

#### Scenario: Tope y conjunto de reglas opcionales
- **WHEN** se consulta el detalle de `ProviderA-USD`
- **THEN** `rollingReserveCapAmt = null` y `matchingRuleSetId = null`; en `ProviderA-EUR` el tope es `"50000.0000"` y en `ProviderC-Alt` el conjunto es "Provider C legacy"

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
`GET /api/v1/accounts/{id}` SHALL responder `200` con los campos de la cuenta más `provider` (`{ providerId, merchantId, name, isActive }`) y `merchant` (`{ merchantId, name }`). Un `accountId` que no sea UUID SHALL responder `400 validation_error`; una cuenta inexistente o de un merchant fuera del alcance, `404` con el mismo cuerpo.

#### Scenario: Cuenta con tope de reserva
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderA-EUR`
- **THEN** recibe `200` con `chargebackReservePolicy = "hold_until_term"`, `rollingReserveCapAmt = "50000.0000"` (string, nunca número), `matchingRuleSetId = null`, `provider.providerId = 101` y `merchant.merchantId = 1`

#### Scenario: Cuenta enlazada a un conjunto de reglas
- **WHEN** `admin` llama a `GET /api/v1/accounts/{id}` con el `accountId` de `ProviderC-Alt`
- **THEN** `matchingRuleSetId` es el `ruleSetId` del conjunto "Provider C legacy" y `rollingReserveCapAmt = null`

#### Scenario: Identificador mal formado
- **WHEN** se llama a `GET /api/v1/accounts/not-a-uuid`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Canales sin cuenta (not assigned yet)
`GET /api/v1/channels` SHALL responder `200` con los canales de los proveedores del alcance. Con `unassigned=true` SHALL devolver solo los canales que tienen al menos una transacción y ninguna fila en `AccountChannel`; sin el parámetro (o `unassigned=false`) SHALL devolver todos los del alcance. Cada fila usa la forma de canal del detalle de proveedor; orden por `channelId`.

#### Scenario: Los dos canales nuevos del seed
- **WHEN** `admin` llama a `GET /api/v1/channels?unassigned=true`
- **THEN** recibe exactamente `RAM-07` (1007, `providerId = 101`) y `RAM-13` (1013, `providerId = 102`), y ningún otro

#### Scenario: Canales sin cuenta dentro del alcance
- **GIVEN** un usuario cuyo alcance no incluye el merchant 1
- **WHEN** llama a `GET /api/v1/channels?unassigned=true`
- **THEN** recibe `200` con una lista vacía

#### Scenario: Todos los canales visibles
- **WHEN** `viewer` llama a `GET /api/v1/channels`
- **THEN** recibe los 7 canales de los proveedores 101 y 102 y ninguno del proveedor 201; `admin` recibe los 9

### Requirement: Canales de una cuenta
`GET /api/v1/accounts/{id}/channels` SHALL responder `200` con cada fila de `AccountChannel` de la cuenta: los datos del canal, `isPrimary`, `assignedAt`, `assignedInBatchId` y `primaryAccount` (`{ accountId, name }` de la cuenta principal actual del canal, o `null` si ninguna lo es). Cuenta inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Canales principales de ProviderA-USD
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}/channels` con el `accountId` de `ProviderA-USD`
- **THEN** recibe `RAM-01` y `RAM-02`, ambos con `isPrimary = true`, `primaryAccount.name = "ProviderA-USD"` y `assignedInBatchId` igual al `batchId` del último batch pagado de la cuenta

#### Scenario: Canal con historial en dos cuentas
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en `ProviderA-EUR` con `isPrimary = false`
- **WHEN** `admin` llama a `GET /api/v1/accounts/{id}/channels` de `ProviderA-EUR`
- **THEN** `RAM-01` aparece con `isPrimary = false` y `primaryAccount.name = "ProviderA-USD"`, y `RAM-03` con `isPrimary = true` y `primaryAccount.name = "ProviderA-EUR"`

#### Scenario: Cuenta fuera del alcance
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}/channels` con el `accountId` de `ProviderC-USD`
- **THEN** recibe `404` con `code = "not_found"`

### Requirement: Cuentas de un canal
`GET /api/v1/channels/{id}/accounts` SHALL responder `200` con las cuentas asociadas al canal (`{ accountId, name, providerId, isActive, isPrimary, assignedAt, assignedInBatchId }`), a lo sumo una con `isPrimary = true`, y lista vacía si el canal no tiene ninguna. Canal inexistente o fuera del alcance SHALL responder `404`.

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
Con un proveedor elegido, la pantalla SHALL listar sus cuentas ordenadas por nombre con nombre, política de reserva ante chargeback, tope de reserva y estado (`active` / `closed`). El tope SHALL mostrarse a partir del string decimal del API, sin convertirlo a número, y `none` cuando es `null`. Un proveedor sin cuentas SHALL mostrar un estado vacío.

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
