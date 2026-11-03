# Design

## Context

Ver `proposal.md` para la motivación y las specs de este cambio para el comportamiento.

Estado actual:

- `sincronizar_catalogo` crea o actualiza una `estacion` por cada equipo de `RecuperarEquipos` y nunca cambia `activa`. El ciclo y la carga inicial ya filtran por `activa`.
- La API identifica las estaciones por su `id` interno, y el frontend arma las rutas `/estaciones/:id`.
- La pantalla `/` lista las estaciones asignadas y, si hay una sola, redirige a su decisión. Dentro de la decisión no hay forma de cambiar de estación.
- `SAT2_MODO` admite `real`, `simulado` y `escenarios`. El modo `escenarios` siembra 10 equipos ficticios (101 a 110), uno por situación, y lo usan las pruebas de extremo a extremo HU1 y HU2, las pruebas negativas, la guía de la demo y las capturas.
- Nada impide hoy arrancar en modo real sobre una base que tuvo datos simulados, ni al revés.

## Goals / Non-Goals

**Goals:**

- Que la interfaz trate a la estación solo como un equipo de SAT2.
- Que ninguna base mezcle datos reales y ficticios.
- Que las situaciones de la recomendación sigan probadas de punta a punta sin mostrarse como estaciones.

**Non-Goals:**

- Permisos por estación: los define `weather-track-registro-cuentas` (todas las cuentas ven todas).
- Mapa de estaciones o búsqueda: con una estación no hacen falta.

## Decisions

### D1. Inactivación solo con una sincronización exitosa

El catálogo calcula la diferencia entre los equipos registrados y los que devolvió `RecuperarEquipos`. Los que faltan pasan a `activa = false` con `inactiva_desde = ahora`; los que vuelven, a `activa = true` con `inactiva_desde = null`. Si la consulta falla o devuelve una lista vacía, no cambia nada.

- **Por qué la lista vacía no inactiva:** una respuesta vacía por un problema de SAT2 apagaría todas las estaciones de golpe. Un equipo dado de baja de verdad desaparece solo, mientras los demás siguen llegando.
- **Alternativa descartada:** inactivar recién después de varias sincronizaciones sin el equipo. Agrega estado y demora sin una ventaja clara, porque reactivar es automático.

### D2. Selector en el encabezado

El encabezado de las pantallas protegidas muestra un `<select>` nativo con todas las estaciones, ordenadas por nombre, con el sufijo "(Equipo inactivo)" en las inactivas. Elegir una navega a `/estaciones/:id`. La ruta `/` redirige a la primera estación activa o, si no hay ninguna activa, a la primera.

- **Por qué un `<select>` nativo:** es accesible con teclado y lector de pantalla, funciona bien en el móvil y no agrega dependencias.
- **Alternativa descartada:** mantener la lista en `/`. Obliga a volver atrás para cambiar de estación.

### D3. Respuesta de la API para un equipo inactivo

`EstacionResumen` y la respuesta de condiciones actuales agregan `activa` e `inactiva_desde`. Para una estación inactiva, las condiciones actuales devuelven la lista de sensores sin lecturas y la recomendación no se consulta desde el frontend. Los históricos no cambian: se sirven igual para estaciones activas e inactivas.

### D4. Naturaleza de la base

Una tabla `configuracion_base` de una sola fila guarda `naturaleza` (`REAL`, `FICTICIA` o `COPIA_DE_PRUEBA`) y `fijada_en`. La fija la primera ingesta o siembra. Al arrancar, el worker y la API la comparan con `SAT2_MODO`:

| Modo | Admite |
|---|---|
| `real` | Base vacía o `REAL` |
| `simulado` | Base vacía o `FICTICIA` |
| `prueba` | Base vacía, `FICTICIA` o `COPIA_DE_PRUEBA` |

Si no coinciden, el proceso sale con un mensaje que explica cómo seguir. La instalación local ya tiene la base real en el proyecto `weather-track` por defecto: este control la protege de un cambio de modo por error.

- **Alternativa descartada:** marcar cada observación con su origen. Permite detectar la mezcla, pero no evitarla, y agrega una columna a la tabla más grande.

### D5. Modo de prueba

- No crea el cliente de SAT2: el worker en modo `prueba` no programa el ciclo ni la carga.
- Al arrancar, asegura dos estaciones con los equipos 1 y 2 y los nombres "Caso de prueba - 1" y "Caso de prueba - 2". Si la base está vacía, siembra para el caso 1 los 31 días simulados, una sola vez, terminando en la hora de arranque.
- El caso 1 muestra lo guardado, así que sus datos envejecen: pasada media hora, la pantalla los marca como desactualizados. Es el comportamiento real ante una fuente detenida.
- El aviso "Modo de prueba" sale de un campo `modo` en la respuesta de salud, que el frontend ya consulta.

### D6. Copia de la base real para probar

Un comando `herramientas/preparar_copia_de_prueba.py` hace `pg_dump` de la base del proyecto real en solo lectura y la restaura en un proyecto aislado (`-p wt-prueba` por defecto). Luego marca la copia como `COPIA_DE_PRUEBA` y renombra el equipo real a "Caso de prueba - 1". La base original no se escribe en ningún momento.

- **Por qué una copia:** el responsable quiere ver los datos reales en el caso 1, pero agregar un equipo ficticio a la base real lo dejaría como "Equipo inactivo" en producción cuando se vuelva al modo real.
- La copia contiene las cuentas reales, así que se borra con el proyecto aislado (`docker compose -p wt-prueba down -v`) al terminar.

### D7. Modo simulado con el nombre real

El catálogo simulado pasa a llamar a su equipo "INTA Pergamino", con las coordenadas públicas aproximadas de la ciudad de Pergamino, no las de la estación. El aviso "Datos simulados" sale del mismo campo `modo` de D5. Al implementar, se compara el nombre con la `descripcion` real de SAT2 en la base local, sin leer credenciales.

### D8. Las situaciones de la recomendación, en las pruebas

Se elimina `ClienteSat2Escenarios` y su JSON. Un módulo de pruebas `fixtures_situaciones` carga cada situación (favorable, índice elevado, inversión con índice bajo, inversión con poco viento, lectura faltante, desactualizada, sospechosa, fuente caída, con históricos) directo en la base de la prueba, como observaciones y ejecuciones de ingesta de la estación 1. Las pruebas de extremo a extremo y las negativas lo invocan antes de cada caso, en su proyecto aislado.

- **Consecuencia aceptada:** la demo en vivo muestra la estación real o la simulada, y las demás situaciones se presentan con las capturas y los resultados de las pruebas.

## Risks / Trade-offs

- [Un error de SAT2 que omita un equipo lo marca inactivo] → Se reactiva solo en la siguiente sincronización, y sus datos no se pierden.
- [El control de naturaleza bloquea a quien cambia de modo en su máquina] → El mensaje dice exactamente qué hacer: usar otro proyecto con `-p` o una base nueva.
- [La copia de prueba tiene datos personales] → Solo se crea a pedido y se documenta cómo borrarla.
- [Reescribir las pruebas de extremo a extremo] → Se hace en el mismo grupo que elimina `escenarios`, para que nunca queden sin cobertura.

## Migration Plan

1. Archivar `weather-track-mvp-nucleo` (tarea compartida con `weather-track-registro-cuentas`).
2. Migración aditiva: columna `inactiva_desde` y tabla `configuracion_base`. Una base con observaciones y sin fila de configuración se marca según el `SAT2_MODO` con el que arranca por primera vez después de la migración. Por eso el proyecto real se actualiza en modo real.
3. Para volver atrás: el `downgrade` borra la tabla y la columna.

## Open Questions

Ninguna.
