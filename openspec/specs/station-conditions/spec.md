# station-conditions Specification

## Purpose
Muestra las últimas lecturas de una estación con su calidad, sus alarmas y su antigüedad, para que la persona sepa qué se midió y cuánto puede confiar en ese dato.

## Requirements

### Requirement: Última lectura por sensor

El sistema SHALL entregar, para una estación autorizada, la última lectura de cada sensor con su nombre, magnitud, altura, valor, unidad, calidad y alarma.

#### Scenario: Estación con datos

- **WHEN** una persona consulta una estación con lecturas guardadas
- **THEN** recibe una lectura por sensor, con todos sus datos

#### Scenario: Sensor sin dato válido

- **WHEN** la última lectura de un sensor está como `FALTANTE`
- **THEN** el sensor aparece sin valor y con la calidad `FALTANTE`

### Requirement: Vigencia de los datos

El sistema SHALL informar la hora de medición, la antigüedad en segundos y el estado `VIGENTE` hasta 30 minutos, `DESACTUALIZADO` si supera ese límite y `SIN_DATOS` si no hay mediciones.

#### Scenario: Datos recientes

- **WHEN** la última medición tiene 10 minutos
- **THEN** el estado de los datos es `VIGENTE`

#### Scenario: Datos viejos

- **WHEN** la última medición tiene 31 minutos
- **THEN** el estado de los datos es `DESACTUALIZADO`

#### Scenario: Estación sin mediciones

- **WHEN** la estación aún no tiene mediciones
- **THEN** el estado de los datos es `SIN_DATOS`, sin hora de medición ni antigüedad

### Requirement: Estado real de la conexión con la fuente

El sistema SHALL informar el instante de la última ingesta exitosa, y la pantalla SHALL avisar cuando la última ejecución de la estación terminó con error.

#### Scenario: Fuente no disponible

- **WHEN** el último ciclo de una estación terminó con error
- **THEN** la pantalla muestra un aviso de falta de conexión con la fuente y la hora de la última ingesta exitosa

#### Scenario: Fuente disponible

- **WHEN** el último ciclo terminó con éxito
- **THEN** la pantalla no muestra ese aviso

### Requirement: Tarjetas de sensores

La pantalla de decisión SHALL mostrar una tarjeta por sensor con su valor, unidad y calidad, y SHALL destacar con texto e ícono las lecturas `FALTANTE`, `SOSPECHOSO` o en alarma.

#### Scenario: Lectura sospechosa

- **WHEN** una lectura está como `SOSPECHOSO`
- **THEN** su tarjeta conserva el valor y muestra una advertencia

#### Scenario: Lectura en alarma

- **WHEN** una lectura tiene la alarma activa
- **THEN** su tarjeta la destaca, sin cambiar por ello el estado de la recomendación

#### Scenario: Ancho de móvil

- **WHEN** la pantalla se ve con un ancho de 360 píxeles
- **THEN** las tarjetas se reacomodan sin desplazamiento horizontal

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
