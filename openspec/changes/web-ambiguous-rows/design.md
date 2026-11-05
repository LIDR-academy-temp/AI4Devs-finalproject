# Design — web-ambiguous-rows

## Context

Motivación y alcance en `proposal.md`; comportamiento en el delta spec `import`. Estado de partida:

- **API (no cambia).** `PATCH /imports/{id}/rows/{sheetId}/{rowNo}` con `ResolveRowBody` (`{ gatewayId }` entero positivo), permiso `settlement.process`. Orden de comprobaciones en `ImportService.resolveRow`: alcance (`404`), estado `analyzed` (`409 import_not_editable` con `details.status`), fila (`404`), `ambiguous` (`409 row_not_ambiguous` con `details.matchResult`), candidata (`400 validation_error` con `details.gatewayId` y `details.candidates`, ocultas las de otro merchant). Responde `200` con el `ImportRowItem` ya `matched` (la `transaction` es `null` con `out_of_scope_transaction` si la elegida es de otro merchant). En la misma transacción supera la corrida vigente sin sustituta (P7) y audita `import.row.resolve_gateway`.
- **Tabla.** `RowsTable` define sus columnas fuera del componente (`helper.columns`), y `Candidates` pinta la lista de gateways, con `(another merchant)` para las `outOfScope`. No recibe el estado del import ni el permiso. El test actual comprueba que no hay botón ni `combobox` en la fila ambigua.
- **Caché.** `importKey(id)` es la raíz: las filas cuelgan de `[...importKey, 'rows', …]` y la corrida de `validationRunKey(id) = [...importKey, 'validations']` (con sus listas `issues` debajo). Las mutaciones del import escriben el detalle en la caché (`storeDetail`), pero el `PATCH` devuelve una fila, no el detalle. `ValidationsSection` solo se recarga sola si cambia `importStatus`; resolver no lo cambia.
- **Fake MSW.** `frontend/src/test/msw/imports.ts` no tiene el `PATCH`. `validations.ts` ya sabe superar una corrida sin sustituta para el undo (`supersedeRunOnUndo`). Las filas de prueba se construyen con `makeRow` de `import-fixtures.ts`.
- **Capturas.** Ningún script usa `page.route` todavía. `import-in-progress.ts` evita validar por #111; aquí se valida a propósito (decidido en el gate): las capturas solo necesitan que exista una corrida, no sus resultados.

## Goals / Non-Goals

**Goals:**

- Resolver una ambigua con dos clics (elegir, confirmar), con el efecto sobre las validaciones dicho antes de confirmar y visible después.
- Que la pantalla nunca ofrezca un `PATCH` que el estado o el permiso hacen fallar.
- Mantener la regla de importación entre features: de `features/validations` solo `validationRunKey`.

**Non-Goals:**

- Resolver varias filas a la vez, deshacer una resolución o mostrar quién la resolvió (está en la auditoría).
- Coordinar el `PATCH` con una ejecución de validaciones en curso en la misma pantalla (ver Riesgos).
- Cambiar los contadores, el aviso de canales o el filtro más allá de volver a pedirlos.

## Decisions

### D1. Un componente de candidatas con modo, alimentado por contexto

`Candidates` pasa a `analysis/AmbiguousCandidates.tsx`. `RowsTable` recibe `status: ImportStatus` (de `AnalysisStep`, `detail.status`), calcula el modo una vez con `useCanProcess()` y lo publica en un contexto de React que lee la celda:

- `enabled`: permiso y `analyzed`. Cada candidata lleva un botón **Choose** con nombre accesible `Choose <gateway> for row <rowNo> of <hoja>`.
- `disabled`: permiso y `validated`. Los botones se pintan deshabilitados y un texto bajo la lista (`aria-describedby` de los botones) dice `Run the validations again to choose a gateway: the import goes back to Analyzed.`
- `none`: sin permiso, `processed`, `cancelled` u otro estado. Solo la lista, como hoy.

Alternativas: construir las columnas dentro del componente con `useMemo` (rehace toda la definición por un dato que solo usa una celda) o el `meta` de la tabla (acopla la celda a la versión alfa de TanStack Table). El contexto deja las columnas estáticas.

Un botón por candidata en lugar de `radio` + **Resolve**: suele haber dos candidatas y la elección se confirma en el diálogo, así que un control intermedio solo añade un clic.

### D2. Un diálogo por tabla, con el aviso de la corrida leído de la caché

`RowsTable` monta un único `AlertDialog` (`ResolveRowDialog.tsx`) con la fila y la candidata elegidas en estado local. Cuerpo: `Row <rowNo> of <hoja> (<ID>) will be matched to <gateway>. The choice is recorded.` Para una candidata `outOfScope`, el gateway se nombra `<gateway> (another merchant)` y no se muestra nada más de ella; para una visible, canal, estado e importe como ayuda a decidir.

El aviso de la corrida se decide al abrir: `queryClient.getQueryData<ValidationRunView>(validationRunKey(importId))`. Si es `undefined` (no cargada o en error) o trae `run !== null`, se añade `The current validation run is discarded: run the validations again before continuing.`; con `run === null` no. Así no se dice nada falso cuando no hay corrida y, cuando no se sabe, se avisa. El tipo `ValidationRunView` viene de `@/lib/api/types`, no de `features/validations`.

Alternativa: suscribirse con `useQuery(validationRunQuery(...))` (obligaría a importar la consulta entera de `features/validations`, contra la regla del gate) o un texto fijo condicional (menos preciso; descartado en el gate).

### D3. `useResolveRow` en `features/imports/mutations.ts`

`mutationFn` llama a `api.PATCH('/api/v1/imports/{importId}/rows/{sheetId}/{rowNo}', { params: { path }, body: { gatewayId } })` con `unwrap` y el mismo cast que `asDetail` (el `Readable<>` de openapi-fetch pierde las formas `null` de las candidatas ocultas). En `onSuccess`, en este orden:

- `invalidateQueries({ queryKey: importKey(id), exact: true })`: el detalle (contadores, `rowsMatched`) se vuelve a pedir, porque la respuesta es una fila y no hay detalle que escribir.
- `invalidateQueries({ queryKey: [...importKey(id), 'rows'] })`: todas las páginas y filtros.
- `invalidateQueries({ queryKey: validationRunKey(id) })`: la corrida y sus listas de hallazgos. La sección pasa a `No validation run yet.` y la decisión a `Run the validations before continuing.`

No se invalida la lista de In Progress: no tiene `staleTime` y se vuelve a pedir al montarse.

### D4. Errores y foco

Al confirmar, el diálogo se cierra con la respuesta (como el de cancelar). Los mensajes van en una región `aria-live` sobre la tabla, en `RowsTable`, porque la fila puede salir de la página al refrescarse:

| Respuesta | Mensaje | Además |
|---|---|---|
| `200` | `Row <rowNo> of <hoja> matched to <gateway>.` | D3; foco al encabezado de las filas, porque el botón pulsado desaparece (ver abajo) |
| `409 import_not_editable` | `This row can no longer be resolved (<status>).` | se recarga el detalle (`useReloadImport`); el modo cambia solo |
| `409 row_not_ambiguous` | `This row is no longer ambiguous.` | detalle y filas, como en D3 sin las validaciones |
| `400 validation_error` | `That gateway is no longer a candidate for this row.` | filas |
| otro | `The row could not be resolved. Try again.` | — |

El foco usa el mecanismo de `ui-polish` D13 (`requestListFocus(ROWS_LIST)` y `ListHeading`), pero el encabezado solo atiende una petición cuando cambia su `focusKey`, y resolver no cambia ni filtro ni página. Por eso `RowsTable` lleva un contador de resoluciones que entra en la clave (`<match>:<page>:<resoluciones>`): cada `200` pide el foco y suma uno, y el encabezado lo toma al volver a pintarse. Alternativa descartada: enfocar el encabezado con una referencia propia, que duplicaría el mecanismo común y su desplazamiento.

Mientras el `PATCH` está en vuelo, todos los **Choose** y el botón de confirmar quedan deshabilitados: una escritura a la vez.

Si tras el refresco la página pedida queda más allá de la última (se resolvió la única ambigua de la última página con el filtro `Ambiguous`), `RowsTable` lleva a la última página con `onChange` (dirección con `replace`), en lugar de enseñar una página vacía.

### D5. Fake MSW: aplica, no decide

Handler `http.patch(\`${API}/imports/:importId/rows/:sheetId/:rowNo\`, route('resolveRow', …))` en `imports.ts`, con el mismo orden que la ruta y el servicio: permiso antes que alcance, como el `preHandler` `requirePermission` (`viewer` recibe `403` aunque el import no sea visible), después alcance (`404`), estado (`409 import_not_editable`), `rowNo` y cuerpo con `ResolveRowBody.safeParse` (`400`), fila (`404`), `ambiguous` (`409 row_not_ambiguous`), candidata (`400` con `details.candidates`).

Lo que la fila pasa a ser no lo calcula el fake: `makeAmbiguousRow` (nuevo en `import-fixtures.ts`) construye la fila ambigua y, por cada candidata, el `ImportRowItem` resuelto que respondería el API (con `transaction` o, si es `outOfScope`, `transaction: null` y `out_of_scope_transaction`). El handler copia ese resultado en la fila guardada, lo valida con `ImportRowItem.parse` antes de responder y llama a `supersedeCurrentRun(importId)`, una función nueva de `validations.ts` que marca la corrida vigente como no vigente sin sustituta (lo que `supersedeRunOnUndo` hace sin la parte de la revisión, que en `analyzed` no existe). Los contadores del detalle salen de las filas (`summarize`), así que bajan solos.

### D6. Capturas con una fila ambigua sintética y una corrida real

`e2e/screenshots/web-ambiguous-rows.ts`, con la cabecera y protecciones de los otros scripts (contraseña desde el `.env` raíz puesta desde la página, sin traza ni vídeo, medición a 1280 y 1024 px que falla con desplazamiento horizontal o tabla recortada). `analyst`, ProviderA-USD, `batch-split` (las dos partes) subido, confirmado y analizado desde las pantallas; nunca `batch-clean`.

`page.route('**/api/v1/imports/*/rows?*')` pide la respuesta real (`route.fetch()`) y, sin filtro o con `match=ambiguous`, antepone una fila ambigua sintética: `fileId` y `sheetId` de la primera fila real, `rowNo` y `transactionIdRaw` sintéticos que no existen en el seed, y dos candidatas con gateways del seed (una visible y otra `outOfScope`) y transacciones sintéticas. Suma uno a `total`. Ninguna otra petición se intercepta.

Capturas: `ambiguous-row` y `resolve-dialog-no-run` (antes de validar), `resolve-dialog` (tras **Run validations**, con el aviso de la corrida), `ambiguous-row-validated` (tras **Continue**: control deshabilitado con su texto). El diálogo se cierra siempre con **Keep** (nunca se confirma: el `PATCH` de una fila sintética respondería `404`). Al terminar cancela el import con motivo; se puede repetir sin sembrar.

El README de wireframes dice que la fila es sintética e inyectada en `GET rows`, y que por eso el contador `Ambiguous` de las capturas marca `0`.

### D7. Pruebas

Vitest + Testing Library + MSW, escritas antes del código de cada pieza:

- `analysis/resolve-row.test.tsx` (nuevo): elegir y confirmar (cuerpo del `PATCH`, fila `Matched`, contador, foco); diálogo sin aviso con `run = null` y con aviso con corrida sembrada (`seedValidationRun`), y después `No validation run yet.`; candidata `outOfScope` elegible; desistir; los tres errores provocados cambiando el estado del fake entre abrir y confirmar (el import pasa a `validated`, la fila deja de ser ambigua, la candidata desaparece), y el genérico con `failNext('resolveRow')`; botones deshabilitados en vuelo; página que queda vacía.
- `RowsTable.test.tsx`: el caso "offers no way to choose" pasa a `viewer`; casos `validated` (deshabilitado con el texto, sin `PATCH`) y `cancelled` (sin control).
- `test/msw/imports.test.ts`: el handler contra el contrato (`ImportRowItem.parse`, códigos y `details`), y que la corrida del fake deja de ser vigente.

## Risks / Trade-offs

- [Resolver mientras corre **Run validations** en la misma pantalla] → El backend serializa ambos; si la ejecución termina después, su corrida queda vigente y la invalidación de D3 la muestra. No se bloquea la tabla desde `ValidationsSection` para no acoplar las features más allá de la clave.
- [El aviso se decide con lo que hay en caché al abrir] → Si otra pestaña valida mientras el diálogo está abierto, el aviso puede faltar; el efecto real (validar de nuevo) se ve tras confirmar, porque D3 vuelve a pedir la corrida.
- [Contador `Ambiguous` en `0` en las capturas] → Solo `GET rows` se intercepta, por decisión del gate; se dice en el README de wireframes.
- [Validar en el script depende del historial (#111)] → Las capturas no muestran resultados de validación más allá de la cabecera; si **Continue** quedara bloqueado, el script falla con un mensaje que lo dice.
- [`(another merchant)` elegible] → Es lo que permite la spec ("necesarios para resolver la fila"); el diálogo no revela más datos que la tabla.
