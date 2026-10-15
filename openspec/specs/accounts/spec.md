# accounts

## Purpose
Jerarquía de solo lectura que llega de los gateways (Gateway → Merchant → Provider → Channel), cuentas, canales asociados y cuenta principal, con el alcance por merchant aplicado a cada consulta. README §1.2 y §3.2 "Catálogo" (Gateway, Merchant, Provider, Channel, Account, AccountChannel), §4.4 filas Catálogo.

## Requirements

### Requirement: Cuenta
Una cuenta SHALL pertenecer a un proveedor, tener nombre único, `chargebackReservePolicy`, tope de reserva opcional y conjunto de reglas opcional; se cierra (`isActive = 0`), no se borra.

### Requirement: Canal nuevo y cuenta principal
Al analizar un import, los canales con filas que no estén en `AccountChannel` SHALL avisarse como "not assigned yet" o "principal en otra cuenta". Al procesar, SHALL asociarse a la cuenta y esta SHALL pasar a ser la principal del canal (una sola principal por canal; índice `UX_AccountChannel_primary`). Deshacer un batch no revierte la cuenta principal.

#### Scenario: RAM-07 en el batch limpio
- WHEN se procesa `data/samples/batch-clean`
- THEN RAM-07 queda asociado a ProviderA-USD como principal

### Requirement: Alcance por merchant
Toda consulta de cuentas, imports y batches SHALL filtrarse por los merchants del usuario salvo `merchantScope = all`.
