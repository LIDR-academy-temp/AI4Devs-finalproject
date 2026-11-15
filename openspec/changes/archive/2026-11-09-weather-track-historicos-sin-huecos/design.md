# Design

## Context

- `app/ingesta/carga_inicial.py` carga por sensor los últimos 31 días. Avanza del presente al pasado con una ventana adaptable, hace una pausa de 2 segundos entre consultas, no duplica lecturas (`ON CONFLICT DO NOTHING`) y marca las humedades incoherentes como sospechosas.
- El worker la ejecuta cada hora, pero solo hasta que tiene un `EXITO` por estación. Un sensor se da por completo si tiene lecturas en el primer día de la ventana, aunque le falten días en el medio.
- El ciclo de 10 minutos guarda solo la lectura actual (`RecuperarInstantaneos`).
- La base local del responsable tiene un hueco del 1/11 a las 21:10 al 9/11 a las 18:40.
- El 9 de noviembre de 2026 el responsable eligió recuperar los huecos de los últimos 31 días, abrir el detalle en Día y permitir el rango manual hasta el mismo día del mes siguiente.

## Goals / Non-Goals

**Goals:**

- Que un apagado de la instalación o una caída de SAT2 no dejen huecos permanentes en los últimos 31 días.
- No sobrecargar a SAT2: sin pedir dos veces lo que ya devolvió.

**Non-Goals:**

- Cargar historia de más de 31 días. El calendario permite consultar un año, pero lo anterior a 31 días solo está si ya estaba guardado. Sigue como mejora futura (README, sección 1.6).
- Rellenar con valores inventados. Un tramo que SAT2 no tiene sigue como hueco, y el gráfico lo muestra cortado.

## Decisions

### D1. Huecos por estación, recuperados por sensor

`recuperar_huecos(sesion, cliente, estacion, ahora)`, en `app/ingesta/recuperacion.py`:

1. Toma los instantes distintos con lecturas de la estación en la ventana, desde las 00:00 de hace 30 días hasta ahora. Se mira la estación y no cada sensor: un sensor que SAT2 nunca informa no debe disparar consultas cada hora.
2. Es un hueco cada tramo de más de **30 minutos** sin instantes: entre dos lecturas, desde el inicio de la ventana hasta la primera o desde la última hasta ahora. Las lecturas llegan cada 10 minutos, así que 30 minutos son tres lecturas perdidas seguidas.
3. Pasa los huecos a días de Argentina, porque `RecuperarHistoricos` pide fechas, y agrupa los días consecutivos.
4. Para cada sensor y cada grupo, usa `_cargar_sensor` de la carga inicial, con la misma pausa, la misma ventana adaptable y el mismo tope de errores seguidos.
5. Marca las humedades incoherentes de los días recuperados.

El umbral y la ventana son constantes de `recuperacion.py`.

### D2. Lo que SAT2 ya devolvió no se vuelve a pedir

Cada recuperación queda en `ejecucion_ingesta` con el tipo nuevo `RECUPERACION` y los días pedidos en `ventana_desde` y `ventana_hasta`.

Un día **ya terminado** se descarta si una recuperación `EXITO` o `PARCIAL` lo cubrió y empezó más de una hora después de que terminara ese día. Así, el día queda pedido una vez con SAT2 ya completo. El día de hoy se puede volver a pedir cada hora mientras tenga huecos.

La migración `0005` amplía la restricción de `ejecucion_ingesta.tipo`, con `upgrade` y `downgrade`. El `downgrade` borra antes las ejecuciones de tipo `RECUPERACION`, que la restricción anterior no admite.

### D3. Cuándo corre

En la misma tarea horaria que la carga inicial y después de ella, por estación activa: primero la carga inicial si falta, después la recuperación. La tarea ya corre al arrancar el worker (`next_run_time`), así que **un apagado se recupera apenas vuelve a encenderse**.

El ciclo de 10 minutos conserva la prioridad: comparte el cliente serializado, que toma el bloqueo por consulta y no por carga completa.

En modo `prueba` no corre, porque ese modo no consulta SAT2. En modo `simulado` usa el cliente simulado, como la carga inicial.

### D4. El detalle abre en Día

`DetalleSensor.tsx` empieza con `dia` seleccionado en lugar de `semana`.

### D5. Rango manual hasta el mismo día del mes siguiente

- **Pantalla:** la fecha de fin puede estar hasta 31 días después de la de inicio (`DIAS_MAXIMOS = 31`, comparando diferencias de fechas y no cantidad de días). Del 1/10 al 1/11 está permitido y del 1/10 al 2/11 no. El mensaje de error y la ayuda lo dicen con un ejemplo.
- **API:** `RANGO_MAXIMO` pasa de 31 a 32 días entre `desde` y `hasta`. Del 1/10 a las 00:00 al 1/11 a las 23:59 son 31 días y 23 horas con 59 minutos.
- El botón Mes sigue siendo los últimos 31 días.

## Risks / Trade-offs

- [Un hueco largo genera muchas consultas] → Son las mismas de la carga inicial: un sensor por vez, con pausas y la ventana adaptable. El hueco actual, de 8 días, son unas 11 consultas, una por sensor.
- [SAT2 no tiene datos de un día] → Ese día se pide una vez después de terminado y no se insiste. El gráfico lo muestra como hueco, como hoy.
- [El umbral de 30 minutos deja pasar huecos cortos] → Una o dos lecturas perdidas no cambian el gráfico ni el resumen. Si hiciera falta, se ajusta la constante.

## Migration Plan

1. Se despliega: la migración `0005` se aplica sola al levantar la pila.
2. Al arrancar, el worker recupera el hueco del 1 al 9 de noviembre.
3. El responsable comprueba los gráficos.

**Vuelta atrás:** el `downgrade` de `0005` borra las ejecuciones de recuperación y restaura la restricción. Las lecturas recuperadas quedan: son lecturas reales de SAT2.

## Open Questions

Ninguna.
