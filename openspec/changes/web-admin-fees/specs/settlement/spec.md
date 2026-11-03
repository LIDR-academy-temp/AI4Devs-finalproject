## ADDED Requirements

### Requirement: Pantalla Settlement Summary: espera del pago para quien no paga
En la cabecera del intento, común a las pestañas **Summary** y **Movements**, un intento `processed` SHALL mostrar `Waiting for a user with payment permission to mark it as paid.` a quien no tiene `payment.process`, para que sepa qué falta aunque no vea **Mark as paid**. Quien tiene `payment.process` SHALL NOT verla. En un intento `paid` o `undone` SHALL NOT mostrarse a nadie.

#### Scenario: Por usuario en un intento procesado
- **GIVEN** un intento `processed`
- **THEN** `analyst` y `viewer` ven `Waiting for a user with payment permission to mark it as paid.`, y `payments` y `admin` no la ven

#### Scenario: También en Movements
- **GIVEN** un intento `processed`
- **WHEN** `viewer` abre la pestaña **Movements**
- **THEN** ve la misma línea en la cabecera

#### Scenario: Intento pagado o deshecho
- **GIVEN** un intento `paid` o uno `undone`
- **THEN** ningún usuario ve la línea
