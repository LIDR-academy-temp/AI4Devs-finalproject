# Delta — fees

## MODIFIED Requirements

### Requirement: Pantalla Account Fees: acceso y contenido
`/accounts/<accountId>/fees` SHALL ser la pestaña **Fees** de la ficha de la cuenta, SHALL exigir `fee.view` y SHALL mostrar, bajo la cabecera de la cuenta, todos sus fees (activos, programados y cerrados) con las columnas de la vista global salvo merchant, proveedor y cuenta, más el uso (`In use` o nada), y el enlace `See all accounts`. Una cuenta inexistente o fuera del alcance SHALL mostrar `This account is not available.`

#### Scenario: Desde Accounts
- **GIVEN** `viewer` en Administration › Accounts con Provider A elegido
- **WHEN** pulsa **Fees** en la fila de ProviderA-USD
- **THEN** llega a `/accounts/<ProviderA-USD>/fees` y ve la ficha de ProviderA-USD con la pestaña Fees seleccionada y sus fees

#### Scenario: Desde la vista global
- **WHEN** pulsa `ProviderA-USD` en una fila de `/fees`
- **THEN** llega a la pestaña Fees de la ficha de esa cuenta

#### Scenario: Cuenta de otro merchant
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre la pestaña Fees de ProviderC-Alt (merchant 2) o de un uuid inexistente
- **THEN** ve `This account is not available.` en los dos casos

#### Scenario: Cerrado
- **GIVEN** un fee con `status = "closed"` y `endDate = "2025-12-31"`
- **THEN** su fila muestra `Closed` y `2025-12-31`, y no ofrece **Close…**

#### Scenario: Ver todas las cuentas
- **WHEN** `viewer` pulsa `See all accounts` en la pestaña Fees de ProviderA-USD
- **THEN** llega a `/fees` con Merchant A, Provider A, ProviderA-USD y el estado `all` elegidos

### Requirement: Pantalla Account Fees: acciones según permiso y uso
Las acciones SHALL ofrecerse solo a quien tiene `fee.manage`: **Add fee** en la pestaña Fees, junto al título de la tabla, y, por fila, **Edit** (completo si `inUse = false`; limitado a descripción y fecha de fin si `inUse = true`), **Change from date…** solo si `inUse = true`, y **Close…** si el fee no está cerrado y su `endDate` es `null`. **History** SHALL ofrecerse a todos. No SHALL existir acción para retirar o borrar un fee.

#### Scenario: Sin fee.manage
- **WHEN** `analyst` abre la pestaña Fees de ProviderA-USD
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

#### Scenario: Add fee en la pestaña
- **WHEN** `admin` abre la pestaña Fees de ProviderA-USD
- **THEN** ve **Add fee** dentro de la pestaña, y la cabecera de la cuenta no lo repite
