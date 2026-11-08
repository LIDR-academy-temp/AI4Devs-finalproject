# Design — web-analysis-polish

## Context

Ver proposal.md, "Why". Estado actual, leído en el código:

- `components/DateRangesTable.tsx` pinta la tabla en una `Card` con `w-fit max-w-full`. Dentro del `flex-col` de `RunHeader`, la tarjeta queda a la izquierda (`ui-polish` D9). Su único uso es `RunHeader`.
- `features/validations/RunHeader.tsx` pinta los tres contadores como un `<dl>` en `sm:grid-cols-3`: `<dt>` con la etiqueta, `<dd>` con el valor y otro `<dd>` con la explicación a la vista (`strings.header.explain.*`, `ui-polish` D10). Debajo va la nota `Informative: none of them is a finding.` No tienen marco.
- `features/imports/analysis/Counters.tsx` define el marco de sus tarjetas dentro de un `card()` local: `section[aria-label]`, `rounded-md border bg-background p-3`, etiqueta `text-xs text-muted-foreground`, valor `text-2xl font-semibold tabular-nums`, y tono ámbar con `data-state="warning"`. La tarjeta `By cycle` repite el marco a mano.
- `components/ui/tooltip.tsx` (shadcn sobre `radix-ui`) existe, pero nadie lo usa, y no hay ningún `TooltipProvider` montado. `test/setup.ts` ya simula `ResizeObserver` y `hasPointerCapture`, que Radix necesita.
- En `RowsTable.tsx`, la celda `Sheet · file` es un `div.w-28` con dos líneas: la hoja con `· row N` y el archivo con `whitespace-normal [overflow-wrap:anywhere]`, así que el nombre se parte cada pocos caracteres. Esto viene de `ui-polish` D7 y del commit `91b1f7c` (#132). Las celdas son `align-top px-1.5 xl:px-2`. El ID con guiones lleva un `<wbr>` tras cada guion (`web-analysis-guardrails` D8). Una hoja larga se parte dentro de `w-28` (`web-rows-table-compact` D3).
- El script de capturas `web-analysis-guardrails.ts` mide el desborde de la página y de cada `table-container`, y comprueba que, a 1280 px, cada ID cabe en una línea.
- `features/validations/ValidationsTable.tsx` pinta el desglose de cada validación como texto suelto en su `TableCell`, y las celdas de `components/ui/table.tsx` llevan `whitespace-nowrap`. Con `batch-issues`, `1 non-recorded adjustment · 2 status mismatches` va en una sola línea, y a 1024 px la tabla `Validation results` queda 65 px más ancha que su tarjeta. Este change no lo introdujo: ni `ValidationsTable`, ni `ValidationsSection`, ni `table.tsx` cambian, y `RunHeader` es un hermano en un `flex-col` que no fija el ancho de la tabla. Lo destapó la primera pasada del script de D7, la primera que mide esa tabla con una corrida a 1024 px.

## Goals / Non-Goals

**Goals:**
- Que la cabecera de Validations sea más corta y se lea por bloques: rangos centrados, tres tarjetas y la tabla de validaciones.
- Que cada fila de la tabla de filas ocupe dos líneas en el caso normal, sin que el archivo pise nada y con la tabla cabiendo a 1024 px.
- Un primer uso del tooltip que sea accesible con teclado y con lector de pantalla y que sirva de patrón.

**Non-Goals:**
- Mostrar el archivo una sola vez cuando el import tiene un solo archivo (no se hace).
- Columnas nuevas en la tabla de rangos (#86, #87).
- La unificación de componentes de #90, más allá del marco de tarjeta.
- Montar un `TooltipProvider` global (ver D4).
- Cambios de API, esquema o datos.

## Qué decisiones anteriores cambian

| Decisión | Qué decía | Qué pasa ahora |
|---|---|---|
| `ui-polish` D9 | Tarjeta de rangos alineada a la izquierda | **Se revierte solo la alineación** (D1). Siguen igual la `Card`, `w-fit`, el `aria-labelledby`, las filas, el `rowSpan` de I y que no se pinte con `Blocked`. |
| `ui-polish` D10 | Explicación a la vista; el tooltip era la alternativa descartada | **Se revierte** (D3, D4). La nota común sigue a la vista. Más abajo se explica por qué ya no aplican sus motivos. |
| `ui-polish` D7 y commit `91b1f7c` (#132) | Archivo partido con `overflow-wrap:anywhere` dentro de `w-28` | **Se revierte** (D5). Se mantiene el `title` con el nombre completo. |
| `web-rows-table-compact` D1, D3 | Fila en la línea de la hoja; hoja larga partida dentro de `w-28` | **Siguen vigentes**. La columna conserva `w-28`, ahora para la hoja. |
| `web-rows-table-compact` D2 | Margen de 20 px a 1024 px medido al verificar | **Sigue vigente**. La medida se repite en la tarea 5 y se anota en el PR. |
| `web-analysis-guardrails` D8 | ID con guiones partido solo por los guiones | **Sigue vigente**. D5 garantiza que el archivo no lo pise. |

## Decisions

**D1. Tarjeta de rangos centrada con `mx-auto`.** `DateRangesTable` añade `mx-auto` a su `Card` y conserva `w-fit max-w-full`. Así la tarjeta se centra en el `flex-col` de `RunHeader` con el ancho de su tabla, y a 1024 px, donde la tabla ocupa casi todo, no cambia nada. El cambio va en el propio componente porque solo tiene un uso. Alternativa descartada: una prop `className` para que `RunHeader` decida la alineación. Es una indirección para un solo consumidor; si #90 lo reutiliza en otra pantalla, se añade entonces.

**D2. Marco común `StatCard` en `components/StatCard.tsx`.** Se extrae de `Counters` el marco de tarjeta:
- `<section aria-label={label}>` con las clases de hoy (`flex min-w-32 flex-col gap-1 rounded-md border bg-background p-3`);
- primera fila con la etiqueta (`text-xs text-muted-foreground`) y un hueco opcional `info` a su derecha;
- el valor (`text-2xl font-semibold tabular-nums`, o `text-lg` con `size="compact"` para `By cycle`);
- `children` para el desglose y el enlace.

Con `tone="warning"` añade `data-state="warning"` y el ámbar. Si no se pasa, el tono es neutro. `Counters` pasa a usar `StatCard` en sus seis tarjetas, sin cambiar lo que pinta: sus tests no cambian y son la red de seguridad del refactor. Se usa `components/` y no `features/imports/` porque lo comparten `imports` y `validations`. Alternativas descartadas:
- copiar las clases en `RunHeader`, que es lo que el issue pide evitar;
- la `Card` de shadcn (`rounded-xl`, sombra), porque no tiene el aspecto de las tarjetas de `Counters`, que es lo que pide el issue (#90 decidirá si se unifican).

**D3. Contadores de Validations en tres `StatCard` sin tono.** `RunHeader` sustituye el `<dl>` por una rejilla `grid gap-3 sm:grid-cols-3` dentro de la región `Informative counters`. Pinta una `StatCard` por contador, siempre con tono neutro: son informativos y un 1 en `Undated adjustments` no es una advertencia. Cada tarjeta lleva en `info` el `InfoTip` de D4, que trae consigo la explicación como `<span className="sr-only">` dentro de la tarjeta. **La explicación existe una sola vez en el DOM de la tarjeta.** Ese mismo `span` es el que referencia el `aria-describedby` del botón y el que lee quien recorre la tarjeta: `RunHeader` no pinta otra copia. La nota común sigue a la vista debajo de la rejilla. `RunHeader` pasa de `gap-3` a `gap-4`, para separar la rejilla de la tarjeta de rangos. La separación con la tabla de validaciones (el `gap-3` de `ValidationsSection`) se revisa en las capturas y solo se toca si queda pegada.

Por qué deja de valer `ui-polish` D10:
- **Pantalla táctil**: la app se usa en escritorio. Las capturas y la spec miden 1280 y 1024 px, y la explicación sigue en la spec y en el texto accesible.
- **Capturas de la demo**: la tarea 5 captura el tooltip abierto.
- **Foco en algo no interactivo**: ahora el disparador es un botón de verdad.

A cambio, la cabecera pierde tres líneas de texto de dos renglones cada una, que es lo que pedía la revisión.

**D4. Botón de información `InfoTip` en `components/InfoTip.tsx`.** Recibe `label` (el nombre accesible, `About Pending in range`, que viene de `strings.header.about(label)`) y `description` (el texto de `strings.header.explain.*` que ya existe). Pinta:
- un `<button type="button">` con el icono `Info` de `lucide-react` (`aria-hidden`), `aria-label={label}` y `aria-describedby` apuntando a un `<span className="sr-only" id>` con la descripción. El área es de 24×24 px (`size-6`, WCAG 2.5.8), con anillo `focus-visible`. Va envuelto en `TooltipTrigger asChild`.
- un `TooltipContent` con el mismo texto.
- un `TooltipProvider` local, que envuelve el `Tooltip` (Radix exige un provider).

Comportamiento, el de Radix: abre al pasar el ratón y al recibir el foco, cierra con Escape y no mueve el foco. El `aria-describedby` propio va después de las props que pone Radix, así que sustituye al suyo, que solo existe con el tooltip abierto: la descripción queda asociada también con el tooltip cerrado. **Es un único `<span>` para las dos cosas**: el que nombra el `aria-describedby` es el mismo que lee, dentro de la tarjeta, quien la recorre, como pide la spec. No hay una segunda copia accesible. Con el tooltip abierto, Radix añade su contenido (y su copia `role="tooltip"`) en un portal fuera de la tarjeta, así que dentro de la región el texto sigue apareciendo una sola vez.

Alternativas descartadas:
- un `TooltipProvider` global en `App.tsx`. Es el sitio natural cuando haya más tooltips (#90), pero hoy obligaría a envolver todos los renders de test que montan componentes sueltos. Con un provider local, `InfoTip` funciona solo.
- dejar solo el `role="tooltip"` de Radix como descripción. Solo existe con el tooltip abierto, así que un lector de pantalla no oiría la explicación al recorrer la tarjeta.

**D5. El archivo, en una franja reservada al pie de la fila, posicionada respecto de la fila.** Así se cumplen las tres condiciones: una línea, nada pisado y la tabla cabiendo.
- **Solo las filas de datos del `tbody`** llevan `relative` y es su `<TableRow>` el bloque contenedor, porque ninguna celda está posicionada. La fila de cabecera (la del `group` de `getHeaderGroups()`, con sus `TableHead`) no cambia: ni `relative` ni `pb-6`. No hay fila de estado vacío: el mensaje `s.empty` es un `<p>` fuera de la tabla, y se queda así.
- Cada `<TableCell>` de esas filas lleva un relleno inferior de una línea de `text-xs` más el relleno normal (`pb-6`, es decir 16 + 8 px). Eso deja al pie de **toda** la fila una franja vacía de una línea.
- El `<span>` del archivo sigue dentro de la primera celda en el DOM, pero con `absolute bottom-2 left-1.5 right-1.5 xl:left-2 xl:right-2 truncate`, y `title` con el nombre completo.

Por construcción, el contenido en flujo de todas las columnas termina por encima de la franja: la hoja con `· row N`, la hoja larga partida en `w-28`, el UUID partido por sus guiones, el resultado partido en `w-24` y, en una fila ambigua, la celda `Result` con `AmbiguousCandidates` (cada candidata con su botón **Choose** y, si está deshabilitado, su motivo). Esta última es la celda más alta de la tabla, y también termina por encima de la franja. Una fila sube de altura con ellos, y la franja baja con ella, así que el archivo nunca se superpone (criterio 5). En el caso normal, la fila son dos líneas: la de contenido y la franja (criterio 4).

**Cómo se corta un nombre muy largo.** El `span` está limitado por `left` y `right` al ancho de la fila, y `truncate` (`overflow:hidden`, `text-overflow:ellipsis`, `white-space:nowrap`) lo corta con "…" donde acaba la fila. Como el elemento está posicionado fuera de flujo y dentro de la caja de la fila, no aporta ancho mínimo a la tabla ni desborda su contenedor. La tabla mide lo mismo que hoy a 1024 px (criterios 6 y 7). El `title` conserva el nombre entero. El texto y una copia siguen siendo el nombre completo; el "…" es solo visual. `ui-polish` D7 descartó `truncate` porque recortaba el nombre a `max-w-56`. Aquí solo corta lo que no cabe en el ancho entero de la fila, y los nombres de la plantilla (unos 50 caracteres) caben enteros a 1024 px.

El orden de lectura no cambia: la celda sigue leyéndose `APP · row 2 Recon_….xlsx`, y la hoja conserva su elemento propio, que el script de capturas lee (`web-rows-table-compact` D1).

Alternativas descartadas:
- **`whitespace-nowrap` con desborde visible dentro de `w-28`**, que es lo que dice el issue literalmente ("se extiende por debajo de las columnas vecinas"). La línea del archivo caería a la altura de la segunda línea de un UUID partido, de una hoja larga partida o de `Unmatched · No match` partido en `w-24`, y los pisaría. Además, el desborde visible de un elemento en flujo cuenta en el ancho desplazable del `table-container`: con un nombre largo, la tabla volvería a desplazarse a 1024 px (#132).
- **Una segunda `<tr>` por fila, con una celda `colSpan` para el archivo.** Rompe "una fila por `ImportRow`": `getRowId`, el tono ámbar por fila, los tests y el script que cuentan filas. Además, un lector de pantalla anunciaría una fila sin cabeceras.
- **Ensanchar la columna**, que es justo el #132.

**D6. Los tests asertan la estructura, no el diseño.** jsdom no calcula el layout (lección del #13), así que:
- `RowsTable.test.tsx` comprueba que el archivo es un elemento con `absolute` y `truncate`, con `title` igual a su texto y sin `whitespace-normal` ni `[overflow-wrap:anywhere]`. Comprueba también que su `<tr>` tiene `relative` y que todas las celdas de la fila tienen `pb-6`, también en una fila con UUID, en una con hoja larga y en una **fila ambigua con candidatas y botón Choose** (`analyst` en un import `analyzed`). La fila de cabecera no tiene `relative` y sus `columnheader` no tienen `pb-6`.
- `InfoTip.test.tsx` usa `user-event`:
  - Tab llega al botón por su nombre;
  - `getByRole('tooltip')` tiene el texto;
  - con Escape desaparece y `document.activeElement` sigue siendo el botón;
  - `hover` lo abre;
  - `toHaveAccessibleDescription` se cumple con el tooltip cerrado.

  Se rompe a propósito una vez, quitando el `aria-describedby` propio y con `tabIndex={-1}` en el botón, para ver que esos tests fallan.
- `ValidationsSection.test.tsx` lee cada contador por su región (`region` con el nombre de la etiqueta): valor, descripción accesible del botón `About …` y la nota a la vista. `Undated adjustments` no tiene `data-state`. Además, el texto de cada explicación aparece **una sola vez** dentro de su región (`within(region).getAllByText(explicación)` con longitud 1), con el tooltip cerrado y abierto (D3, D4).
- `DateRangesTable.test.tsx` cambia "a la izquierda" por `mx-auto`, y conserva `w-fit`.
- `StatCard.test.tsx` cubre el nombre de la región, el tono neutro por defecto y `data-state="warning"` solo con `tone="warning"`.
- `ValidationsSection.test.tsx` comprueba además que el desglose de `Non-recorded adjustment` es un elemento con `block`, `w-48` y `whitespace-normal`, sin `[overflow-wrap:anywhere]` ni `break-all` (D8).

**D7. Capturas: `e2e/screenshots/web-analysis-polish.ts`.** Mismas protecciones que `web-analysis-guardrails.ts`: contraseña del `.env` raíz puesta desde la página, sin traza ni vídeo, nada capturado antes de que la pantalla esté a la vista. Como `analyst`, por las pantallas y uno tras otro (cada import se cancela antes de crear el siguiente):
1. **`batch-issues` en `ProviderB-Main`**: subir, confirmar, analizar y ejecutar las validaciones. Tres capturas: la cabecera de Validations; la misma con el tooltip de `Pending in range` abierto con el teclado (foco en `About Pending in range`); y la tabla de filas. El tooltip se abre en cada ancho como lo haría quien usa el teclado: el botón a la vista primero, el foco en el elemento anterior (`Run again`) sin desplazar la página y Tab hasta el botón. Radix cierra el tooltip cuando se desplaza un ancestro de su botón, así que desde el Tab hasta la captura no se desplaza nada: la captura es de la ventana, no de la página entera, y el script comprueba que `scrollY` no cambió y que el tooltip sigue abierto después de capturar. Después, Escape lo cierra y el foco sigue en el botón.
2. **`batch-wrong-account` en `ProviderA-USD`**: subir, confirmar y analizar. Captura de la tabla de filas con UUID.
3. **`batch-split` en `ProviderA-USD`**: los dos archivos; subir, confirmar y analizar. Captura de la tabla de filas con los dos nombres. Después, en la propia página, se pone en la primera fila la hoja `Transactions approved by issuer` y un nombre de archivo de 150 caracteres, se mide y se captura como `-synthetic`. Por último, con la fila ambigua interceptada (ver "Filas ambiguas" más abajo), una captura con el foco en su último **Choose**.

**Filas ambiguas.** Ninguna de las tres muestras sin procesar deja filas ambiguas: `ambiguous` vale 0 en sus `expected.json`, y el seed no produce ninguna, como ya anotó `web-ambiguous-rows`. Su disposición queda cubierta por el test de D6. Para ver en una captura el anillo de foco del último **Choose**, el script reutiliza la técnica de `web-ambiguous-rows.ts`: intercepta `GET rows` de `batch-split` con `page.route` y pone delante una fila ambigua sintética, con la hoja y el archivo de la primera fila real y dos candidatas. Después lleva el foco con Tab hasta el último **Choose** y captura. Nunca se pulsa **Choose**. Se comprueba a ojo que el anillo no tapa el nombre del archivo.

Cada pantalla se captura a 1280×900 y a 1024×768 en `docs/wireframes/web-analysis-polish/`. Ningún import se procesa (no consumen números de batch) y todos se cancelan con un motivo, así que el script se puede repetir sin sembrar. No se usa `batch-clean` (#111).

Además de las medidas que ya hace `web-analysis-guardrails.ts` (página, cada tabla e IDs en una línea a 1280 px), el script mide:
- **la tarjeta de rangos**: centrada en su región, con los huecos izquierdo y derecho iguales con ±1 px, y más estrecha que la región a 1280 px;
- **las tres tarjetas de contadores**: con la misma `top` (una fila) a los dos anchos;
- **la línea del archivo de cada fila**: en una sola línea (sus `getClientRects` comparten `top`), sin intersecar los rectángulos del texto de las demás celdas ni el de la hoja de su fila (`Range.getClientRects` sobre sus nodos de texto), y dentro del `table-container`;
- **en la fila sintética**: lo mismo, más que el nombre está cortado (`scrollWidth > clientWidth`).

**Prioridad.** Escribir el script tiene un tope de tiempo (tarea 5.1). Son imprescindibles:
- el desborde de la página y de cada tabla;
- el margen de la tabla de filas a 1024 px;
- el archivo en una línea y sin intersecar otras celdas;
- la fila sintética cortada.

El centrado de la tarjeta de rangos con ±1 px y la misma `top` de las tres tarjetas son medidas secundarias. Si alargan el trabajo más allá del tope, se quedan como revisión a ojo de las capturas y se anotan así en el PR.

Cualquier hallazgo de las medidas que estén en el script hace fallar la ejecución. Además, el script **imprime siempre** el desborde de la página y de cada tabla, y el margen de la tabla de filas a 1024 px (`min-content` frente a su contenedor, `web-rows-table-compact` D2), para copiarlos al PR. Las capturas se revisan además a ojo.

**D8. El desglose de la tabla de validaciones se parte entre palabras dentro de un ancho fijo.** En `ValidationsTable`, el texto de la columna `Breakdown` va en un `<span className="block w-48 whitespace-normal">`, como `Result` en la tabla de filas (`w-24`, #132). La celda conserva el `whitespace-nowrap` de `table.tsx`, pero el `span` lo anula para su texto. Así, el desglose más largo (`1 non-recorded adjustment · 2 status mismatches`) ocupa dos líneas de 192 px y la tabla deja de medir más que su tarjeta a 1024 px. Los nombres de validación, el resultado, los hallazgos y `Blocking` siguen sin partirse. El `span` está también en las filas sin desglose, así que la columna mide lo mismo en todas las corridas.

Alternativas descartadas:
- **`whitespace-normal` sin ancho**. El algoritmo automático de la tabla reparte lo que falta entre las columnas que se pueden partir. Con solo una, la estrecha hasta casi una palabra por línea, que es lo que pasó con `Result` en #132.
- **Quitar `Breakdown` por debajo de `xl` o pasarlo bajo el nombre de la validación.** Esconde un dato o cambia la disposición de la tabla, que no es lo que pide este change.

**Contrapartida**: a 1280 px, donde la tabla cabía, ese desglose también va en dos líneas. Se acepta, porque la altura de la fila es la de dos líneas de texto y el resto de la tabla no cambia.

## Risks / Trade-offs

- **`position: relative` en un `<tr>`.** Lo admiten los navegadores actuales, pero solo se verifica en Chromium, con las capturas. → Si otro navegador lo ignorara, el archivo se posicionaría respecto de un ancestro y se vería mal, pero sin perder datos: el `title` y el texto siguen en la celda. Se anota en el PR.
- **La franja añade una línea también a las filas cuyo archivo ya no se ve**, por ejemplo con la columna muy estrecha. → Es lo buscado: la altura de la fila es predecible y el archivo siempre tiene su sitio.
- **Un nombre cortado con "…" pierde su final**, que es lo que distingue `_part1` de `_part2`. → Solo pasa con nombres más largos que toda la fila, que la plantilla no produce. El `title` da el nombre entero.
- **El tooltip no se abre con un toque en pantallas táctiles.** → Se acepta (D3). La explicación sigue en el texto accesible y en la spec.
- **Hay un `TooltipProvider` por cada `InfoTip`.** → Son tres en la pantalla y el coste es despreciable. Se sube a `App.tsx` cuando #90 añada más tooltips.
- **Los contadores pasan de `<dl>` a regiones.** Algún test fuera de `ValidationsSection.test.tsx` podría contar regiones o términos. → Se corre la suite entera del frontend; si falla un test ajeno a este change, se para y se avisa.
- **La descripción del MODIFIED "cabecera de la corrida" ya pasaba de 500 caracteres** antes de este change. Se deja palabra por palabra, sin alargarla, y las reglas nuevas van en dos ADDED de menos de 500. Partirla es un change aparte.
