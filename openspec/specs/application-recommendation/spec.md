# application-recommendation Specification

## Purpose
Responde si conviene aplicar fitosanitarios en una estación en este momento, con un índice, un estado y sus motivos, sin presentar como favorable una condición de inversión ni datos faltantes o viejos.

## Requirements

### Requirement: Cálculo del índice TIS

El sistema SHALL calcular el índice como `0,50 × temperatura + 0,25 × viento + 0,15 × radiación + 0,10 × humedad`, con factores de 0 a 100 según las tablas de la sección 1.2 del README, y ΔT igual a `T10m − T2m`.

#### Scenario: Condiciones favorables

- **WHEN** ΔT es −0,1 °C, el viento 9 km/h, la radiación 1056 W/m² y la humedad 55 % y 60 %
- **THEN** el índice es 7

#### Scenario: Riesgo máximo

- **WHEN** ΔT es +3,0 °C, el viento 1 km/h, la radiación 0 W/m² y la humedad 95 % en ambas alturas
- **THEN** el índice es 100

### Requirement: Estado base según el índice

El sistema SHALL asignar el estado base `APTO` hasta 20, `PRECAUCION` hasta 40, `RIESGO_DERIVA` hasta 60 y `NO_APLICAR` por encima de 60.

#### Scenario: Riesgo intermedio

- **WHEN** ΔT es +1,5 °C, el viento 9 km/h, la radiación 0 W/m² y la humedad 60 % en ambas alturas
- **THEN** el índice es 50 y el estado es `RIESGO_DERIVA`

#### Scenario: Límite exacto

- **WHEN** el índice es exactamente 20
- **THEN** el estado base es `APTO`

### Requirement: Lecturas obligatorias (R1)

El sistema MUST devolver `DATOS_INSUFICIENTES`, sin índice, cuando falta o es inválida alguna de las seis lecturas: T2m, T10m, HR2m, HR10m, viento o radiación.

#### Scenario: Falta una temperatura

- **WHEN** la lectura T10m está como `FALTANTE`
- **THEN** el estado es `DATOS_INSUFICIENTES`, no hay índice y el motivo `DATO_FALTANTE` identifica el sensor

#### Scenario: Falta un dato de menor peso

- **WHEN** falta solo la humedad a 2 m
- **THEN** el estado también es `DATOS_INSUFICIENTES`

### Requirement: Antigüedad máxima de la medición (R2)

El sistema MUST devolver `DATOS_INSUFICIENTES`, sin índice y con motivo `DATOS_DESACTUALIZADOS`, cuando la medición tiene más de 30 minutos en el momento de la consulta.

#### Scenario: Medición vieja

- **WHEN** se consulta una recomendación calculada como `APTO` y su medición tiene 31 minutos
- **THEN** la respuesta es `DATOS_INSUFICIENTES`, sin índice, e informa la antigüedad

#### Scenario: Medición en el límite

- **WHEN** la medición tiene exactamente 30 minutos
- **THEN** la recomendación sigue vigente

### Requirement: La inversión nunca es apta (R3)

El sistema MUST asignar como mínimo `PRECAUCION`, con motivo `INVERSION_DETECTADA`, cuando ΔT es mayor que cero, aunque el índice sea 20 o menor.

#### Scenario: Inversión con índice bajo

- **WHEN** ΔT es +0,9 °C, el viento 13 km/h, la radiación 300 W/m² y la humedad 50 % y 55 %
- **THEN** el índice es 20, el estado es `PRECAUCION` y el motivo informa la diferencia térmica

#### Scenario: Inversión con índice alto

- **WHEN** ΔT es mayor que cero y el estado base es `NO_APLICAR`
- **THEN** el estado sigue siendo `NO_APLICAR` e incluye el motivo `INVERSION_DETECTADA`

### Requirement: Con inversión y poco viento no se aplica (R3b)

El sistema MUST asignar `NO_APLICAR`, con motivo `INVERSION_DETECTADA`, cuando ΔT es mayor que cero y el viento es de 6,4 km/h o menos, cualquiera sea el índice.

#### Scenario: Inversión con poco viento

- **WHEN** ΔT es +0,5 °C, el viento 2 km/h, la radiación 600 W/m² y la humedad 50 % en ambas alturas
- **THEN** el índice es 32,83, el estado es `NO_APLICAR` y el motivo informa el viento

#### Scenario: Viento en el límite

- **WHEN** ΔT es mayor que cero y el viento es exactamente 6,4 km/h
- **THEN** el estado es `NO_APLICAR`

#### Scenario: Viento apenas superior

- **WHEN** ΔT es +0,5 °C, el viento 6,5 km/h, la radiación 600 W/m² y la humedad 50 % en ambas alturas
- **THEN** el estado se determina por el índice y la regla R3, sin aplicar esta regla

#### Scenario: Poco viento sin inversión

- **WHEN** ΔT es 0 o menor y el viento es de 2 km/h
- **THEN** esta regla no se aplica

### Requirement: Una lectura sospechosa nunca es apta (R4)

El sistema MUST asignar como mínimo `PRECAUCION`, con motivo `DATO_SOSPECHOSO`, cuando alguna de las seis lecturas está como `SOSPECHOSO`.

#### Scenario: Humedad sospechosa

- **WHEN** ΔT es −0,1 °C, el viento 9 km/h, la radiación 1056 W/m² y la humedad 0 % y 61 %
- **THEN** el índice es 7, el estado es `PRECAUCION` y el motivo identifica las lecturas sospechosas

### Requirement: Motivos de la recomendación

El sistema SHALL incluir al menos un motivo con código y detalle: `SIN_INVERSION` si el estado es `APTO`, `INDICE_ELEVADO` si el índice supera 20, y los definidos en las reglas R1 a R4. Si la estación no tiene cálculos, usará `SIN_MEDICIONES`.

#### Scenario: Estado apto

- **WHEN** el estado es `APTO`
- **THEN** los motivos incluyen `SIN_INVERSION`

#### Scenario: Índice alto sin inversión

- **WHEN** ΔT es 0 o menor y el índice es mayor que 20
- **THEN** los motivos incluyen `INDICE_ELEVADO`

#### Scenario: Estación sin cálculos

- **WHEN** se consulta una estación que todavía no tiene recomendaciones
- **THEN** el estado es `DATOS_INSUFICIENTES` y el motivo es `SIN_MEDICIONES`

### Requirement: Carácter orientativo

El sistema SHALL acompañar toda recomendación con un aviso de que es orientativa y no reemplaza el criterio profesional ni la etiqueta del producto, e informar la versión del método.

#### Scenario: Respuesta de la API

- **WHEN** se consulta una recomendación en cualquier estado
- **THEN** la respuesta incluye el aviso y la versión del método

#### Scenario: Pantalla de decisión

- **WHEN** la persona ve la recomendación
- **THEN** el aviso está visible junto al estado

### Requirement: Presentación del estado

La pantalla de decisión SHALL mostrar el estado con texto, color e ícono, junto con el índice, la hora de medición y los motivos, y SHALL NOT sugerir aplicar con `DATOS_INSUFICIENTES`.

#### Scenario: Datos insuficientes

- **WHEN** el estado es `DATOS_INSUFICIENTES`
- **THEN** la pantalla no muestra índice ni texto que sugiera aplicar, y explica el motivo

#### Scenario: Sin depender del color

- **WHEN** una persona no distingue los colores de los estados
- **THEN** identifica el estado por su texto y su ícono

### Requirement: Actualización automática

La pantalla de decisión SHALL actualizarse cada 60 segundos, y ante un error de red SHALL dejar de presentar el último estado como vigente.

#### Scenario: Datos nuevos

- **WHEN** hay una recomendación nueva y pasan 60 segundos
- **THEN** la pantalla la muestra sin que la persona recargue

#### Scenario: Sin conexión con la API

- **WHEN** falla la actualización de la pantalla
- **THEN** la pantalla avisa que no hay conexión y que el estado mostrado puede no estar vigente
