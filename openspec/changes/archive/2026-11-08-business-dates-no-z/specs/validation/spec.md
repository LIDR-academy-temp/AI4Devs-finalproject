## ADDED Requirements

### Requirement: Fechas de negocio de la corrida sin zona
Los rangos de la corrida (`ranges.APP`, `DEC`, `I` y `R`, `min` y `max`) y la `relevantDate` de cada hallazgo SHALL salir en hora de pared de America/New_York, sin zona ni milisegundos (`YYYY-MM-DDTHH:mm:ss`), con los dígitos guardados en la base, en toda respuesta que los incluya. Las fechas de auditoría (`runAt`, `reviewedAt`, `invalidatedAt`, `changedAt`, `resolvedAt`…) SHALL seguir siendo instantes UTC con `Z`.

#### Scenario: Rangos de batch-clean
- **GIVEN** la corrida vigente de `batch-clean`
- **WHEN** `analyst` la pide
- **THEN** cada `min` y `max` de `ranges` cumple `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$`, y `runAt` termina en `Z`

#### Scenario: Hallazgo con fecha
- **WHEN** `analyst` abre un hallazgo de `missing_previous_to_batch`
- **THEN** su `relevantDate` no lleva `Z` ni milisegundos

## MODIFIED Requirements

### Requirement: Pantalla Analysis & Validations: fechas en hora de Nueva York
Toda fecha de la pantalla SHALL mostrarse en hora de America/New_York con el sufijo `ET`, sin depender de la zona del navegador. Las fechas de negocio (rangos, `relevantDate`, fechas de batch) SHALL mostrarse con los dígitos que llegan, sin convertir, porque el API las envía en hora de Nueva York sin zona. Las de auditoría (corrida, revisión, invalidación, cambios, resolución, historial) SHALL convertirse desde UTC.

#### Scenario: Rango de negocio sin desplazamiento
- **WHEN** la corrida trae `ranges.APP.min = 2026-09-28T00:00:00`
- **THEN** el rango APP empieza en `2026-09-28 00:00 ET`, también con el navegador en otra zona

#### Scenario: Auditoría en horario de verano
- **WHEN** una aparición trae `changedAt = 2026-10-18T14:20:00.000Z`
- **THEN** se muestra `2026-10-18 10:20 ET`

#### Scenario: Auditoría en horario estándar
- **WHEN** una resolución trae `resolvedAt = 2026-11-02T15:00:00.000Z`
- **THEN** se muestra `2026-11-02 10:00 ET`
