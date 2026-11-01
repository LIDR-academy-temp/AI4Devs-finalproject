# Spec Delta

## Purpose

Mantiene los datos de las estaciones actualizados y con su calidad identificada, obteniéndolos de SAT2 de forma automática e independiente de las sesiones de usuario.

## ADDED Requirements

### Requirement: Ciclo automático de lecturas

El sistema SHALL obtener cada 10 minutos las lecturas actuales de todas las estaciones activas, aunque no haya ninguna sesión abierta.

#### Scenario: Sin personas conectadas

- **WHEN** pasan 10 minutos y no hay ninguna sesión abierta
- **THEN** el sistema obtiene y guarda las lecturas nuevas

#### Scenario: Medición ya guardada

- **WHEN** SAT2 informa una medición ya guardada para ese instante
- **THEN** el sistema no duplica las lecturas

### Requirement: Sincronización del catálogo

El sistema SHALL mantener el catálogo de estaciones y sensores a partir de SAT2, identificando la magnitud y la altura de cada sensor.

#### Scenario: Sensores a distinta altura

- **WHEN** el catálogo informa temperatura a 2 m y a 10 m
- **THEN** ambos sensores quedan registrados con la magnitud temperatura y su altura correspondiente

#### Scenario: Nombre con tilde

- **WHEN** una lectura y el catálogo escriben el nombre del sensor con distinta acentuación o mayúsculas
- **THEN** el sistema vincula la lectura con el sensor correcto

#### Scenario: Sensor desconocido

- **WHEN** llega una lectura de un sensor que no está en el catálogo
- **THEN** el sistema no la guarda como observación y registra el nombre en el detalle de la ejecución

### Requirement: Carga inicial

El sistema SHALL cargar por sensor los últimos 31 días de históricos de cada estación activa, sin interrumpir el ciclo de 10 minutos.

#### Scenario: Primera puesta en marcha

- **WHEN** se activa una estación sin datos
- **THEN** el sistema carga sus últimos 31 días y los históricos quedan disponibles para consulta

#### Scenario: Carga interrumpida

- **WHEN** la carga se interrumpe y vuelve a ejecutarse
- **THEN** el sistema completa lo que falta sin duplicar datos

#### Scenario: Ciclo durante la carga

- **WHEN** corresponde ejecutar un ciclo de 10 minutos mientras avanza la carga inicial
- **THEN** el ciclo se ejecuta con prioridad

### Requirement: Ventana de consulta adaptable

El sistema SHALL reducir la ventana de consulta de históricos a la mitad cuando la consulta falla o su respuesta está incompleta, hasta llegar a un día.

#### Scenario: Consulta rechazada

- **WHEN** SAT2 rechaza una consulta de históricos de 31 días
- **THEN** el sistema repite el período con ventanas de 15 días o menos

#### Scenario: Respuesta recortada

- **WHEN** las fechas devueltas no cubren el inicio del período pedido y hay datos más antiguos
- **THEN** el sistema trata la respuesta como incompleta y pide lo que falta

### Requirement: Uso prudente de la fuente

El sistema MUST hacer una sola consulta a SAT2 por vez, con una pausa configurable entre consultas de históricos, y MUST detener la carga inicial ante errores repetidos.

#### Scenario: Errores repetidos

- **WHEN** fallan 5 consultas consecutivas de históricos, incluida la ventana de un día
- **THEN** el sistema detiene la carga, registra el error y la retoma en el próximo intento programado

### Requirement: Sesión con SAT2

El sistema SHALL renovar la sesión con SAT2 antes de que venza y reintentar una vez ante un error de autorización.

#### Scenario: Carga más larga que la sesión

- **WHEN** una carga dura más que la vigencia del token de SAT2
- **THEN** el sistema se autentica de nuevo y continúa sin perder datos

#### Scenario: Error de autorización

- **WHEN** SAT2 rechaza una consulta por autorización dos veces seguidas
- **THEN** el sistema registra la ejecución con resultado de error

### Requirement: Protección de credenciales de SAT2

El sistema MUST leer las credenciales de SAT2 desde el entorno del proceso de ingesta, y MUST NOT incluirlas en la API, el navegador, el código, los registros ni los datos de prueba.

#### Scenario: Registro de una consulta

- **WHEN** el sistema registra una consulta a SAT2
- **THEN** el registro no contiene la contraseña ni el token

#### Scenario: Faltan credenciales

- **WHEN** el proceso de ingesta inicia sin credenciales y fuera del modo simulado
- **THEN** informa el error de configuración, sin imprimir valores, y no consulta SAT2

### Requirement: Modo simulado

El sistema SHALL ofrecer un modo que produzca datos ficticios y no acceda a SAT2, para desarrollo, pruebas y evaluación sin credenciales reales.

#### Scenario: Evaluación sin credenciales

- **WHEN** el sistema inicia en modo simulado
- **THEN** genera lecturas sin contactar a SAT2 y el flujo completo funciona

### Requirement: Normalización de lecturas

El sistema SHALL convertir las lecturas a valores numéricos e instantes únicos en UTC, aceptando coma decimal y los formatos de fecha que entrega la fuente, y guardar las series sin duplicados.

#### Scenario: Valor con coma decimal

- **WHEN** llega el valor `"13,81"`
- **THEN** el valor guardado es 13.81

#### Scenario: Serie en orden descendente

- **WHEN** una respuesta de históricos llega de la fecha más reciente a la más antigua
- **THEN** las consultas posteriores la devuelven en orden ascendente

#### Scenario: Hora local

- **WHEN** llega una fecha sin zona horaria
- **THEN** se interpreta como hora de Argentina

### Requirement: Clasificación de la calidad del dato

El sistema SHALL clasificar cada lectura como `OK`, `FALTANTE` o `SOSPECHOSO`. Un valor vacío, no numérico, centinela o fuera de rango físico MUST quedar como `FALTANTE`, sin valor.

#### Scenario: Valor centinela

- **WHEN** una lectura trae el valor centinela de dato faltante de la fuente
- **THEN** queda como `FALTANTE` y sin valor

#### Scenario: Fuera de rango físico

- **WHEN** una humedad relativa vale 130 %
- **THEN** queda como `FALTANTE` y sin valor

#### Scenario: Humedad incoherente entre alturas

- **WHEN** en un mismo instante la humedad relativa a 2 m y a 10 m difiere en más de 25 puntos
- **THEN** ambas lecturas quedan como `SOSPECHOSO` y conservan su valor

### Requirement: Conservación de la alarma de la fuente

El sistema SHALL guardar la alarma que SAT2 informa por lectura, o dejarla sin valor cuando la fuente no la informa.

#### Scenario: Lectura en alarma

- **WHEN** una lectura actual llega con alarma activa
- **THEN** queda guardada con alarma activa

#### Scenario: Dato histórico

- **WHEN** una lectura proviene de históricos, que no informan alarma
- **THEN** queda guardada sin valor de alarma

### Requirement: Registro de ejecuciones

El sistema SHALL registrar cada ejecución de ingesta con su tipo, inicio, fin, resultado y cantidad de lecturas guardadas.

#### Scenario: Ciclo exitoso

- **WHEN** termina un ciclo sin errores
- **THEN** queda registrado con tipo `CICLO` y resultado `EXITO`

#### Scenario: Fuente no disponible

- **WHEN** SAT2 no responde durante un ciclo
- **THEN** queda registrado con resultado `ERROR`, y el ciclo siguiente se ejecuta con normalidad
