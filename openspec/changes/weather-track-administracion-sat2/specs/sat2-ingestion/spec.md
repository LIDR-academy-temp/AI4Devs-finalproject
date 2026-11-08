# Spec Delta

## ADDED Requirements

### Requirement: Origen de la configuración de SAT2

En modo real, el proceso de ingesta SHALL usar la configuración de SAT2 guardada por un administrador, si existe. Si no existe, SHALL usar las variables del entorno. Si existe pero no puede descifrarla, MUST registrar el error sin valores y MUST NOT consultar SAT2 ni volver a las variables del entorno.

#### Scenario: Sin configuración guardada

- **WHEN** el worker arranca en modo real y nadie guardó una configuración
- **THEN** usa la URL y las credenciales del entorno

#### Scenario: Configuración guardada

- **WHEN** hay una configuración guardada por un administrador
- **THEN** el worker la usa, aunque el entorno tenga otras variables

#### Scenario: Cambio de configuración

- **WHEN** un administrador guarda una configuración nueva con el worker en marcha
- **THEN** el ciclo siguiente abre una sesión nueva con SAT2 con esa configuración, sin reiniciar el worker

#### Scenario: No se puede descifrar

- **WHEN** hay una configuración guardada y falta la clave privada o no corresponde
- **THEN** el worker registra el error sin valores, el ciclo termina en error y no se consulta SAT2

## MODIFIED Requirements

### Requirement: Protección de credenciales de SAT2

El sistema MUST tomar las credenciales de SAT2 de la configuración cifrada que carga un administrador o, en su defecto, del entorno del proceso de ingesta. Solo el proceso de ingesta MUST poder leerlas: la API MUST NOT tener la clave para descifrarlas ni las variables con credenciales de SAT2. Las credenciales MUST NOT aparecer en el navegador, el código, los registros, los correos ni los datos de prueba. Las cuentas comunes de Weather Track MUST NOT tener relación con la cuenta de SAT2: ningún flujo de cuentas pide, muestra ni usa sus credenciales.

#### Scenario: Registro de una consulta

- **WHEN** el sistema registra una consulta a SAT2
- **THEN** el registro no contiene la contraseña ni el token

#### Scenario: Faltan credenciales

- **WHEN** el proceso de ingesta inicia en modo real sin configuración guardada ni credenciales en el entorno
- **THEN** informa el error de configuración, sin imprimir valores, y no consulta SAT2

#### Scenario: Entorno de la API

- **WHEN** se inspecciona la configuración con la que arranca la API
- **THEN** no contiene ninguna variable con credenciales de SAT2 ni la clave privada, solo la clave pública

#### Scenario: Registro de una cuenta

- **WHEN** una persona se registra, confirma su cuenta o recupera la contraseña
- **THEN** ningún formulario, respuesta ni correo menciona ni usa la cuenta de SAT2
