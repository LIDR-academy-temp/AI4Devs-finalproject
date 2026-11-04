# Spec Delta

## Purpose

Permite revisar cómo evolucionó un sensor en un período reciente, con un gráfico y un resumen estadístico, para entender las condiciones y planificar la próxima aplicación.

## ADDED Requirements

### Requirement: Consulta de la serie por la API

El sistema SHALL entregar, para un sensor de una estación autorizada y un rango de hasta 31 días, sus lecturas en orden ascendente, a partir de los datos guardados y sin consultar a SAT2.

#### Scenario: Rango válido

- **WHEN** se pide un rango de 7 días
- **THEN** la API devuelve las lecturas del período en orden ascendente

#### Scenario: Rango inválido

- **WHEN** se pide más de 31 días o una fecha final anterior a la inicial
- **THEN** la API responde con estado 422 y un mensaje que explica el error

#### Scenario: Sensor de otra estación

- **WHEN** el sensor pedido no pertenece a la estación indicada
- **THEN** la API responde con estado 404

### Requirement: Rangos en la pantalla

La pantalla de históricos SHALL ofrecer los últimos 7 y 31 días, medidos hasta el momento de la consulta, en hora de Argentina.

#### Scenario: Selección de rango

- **WHEN** la persona elige los últimos 31 días
- **THEN** ve el gráfico de ese período con la hora de Argentina

### Requirement: Resumen estadístico

El sistema SHALL informar máximo, mínimo, promedio y cantidad de registros del período, y MUST excluir del resumen las lecturas `FALTANTE`.

#### Scenario: Con lecturas faltantes

- **WHEN** un período tiene lecturas `FALTANTE`
- **THEN** esas lecturas no cuentan en máximo, mínimo, promedio ni cantidad

#### Scenario: Sin lecturas válidas

- **WHEN** un período no tiene lecturas válidas
- **THEN** el resumen informa cantidad 0, sin máximo, mínimo ni promedio, y la pantalla avisa que no hay datos

### Requirement: Huecos en la serie

El gráfico SHALL interrumpir la línea donde faltan datos, y SHALL NOT interpolar valores.

#### Scenario: Lecturas ausentes

- **WHEN** faltan lecturas en una parte del período
- **THEN** la línea se corta en ese tramo

### Requirement: Lecturas sospechosas en la serie

El sistema SHALL incluir la calidad de cada punto de la serie y conservar en ella y en el resumen las lecturas `SOSPECHOSO`.

#### Scenario: Punto sospechoso

- **WHEN** un punto de la serie está como `SOSPECHOSO`
- **THEN** la API entrega su valor junto con esa calidad
