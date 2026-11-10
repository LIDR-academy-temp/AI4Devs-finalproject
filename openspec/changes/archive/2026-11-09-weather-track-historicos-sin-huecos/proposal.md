# Proposal

## Why

El 9 de noviembre de 2026 el responsable revisó la aplicación con los datos reales de INTA Pergamino. Los gráficos de Día y de Semana mostraban pocas lecturas, y el de Mes terminaba una semana antes de la fecha. El gráfico no tenía errores; faltaban datos en la base:

| Período | Lecturas guardadas |
|---|---|
| 2/10 al 31/10 | Completas: 144 instantes por día |
| 1/11 | Hasta las 21:10 |
| 2/11 | 3 instantes |
| 3/11 al 8/11 | Ninguna: la instalación estuvo apagada |
| 9/11 | Desde las 18:40, cuando se volvió a encender |

El worker solo pide a SAT2 la lectura actual cada 10 minutos. La carga de los últimos 31 días corre una sola vez, así que **nada recupera lo que se perdió mientras la instalación estuvo apagada** o SAT2 no respondió.

La misma revisión encontró dos detalles más:

- El detalle de un sensor abre en Semana, y el responsable espera Día.
- El rango manual del 1/10 al 1/11 se rechaza por superar 31 días. Abarca 32 días de calendario, pero el responsable espera poder consultar un mes completo de esa forma.

## What Changes

- **Recuperación de huecos.** Al arrancar y cada hora, el worker busca en los últimos 31 días los tramos de más de 30 minutos sin lecturas de cada estación activa. Los pide a SAT2 como históricos, con las pausas y la ventana adaptable de la carga inicial y sin duplicar lecturas. Un día ya terminado que SAT2 devolvió sin datos no se vuelve a pedir en cada hora.
- **El detalle de un sensor abre en Día**, las últimas 24 horas.
- **Rango manual de hasta un mes:** la fecha de fin puede estar hasta 31 días después de la de inicio, por ejemplo del 1/10 al 1/11. La API acepta hasta 32 días entre el inicio y el fin. Los botones no cambian: Mes sigue siendo los últimos 31 días.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sat2-ingestion`: se agrega la recuperación de huecos.
- `sensor-history`: el rango manual llega hasta el mismo día del mes siguiente, y el detalle abre en Día.

## Impact

- **Base de datos:** migración `0005` para agregar el tipo de ejecución `RECUPERACION`.
- **Backend:** `app/ingesta/recuperacion.py`, que reutiliza la carga por sensor de `carga_inicial.py`; la tarea del worker; y el límite de `app/api/lecturas.py`.
- **Frontend:** selección inicial y validación del rango manual en `DetalleSensor.tsx` y `servicios/serie.ts`.
- **Contrato:** cambia la descripción del error de rango en la sección 4 del README. Las rutas y los esquemas no cambian.
- **Pruebas:** backend con una SAT2 falsa, frontend y extremo a extremo.
- **Documentación:** README y hoja de ruta.
- **A cargo del responsable:** comprobar en su instalación que se completan los días 1 al 9 de noviembre y que los gráficos se ven completos.
