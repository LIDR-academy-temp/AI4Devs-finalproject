# Spec Delta

## ADDED Requirements

### Requirement: Documentación viva al día

El pipeline MUST fallar si `docs/especificaciones/README.md` difiere de la guía que se genera desde `openspec/specs`, y el mensaje SHALL indicar el comando para regenerarla.

#### Scenario: Especificación cambiada sin regenerar la guía

- **WHEN** un cambio modifica una especificación sin regenerar la guía
- **THEN** el pipeline falla e indica el comando para regenerarla
