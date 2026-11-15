# Spec Delta

## Purpose

Convierte las cuentas confirmadas en una base de clientes potenciales, con el consentimiento de cada persona registrado y una exportación para el administrador.

## ADDED Requirements

### Requirement: Registro del consentimiento

El sistema MUST guardar, para cada cuenta, la fecha y la versión de los términos y la política de privacidad aceptados, y la preferencia de recibir novedades, que se ofrece sin marcar.

#### Scenario: Aceptación en el registro

- **WHEN** una persona se registra aceptando los términos y sin marcar las novedades
- **THEN** la cuenta guarda la fecha y la versión aceptadas, y la preferencia de novedades desactivada

### Requirement: Exportación de la base de clientes

El sistema SHALL permitir que el administrador, desde la línea de comandos del servidor, exporte a CSV las cuentas confirmadas con sus datos de registro, su consentimiento y su preferencia de novedades. La exportación MUST NOT incluir contraseñas, hashes ni enlaces.

#### Scenario: Exportar

- **WHEN** el administrador ejecuta la exportación
- **THEN** obtiene un CSV con una fila por cuenta confirmada y sin datos de acceso

#### Scenario: Cuentas sin confirmar

- **WHEN** hay cuentas sin confirmar al exportar
- **THEN** no aparecen en el CSV

### Requirement: Información al titular

El sistema SHALL mostrar en el registro y en "Mi cuenta" la finalidad del uso de los datos y cómo ejercer los derechos de acceso, rectificación y supresión.

#### Scenario: Formulario de registro

- **WHEN** una persona abre el formulario de registro
- **THEN** ve la finalidad del uso de sus datos y un enlace a la política de privacidad
