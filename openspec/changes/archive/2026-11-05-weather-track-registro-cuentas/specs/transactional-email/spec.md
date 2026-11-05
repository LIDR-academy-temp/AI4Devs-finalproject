# Spec Delta

## Purpose

Envía los correos de las cuentas (confirmación, recupero, avisos de seguridad) de forma confiable, con un enlace de baja en cada uno, y sin que una instalación local envíe correos a internet.

## ADDED Requirements

### Requirement: Envío diferido con reintentos

El sistema SHALL registrar cada correo en una bandeja de salida dentro de la misma operación que lo origina y enviarlo fuera de la petición del usuario, reintentando ante fallos del servidor de correo. El contenido del correo MUST borrarse de la bandeja una vez enviado o descartado.

#### Scenario: Servidor de correo caído

- **WHEN** el servidor de correo no responde al enviar una confirmación
- **THEN** el registro sigue respondiendo con normalidad y el correo se envía cuando el servidor vuelve

#### Scenario: Correo enviado

- **WHEN** un correo se envía con éxito
- **THEN** la bandeja conserva solo su tipo, destinatario y fechas, sin el cuerpo ni los enlaces

### Requirement: Enlace de baja en cada correo

Cada correo MUST incluir en el cuerpo una leyenda con el enlace de baja y MUST incluir las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` para la baja en un clic desde el programa de correo.

#### Scenario: Correo de confirmación

- **WHEN** se envía un correo de confirmación
- **THEN** su cuerpo tiene la leyenda de baja y sus cabeceras incluyen el enlace de baja

#### Scenario: Baja en un clic desde el programa de correo

- **WHEN** el programa de correo envía el pedido de baja en un clic de `List-Unsubscribe-Post`
- **THEN** la cuenta se borra sin pedir otra confirmación, porque el pedido es una acción explícita del titular

### Requirement: Enlaces fuera de los registros

Los enlaces del cuerpo de los correos MUST llevar el código secreto en una parte de la dirección que el navegador no envía al servidor. La dirección de baja en un clic de la cabecera es la única que lo lleva hasta el servidor. El sistema MUST NOT registrar ningún código en sus registros de actividad.

#### Scenario: Registro del servidor web

- **WHEN** una persona abre un enlace de recupero o un programa de correo pide la baja en un clic
- **THEN** los registros del servidor web y de la API no contienen el código del enlace

### Requirement: Límite de correos por destinatario

El sistema MUST NOT enviar más de 3 correos del mismo tipo a un mismo destinatario por hora. Los pedidos que superen el límite reciben la misma respuesta que los demás.

#### Scenario: Pedidos repetidos de recupero

- **WHEN** alguien pide 5 veces en una hora recuperar la contraseña de una misma cuenta
- **THEN** el titular recibe como máximo 3 correos de recupero y cada pedido recibe la misma respuesta

### Requirement: Captura local de correos

En la instalación local, el sistema SHALL entregar todos los correos a un buzón de prueba visible solo desde la propia computadora, y MUST NOT enviarlos a internet.

#### Scenario: Instalación local

- **WHEN** una persona se registra en una instalación local
- **THEN** el correo de confirmación aparece en el buzón de prueba local y no llega a ningún servidor externo

### Requirement: Configuración obligatoria en producción

Con la configuración de producción, el sistema MUST negarse a arrancar si falta la configuración del servidor de correo.

#### Scenario: Falta el servidor de correo

- **WHEN** se arranca con la configuración de producción sin datos del servidor de correo
- **THEN** el arranque falla con un mensaje que indica qué falta
