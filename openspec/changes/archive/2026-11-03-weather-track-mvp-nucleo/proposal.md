# Proposal

## Why

Quien aplica fitosanitarios necesita saber si puede hacerlo ahora sin riesgo de deriva, pero hoy solo dispone de valores sueltos y sin garantía de vigencia. El [ADR-0001](../../../docs/decisions/0001-arquitectura-destino-weather-track.md) define la arquitectura destino y el [plan](../../../docs/plan/plan-implementacion-entrega-2.md) fija la Entrega 2 para el 19 de noviembre de 2026, por lo que hace falta un contrato verificable del alcance núcleo antes de escribir código.

## What Changes

- Se incorporan cuentas propias y acceso restringido por estación.
- Se obtienen datos de SAT2 de forma automática, con carga inicial de 31 días y un ciclo cada 10 minutos, independientes de las sesiones de usuario.
- Se normalizan las lecturas y se clasifica su calidad.
- Se calcula una recomendación de aplicación con el índice TIS y las reglas R1 a R4, que siempre explica su motivo.
- Se presentan las condiciones actuales con su vigencia y calidad, y los históricos de 7 y 31 días.
- Quedan fuera de este cambio las extensiones X1 a X4 del plan y la evaluación del pipeline.

## Capabilities

### New Capabilities

- `account-access`: inicio y cierre de sesión con cuentas propias, y autorización por estación.
- `sat2-ingestion`: obtención automática de datos de SAT2, normalización, calidad del dato y registro de cada ejecución.
- `application-recommendation`: cálculo, vigencia y explicación de la recomendación de aplicación.
- `station-conditions`: condiciones actuales de una estación, con su calidad, alarmas y vigencia.
- `sensor-history`: serie histórica de un sensor y su resumen estadístico.

### Modified Capabilities

Ninguna: el repositorio aún no tiene specs.

## Impact

- **Código:** se crean el backend, el worker y el frontend descritos en el ADR-0001.
- **API:** se implementan los endpoints de la sección 4 del README, más autenticación y listado de estaciones.
- **Datos:** se crea el modelo de la sección 3 del README, con dos ajustes definidos en `design.md`: alarma por lectura y tipo de ejecución de ingesta.
- **Sistemas externos:** lectura desde SAT2, con una consulta por vez y sin escritura.
- **Documentación:** el README se alinea con estas specs en el código de motivo `INDICE_ELEVADO`, el campo `alarma` y el tipo de ejecución.
