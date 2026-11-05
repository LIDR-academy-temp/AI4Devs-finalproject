# Tasks — import-guardrails

Rama `feat/import-guardrails`, PR hacia `feature/entrega-3-MVP`. Las decisiones D1–D10 están en `design.md`, las del gate P1–P8 en `proposal.md` y los escenarios en las delta specs (`import`, `validation`, `settlement`, `api-collection`). Sin migración ni seed.

**Coordinación.** Se tocan `frontend/src/features/validations`, `frontend/src/features/settlements` y `frontend/src/features/imports/files`. **Nunca** `frontend/src/features/imports/analysis`, que es de la otra sesión (`web-ambiguous-rows`); lo de esa pantalla es #131.

**Reglas.** Cada grupo termina con su commit y un `git push`, sin `--no-verify`. El CI se vigila con `gh run list --branch feat/import-guardrails --json status,conclusion --jq '.[0]'`. Los pasos de integración y Bruno necesitan la base local sembrada: antes de ejecutarlos se pide turno a la persona. Para filtrar un archivo de integración: `pnpm --filter @recon/backend exec vitest run --project integration <archivo>`.

## 0. Artefactos del change

- [x] 0.1 Revisión de la persona: README (§1.2, §3.2, §3.3, §4.2–§4.4), proposal, specs, design y tasks, con `openspec validate import-guardrails --strict` en verde.
- [x] 0.2 Commit: docs(openspec): proponer import-guardrails (#92, #63, #40), y `git push`.

## 1. Contrato compartido (`@recon/shared`)

- [x] 1.1 Añadir en `packages/shared/src/vocabulary.ts` el enum `UnmatchedReason` (`no_match`, `id_format`, `lossy_numeric_id`, `no_gateways`). Verificar con un test en `vocabulary.test.ts` que es `RowReason` sin `empty_id`.
- [x] 1.2 Añadir los esquemas de D3:
  - `EmptyBatchDetails` y `UnmatchedByReason`;
  - `AnalysisRows.unmatchedByReason`, `AnalysisSummary.requiresEmptyBatchConfirmation` y `AnalysisSummary.likelyWrongAccount`;
  - `ChannelNotice.otherProvider` (opcional, `true`);
  - `ReviewBody.confirmEmptyBatch` y `SettlementRequest.confirmEmptyBatch` (opcionales);
  - `SettlementPreview.requiresEmptyBatchConfirmation` y `SettlementPreview.emptyBatch`;
  - `NoMatchedRowsDetails` e `ImportFileLimitReachedDetails`.

  Verificar con tests de parseo: `ReviewBody` sigue rechazando claves desconocidas, y `EmptyBatchDetails` exige las cuatro claves de motivo. `pnpm --filter @recon/shared test` y `pnpm typecheck` en verde, salvo los errores esperados en backend y frontend, que se listan para los grupos siguientes.
- [x] 1.3 Commit: feat(shared): contrato del batch sin filas asociadas, canal de otro proveedor y tope de archivos, y `git push`.

## 2. Muestra `batch-wrong-account`

- [x] 2.1 Añadir en `data/samples/plan.ts` el bloque de D9, al final y sin consumir `rng`:
  - `ProviderA-USD`, batch 123;
  - APP con 10 `Successful` y DEC con 2 `Declined` de RAM-U1 (`ProviderC-USD`), elegidas de forma determinista (las primeras por `transactionDate`);
  - las hojas CHB, REF, RDR y RR vacías, y `Other Fees` con `Wire Fee 25 USD`;
  - en `expected`: `rows` con `unmatchedByReason`, `requiresEmptyBatchConfirmation`, `likelyWrongAccount`, `channels: []`, `batchFees`, los resultados de las ocho validaciones y el `summary` del batch solo de fees (`amountPayable = -25.0000`).
- [x] 2.2 Regenerar con `pnpm samples:plan && python data/samples/build-samples.py`. Verificar con `git status --short data/samples` que **solo** aparece `batch-wrong-account/`, con su `.xlsx` y su `expected.json`. Si cambia cualquier otro archivo (un `.xlsx` o un `expected.json` existentes), **parar y preguntar a la persona** (P7). En `settlement-reserve-chargeback` el openpyxl local cambió los bytes de los `.xlsx` sin cambiar sus celdas: si pasa, se informa con la comparación celda a celda y se espera su decisión.

  Resultado:
  - Los cinco `expected.json` existentes solo cambian de formato y quedan iguales tras `biome format`.
  - Los seis `.xlsx` existentes cambian de bytes con el openpyxl local (3.1.5): fechas de `docProps/core.xml` y la serialización de los espacios de nombres. Tienen las mismas celdas que en HEAD (valores, formato numérico, orden y visibilidad de las hojas).
  - Con el visto bueno de la persona, se restauran con `git checkout`. El `sha256` de `batch-clean` vuelve a ser `c46857d3…`, y `import-routes.test.ts` pasa.
  - Queda solo `batch-wrong-account/` (12 filas `id_format`, `amountPayable = -25.0000`) más `plan.ts`.
  - **openpyxl local reescribe los bytes de los .xlsx existentes sin cambiar celdas; se restauran tras comprobarlo celda a celda.**
- [x] 2.3 Añadir la fila de la muestra a `data/samples/README.md`. Añadir `batch-wrong-account` a `SampleName` y `SAMPLE_FILES` en `backend/test/integration/import-flow.ts`. Verificar con `pnpm lint` y `pnpm typecheck` en `backend`.
- [x] 2.4 Commit: test(samples): muestra batch-wrong-account de un archivo de otra cuenta (#92), y `git push`.

## 3. Dominio de imports: batch vacío, canales y tope (TDD)

- [x] 3.1 Escribir `backend/src/modules/imports/domain/empty-batch.test.ts` y comprobar que falla porque el módulo no existe. Debe cubrir cada escenario de "Import sin filas asociadas":
  - archivo de otra cuenta, con `rows` de `batch-wrong-account/expected.json` como oráculo;
  - batch con filas asociadas;
  - mezcla `id_format` + `no_match`;
  - solo ignoradas;
  - solo filas de otro proveedor (`matchedOwn = 0`).

  Romperlo a propósito una vez (por ejemplo, `likelyWrongAccount` sin `rowsUnmatched > 0`) y ver que falla el caso de solo ignoradas.
- [x] 3.2 Ampliar `channel-notice.test.ts` con:
  - el canal de otro proveedor (`otherProvider: true`, `note` de canal ajeno, `assignment` sin cambiar);
  - el canal de otro merchant (también `otherProvider`);
  - un canal del mismo proveedor principal en otra cuenta, sin `otherProvider` (escenario RAM-03).

  Comprobar que fallan.
- [x] 3.3 Ampliar `upload-policy.test.ts` y `errors.test.ts` con `MAX_FILES_PER_IMPORT = 10` y `ImportFileLimitReachedError` (409, `import_file_limit_reached`, `details = { limit, current, adding }`). Ampliar `errors.test.ts` también con `NoMatchedRowsError` (409, `no_matched_rows`, mensaje en inglés). Comprobar que fallan.
- [x] 3.4 Commit: test(imports): batch sin filas asociadas, canal de otro proveedor y tope de archivos en rojo, y `git push`.
- [x] 3.5 Implementar `empty-batch.ts`, `channelNotices(accountId, providerId, …)` (D4), la constante y los dos errores. Verificar que los tests de 3.1–3.3 pasan con `pnpm --filter @recon/backend test`.

  Resultado:
  - Se adelanta de 6.1 el `providerId` de la cuenta en `ImportSummaryRecord` (repositorio Prisma y fake) y su paso a `channelNotices`, para que la llamada del servicio no quede con los argumentos desplazados.
  - Los tests de 3.1–3.3 pasan.
  - Siguen fallando 8 tests de imports que leen el detalle analizado (`500` del serializador, o `ImportDetail.safeParse` falso), porque `analysis` aún no trae los campos que el grupo 1 hizo obligatorios. Se arreglan en 6.1.
- [x] 3.6 Commit: feat(imports): regla del batch sin filas asociadas, aviso de canal de otro proveedor y errores nuevos, y `git push`.

## 4. Validación: `status_mismatch` con el gateway `Pending` (#63, TDD)

- [x] 4.1 Ampliar `non-recorded-adjustment.test.ts` con builders y comprobar que fallan:
  - APP y DEC con el gateway `Pending` → dos `status_mismatch` con estado reportado, `gatewayStatusId = Pending` e incluidos;
  - E con estado `Refund` por columna y el gateway `Pending` → `status_mismatch`;
  - fila `Pending` y fila sin estado con el gateway `Pending` → ningún hallazgo.

  Sustituir el caso actual "Gateway Pending en E", que esperaba 0.
- [x] 4.2 Ampliar `missing.test.ts` (`pendingInRangeCount`) con los escenarios de "Pending aparte": la del batch con otro estado no cuenta, y la del batch reportada `Pending` sí. Comprobar que fallan.
- [x] 4.3 Commit: test(validation): status_mismatch con el gateway Pending en rojo (#63), y `git push`.
- [x] 4.4 Implementar D6 en `non-recorded-adjustment.ts` (con `mismatchOf` exportada) y en `missing.ts`. Verificar:
  - los tests de 4.1–4.2 pasan;
  - `oracles.test.ts` y `sample-input.test.ts` siguen en verde con los `expected.json` sin cambios (ninguna muestra trae `Pending`);
  - `oracles.test.ts` incluye `batch-wrong-account`: 1–4 `not_applicable`, las *across* `passed` y las de faltantes `not_applicable`.
- [x] 4.5 Actualizar el comentario de cabecera de `non-recorded-adjustment.ts` y el de `pendingInRangeCount` (en inglés). Verificar con `pnpm lint`.
- [x] 4.6 Commit: feat(validation): status_mismatch cuando el gateway está en Pending (#63), y `git push`.

## 5. Settlement: invariante de filas de otro proveedor (TDD)

- [x] 5.1 Ampliar `inclusion.test.ts` (y `compute-settlement.test.ts`) con una fila `matched` de otro proveedor: `classifyRows` lanza un error que nombra `sheetId:rowNo` y "another provider", y no hay movimientos ni `toAssign`. Comprobar que falla.
- [x] 5.2 Commit: test(settlement): invariante de filas de otro proveedor en rojo (#92), y `git push`.
- [x] 5.3 Implementar D5 (`classifyRows(rows, inclusions, providerId)` y su llamada en `computeSettlement`). Verificar que el test pasa y que los tests de dominio de settlement siguen en verde, con `Skipped` sin cambios.

  Resultado:
  - El invariante va en una función propia, `assertOwnProviderRows(rows, providerId)` en `inclusion.ts`, que `computeSettlement` llama antes de `classifyRows`. La firma de `classifyRows` y sus llamadas no cambian; la regla es la de D5.
  - Los tests de dominio pasan.
  - Siguen fallando 2 tests de la vista previa (servicio y ruta) porque falta `requiresEmptyBatchConfirmation`/`emptyBatch`, del contrato del grupo 1. Se arreglan en 8.1.
- [x] 5.4 Commit: feat(settlement): una fila de otro proveedor nunca se procesa (#92), y `git push`.

## 6. Imports: detalle, aviso de canales y tope en el servicio y el API

- [x] 6.1 Implementar `imports/infrastructure/empty-batch-facts.ts` (D1) y su versión en los fakes en memoria. Usarla en `ImportService.detailOf`, para `analysis.rows.unmatchedByReason`, `analysis.requiresEmptyBatchConfirmation` y `analysis.likelyWrongAccount`, también en el análisis sin filas. Pasar el `providerId` de la cuenta a `channelNotices`.
- [x] 6.2 Implementar el tope en `addFiles` (D7) y declarar el `409 import_file_limit_reached` en el esquema de la ruta `POST /imports/{id}/files`.
- [x] 6.3 Tests del servicio con fakes (`import-service.test.ts` e `import-service.analysis.test.ts`):
  - los campos nuevos de `analysis`;
  - `otherProvider` en el aviso;
  - el tope con 9 + 2 → 409, 9 + 1 → 200, 10 → 409, y quitar uno libera el hueco;
  - nada queda en el almacén tras el 409.

  Verificar con `pnpm --filter @recon/backend test`.
- [x] 6.4 Integración (pedir turno a la persona):
  - `imports.int.test.ts`: tope de archivos con once `.xlsx` distintos generados en el test;
  - `import-analyze.int.test.ts`: `batch-wrong-account` según su `expected.json`, `batch-clean` con los campos nuevos en `false`/0, `batch-blocked` con RAM-01 `otherProvider = true` y la `note` exacta, y el escenario de capacidad sigue por debajo de 3 s.

  Verificar con `vitest run --project integration` sobre cada archivo.

  Resultado (turno de base de la persona):
  - `imports.int.test.ts` e `import-analyze.int.test.ts`: 48 pasan y 1 se salta (el bench de 100 000 filas, que solo corre con `RECON_BENCH=1`). `batch-clean` analiza en 1830 ms (< 3 s).
  - Las comparaciones exactas de `analysis.rows` siguen en `toEqual`, con su `unmatchedByReason` determinado por el propio test: ambigua, pérdida de precisión, `batch-clean` reanalizado, 20 000 filas, bench y sin filas. Ninguna depende de algo ajeno al test, así que no queda ningún `toMatchObject` nuevo.

- [x] 6.5 Commit: feat(imports): detalle con el batch sin filas asociadas, canal de otro proveedor y tope de 10 archivos por import (#92, #40), y `git push`.

## 7. Validación: confirmación en el review

- [ ] 7.1 Añadir `confirmEmptyBatch` a `ValidationService.review` y a `ValidationRunRepository.review`, en Prisma y en memoria, según D2: dentro de la transacción, tras el bloqueo, `NoMatchedRowsError` y `emptyBatchConfirmed` en la auditoría. Declarar el `409 no_matched_rows` en la ruta `POST /imports/{id}/review`.
- [ ] 7.2 Tests con fakes (`validation-service.review.test.ts` y `validation-routes.test.ts`):
  - sin confirmar → 409 con `details`;
  - confirmado → 200 y auditoría;
  - confirmación de más → 200 sin la clave;
  - bloqueante antes que batch vacío;
  - `false` equivale a omitirlo.
- [ ] 7.3 Integración en `validation-review.int.test.ts` (pedir turno): los escenarios de "Batch sin filas asociadas al revisar" con `batch-wrong-account` y `batch-issues`, y la auditoría leída de `AuditLog`. Limpiar los imports creados (`removeImportsFrom`).
- [ ] 7.4 Integración #63 en `validation-edges.int.test.ts` (pedir turno). El test crea una transacción `Pending` en RAM-01 con un `sourceTransactionId` sintético y un import de `ProviderA-USD` que la trae en APP. Luego valida, lee el hallazgo, lo resuelve con nota, revisa y procesa con `batchNo` 98xx (D10): el movimiento es E `Successful`. En `afterAll` borra el intento (`removeSettlementsFrom`), el import y la transacción.
- [ ] 7.5 Commit: feat(validation): confirmación del batch sin filas asociadas en el review (#92), y `git push`.

## 8. Settlement: vista previa y procesar

- [ ] 8.1 Vista previa: `requiresEmptyBatchConfirmation` y `emptyBatch` en `SettlementService.preview` y `previewOf` (D2), sin 409. Process: la comprobación dentro de `processOnce`, tras `reviewIsValid`, más `emptyBatchConfirmed` en `settlement.process`. Declarar el `409 no_matched_rows` en la ruta. Actualizar el fake `__fakes__/in-memory.ts` con el mismo orden.
- [ ] 8.2 Tests con fakes (`settlement-service.test.ts` y `settlement-routes.test.ts`):
  - vista previa de un batch vacío y de `batch-clean`;
  - process sin confirmar → 409 sin escribir;
  - process confirmado → 201 con `movements` 0 y el fee;
  - `import_not_validated` antes que `no_matched_rows`.
- [ ] 8.3 Integración en `settlement-process.int.test.ts` (pedir turno):
  - `batch-wrong-account` sin confirmar → 409, sin intento y con `batch-number/next` sin cambiar;
  - confirmado con `batchNo` 98xx → 201, `amountPayable` de `expected.summary`, `channelsAssigned = []` y auditoría con `emptyBatchConfirmed`;
  - vista previa con `emptyBatch` igual a los `details`.

  Limpiar con `removeSettlementsFrom` y `removeImportsFrom`.
- [ ] 8.4 Regenerar el contrato con `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`. Verificar con `pnpm openapi:check` en verde y `pnpm typecheck` en el backend.
- [ ] 8.5 Commit: feat(settlement): confirmación del batch sin filas asociadas en la vista previa y al procesar (#92), y `git push`.

## 9. Frontend: Analysis & Validations (`features/validations`)

- [ ] 9.1 `DecisionBar` y `useReview` según D8:
  - el aviso de batch vacío y el de cuenta equivocada;
  - la casilla **Continue with batch fees only**;
  - Continue deshabilitado con `Confirm that this batch has batch fees only.`;
  - el cuerpo con `confirmEmptyBatch: true`;
  - el `409 no_matched_rows` (texto, relectura y casilla desmarcada).

  Textos en `strings.ts`, en inglés, tal como los dan los escenarios. MSW (`frontend/src/test/msw`) con `batch-wrong-account`.
- [ ] 9.2 Tests RTL de cada escenario de "Pantalla Analysis & Validations: batch sin filas asociadas", y que los de "continuar o cancelar" siguen igual. Verificar con `pnpm --filter @recon/frontend test` y `pnpm lint`. Comprobar con `git diff --stat` que no se tocó `features/imports/analysis`.
- [ ] 9.3 Commit: feat(web): confirmación del batch sin filas asociadas al continuar tras las validaciones (#92), y `git push`.

## 10. Frontend: Settlement Review y Upload Files

- [ ] 10.1 Settlement Review según D8: `review-form` (`confirmEmptyBatch`), `toRequest` (solo en process), `EmptyBatchConfirmation.tsx` en `PreSummary`, el motivo de Process deshabilitado, y `no_matched_rows` en `mutations.ts` y `STALE_PREVIEW`. Textos en `settlements/strings.ts`.
- [ ] 10.2 Upload Files: `import_file_limit_reached` en `features/imports/files/upload-queue.ts` con el texto del escenario, en `imports/strings.ts` (sección de rechazos, fuera de `analysis`). Ampliar el handler MSW de `POST files` con el tope.
- [ ] 10.3 Tests RTL:
  - los escenarios de "Pantalla Settlement Review: batch sin filas asociadas", en `process.test.tsx` y `preview.test.tsx`;
  - `review-form.test.ts`: la vista previa nunca lleva `confirmEmptyBatch`;
  - "Pantalla Upload Files: tope de archivos del import".

  Verificar con `pnpm --filter @recon/frontend test`, `pnpm lint` y `git diff --stat` sin `features/imports/analysis`.
- [ ] 10.4 Commit: feat(web): batch sin filas asociadas en Settlement Review y tope de archivos en Upload Files (#92, #40), y `git push`.

## 11. Colección Bruno

- [ ] 11.1 Crear `api-collection/20-flows/validations/batch-wrong-account`: upload, confirmar pareo, analizar, validar, review sin confirmar (409), review confirmado (200), vista previa, procesar sin confirmar (409) y cancelar con motivo. **Sin procesar** con confirmación. Usar las mismas variables y el mismo `0 Provider A accounts` o su equivalente para el `accountId`.
- [ ] 11.2 Ampliar `settlements/batch-clean/7 Preview.bru` (`requiresEmptyBatchConfirmation = false`, `emptyBatch = null`) y `validations/batch-blocked/3 Analyze.bru` (RAM-01 con `otherProvider = true`).
- [ ] 11.3 Ejecutar (pedir turno; prerrequisitos `pnpm db:up`, `pnpm db:seed` y `pnpm dev`) `pnpm test:api` dos veces seguidas sin sembrar. Verificar que todo pasa las dos veces y que no hay intentos nuevos en `ProviderA-USD`.
- [ ] 11.4 Commit: test(api): flujo de un archivo de otra cuenta en la colección (#92), y `git push`.

## 12. Cierre

- [ ] 12.1 Comprobación completa: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check` y la suite de integración entera (pedir turno). Releer README §1.2/§3.3/§4 contra lo implementado y corregir cualquier diferencia en el mismo PR.
- [ ] 12.2 Abrir el PR hacia `feature/entrega-3-MVP` con la plantilla. Debe enlazar #92, #63, #40 (solo la casilla del tope) y #131, e incluir la nota de coordinación. Vigilar el CI con `gh run list --branch feat/import-guardrails --json status,conclusion --jq '.[0]'` hasta verde.

## Workflow follow-up

- `/review-diff` en una sesión nueva, pedida por la persona (no en esta).
- `/opsx:verify` y `/opsx:archive` tras la fusión.
- Marcar la casilla del tope en #40 y cerrar #92 y #63.
