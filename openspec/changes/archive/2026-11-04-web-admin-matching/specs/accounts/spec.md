## MODIFIED Requirements

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
