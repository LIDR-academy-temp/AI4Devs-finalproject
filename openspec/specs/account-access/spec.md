# account-access Specification

## Purpose
Permite que solo las personas con una cuenta activa de Weather Track ingresen al sistema y consulten únicamente las estaciones que tienen asignadas.

## Requirements

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

### Requirement: Límite de intentos de inicio de sesión

El sistema MUST rechazar temporalmente los intentos de inicio de sesión después de 5 fallos consecutivos para un mismo correo en 15 minutos.

#### Scenario: Demasiados intentos

- **WHEN** se producen 5 intentos fallidos para un mismo correo en 15 minutos y llega uno nuevo
- **THEN** el sistema responde con estado 429 sin evaluar la contraseña

#### Scenario: Fin de la espera

- **WHEN** pasan 15 minutos desde el último intento fallido y se ingresan las credenciales correctas
- **THEN** el sistema inicia la sesión

### Requirement: Vigencia de la sesión

El sistema SHALL mantener la sesión durante 8 horas como máximo desde su inicio, y SHALL exigir un nuevo ingreso cuando venza.

#### Scenario: Sesión vencida

- **WHEN** una persona consulta datos con una sesión de más de 8 horas
- **THEN** la API responde con estado 401 y la aplicación muestra la pantalla de acceso

### Requirement: Cierre de sesión

El sistema SHALL invalidar la sesión de inmediato cuando la persona elige cerrarla.

#### Scenario: Salir

- **WHEN** la persona cierra la sesión y luego intenta consultar datos con esa misma sesión
- **THEN** la API responde con estado 401

### Requirement: Autorización por estación

El sistema MUST comprobar en el servidor, en cada consulta, que la persona tenga una sesión válida y que la estación pedida exista. Una estación es un equipo de SAT2, no un permiso: mientras no haya niveles de usuario, toda cuenta confirmada MUST poder consultar todas las estaciones, activas e inactivas.

#### Scenario: Estación no asignada

- **WHEN** una persona con sesión consulta una estación existente que no figura en ninguna asignación a su cuenta
- **THEN** la API entrega sus datos, porque el acceso no depende de asignaciones por persona

#### Scenario: Estación inexistente

- **WHEN** una persona con sesión consulta una estación que no existe
- **THEN** la API responde con estado 404 y no entrega ningún dato

#### Scenario: Sin sesión

- **WHEN** alguien consulta datos sin una sesión válida
- **THEN** la API responde con estado 401

#### Scenario: Listado de estaciones

- **WHEN** una persona con sesión pide sus estaciones
- **THEN** recibe todas las estaciones, con su estado activo o inactivo

### Requirement: Protección de credenciales de usuario

El sistema MUST guardar las contraseñas solo como un hash con sal, y MUST NOT registrarlas ni conservarlas en texto plano durante la sesión.

#### Scenario: Registro de actividad

- **WHEN** se registra un intento de inicio de sesión
- **THEN** el registro no contiene la contraseña ni el token de sesión

### Requirement: Límite por dirección IP

El sistema MUST limitar por dirección IP de origen la cantidad de pedidos de inicio de sesión, registro, recupero, reenvío de confirmación y uso de enlaces, y MUST responder con estado 429 y la cabecera `Retry-After` al superarla. Este límite se suma al límite por correo.

#### Scenario: Muchos registros desde una misma IP

- **WHEN** una misma dirección IP supera el límite de pedidos de registro
- **THEN** el sistema responde 429 con `Retry-After` y no crea cuentas ni envía correos

#### Scenario: Otra IP

- **WHEN** una dirección IP está limitada y llega un pedido válido desde otra dirección
- **THEN** el sistema lo atiende con normalidad
