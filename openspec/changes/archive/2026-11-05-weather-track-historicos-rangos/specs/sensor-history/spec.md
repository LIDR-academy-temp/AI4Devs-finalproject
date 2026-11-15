# Spec Delta

## MODIFIED Requirements

### Requirement: Consulta de la serie por la API

El sistema SHALL entregar, para un sensor de una estación autorizada y un rango de hasta 31 días, sus lecturas en orden ascendente, a partir de los datos guardados y sin consultar a SAT2. El rango MUST NOT empezar antes de las 00:00, hora de Argentina, del mismo día del año anterior, ni terminar más de 5 minutos después de la hora del servidor.

#### Scenario: Rango válido

- **WHEN** se pide un rango de 7 días
- **THEN** la API devuelve las lecturas del período en orden ascendente

#### Scenario: Rango inválido

- **WHEN** se pide más de 31 días o una fecha final anterior a la inicial
- **THEN** la API responde con estado 422 y un mensaje que explica el error

#### Scenario: Rango de hace más de un año

- **WHEN** se pide un rango que empieza antes del mismo día del año anterior
- **THEN** la API responde con estado 422 y un mensaje que explica el error

#### Scenario: Primer día permitido

- **WHEN** se pide un rango que empieza a las 00:00, hora de Argentina, del mismo día del año anterior
- **THEN** la API devuelve las lecturas del período

#### Scenario: Rango futuro

- **WHEN** se pide un rango que termina más de 5 minutos después de la hora del servidor
- **THEN** la API responde con estado 422 y un mensaje que explica el error

#### Scenario: Sensor de otra estación

- **WHEN** el sensor pedido no pertenece a la estación indicada
- **THEN** la API responde con estado 404

### Requirement: Rangos en la pantalla

La pantalla de históricos SHALL ofrecer tres rangos medidos hasta el momento de la consulta: Día (últimas 24 horas), Semana (últimos 7 días) y Mes (últimos 31 días). También SHALL ofrecer un rango manual con calendario, de una fecha de inicio a una de fin, en hora de Argentina. El calendario MUST NOT ofrecer fechas futuras ni anteriores al mismo día del año anterior, y la pantalla MUST NOT consultar un rango manual de más de 31 días o con la fecha de fin anterior a la de inicio.

#### Scenario: Selección de rango

- **WHEN** la persona elige Mes
- **THEN** ve el gráfico de los últimos 31 días con la hora de Argentina

#### Scenario: Rango manual válido

- **WHEN** la persona elige del 1 al 7 de octubre
- **THEN** ve el gráfico desde las 00:00 del 1 hasta las 23:59 del 7 de octubre, hora de Argentina

#### Scenario: Rango manual que termina hoy

- **WHEN** la fecha de fin del rango manual es hoy
- **THEN** el rango termina en el momento de la consulta

#### Scenario: Rango manual inválido

- **WHEN** la persona elige más de 31 días, una fecha de fin anterior a la de inicio, una fecha futura o una anterior a un año
- **THEN** la pantalla explica el error junto a las fechas y no consulta la API
