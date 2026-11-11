# Design

## Context

Cuatro issues de pantalla, todos con el código ya localizado (ver proposal.md):

- **#110.** Los validadores de la dirección omiten las claves inválidas con `dropUndefined`:
  - `validateSettlementListSearch`, en `features/settlements/list-search.ts`;
  - `validateImportSearch` y `validateInProgressSearch`, en `features/imports/validate-search.ts`.

  TanStack Router superpone la salida de `validateSearch` sobre la búsqueda cruda, así que una clave omitida conserva su valor crudo, que llega a `useSearch()` y a la consulta. En `/fees` se reprodujo y se arregló devolviendo todas las claves (`fees-search.ts`, #80). `validateNewReconciliationSearch` ya devuelve todas las claves.
- **#140.** `channelNotices()` (backend) y `channelStateOf()` (settlement) devuelven `assigned_to_other_account` con `otherAccount = null` cuando ningún `AccountChannel` del canal es principal y la cuenta del import tiene una fila histórica.
  - El frontend trata ese `null` como una cuenta que no conoce. En `ChannelNotice.tsx` sale `primaryElsewhere`, "… of another merchant". En `ChannelsToAssign.tsx` sale `anotherAccount`, "… · primary account: another account".
  - Ni el seed (solo crea filas `isPrimary = true`, `backend/prisma/seed.ts`) ni la aplicación dejan un canal así. Procesar quita la principal a las demás y se la da a la cuenta que procesa (`prisma-settlement-repository.ts`), y no hay ninguna forma de desasignar. El caso solo aparece con datos tocados fuera de la aplicación.
- **#139.** La frase de cuenta equivocada está tres veces: en `imports/strings.ts` (`analysis.counters.wrongAccount`), en `settlements/strings.ts` (`emptyBatch.wrongAccount`) y en `validations/strings.ts` (`decision.emptyBatch.wrongAccount`, con la frase de acción pegada).
- **#125.**
  - La etiqueta de la línea `reserve_early_released` vive en el backend: en `payable-breakdown.ts`, que la vista calcula en cada lectura, y en la fila de reservas de `summary-csv.ts`.
  - El frontend tiene sus propias etiquetas por código: `payableLines`, `summary.reserveLines.early` y la `early` de Movements. Solo usa la del API como reserva.
  - La política `release_on_chargeback` tiene una `CHECK` en la base.

## Goals / Non-Goals

**Goals:**
- Cada arreglo en su propio grupo de tareas y de commits, para poder cortar por el final sin dejar nada a medias. El orden es #110, #140, #125 y #139.
- Test primero en los cuatro: el test nuevo se ve fallar por su motivo antes del arreglo.

**Non-Goals:**
- Tocar `frontend/src/lib/format.ts`, `packages/shared` o el manejo de fechas, que son del #48. `list-search.ts` sigue usando `IsoDate` de `shared` tal cual.
- Cambiar el contrato del API o el backend, salvo las dos etiquetas de texto de #125.
- Renombrar la política `release_on_chargeback`, que exige una migración.

## Decisions

**D1 (#110). Devolver todas las claves, como `/fees`.**
- Los tres validadores devuelven un objeto con todas sus claves, con `undefined` en las inválidas, y se borra su `dropUndefined`. Las claves `undefined` no se escriben en la dirección, así que esta no cambia.
- Se descarta limpiar en el punto de consulta (en el `queryOf` de cada pantalla). Dejaría `useSearch()` con valores inválidos en los selectores, y habría que repetirlo en cada consulta.
- Los tests de los validadores comprueban el valor de cada clave inválida y no solo `toEqual({})`, porque `toEqual` da por iguales una clave `undefined` y una clave ausente.
- Cada pantalla tiene un test RTL que mira la URL de la petición, como en `FeesPage.test.tsx`.

**D2 (#140). Un texto neutro y correcto desde el frontend, sin cambiar el API.**
- El API ya distingue los tres casos de `assigned_to_other_account`:
  - otra cuenta del alcance: `otherAccount = { accountId, name }`;
  - otra cuenta de un merchant fuera del alcance: `{ accountId: null, name: null, outOfScope: true }`;
  - ninguna principal: `otherAccount = null`.

  Basta con que la pantalla lea `null` como "sin cuenta principal".
- Textos, en los `strings.ts` de cada feature:
  - Analysis: `noPrimary: (channel) => \`${channel} has no primary account\``;
  - Settlement Review: `noPrimary: (name) => \`${name} · no primary account\``, que sustituye a `anotherAccount`, porque ese era el único caso que lo usaba.

  La `note` del API ("This account will become the primary account of the channel when the batch is processed") ya es correcta y se sigue mostrando debajo.
- `primaryElsewhere` queda solo para `otherAccount.name === null`, que es el caso de otro merchant y donde sí es verdad.
- Algo mejor, como "lo tuvo esta cuenta antes", lo deduciría el frontend de una codificación implícita. Para decirlo bien haría falta un valor nuevo de `assignment` o un campo en el contrato de `shared`, que está fuera de alcance. Si se quiere, va en otro issue.
- El API no cambia, pero la spec de `import` sí: describe el caso `otherAccount = null`.

**D3 (#139). La frase común en `components/strings.ts`.**
- `components/strings.ts` ya guarda los textos de los componentes que usan varias pantallas (`dateRanges`, `pager`), y `settlements/strings.ts` ya lo importa como `shared`. Se le añade `wrongAccount`.
- Las tres features lo leen desde ahí:
  - `imports` y `settlements` lo reexportan en su clave actual;
  - `validations` compone `\`${shared.wrongAccount} ${decision.emptyBatch.wrongAccountAction}\``, con la frase de acción `Cancel and reprocess under the right account.` en su propia clave.
- No aparece ninguna dependencia entre features: `components/` es la capa común, por debajo de todas. Se descarta que `imports` y `validations` importen los strings de `settlements`, porque añadiría una dependencia de feature a feature.
- El texto que se ve no cambia, así que los tests RTL y el paso E2E que comparan el literal siguen pasando sin tocarlos. Un test de `components/strings` comprueba que las tres claves de las features dan la frase común.

**D4 (#125). Las etiquetas pasan a "adjustment" en el API, el CSV y la pantalla.**
- Textos nuevos:
  - el desglose del amount payable (API, `payableLines` del frontend y CSV) pasa a `Reserve released on adjustment`;
  - el bloque de reservas del Summary y la columna **Reserves** de Movements pasan a `Released on adjustment`;
  - la fila de reservas del CSV pasa a `Reserve released on adjustment`.
- Las etiquetas del desglose se calculan en cada lectura, así que los intentos ya procesados también salen con la etiqueta nueva. No se migra nada.
- **El CSV del summary cambia.** Cambian dos celdas de texto, la de la fila de reservas y la de la línea del amount payable. Columnas, orden e importes quedan igual. Se avisa en el PR.
- Alternativa descartada: cambiar solo la pantalla. El API y el CSV seguirían diciendo "chargeback" y la etiqueta no coincidiría entre lo que se ve y lo que se entrega.
- No cambian:
  - el nombre de la política y su texto en Accounts (**Reserve policy on chargeback**);
  - la advertencia `chargeback_reserve_policy_not_applied` y su texto, porque nombran la política, no la línea.
- README §4 actualiza su ejemplo de `payableBreakdown`.

**D5. Capturas: tres nuevas, sobre datos sembrados y sin procesar nada.** Van en `docs/wireframes/web-polish-e3/`, a 1280 px y con `analyst`, sobre un batch sembrado `paid` de ProviderA-USD:
- `settlement-summary.png`: el desglose del amount payable y el bloque de reservas (#125);
- `settlement-movements-i.png`: **Movements**, ciclo I, con la columna **Reserves** (#125);
- `settlement-list-invalid-status.png`: `/settlements?…&status=foo` con la lista cargada y sin error (#110).

Necesitan turno de base y `pnpm dev`, pero no consumen números de batch, así que no hay que sembrar después.
- **#140** no lleva captura: ni el seed ni la aplicación producen el caso, y basta con los tests RTL con MSW.
- **#139** no cambia nada visible.
- Las capturas de changes ya archivados no se vuelven a generar: son la prueba de su propio change.

## Risks / Trade-offs

- [El CSV del summary cambia una etiqueta, y quien lo procese con un programa que busque `on chargeback` dejará de encontrarla.] → Se avisa en el PR y en el proposal. Columnas, orden e importes no cambian.
- [#110 es una deducción del código en Settlement List, Import e In Progress.] → El test RTL de cada pantalla se escribe primero y tiene que fallar porque la petición lleva el valor inválido. Si alguno no falla, ese arreglo se quita del change y se dice.
- [Un estado cerrado en la dirección de In Progress puede que no dé `400`, sino una lista de imports cerrados.] → Da igual: la regla es descartarlo, y el test mira la petición, no el error.
- [Corte del domingo.] → Grupos independientes, en orden de prioridad. Lo que no esté fusionado el domingo 2026-11-08 por la noche se queda fuera, con su issue abierto.

## Estimación

| Grupo | Horas |
|---|---|
| #110: tres validadores, sus tests y tres tests de pantalla | 2 |
| #140: dos textos y sus tests | 1 |
| #125: dos etiquetas del backend, tres del frontend, MSW, tests y README | 1,5 |
| #139: frase común y su test | 0,5 |
| Capturas (con turno de base), CI, PR y correcciones | 2 |
| **Total** | **7** |
