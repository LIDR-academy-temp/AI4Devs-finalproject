# Design

## Context

- El esquema de settlement existe desde el tramo 0 (`0001_init`, `0002_constraints`): `SettlementBatch` con `UX_SettlementBatch_active_accountBatchNo (accountId, batchNo)` y `UX_SettlementBatch_active_import (importId)` filtrados por `status <> 'undone'`, `UNIQUE (accountId, batchNo, attemptNo)`, `SettlementTransaction` con `UNIQUE (transactionId, cycle, batchId)` y `eventDate NOT NULL`, `SettlementTransactionFee`, `SettlementBatchFee` (`source` ∈ file | manual), `SettlementBatchTotal` (cinco categorías), `SettlementBatchBrandTotal`, `AccountChannel` con `UX_AccountChannel_primary`. La `CHECK` "sin `feeId` ⇒ `allowsFreeAmount`" de README §3.2 cruza tablas y no está en la base. Nadie escribe hoy en estas tablas salvo el seed.
- El seed (`backend/prisma/seed.ts`, `settlementMovementsOf` en `synthetic.ts`) ya fija una forma de los movimientos históricos: E con el estado de la fila (`Successful`/`Declined`) e importe 0 si es declinada; R con importe 0 y la reserva liberada; totales positivos; `settlementStatusId` 0 = Unsettled, 1 = Settled. Los oráculos (`data/samples/plan.ts` → `expected.json`) usan las mismas fórmulas. Tres de ellas son errores según el gate (proposal.md, "Decisiones del gate") y se corrigen en el grupo 0 de tasks: el RDR con importe 0, el payable sin los fees por batch y el redondeo a céntimos con `Math.round` sobre floats. Lo demás, este design lo respeta.
- Patrón heredado de `validation-runs` (D4, D7, D9, D14): toda escritura del flujo empieza con una `UPDATE` con guarda sobre la fila de `Import`, que la bloquea hasta el commit; auditoría dentro de la transacción; gancho `beforeClaim` en el repositorio para tests deterministas (este change añade `beforePhase`, antes de cada fase de escritura, D5); escritura en bloque con `OPENJSON` y `MERGE … OUTPUT` (D5); alcance con `scopeOf` + `404` idéntico; `requirePermission` antes del alcance.
- `GET /imports/{id}` ya devuelve `channels` (aviso de canales, `channel-notice.ts`) y `batchFees` (prellenados de `Other Fees`, `batch-fees.ts`): Settlement Review los reutiliza tal cual.
- No hay módulo `fees` en el backend (la administración es el tramo 5). `validation/application/ports.ts` declara `MissingResolution` sin implementar (D11 de `validation-runs`).
- Fechas de negocio (`transactionDate`, `lastStatusChangedAt`, `eventDate`, `settlementDate`, `Fee.startDate/endDate`, rangos) son hora de pared de Nueva York guardada sin zona. El adaptador las lee como `Date` "en UTC", así que su día es `toISOString().slice(0, 10)`. Las de auditoría (`processedAt`, `assignedAt`, `resolvedAt`, `createdAt`) son instantes UTC reales (README §3.2, deuda #48).

## Goals / Non-Goals

**Goals:**
- Un único cálculo puro (`computeSettlement`) que usan la vista previa y el procesamiento, comprobado contra `expected.json`.
- Procesar de forma atómica y serializada frente a los dos solapes del issue (mismo import; mismo número en dos imports de la cuenta), con tests deterministas.
- Contratos que #13 pueda mockear sin leer el código y que #12 pueda leer sin redefinir la forma del intento.

**Non-Goals:**
- Pagar, retirar el pago, deshacer y sus rutas (tramo 6). `reopenForBatch` se implementa y se prueba sin ruta.
- Lecturas de intentos y exports (#12), salvo el constructor de la vista del intento, que #12 reutiliza (D19).
- Tope de reserva (P10, alerta en #61) y variantes condicional y por marca de los fees: se advierten, no se calculan.
- Política de reserva ante chargeback (liberación anticipada, P12 y el cambio de `heldReserves`): #62, Entrega 3 (D12).
- `status_mismatch` con el gateway en `Pending` (P16, #63): no se toca el motor de validaciones.

## Decisions

### D1. Estructura
```
modules/fees/                       (new, minimal; admin stays for tramo 5)
  domain/fee-selection.ts           validity at a business day, NULL as ±∞ (pure)
  domain/fee-amount.ts              fixed + percentage × base; the product rounded half up to 4 decimals (pure)
  application/fee-read-service.ts   list of an account's fees (transactional, asOf) and fee types
  infrastructure/prisma-fee-repository.ts
  http/fee-routes.ts                GET /accounts/:id/fees, GET /fee-types
modules/settlement/
  domain/                           pure and synchronous, like the validation engine
    types.ts                        SettlementInput, SettlementPlan, MovementPlan, Skipped, Warning
    inclusion.ts                    which rows are processed (D8, D9)
    movements.ts                    status, amount, eventDate, round, reserve per row (D4, D12)
    transactional-fees.ts           fees per movement and their configurationSnapshot (D10)
    batch-fees.ts                   rules for the batch fees of the request (D13)
    channels.ts                     channel names, channels to assign, SettlementBatch.channels label (D14)
    totals.ts                       categories, brands, otherFeeAmt, reserves, amountPayable (D15)
    payable-breakdown.ts            signed lines whose sum is amountPayable (D15)
    batch-number.ts                 next number and attempt from the account's attempts (D7)
    compute-settlement.ts           composes the above: SettlementInput → SettlementPlan
    money.ts                        Decimal helpers: 4 decimals half-up, toFixed(4)/(6)
  application/
    ports.ts                        SettlementSource, SettlementRepository, SettlementReader
    load-settlement-input.ts        reads everything the calculation needs (shared by preview and process)
    settlement-service.ts           nextBatchNumber, preview, process
    errors.ts                       DomainError subclasses (D18)
    __fakes__/in-memory.ts          doubles of the ports over buildWorld(), like validation
  infrastructure/
    prisma-settlement-source.ts
    prisma-settlement-repository.ts guarded transaction, bulk writes, beforeClaim and beforePhase (D5–D7, D16)
    prisma-settlement-reader.ts     SettlementView of an attempt (D19, used by #12)
    status-ids.ts                   TransactionStatus ids of the fixed catalog
    import-service-prefilled-fees.ts  pre-filled batch fees as GET /imports/{id} proposes them (D13, P7)
  test-support/                     builders.ts, sample-input.ts (samples without a database), example-view.ts
  http/settlement-routes.ts         POST settlements, POST settlements/preview, GET batch-number/next
  settlement-module.ts
modules/validation/infrastructure/prisma-missing-resolution.ts   implements the MissingResolution port (D11)
```
- *Alternativa descartada*: meter el procesamiento en `imports` porque "procesa un import". Mezcla dos agregados y dos specs. El settlement tiene dominio propio (fees, reservas, totales) que #12 y el tramo 6 amplían.
- *Alternativa descartada*: el cálculo de fees dentro de `settlement`. La selección por fecha y el importe son reglas de la spec `fees`, que el tramo 5 necesitará para "simular el efecto de un cambio". Se dejan en `fees/domain` y `settlement` las importa.

### D2. Un cálculo puro compartido por vista previa y procesado
`computeSettlement(input: SettlementInput): SettlementPlan`, síncrono y sin I/O. `SettlementInput` trae: la cuenta (proveedor, política de reserva, tope), las filas asociadas del import con hoja, fila, orden de primera aparición, estado, ciclo, `excludeAmount` y su transacción (importe, estado, fechas, `appliedReservePct`, canal, marca), las inclusiones de las apariciones `current_import` de la corrida vigente, los canales con sus plazos y su asociación actual, los movimientos vigentes del proveedor de esas transacciones (para la ronda, la reserva retenida y la liberada), los fees de la cuenta (todos, con vigencia), el catálogo de tipos, los intentos de la cuenta (para número e intento) y el cuerpo del request. Devuelve los movimientos con su desglose de fees, los fees por batch validados, los totales, el desglose del payable, `skipped`, `warnings` y los canales a asociar.
- `loadSettlementInput(source, importId)` hace la carga, troceando `IN (…)` a 2 000 parámetros (`BIGINT`, sin la conversión `NVARCHAR` de #5 D4). La usan el servicio (vista previa, fuera de transacción) y el repositorio (procesar, dentro de la transacción, con el cliente transaccional, D6).
- Los oráculos se comprueban en dos niveles. Unitarios: `computeSettlement` sobre un `SettlementInput` construido en memoria desde `buildWorld()` + `plan.ts`, como el motor de validaciones. Integración: por la API.
- *Alternativa descartada*: calcular en SQL (`INSERT … SELECT` con los fees en `OUTER APPLY`). Es rápido, pero la selección por fecha, el redondeo, el ajuste sin fecha y el desglose del payable quedarían repartidos entre SQL y TypeScript, sin test unitario TDD (CLAUDE.md "TDD en el dominio"). Además, la vista previa necesitaría una segunda implementación.

### D3. Clave única de `SettlementTransaction` por fila de origen
Migración `0007_settlement_process` (a mano, `BEGIN TRY / BEGIN TRAN … COMMIT / CATCH ROLLBACK; THROW`, como `0006`):
1. `ALTER TABLE SettlementTransaction DROP CONSTRAINT SettlementTransaction_transactionId_cycle_batchId_key`. El índice no único `SettlementTransaction_transactionId_cycle_idx` ya cubre las búsquedas por `(transactionId, cycle)`.
2. `CHECK CK_SettlementTransaction_sourceRow ((sheetId IS NULL AND rowNo IS NULL) OR (sheetId IS NOT NULL AND rowNo IS NOT NULL))`.
3. Índice único filtrado `UX_SettlementTransaction_batch_row (batchId, sheetId, rowNo) WHERE sheetId IS NOT NULL`. Todo movimiento que escribe este change sale de una `ImportRow` (`sheetId`, `rowNo` no nulos). Los históricos del seed no tienen fila y no entran en el índice.
4. `ALTER COLUMN eventDate DATETIME2 NULL` (D4).

Migración aparte, `0008_settlement_fee_event_date` (decidida durante el apply del grupo 11, mismo patrón `BEGIN TRY / BEGIN TRAN`): `SettlementTransactionFee.eventDate` también admite `NULL`. Un ajuste sin fecha que recibe el fee `NULL…NULL` de su tipo (P6b) guarda en su fila de desglose la misma fecha nula que su movimiento. *Descartado*: no aplicar nunca fee a un ajuste sin fecha (contradice P6b) o guardar la fecha de referencia del batch (no es la del evento).

`schema.prisma`: se quita `@@unique([transactionId, cycle, batchId])` y queda un comentario con el índice filtrado (como `AccountChannel`); `eventDate DateTime?` en los dos modelos. Se regenera el cliente. Las migraciones no las genera Prisma: CLAUDE.md prohíbe `migrate dev` y `db push`.

**Impacto en `validation`**: el detalle de una aparición histórica (`prisma-validation-run-repository.ts`, `settledExcluded`) busca hoy `excludeAmount` por `(batchId, transactionId, cycle)`. Pasa a buscarlo por `(batchId, sheetId, rowNo)` cuando la aparición tiene fila (D3 de `validation-runs`), y por `(batchId, transactionId, cycle)` solo para movimientos sin fila, que son del seed y no repiten clave. Lo cubre el escenario "Dos movimientos históricos de la misma clave en un batch".
- *Alternativa descartada 1*: combinar las inclusiones y escribir un movimiento por `(transactionId, cycle)`. Refund y Chargeback son eventos distintos, con importe, fee y fecha propios. `CHB 2` lleva `excludeAmount`, y un duplicado incluido a mano es una decisión explícita de contarlo dos veces. Combinar perdería la fila de origen y el desglose por evento, y obligaría a inventar qué estado guarda el movimiento combinado.
- *Alternativa descartada 2*: añadir una columna `seqNo` a la clave. Cambia más el esquema y no dice nada que la fila no diga ya.
- *Alternativa descartada 3*: `UNIQUE (batchId, sheetId, rowNo)` sin filtro. SQL Server trata los `NULL` como iguales en un índice único, así que dos movimientos del seed del mismo batch sin fila chocarían.

### D4. Fecha del evento y ajustes sin fecha
- E: `Transaction.transactionDate`. R: vencimiento de la reserva, `transactionDate + Channel.rollingReserveDays`, la misma fecha que forma el rango R en `validation` (README §3.3). El seed usa `settlementDate`, pero es opcional y no es una fecha del gateway.
- I (P6, decidido en el gate), en este orden:
  1. `ImportRow.txnDate`, la fecha que trae el proveedor en la fila, si la columna se pareó como `txnDate` y la celda tiene valor. La plantilla estándar no trae columna de fecha, pero la regla global `Date` → `txnDate` existe.
  2. Si no, `Transaction.lastStatusChangedAt`, solo si no es nulo **y** el estado actual de la transacción en el gateway es el estado de la fila. Es el mismo criterio que forma el rango I (README §3.3, "Filas que forman cada rango"): la fuente solo conserva la última fecha de cambio, y si no corresponde al evento reconciliado no se usa (README §3.2, "Transaction").
  3. Si no, `eventDate = NULL` y advertencia `undated_adjustment { transactionId, sheetId, rowNo, feeSkipped }`.
  - La fecha del proveedor se guarda tal cual, sin conversión de zona (riesgo en Risks).
- Fee de un ajuste sin fecha (P6b, aprobada): se aplica el fee de su tipo solo si es el único de la cuenta para ese tipo y su vigencia es `NULL…NULL`. Si no, ninguno de ese tipo. `feeSkipped = true` solo cuando hay fees del tipo y ninguno es ese único `NULL…NULL`; si la cuenta no tiene fee del tipo, `feeSkipped = false`.
- *Alternativa descartada*: rellenar con la fecha del batch, `settlementDate` o la hora actual. Es justo lo que HU3 CA3 prohíbe ("no se inventa la fecha").
- *Alternativa descartada*: preferir `lastStatusChangedAt` a la fecha del proveedor. Es la última fecha de cambio del gateway, no necesariamente la del evento que el proveedor liquida en esta fila (p. ej. un Refund posterior a un Chargeback).
- *Alternativa descartada*: rechazar el procesado (`409`) con ajustes sin fecha. Sería una segunda causa de bloqueo, y el README solo admite `provider_mismatch`.

### D5. Precondición, guarda y revisión vigente
`SettlementRepository.process(importId, request, userId, now)` en **una** transacción (`READ COMMITTED`):
1. `beforeClaim?.('process')` (gancho de tests, sin bloqueos; el otro gancho, `beforePhase`, va en el paso 4).
2. Guarda: `UPDATE [Import] SET status = 'processed', updatedAt = @now OUTPUT inserted.[importId] WHERE importId = @id AND status = 'validated'`; la cuenta se lee después con `importContext`. Con 0 filas se relee el estado y se lanza `409 import_not_validated { status }`. La `UPDATE` bloquea la fila de `Import` hasta el commit, así que re-ejecutar, cambiar una inclusión, revisar, cancelar o un segundo proceso del mismo import esperan o ya confirmaron. Un `409` posterior (número ocupado, canales, fees) deshace también la guarda.
3. Corrida vigente (`isSuperseded = 0`): sin corrida → `409 validation_run_required`; `runId` del cuerpo distinto del vigente → `409 validation_run_superseded { runId, currentRunId }`; algún resultado `blocked` → `409 blocking_validation_issue { runId, validationCodes, issueIds }`; la revisión válida de esa corrida (misma regla que `validReview` de `validation-service.ts`: última `import.review` de la corrida sin `import.review.invalidate` posterior) no existe → `409 validation_run_superseded`. Como un `validated` siempre tiene la revisión de la vigente (invariante de `validation-runs`), la tercera y la cuarta comprobación son defensivas y se prueban con datos inyectados.
4. Carga (D6), cálculo, número (D7), escrituras (D16), canales (D14), `MissingResolution.resolveForBatch` (D11), `ValidationIssue.detectedInBatchId` de los hallazgos de la corrida vigente, `Import.currentBatchId` y auditoría (D18), en ese orden. Antes de cada fase de escritura (`batch`, `movements`, `batchFees`, `totals`, `channels`, `missing`, `import`, `audit`) el repositorio espera el gancho de tests `beforePhase?.(phase)`, y también justo antes de los dos bloqueos: `number` (antes de `lockNumber`) y `channelLock` (antes de `lockChannels`).

- **`runId` obligatorio** en el cuerpo. Es el mismo criterio que el review (D7 de `validation-runs`): se procesa la corrida que el analista vio. Si entre medias se re-ejecutó y se revisó otra, el import vuelve a estar `validated` y sin `runId` se procesaría algo que nadie miró. Lo que no se fija son las inclusiones vistas: un cambio de inclusión seguido de un nuevo review sobre la misma corrida pasa, como en el review (#53).
- *Alternativa descartada*: versión optimista con `updatedAt` enviado por el cliente. Cubre también el ABA de las inclusiones, pero obliga a #13 a llevar un campo más y no está en el contrato de `GET /imports/{id}` (que no expone `updatedAt`). Queda con #53.

### D6. Cálculo dentro de la transacción, tras la guarda
Procesar carga la entrada y calcula **dentro** de la transacción, después de la guarda. La guarda impide que cambien las inclusiones, la corrida o la revisión del import mientras se calcula, y el resultado es exactamente lo que se escribe. La vista previa hace la misma carga fuera de transacción y no escribe.
- Coste: el bloqueo de la fila de `Import` dura la carga y el cálculo (estimado < 1 s con 2 000 filas). Solo afecta a las escrituras de ese import y a las lecturas de esa fila sin RCSI (riesgo L7 de `import-analyze`). Se registra `log.info({ importId, batchId, movements, loadMs, computeMs, writeMs })` (`movements` = número de movimientos; `writeMs` es el total de las escrituras, sin desglose por fase). Umbral del test de integración: menos de 3 s para `batch-clean`.
- *Alternativa descartada*: calcular fuera y persistir con versión optimista, como la corrida de validaciones (D4 de `validation-runs`). Allí el cálculo puede tardar segundos y se repite sin coste. Aquí la entrada incluye datos de otros imports (movimientos vigentes del proveedor para ronda y reservas), que la versión del import no protege. Habría que añadir una segunda comprobación y, aun así, la ventana existe. Calcular dentro reduce la ventana a lo que `READ COMMITTED` admite y simplifica los tests.
- Lo que sigue sin protegerse: dos batches de **imports distintos** que traen la misma transacción a la vez (p. ej. su E en uno y su chargeback en otro) pueden calcular la ronda o la liberación anticipada sin ver al otro. Es el mismo riesgo que acepta `validation` con el histórico. La liberación anticipada, que es donde más pesa, va con #62.

### D7. Número de batch e intento (concurrencia entre imports de la cuenta)
- Dentro de la transacción, tras la guarda: `SELECT batchNo, attemptNo, status, importId FROM SettlementBatch WITH (UPDLOCK, HOLDLOCK) WHERE accountId = @a AND batchNo = @n`. `HOLDLOCK` toma un bloqueo de rango sobre el índice `(accountId, batchNo, attemptNo)`: otro proceso de la misma cuenta con el mismo número espera al commit del primero y ve su intento. Con un intento vigente → `409 batch_no_taken { batchNo, attemptNo, importId }`. Si no, `attemptNo = max + 1` (1 sin filas).
- `batchNo` omitido → el propuesto: `batch-number.ts` sobre los intentos de la cuenta, `max(batchNo)` en cualquier estado + 1 (P13), o el número del intento `undone` más reciente del import si no hay ninguno vigente de ese número (`reason: "reprocess"`).
- **Última barrera**: `UX_SettlementBatch_active_accountBatchNo`, `UX_SettlementBatch_active_import`, `UNIQUE (accountId, batchNo, attemptNo)` (`SettlementBatch_accountId_batchNo_attemptNo_key`) y `UX_AccountChannel_primary` (D14). `violates()` solo traduce una violación única real: `PrismaClientKnownRequestError` con código `P2002` cuyo mensaje o `meta` nombra el índice, como `isCurrentRunViolation` de `validation`; cualquier otro error sigue su camino aunque su texto nombre el índice. `UX_SettlementBatch_active_accountBatchNo` y `UNIQUE (accountId, batchNo, attemptNo)` pasan a `409 batch_no_taken`, `UX_SettlementBatch_active_import` a `409 import_not_validated { status: processed }` y `UX_AccountChannel_primary` a `409 channel_assignment_not_confirmed`. Con el bloqueo de rango la carrera del número no se alcanza desde dos peticiones, así que los tests provocan la violación real dentro de la misma transacción (D20). Para los `details` de `batch_no_taken`, fuera de la transacción ya deshecha se busca el intento vigente que ganó la carrera filtrando por la cuenta (`accountId`) y el número que el proceso bloqueó (el pedido o el propuesto); si no se encuentra, se responde con ese número, su intento y el propio `importId`, nunca `0`. Nunca llega un `500`.
- `GET /accounts/{id}/batch-number/next?importId=`: la misma función sobre una lectura sin bloqueo. Es una propuesta, no una reserva del número.
- *Alternativa descartada 1*: confiar solo en el índice filtrado. Funciona, pero el error llega al insertar el batch, después de escribir y deshacer trabajo, y depende de traducir códigos del driver en el camino normal en vez de en el excepcional.
- *Alternativa descartada 2*: `sp_getapplock` por `(accountId, batchNo)`. Es correcto pero añade un mecanismo nuevo, y el bloqueo de rango sobre el índice que ya existe basta (D4 de `validation-runs` descartó lo mismo).
- Orden de bloqueos para no crear interbloqueos: `Import` (guarda) → `SettlementBatch` (número, `lockNumber`) → filas `AccountChannel` de los canales del batch releídas `WITH (UPDLOCK, HOLDLOCK)` en orden de `channelId` (`lockChannels`, D14) → inserciones. `ValidationIssue` no está en este orden, y los interbloqueos entre procesados ocurren (Risks, #67). Mitigación: `process()` reintenta la transacción entera cuando SQL Server la elige víctima (1205), hasta 3 intentos con una pausa aleatoria corta (50–100 ms) y `log.warn` en cada reintento; agotados, `409 settlement_busy`. Solo se reintenta ese caso: a través del adaptador mssql el 1205 llega como `PrismaClientKnownRequestError` `P2010` (SQL en crudo) o `P2034` (cliente) con `meta.driverAdapterError.cause.kind = 'TransactionWriteConflict'`, que el adaptador solo da al 1205 (forma observada en un interbloqueo provocado). Un intento fallido no deja nada: su transacción se deshace entera.

### D8. Combinación de inclusiones
Una fila `matched` del import se procesa si **ninguna** de sus apariciones `current_import` de la corrida vigente tiene `includeInSettlement = false`. La aparición se identifica por `(sheetId, rowNo)`. Una fila sin apariciones se procesa. README §3.3 deja esta decisión al procesamiento.
- Consecuencias, todas coherentes con "no se contabilizan dos veces": la fila excluida como duplicado *across* y primera de un duplicado *in batch* no se procesa. En una colisión se procesan todas. Una inclusión manual cuenta si la fila no está excluida en otro hallazgo; si lo está, el analista tiene que incluirla en los dos.
- *Alternativa descartada 1*: "incluida si alguna la incluye" (OR). Haría que la primera aparición de un duplicado *in batch*, ya liquidada en otro batch, se volviera a contar por defecto.
- *Alternativa descartada 2*: prioridad por validación (la de *across* manda). Introduce un orden que el README no da y es más difícil de explicar en #10.

### D9. Filas que no se procesan
`inclusion.ts` clasifica cada fila en procesada o `skipped` con un único motivo, en este orden: `ignored` (fila ignorada o `matchResult = ignored`), `unmatched`, `ambiguous`, `excluded` (D8), `unresolvedStatus` (E o I con `statusId` nulo), `pending` (el estado de la **fila** es `Pending`). Las filas de otro proveedor no llegan: bloquean la corrida.
- **Gateway en `Pending`** (decisión del gate): una fila con otro estado cuya transacción está en `Pending` en el gateway se procesa con el estado de la fila, como un desajuste APP/DEC; se corrige del lado del merchant. Hoy la validación no lo marca (`non-recorded-adjustment.ts:26` no compara un gateway `Pending`, como dice README §3.3). Queda en P16 y no se cambia aquí. README §3.3 recibe la regla del procesamiento en el commit de README (D21).
- *Alternativa descartada* para el gateway en `Pending`: saltar la fila. Es lo que decía el primer borrador; el gate lo rechazó porque el proveedor sí la liquidó.
- `skipped` es `{ ignored, unmatched, ambiguous, excluded, unresolvedStatus, pending }` en la vista previa, en la respuesta y en el detalle de la auditoría, y #13 lo muestra.
- *Alternativa descartada 1* para el estado no resuelto: tomar el estado del gateway. Inventa el estado que el proveedor liquida y elige un fee que el proveedor no reportó.
- *Alternativa descartada 2*: `409` hasta resolverlo. El estado no se puede corregir sin cancelar el import (HU1 CA8), y el README solo bloquea por `provider_mismatch`.

### D10. Fees transaccionales por fecha de evento
- `transactional-fees.ts`: para cada movimiento E o I, y para cada `FeeType` transaccional con `appliesToStatusId = statusId` del movimiento, el fee de la cuenta vigente el día de `eventDate` (`fee-selection.ts`; el trigger `TR_Fee_NoOverlap` garantiza que es único). R no lleva fees transaccionales (oráculo).
- `fee-amount.ts`: `fixedAmount + percentage × base`, con base = `Transaction.amount` (también en un `Declined`, donde el importe del movimiento es 0, y en un `CHB 2`), a 4 decimales: solo el producto que da más se redondea mitad hacia arriba en el cuarto (`Decimal.toDecimalPlaces(4, ROUND_HALF_UP)`, P1), y se guarda en `DECIMAL(19,4)` sin pérdida. La misma regla vale para la reserva (D12) y los totales son sumas exactas de esos valores. `conditionalPercentage`, `conditionThresholdAmt` y las variantes por marca no se aplican (P10). Si un fee aplicado las tiene, advertencia `fee_variant_not_applied`.
- Desglose: una `SettlementTransactionFee` por fee aplicado (`feeId`, `feeTypeId`, `eventDate`, `amountUsd`, `configurationSnapshot` = JSON con la fila del fee tal como se aplicó y la base usada). `SettlementTransaction.feeAmount` = suma.
- Advertencia `no_transactional_fees` cuando la cuenta no tiene ningún fee transaccional. Ninguna muestra la produce: `legacy-provider` tiene el fee de Chargeback de ProviderC-Alt (tarea 0.1) y sale sin advertencias; la cubre `transactional-fees.test.ts`.
- *Alternativa descartada*: redondear cada fee a céntimos, como hacía el oráculo con `Math.round` sobre floats. El gate decidió 4 decimales: la columna los guarda, y redondear por movimiento acumula diferencias en el total. El oráculo se corrige en el grupo 0.

### D11. `MissingResolution` (validation)
`PrismaMissingResolution` implementa el puerto con `tx: Prisma.TransactionClient`, que pasa a ser el tipo del parámetro en `ports.ts` (el `unknown` de D11 de `validation-runs`).
- `resolveForBatch(tx, batchId, at)`: una sentencia `UPDATE vi SET resolutionStatus = 'resolved', resolvedInBatchId = @batchId, resolvedAt = @at FROM ValidationIssue vi JOIN ValidationResult ⋈ ValidationRun (isSuperseded = 0) ⋈ Import ⋈ Account (providerId = proveedor del batch) WHERE vi.issueType = 'missing' AND vi.resolutionStatus = 'persistent' AND EXISTS (movimiento del batch con el mismo transactionId y cycle)`. Devuelve `@@ROWCOUNT`. Alcance P14: cualquier import del proveedor.
- `reopenForBatch(tx, batchId)`: `UPDATE … SET resolutionStatus = 'persistent', resolvedInBatchId = NULL, resolvedAt = NULL WHERE resolvedInBatchId = @batchId AND issueType = 'missing' AND resolvedByUserId IS NULL`. Lo llamará deshacer (tramo 6); aquí se prueba con un batch marcado `undone` por el test.
- `at` es el instante UTC del proceso (`resolvedAt` es una fecha de auditoría).
- *Alternativa descartada*: resolver fila a fila desde TypeScript con los movimientos en memoria. Son N sentencias para lo que una sola `UPDATE … FROM` resuelve en la base, donde están los hallazgos de otros imports.

### D12. Reserva retenida y liberada; la política ante chargeback, a la Entrega 3
- E `Successful`: `reserveHeldAmt = Transaction.amount × Transaction.appliedReservePct` a 4 decimales (mitad hacia arriba en el cuarto, P1), `appliedReservePct` copiado, `reserveDaysUsed = Channel.rollingReserveDays`, `expectedReserveReleaseAt = transactionDate + días`, salvo que la retenida sea 0 (p. ej. `appliedReservePct = 0`), en cuyo caso `expectedReserveReleaseAt = null`. E `Declined`: `appliedReservePct` y `reserveDaysUsed` copiados igual (de la transacción y del canal), importes de reserva 0 y `expectedReserveReleaseAt = null`.
- R: `reserveReleasedAmt` = el mismo cálculo sobre la transacción (es lo que hacen el oráculo y el seed, y no depende de que exista un E en el sistema), `reserveDaysUsed` del canal, `amount = 0`.
- Todo movimiento I lleva `reserveEarlyReleasedAmt = 0` y `reservePolicySnapshot = { policy, applied: false }`, que registra la política de la cuenta sin aplicarla. Con `release_on_chargeback`, advertencia `chargeback_reserve_policy_not_applied` si el batch trae algún `Chargeback`.
- Tope de reserva (`rollingReserveCapAmt`): no se aplica en el MVP (P10). Advertencia `reserve_cap_not_applied` si la cuenta lo tiene; la alerta de tope alcanzado es #61.
- **Recortado a la Entrega 3 (#62)**: la liberación anticipada (`release_on_chargeback`, una sola vez por reserva, guardada en el movimiento I del chargeback y no en el E original), P12 (RR de una reserva ya liberada → `reserveReleasedAmt = 0` y `reserve_already_released`) y el cambio de `heldReserves` para leer la liberación de los I vigentes. El contrato ya tiene los campos (`reserveEarlyReleasedAmt`, línea `reserve_early_released` del desglose, la advertencia), así que #62 no lo cambia.
- *Alternativa descartada*: implementar ya la política (era el grupo 12). Se recortó en el gate por plazo de la Entrega 2.
- *Alternativa descartada*: no guardar `reservePolicySnapshot` hasta #62. Sin él, un batch de la Entrega 2 no diría qué política tenía la cuenta al procesarse.

### D13. Fees por batch del request
`batch-fees.ts` valida cada elemento de `batchFees` en orden. En el primero que falla: `400 batch_fee_invalid { index, reason }`.
- `feeTypeId` inexistente → `unknown_fee_type`; transaccional → `transactional_fee_type`.
- `feeId` no nulo: debe ser un fee de la cuenta del import de un tipo no transaccional (`fee_not_in_account`; un fee transaccional de la cuenta no es preestablecido de un batch y responde también `fee_not_in_account`, no `fee_type_mismatch`), de ese tipo (`fee_type_mismatch`) y vigente en la fecha de negocio de referencia (P8: `settlementDate` o, sin ella, el máximo de los rangos de la corrida) (`fee_not_in_force`). Sin `settlementDate` ni rangos no hay fecha de referencia y la comprobación de vigencia se omite.
- `feeId` nulo: el tipo tiene `allowsFreeAmount`, o el elemento es `source = "file"` y su `feeTypeId` coincide con uno de los prellenados del import (P7, aprobada; el mantenimiento de tipos es #60) (`free_amount_not_allowed`).
- Un preestablecido solo con porcentaje (P9) no se calcula: `GET /accounts/{id}/fees` lo devuelve con `fixedAmount = null` y el analista escribe el importe; el servidor nunca propone uno.
- `amount`: decimal con hasta 4 decimales, distinto de 0, con signo (los ajustes pueden ser negativos, README §4.3). `description` ≤ 200.
- Importe libre de un fee añadido a mano (`feeId = null`, `source = "manual"`): `description` obligatoria, 1–200 caracteres tras `trim` (`description_required`). Es lo único que explica un importe que no sale de ningún preestablecido ni del archivo (README HU3 CA2, "importe libre con su categoría y descripción").
- El orden de `batchFees` del request se conserva: se guardan con `batchFeeId` creciente en ese orden y la vista previa y la respuesta los devuelven igual.
- Se guardan con `enteredByUserId` = quien procesa y el `source` del request. `otherFeeAmt` = suma.
- *Alternativa descartada 1*: exigir siempre un preestablecido o `allowsFreeAmount`. Rechazaría los dos prellenados de `batch-clean` (`Wire Fee` y `Settlement Fee` no admiten importe libre y ProviderA-USD no los tiene configurados), justo los que README §1.2 dice que "aparecen prellenados".
- *Alternativa descartada 2*: añadir la `CHECK` cruzada como trigger. Es una regla con excepción (P7) que depende del request, no solo de la fila.

### D14. Asociación de canales
- Canales del batch = canales de las transacciones de los movimientos procesados. Para cada uno, su situación (`AccountChannel` de la cuenta y principal actual) con `channelStateOf` de `domain/channels.ts`, la misma regla que `channel-notice.ts`. La carga (vista previa y procesar) la calcula sin bloqueo; al procesar, después de `lockNumber`, el repositorio relee las filas `AccountChannel` de esos canales `WITH (UPDLOCK, HOLDLOCK)` en orden de `channelId` (`lockChannels`, D7) y recalcula con ese estado `toAssign` y `otherAccount`. Sobre ese estado se comprueba la confirmación: `unassigned` o `assigned_to_other_account` exigen `confirmChannelAssignment: true` (si no, `409 channel_assignment_not_confirmed { channels: [{ channelId, name, assignment, otherAccount }] }`), y es lo que se asigna y se audita. Así, si otra cuenta del proveedor tomó el canal entre la carga y el bloqueo, el que esperó lo mueve desde ella (`primary_moved_from` con esa cuenta) en vez de responder `new_primary`. Si el canal ya es principal de la cuenta, no se hace nada.
- `otherAccount` (en `channelsToAssign` y en los `details` del `409`) y `previousAccount` (en `channelsAssigned`) pasan el mismo filtro de alcance que `channel-notice.ts` (`shownAccount`): fuera del alcance de quien llama salen como `{ accountId: null, name: null, outOfScope: true }` (`HiddenAccountRef`). El dominio conserva el `merchantId` de la otra cuenta (`OtherAccount`) para poder filtrar.
- Escritura en orden de `channelId`: `UPDATE AccountChannel SET isPrimary = 0 WHERE channelId = @c AND isPrimary = 1 AND accountId <> @a`. Si la cuenta ya tiene la asociación, `UPDATE … SET isPrimary = 1`, conservando `assignedAt`, `assignedInBatchId` y `assignedByUserId` de su creación (README §3.2: "Batch cuyo procesamiento creó la asociación"). Si no, `INSERT` con `isPrimary = 1`, `assignedAt = now`, `assignedInBatchId = batchId` y `assignedByUserId = userId`. `UX_AccountChannel_primary` es la barrera: su violación (`P2002`) responde `409 channel_assignment_not_confirmed` con los canales releídos (D7).
- Una fila de auditoría `account_channel.assign` por canal (`entityType = 'AccountChannel'`, `entityId = '<accountId>:<channelId>'`, `detail = { batchId, assignment: 'new_primary' | 'primary_moved_from', previousAccountId }`). La respuesta lleva `channelsAssigned`.
- `SettlementBatch.channels` = nombres ordenados unidos por coma. Si no caben en `VARCHAR(100)`, se cortan en el último nombre completo con `…` (la lista completa está en los movimientos).
- *Alternativa descartada*: actualizar `assignedInBatchId` en cada movimiento de principal. Convierte la fila en un historial de reasignaciones, que el README dice que no es; la traza va en `AuditLog`.

### D15. Totales, marcas y amount payable
- `SettlementBatchTotal`, una fila por categoría aunque valga 0: `deposit` = E `Successful`; `declined` = E `Declined`; `chargeback`, `refund`, `rdr` = I por estado. `qty` = número de movimientos (los `CHB 2` cuentan). `amount` = suma de `amount` sin `excludeAmount`, **positivo** (P11, como el seed). El RDR lleva el importe de la transacción (P2). `feeAmount` = suma de `feeAmount`. `feeRate` = el porcentaje MDR si los fees MDR aplicados en el batch tienen un único porcentaje distinto, y `null` en las demás categorías (o si hay varios porcentajes).
- `SettlementBatchBrandTotal`: depósitos por `Transaction.cardBrand`, con `UNKNOWN` cuando es nulo (la PK no admite `NULL`). `brandTotals` se ordena por código en TypeScript, en el motor (vista previa) y en `PrismaSettlementReader`, no por la collation de SQL Server, para que las dos vistas den el mismo orden.
- `SettlementBatch`: `mdrAmt` = suma de las filas de desglose de tipo `MDR` (P15), `mdrRate` como `feeRate`, `otherFeeAmt`, `reserveHeldAmt`, `reserveReleasedAmt`, rangos copiados de la corrida vigente (son las fechas con las que se validó) y `amountPayable = deposit − chargeback − refund − rdr − Σ feeAmount − otherFeeAmt − reserveHeld + reserveReleased + Σ reserveEarlyReleased` (P2, P3). Todo con `Prisma.Decimal`, nunca con `number`.
- **`payableBreakdown`** (P3, decidido en el gate): `payable-breakdown.ts` construye nueve líneas `{ code, label, sign, amount }` en orden fijo: `deposit` (+), `chargeback` (−), `refund` (−), `rdr` (−), `transactional_fees` (−), `batch_fees` (−, `otherFeeAmt`, que puede ser negativo si los ajustes lo son), `reserve_held` (−), `reserve_released` (+) y `reserve_early_released` (+). `amount` siempre es la magnitud de la categoría con su signo propio; `sign` es la operación sobre el payable. `amountPayable` se **calcula** sumando las líneas, así que la igualdad se cumple por construcción y un test la comprueba igual. Las etiquetas (`label`) van en inglés (textos de UI). La misma función alimenta la vista previa, la respuesta y `PrismaSettlementReader` (desde las columnas del batch), así que #12 (summary y CSV) y #13 muestran las mismas líneas.
- *Alternativa descartada* para el desglose: guardarlo como JSON en `SettlementBatch`. Duplicaría cifras que ya están en columnas y podrían divergir; derivarlo al leer es barato y exacto.
- `reservesReleased` del oráculo (`qty`) = número de movimientos R; no tiene categoría propia en `SettlementBatchTotal` (la `CHECK` admite cinco) y lo deriva la vista (D19).
- *Alternativa descartada*: guardar los importes con signo (chargebacks negativos), como el ejemplo de README §4.3. El seed y `expected.json` los tienen positivos, y mezclar las dos convenciones en la misma tabla rompería los totales de los batches sembrados.

### D16. Escritura en bloque
Como en D5 de `validation-runs`: `SettlementBatch` con `create`, movimientos con `MERGE INTO SettlementTransaction … USING OPENJSON(@json) … OUTPUT src.ordinal, inserted.settlementTxnId`, que correlaciona sin depender del orden de `IDENTITY`, y después un `INSERT … SELECT … FROM OPENJSON` del desglose con su `settlementTxnId`. Los tipos van explícitos en el `WITH` (`DECIMAL(19,4)`, `DATETIME2(7)`, `BIGINT`), los importes viajan como texto y las fechas con `CAST(@p AS datetime2(7))` (lección de precisión de `validation-runs` D2). Totales y marcas con `createMany` (pocas filas). Fees por batch con un `create` por fee, en el orden del request: es lo que garantiza `batchFeeId` creciente en ese orden (D13). `log.info` con `loadMs`, `computeMs`, `writeMs` y `movements` (D6).
- *Alternativa descartada*: `createMany` troceado y `create` anidado. El primer bench de `validation-runs` lo midió en segundos para miles de filas.

### D17. Recorte de la Entrega 2 (decidido en el gate)
- **Fees transaccionales (D10)**: se planificaron como último grupo de tasks (11), recortable con punto de control el 2026-10-20 a mediodía. **Se entregaron**: el servicio (vista previa) y el repositorio (procesar) pasan siempre `options: { transactionalFees: true }`, y los tests de integración comparan `fees` y `amountPayable` con el oráculo. La opción queda solo como apoyo de tests (los builders de `test-support/` la ponen a `false`); con ella a `false`, `feeAmount = 0`, sin desglose, `mdrAmt = 0`, la línea `transactional_fees` a 0 y la advertencia `transactional_fees_not_computed`.
- **Política ante chargeback (D12)**: recortada a la Entrega 3, #62. Toda reserva queda retenida y sale `chargeback_reserve_policy_not_applied` si la cuenta es `release_on_chargeback`.
Los fees se enchufan en `computeSettlement` como paso opcional, así que recortar no cambia contratos: los campos existen y valen 0.
- *Alternativa descartada*: recortar quitando campos del contrato. Obligaría a #12 y #13 a cambiar cuando se añadan.

### D18. Errores y auditoría
- Errores en `settlement/application/errors.ts`, subclases de `DomainError`: `ImportNotValidatedError` (409), `BatchNoTakenError` (409), `ChannelAssignmentNotConfirmedError` (409), `BatchFeeInvalidError` (400). Se reutilizan `ValidationRunRequiredError`, `ValidationRunSupersededError` y `BlockingValidationIssueError` de `validation` (mismos códigos y mensajes) y `NotFoundError`. `assertCanProcess(status)` va en `imports/domain/import-state.ts`, como las demás guardas de la máquina de estados.
- Auditoría dentro de la transacción (D7 de `validation-runs`: sin la fila la acción no debe existir): `settlement.process` (`entityType = 'SettlementBatch'`, `entityId = batchId`, `detail = { importId, runId, batchNo, attemptNo, movements: { E, I, R }, skipped, warnings, batchFees: n, resolvedMissing, channelsAssigned, note }`, con `warnings` como los objetos `SettlementWarning` completos y `channelsAssigned` con la cuenta anterior sin filtrar y su `merchantId`, para aplicar el alcance al leer, D14) y `account_channel.assign` (D14). La nota del request (≤ 500) solo vive en la auditoría: `SettlementBatch` no tiene columna para ella. Tampoco tienen columna `skipped`, `warnings` ni `channelsAssigned`: el detalle de `settlement.process` es su única copia y `PrismaSettlementReader` los lee de ahí (D19), junto con `runId` y `resolvedMissing` de `validationSummary`. Guardarlos en el batch queda para #65.

### D19. Vista del intento y vista previa
- `SettlementView` (Zod en `packages/shared/src/settlement.ts`): la forma de la respuesta `201`. La construye `PrismaSettlementReader.view(batchId)` leyendo lo escrito (no desde el plan en memoria), para que #12 devuelva exactamente lo mismo en `GET /settlements/{id}`. El `payableBreakdown` se deriva de las columnas del batch con `payable-breakdown.ts` (D15). `skipped`, `warnings`, `channelsAssigned` y `validationSummary.runId`/`resolvedMissing` salen del detalle de la auditoría `settlement.process` (D18), no de columnas (#65); `previousAccount` pasa el filtro de alcance de D14 con el `scope` que recibe `view`.
  - Un batch sin auditoría `settlement.process` (el histórico del seed) se lee igual: `skipped` a ceros, `warnings: []`, `channelsAssigned: []` y `validationSummary: null` (`SettlementView.validationSummary` es nullable), sin consultar hallazgos (sin `runId`, el filtro desaparecería y agruparía todos los de la base).
  - `amountPayable` es el valor guardado en el batch. Si difiere de la suma del desglose recalculado, el lector lo registra con `log.warn` (logger de Fastify) y devuelve el guardado.
- `SettlementPreview`: las cifras comunes (`SettlementFigures`) sin lo que solo existe al escribir: no lleva `batchId`, `accountName`, `status`, `settledStatus`, `approvedBy`, `processedAt`, `settlementDate`, `channelsAssigned`, `validationSummary` ni `exports`. Añade `runId`, `batchNoAvailable`, `requiresChannelConfirmation` y `channelsToAssign`. La construye `computeSettlement` en memoria. Nunca responde `409 batch_no_taken` ni `409 channel_assignment_not_confirmed`: los informa con `batchNoAvailable = false` y `requiresChannelConfirmation = true`.
- `POST /imports/{id}/settlements/preview` con el mismo cuerpo que procesar (todo opcional salvo `runId`). Un fee por batch inválido responde `400 batch_fee_invalid` igual que al procesar, para que el formulario lo marque. Un número ocupado no es error: `batchNoAvailable = false`.
- *Alternativa descartada 1*: `GET /imports/{id}/settlement-preview` sin fees, con los fees por batch sumados en el frontend. El dinero se sumaría en `number` en el navegador o habría que llevar `decimal.js` a #13 para replicar `amountPayable`.
- *Alternativa descartada 2*: que #13 calcule el resumen con `GET /imports/{id}/rows`. Duplicaría la inclusión (D8), los fees y la reserva.

### D20. Tests
- **Unitarios del dominio, TDD con rotura deliberada** (CLAUDE.md): `inclusion.test.ts` (D8, D9, cada motivo de `skipped`, gateway `Pending` procesado), `movements.test.ts` (estado, importe con RDR, `eventDate` I en sus tres pasos, ronda 1/2/null, reserva a 4 decimales, `reservePolicySnapshot` sin aplicar), `fee-selection.test.ts` y `fee-amount.test.ts` (límites de vigencia con `NULL`, último instante del día, 4 decimales, empate en el quinto decimal, varios fees por movimiento), `batch-fees.test.ts` (cada `reason`), `totals.test.ts` (`CHB 2`, RDR, categorías vacías, payable), `payable-breakdown.test.ts` (nueve líneas en orden, signos, y la suma con signo igual a `amountPayable` con valores negativos en los fees por batch), `batch-number.test.ts`, y `compute-settlement.test.ts` con `batch-clean` y `legacy-provider` desde `buildWorld()` contra los `expected.json` corregidos en el grupo 0. Roturas previstas: redondear con `ROUND_HALF_EVEN` debe fallar el empate 1.23445 (mitad hacia arriba da 1.2345; mitad al par, 1.2344); combinar inclusiones con OR debe fallar "Fila excluida en un hallazgo e incluida en otro"; leer la fecha I sin comparar estados debe fallar "Ajuste sin fecha"; olvidar la línea `rdr` debe fallar la suma del desglose.
- **Servicio** sobre los dobles en memoria: orquestación, vista previa sin escrituras y errores de la precondición.
- **Integración** (SQL Server local o CI), con el helper `import-flow.ts` ampliado con `validateAndReview`:
  - `settlement-schema.int.test.ts`: la migración `0007` (dos movimientos de la misma clave en un batch admitidos; misma fila dos veces rechazada; movimientos sin fila admitidos; `sheetId` sin `rowNo` rechazado; `eventDate` nulo admitido) y la `0008` (`SettlementTransactionFee.eventDate` nulo admitido para el fee de un ajuste sin fecha).
  - `settlement-process.int.test.ts`: `batch-clean` de punta a punta contra `expected.json` (movimientos, totales, reservas, fees, payable con su desglose, `RAM-07` principal, auditoría, import `processed`, `settlementStatusId` Unsettled); `legacy-provider` (`CHB 2` con el fee de Chargeback de ProviderC-Alt, contra su nueva sección `summary`); intento 2 tras marcar `undone` el intento 1 en el test; `skipped`; fallo a mitad (error inyectado en la fase `totals` con el gancho `beforePhase`) sin rastro.
  - `settlement-concurrency.int.test.ts`, con compuertas (`beforeClaim('process')` o `beforePhase`, que avisa en `'number'` y `'channelLock'` antes de cada bloqueo y en cada fase de escritura; nunca `Promise.all` sin compuerta; se abren en un `finally` aunque el otro proceso lance): (1) mismo import: A espera, B confirma, A → `409 import_not_validated { status: processed }`; (2) mismo número en dos imports de la cuenta: A espera, B confirma con 118, A → `409 batch_no_taken`, y el import de A sigue `validated`; (3) bloqueo de rango: A se para en `beforePhase('batch')` con el número y los canales ya bloqueados y sin intento escrito; B (otro import, RAM-07), lanzado sin `await`, avisa en `beforePhase('number')`, justo antes de `lockNumber`, y no debe llegar a `beforePhase('channelLock')`, justo después, mientras A espera; cuando A confirma, responde `409 batch_no_taken` con el intento de A. Detecta quitar `WITH (UPDLOCK, HOLDLOCK)` solo de `lockNumber` (B pasa el número mientras A espera). Mirar si B termina no bastaba: pasado el número, B también espera en `lockChannels` aunque su canal sea otro, y sin la señal previa al número el "sigue pendiente" no distinguía a un B bloqueado de uno lento; (4) revisión invalidada: A espera, una corrida confirma, A → `409 import_not_validated { status: analyzed }`; (5) otra corrida revisada: A con `runId` viejo espera, corrida + review confirman, A → `409 validation_run_superseded`; (6) canal compartido: ProviderA-EUR se para en `beforePhase('batch')` con RAM-07 sin asociar; ProviderA-USD procesa a la vez un batch con RAM-07, espera y responde `primary_moved_from` con ProviderA-EUR, en la respuesta y en la auditoría. Decidir con el estado de la carga en lugar del releído lo hace fallar; quitar solo el hint de `lockChannels` no se detecta (USD ya espera a EUR por otro bloqueo, no identificado, y su relectura ve lo confirmado). Cada caso comprueba que no queda nada de A.
  - Última barrera, con violaciones reales: un `$extends` sobre `settlementBatch.create` escribe en la misma transacción, justo antes del intento del proceso, el intento con el que choca: activo del mismo número (`UX_SettlementBatch_active_accountBatchNo`, con y sin `batchNo`; el `409` nombra el número de la propia cuenta, nunca un intento de otra ni `0`) o `undone` con el mismo número e intento (`UNIQUE (accountId, batchNo, attemptNo)`). Otro `$extends` sobre `accountChannel.create` provoca `UX_AccountChannel_primary` → `409 channel_assignment_not_confirmed` sin escribir nada. Quitar la traducción de `UNIQUE (accountId, batchNo, attemptNo)` hace fallar su caso.
  - `settlement-missing.int.test.ts`: `resolveForBatch` (otro import, otra cuenta del proveedor, otro ciclo, corrida superada, fallo posterior) y `reopenForBatch`. Como `resolveForBatch` toca hallazgos de cualquier import del proveedor, el `afterAll` usa `removeImportsFrom` (pone a `NULL` `resolvedInBatchId` y `detectedInBatchId` que apuntan a los batches del fixture antes de borrarlos) y el `beforeAll` limpia lo que dejara una ejecución interrumpida.
  - `settlement-reader.int.test.ts`: un batch pagado del seed, sin auditoría `settlement.process`, cumple `SettlementView` con los valores neutros de D19, devuelve `amountPayable` tal cual está en la columna y llama a `log.warn` solo si no coincide con la suma del desglose.
  - En `settlement-process.int.test.ts`, además: el intento 2 comprueba sus movimientos y su `roundNo` (la E del intento deshecho del mismo import no cuenta como anterior; la de un batch pagado de otro import, sí) y una E que solo está en un intento `undone` de otro import deja el ajuste sin ronda (quitar `status <> 'undone'` de `previousE` lo hace fallar); el desglose de `batch-clean` se compara línea a línea con el oráculo; el objetivo de 3 s es un `it` propio con 5 s de margen y aviso en el log por encima de 3 s.
  - La advertencia `chargeback_reserve_policy_not_applied` con un import de ProviderB-Main (`release_on_chargeback`) y `reserve_cap_not_applied` con ProviderA-EUR, dentro de `settlement-process.int.test.ts`. La política es de #62.
  - `settlement-routes` y alcance: `viewer` `403` en procesar y vista previa; `404` idéntico con un import de ProviderC-Alt para un usuario solo del merchant 1; `400 validation_error` con `runId` ausente o importe `number`; `batch-number/next` (123 para ProviderA-USD; `reprocess`).
  - Lo que estos tests crean (batches, movimientos, asociaciones, auditoría) se limpia en orden de FK en `afterAll`, con `fixtureId`/`fixtureIds` (`helpers.ts`), que lanzan un error en lugar de borrar con un filtro indefinido. `RAM-07` se restaura a "not assigned yet" con `restoreAccountChannels` en un `finally` de `flow.close()` (aviso de review-diff del PR #23: guardar y restaurar las filas existentes).
- `pnpm test:api` no se ejecuta en CI; se documenta en el PR.

### D21. Contrato compartido, OpenAPI, Bruno y README
- `packages/shared/src/settlement.ts` y `fees.ts` con los esquemas de "Contrato para #13" y tests de forma (dinero como string, nunca `number`).
- `pnpm openapi:export` + `pnpm --filter @recon/frontend api:generate` (CI `openapi:check`); `app.test.ts` comprueba las cinco rutas nuevas en `/docs/json`.
- Bruno: `10-smoke` (`Process - viewer` 403, `Process - unknown import` 404 `as: viewer`, `Process - missing runId` 400, `Preview - viewer` 403, `Batch number next` 200, `Batch number next - out of scope` 404, `Account fees` 200, `Account fees - viewer out of scope` 404, `Fee types` 200) y `20-flows/settlements` (`batch-clean`: subir, parear, analizar, validar, revisar, `next` = 123, vista previa, procesar sin confirmar canales → `409 channel_assignment_not_confirmed`, fee libre no admitido → `400 batch_fee_invalid`, procesar → `201`, procesar otra vez → `409 import_not_validated`). El flujo deja el import procesado (insumo 3 del proposal).
- README, en un commit `docs(readme)` propio: §4.3 (cuerpo con `runId` y `source`, respuesta real, ejemplos de error en minúsculas y en inglés, importes positivos), §4.4 (vista previa, `?importId=` en `batch-number/next`), §3.2 (`SettlementTransaction`: clave por fila, `eventDate` nullable y su orden de fuentes en I; `SettlementBatchFee`: la excepción de `source = file`) y §3.3 (combinación de inclusiones; una fila con el gateway en `Pending` se procesa con el estado de la fila y solo se salta la fila cuyo estado es `Pending`).

## Contrato para #13

Base `/api/v1`, `Authorization: Bearer <access>` en todas las rutas. Error uniforme `{ code, message, details? }` con mensajes en inglés. Errores comunes: `401 unauthorized`, `400 validation_error` (`details` con los problemas de Zod), `404 not_found` (inexistente **o** fuera del alcance, mismo cuerpo: `"Import not found"` / `"Account not found"`). Dinero como string con 4 decimales y porcentajes con 6. Fechas ISO 8601 con milisegundos y `Z`. Las de negocio (`dateRanges`, `eventDate`, `settlementDate` como `YYYY-MM-DD`) son hora de Nueva York y la `Z` es solo transporte (deuda #48). Las de auditoría (`processedAt`) son UTC.

Pantalla Settlement Review: `GET /imports/{id}` (ya existe: `channels` para el aviso, `batchFees` para los prellenados), `GET /accounts/{accountId}/batch-number/next?importId=`, `GET /accounts/{accountId}/fees?transactional=false&asOf=`, `GET /fee-types`, `POST …/settlements/preview` en cada cambio del formulario (con debounce) y `POST …/settlements` al pulsar **Process**. Settlement Summary justo después: la respuesta `201`. Después, `GET /settlements/{id}` de #12, con la misma forma.

### Tipos

```ts
type Money = string            // "1234.5600", may be negative only in batch fees; at most 15 integer digits (DECIMAL(19,4))
type Rate = string             // "0.100000"
type UserRef = { userId: number; userName: string }
type AccountRef = { accountId: string; name: string }
type HiddenAccountRef = { accountId: null; name: null; outOfScope: true }   // the account's merchant is outside the caller's scope
type Category = 'deposit' | 'declined' | 'chargeback' | 'refund' | 'rdr'
type DateRange = { min: string; max: string }

type BatchFeeInput = {
  feeTypeId: number
  feeId: string | null          // preset fee of the account (uuid), or null for a free amount
  amount: Money                 // up to 4 decimals, not zero
  description?: string          // ≤ 200; required (1–200 after trim) when feeId is null and source is 'manual'
  source: 'file' | 'manual'     // 'file' = pre-filled from Other Fees (kept as sent by GET /imports/{id})
}

type SettlementRequest = {
  runId: number                 // the validation run the analyst reviewed; positive integer ≤ 2147483647
  batchNo?: number              // positive integer ≤ 2147483647; omitted → proposed number
  settlementDate?: string       // YYYY-MM-DD (business date), a valid calendar date (2026-02-30 → 400)
  note?: string                 // ≤ 500, audit only
  confirmChannelAssignment?: boolean
  batchFees?: BatchFeeInput[]   // at most 100; omitted → none
}

type Skipped = { ignored: number; unmatched: number; ambiguous: number; excluded: number;
                 unresolvedStatus: number; pending: number }

type SettlementWarning =
  | { code: 'undated_adjustment'; transactionId: string; sheetId: string; rowNo: number; feeSkipped: boolean }
  | { code: 'reserve_already_released'; transactionId: string; sheetId: string; rowNo: number }   // emitted from #62
  | { code: 'no_transactional_fees' | 'reserve_cap_not_applied' | 'transactional_fees_not_computed'
          | 'chargeback_reserve_policy_not_applied' }
  | { code: 'fee_variant_not_applied'; feeId: string }

type CategoryTotal = { category: Category; qty: number; amount: Money; feeAmount: Money; feeRate: Rate | null }
type BrandTotal = { cardBrand: string; qty: number; amount: Money }
type BatchFeeView = { batchFeeId: number | null; feeTypeId: number; code: string; title: string; feeId: string | null;
                      amount: Money; description: string | null; source: 'file' | 'manual'; enteredBy: UserRef | null }
type PayableLineCode = 'deposit' | 'chargeback' | 'refund' | 'rdr' | 'transactional_fees' | 'batch_fees'
  | 'reserve_held' | 'reserve_released' | 'reserve_early_released'
/** Always the nine lines, in this order; Σ (sign === '+' ? amount : -amount) === amountPayable */
type PayableLine = { code: PayableLineCode; label: string; sign: '+' | '-'; amount: Money }
type ChannelToAssign = { channelId: number; name: string; assignment: 'unassigned' | 'assigned_to_other_account';
                         otherAccount: AccountRef | HiddenAccountRef | null }

type SettlementFigures = {
  dateRanges: { APP: DateRange | null; DEC: DateRange | null; I: DateRange | null; R: DateRange | null }
  channels: string[]                         // channel names of the movements, sorted
  movements: { E: number; I: number; R: number }
  totals: CategoryTotal[]                    // always the five categories, in this order
  brandTotals: BrandTotal[]
  reservesReleasedQty: number
  mdrAmt: Money; mdrRate: Rate | null
  transactionalFeeAmt: Money
  batchFees: BatchFeeView[]                  // in the order of the request (preview and response alike)
  otherFeeAmt: Money
  reserveHeldAmt: Money; reserveReleasedAmt: Money; reserveEarlyReleasedAmt: Money
  amountPayable: Money
  payableBreakdown: PayableLine[]
  skipped: Skipped
  warnings: SettlementWarning[]
}

type SettlementPreview = SettlementFigures & {
  importId: string; accountId: string; runId: number
  batchNo: number; attemptNo: number; batchNoAvailable: boolean
  requiresChannelConfirmation: boolean; channelsToAssign: ChannelToAssign[]
}

type SettlementView = SettlementFigures & {
  batchId: string; importId: string; accountId: string; accountName: string
  batchNo: number; attemptNo: number
  status: 'processed' | 'paid' | 'undone'
  settledStatus: 'pending_payment' | 'settled' | 'undone'
  approvedBy: UserRef; processedAt: string; settlementDate: string | null
  channelsAssigned: { channelId: number; name: string; assignment: 'new_primary' | 'primary_moved_from';
                      previousAccount: AccountRef | HiddenAccountRef | null }[]
  // null when the attempt has no settlement.process audit (seeded history)
  validationSummary: { runId: number; persistent: number; resolved: number; blocking: number; resolvedMissing: number } | null
  exports: { summary: string; transactions: string; reserves: string }   // served by #12
}

type NextBatchNumber = { accountId: string; batchNo: number; attemptNo: number; reason: 'next' | 'reprocess' }

type AccountFee = { feeId: string; feeTypeId: number; code: string; title: string; isTransactional: boolean
                    fixedAmount: Money | null; percentage: Rate | null; startDate: string | null; endDate: string | null
                    description: string | null }
type FeeTypeView = { feeTypeId: number; code: string; title: string; isTransactional: boolean
                     appliesToStatusId: number | null; allowsFreeAmount: boolean }
```

`batchFees` conserva el orden del request, en la vista previa y en la respuesta (y en `GET /settlements/{id}` de #12, por `batchFeeId`). En una vista previa, `batchFees[].batchFeeId` y `enteredBy` son `null`, y `channelsAssigned` no existe. `channelsAssigned` y `channelsToAssign` vacíos cuando no hay nada que asociar. `validationSummary` cuenta los hallazgos de la corrida procesada después de resolver los faltantes; es `null` en un intento sin auditoría `settlement.process` (D19). Los nombres de canal van siempre visibles: todos los canales del batch son del proveedor de la cuenta (una fila de otro proveedor bloquea la corrida). La otra cuenta (`otherAccount`, `previousAccount`) pasa el filtro de alcance de `channel-notice.ts`: si su merchant está fuera del alcance de quien llama, sale como `HiddenAccountRef` (D14). Hoy no ocurre (las cuentas de un canal son del mismo proveedor), pero ninguna restricción de la base lo garantiza (#24).

Un cuerpo fuera de los límites del request (`runId` o `batchNo` > 2147483647, `amount` con más de 15 dígitos enteros, `settlementDate` que no es una fecha de calendario, más de 100 `batchFees`) responde `400 validation_error`, nunca un `500` al escribir.

### Rutas

| Método y ruta | Permiso | Parámetros | Cuerpo | Respuesta | Errores propios |
|---|---|---|---|---|---|
| `GET /accounts/{accountId}/batch-number/next` | autenticado | `accountId: uuid`; query `importId?: uuid` | — | `200 NextBatchNumber` | `404` también si `importId` no es de la cuenta |
| `GET /accounts/{accountId}/fees` | `fee.view` | `accountId: uuid`; query `transactional?: 'true' \| 'false'`, `asOf?: YYYY-MM-DD` | — | `200 AccountFee[]` (orden por `title`, `startDate`) | `403 forbidden` |
| `GET /fee-types` | autenticado | — | — | `200 FeeTypeView[]` (solo tipos con `isActive`, orden por `feeTypeId`) | — |
| `POST /imports/{importId}/settlements/preview` | `settlement.process` | `importId: uuid` | `SettlementRequest` (estricto) | `200 SettlementPreview` | `403 forbidden`; `409 import_not_validated { status }`; `409 validation_run_required {}`; `409 validation_run_superseded { runId, currentRunId }`; `409 blocking_validation_issue { runId, validationCodes, issueIds }`; `400 batch_fee_invalid { index, reason }` |
| `POST /imports/{importId}/settlements` | `settlement.process` | `importId: uuid` | `SettlementRequest` (estricto) | `201 SettlementView` (`status: 'processed'`, `settledStatus: 'pending_payment'`) | los de la vista previa + `409 batch_no_taken { batchNo, attemptNo, importId }`; `409 channel_assignment_not_confirmed { channels: ChannelToAssign[] }`; `409 settlement_busy` (sin `details`: el procesado fue víctima de un interbloqueo tres veces seguidas, D7; reintentar) |

`reason` de `batch_fee_invalid` ∈ `unknown_fee_type` | `transactional_fee_type` | `fee_not_in_account` | `fee_type_mismatch` | `fee_not_in_force` | `free_amount_not_allowed` | `description_required`.

Mensajes: `import_not_validated` → `"The import must be validated before processing (status: <status>)"`; `batch_no_taken` → `"Batch <batchNo> already has an active attempt for this account"`; `channel_assignment_not_confirmed` → `"The import includes channels not assigned to this account; confirm the assignment"`; `batch_fee_invalid` → `"Batch fee <index> is not valid: <reason>"`; `settlement_busy` → `"Another settlement is being processed for this provider; retry"`; los de `validation` sin cambios (`"A newer validation run exists; review it before continuing"`, `"Run the validations before reviewing"`, `"provider_mismatch: cancel the import and process it under the correct provider"`).

### Ejemplos para MSW

`GET /api/v1/accounts/efb2446e-…/batch-number/next?importId=7b0c…` → `200`
```json
{ "accountId": "efb2446e-1c0d-4c55-9a3e-2f7d1b9e0a11", "batchNo": 123, "attemptNo": 1, "reason": "next" }
```

`POST /api/v1/imports/7b0c…/settlements` con
```json
{ "runId": 12, "batchNo": 123, "settlementDate": "2026-10-24", "confirmChannelAssignment": true,
  "batchFees": [
    { "feeTypeId": 121, "feeId": null, "amount": "25.0000", "description": "Wire Fee", "source": "file" },
    { "feeTypeId": 117, "feeId": null, "amount": "15.0000", "description": "Settlement Fee", "source": "file" } ] }
```
→ `201`
```json
{ "batchId": "5c3f9e21-8a4b-4f0e-b1d2-6e7f8a9b0c1d", "importId": "7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44",
  "accountId": "efb2446e-1c0d-4c55-9a3e-2f7d1b9e0a11", "accountName": "ProviderA-USD",
  "batchNo": 123, "attemptNo": 1, "status": "processed", "settledStatus": "pending_payment",
  "approvedBy": { "userId": 2, "userName": "analyst" }, "processedAt": "2026-10-19T15:40:03.120Z",
  "settlementDate": "2026-10-24",
  "dateRanges": { "APP": { "min": "2026-09-28T00:04:11.000Z", "max": "2026-10-07T23:58:40.000Z" },
                  "DEC": { "min": "2026-09-28T00:10:02.000Z", "max": "2026-10-07T23:41:19.000Z" },
                  "I": { "min": "2026-09-28T03:00:00.000Z", "max": "2026-10-11T21:12:00.000Z" },
                  "R": { "min": "2026-09-27T05:00:00.000Z", "max": "2026-10-06T22:00:00.000Z" } },
  "channels": ["RAM-01", "RAM-02", "RAM-07"],
  "movements": { "E": 450, "I": 10, "R": 320 },
  "totals": [
    { "category": "deposit", "qty": 340, "amount": "39181.0700", "feeAmount": "4139.2500", "feeRate": "0.100000" },
    { "category": "declined", "qty": 110, "amount": "0.0000", "feeAmount": "27.5000", "feeRate": null },
    { "category": "chargeback", "qty": 2, "amount": "193.8600", "feeAmount": "90.0000", "feeRate": null },
    { "category": "refund", "qty": 6, "amount": "843.9900", "feeAmount": "30.0000", "feeRate": null },
    { "category": "rdr", "qty": 2, "amount": "210.0000", "feeAmount": "50.0000", "feeRate": null } ],
  "brandTotals": [ { "cardBrand": "VISA", "qty": 204, "amount": "23508.6400" } ],
  "reservesReleasedQty": 320, "mdrAmt": "3918.1070", "mdrRate": "0.100000", "transactionalFeeAmt": "4336.7500",
  "batchFees": [
    { "batchFeeId": 41, "feeTypeId": 121, "code": "Wire Fee", "title": "Wire Fee", "feeId": null, "amount": "25.0000",
      "description": "Wire Fee", "source": "file", "enteredBy": { "userId": 2, "userName": "analyst" } },
    { "batchFeeId": 42, "feeTypeId": 117, "code": "Settlement Fee", "title": "Settlement Fee", "feeId": null,
      "amount": "15.0000", "description": "Settlement Fee", "source": "file", "enteredBy": { "userId": 2, "userName": "analyst" } } ],
  "otherFeeAmt": "40.0000", "reserveHeldAmt": "3918.1070", "reserveReleasedAmt": "4314.5455",
  "reserveEarlyReleasedAmt": "0.0000", "amountPayable": "33952.9085",
  "payableBreakdown": [
    { "code": "deposit", "label": "Deposits", "sign": "+", "amount": "39181.0700" },
    { "code": "chargeback", "label": "Chargebacks", "sign": "-", "amount": "193.8600" },
    { "code": "refund", "label": "Refunds", "sign": "-", "amount": "843.9900" },
    { "code": "rdr", "label": "RDR", "sign": "-", "amount": "210.0000" },
    { "code": "transactional_fees", "label": "Transaction fees", "sign": "-", "amount": "4336.7500" },
    { "code": "batch_fees", "label": "Batch fees", "sign": "-", "amount": "40.0000" },
    { "code": "reserve_held", "label": "Reserve held", "sign": "-", "amount": "3918.1070" },
    { "code": "reserve_released", "label": "Reserve released", "sign": "+", "amount": "4314.5455" },
    { "code": "reserve_early_released", "label": "Reserve released on chargeback", "sign": "+", "amount": "0.0000" } ],
  "skipped": { "ignored": 3, "unmatched": 0, "ambiguous": 0, "excluded": 0, "unresolvedStatus": 0, "pending": 0 },
  "warnings": [],
  "channelsAssigned": [ { "channelId": 1007, "name": "RAM-07", "assignment": "new_primary", "previousAccount": null } ],
  "validationSummary": { "runId": 12, "persistent": 0, "resolved": 0, "blocking": 0, "resolvedMissing": 0 },
  "exports": { "summary": "/api/v1/settlements/5c3f9e21-…/export?type=summary",
               "transactions": "/api/v1/settlements/5c3f9e21-…/export?type=transactions",
               "reserves": "/api/v1/settlements/5c3f9e21-…/export?type=reserves" } }
```
Los ids de canal, las fechas exactas, las marcas, el importe RDR, las reservas, `mdrAmt` y el payable son ilustrativos (las cifras reales salen de los `expected.json` corregidos en el grupo 0), pero coherentes entre sí: la suma con signo de `payableBreakdown` es `amountPayable`.

`409` (número ocupado):
```json
{ "code": "batch_no_taken", "message": "Batch 123 already has an active attempt for this account",
  "details": { "batchNo": 123, "attemptNo": 1, "importId": "0a1b2c3d-…" } }
```
`409` (canales sin confirmar):
```json
{ "code": "channel_assignment_not_confirmed",
  "message": "The import includes channels not assigned to this account; confirm the assignment",
  "details": { "channels": [ { "channelId": 1007, "name": "RAM-07", "assignment": "unassigned", "otherAccount": null } ] } }
```
`400` (fee):
```json
{ "code": "batch_fee_invalid", "message": "Batch fee 1 is not valid: free_amount_not_allowed",
  "details": { "index": 1, "reason": "free_amount_not_allowed" } }
```
`409` (no validado): `{ "code": "import_not_validated", "message": "The import must be validated before processing (status: analyzed)", "details": { "status": "analyzed" } }`.

## Contrato para #12

Lo que este change deja escrito y #12 lee para `GET /settlements/{id}`, `/transactions`, `/export`, `GET /imports/{id}/settlements` y `GET /accounts/{id}/settlements`:
- **`GET /settlements/{id}`** devuelve `SettlementView`, construida con `PrismaSettlementReader.view(batchId)` de este change (D19). #12 añade la ruta, el alcance (`404` idéntico por la cuenta del batch) y nada más. `settledStatus` se deriva de `status`: `processed` → `pending_payment`, `paid` → `settled`, `undone` → `undone`.
- **Amount payable**: el summary del merchant y cualquier export que lo muestre usan `payableBreakdown` de la vista (las nueve líneas en su orden, con su `label` y su signo) y no recalculan la fórmula. La suma con signo es `amountPayable`.
- **Intento**: `SettlementBatch` (`batchNo`, `attemptNo`, `status`, `approvedByUserId`, `processedAt`, `settlementDate`, rangos, `mdrAmt`, `mdrRate`, `otherFeeAmt`, `reserveHeldAmt`, `reserveReleasedAmt`, `amountPayable`, `channels`); `Import.currentBatchId` es el intento vigente del import y los demás salen por `SettlementBatch.importId`.
- **Totales**: `SettlementBatchTotal`, cinco filas por intento, importes **positivos** (P11), `chargeback.amount` sin los `excludeAmount`. `SettlementBatchBrandTotal`: depósitos por marca. `reservesReleasedQty` = `COUNT(*)` de movimientos R. `reserveEarlyReleasedAmt` del intento = `SUM` de los movimientos I. Todas las sumas en SQL salen como texto (`CONVERT(VARCHAR(40), …)`) o con `Prisma.Decimal`.
- **Fees por batch**: `SettlementBatchFee` (`feeTypeId` ⋈ `FeeType.code/title`, `feeId`, `amount` con signo, `description`, `source`, `enteredByUserId`).
- **Movimientos** (`/transactions?type=E|I|R`): `SettlementTransaction` (`transactionId` ⋈ `Transaction.sourceTransactionId` y `gatewayId`, `cycle`, `statusId` ⋈ `TransactionStatus.code`, `roundNo`, `sheetId`/`rowNo`, `amount`, `excludeAmount`, `feeAmount`, `eventDate` **nullable**, `appliedReservePct`, `reserveDaysUsed`, `expectedReserveReleaseAt`, `reservePolicySnapshot` JSON, `reserveEarlyReleasedAmt`, `reserveHeldAmt`, `reserveReleasedAmt`) y su desglose `SettlementTransactionFee` (`feeId`, `feeTypeId`, `eventDate`, `amountUsd`, `configurationSnapshot` JSON). Puede haber **varios movimientos de la misma transacción y ciclo** en un intento (D3): la clave es `settlementTxnId`, y el orden estable es `(cycle, sheetId, rowNo, settlementTxnId)`.
- **CSV de transacciones (Back-Office)**: movimientos E con `statusId = Successful` (`SUC`) e I (`CHB` para `Chargeback`, también los `excludeAmount`; `REF`; `RDR`), sin `Declined`. `ID` = `Transaction.sourceTransactionId` como texto. Qué hacer con dos movimientos I de la misma transacción (Refund + Chargeback) lo decide #12, y la fuente los da por separado.
- **CSV de reservas**: movimientos R, `ID` = `sourceTransactionId` como texto, `Description = "Batch <batchNo>"`. Con #62 podrá haber R con `reserveReleasedAmt = 0` (P12); si se filtran, lo decide quien implemente #62 junto con #12.
- **Settled**: un movimiento está Settled si y solo si su intento tiene `status = 'paid'`. `settlementStatusId` se escribe 0 (Unsettled) al procesar y lo actualizará el pago (tramo 6); #12 no debe leerlo como fuente de Settled.
- **Auditoría**: `settlement.process` y `account_channel.assign` (D18) son las entradas que #12 puede mostrar como historia del intento. La de descargas es de #12.
- **Campos de la vista que salen de la auditoría**: `skipped`, `warnings` y `channelsAssigned` (y `validationSummary.runId`/`resolvedMissing`) no tienen columna; `PrismaSettlementReader.view` los reconstruye del detalle de la fila `settlement.process` del intento (D18, D19). #12 no los recalcula ni los lee de otra parte; pasarlos al batch es #65.
- **Intentos sin auditoría de procesado** (los batches del seed): `view` los devuelve con `skipped` a ceros, `warnings: []`, `channelsAssigned: []` y `validationSummary: null`, con las cifras de las columnas. #12 los muestra así, sin tratarlos como error.
- **Alcance**: `view(batchId, scope)` recibe el alcance de quien llama y oculta `previousAccount` fuera de él (`HiddenAccountRef`, D14); #12 le pasa el `scope` de la petición.
- **`amountPayable`**: la vista devuelve el valor guardado; si no coincide con la suma del desglose recalculado, el lector registra un `warn` y no corrige nada.

## Risks / Trade-offs

- [Los oráculos y el seed tenían tres reglas erróneas (RDR a 0, payable sin fees por batch, céntimos con floats)] → se corrigen antes de todo (grupo 0) con `Decimal` a 4 decimales, y la persona revisa el diff de los `expected.json` antes del grupo 1. Si algún `.xlsx` cambia al regenerar, se para: los archivos del proveedor no deben cambiar.
- [`mdrIncludedInDeposit` del oráculo se calcula sobre el total y `mdrAmt` es la suma por movimiento] → pueden diferir; aprobado (P15). El test no compara `mdrAmt` con el oráculo.
- [Zona horaria de las fechas del proveedor desconocida] → `ImportRow.txnDate` se usa como `eventDate` de un ajuste tal como viene, tratada como fecha de negocio (hora de Nueva York) sin conversión. Si el proveedor informa en otra zona, un evento cerca de medianoche puede caer en el día de al lado y elegir el fee de la vigencia vecina. Se documenta en README §3.2 y queda para cuando se conozca el formato de cada proveedor.
- [El bloqueo de `Import` dura carga y cálculo] → umbral de 3 s en el test y tiempos de carga, cálculo y escritura en el log. Si crece, se pasa a calcular fuera con versión optimista (D6, alternativa).
- [Dos imports distintos con la misma transacción procesándose a la vez] → la ronda se calcula sin ver al otro (D6). Riesgo aceptado como en `validation`. La doble liberación anticipada que esto permitiría es de #62, que debe resolverla (`UPDLOCK` sobre los movimientos E de las transacciones con chargeback).
- [Una fila con el gateway en `Pending` se procesa sin que la validación la marque] → P16, #63 (Entrega 3): la fila cuenta como movimiento normal y el analista no recibe aviso hasta entonces.
- [La colección Bruno deja datos procesados sin deshacer] → insumo 3, seed antes de cada ejecución hasta que exista el deshacer (tramo 6).
- [Cambiar la clave de `SettlementTransaction` toca una lectura de `validation`] → escenario y test de integración propios (D3).
- [Interbloqueos (1205) entre procesados simultáneos] → no es teórico: ocurre entre procesados que se cruzan (la tercera vuelta del review-diff lo señaló como HIGH). Fuentes conocidas o probables: la fase `missing` actualiza `ValidationIssue.detectedInBatchId` y `resolveForBatch` recorre los hallazgos de todas las corridas vigentes del proveedor (y lee `Import` ajenos), fuera del orden de D7; y el bloqueo de rango de `lockChannels` llega más allá de los canales del batch (un proceso espera ahí aunque su canal sea otro, probablemente por la clave siguiente del índice o por un recorrido de la tabla, que es pequeña). Mitigado: el reintento de D7 (3 intentos y después `409 settlement_busy`); la atomicidad se mantiene. La solución de fondo sigue en #67: el orden de bloqueos con `ValidationIssue`, que `resolveForBatch` no lea `Import` ajenos y el alcance de los bloqueos de rango (`lockNumber`, `lockChannels`). El recurso exacto de la espera no se ha visto: `recon_app` no tiene `VIEW SERVER STATE` para consultar `sys.dm_exec_requests`.
- [`decimal.js` trabaja con su precisión por defecto, 20 dígitos significativos] → el producto importe × porcentaje (4 + 6 = 10 decimales) es exacto mientras el importe tenga como mucho 10 dígitos enteros; por encima, el producto se redondea a 20 dígitos antes del redondeo a 4 decimales y puede diferir en el último. `DECIMAL(19,4)` admite 15 enteros. Con importes reales no se alcanza; sin arreglar, #67.

## Migration Plan

1. La persona revisa `backend/prisma/migrations/0007_settlement_process/migration.sql` y `0008_settlement_fee_event_date/migration.sql` (dos migraciones separadas) y las aplica con `! pnpm db:migrate`; después `! pnpm db:seed` (el seed ya trae las correcciones del grupo 0: RDR con importe, 4 decimales, fee de Chargeback de ProviderC-Alt).
2. `pnpm --filter @recon/backend prisma generate` (lo ejecuta la tarea, no la migración).
3. Rollback local: cada migración va en `BEGIN TRY / BEGIN TRAN`, así que un fallo no deja nada. Para volver atrás después de aplicarlas, migraciones inversas a mano en orden contrario: primero la de `0008` (`SettlementTransactionFee.eventDate NOT NULL`, si no hay nulos), después la de `0007` (recrear `UNIQUE (transactionId, cycle, batchId)`, que solo es posible si ningún batch tiene dos movimientos de la misma clave, y `SettlementTransaction.eventDate NOT NULL` si no hay nulos). Nunca `migrate reset` contra otra base que la local.
