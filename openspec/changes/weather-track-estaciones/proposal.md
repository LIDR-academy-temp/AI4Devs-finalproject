# Proposal

## Why

En Weather Track, una estación es solo una central meteorológica que llega de SAT2, lo que la API llama "equipo". Hoy hay una sola, INTA Pergamino, equipo 1 de `RecuperarEquipos`, y puede haber más. La implementación actual se aparta de esa definición en tres puntos:

- Con una sola estación no muestra ningún selector.
- El modo `escenarios` presenta casos de prueba como si fueran estaciones.
- Un equipo que deja de llegar de SAT2 sigue activo para siempre.

El responsable definió el comportamiento correcto el 3 de noviembre de 2026.

## What Changes

- Selector de estación en el encabezado, siempre visible. Hoy despliega solo INTA Pergamino.
- **BREAKING:** el catálogo marca como inactivo el equipo que deja de llegar de SAT2 y lo reactiva si vuelve. Un equipo inactivo sigue en el selector y no se le piden más lecturas. Muestra la leyenda "Equipo inactivo - solo históricos" y la lista de sus sensores, que abre sus históricos.
- La estación del modo `simulado` se llama como la real, con un aviso visible de "Datos simulados".
- **BREAKING:** se elimina el modo `escenarios`, con sus 10 estaciones ficticias. Lo reemplaza un modo `prueba` con dos entradas en el selector: "Caso de prueba - 1", con los datos ya guardados en la base, y "Caso de prueba - 2", sin ingesta.
- Las situaciones de la recomendación (favorable, índice elevado, inversión, fuente caída, etc.) se prueban cargando cada una en la base aislada de cada prueba, sin presentarlas como estaciones.
- Nunca se mezclan datos reales y ficticios en una misma base.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `station-conditions`: el selector siempre visible reemplaza la selección automática; se agrega la presentación del equipo inactivo.
- `sat2-ingestion`: el catálogo marca y reactiva equipos; cambia el modo simulado; se agregan el modo de prueba y la separación entre datos reales y ficticios.

Ambas vienen de `weather-track-mvp-nucleo`, que hay que archivar antes, igual que para `weather-track-registro-cuentas`.

## Impact

- **Datos:** migración para registrar la naturaleza de los datos de la base (reales o ficticios) y la fecha en que un equipo pasó a inactivo.
- **API:** el listado de estaciones incluye las inactivas con su estado; las condiciones actuales informan si el equipo está inactivo. Se regeneran `openapi.json` y los tipos del frontend.
- **Worker:** el ciclo y la carga inicial omiten los equipos inactivos; nuevo modo `prueba`; se elimina `escenarios`.
- **Frontend:** selector en el encabezado, pantalla de equipo inactivo y aviso de datos simulados.
- **Pruebas:** las de extremo a extremo HU1 y HU2 y las pruebas negativas dejan de usar `escenarios` y cargan sus situaciones directamente en su base aislada.
- **Documentación:** README (F2, modos, modelo de datos), instalación local, guía de la demo y capturas.
- **Relación con `weather-track-registro-cuentas`:** ese cambio deja de usar estaciones como permisos; se corrigió para que una estación inactiva sea visible.
