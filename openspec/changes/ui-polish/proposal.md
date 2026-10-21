# Proposal — ui-polish

Origen: revisión de la interfaz con el líder del equipo (2026-10-20). Solo frontend: ningún endpoint nuevo ni modificado, ninguna regla de negocio nueva. Se apoya en `web-shell`, `web-import`, `web-validations`, `web-settlement` (archivados) y en `settlements-browse` (#64, fusionado en #88 y archivado en #89), que añade Settlement List al menú y la pestaña Movements al Summary. La rama se rebasó sobre `feature/entrega-2-MVP` con #64 ya fusionado (grupo 1).

## Why

La demo de la Entrega 2 recorre de punta a punta Files → Mapping → Analysis → Settlement Review → Summary, y en la revisión salieron problemas de lectura, no de reglas: el menú no separa títulos de opciones, las tarjetas y los archivos se confunden con el fondo, los estados se distinguen solo por el texto, la cabecera de Validations y la del Summary son líneas de texto difíciles de leer, el nombre de archivo se corta, las fechas sin hora llevan un `ET` que no aporta, y al pulsar una validación, "Show unmatched rows" o un filtro la página vuelve arriba y el analista pierde el sitio.

## What Changes

- **Menú lateral**: las opciones con sangría respecto a los títulos de grupo (24 px frente a 12 px, como el prototipo navegable). Dashboard, sin grupo, sigue alineado con los títulos.
- **Card**: sombra suave (equivalente a `2px 2px 9px lightgrey`) en el componente, con su valor como variable del tema (`--card-shadow`), redefinida también en `.dark` para el modo oscuro del roadmap (#84).
- **Barra superior**: deja de mostrar los merchants del usuario; quedan nombre, rol y **Sign out**. El selector de merchant es #83.
- **Import · Files e Import · Mapping**: cada archivo en un bloque con un tono suave propio, distinto del fondo y del archivo vecino (el mismo tono para el mismo archivo en los dos pasos), y una cabecera de archivo marcada (icono, nombre en negrita, número de hojas).
- **Readiness de Mapping**: el nombre de la hoja en negrita y separado de su descripción, también en "Ready to analyze".
- **Analysis, tabla de filas**: el nombre del archivo de origen se parte en líneas en vez de cortarse, y conserva el nombre completo en `title`. **Cambia a propósito** el escenario "Hoja y archivo de cada fila" (decía "truncado").
- **Navegación dentro de la página**: elegir una validación, "Show … rows", los filtros y la paginación de las tablas, las pestañas y el ciclo de Movements y los filtros de Settlement List dejan la página donde está; cuando la acción actualiza una lista, el desplazamiento y el foco van al encabezado de esa lista (`tabIndex=-1`). Recargar o llegar por enlace no mueve el foco.
- **Colores de estado en los Badge**: verde (`passed`, `validated`, `processed` del import, `paid`/`settled`), ámbar (`warning`, `processed`/`pending_payment` del batch), rojo (`blocked`), gris (`not_applicable`, `not_implemented`, estados intermedios y `cancelled`/`undone`). El texto se mantiene siempre, con contraste AA y los colores como variables del tema.
- **Rangos de fechas**: en Validations, tabla "Date ranges used by the validations" en su tarjeta, con columnas Cycle · Status · Date range y filas E/APP, E/DEC, I con CHB, REF y RDR (un único rango I que abarca las tres) y R; no se muestra con resultado Blocked, y Transactions por estado queda en #87. En el Summary y en el pre-summary de Settlement Review, columna Date range en Totals by type, solo con el día (revisión 12.2, design D9).
- **Resultado general de Validations junto al título**, con la etiqueta Overall result (revisión 12.2, design D10).
- **Rango del batch en el panel de un faltante**, con una línea de por qué es faltante (revisión 12.2, design D18).
- **Contadores de Validations** (`Pending in range`, `Undated adjustments`, `Undated candidates`) con una explicación corta de cada uno.
- **Cabecera del Settlement Summary**: rejilla compacta con cuenta, batch e intento, estado, procesado por y cuándo, y fecha de liquidación; los rangos pasan a Totals by type.
- **Fechas sin hora** (`formatBusinessDate`: fecha de liquidación, vigencias de fees, liberación prevista de la reserva): sin el sufijo `ET`. Las fechas con hora lo conservan.
- **`docs/uat/2026-10-20-revision-interfaz.md`** con las observaciones de la revisión y su clasificación (este change, Entrega 3 o roadmap).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `web-shell`: "Identidad visible" deja de mostrar los merchants. Se añaden "Navegación lateral por grupos", "Aspecto de las tarjetas", "Colores de estado" y "Navegación dentro de la página: desplazamiento y foco", comunes a todas las pantallas.
- `import`: se añade "Pantallas Upload Files y Column Mapping: un bloque por archivo"; cambian "Pantalla Column Mapping: readiness por archivo" (nombre de hoja en negrita) y "Resultado del análisis: tabla de filas" (archivo partido en líneas en vez de truncado). Show rows y los filtros sin volver arriba están en el requisito de navegación de `web-shell`.
- `validation`: cambia "Pantalla Analysis & Validations: cabecera de la corrida" (resultado general junto al título, tabla de rangos y contadores explicados) y "Pantalla Analysis & Validations: detalle de un hallazgo" (rango del batch de un faltante). El color por resultado y el foco en la lista de hallazgos están en los requisitos de `web-shell`.
- `settlement`: cambian "Pantalla Settlement Summary: estado y cabecera del intento" (rejilla, sin tabla de rangos), "Pantalla Settlement Summary: totales y amount payable auditable" y "Pantalla Settlement Review: resumen previo" (columna Date range en Totals by type), "Pantallas de settlement: fechas en hora de Nueva York" (fecha sin hora, sin `ET`) y "Pantalla Settlement List: columnas" (fecha de liquidación sin `ET`, color del estado). Los dos últimos se escriben sobre la versión que deja `settlements-browse`, así que **`settlements-browse` se archiva antes que este change** (design D14).

## Fuera de alcance

- Plegar y desplegar cada archivo en Mapping con un resumen al plegar: #85 (Entrega 3).
- Columna Round #1/#2 en la tabla de rangos (la ronda solo se calcula al procesar): #86 (Entrega 3).
- Transactions por estado en Validations (el API no da el conteo): #87 (Entrega 3).
- Modo oscuro (#84), selector del merchant activo (#83) y summary en `.xlsx` (#82): ya tienen issue.
- Cualquier cifra calculada en el navegador y cualquier cambio de API, OpenAPI o colección Bruno.

## Impact

- **Código modificado** (solo `frontend/`): `index.css` (variables de sombra, tonos de archivo y colores de estado), `components/ui/badge.tsx` (variantes de estado) y `card.tsx` (sombra), `app/layout/{Sidebar,Header,strings}.tsx`, `features/imports/files/FileList.tsx`, `features/imports/mapping/{MappingStep,ReadinessBar}.tsx`, `features/imports/analysis/{RowsTable,Counters,AnalysisStep}.tsx`, `features/imports/ImportHeader.tsx`, `features/validations/{RunHeader,ValidationsTable,ValidationsSection,IssuesList,Occurrences,strings}.tsx`, `features/settlements/{SummaryHeader,SettlementsTable,SettlementListPage,SettlementFilters,SettlementSummaryPage,SummaryMovements,Pager,strings}.tsx` (las pestañas Summary | Movements viven en `SettlementSummaryPage`), `features/accounts/AccountsPage.tsx`, `features/imports/NewReconciliationPage.tsx` (el `writeChoice` que recibe `account-choice`), `lib/format.ts`.
- **Código nuevo**: componente compartido de la tabla de rangos con sus textos, módulo de tonos de estado y la ayuda de foco tras navegar (design D6, D7, D9).
- **Tests que cambian a propósito**: los que fijan `ET` en fechas sin hora, el texto de la cabecera de la corrida y del Summary, el nombre de archivo truncado, la línea de readiness y los merchants de la cabecera (lista en design D15).
- **Capturas**: se relanzan `web-validations`, `web-settlement` y `settlements-browse` (con turno de base); Files y Mapping se revisan en el navegador.
- **Dependencias nuevas**: ninguna (`lucide-react` ya está).

## Insumos que necesito de la persona

1. ~~**Aviso de merge de #64**~~: hecho (#88 y archivo en #89, 2026-10-21).
2. **Revisión de D8** (qué estado lleva qué color): la clasificación de `cancelled`, `undone` y `processed`/`pending_payment` es una propuesta.
3. **Turno de base** para el último grupo (prueba en el navegador a 1280 y 1024 px y capturas); aviso antes de lanzar los scripts.
