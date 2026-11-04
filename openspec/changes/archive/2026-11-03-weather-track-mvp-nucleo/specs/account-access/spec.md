# Spec Delta

## Purpose

Permite que solo las personas con una cuenta activa de Weather Track ingresen al sistema y consulten únicamente las estaciones que tienen asignadas.

## ADDED Requirements

### Requirement: Inicio de sesión con cuenta propia

El sistema SHALL iniciar una sesión cuando una persona ingresa un correo y una contraseña válidos de una cuenta activa. El correo MUST compararse sin distinguir mayúsculas de minúsculas.

#### Scenario: Credenciales válidas

- **WHEN** una persona con una cuenta activa ingresa su correo y contraseña correctos
- **THEN** el sistema inicia la sesión y muestra sus estaciones asignadas

#### Scenario: Credenciales inválidas

- **WHEN** una persona ingresa un correo inexistente o una contraseña incorrecta
- **THEN** el sistema responde con un mismo mensaje genérico, sin revelar cuál de los dos datos falló, y no inicia la sesión

#### Scenario: Cuenta desactivada

- **WHEN** el titular de una cuenta desactivada ingresa sus credenciales correctas
- **THEN** el sistema no inicia la sesión y responde con el mismo mensaje genérico

### Requirement: Alta de cuentas sin registro público

El sistema SHALL permitir crear cuentas y asignar estaciones solo mediante una operación administrativa, y SHALL NOT ofrecer registro público.

#### Scenario: Pantalla de acceso

- **WHEN** una persona sin cuenta abre la aplicación
- **THEN** no encuentra ninguna opción para registrarse

#### Scenario: Alta administrativa

- **WHEN** un administrador crea una cuenta y le asigna una estación
- **THEN** esa persona puede iniciar sesión y consultar esa estación

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

El sistema MUST comprobar en el servidor, en cada consulta, que la persona tenga asignada la estación pedida.

#### Scenario: Estación no asignada

- **WHEN** una persona con sesión consulta una estación existente que no tiene asignada
- **THEN** la API responde con estado 403 y no entrega ningún dato de esa estación

#### Scenario: Sin sesión

- **WHEN** alguien consulta datos sin una sesión válida
- **THEN** la API responde con estado 401

#### Scenario: Listado de estaciones

- **WHEN** una persona con sesión pide sus estaciones
- **THEN** recibe únicamente las estaciones que tiene asignadas

### Requirement: Protección de credenciales de usuario

El sistema MUST guardar las contraseñas solo como un hash con sal, y MUST NOT registrarlas ni conservarlas en texto plano durante la sesión.

#### Scenario: Registro de actividad

- **WHEN** se registra un intento de inicio de sesión
- **THEN** el registro no contiene la contraseña ni el token de sesión
