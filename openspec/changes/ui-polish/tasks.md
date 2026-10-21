# Tasks — ui-polish

Origen: revisión de la interfaz con el líder del equipo (2026-10-20). Rama `feat/ui-polish`, PR hacia `feature/entrega-2-MVP`. **Solo frontend**: sin cambios de backend, API, esquema, OpenAPI ni colección Bruno, y ninguna cifra calculada en el navegador. Si una tarea descubre que necesita un dato que el API no da, para y lo anota en el proposal en vez de calcularlo. Referencias: `specs/{web-shell,import,validation,settlement}/spec.md` (qué) y `design.md` D1–D17 (cómo).

Orden test-first en los grupos de comportamiento: los tests se escriben y se ven fallar (rojo) antes del código; en verde, se rompe el código a propósito una vez para comprobar que el test lo detecta, y se restaura. Los tests existentes que cambian a propósito son los de D15 y se cambian en el commit `test:` de su grupo. Textos de interfaz en inglés y en el módulo de textos de su pantalla (o en `components/strings.ts` para la tabla de rangos). Colores, sombras y tonos nuevos solo como variables del tema (`index.css`), con valor en `:root` y en `.dark`.

## 1. Rebase sobre `feature/entrega-2-MVP` con #64 fusionado (D1, D14)

#64 (`settlements-browse`) está fusionado (#88) y archivado (#89). El grupo parte de la versión fusionada de `SettlementsTable` y `SummaryMovements`, que #64 cambió en su revisión (Processed y Channels en varias líneas con `NoBreak` y `WrapAfterCommas`; una sola columna Reserves con líneas `Labelled` y el desglose de fees debajo de la celda): los grupos 4, 5 y 9 trabajan sobre esa versión, no sobre la que leyó el proposal.

- [x] 1.1 Rebase de `feat/ui-polish` sobre `feature/entrega-2-MVP`; verificar `pnpm lint && pnpm typecheck && pnpm test` en verde sin tocar nada
- [x] 1.2 Comprobar que existen `SettlementsTable.tsx`, `SettlementListPage.tsx`, `SummaryMovements.tsx`, `list-search.ts`, `summary-search.ts` y `accounts/account-choice.tsx`, y que el texto de "Pantallas de settlement: fechas en hora de Nueva York" y "Pantalla Settlement List: columnas" en `openspec/changes/settlements-browse/specs/settlement/spec.md` (o en `openspec/specs/settlement/spec.md` si ya se archivó) coincide con el que modifica `specs/settlement/spec.md` de este change; si cambió en la revisión de #64, actualizar el delta y verificar `openspec validate ui-polish --type change --strict`
- [x] 1.3 Volver a listar con `rg` los `navigate(` y `search={` de `frontend/src` y contrastarlos con la lista de D13; anotar en D13 cualquier sitio nuevo
- [x] 1.4 Commit (solo si 1.2 o 1.3 cambiaron artifacts): `docs(openspec): ui-polish sobre la spec y el código de settlements-browse`

## 2. Documento de la revisión (D17)

- [x] 2.1 Escribir `docs/uat/2026-10-20-revision-interfaz.md`: fecha, participantes por rol ("líder del equipo", "analista del proyecto"), objetivo, y tabla Pantalla · Observación · Clasificación · Referencia con los doce puntos de este change (`ui-polish`, con el requisito del delta) y los de fuera de alcance: plegar archivos en Mapping (#85, Entrega 3), columna Round (#86, Entrega 3), Transactions por estado en Validations (#87, Entrega 3), summary `.xlsx` (#82, Entrega 3), selector de merchant (#83, roadmap) y modo oscuro (#84, roadmap). Verificar con `rg` que no aparece ningún nombre de persona
- [x] 2.2 Commit: `docs(uat): observaciones de la revisión de la interfaz del 20-oct`

## 3. Tema, menú, tarjetas y barra superior (D2, D3, D4)

- [x] 3.1 Test (rojo) en `app/layout/AppLayout.test.tsx` (escenarios "Alcance asignado" y "Alcance total" modificados): la cabecera muestra nombre, rol y **Sign out**, y no contiene `Merchant A, Merchant B` ni `All merchants` (cambio a propósito de `:108-114` y `:117-123`)
- [x] 3.2 Implementar `Header` sin merchants y quitar `allMerchants` / `noMerchants` de `app/layout/strings.ts`; verificar 3.1 en verde; romper a propósito devolviendo la lista y ver fallar 3.1; restaurar
- [x] 3.3 Añadir a `index.css` `--card-shadow` (`:root` y `.dark`) y `--shadow-card` en `@theme inline`, y `shadow-card` en `components/ui/card.tsx`; sangría de las entradas de grupo en `Sidebar` (`pl-6`, títulos y Dashboard en `px-3`); verificar `pnpm lint`, `pnpm --filter @recon/frontend build` y que los tests de `app/` siguen en verde. La comprobación visual queda en 12.2
- [x] 3.4 Commit: `test(frontend): barra superior sin la lista de merchants` y `feat(frontend): sangría del menú, sombra de las tarjetas como variable del tema y barra superior sin merchants`

## 4. Colores de estado (D8)

- [x] 4.1 Test (rojo) `lib/status-tone.test.ts`: cada valor de `ValidationOutcome`, estado global de la corrida, `ImportStatus`, `BatchStatus` y `SettledStatus` con el tono de la tabla de D8, y un valor que no está en el mapa (también `toString`) → `neutral`
- [x] 4.2 Test (rojo) en las pantallas, con `data-variant` y el texto del Badge (escenarios de "Colores de estado"): `ValidationsTable` y `RunHeader` con `batch-issues` (`Passed` → `success`, `Warning` y `Warnings` → `warning`) y `batch-blocked` (`Blocked` → `danger`); `n/a` y `Not implemented` → `neutral`; `ImportHeader` con `validated` → `success` y `cancelled` → `neutral`; `SummaryHeader` y `SettlementsTable` con `pending_payment` → `warning`, `settled` → `success`, `undone` → `neutral`; `Occurrences` con un batch `paid` → `success`. En todos, el texto de hoy sin cambios
- [x] 4.3 Implementar las variables `--status-*` y `--status-*-foreground` (`:root` y `.dark`) y `--color-status-*`, las variantes `success`, `warning`, `danger` y `neutral` de `Badge`, `lib/status-tone.ts` con `satisfies` y su uso en `ValidationsTable` (sustituye `OUTCOME_VARIANT`), `RunHeader`, `ImportHeader`, `SettlementReviewPage`, `SummaryHeader`, `SettlementsTable` y `Occurrences`; verificar 4.1 y 4.2 en verde y `pnpm typecheck`; romper a propósito `blocked → warning` y ver fallar 4.1 y "Corrida bloqueada"; restaurar
- [x] 4.4 Commit: `test(frontend): color de cada estado en los Badge con su texto` y `feat(frontend): colores de estado como variables del tema en los Badge`

## 5. Fechas de un día sin ET (D12)

- [ ] 5.1 Test (rojo): `lib/format.test.ts:36` → `formatBusinessDate` da `2026-09-28` (cambio a propósito); `formatBusinessDateTime` y `formatAuditDateTime` siguen con `ET` (`:35`, `:40`, `:44` sin cambios); `SettlementList.test.tsx:59` y `:110` → `2026-10-02`; en `batch-fees.test.tsx`, la vigencia de un preestablecido sin `ET` (escenario "Vigencia de un fee preestablecido"); en `SummaryMovements.test.tsx:158` y `:172`, `expectedReserveReleaseAt` sin `ET` y pegado a `release`
- [ ] 5.2 Implementar en `lib/format.ts` el sufijo `ET` solo con hora y actualizar el comentario de cabecera de las fechas; verificar 5.1 en verde y que los tests con hora listados en D15 siguen en verde sin tocarlos; romper a propósito volviendo a añadir `ET` siempre y ver fallar 5.1; restaurar
- [ ] 5.3 Commit: `test(frontend): fechas de un día sin sufijo de zona` y `feat(frontend): fechas sin hora sin el sufijo ET`

## 6. Tabla de rangos compartida y cabecera de Validations (D9, D10)

- [ ] 6.1 Test (rojo) `components/DateRangesTable.test.tsx`: `caption` como nombre accesible; filas `E` `APP`, `E` `DEC`, `I` `CHB`, `I` `REF`, `I` `RDR`, `R` `—` en ese orden; una sola celda de rango I con `rowSpan = 3`; `—` en un rango `null`; columnas `Cycle`, `Status`, `Date range` sin `transactions` y con `Transactions` (valores tal como llegan) cuando se pasa
- [ ] 6.2 Test (rojo) en `features/validations/ValidationsSection.test.tsx` (escenarios "Corrida con advertencias", "Filas de la tabla de rangos", "Contadores explicados" y "Rango sin filas"): tabla `Date ranges used by the validations` con las seis filas y los rangos de la fixture en `ET`, sin columna `Transactions`; los tres contadores con su valor y su explicación; `ranges.DEC = null` → `—`. Sustituye a propósito las aserciones de `:54-60`, `:61-66` y `:75-77`
- [ ] 6.3 Implementar `components/DateRangesTable.tsx` y `components/strings.ts`, y en `RunHeader` la tabla y los contadores como `<dl>` con `strings.header.explain.*`; verificar 6.1 y 6.2 en verde; romper a propósito pasando `transactions` desde Validations y ver fallar 6.2; quitar el `rowSpan` y ver fallar 6.1; restaurar
- [ ] 6.4 Commit: `test(frontend): tabla de rangos por ciclo y estado y contadores explicados en Validations` y `feat(frontend): tabla de rangos compartida en la cabecera de Validations`

## 7. Cabecera del Settlement Summary (D9, D11)

- [ ] 7.1 Test (rojo) en `features/settlements/SettlementSummary.test.tsx` (escenarios "Recién procesado", "Sin fecha de liquidación", "Tabla de rangos del batch", "Rango nulo" y "Fechas del intento"): rejilla con `Account` `ProviderA-USD`, `Batch` `123 · attempt 1`, `Status`, `Processed by` `analyst · 2026-10-19 11:40 ET` y `Settlement date` `2026-10-24` (o `Not set`); tabla `Date ranges of this batch` con `Transactions` igual al `qty` de cada categoría de la fixture y a `movements.R`; aviso de no Settled. Sustituye a propósito `:37`, `:151`, `:152` y `:153`
- [ ] 7.2 Implementar `SummaryHeader` con la rejilla `<dl>` y `DateRangesTable` (`transactions` leídos de `view.totals` por categoría y de `view.movements.R`, sin operar), y quitar de `strings.ts` los textos que se queden sin uso; verificar 7.1 en verde y que `read-only.test.tsx`, `keyboard.test.tsx` y `SummaryMovements.test.tsx` siguen en verde; romper a propósito tomando `movements.E` en la fila `APP` y ver fallar 7.1; restaurar
- [ ] 7.3 Commit: `test(frontend): cabecera del Settlement Summary en rejilla con la tabla de rangos` y `feat(frontend): cabecera compacta del Settlement Summary`

## 8. Archivos en Files y Mapping, readiness y tabla de filas (D5, D6, D7)

- [ ] 8.1 Test (rojo) en `features/imports/mapping/analyze.test.tsx` (escenarios "Notas por archivo", "Nombre de hoja destacado" y "Ready to analyze"): el nombre de la hoja en `<strong>` dentro de su `li` y el `li` leído como `DEC: Fixed status Declined with rows: the DEC range will open at validation`; las confirmaciones pendientes localizadas por su descripción (`confirmation: …`) con la hoja en `<strong>`. Sustituye a propósito `:84-85`, `:101`, `:107-110` y `:128-131`
- [ ] 8.2 Test (rojo) en `features/imports/analysis/RowsTable.test.tsx:145-157` (escenario "Hoja y archivo de cada fila" modificado): el archivo sin `truncate`, con el nombre entero como texto y como `title`
- [ ] 8.3 Implementar `ReadinessBar` con `Line = { key, sheet, text }` y los textos de `strings.readiness` sin la hoja; la celda de archivo de `RowsTable` con `[overflow-wrap:anywhere]`; `features/imports/file-tone.ts` (`FILE_TONES` por posición), las variables `--file-tone-*` (`:root` y `.dark`) y `FileHeader` (icono, nombre, `N sheets`) en `FileList` y `MappingStep`, sin tono para las entradas de la cola; verificar 8.1, 8.2 y todos los tests de `features/imports` en verde (`MappingStep.test.tsx`, `confirm*.test.tsx`, `upload*.test.tsx`, `read-only.test.tsx`); romper a propósito componiendo otra vez `hoja · texto` y ver fallar 8.1; restaurar. La comprobación de tonos y cabeceras queda en 12.2
- [ ] 8.4 Commit: `test(frontend): hoja destacada en la readiness y nombre de archivo sin cortar` y `feat(frontend): bloque con tono y cabecera por archivo en Files y Mapping`

## 9. Navegación dentro de la página (D13)

- [ ] 9.1 Test (rojo) `features/imports/analysis/in-page-navigation.test.tsx` con espías de `window.scrollTo` y `Element.prototype.scrollIntoView` (escenarios de "Navegación dentro de la página: desplazamiento y foco"): con `batch-issues`, pulsar `Missing previous to batch` → ningún `scrollTo` con `top: 0`, `scrollIntoView` y foco en el encabezado de la lista de hallazgos; **Show unmatched rows** → lo mismo con el encabezado de la tabla de filas; filtro `Matched` y **Next** de las filas (con `batch-clean`) y **Next** de los hallazgos → lo mismo; abrir y cerrar un hallazgo → ningún `scrollTo` con `top: 0` y foco en el ID; abrir la dirección con `validation=missing_previous_to_batch&match=unmatched` → listas a la vista y el foco no está en ningún encabezado; `DecisionBar` "show blocking" con `batch-blocked` → foco en la lista de `Provider mismatch`
- [ ] 9.2 Test (rojo) `features/settlements/in-page-navigation.test.tsx`: Settlement List: filtro `Paid` → sin volver arriba y el foco sigue en el desplegable; **Next** → sin volver arriba y foco en el encabezado `Settlements`; una página más allá de la última (`useLastPageLimit`) → el foco no se mueve; Summary: abrir **Movements** → sin volver arriba y foco en la pestaña; elegir `I` y **Next** → foco en el encabezado de movimientos; recargar `?tab=movements&cycle=R&page=2` → el foco no se mueve
- [ ] 9.3 Implementar `lib/list-focus.ts` (`requestListFocus`, `ListHeading`), `resetScroll: false` en todos los sitios de D13 (incluido el `Link` de `Counters`, `go` y `close` de `ValidationsSection`, selectores de `AccountsPage` y `account-choice`, filtros y `Pager` de Settlement List, pestañas, ciclo y página del Summary), encabezados nuevos de filas, settlements y movimientos con sus textos, y `requestListFocus` en los manejadores; dejar `ImportPage.toStep` con su comportamiento; verificar 9.1, 9.2 y los tests existentes de `imports`, `validations` (en especial `IssueDrawer.test.tsx` y `keyboard.test.tsx`) y `settlements` en verde; romper a propósito quitando `resetScroll: false` de `go` y ver fallar "elegir una validación"; quitar la comprobación de petición pendiente y ver fallar "abrir la dirección"; restaurar
- [ ] 9.4 Commit: `test(frontend): desplazamiento y foco al actualizar una lista dentro de la página` y `feat(frontend): las listas se actualizan sin volver arriba y con el foco en su encabezado`

## 10. Verificación conjunta

- [ ] 10.1 Verificar `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @recon/frontend build` en verde, `pnpm test:e2e --list` sin cambios en el smoke y `openspec validate ui-polish --type change --strict` sin errores (el aviso de archivo de "Pantalla Settlement List: columnas" solo es aceptable si `settlements-browse` aún no está archivado, D14)
- [ ] 10.2 Comprobar con `rg` que no queda ningún color de estado literal en los Badge (`emerald`, `amber`, `red` en `variant`/`className` de `Badge`), que ningún componente nuevo tiene textos visibles fuera de su módulo de textos, que no hay comentarios en español en `.ts`/`.tsx`, que `git diff feature/entrega-2-MVP -- backend packages docs/openapi.yaml api-collection` está vacío, y que ningún cambio suma, resta ni cuenta cifras del API en el navegador; anotarlo en el PR
- [ ] 10.3 Commit (si 10.2 corrige algo): `fix(frontend): restos de la revisión de ui-polish`

## 11. Registro

- [ ] 11.1 Añadir el change a `prompts.md` (origen en la revisión del 20-oct, decisiones D8 y D13, issues #85–#87) y una línea en `docs/wireframes/README.md` si las capturas de 12.3 cambian de nombre o de pantalla
- [ ] 11.2 Commit: `docs(ui-polish): registro del change en prompts.md`

## 12. Revisión en el navegador y capturas — con turno de base (D16)

**Avisar a la persona antes de empezar este grupo y de nuevo antes de lanzar los scripts.**

- [ ] 12.1 La persona confirma el turno, prepara la base con `! pnpm db:up`, `! pnpm db:migrate` y `! pnpm db:seed` y levanta `! pnpm dev`
- [ ] 12.2 Revisión manual como `analyst` y `viewer` a 1280 y 1024 px, según D16 paso 2: sangría del menú, sombra de las tarjetas, barra superior, tonos y cabeceras de `batch-split` en Files y Mapping (mismo tono por archivo en los dos pasos), readiness de `batch-clean`, Analysis de `batch-issues` (colores, tabla de rangos, contadores, Show unmatched rows, validación, filtros y páginas sin volver arriba y con el foco en la lista), Summary (rejilla, tabla de rangos con Transactions, Movements) y Settlement List; medir el contraste de cada color de estado (≥ 4,5:1) y anotarlo en el PR; sin desplazamiento horizontal. Notas del gate: si `processed` verde en el import y ámbar en el batch confunde, se ajusta el mapa de D8 (y su test 4.1); si los cuatro tonos de archivo quedan demasiado coloridos, se baja a un solo tono en D5 (se mantiene la cabecera marcada). Si algo falla, corregirlo con su test en el grupo que corresponda y volver a 10.1
- [ ] 12.3 Con el visto bueno de la persona, ejecutar `pnpm screenshots:web-validations`, `pnpm screenshots:web-settlement` y `pnpm screenshots:settlements-browse`; revisar cada PNG antes de versionarlo (ninguna credencial ni pantalla de login) y la salida de consola sin desplazamiento horizontal. Después, la persona vuelve a sembrar con `! pnpm db:seed`
- [ ] 12.4 Describir en el PR los tests cambiados a propósito (D15) con el escenario que los motiva, las mediciones de contraste, la clasificación de D8 aprobada por la persona y los issues #85, #86 y #87
- [ ] 12.5 Commit: `docs(ui-polish): capturas de Validations, Settlement y Settlement List tras el pulido de la interfaz`

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/ui-polish` hacia `feature/entrega-2-MVP` con la plantilla, citando el documento de la revisión y los issues #85–#87; solo tras el grupo 12.
- `/opsx:archive` tras el merge y **después del archivo de `settlements-browse`** (D14).
