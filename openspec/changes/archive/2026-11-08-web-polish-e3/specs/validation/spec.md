## ADDED Requirements

### Requirement: Pantalla Analysis & Validations: valores inválidos en la dirección
Una validación, una página o un hallazgo inválidos en la dirección de la lista de hallazgos SHALL descartarse también en las consultas al API, como si no estuvieran.

#### Scenario: Validación inválida en la dirección
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el import con `?step=analysis&validation=foo&ipage=abc&issue=abc`
- **THEN** no se pide `GET validation-issues` con `validationCode=foo`, ninguna validación aparece elegida y no hay drawer abierto
