# Spec Delta

## Purpose

Ofrece una guía legible de lo que hace Weather Track, generada a partir de las especificaciones de OpenSpec para que nunca quede vieja.

## ADDED Requirements

### Requirement: Guía generada de las especificaciones

El sistema SHALL generar `docs/especificaciones/README.md` a partir de `openspec/specs`, con un índice de las capacidades y, por cada una, su propósito, sus requisitos, sus escenarios y el último cambio archivado que la modificó, con enlaces a la especificación.

#### Scenario: Capacidad nueva

- **WHEN** se archiva un cambio que crea una especificación
- **THEN** al regenerar la guía aparece la capacidad nueva con sus requisitos y ese cambio como el último que la modificó

#### Scenario: Requisito modificado

- **WHEN** cambia el texto de un requisito en una especificación
- **THEN** al regenerar la guía cambia solo lo que corresponde a ese requisito

### Requirement: Salida determinista

La guía MUST generarse siempre igual a partir de las mismas especificaciones: mismo orden y sin la fecha ni la hora de generación.

#### Scenario: Dos generaciones seguidas

- **WHEN** se genera la guía dos veces sin cambiar las especificaciones
- **THEN** los dos archivos son idénticos

### Requirement: Aviso de archivo generado

La guía SHALL empezar con un aviso de que se genera, con el comando para regenerarla, y de que no se edita a mano.

#### Scenario: Lectura de la guía

- **WHEN** alguien abre la guía
- **THEN** lee al principio cómo se genera y que no debe editarla
