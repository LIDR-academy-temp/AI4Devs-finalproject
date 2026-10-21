# Spec Delta — accounts

## ADDED Requirements

### Requirement: Pantalla Accounts: enlace a los settlements de cada cuenta
Cada cuenta de la lista, activa o cerrada, SHALL ofrecer un enlace a su Settlement List (`/settlements` con su merchant, su proveedor y la cuenta en la dirección), con nombre accesible `Settlements of <cuenta>`, para todos los roles que ven la pantalla.

#### Scenario: Desde Provider A
- **GIVEN** el usuario `viewer`
- **WHEN** elige `Provider A` y pulsa `Settlements of ProviderA-USD`
- **THEN** llega a Settlement List con Merchant A, Provider A y ProviderA-USD elegidos y ve sus settlements

#### Scenario: Cuenta cerrada
- **GIVEN** una cuenta `closed` del proveedor elegido
- **THEN** su fila también ofrece el enlace a sus settlements
