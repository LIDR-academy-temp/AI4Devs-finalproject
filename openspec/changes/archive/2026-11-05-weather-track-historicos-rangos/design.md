# Design

## Context

La pantalla de detalle del sensor calcula el rango en el navegador y lo pide a `GET /estaciones/{estacionId}/sensores/{sensorId}/historico` con `desde` y `hasta`. La API exige que `hasta` sea posterior a `desde`, que el rango no supere 31 días y que las fechas estén entre los años 2000 y 2100. Respuestas del responsable del 5 de noviembre de 2026: botones Día, Semana y Mes; rango manual de hasta 31 días dentro del último año.

## Goals / Non-Goals

**Goals:**

- Tres rangos rápidos y un rango manual con calendario.
- Los mismos límites en la pantalla y en la API, para que nadie pueda pedir lo que la pantalla no ofrece.

**Non-Goals:**

- Rangos de más de 31 días o series agregadas por hora o por día.
- Retención o borrado de lecturas viejas.

## Decisions

### D1. El año se cuenta en días calendario de Argentina

El primer día permitido es el mismo día del año anterior, en hora de Argentina, desde las 00:00. Si hoy es 29 de febrero, el primero es el 28 de febrero del año anterior. La API acepta `desde` a partir de ese instante. Contar 365 días exactos haría que el calendario ofrezca un día que la API rechaza durante parte de la jornada.

### D2. El futuro tiene una tolerancia de 5 minutos

La API rechaza un `hasta` posterior a su hora actual más 5 minutos. La tolerancia absorbe la diferencia entre el reloj del navegador y el del servidor, porque los botones rápidos terminan en "ahora" según el navegador. Un `hasta` futuro no agregaría datos, pero el límite deja explícita la regla.

### D3. Los límites viven en un solo lugar de cada lado

En la API, junto a `RANGO_MAXIMO`, en `app/api/lecturas.py`, con la hora de la dependencia `Ahora` para poder probarla. En el frontend, en `servicios/serie.ts`, que ya arma los rangos. La regla del año se escribe dos veces, una por capa, y la cubren pruebas en ambas.

### D4. Rango manual con `<input type="date">`

El calendario es el nativo del navegador, con `min` y `max`: no suma dependencias y funciona en el celular. El rango va desde las 00:00 del día de inicio hasta las 23:59:59 del día de fin, o hasta el momento actual si el día de fin es hoy. La pantalla valida antes de consultar y explica el error junto a los campos: fin anterior al inicio, más de 31 días, fecha futura o anterior a un año.

### D5. Títulos según el rango

El gráfico se titula "últimas 24 horas", "últimos 7 días", "últimos 31 días" o "del 01/10/2026 al 07/10/2026", según lo elegido.

## Risks / Trade-offs

- [Una persona con el reloj muy adelantado ve un error al usar los botones rápidos] → La tolerancia de 5 minutos cubre las diferencias habituales; el mensaje explica que la fecha no puede ser futura.
- [Un año de antigüedad sin datos tan viejos] → La instalación guarda desde la carga inicial. Un rango sin lecturas muestra el aviso que ya existe: "No hay datos válidos en este período".

## Migration Plan

Sin migración. Se despliega con `docker compose up --build`.

## Open Questions

Ninguna.
