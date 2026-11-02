# Design

## Context

Ver `proposal.md` para la motivación. La arquitectura ya está decidida en el [ADR-0001](../../../docs/decisions/0001-arquitectura-destino-weather-track.md): monolito modular, worker con una sola instancia, PostgreSQL 18 y frontend React. Este documento solo resuelve lo que el ADR dejó abierto para implementar las specs.

Restricciones que condicionan el diseño:

- SAT2 es de solo lectura y sus límites de rango, antigüedad y frecuencia todavía no están medidos.
- Las lecturas instantáneas entregan todos los sensores con una sola hora de medición, pero sin identificador de sensor.
- Los históricos se piden por sensor y no informan alarma.
- La capacidad disponible es de 90 horas hasta el 19 de noviembre de 2026.

## Goals / Non-Goals

**Goals:**

- Resolver las decisiones que afectan a varias capas antes de escribir código.
- Mantener el motor de recomendación sin dependencias de red ni de base de datos.
- Dejar el modelo de datos y la API listos para las extensiones del plan, sin construirlas.

**Non-Goals:**

- Evaluar etapas y herramientas del pipeline.
- Pantalla de administración: las cuentas se crean por comando.
- Validación agronómica de pesos y umbrales: es la extensión X2.
- Carga de toda la historia: es la extensión X1.

## Decisions

### D1. Dos fuentes de datos según el uso

El ciclo de 10 minutos usa las lecturas instantáneas y la carga inicial usa los históricos por sensor.

- **Por qué:** el índice necesita las seis lecturas de un mismo instante, y una sola consulta las trae todas. Con históricos serían 11 consultas por ciclo y las horas podrían diferir.
- **Alternativa descartada:** usar solo históricos, que simplifica el cliente pero multiplica las consultas y no informa alarma.

### D2. Regla de vigencia R2 aplicada al leer

El worker guarda la recomendación tal como se calculó y la API aplica R2 al responder, comparando la hora de medición con la hora actual.

- **Por qué:** una recomendación se vuelve vieja con el paso del tiempo, sin que ocurra ningún evento. Si el worker se detiene, no podría actualizarla.
- **Alternativa descartada:** una tarea que marque las recomendaciones vencidas, que falla justo cuando el worker está caído.

### D3. Motor como función pura

Recibe seis lecturas con su calidad y devuelve índice, estado, ΔT y motivos. Aplica R1, R3, R3b y R4, y no conoce la hora actual.

- **Por qué:** los casos de referencia del README se prueban sin infraestructura y el ADR lo exige como confirmación.
- **Versionado:** cada recomendación guarda `TIS-1.1`, de modo que un cambio de pesos no reescribe el pasado.

### D4. Valores fuera de rango físico tratados como faltantes

Los valores vacíos, no numéricos, centinela o fuera de rango se guardan como `FALTANTE`, sin valor. El valor original se conserva solo en el registro de la ejecución.

- **Por qué:** así R1 los cubre sin una cuarta categoría, y el modelo mantiene la regla de que solo `FALTANTE` carece de valor.
- **Alternativa descartada:** marcarlos como `SOSPECHOSO`, porque R4 seguiría calculando el índice con un valor físicamente imposible.

Rangos iniciales, configurables en una tabla declarativa:

| Magnitud | Mínimo | Máximo |
|---|---|---|
| Temperatura (°C) | −50 | 60 |
| Humedad relativa (%) | 0 | 100 |
| Velocidad del viento (km/h) | 0 | 250 |
| Radiación (W/m²) | 0 | 1500 |

### D5. Alarma guardada, pero sin efecto en la recomendación

`OBSERVACION` agrega `alarma`, un booleano que admite nulo cuando la fuente no la informa. La tarjeta la destaca, pero no modifica el estado de la recomendación.

- **Por qué:** el prototipo ya la mostraba y es un dato de la fuente con bajo costo. Todavía no está documentado qué condición la activa, así que usarla en el índice sería inventar una regla.

### D6. Tipo y ventana en cada ejecución de ingesta

`EJECUCION_INGESTA` agrega `tipo` (`CICLO` o `CARGA_INICIAL`), `ventana_desde` y `ventana_hasta`, estas dos solo para cargas.

- **Por qué:** la conexión con la fuente se evalúa solo con los ciclos, y la carga reanudable necesita saber qué ventanas terminó.
- **Reanudación:** la carga avanza del presente al pasado y la clave `(sensor_id, medido_en)` hace que repetir una ventana no duplique datos.

### D7. Cuentas por comando

Un comando administrativo crea cuentas y asigna estaciones, y las semillas crean un usuario de demostración.

- **Por qué:** una pantalla de administración no aporta al flujo principal y consume horas del alcance núcleo.

### D8. Sesión en cookie con identificador opaco en la base

La cookie es `HttpOnly`, `Secure` y `SameSite=Lax`, y dura 8 horas. El servidor guarda solo el hash del identificador en `SESION`, una tabla nueva.

- **Por qué:** la especificación exige invalidar la sesión de inmediato al salir, algo que un token firmado sin estado no permite sin una lista de revocación.
- **Límite de intentos:** los fallos se guardan en `INTENTO_ACCESO`, otra tabla nueva, para que el límite sobreviva a un reinicio de la API.
- **Columnas de `SESION`:** `id`, `usuario_id` (FK con borrado en cascada), `hash_identificador` (único), `creada_en` y `vence_en`.
- **Columnas de `INTENTO_ACCESO`:** `id`, `email` y `ocurrido_en`, con un índice por correo y fecha. Solo guarda fallos; un ingreso correcto borra los del correo.

### D9. Actualización por consulta periódica

El frontend consulta la API cada 60 segundos.

- **Por qué:** el dato cambia cada 10 minutos, así que no se justifica la complejidad de WebSockets ni de eventos del servidor.

### D10. Horas en UTC y presentación en Argentina

La base guarda `timestamptz` y el worker interpreta las horas de SAT2 como `America/Argentina/Buenos_Aires`. La API responde en ISO 8601 con desplazamiento y la interfaz muestra la hora de Argentina, sin depender de la zona del servidor.

### D11. Cliente de SAT2 detrás de una interfaz

El cliente real y el simulado cumplen la misma interfaz, y se eligen con `SAT2_MODO`.

- **Por qué:** permite probar la ingesta sin red, evaluar el sistema sin credenciales y avanzar aunque SAT2 no esté disponible.

### D12. Ventana inicial de 365 días para cargas largas

La carga empieza con ventanas de 365 días como máximo, y las reduce si fallan. La carga de 31 días del alcance núcleo usa una sola ventana por sensor.

- **Por qué:** SAT2 aceptó una consulta de 4 años, pero tardó 51 segundos. Partirla reduce el riesgo de agotar el tiempo de espera, permite reanudar por tramos y es más prudente con el proveedor.
- **Alternativa descartada:** pedir toda la historia en una sola consulta, que es más simple pero pierde todo el avance ante un fallo.

## Límites medidos de SAT2

| Medición | Resultado | Fuente |
|---|---|---|
| Rango por consulta | Al menos 4 años: del 1/1/2022 al 1/1/2026 respondió bien | Prueba manual del responsable, 1/11/2026 |
| Tiempo y tamaño con 4 años | 51 segundos y 6 MB para un sensor | Prueba manual del responsable |
| Ventanas de 1 a 365 días | Todas completas, sin recorte y en orden descendente | Script, modo real, 1/11/2026 |
| Tiempo con 365 días | 13,25 segundos | Script, modo real |
| Tiempo con 31 días | 1,65 segundos | Script, modo real |
| Datos más antiguos | Hay datos el 21/09/2022, la fecha de alta | Script, modo real |
| Completitud | 52.283 de 52.560 registros esperados en 365 días (99,5 %) | Script, modo real |

Las mediciones corresponden a un solo sensor, de temperatura a 2 m. Los registros faltantes confirman que hay huecos reales, así que la serie nunca debe interpolarse.

## Risks / Trade-offs

- [Los límites reales de SAT2 cambian o son menores en otros sensores] → Ventana adaptable hasta un día.
- [Una consulta instantánea no trae todos los sensores] → Los ausentes quedan como `FALTANTE` y R1 impide la recomendación.
- [El sensor de humedad a 2 m sigue dando lecturas anómalas] → R4 limita el estado a `PRECAUCION`. La estación nunca daría `APTO` mientras dure el problema, y por eso conviene revisarlo en campo.
- [Los rangos físicos descartan un valor real extremo] → Son configurables y el valor original queda en el registro.
- [Las tablas `SESION` e `INTENTO_ACCESO` crecen sin límite] → Se eliminan los registros vencidos en el ciclo del worker.
- [Una sola instancia del worker es un punto único de falla] → R2 evita presentar datos viejos como vigentes y `EJECUCION_INGESTA` hace visible la falla.

## Migration Plan

No hay datos que migrar: el prototipo no persiste nada y la carga inicial reconstruye los últimos 31 días desde SAT2. El prototipo sigue disponible hasta que el MVP cubra sus funciones. Para revertir, se vuelve a la versión anterior de las imágenes y a la migración previa de la base.

## Open Questions

- Si SAT2 limita la frecuencia de consultas. Las pausas y la detención ante errores cubren ese caso.
- Condición que activa la alarma de SAT2. Se consulta a TECMES; hoy solo se muestra.
- Proveedor del servidor. Se decide antes de A13 y no afecta a estas specs.
