# Design — ui-polish

## Context

- **Tema** (`frontend/src/index.css`): Tailwind 4 con `@theme inline` que expone las variables de shadcn (`--color-card: var(--card)`…), valores en `:root` y en `.dark` (este último sin activar: #84). No hay variables de sombra ni de estado; los colores de estado de hoy son literales (`bg-amber-50`, `border-emerald-600/40`) repartidos por los componentes.
- **Card** (`components/ui/card.tsx`): `ring-1 ring-foreground/10`, sin sombra. **Badge** (`components/ui/badge.tsx`): variantes `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`, y `data-variant` en el DOM. Los estados se pintan con `outline`/`secondary`/`destructive` en `ValidationsTable` (`OUTCOME_VARIANT`), `RunHeader` (`overall`), `ImportHeader` y `SettlementReviewPage` (`detail.status` en crudo), `SummaryHeader` y `SettlementsTable` (`settledStatus`) y `Occurrences` (`batch.status` en crudo).
- **Layout**: `Sidebar.tsx` pinta títulos y entradas con el mismo `px-3`; el prototipo (`docs/wireframes/prototype/Dashboard.dc.html`) usa 12 px para títulos y Dashboard y 24 px para las entradas. `Header.tsx` compone la lista de merchants con `strings.allMerchants` / `noMerchants`. La ventana es la que se desplaza (`AppLayout`: `min-h-screen`, sin contenedor con scroll).
- **Router** (TanStack Router 1.17x): cada `navigate` y cada `Link` hace `resetScroll` por defecto (`router._scroll.n = next.resetScroll ?? true`) y la restauración llama a `window.scrollTo({ top: 0 })` aunque `scrollRestoration` esté apagado. Por eso cualquier cambio de búsqueda en la dirección (validación, filtro, página, hallazgo abierto) vuelve arriba. `test/setup.ts` sustituye `window.scrollTo` y `scrollIntoView` por funciones vacías, que un test puede espiar.
- **Foco ya existente**: `ValidationsSection` tiene `<h3 tabIndex={-1} data-validations-heading>` y `IssueDrawer` devuelve el foco al ID que lo abrió o a ese encabezado.
- **Rangos**: `ValidationRunSummary.ranges` y `SettlementView.dateRanges` traen `{ APP, DEC, I, R }` con `{ min, max }` o `null` (fechas de negocio con hora: `formatBusinessDateTime`). Conteos por estado: la corrida no los trae (#87); la vista del intento sí, en `totals[].qty` (categorías `deposit`, `declined`, `chargeback`, `refund`, `rdr`, siempre las cinco y en ese orden) y `movements.R`.
- **Fechas** (`lib/format.ts`, `web-validations` D11): `compose` añade `ET` a todo. `formatBusinessDate` (solo día) se usa en `SummaryHeader` (fecha de liquidación) y `AddFee` (vigencias); `settlements-browse` lo añade en `SettlementsTable` y `SummaryMovements` (`expectedReserveReleaseAt`).
- **`settlements-browse`** (#64, fusionado en #88 y archivado en #89): añade `/settlements` (`SettlementListPage`, con los filtros en `SettlementFilters.tsx`: dos `<select>` y dos `<input type="date">`), `Pager.tsx` con `useLastPageLimit` (una página más allá de la última navega a la última con `replace`), las pestañas Summary | Movements dentro de `SettlementSummaryPage.tsx` con el selector de ciclo en `SummaryMovements.tsx` (botones con `aria-pressed`), y `features/accounts/account-choice.tsx` (`useAccountChoice` + `AccountPicker`), que no navega por sí mismo: recibe el `writeChoice` de `SettlementListPage` y de `NewReconciliationPage`. En `SettlementsTable` las piezas que no se parten van en `NoBreak` y los canales en `WrapAfterCommas`; en `SummaryMovements` las cifras van en `Figure` y cada línea de reserva en `Labelled` (D11 de settlements-browse: la etiqueta se parte entre palabras, la cifra nunca y va pegada a la última palabra con un espacio de no separación). Sus requisitos "Pantallas de settlement: fechas en hora de Nueva York" y "Pantalla Settlement List: columnas" ya están en `openspec/specs/settlement/spec.md`. Su design D7–D11 fija la dirección (`status`, `dateField`, `from`, `to`, `page`; `tab`, `cycle`, `page`).

## Goals / Non-Goals

**Goals:**
- Que cada color, sombra y tono nuevo sea una variable del tema con valor claro y oscuro, para que #84 solo tenga que activar `.dark`.
- Un único componente para la tabla de rangos y un único mapa de estado → color, para que Validations, Summary y la lista digan lo mismo.
- Que ninguna acción dentro de la página pierda la posición del analista, sin robar el foco al recargar o al llegar por enlace.

**Non-Goals:**
- Activar el modo oscuro, cambiar la tipografía o rehacer el layout de las pantallas.
- Colores para estados que no sean de import, validación, corrida o intento (cuenta activa o cerrada, origen de un fee, hoja oculta).
- Plegar archivos (#85), columna Round (#86) y Transactions en Validations (#87).

## Decisions

### D1. Primer grupo: rebase sobre `feature/entrega-2-MVP` con #64 fusionado
- El change toca `SettlementsTable`, `SettlementListPage`, `SummaryMovements` y `SettlementSummaryPage`, que llegaron con #64. La rama `feat/ui-polish` se rebasó sobre `feature/entrega-2-MVP` en `f239550` (#64 fusionado y archivado), sin conflictos, y se comprobó en verde (`pnpm lint && pnpm typecheck && pnpm test`) antes de escribir ningún test nuevo.
- *Alternativa descartada*: rebasar sobre `feat/settlements-browse` y empezar ya. Cualquier cambio de su revisión obligaría a rehacer este rebase, y los tests de este change fijarían un código aún no aprobado.

### D2. Sangría del menú en las entradas, no en los títulos
- En `Sidebar`, las entradas de un grupo con etiqueta pasan a `pl-6` (24 px) con `pr-3`; títulos de grupo, nombre de la aplicación y Dashboard siguen en `px-3` (12 px), como el prototipo. El fondo de la entrada activa y del `hover` sigue ocupando todo el ancho de la fila.
- *Alternativa descartada*: un margen en la lista (`ul` con `ml-3`). El fondo activo quedaría más estrecho que la barra y desalineado con Dashboard, que no tiene grupo.

### D3. Sombra de Card como variable del tema
- `:root { --card-shadow: 2px 2px 9px oklch(0.869 0 0) }` (`lightgrey`, `#d3d3d3`) y `.dark { --card-shadow: 2px 2px 9px oklch(0 0 0 / 50%) }`; en `@theme inline`, `--shadow-card: var(--card-shadow)`, que da la utilidad `shadow-card`. `Card` añade `shadow-card` y conserva su `ring` (borde suave `ring-foreground/10`) y su relleno (`py-(--card-spacing)`, con `[--card-spacing:--spacing(4)]`).
- **Regresión de la revisión 12.2 (2026-10-21)**: al añadir `shadow-card` se perdió el espacio entre `ring-foreground/10` y `[--card-spacing:--spacing(4)]`. Quedó una sola clase que Tailwind no reconoce: el anillo tomó `currentColor` (borde negro) y `--card-spacing` quedó sin definir (sin relleno). Se arregla en el componente, no pantalla por pantalla. Como jsdom no aplica el CSS, ningún test de comportamiento lo vio: `card.test.tsx` fija que esas clases siguen separadas en `Card` (excepción pedida a la regla de D15 de no testear clases), y `settlements-browse.ts` mide en el Login, antes de escribir nada y sin captura, el relleno de la tarjeta, que su anillo es translúcido y que lleva la sombra del tema.
- *Alternativa descartada 1*: `shadow-[2px_2px_9px_lightgrey]` en el componente. Es un valor fijo: en el tema oscuro sería una sombra clara sobre fondo oscuro.
- *Alternativa descartada 2*: `shadow-sm` de Tailwind. No es la sombra pedida y no se puede redefinir por tema sin tocar la escala de Tailwind.

### D4. Barra superior sin merchants
- `Header` deja nombre, rol y **Sign out**; se quitan `strings.allMerchants` y `strings.noMerchants`. `useMe` sigue trayendo `merchants` (lo usará #83).
- *Alternativa descartada*: llevar la lista a un `title` sobre el rol. Sería información que no se ve ni con teclado ni en las capturas, y #83 va a ocupar ese sitio con el selector.

### D5. Un bloque con tono y cabecera por archivo
- Cuatro tonos en el tema, cada uno con fondo de bloque y fondo de cabecera: `--file-tone-{1..4}` y `--file-tone-{1..4}-header` en `:root` y `.dark`, expuestos como `--color-file-tone-*`. Matices azul, violeta, cian y pizarra, de croma bajo, para no confundirse con los colores de estado (D8).
- El tono es la **posición del archivo** en `detail.files` (orden del API, el mismo en Files y en Mapping) módulo 4: dos archivos vecinos nunca comparten tono y el mismo archivo tiene el mismo en los dos pasos. Las clases salen de una lista estática (`FILE_TONES`, Tailwind necesita literales) en `features/imports/file-tone.ts`.
- Cabecera compartida `FileHeader` (`features/imports/FileHeader.tsx`): icono `FileSpreadsheet` de `lucide-react` (`aria-hidden`), nombre en `font-semibold` con `[overflow-wrap:anywhere]` y `N sheets` en gris; en Mapping sigue siendo el `h2` de la sección, en Files el nombre accesible del `li` no cambia. Las `SheetCard` siguen con `bg-card` sobre el tono. Las entradas de la cola (pendiente, subiendo, rechazada) no toman tono.
- *Alternativa descartada 1*: tono por hash del `fileId`. Dos archivos podrían caer en el mismo tono, y el reparto cambiaría entre imports sin motivo visible.
- *Alternativa descartada 2*: solo alternar dos tonos (cebra). Con los diez archivos de un import grande, el tercero sería igual que el primero a la vista.

### D6. Línea de readiness con la hoja en negrita
- `Line` pasa a `{ key, sheet, text }`: `sheet` es `sheetName ?? 'Import'` y `text` la descripción sin la hoja (`strings.readiness.item` / `note` / `unconfirmed` dejan de recibir la hoja). Cada `li` es una rejilla `grid-cols-[minmax(4rem,max-content)_1fr]` con `<strong>{sheet}</strong>` y la descripción, con un `<span class="sr-only">: </span>` delante de la descripción para que el elemento se lea como una frase (`DEC: Fixed status…`). Vale igual para lo accionable, lo informativo plegado y "Ready to analyze".
- *Alternativa descartada*: mantener el texto compuesto y poner en negrita lo que va antes del primer ` · `. Es partir un texto de interfaz con una expresión regular, y una hoja con ` · ` en el nombre lo rompería.

### D7. Nombre de archivo partido en la tabla de filas
- La celda de archivo pierde `truncate` y `max-w-56` y usa `max-w-64 [overflow-wrap:anywhere]`, con `title` = nombre completo. La hoja sigue con `whitespace-nowrap`.
- *Alternativa descartada*: `break-all`. Parte también nombres que cabrían enteros; `overflow-wrap: anywhere` solo parte cuando no cabe (los nombres de la plantilla no tienen espacios).

### D8. Colores de estado: variantes de Badge y un mapa por enumeración
- **Tema**: `--status-{success,warning,danger,neutral}` (fondo) y `--status-{…}-foreground` (texto) en `:root` y `.dark`, expuestos como `--color-status-*`. Valores de partida (tema claro), a comprobar en el navegador: success `oklch(0.95 0.05 150)` / `oklch(0.42 0.12 150)`; warning `oklch(0.96 0.06 85)` / `oklch(0.45 0.1 65)`; danger `oklch(0.95 0.04 25)` / `oklch(0.48 0.17 27)`; neutral `oklch(0.95 0 0)` / `oklch(0.4 0 0)`.
- **Badge**: variantes nuevas `success`, `warning`, `danger` y `neutral` (`bg-status-x text-status-x-foreground`). `destructive` y las demás se quedan para usos que no son estado.
- **Mapa** en `lib/status-tone.ts`, un `Record<Enum, Tone>` por enumeración con `satisfies`, para que un valor nuevo en `@recon/shared` rompa `typecheck`:

| Enumeración | success | warning | danger | neutral |
|---|---|---|---|---|
| `ValidationOutcome` | `passed` | `warning` | `blocked` | `not_applicable`, `not_implemented` |
| Estado global de la corrida | `Passed` | `Warnings` | `Blocked` | — |
| `ImportStatus` | `validated`, `processed` | — | — | `uploaded`, `mapped`, `analyzed`, `cancelled` |
| `BatchStatus` | `paid` | `processed` | — | `undone` |
| `SettledStatus` | `settled` | `pending_payment` | — | `undone` |

- **Criterio (aprobado por la persona el 2026-10-21, proposal insumo 2)**: el color responde a "¿queda algo pendiente?", no a "¿salió bien el paso?". Verde: nada pendiente (import `processed`, batch `paid` / `settled`, validación `passed`). Ámbar: falta algo que no bloquea (batch `processed` / `pending_payment`, falta el pago; validación `warning`; estados en revisión que esperan una decisión). Rojo: lo que bloquea y hay que resolver (validación `blocked`, hoy solo `provider_mismatch`); hoy no hay un resultado `failed` ni un estado de error del import, así que el rojo no tiene otro valor. Gris: `cancelled`, `undone`, `n/a`, `Not implemented` y los estados intermedios del import. El mapa de la tabla se aprueba tal cual (`validated` sigue en verde).
- `cancelled` y `undone` en gris: son decisiones del analista, no fallos, y el rojo queda solo para lo que bloquea y hay que resolver. `processed` / `pending_payment` en ámbar: el dinero no está pagado y nada es Settled (el Summary ya lo avisa). Si en las capturas (12.2) el verde de `processed` del import frente al ámbar del batch confunde, se ajusta allí.
- **Valor fuera del mapa → gris**: `satisfies` rompe `typecheck` si `@recon/shared` añade un valor; además, la búsqueda (`toneOf`) devuelve `neutral` para cualquier valor que no tenga entrada (`Object.hasOwn`, para que tampoco valga `toString`), y un test lo fija, para que un estado nuevo que llegue en ejecución salga en gris y con su texto, no sin color por accidente.
- **El color nunca va solo**: el texto del Badge sigue diciendo el estado (accesibilidad y daltonismo), y el contraste del texto sobre cada fondo cumple AA (4,5:1) en el tema claro, medido en 12.2.
- El texto no cambia en ningún sitio (en `ImportHeader` y `Occurrences` sigue siendo el valor en crudo, `validated`, `paid`).
- **Solo Badge**: la columna Settled de Movements (`Settled` / `Pending payment`) es texto plano y sigue así. El Badge de estado de `SettlementsTable` sí entra y conserva `h-auto whitespace-normal`, para que `Processed · pending payment` pueda partirse a 1024 px.
- *Alternativa descartada 1*: `cancelled` en rojo. Pondría al mismo nivel un import cancelado a propósito y un `provider_mismatch` que bloquea.
- *Alternativa descartada 2*: comprobar el contraste AA con un test que lea `index.css` y convierta `oklch` a sRGB. Sería una conversión de color escrita a mano y sin probar, sobre un CSS leído como texto; el contraste se mide en el navegador (D16) y se anota en el PR.

### D9. Rangos de fechas: tabla en Validations, columna en Totals by type
- **Validations**: `components/DateRangesTable.tsx`, con sus textos en `components/strings.ts` (columnas, `—`, etiquetas de ciclo y estado). Props: `title` y `ranges: Record<'APP' | 'DEC' | 'I' | 'R', { min: BusinessDate; max: BusinessDate } | null>`. Va dentro de una `Card` con `CardTitle` = `Date ranges used by the validations`, que es también el nombre accesible de la tabla (`aria-labelledby`); la tabla tiene el formato de las demás de la app (cabecera, separadores) y el ancho de su contenido (`w-auto`), alineada a la izquierda, y la tarjeta no ocupa más que la tabla (`w-fit`). Filas E·APP, E·DEC, I·CHB, I·REF, I·RDR y R·`—`; la celda de rango I con `rowSpan={3}`. Rango con `formatBusinessDateTime(min) – formatBusinessDateTime(max)` (con hora y `ET`, que es lo que comparan las validaciones), `—` si es `null`. **Con resultado `Blocked` no se pinta** (revisión 12.2): `provider_mismatch` impide seguir y los rangos no ayudan a resolverlo.
- **Settlement Summary y Settlement Review** (revisión 12.2, sustituye a la tabla `Date ranges of this batch`): `TotalsByType` (`FiguresTables.tsx`, el mismo componente en el pre-summary y en el Summary, así que sale igual en los dos sitios) recibe `ranges` (`dateRanges` de la respuesta) y añade la columna **Date range**: `Deposits` → APP, `Declined` → DEC, `Chargebacks`, `Refunds` y `RDR` → I, `R · Reserve released` (solo en el Summary) → R. Solo el día, con `formatBusinessDate(min) – formatBusinessDate(max)` (fecha de negocio de Nueva York con sus dígitos, sin hora ni `ET`, D12), `—` si es `null`. Cada fecha en un `whitespace-nowrap`, para que a 1024 px la celda pueda partirse por el guion y nunca dentro de una fecha. El rango I se **repite en sus tres filas**: cada fila se lee sola con lector de pantalla y no depende del orden en que el API envía las categorías.
- Se quitan la prop `transactions` y su columna, que solo usaba el Summary, y `transactionsOf` de `SummaryHeader`.
- *Alternativa descartada 1*: dejar cada pantalla con su lista (`RunHeader` con `<ul>`, `SummaryHeader` con `s.range`). Son dos formatos para el mismo dato y era justo lo que se leía mal.
- *Alternativa descartada 2*: en Totals by type, una celda de rango I con `rowSpan={3}`. Ahorra dos repeticiones, pero depende de que chargeback, refund y rdr lleguen seguidos y en ese orden, y una celda que abarca filas se anuncia peor al leer una fila suelta.
- *Alternativa descartada 3*: mantener la tabla `Date ranges of this batch` y la columna. El mismo dato dos veces en la misma pantalla, que es lo que la revisión pidió quitar.

### D10. Contadores de Validations explicados en la pantalla
- `RunHeader` pinta los tres contadores como `<dl>`: nombre, valor y una línea de explicación (`strings.header.explain.*`, en inglés) a la vista: *Pending in range* — "Transactions of the account's channels still Pending on the gateway, created within the APP or DEC range."; *Undated adjustments* — "Rows of this batch in cycle I without a status-change date."; *Undated candidates* — "Gateway transactions in a cycle I status without a status-change date: they cannot be compared with the I range." y una nota común "Informative: none of them is a finding." (README §3.3, "Candidatas I sin fecha" y "`Pending`").
- **Resultado general junto al título** (revisión 12.2): la fila del `h3` `Validations` lleva, tras el título, `Overall result` (texto secundario) y el Badge del estado global, y a continuación, en texto secundario, `Run #<id> · <fecha> · <usuario>`; **Run validations** sigue a la derecha. `RunHeader` se parte en `RunOverall` (esa línea, que `ValidationsSection` pinta en la fila del título solo con corrida) y `RunHeader` (rangos y contadores, la región `Validation run`). El Badge sigue con su texto (D8).
- *Alternativa descartada*: explicación en un `Tooltip`. No se ve con pantalla táctil ni en las capturas de la demo, y en teclado exige foco en un elemento que no es interactivo.
- *Alternativa descartada*: dejar el resultado general en `RunHeader`, encima de la tabla. Es lo primero que el analista quiere saber y quedaba por debajo de la cabecera de la sección.

### D11. Cabecera del Summary en rejilla
- `SummaryHeader`: `h1` como hoy y, debajo, un `<dl>` en rejilla (el `Badge` de estado pasa del lado del `h1` a la rejilla, para que el estado se vea una sola vez: `read-only.test.tsx` y `exports.test.tsx` lo buscan por su texto y deben seguir sin cambios) (`grid-cols-2`, `lg:grid-cols-5`) con **Account**, **Batch** (`123 · attempt 1`), **Status** (Badge con el tono de D8), **Processed by** (`analyst · <formatAuditDateTime>`) y **Settlement date** (`formatBusinessDate` o `Not set`); después el aviso de no Settled. Los rangos del batch están en `Totals by type` (D9, revisión 12.2), no en la cabecera. Se quitan `s.attempt`, `s.processedBy`, `s.settlementDate` y `s.range` de los textos si no quedan usos.
- *Alternativa descartada*: meter la cabecera en una `Card` con tabla clave-valor. Quita altura a las tarjetas de cifras, que son lo que se audita, y la rejilla cabe en una línea a 1280 px.

### D12. Fechas de un día sin `ET`
- `compose` añade `ET` solo con hora: `formatBusinessDate` devuelve `YYYY-MM-DD`; `formatBusinessDateTime` y `formatAuditDateTime` no cambian. Afecta a fecha de liquidación (Summary y lista), vigencias de fees (`AddFee`) y liberación prevista de la reserva (`SummaryMovements`).
- *Alternativa descartada*: una función nueva `formatBusinessDay` y dejar la vieja. Todos los usos quieren lo mismo, y dos funciones para un día invitan a usar la que no toca.

### D13. Navegación dentro de la página
- **Sin volver arriba**: `resetScroll: false` en cada `navigate` y `Link` que solo cambia la búsqueda de la ruta actual sin cambiar de paso: `AnalysisStep` (filas), `Counters` (Show rows), `ValidationsSection` (`go`, `close`: validación, página de hallazgos, hallazgo abierto y cerrado; incluye `onShowBlocking` de `DecisionBar`), `AccountsPage` (`chooseMerchant`, `chooseProvider`), los `writeChoice` que `SettlementListPage` y `NewReconciliationPage` pasan a `useAccountChoice` (`account-choice.tsx` no navega por sí mismo), `SettlementListPage` (`onFilters`, `onPage`) y `SettlementSummaryPage` (`onValueChange` de las pestañas y `onChange` de `SummaryMovements`: ciclo y página). Cambiar de paso (`ImportPage.toStep`) y los enlaces a otra ruta siguen volviendo arriba: el contenido es otro.
- **Foco en la lista**: `lib/list-focus.tsx` (exporta el componente) con `requestListFocus(name)` y `ListHeading({ name, focusKey, ... })`; `name` es una clave estable de la lista (`rows`, `findings`, `settlements`, `movements`), no su texto visible. El manejador de la acción del usuario (pulsar la validación, Show rows, un filtro, **Next**/**Previous**, un ciclo) llama a `requestListFocus` antes de navegar; el encabezado de la lista (`h3`/`h4` con `tabIndex={-1}` y `data-list-heading`), en un efecto que depende de `focusKey` (filtro y página), comprueba si la petición pendiente es la suya y entonces hace `focus({ preventScroll: true })` y `scrollIntoView({ block: 'start' })` y la borra. Encabezados nuevos donde no hay: tabla de filas (`Rows`), Settlement List (`Settlements`) y Movements (`Movements · <ciclo>`); los existentes de hallazgos y de validaciones se reutilizan.
- **Filtros de Settlement List sin foco**: el estado y la fecha que filtra son `<select>` y **From**/**To** son `<input type="date">`, que lanzan `change` mientras se elige (cada flecha en un desplegable cerrado, cada parte completada de una fecha). Mover el foco al encabezado en cada `change` sacaría al usuario del control a mitad de elección y rompería el teclado (escenario "Lista y movimientos con teclado"). Por eso `onFilters` solo lleva `resetScroll: false`, y en Settlement List solo **Previous**/**Next** piden el foco. Los filtros de la tabla de filas de Analysis son botones (`aria-pressed`) y sí lo piden. Los desplegables de cuenta (`AccountsPage`, `writeChoice`) tampoco lo piden.
- **Dónde se pide el foco**: `requestListFocus` va en los clics de `Pager` (`onPrevious`, `onNext`), nunca en `onPage`, porque `useLastPageLimit` también llama a `onPage` (con `replace`) cuando la página pedida ya no existe, sin que el usuario haga nada. El encabezado `Movements · <ciclo>` vive en `SummaryMovements`, fuera de `MovementsTable`: al cambiar de ciclo el `placeholderData` se descarta y la tabla se sustituye por el `Skeleton`, de modo que un encabezado dentro de la tabla no existiría en el momento de enfocarlo. El de `Settlements` vive en `AccountSettlements`, encima de la tabla.
- Recargar, llegar por enlace y Atrás/Adelante no piden foco, así que no lo mueven. Abrir y cerrar el panel de un hallazgo conserva la posición y el foco vuelve al ID, como ya hace `IssueDrawer`.
- *Alternativa descartada 1*: un efecto que enfoque la lista cada vez que cambia su búsqueda. Robaría el foco al recargar, al llegar por un enlace con `validation=` y al volver atrás.
- *Alternativa descartada 2*: `scrollRestoration: true` en el router. Restaura posiciones al ir atrás y adelante, pero una navegación nueva sigue volviendo arriba: no resuelve el caso y añade estado en `sessionStorage`.

### D14. Deltas sobre la spec que deja `settlements-browse`
- "Pantallas de settlement: fechas en hora de Nueva York" y "Pantalla Settlement List: columnas" se escriben sobre la versión de `settlements-browse`, ya archivada en `openspec/specs/settlement/spec.md` (#89), así que el orden de archivo está cumplido. El grupo 1 comprobó que el texto de esos dos requisitos y el de "Pantalla Settlement Summary: estado y cabecera del intento" en la spec principal es el que este delta modifica: la revisión de #64 no los cambió.
- *Alternativa descartada*: no modificar esos requisitos y dejar el `ET` de la lista en la spec. La spec principal diría `2026-10-24 ET` y la pantalla `2026-10-24`.

### D15. Tests: primero los de comportamiento, y los que cambian a propósito
- **Test primero** (rojo antes del código, y una rotura a propósito en verde):
  - Foco y desplazamiento: espía de `window.scrollTo` (sin llamada con `top: 0`) y de `scrollIntoView`, y `document.activeElement` igual al encabezado, en Analysis (validación, Show unmatched rows, filtro y página de filas, página de hallazgos, abrir y cerrar hallazgo), Settlement List (filtro sin mover el foco del desplegable; página con foco en la lista; `useLastPageLimit` sin mover el foco) y Summary (pestaña, ciclo, página); y que recargar o abrir la dirección con `validation=` y `match=` no mueve el foco. Rotura: quitar `resetScroll: false` de `go` (falla "elegir una validación").
  - Badge: `status-tone.test.ts` (cada valor de cada enumeración con su tono) y, en las pantallas, `data-variant` y texto del Badge (`ValidationsTable`, `RunHeader`, `ImportHeader`, `SummaryHeader`, `SettlementsTable`, `Occurrences`). Rotura: `blocked → warning` en el mapa.
  - `DateRangesTable`: filas y orden, `rowSpan` del rango I, `—` en R y en rango nulo, columna Transactions solo con `transactions`; Validations sin la columna; Summary con los `qty` de la fixture y `movements.R`. Rotura: pasar `transactions` en Validations.
  - Fechas: `formatBusinessDate` sin `ET`, con hora con `ET`. Rotura: volver a añadir `ET` siempre.
  - Readiness: hoja en `<strong>` y el `li` leído como `DEC: Fixed status…`.
- **Tests existentes que cambian a propósito** (se cambian en el commit `test:` del grupo que los toca, citando el escenario modificado):
  - `frontend/src/lib/format.test.ts:36` — `'2026-09-28 ET'` → `'2026-09-28'`.
  - `frontend/src/features/settlements/SettlementSummary.test.tsx:37` y `:153` — `Processed by analyst on 2026-10-19 11:40 ET` → rejilla `Processed by` `analyst · 2026-10-19 11:40 ET`; `:151` — `Settlement date: 2026-10-24 ET` → `Settlement date: 2026-10-24` en el grupo 5 (D12 cambia el formateador) y → rejilla `Settlement date` `2026-10-24` en el grupo 7; `:152` — línea `APP 2026-09-28 00:04 ET – 2026-10-07 23:58 ET` → fila `E` `APP` de la tabla.
  - `frontend/src/features/settlements/SettlementList.test.tsx:59` y `:110` (de #64) — `'2026-10-02 ET'` → `'2026-10-02'` (en `:110`, la pieza sin partir sigue con `whitespace-nowrap`).
  - `frontend/src/features/settlements/SummaryMovements.test.tsx:158` y `:172` (de #64) — `Expected release 2027-03-27 ET` y `release 2027-03-27 ET` → sin `ET`; la fecha sigue pegada a `release` por el espacio de no separación de `Labelled`.
  - `frontend/src/features/validations/ValidationsSection.test.tsx:54-60` y `:75-77` — lista `Ranges used` → tabla `Date ranges used by the validations`; `:61-66` — contadores con su explicación.
  - `frontend/src/features/imports/analysis/RowsTable.test.tsx:145-157` — `toHaveClass('truncate')` → nombre entero, sin `truncate`, con `title`.
  - `frontend/src/features/imports/mapping/analyze.test.tsx:84-85`, `:101`, `:107-110` y `:128-131` — textos `DEC · …`, `CHB · …` y `/ · confirmation: /` → hoja en negrita y `li` leído con `: `; también `:42`, `:137-138` y `:208` (`APP · transactionId: …`, `Import · transactions: …`), con el mismo formato de la readiness.
  - `frontend/src/app/layout/AppLayout.test.tsx:108-114` y `:117-123` — `Merchant A, Merchant B` y `strings.allMerchants` → ausentes.
- **No cambian** (fechas con hora, conservan `ET`): `format.test.ts:35`, `:40`, `:44`; `IssueDrawer.test.tsx:97`, `:121`, `:164`; `decision.test.tsx:61`; `inclusion.test.tsx:54`; `resolve.test.tsx:41`; `SummaryMovements.test.tsx:176-180` y `:206` (de #64); `SettlementList.test.tsx:60` y `:111`.
- Lo puramente visual (sangría, sombra, tonos de archivo) no lleva test de clases: se comprueba en el navegador y en las capturas (D16).
- *Alternativa descartada*: tests que comprueben clases de Tailwind (`toHaveClass('pl-6')`, `shadow-card`). Fijan la implementación, no lo que se ve, y no detectan un valor del tema equivocado.

### D16. Último grupo: navegador y capturas, con turno
1. La persona confirma el turno de base, prepara la base (`! pnpm db:up`, `! pnpm db:migrate`, `! pnpm db:seed`) y levanta `pnpm dev`.
2. Revisión manual como `analyst` y `viewer` a 1280 y 1024 px: menú, sombra de tarjetas, barra superior, Files y Mapping de `batch-split` (tonos y cabeceras), readiness de `batch-clean`, Analysis de `batch-issues` (colores, tabla de rangos, contadores, Show unmatched rows, validación, filtros y páginas sin volver arriba), Settlement Review, Summary (rejilla, tabla de rangos, Movements), Settlement List (filtros y páginas). Contraste de cada color de estado medido con las herramientas del navegador (≥ 4,5:1), anotado en el PR; si alguno no llega, se ajusta su variable.
3. **Aviso a la persona antes de lanzar los scripts.** Con su visto bueno: `pnpm screenshots:web-validations`, `pnpm screenshots:web-settlement` y `pnpm screenshots:settlements-browse` (este falla si una pieza sin partir ocupa dos líneas o algo desborda a 1024 px, lo que vigila también los Badge con color y la rejilla del Summary), con sus protecciones (credenciales por `process.loadEnvFile` sin leerlas ni imprimirlas, sin trace ni vídeo, ninguna captura del login). Se revisa cada PNG antes de versionarlo y se comprueba en consola que no hay desplazamiento horizontal. `web-settlement` deja `batch-clean` procesado: la persona vuelve a sembrar después.
4. Files y Mapping no tienen script de capturas: se revisan en el navegador (paso 2); crear un script para ellos queda fuera de este change.

### D17. Documento de la revisión
- `docs/uat/2026-10-20-revision-interfaz.md`, en español: fecha, participantes por rol ("líder del equipo", "analista del proyecto"), objetivo (legibilidad para la demo de la Entrega 2) y una tabla de observaciones con columnas Pantalla · Observación · Clasificación (`ui-polish`, `Entrega 3` o `Roadmap`) · Referencia (requisito del delta o issue #82–#87). Sin nombres de personas.
- *Alternativa descartada*: anotar las observaciones solo en el proposal. Se pierden al archivar el change, y la revisión con usuarios es una evidencia de la entrega.

### D18. Rango del batch en el panel de un faltante
- En `IssueDrawer`, un hallazgo `missing` con `missingRange` y de la **corrida vigente** (`issue.run.isCurrent`) muestra en sus datos `Batch range (<ciclo>/<estado>)` con el rango de esa clave en `run.ranges` (`validationRunQuery(issue.importId)`, ya en caché porque el panel vive en `ValidationsSection`), formateado como en la tabla de Validations (`formatBusinessDateTime`, con hora y `ET`, porque la fecha comparada lleva hora). Sustituye a la línea `Range` (`APP`) en ese caso. La etiqueta sale de `missingRange`: `E/APP`, `E/DEC`, `I/<estado del gateway abreviado: CHB, REF, RDR>` (`I` solo si el gateway no trae estado) y `R`, sin estado (la reserva es una etapa, no un estado). Rango `null` → `—`.
- Debajo, una línea de por qué es faltante, según `missingType`, ajustada a la regla de README §3.3 ("Faltantes"): *in range* — "Its date is inside the batch range, but it is not in this batch and no batch processed it in this cycle."; *previous to batch* — "Its date is before the batch range and no batch processed it in this cycle." Los textos propuestos en la revisión ("not in the file", "never reported in a previous batch") se ajustaron: el batch puede tener varios archivos, y la regla excluye las procesadas en ese ciclo en un batch vigente, no las "reportadas" (un intento deshecho no cuenta).
- Sin reglas ni cálculos nuevos en el navegador ni cambios en el API: el rango es el de la corrida y la línea depende solo de `missingType`.
- Un faltante de una corrida que ya no es la vigente no muestra `Batch range` (la pantalla solo tiene los rangos de la corrida vigente) y conserva `Range`.
- *Alternativa descartada*: añadir el rango al detalle del hallazgo en el API. Duplica un dato que la corrida ya da y obliga a tocar el contrato, la colección y el backend en un change de interfaz.

## Risks / Trade-offs

- [El rebase sobre #64 trae cambios de su revisión en los mismos componentes] → Grupo 1 en verde antes de empezar; D14 contrasta los textos de la spec.
- [`resetScroll: false` olvidado en un sitio nuevo] → Los tests de D15 cubren cada sitio de D13; la lista de D13 se vuelve a buscar con `rg "navigate\(|search=\{"` tras el rebase.
- [Mover el foco a la lista tras un filtro o una página aleja el foco del control pulsado] → Es lo pedido; el encabezado con `tabIndex=-1` deja a Tab a un paso de la tabla y el lector de pantalla anuncia la lista actualizada. Se revisa con teclado en D16.
- [Un tono o un color de estado sin contraste suficiente en algún monitor] → Medición en el navegador (D16, paso 2) y valores como variables, que se ajustan sin tocar componentes.
- [Cuatro tonos para imports de más de cuatro archivos] → Vecinos siempre distintos y cabecera con el nombre; el plegado (#85) ayudará con muchos archivos.
- [Columna Transactions solo en el Summary] → Lo dice el escenario de Validations y queda en #87.
- [Los scripts de capturas modifican la base] → Solo con turno y aviso (D16); `web-settlement` obliga a volver a sembrar.

## Migration Plan

Sin migraciones ni cambios de API. Despliegue de la SPA. Rollback: revertir el PR.
