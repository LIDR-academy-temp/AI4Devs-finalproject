# sat2-ingestion Specification

## Purpose
Mantiene los datos de las estaciones actualizados y con su calidad identificada, obteniéndolos de SAT2 de forma automática e independiente de las sesiones de usuario.

## Requirements

### Requirement: Ciclo automático de lecturas

El sistema SHALL obtener cada 10 minutos las lecturas actuales de todas las estaciones activas, aunque no haya ninguna sesión abierta.

#### Scenario: Sin personas conectadas

- **WHEN** pasan 10 minutos y no hay ninguna sesión abierta
- **THEN** el sistema obtiene y guarda las lecturas nuevas

#### Scenario: Medición ya guardada

- **WHEN** SAT2 informa una medición ya guardada para ese instante
- **THEN** el sistema no duplica las lecturas

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

El sistema MUST tomar las credenciales de SAT2 de la configuración cifrada que carga un administrador o, en su defecto, del entorno del proceso de ingesta. Solo el proceso de ingesta MUST poder leerlas: la API MUST NOT tener la clave para descifrarlas ni las variables con credenciales de SAT2. Las credenciales MUST NOT aparecer en el navegador, el código, los registros, los correos ni los datos de prueba.

#### Scenario: Registro de una consulta

- **WHEN** el sistema registra una consulta a SAT2
- **THEN** el registro no contiene la contraseña ni el token

#### Scenario: Faltan credenciales

- **WHEN** el proceso de ingesta inicia en modo real sin configuración guardada ni credenciales en el entorno
- **THEN** informa el error de configuración, sin imprimir valores, y no consulta SAT2

#### Scenario: Entorno de la API

- **WHEN** se inspecciona la configuración con la que arranca la API
- **THEN** no contiene ninguna variable con credenciales de SAT2 ni la clave privada, solo la clave pública

### Requirement: Cuentas sin relación con SAT2

Las cuentas comunes de Weather Track MUST NOT tener relación con la cuenta de SAT2: ningún flujo de cuentas pide, muestra ni usa sus credenciales.

#### Scenario: Registro de una cuenta

- **WHEN** una persona se registra, confirma su cuenta o recupera la contraseña
- **THEN** ningún formulario, respuesta ni correo menciona ni usa la cuenta de SAT2

### Requirement: Modo simulado

El sistema SHALL ofrecer un modo que produzca datos ficticios y no acceda a SAT2, para desarrollo, pruebas y evaluación sin credenciales reales. La estación simulada SHALL llamarse como la estación real, y la aplicación MUST mostrar en todas sus pantallas el aviso "Datos simulados".

#### Scenario: Evaluación sin credenciales

- **WHEN** el sistema inicia en modo simulado
- **THEN** genera lecturas sin contactar a SAT2 y el flujo completo funciona

#### Scenario: Aviso de datos simulados

- **WHEN** una persona usa la aplicación en modo simulado
- **THEN** ve la estación con el nombre de la real y el aviso "Datos simulados" en cada pantalla

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

### Requirement: Sistema de unidades

El sistema SHALL guardar y mostrar temperatura en °C, viento en km/h, radiación en W/m², humedad en %, presión en hPa y lluvia en mm. Una lectura de temperatura, humedad, viento o radiación en otra unidad MUST quedar como `FALTANTE`, sin convertirse.

#### Scenario: Variantes de escritura de la fuente

- **WHEN** el catálogo informa `km/H`, `ºC` o `W/m2`
- **THEN** el sistema guarda `km/h`, `°C` y `W/m²`

#### Scenario: Viento en otra unidad

- **WHEN** el catálogo informa el viento en `mph`
- **THEN** sus lecturas quedan como `FALTANTE`, se registra un aviso y la recomendación es `DATOS_INSUFICIENTES`

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

### Requirement: Origen de la configuración de SAT2

En modo real, el proceso de ingesta SHALL usar la configuración de SAT2 guardada por un administrador, si existe. Si no existe, SHALL usar las variables del entorno. Si existe pero no puede descifrarla, MUST registrar el error sin valores y MUST NOT consultar SAT2 ni volver a las variables del entorno.

#### Scenario: Sin configuración guardada

- **WHEN** el worker arranca en modo real y nadie guardó una configuración
- **THEN** usa la URL y las credenciales del entorno

#### Scenario: Configuración guardada

- **WHEN** hay una configuración guardada por un administrador
- **THEN** el worker la usa, aunque el entorno tenga otras variables

#### Scenario: Cambio de configuración

- **WHEN** un administrador guarda una configuración nueva con el worker en marcha
- **THEN** el ciclo siguiente abre una sesión nueva con SAT2 con esa configuración, sin reiniciar el worker

#### Scenario: No se puede descifrar

- **WHEN** hay una configuración guardada y falta la clave privada o no corresponde
- **THEN** el worker registra el error sin valores, el ciclo termina en error y no se consulta SAT2

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
