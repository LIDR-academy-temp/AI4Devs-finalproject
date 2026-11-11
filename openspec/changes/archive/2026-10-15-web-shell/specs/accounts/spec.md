## ADDED Requirements

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
