# Proposal

## Why

Al revisar la aplicación local el 5 de noviembre de 2026, el responsable pidió más formas de elegir el período de los históricos de un sensor. Hoy solo hay dos botones, "Últimos 7 días" y "Últimos 31 días", y no se puede mirar un tramo anterior, como la semana de una aplicación pasada.

## What Changes

- Los botones de rango pasan a ser **Día** (últimas 24 horas), **Semana** (últimos 7 días) y **Mes** (últimos 31 días).
- Se agrega un **rango manual** con calendario: fecha de inicio y fecha de fin, en hora de Argentina.
- El rango manual no admite fechas futuras ni anteriores a un año, y dura como máximo 31 días, igual que hoy.
- **BREAKING:** la API también rechaza con 422 un rango que empieza hace más de un año o que termina en el futuro. Antes solo exigía el orden de las fechas y el máximo de 31 días.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `sensor-history`: cambian los límites del rango en la API y las opciones de la pantalla.

## Impact

- **API:** `obtenerHistorico` valida la antigüedad y el futuro con la hora del servidor. Cambia la descripción del 422, así que se regeneran `openapi.json`, los tipos del frontend y la sección 4 del README.
- **Frontend:** pantalla de detalle del sensor, con tres botones y el rango manual.
- **Pruebas:** casos límite de la API, pruebas de componentes de los rangos y la E2E de HU3.
- **Documentación:** F5 y HU3 del README y la guía de la demo.
- Sin cambios en la base de datos ni en el worker.
