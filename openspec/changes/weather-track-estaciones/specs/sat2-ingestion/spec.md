# Spec Delta

## MODIFIED Requirements

### Requirement: Sincronización del catálogo

El sistema SHALL mantener el catálogo de estaciones y sensores a partir de SAT2, identificando la magnitud y la altura de cada sensor. Cada estación corresponde a un equipo de `RecuperarEquipos`. El sistema MUST marcar como inactiva, con su fecha, la estación cuyo equipo deja de llegar, conservando sus datos, y MUST reactivarla si el equipo vuelve.

#### Scenario: Sensores a distinta altura

- **WHEN** el catálogo informa temperatura a 2 m y a 10 m
- **THEN** ambos sensores quedan registrados con la magnitud temperatura y su altura correspondiente

#### Scenario: Nombre con tilde

- **WHEN** una lectura y el catálogo escriben el nombre del sensor con distinta acentuación o mayúsculas
- **THEN** el sistema vincula la lectura con el sensor correcto

#### Scenario: Sensor desconocido

- **WHEN** llega una lectura de un sensor que no está en el catálogo
- **THEN** el sistema no la guarda como observación y registra el nombre en el detalle de la ejecución

#### Scenario: Equipo nuevo

- **WHEN** `RecuperarEquipos` informa un equipo que no estaba en el catálogo
- **THEN** el sistema lo registra como estación activa y empieza a obtener sus lecturas

#### Scenario: Equipo que deja de llegar

- **WHEN** una sincronización exitosa de `RecuperarEquipos` ya no incluye un equipo registrado
- **THEN** la estación queda inactiva con la fecha del cambio, conserva sus datos y el sistema deja de pedir sus lecturas

#### Scenario: Equipo que vuelve

- **WHEN** un equipo inactivo vuelve a aparecer en `RecuperarEquipos`
- **THEN** la estación vuelve a estar activa y el sistema retoma sus lecturas

#### Scenario: Fuente con error

- **WHEN** `RecuperarEquipos` responde con error
- **THEN** el sistema no cambia el estado de ninguna estación

### Requirement: Modo simulado

El sistema SHALL ofrecer un modo que produzca datos ficticios y no acceda a SAT2, para desarrollo, pruebas y evaluación sin credenciales reales. La estación simulada SHALL llamarse como la estación real, y la aplicación MUST mostrar en todas sus pantallas el aviso "Datos simulados".

#### Scenario: Evaluación sin credenciales

- **WHEN** el sistema inicia en modo simulado
- **THEN** genera lecturas sin contactar a SAT2 y el flujo completo funciona

#### Scenario: Aviso de datos simulados

- **WHEN** una persona usa la aplicación en modo simulado
- **THEN** ve la estación con el nombre de la real y el aviso "Datos simulados" en cada pantalla

## ADDED Requirements

### Requirement: Modo de prueba

El sistema SHALL ofrecer un modo de prueba que no acceda a SAT2 y muestre en el selector "Caso de prueba - 1", con las lecturas ya guardadas en la base, y "Caso de prueba - 2", que nunca recibe lecturas. Si la base no tiene lecturas, MUST cargar una vez los datos simulados para el caso 1. La aplicación MUST mostrar el aviso "Modo de prueba".

#### Scenario: Base con datos guardados

- **WHEN** el modo de prueba inicia sobre una base con lecturas
- **THEN** "Caso de prueba - 1" muestra esas lecturas, sin agregar otras, y "Caso de prueba - 2" informa que no tiene lecturas

#### Scenario: Base vacía

- **WHEN** el modo de prueba inicia sobre una base sin lecturas
- **THEN** "Caso de prueba - 1" muestra los datos simulados y "Caso de prueba - 2" informa que no tiene lecturas

#### Scenario: Sin acceso a SAT2

- **WHEN** el sistema funciona en modo de prueba
- **THEN** no hace ninguna consulta a SAT2

### Requirement: Separación de datos reales y ficticios

El sistema MUST registrar si una base contiene datos reales o ficticios desde su primera ingesta, y MUST negarse a arrancar en modo real sobre una base con datos ficticios, y en modo simulado o de prueba sobre una base con datos reales. El modo de prueba con datos reales MUST usar una copia de la base, nunca la original.

#### Scenario: Modo real sobre datos ficticios

- **WHEN** se arranca en modo real sobre una base que tuvo datos simulados
- **THEN** el worker y la API no arrancan e informan que hace falta una base nueva

#### Scenario: Modo de prueba sobre la base real

- **WHEN** se arranca en modo de prueba sobre la base con datos reales
- **THEN** el sistema no arranca e indica cómo preparar una copia para probar

#### Scenario: Copia de la base real

- **WHEN** se prepara una copia de la base real para el modo de prueba
- **THEN** "Caso de prueba - 1" muestra los datos reales copiados y la base original no cambia
