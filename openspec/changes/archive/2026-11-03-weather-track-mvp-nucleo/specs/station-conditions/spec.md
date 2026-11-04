# Spec Delta

## Purpose

Muestra las últimas lecturas de una estación con su calidad, sus alarmas y su antigüedad, para que la persona sepa qué se midió y cuánto puede confiar en ese dato.

## ADDED Requirements

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

La aplicación SHALL permitir elegir entre las estaciones asignadas a la persona, y SHALL seleccionar automáticamente la única cuando tenga una sola.

#### Scenario: Una sola estación

- **WHEN** la persona tiene una sola estación asignada
- **THEN** la aplicación abre directamente su pantalla de decisión

#### Scenario: Varias estaciones

- **WHEN** la persona elige otra estación
- **THEN** la recomendación y las tarjetas pasan a mostrar los datos de esa estación

#### Scenario: Sin estaciones

- **WHEN** la persona no tiene estaciones asignadas
- **THEN** la aplicación se lo informa y no muestra datos
