# Spec Delta

## ADDED Requirements

### Requirement: Recuperación de huecos

El sistema SHALL buscar, al arrancar el proceso de ingesta y luego cada hora, los tramos de más de 30 minutos sin lecturas de cada estación activa en los últimos 31 días, y SHALL pedirlos a SAT2 como históricos, sensor por sensor, con las mismas pausas y la misma ventana adaptable de la carga inicial y sin duplicar lecturas. El sistema MUST NOT volver a pedir un día ya terminado que SAT2 devolvió después de terminar ese día.

#### Scenario: Instalación apagada varios días

- **WHEN** el proceso de ingesta vuelve a arrancar después de estar detenido una semana
- **THEN** pide a SAT2 los días que faltan y los históricos quedan completos hasta el momento actual

#### Scenario: Lecturas ya guardadas

- **WHEN** se recupera un día del que ya había lecturas
- **THEN** las lecturas existentes no se duplican

#### Scenario: Día sin datos en SAT2

- **WHEN** SAT2 devolvió sin lecturas un día ya terminado
- **THEN** ese día no se vuelve a pedir en las horas siguientes

#### Scenario: Día en curso

- **WHEN** el día de hoy tiene un tramo sin lecturas
- **THEN** se vuelve a pedir en la hora siguiente mientras el tramo siga sin lecturas

#### Scenario: Ciclo durante la recuperación

- **WHEN** corresponde ejecutar un ciclo de 10 minutos mientras avanza una recuperación
- **THEN** el ciclo se ejecuta con prioridad
