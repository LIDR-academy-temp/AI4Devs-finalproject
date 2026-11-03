# Spec Delta

## MODIFIED Requirements

### Requirement: Protección de credenciales de SAT2

El sistema MUST leer las credenciales de SAT2 desde el entorno del proceso de ingesta, y MUST NOT incluirlas en la API, el navegador, el código, los registros ni los datos de prueba. Las cuentas de Weather Track MUST NOT tener relación con la cuenta de SAT2: ningún flujo de cuentas pide, muestra ni usa sus credenciales.

#### Scenario: Registro de una consulta

- **WHEN** el sistema registra una consulta a SAT2
- **THEN** el registro no contiene la contraseña ni el token

#### Scenario: Faltan credenciales

- **WHEN** el proceso de ingesta inicia sin credenciales y fuera del modo simulado
- **THEN** informa el error de configuración, sin imprimir valores, y no consulta SAT2

#### Scenario: Entorno de la API

- **WHEN** se inspecciona la configuración con la que arranca la API
- **THEN** no contiene ninguna variable con credenciales de SAT2

#### Scenario: Registro de una cuenta

- **WHEN** una persona se registra, confirma su cuenta o recupera la contraseña
- **THEN** ningún formulario, respuesta ni correo menciona ni usa la cuenta de SAT2
