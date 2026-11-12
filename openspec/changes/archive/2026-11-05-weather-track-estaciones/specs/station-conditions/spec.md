# Spec Delta

## MODIFIED Requirements

### Requirement: Selección de estación

La aplicación SHALL mostrar en el encabezado, siempre y aunque haya una sola, un selector con todas las estaciones, activas e inactivas, y SHALL abrir la primera estación activa al iniciar la sesión. Una estación es un equipo de SAT2: el selector MUST NOT ofrecer casos de prueba ni otras opciones que no sean equipos, salvo en el modo de prueba.

#### Scenario: Una sola estación

- **WHEN** hay una sola estación
- **THEN** la aplicación abre su pantalla de decisión y el selector del encabezado la muestra como única opción

#### Scenario: Varias estaciones

- **WHEN** la persona elige otra estación en el selector
- **THEN** la pantalla pasa a mostrar los datos de esa estación

#### Scenario: Estación inactiva en el selector

- **WHEN** una de las estaciones está inactiva
- **THEN** el selector la muestra con la marca "Equipo inactivo"

#### Scenario: Sin estaciones

- **WHEN** todavía no hay ninguna estación en el catálogo
- **THEN** la aplicación informa que aún no se recibieron estaciones de la fuente y no muestra datos

## ADDED Requirements

### Requirement: Equipo inactivo

Para una estación inactiva, la pantalla de decisión SHALL mostrar la leyenda "Equipo inactivo - solo históricos" y la lista de sus sensores, cada uno con acceso a su histórico, y MUST NOT mostrar la recomendación ni las tarjetas de lecturas actuales.

#### Scenario: Abrir un equipo inactivo

- **WHEN** la persona elige una estación inactiva
- **THEN** ve la leyenda y la lista de sensores, sin recomendación ni tarjetas

#### Scenario: Histórico de un equipo inactivo

- **WHEN** la persona elige un sensor de una estación inactiva
- **THEN** ve su histórico de 7 y 31 días con los datos guardados

#### Scenario: Estado informado por la API

- **WHEN** se piden las condiciones actuales de una estación inactiva
- **THEN** la respuesta indica que el equipo está inactivo y desde cuándo
