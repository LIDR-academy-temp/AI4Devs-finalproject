# Design — import-guardrails

## Context

Motivación y decisiones del gate en `proposal.md`. El estado actual que condiciona el diseño:

- **El análisis** (`ImportService.analyze`) persiste solo filas de hojas `transactions`. El motivo de `unmatched` vive en `ImportRow.detailJson.reason`: `no_match` sale de `matchRow`; `id_format`, `lossy_numeric_id` y `no_gateways` salen de `candidatesFor`. `empty_id` es motivo de las `ignored`.
- **`Import.rowsMatched`** cuenta todas las `matched`, también las de otro proveedor. Por eso no sirve para el criterio P1, que pide las del proveedor de la cuenta.
- **El review** (`PrismaValidationRunRepository.review`) toma el candado de `Import`, comprueba la corrida y el bloqueo y escribe `import.review`, todo en una transacción.
- **Process** (`PrismaSettlementRepository.processOnce`) hace lo mismo tras la guarda `validated → processed`. La vista previa (`SettlementService.preview`) hace las mismas lecturas fuera de transacción.
- **El aviso de canales** (`channelNotices`) ya recibe `ChannelFact.providerId`, pero no el proveedor de la cuenta.
- **`pendingInRangeCount`** recorre las candidatas `Pending`, que incluyen las presentes en el batch: la fuente no las filtra (`prisma-validation-sources.ts:250`).
- **El OpenAPI** se exporta de los esquemas Zod del backend (`pnpm openapi:export`) y el frontend genera sus tipos (`api:generate`). CI comprueba que no hay diff (`openapi:check`).

## Goals / Non-Goals

**Goals:**

- Un solo cálculo de "batch sin filas asociadas", puro y testeable, usado igual por el detalle del import, el review, la vista previa y process.
- La comprobación de review y process dentro de su transacción, después de las de la corrida, con el mismo orden de errores en los dos.
- Cambios de contrato solo aditivos.

**Non-Goals:**

- La pantalla Analysis (`Counters`, `ChannelNotice`): es el issue #131.
- Cambiar la forma de `Skipped`, el enum `ChannelAssignment` o el esquema de la base.
- Una validación nueva, o que el batch vacío afecte al resultado de la corrida.
- Bloquear un batch solo de fees.

## Decisions

### D1. Hechos y regla del batch vacío: una consulta y una función pura

- **La regla.** `imports/domain/empty-batch.ts` exporta `emptyBatchOf(facts): EmptyBatch`.
  - `facts = { rowsTotal, matchedOwn, unmatchedByReason }`.
  - `EmptyBatch = { requiresConfirmation, details: { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount } }`.
  - `rowsUnmatched` es la suma de los cuatro motivos.
  - `likelyWrongAccount = matchedOwn = 0 ∧ rowsUnmatched > 0 ∧ unmatchedByReason.id_format = rowsUnmatched`.
- **Los hechos.** Salen de una sola consulta en `imports/infrastructure/empty-batch-facts.ts`: `loadEmptyBatchFacts(db, importId, providerId)`.
  - `db` es el `PrismaClient` o el cliente de una transacción interactiva, así que la misma función sirve dentro y fuera de transacción.
  - Lee `ImportRow` de las hojas del import con un `LEFT JOIN [Transaction]` para el `providerId` de las `matched`.
  - Agrupa por `matchResult` y `JSON_VALUE(detailJson, '$.reason')`.
  - Sin migración: `detailJson` ya tiene `CHECK ISJSON`.
  - Un motivo desconocido en `detailJson` es un error interno, no un 0 silencioso.
- **Alternativa descartada:** usar `Import.rowsMatched`. Cuenta las filas de otro proveedor. Además, un batch con solo filas ajenas está bloqueado de todos modos (P1), pero el detalle diría `requiresEmptyBatchConfirmation = false` y el review luego daría `blocking_validation_issue`: dos respuestas incoherentes.
- **Alternativa descartada:** calcularlo en el motor de validaciones (`partition.own.length === 0`). No es una validación (P1/P3), el detalle del import no tiene corrida, y lo ataría a la corrida vigente.

### D2. Dónde se comprueba y en qué orden

- **Review.** `ValidationRunRepository.review(importId, runId, userId, now, confirmEmptyBatch)`:
  1. dentro de la transacción, tras la comprobación de bloqueo, lee el `providerId` de la cuenta del import y `loadEmptyBatchFacts(tx, …)`;
  2. si hace falta confirmar y no viene `confirmEmptyBatch === true`, lanza `NoMatchedRowsError(details)`;
  3. la auditoría añade `emptyBatchConfirmed: true` solo cuando se confirmó un batch vacío.

  El fake en memoria reproduce el mismo orden.
- **Process.** En `processOnce`, tras `reviewIsValid` y antes de `loadSettlementInput`, lo mismo con `tx`. `settlement.process` añade `emptyBatchConfirmed: true` en ese caso. Al ser dentro de la transacción, un `409 no_matched_rows` no escribe nada y el número no se consume.
- **Vista previa.** Tras la comprobación de bloqueo, `loadEmptyBatchFacts(prisma, …)`, y responde `requiresEmptyBatchConfirmation` y `emptyBatch` (`details` o `null`). Nunca lanza `no_matched_rows`.
- **Detalle del import.** `detailOf` añade a `analysis` `rows.unmatchedByReason`, `requiresEmptyBatchConfirmation` y `likelyWrongAccount` con la misma función. La consulta también se hace cuando `rows.summary` devuelve `null` (análisis sin filas), y entonces todo sale en 0, con `requiresEmptyBatchConfirmation = true`.
- **El error.** `NoMatchedRowsError` va en `imports/domain/errors.ts` (409, `no_matched_rows`, mensaje en inglés), porque validation y settlement ya dependen del dominio de imports (`assertCanProcess`). El handler de errores lo serializa como cualquier `DomainError`.
- **Orden.** `import_not_*` → `validation_run_required` → `validation_run_superseded` → `blocking_validation_issue` → (process: revisión válida) → `no_matched_rows` → `batch_fee_invalid` y el resto. Así un import con filas ajenas siempre dice `provider_mismatch`.
- **Alternativa descartada:** comprobar process en `SettlementService.process` antes de la transacción. Con una revisión invalidada entre medias diría `no_matched_rows` en lugar de `import_not_validated`, y rompería el patrón de "la guarda dentro es la que cuenta".

### D3. Contrato (`@recon/shared`)

- **Esquema nuevo** `EmptyBatchDetails = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }`, con `unmatchedByReason` como objeto de las cuatro claves de `UnmatchedReason`.
  - `UnmatchedReason` es un enum nuevo en `vocabulary.ts`, un subconjunto de `RowReason` sin `empty_id`. `RowReason` no cambia.
- **Campos nuevos:**
  - `AnalysisRows.unmatchedByReason`;
  - `AnalysisSummary.requiresEmptyBatchConfirmation` y `AnalysisSummary.likelyWrongAccount`;
  - `ChannelNotice.otherProvider?: true`;
  - `SettlementRequest.confirmEmptyBatch?: boolean`;
  - `SettlementPreview.requiresEmptyBatchConfirmation` y `SettlementPreview.emptyBatch: EmptyBatchDetails | null`;
  - `ReviewBody.confirmEmptyBatch?: boolean`. Sigue siendo `strictObject`.
- **Detalles de error:** `NoMatchedRowsDetails = EmptyBatchDetails` e `ImportFileLimitReachedDetails = { limit, current, adding }`. Se tipan desde `@recon/shared`, de donde los lee el frontend. En el OpenAPI van en la descripción de cada ruta (`409` de review, process y `POST files`), como el resto de `details` del proyecto (`batch_no_taken`, `channel_assignment_not_confirmed`); no hay esquema propio por código.
- `docs/openapi.yaml` y `schema.gen.ts` se regeneran (`pnpm openapi:check` verde).

### D4. Aviso de canales

- `channelNotices(accountId, providerId, rowCounts, facts, scope)` recibe el proveedor de la cuenta.
- Con `fact.providerId !== providerId`, la entrada lleva:
  - `otherProvider: true`;
  - `note = "Channel of another provider: its rows are not processed in this account"`;
  - el mismo `assignment` que hoy.
- Un canal fuera del alcance conserva `providerId: null` en la respuesta, pero la comparación se hace con el hecho, así que también lleva `otherProvider`. Es lo que README §4.2 dice: un canal de otro merchant siempre es de otro proveedor.
- **Alternativa descartada:** un valor `other_provider` en `ChannelAssignment` (P4). Rompería el parseo del frontend y se colaría en `ChannelToAssign`.

### D5. Invariante de filas ajenas en el settlement

- `assertOwnProviderRows(rows, providerId)`, en `inclusion.ts`: una fila `matched` con `transaction.providerId !== providerId` lanza `Error("row <sheetId>:<rowNo> belongs to another provider (provider_mismatch); it is never processed")`.
- `computeSettlement` la llama con `input.account.providerId` justo antes de `classifyRows`, cuya firma y llamadas no cambian. No es un `DomainError`: llega como `500` y, dentro de process, deshace la transacción.
- Así ni la fila ni su canal entran en `movements` ni en `toAssign`. `Skipped` no cambia (P5).

### D6. `status_mismatch` con gateway `Pending` y `pendingInRangeCount`

- En `mismatchOf`, para `cycle = E`, `statusId ≠ null` y `statusId ≠ Pending`: si el gateway está `Pending`, devuelve `status_mismatch`. Lo demás sigue igual.
- **La fila `Pending` (propia) no se compara.** Hoy ya no lo hace por la rama `gateway === Pending`. Con el cambio se excluye explícitamente, con su test.
- **`pendingInRangeCount(ctx)`** excluye las transacciones de los `status_mismatch` cuyo `gatewayStatusId` es `Pending`.
  - El conjunto se deriva de `ctx.partition.own` con la misma función `mismatchOf`, exportada desde `non-recorded-adjustment.ts`, para no repetir la regla.
  - No se lee de la salida del slot, para que el contador no dependa del orden de ejecución de las validaciones.
- Los rangos no cambian: `ranges.ts` sigue leyendo el estado del gateway, y una `Pending` del batch no amplía APP.
- **Alternativa descartada:** excluir todas las `Pending` presentes en el batch. Una fila reportada `Pending` dejaría de verse en ningún sitio (decisión P6 y README §3.3).

### D7. Tope de archivos por import

- `upload-policy.ts` añade `MAX_FILES_PER_IMPORT = 10`.
- `addFiles`, tras `requireEditable` y antes de `rejectDuplicates` y `readAll`, comprueba `record.files.length + uploads.length > MAX_FILES_PER_IMPORT` y lanza `ImportFileLimitReachedError(limit, current, adding)` (409).
- `withStaged` descarta lo subido al salir, así que no queda nada en `UPLOAD_DIR`.
- `createImport` no lo necesita: el tope por petición (10) ya lo cubre.
- **Concurrencia:** el `addFiles` del repositorio ya está guardado por `updatedAt` (`import_not_editable` con `changed`). De dos peticiones simultáneas con 9 archivos, la segunda falla por la guarda optimista y, al reintentar, por el tope. No hace falta otro candado.
- **Alternativa descartada:** `400 too_many_files` con otro `details`. El conflicto es con el estado del import, no con la petición (P8).

### D8. Frontend

- **`features/validations`:**
  - `DecisionBar` lee el detalle del import que ya consulta la sección (si no lo tiene, usa la query del import existente, sin una petición nueva).
  - Con `analysis.requiresEmptyBatchConfirmation`, muestra el aviso (y el de cuenta equivocada si `likelyWrongAccount`) y la casilla **Continue with batch fees only**.
  - Continue se deshabilita sin la casilla, con su motivo enlazado por `aria-describedby`, como los demás motivos.
  - `useReview` envía `confirmEmptyBatch: true` cuando está marcada. Con `409 no_matched_rows` muestra el texto, relee el import y desmarca la casilla.
- **`features/settlements`:**
  - `review-form` añade `confirmEmptyBatch: z.boolean()`.
  - `toRequest` lo añade solo en process, nunca en la vista previa, igual que `confirmChannelAssignment`.
  - El componente nuevo `EmptyBatchConfirmation.tsx` se pinta en `PreSummary` junto a `ChannelsToAssign`, con el mismo patrón: la casilla se desmarca al cambiar la respuesta.
  - Process se deshabilita con `Confirm that this batch has batch fees only.`.
  - `mutations.ts` trata `no_matched_rows`: lo añade a `STALE_PREVIEW` y desmarca la casilla.
- **`features/imports/files`:** `upload-queue.ts` mapea `import_file_limit_reached` a un texto con `current` y `limit`.
- Todos los textos van en inglés en los `strings.ts` de cada feature. MSW y los helpers de test se amplían con los campos nuevos.

### D9. Muestra `batch-wrong-account`

- **Dónde.** En `plan.ts`, un bloque nuevo **al final**, después de `legacy-provider`, que no consume `rng`. Así las muestras existentes siguen dando los mismos bytes.
- **Contenido.**
  - Cuenta `ProviderA-USD` (solo gateway numérico).
  - Un archivo `Recon_Template_ProviderA-USD_batch-wrong-account.xlsx` en el formato de plantilla.
  - APP con 10 transacciones `Successful` de RAM-U1 (`ProviderC-USD`, gateway UUID, merchant 2), DEC con 2 `Declined` de RAM-U1, el resto de hojas vacías.
  - `Other Fees` con `Wire Fee 25.00 USD`.
- **`expected.json`:**
  - `rows = { read: 12, matched: 0, unmatched: 12, unmatchedByReason: { no_match: 0, id_format: 12, lossy_numeric_id: 0, no_gateways: 0 } }`;
  - `requiresEmptyBatchConfirmation: true` y `likelyWrongAccount: true`;
  - `channels: []` y `batchFees` con el Wire Fee;
  - los resultados de las ocho validaciones: 1–4 `not_applicable`, las dos *across* `passed`, porque ProviderA tiene intentos, y las de faltantes `not_applicable`;
  - `summary` con `movements` 0, `otherFeeAmt = 25.0000` y `amountPayable = -25.0000`.
- **Regeneración.** `pnpm samples:plan && python data/samples/build-samples.py`. Después, `git status --short data/samples` debe mostrar solo `batch-wrong-account/`. Si cambia cualquier otro archivo, se para y se pregunta (P7).
- `import-flow.ts` añade `batch-wrong-account` a `SampleName` y `SAMPLE_FILES`.

### D10. Tests de integración sin efectos en otros flujos

- Procesar `batch-wrong-account` usa un `batchNo` de la serie 98xx, como `settlement-process.int.test.ts`, y limpia con `removeSettlementsFrom` y `removeImportsFrom` en `afterAll`. Así no mueve el número propuesto de `ProviderA-USD` (123) que esperan `batch-clean` y la colección.
- La transacción `Pending` de #63 la crea el test sobre un proveedor, un canal y una cuenta aislados (9502), como el describe de contadores de `validation-edges.int.test.ts`: una `Pending` en un canal sembrado (RAM-01) alteraría `pendingInRangeCount` y los faltantes de las suites que corren a la vez. El test lo borra todo al terminar (transacciones, filas de import, corrida e intento). Al ser una cuenta aislada, procesar no consume números de ProviderA-USD.
- La colección Bruno no procesa el batch vacío (proposal, Impact).

## Risks / Trade-offs

- **[Riesgo]** El `JSON_VALUE` sobre `detailJson` recorre todas las filas del import en cada `GET /imports/{id}`. → Es una sola consulta agrupada por import (índice por `sheetId`) y el detalle ya lee el resumen de filas con el mismo alcance. Lo vigila el escenario "Capacidad de análisis" (`import-analyze.int.test.ts`, menos de 3 s), porque la respuesta de `POST analyze` es ese mismo detalle; si pasara de lo aceptable, el siguiente paso sería guardar el conteo en `Import`, y eso es una migración que se pediría.
- **[Riesgo]** Dos confirmaciones (review y process) para el mismo batch pueden resultar repetitivas. → Es la decisión de K (P2): la de process protege el número del batch y el pago. La UI las pone donde se toma cada decisión.
- **[Riesgo]** El invariante D5 convierte un fallo de validación en un `500`. → Es lo buscado: no debe ocurrir y, si ocurre, no se liquida nada. El mensaje nombra la fila para diagnosticarlo.
- **[Trade-off]** `likelyWrongAccount` exige que **todas** las no asociadas sean `id_format`. Un archivo ajeno con un ID que por azar tenga el formato numérico de la cuenta (`no_match`) no da el aviso. → La confirmación del batch vacío se pide igual; el aviso es una ayuda, no la protección.
- **[Trade-off]** La pantalla Analysis sigue sin el desglose ni la marca de canales ajenos hasta #131. → Los datos ya están en el API, el `note` nuevo sale en el aviso de canales actual sin tocar su código, y el aviso de cuenta equivocada sale en el `DecisionBar`, en la misma pantalla.

## Migration Plan

Sin migración ni seed. Despliegue normal. Los imports ya analizados obtienen los campos nuevos al leerse, porque se calculan de las filas persistidas. Los imports `validated` sin filas asociadas que ya existan necesitarán `confirmEmptyBatch` al procesar, que es justo el comportamiento buscado. Vuelta atrás: revertir el PR. No hay datos nuevos que limpiar más allá de las claves de auditoría añadidas, que el código anterior ignora.
