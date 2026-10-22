# Revisión de la interfaz — 2026-10-20

- **Fecha:** 2026-10-20
- **Participantes:** líder del equipo, analista del proyecto
- **Objetivo:** comprobar la legibilidad de la interfaz para la demo de la Entrega 2, que recorre de punta a punta Files → Mapping → Analysis → Settlement Review → Summary, y Settlement List.
- **Alcance:** solo lectura de pantallas. No se revisaron reglas de negocio ni cifras: ninguna observación cambia lo que calcula el API.

## Observaciones

Clasificación: `ui-polish` (se resuelve en el change `openspec/changes/ui-polish`), `Entrega 3` (issue para la siguiente entrega) o `Roadmap` (issue sin entrega fijada). En la referencia, los requisitos son los del delta de `ui-polish` (`specs/<capacidad>/spec.md`).

| # | Pantalla | Observación | Clasificación | Referencia |
|---|---|---|---|---|
| 1 | Barra lateral | Las opciones del menú no se distinguen de los títulos de grupo: van a la misma altura. | `ui-polish` | `web-shell` · Navegación lateral por grupos |
| 2 | Todas | Las tarjetas se confunden con el fondo de la página. | `ui-polish` | `web-shell` · Aspecto de las tarjetas |
| 3 | Barra superior | La lista de merchants del usuario ocupa sitio y no ayuda a trabajar; basta con nombre, rol y **Sign out**. | `ui-polish` | `web-shell` · Identidad visible |
| 4 | Import · Files e Import · Mapping | Los archivos se confunden con el fondo y entre sí; la cabecera de cada archivo no se distingue. | `ui-polish` | `import` · Pantallas Upload Files y Column Mapping: un bloque por archivo |
| 5 | Import · Mapping (readiness) | El nombre de la hoja se pierde dentro del texto de cada aviso, también en "Ready to analyze". | `ui-polish` | `import` · Pantalla Column Mapping: readiness por archivo |
| 6 | Import · Analysis (tabla de filas) | El nombre del archivo de origen se corta y no se puede leer entero. | `ui-polish` | `import` · Resultado del análisis: tabla de filas |
| 7 | Analysis, Settlement Summary, Settlement List | Al elegir una validación, pulsar "Show unmatched rows", un filtro, una página, una pestaña o un ciclo, la página vuelve arriba y se pierde el sitio. | `ui-polish` | `web-shell` · Navegación dentro de la página: desplazamiento y foco |
| 8 | Analysis, Settlement Summary, Settlement List | Los estados (de validación, de corrida, de import y de intento) solo se distinguen por el texto. | `ui-polish` | `web-shell` · Colores de estado |
| 9 | Analysis (cabecera de la corrida) y Settlement Summary | Los rangos de fechas son una línea de texto difícil de leer; no se ve qué estado corresponde a cada ciclo. | `ui-polish` | `validation` · Pantalla Analysis & Validations: cabecera de la corrida; `settlement` · Pantalla Settlement Summary: totales y amount payable auditable, y Pantalla Settlement Review: resumen previo (columna Date range de Totals by type, tras la revisión 12.2) |
| 10 | Analysis (cabecera de la corrida) | No se entiende qué cuentan `Pending in range`, `Undated adjustments` y `Undated candidates`. | `ui-polish` | `validation` · Pantalla Analysis & Validations: cabecera de la corrida |
| 11 | Settlement Summary | La cabecera del intento son varias líneas de texto sueltas; cuesta encontrar cuenta, batch, estado y fechas. | `ui-polish` | `settlement` · Pantalla Settlement Summary: estado y cabecera del intento |
| 12 | Settlement Summary, Settlement List, Settlement Review | Las fechas sin hora (liquidación, vigencia de un fee, liberación prevista de la reserva) llevan un `ET` que no aporta. | `ui-polish` | `settlement` · Pantallas de settlement: fechas en hora de Nueva York; Pantalla Settlement List: columnas |
| 13 | Import · Mapping | Con muchos archivos, poder plegar cada uno y ver un resumen al plegarlo. | `Entrega 3` | #85 |
| 14 | Analysis y Settlement Summary (tabla de rangos) | Una columna con la ronda (#1/#2) de cada rango; la ronda solo se calcula al procesar. | `Entrega 3` | #86 |
| 15 | Analysis (tabla de rangos) | El número de transacciones por estado, como en el Summary; el API de la corrida no da ese conteo. | `Entrega 3` | #87 |
| 16 | Settlement Summary | Descargar el merchant summary en `.xlsx`. | `Entrega 3` | #82 |
| 17 | Barra superior | Un selector del merchant activo en el sitio de la lista de merchants. | `Roadmap` | #83 |
| 18 | Todas | Modo oscuro. | `Roadmap` | #84 |

## Decisiones tomadas después de la revisión

- **Colores de estado** (design D8 de `ui-polish`): `cancelled` y `undone` en gris, porque son decisiones del analista y no fallos; `processed` / `pending_payment` del batch en ámbar, porque nada está Settled hasta el pago. Solo llevan color los Badge: la columna Settled de Movements sigue como texto.
- **Foco tras navegar** (design D13 de `ui-polish`): los botones que actualizan una lista llevan el foco a su encabezado; los desplegables y las fechas de Settlement List conservan el foco en su control, porque cambian mientras se elige con el teclado.
