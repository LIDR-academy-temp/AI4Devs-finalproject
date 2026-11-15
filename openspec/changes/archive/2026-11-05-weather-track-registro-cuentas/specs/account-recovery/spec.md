# Spec Delta

## Purpose

Permite que el titular de una cuenta recupere el acceso cuando olvidó su contraseña, sin que nadie pueda averiguar qué correos están registrados.

## ADDED Requirements

### Requirement: Solicitud de recupero

El sistema SHALL aceptar una solicitud de recupero con un correo y MUST responder con el mismo mensaje y estado exista o no una cuenta con ese correo. Solo si existe una cuenta confirmada, MUST enviarle un enlace para elegir una contraseña nueva.

#### Scenario: Cuenta confirmada

- **WHEN** alguien pide recuperar la contraseña de una cuenta confirmada
- **THEN** recibe un mensaje genérico y el titular recibe el enlace

#### Scenario: Correo sin cuenta

- **WHEN** alguien pide recuperar la contraseña de un correo sin cuenta
- **THEN** recibe el mismo mensaje genérico y no se envía ningún correo

### Requirement: Enlace de recupero

El enlace de recupero MUST ser de un solo uso, MUST vencer a los 30 minutos y MUST quedar invalidado cuando se emite otro para la misma cuenta.

#### Scenario: Enlace vencido

- **WHEN** el titular usa el enlace 31 minutos después de pedirlo
- **THEN** el sistema responde que el enlace no es válido y ofrece pedir uno nuevo

#### Scenario: Enlace anterior

- **WHEN** el titular pide dos enlaces y usa el primero
- **THEN** el sistema responde que el enlace no es válido

### Requirement: Nueva contraseña

Con un enlace vigente, el sistema SHALL permitir elegir una contraseña nueva que cumpla la política de contraseñas. Al guardarla, MUST cerrar todas las sesiones de la cuenta, levantar el bloqueo por intentos fallidos de ese correo y enviar un aviso al titular.

#### Scenario: Restablecer

- **WHEN** el titular elige una contraseña nueva válida con un enlace vigente
- **THEN** puede iniciar sesión con ella, las sesiones anteriores dejan de valer y recibe un aviso

#### Scenario: Cuenta bloqueada

- **WHEN** el titular de una cuenta bloqueada por intentos fallidos restablece la contraseña
- **THEN** puede iniciar sesión de inmediato con la contraseña nueva

### Requirement: Recupero del usuario

El sistema SHALL indicar en la pantalla de recupero que el usuario es el correo con el que se registró la cuenta, y MUST NOT ofrecer ningún mecanismo que revele qué correos están registrados.

#### Scenario: Persona que no recuerda su usuario

- **WHEN** una persona abre la pantalla de recupero
- **THEN** ve la indicación de que su usuario es su correo y puede pedir el enlace para cada correo que crea haber usado
