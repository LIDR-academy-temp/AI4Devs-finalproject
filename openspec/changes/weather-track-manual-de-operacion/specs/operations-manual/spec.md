# Spec Delta

## Purpose

Da a quien instala y opera Weather Track un manual en castellano para ponerlo en marcha, mantenerlo y responder a cada aviso. Las pruebas lo mantienen al día con el sistema.

## ADDED Requirements

### Requirement: Manual de operación

El repositorio SHALL incluir un manual de operación en `docs/clientes/`, escrito en castellano para quien instala y opera. Tiene que cubrir:

- la puesta en marcha;
- lo que ven los usuarios;
- las cuentas y los administradores;
- la configuración de SAT2;
- el monitoreo;
- el respaldo y la restauración;
- la actualización;
- la seguridad a cargo del operador.

Los pasos de instalación MUST enlazarse a la guía de instalación, sin copiarse.

#### Scenario: Un operador nuevo

- **WHEN** alguien abre `docs/clientes/README.md`
- **THEN** encuentra a quién va dirigido el manual, qué necesita y un índice de los capítulos

#### Scenario: Instalación sin duplicar

- **WHEN** el manual explica la puesta en marcha
- **THEN** enlaza los pasos de la guía de instalación en lugar de repetir sus comandos

### Requirement: Qué hacer ante cada aviso

El manual SHALL tener una entrada por cada tipo de alerta del monitoreo, por cada estado del semáforo de salud y por el aviso de worker detenido de Grafana. Cada entrada indica:

- qué significa;
- las causas probables;
- qué revisar, con los comandos;
- cómo se normaliza.

Una prueba MUST fallar si aparece un tipo de alerta o un estado sin su entrada.

#### Scenario: Alerta de datos viejos

- **WHEN** un administrador recibe el correo de la alerta de datos viejos
- **THEN** el manual le dice qué revisar en SAT2 y en el worker, y cuándo llega el aviso de normalización

#### Scenario: Alerta nueva sin documentar

- **WHEN** el código suma un tipo de alerta que el manual no menciona
- **THEN** la prueba del manual falla y nombra el tipo que falta

### Requirement: Comandos de administración documentados

El manual SHALL explicar cada comando de la línea de comandos de administración: para qué sirve, cuándo usarlo y un ejemplo con valores ficticios. Una prueba MUST fallar si un comando no aparece en el manual.

#### Scenario: Comando sin documentar

- **WHEN** la línea de comandos de administración suma un comando que el manual no menciona
- **THEN** la prueba del manual falla y nombra el comando que falta

### Requirement: Respaldo y restauración comprobados

El manual SHALL indicar cómo respaldar la base en un archivo y cómo restaurarla, con qué frecuencia conviene hacerlo y dónde guardar la copia. Los comandos MUST probarse en un proyecto aislado antes de publicarse. Nunca se prueban sobre la instalación real.

#### Scenario: Restaurar después de un problema

- **WHEN** el operador restaura un respaldo siguiendo el manual en una instalación vacía
- **THEN** las cuentas, las lecturas y la configuración cifrada de SAT2 vuelven a estar disponibles, y el worker sigue la ingesta desde ahí

### Requirement: Enlaces e imágenes válidos

Todos los enlaces relativos y las imágenes del manual SHALL apuntar a archivos que existen. Las capturas MUST mostrar las pantallas actuales y solo datos ficticios.

#### Scenario: Enlace roto

- **WHEN** se mueve o se borra un archivo que el manual enlaza
- **THEN** la prueba del manual falla y nombra el enlace roto

#### Scenario: Captura sin datos reales

- **WHEN** se revisa cualquier captura del manual
- **THEN** muestra datos del modo prueba y ninguna credencial, correo real ni dirección de SAT2
