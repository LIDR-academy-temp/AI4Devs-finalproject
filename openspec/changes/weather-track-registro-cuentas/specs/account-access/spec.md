# Spec Delta

## MODIFIED Requirements

### Requirement: Inicio de sesión con cuenta propia

El sistema SHALL iniciar una sesión cuando una persona ingresa un correo y una contraseña válidos de una cuenta activa y confirmada. El correo MUST compararse sin distinguir mayúsculas de minúsculas.

#### Scenario: Credenciales válidas

- **WHEN** una persona con una cuenta activa y confirmada ingresa su correo y contraseña correctos
- **THEN** el sistema inicia la sesión y abre la primera estación activa

#### Scenario: Credenciales inválidas

- **WHEN** una persona ingresa un correo inexistente o una contraseña incorrecta
- **THEN** el sistema responde con un mismo mensaje genérico, sin revelar cuál de los dos datos falló, y no inicia la sesión

#### Scenario: Cuenta desactivada

- **WHEN** el titular de una cuenta desactivada ingresa sus credenciales correctas
- **THEN** el sistema no inicia la sesión y responde con el mismo mensaje genérico

#### Scenario: Cuenta sin confirmar

- **WHEN** el titular de una cuenta sin confirmar ingresa sus credenciales correctas
- **THEN** el sistema no inicia la sesión, indica que falta confirmar el correo y ofrece reenviar el enlace

### Requirement: Autorización por estación

El sistema MUST comprobar en el servidor, en cada consulta, que la persona tenga una sesión válida y que la estación pedida exista. Una estación es un equipo de SAT2, no un permiso: mientras no haya niveles de usuario, toda cuenta confirmada MUST poder consultar todas las estaciones, activas e inactivas.

#### Scenario: Estación inexistente

- **WHEN** una persona con sesión consulta una estación que no existe
- **THEN** la API responde con estado 404 y no entrega ningún dato

#### Scenario: Sin sesión

- **WHEN** alguien consulta datos sin una sesión válida
- **THEN** la API responde con estado 401

#### Scenario: Listado de estaciones

- **WHEN** una persona con sesión pide sus estaciones
- **THEN** recibe todas las estaciones, con su estado activo o inactivo

## ADDED Requirements

### Requirement: Límite por dirección IP

El sistema MUST limitar por dirección IP de origen la cantidad de pedidos de inicio de sesión, registro, recupero, reenvío de confirmación y uso de enlaces, y MUST responder con estado 429 y la cabecera `Retry-After` al superarla. Este límite se suma al límite por correo.

#### Scenario: Muchos registros desde una misma IP

- **WHEN** una misma dirección IP supera el límite de pedidos de registro
- **THEN** el sistema responde 429 con `Retry-After` y no crea cuentas ni envía correos

#### Scenario: Otra IP

- **WHEN** una dirección IP está limitada y llega un pedido válido desde otra dirección
- **THEN** el sistema lo atiende con normalidad

## REMOVED Requirements

### Requirement: Alta de cuentas sin registro público

**Reason**: El responsable decidió el 2 de noviembre de 2026 abrir el registro para formar una base de clientes.
**Migration**: El registro público, la confirmación y la baja están en `account-lifecycle`. La operación administrativa de alta se conserva para cuentas de demostración y queda confirmada al crearse.
