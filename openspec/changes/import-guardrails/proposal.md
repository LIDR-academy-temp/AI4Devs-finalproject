# Proposal — import-guardrails

Tres correcciones de reglas del grupo 3 del backlog en un solo change: #92 (import sin filas asociadas a la cuenta), #63 (`status_mismatch` con el gateway en `Pending`) y el tope de archivos por import de #40. **Sin migración ni seed.** Toca backend, contrato, dos pantallas (`features/validations` y `features/settlements`), una muestra nueva y la colección Bruno. La pantalla Analysis (`features/imports/analysis`) queda fuera, para no pisar el change `web-ambiguous-rows` de la otra sesión: es el issue #131.

## Why

- **#92.** Si se importa un archivo de otra cuenta o de otro merchant, todas las filas quedan `unmatched` (típicamente `id_format`). Las validaciones salen `not_applicable` o `passed`, y Process crea sin ningún aviso un batch solo de fees: amount payable negativo, el `batchNo` consumido y un intento que podría pagarse. Además, el aviso de canales dice "This account will become the primary account…" también de un canal de otro proveedor, que nunca se asocia. Un batch solo con `Other Fees` es legítimo (por ejemplo, el fee de setup de un canal), así que no se bloquea (decisión de K, 21-oct, opción D): se exige una confirmación explícita.
- **#63.** Una fila E con otro estado cuya transacción sigue `Pending` en el gateway se procesa con el estado de la fila (gate de `settlement-process`, P16), pero hoy la validación no lo avisa (`non-recorded-adjustment.ts:26`). Es un desajuste que se corrige del lado del merchant y debe verse como `status_mismatch`.
- **#40, tope de archivos.** El tope de 10 se aplica por petición. Repitiendo `POST /imports/{id}/files`, un import acumula archivos sin límite.

## What Changes

**Batch sin filas asociadas (#92). No es una novena validación.**

- Criterio único (P1): ninguna fila `matched` del proveedor de la cuenta en las hojas `transactions` del import. Una ambigua resuelta cuenta como `matched`. Un import con filas asociadas que quedan todas excluidas no pide confirmación: ya tiene sus advertencias.
- `POST /imports/{id}/review` acepta `{ runId, confirmEmptyBatch? }`. `POST /imports/{id}/settlements` acepta `confirmEmptyBatch` en `SettlementRequest`. Sin la confirmación, los dos responden `409 no_matched_rows`. En process, la comprobación va dentro de la transacción, después de las de la corrida.
- `details` del 409: `{ rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }`.
- La vista previa no responde 409. Lo informa con `requiresEmptyBatchConfirmation` y `emptyBatch`, que lleva la misma forma que `details` o `null`.
- `likelyWrongAccount` (¿cuenta equivocada?) se calcula en el backend: sin filas asociadas, al menos una sin asociar y todas `id_format`.
- `GET /imports/{id}`: `analysis.rows.unmatchedByReason`, `analysis.requiresEmptyBatchConfirmation` y `analysis.likelyWrongAccount`.
- La confirmación queda en la auditoría: `emptyBatchConfirmed` en `import.review` y en `settlement.process`. No se hereda: tras re-ejecutar o deshacer se confirma otra vez.

**Canales y filas de otro proveedor (#92)**

- El aviso de canales marca `otherProvider: true` y lleva su propia `note`, sin valor nuevo en `ChannelAssignment`. Un canal de otro merchant siempre es de otro proveedor.
- El procesamiento afirma el invariante (P5, decisión de K): si `classifyRows` recibe una fila asociada a una transacción de otro proveedor, falla con un error claro y no escribe nada. La forma de `Skipped` no cambia. En la práctica no ocurre, porque `provider_mismatch` bloquea antes.

**`status_mismatch` con el gateway en `Pending` (#63)**

- Una fila E con un estado resuelto distinto de `Pending` cuya transacción está `Pending` en el gateway produce un hallazgo `status_mismatch` dentro de la validación `non_recorded_adjustment`. No bloquea, la fila va incluida por defecto, se resuelve a mano y suma al `issueCount`.
- `pendingInRangeCount` deja de contar las transacciones que ya son `status_mismatch` en la corrida. Las filas `Pending` del batch siguen sin formar rango.

**Tope de archivos por import (#40)**

- 10 archivos en total por import. Añadir por encima responde `409 import_file_limit_reached` con `{ limit, current, adding }`, antes de leer o guardar nada. Sigue el `400 too_many_files` por petición.

**Pantallas**

- `features/validations`, `DecisionBar`: con `analysis.requiresEmptyBatchConfirmation`, una casilla de confirmación antes de **Continue to settlement review**, el aviso de cuenta equivocada si `likelyWrongAccount`, y el manejo de `409 no_matched_rows`.
- `features/settlements`, Settlement Review: la casilla del batch vacío junto a la de canales, con su aviso. Process deshabilitado sin marcarla; marcada, el cuerpo lleva `confirmEmptyBatch: true`. Manejo del 409.
- Upload Files (`features/imports/files`, fuera de `analysis`): el mensaje de `409 import_file_limit_reached`.

**Oráculos**

- Muestra nueva `data/samples/batch-wrong-account` con su `expected.json`, sin seed: un archivo de plantilla con IDs UUID de ProviderC-USD, subido a ProviderA-USD (solo gateway numérico), más una fila en `Other Fees`. Al regenerar solo pueden cambiar los archivos de la muestra nueva; si cambia algo más, se para y se pregunta.
- #63 se cubre con builders del dominio y un test de integración que crea su propia transacción `Pending`. No cambia ningún `expected.json` existente.

## Decisiones del gate (aprobadas por K, 2026-11-05)

- **P1.** Criterio: 0 filas `matched` de la cuenta en las hojas `transactions`; las ambiguas resueltas cuentan. El caso "todo excluido" no pide confirmación.
- **P2.** `confirmEmptyBatch` en review y process, con `409 no_matched_rows` (en process, dentro de la transacción). La vista previa informa con `requiresEmptyBatchConfirmation`, sin 409. `details = { rowsTotal, rowsUnmatched, unmatchedByReason, likelyWrongAccount }`.
- **P3.** `likelyWrongAccount` en el backend (`matched = 0 ∧ unmatched > 0 ∧ todas id_format`), en el detalle del import, en la vista previa y en el 409. En la UI, en `DecisionBar` y en Settlement Review. La pantalla Analysis, en #131.
- **P4.** `otherProvider: true` y su `note`, sin valor nuevo en el enum.
- **P5.** La forma de `Skipped` no cambia. Invariante en `classifyRows`, con un error claro y un test.
- **P6.** Hallazgo `status_mismatch` dentro de `non_recorded_adjustment`, no bloqueante e incluido por defecto. `pendingInRangeCount` deja de contar las transacciones que ya son hallazgo.
- **P7.** Muestra nueva `batch-wrong-account` sin seed. #63 con builders e integración propia.
- **P8.** 10 archivos en total por import, `409 import_file_limit_reached` con `{ limit, current, adding }`. Sigue el `400 too_many_files`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`:
  - "Añadir y quitar archivos antes de analizar": el tope total;
  - "Detalle de un import": `unmatchedByReason`, `requiresEmptyBatchConfirmation`, `likelyWrongAccount`;
  - "Aviso de canales" y "Canal de otro merchant en el aviso de canales": `otherProvider` y su `note`;
  - nuevo requisito "Import sin filas asociadas";
  - nuevo requisito "Pantalla Upload Files: tope de archivos del import".
- `validation`:
  - "status_mismatch en ciclo E": gateway `Pending`;
  - "Pending aparte": exclusión de las transacciones que ya son hallazgo;
  - "Decisión de conjunto": `confirmEmptyBatch` y `409 no_matched_rows`;
  - "Pantalla Analysis & Validations: continuar o cancelar": la casilla y el aviso.
- `settlement`:
  - "Precondición de procesar": `confirmEmptyBatch`;
  - "Filas que no se procesan": invariante de filas de otro proveedor;
  - "Vista previa del procesamiento": `requiresEmptyBatchConfirmation` y `emptyBatch`;
  - "Procesamiento atómico y auditado": `emptyBatchConfirmed`;
  - nuevo requisito "Pantalla Settlement Review: batch sin filas asociadas".
- `api-collection`: peticiones nuevas del flujo y negativos (ver Impact).

## Impact

- **Backend:**
  - `imports/domain`: un módulo nuevo `empty-batch.ts` (puro), `channel-notice.ts`, `upload-policy.ts` y `errors.ts` (`ImportFileLimitReachedError`, `NoMatchedRowsError`);
  - `imports/application`: `import-service.ts` (`addFiles`, `detailOf`) y `ports.ts`;
  - `imports/infrastructure`: la consulta de los hechos del batch vacío (`JSON_VALUE` sobre `detailJson`, sin migración);
  - `validation`: `non-recorded-adjustment.ts`, `missing.ts` (`pendingInRangeCount`), `validation-service.ts`, `prisma-validation-run-repository.ts` (`review`) y fakes;
  - `settlement`: `inclusion.ts` (invariante), `settlement-service.ts` (vista previa), `prisma-settlement-repository.ts` (process) y fakes.
- **Contrato** (`@recon/shared`, `docs/openapi.yaml`, tipos generados del frontend):
  - `ReviewBody`, `SettlementRequest`, `SettlementPreview`, `AnalysisSummary`, `AnalysisRows` y `ChannelNotice`;
  - los códigos `no_matched_rows` e `import_file_limit_reached`.
  - Todos los cambios son aditivos: campos opcionales en las peticiones y campos nuevos en las respuestas.
- **Frontend:** `features/validations` (`DecisionBar`, `mutations`, strings), `features/settlements` (Settlement Review, `review-form`, `mutations`, strings) y el aviso de Upload Files (`features/imports/files/upload-queue.ts`, strings). No se toca `features/imports/analysis`.
- **Datos:** `data/samples/plan.ts`, la carpeta `batch-wrong-account/` y `data/samples/README.md`. Sin seed ni migración.
- **Tests:**
  - TDD de dominio: `empty-batch`, `non-recorded-adjustment`, `pendingInRangeCount` e invariante de `classifyRows`;
  - integración de review, process, preview, detalle y `addFiles`, con `batch-wrong-account`, y de `Pending` con una transacción propia;
  - RTL de `DecisionBar` y Settlement Review;
  - Bruno: flujo `20-flows/validations/batch-wrong-account` (sin procesar, para no consumir números de `ProviderA-USD`) y comprobaciones nuevas en los flujos `batch-clean` y `batch-blocked`. El `409 import_file_limit_reached` queda en integración: harían falta once archivos distintos y la colección solo tiene ocho.
- **Documentación:** README §1.2, §3.2, §3.3, §4.2–§4.4 (ya actualizado en este change, antes del código); `docs/openapi.yaml`; `data/samples/README.md`.
- **GitHub:** #131 (pantalla Analysis), y cerrar #92, #63 y la casilla del tope de #40 al fusionar.
