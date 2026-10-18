# Design — validation-engine

> Motivación y alcance: `proposal.md`. Requisitos: `specs/validation/spec.md`. Las trece preguntas del proposal están decididas (proposal, "Decisiones de la revisión"); este diseño sigue la decisión de cada una y señala dónde vive para poder cambiarla con un test sin rehacer la estructura. La decisión de negocio 2 (`status_mismatch`) vive en D6.

## Context

- **Lo que deja #5** (`import-analyze`, design D4–D5, D11): `ImportRow` con `(sheetId, rowNo)`, `transactionIdRaw`, `transactionId BIGINT NULL`, `statusId` (fijo de la hoja o alias; en R el estado actual de la transacción), `cycle`, `matchResult`, `detailJson.excludeAmount = true` para `CHB 2`, `txnDate` siempre `null`. Las fechas, el canal, el proveedor y el merchant salen de `Transaction` (`TransactionRef` ya lleva `providerId` y `merchantId`). El orden de archivos y hojas existe en `ImportFile.uploadedAt` y en el orden del libro.
- **Esquema** (`0001_init`, `0002_constraints`): `ValidationRun` (rangos, `pendingInRangeCount`, `isSuperseded`), `ValidationResult` (`CK_ValidationResult_outcome` con `failed`), `ValidationIssue` (`CK_ValidationIssue_issueType` sin `status_mismatch`; `CK_ValidationIssue_blocking`: solo `provider_mismatch` bloquea), `ConflictOccurrence`, `SettlementBatch.status` ∈ processed | paid | undone, `SettlementTransaction` (`cycle`, `statusId`, `excludeAmount`, `reserveHeldAmt`, `reserveEarlyReleasedAmt`, `sheetId`, `rowNo`), `AccountChannel.isPrimary`.
- **Mundo sintético** (`backend/prisma/synthetic.ts`): `buildWorld()` da transacciones, `batches` (todos `paid`) y `sampleBatch` por cuenta; `seed.ts` convierte cada `BatchPlan` en filas de `SettlementTransaction` (E con el estado al liquidar `Successful`/`Declined` y reserva retenida, I con el estado actual, R con la reserva liberada) con lógica inline. Los fakes de #5 (`worldTransactions()`, `InMemoryTransactionLookup`, `FakeWorkbookReader` que lee los `.xlsx` reales) ya reproducen el análisis de las cinco muestras sin base.
- **Comprobación previa** (proposal, "Oráculos sin base de datos"): con la regla de rangos por estado del gateway se reproducen `batch-clean`, `batch-split`, `batch-issues` y lo que afirma `batch-blocked`; `legacy-provider` da `missing_previous_to_batch.I = 3` frente al 0 del oráculo, y `batch-issues` da 2 `status_mismatch`. Los oráculos se recalculan (D10).
- **Restricción de paralelo**: `web-import` modifica `packages/shared/src/vocabulary.ts` (añade `TRANSACTION_STATUSES`, que no existe en esta rama). Este change no lo toca.

## Goals / Non-Goals

**Goals:**
- Ocho validaciones como funciones puras con una única entrada inmutable, deterministas, sin Prisma, Fastify ni reloj.
- Puertos de lectura definidos y probados con dobles sobre el mundo sintético, para que #9 solo escriba adaptadores Prisma y el caso de uso.
- Un informe con la forma que #9 persistirá tal cual en `ValidationRun` / `ValidationResult` / `ValidationIssue` / `ConflictOccurrence`.
- 2 000 filas × 50 000 movimientos en < 2 s, medido antes de implementar la mayor parte de las reglas.

**Non-Goals:**
- Caso de uso `RunValidations`, transacción de escritura, supersesión de corridas, endpoints, Bruno (#9).
- Resolver faltantes al procesar o deshacer; combinar las inclusiones de una fila presente en varios hallazgos (procesamiento).
- Ocultar por alcance del usuario: el motor no conoce al usuario; garantiza que no emite datos de otro proveedor, y #9 aplica el alcance al leer como en #5.

## Decisions

### D1. Estructura del módulo
```
backend/src/modules/validation/
  domain/
    types.ts              entrada (ValidationInput y piezas), informe (ValidationReport, ValidationResult, Issue, Occurrence)
    status-catalog.ts     createStatusCatalog(statuses): naturalCycle(statusId), codeOf(statusId), idOf(code)
    outcome.ts            deriveOutcome(issues, applicable) y overallBlocked(results)
    partition.ts          partitionRows(rows, providerId): filas propias / ajenas (provider_mismatch) / no asociadas
    ranges.ts             computeRanges(rows, providerId, statuses) → { ranges: CycleRanges, undatedAdjustmentCount }
    conflict-key.ts       clave (transactionId, cycle), clave de comparación (statusId, excludeAmount), excepción CHB 2, orden de apariciones
    provider-mismatch.ts  non-recorded-adjustment.ts  in-batch.ts  across-batches.ts  missing.ts
    missing.ts            además exporta pendingInRangeCount(ctx)
    run-validations.ts    orquestador: orden fijo, ranura not_implemented, índices compartidos (buildContext)
    *.test.ts             incluidos oracles.test.ts (las cinco muestras) y run-validations.bench.test.ts (D8)
  application/
    ports.ts              puertos de lectura para #9 (D3)
    __fakes__/in-memory.ts  implementaciones sobre buildWorld() (+ in-memory.test.ts)
  test-support/
    builders.ts           row(), movement(), candidate(), reserve(), input(), resultOf(), countBy(), expectedOf()…
    sample-input.ts       entrada de cada muestra (D9)
    bench-input.ts        generador del volumen de referencia (D8)
    settlement-movements.test.ts  caracterización de settlementMovementsOf (D9)
```
`domain/` solo importa de `@recon/shared` (vocabulario, D11) y de sí mismo. Los tests de dominio no importan Prisma; `test-support/` sí puede usar los fakes de `imports` (es código de test, mismo criterio que `buildTestApp`).

### D2. Entrada y dos pasos
```ts
interface ValidationInput {
  account: { accountId: string; providerId: number; primaryChannelIds: ReadonlySet<number>
             reserveDaysByChannel: ReadonlyMap<number, number> }   // Channel.rollingReserveDays de los canales del proveedor
  rows: readonly ValidationRow[]            // todas las filas del import, ya ordenadas o no (el motor ordena, D5)
  history: readonly HistoryMovement[]       // SettlementTransaction de intentos no deshechos de las cuentas del proveedor
  hasPreviousBatches: boolean               // ¿existe algún intento no deshecho del proveedor (excluido este import)?
  candidates: readonly CandidateTransaction[]
  reserveCandidates: readonly HeldReserve[]
  registeredMissing: ReadonlySet<string>    // `${cycle}:${transactionId}` de imports con batch processed/paid (pregunta 8)
  statuses: readonly { statusId: number; code: TransactionStatusCode; cycle: 'E' | 'I' }[]
}
interface ValidationRow {
  fileId: string; fileOrder: number; sheetId: string; sheetOrder: number; rowNo: number
  transactionIdRaw: string | null; cycle: Cycle; statusId: number | null; excludeAmount: boolean
  matchResult: MatchResult
  transaction: { transactionId: bigint; providerId: number; channelId: number; statusId: number
                 transactionDate: Date; lastStatusChangedAt: Date | null } | null
}
interface HistoryMovement {
  batchId: string; accountId: string; batchNo: number; attemptNo: number; batchStatus: 'processed' | 'paid'
  transactionId: bigint; cycle: Cycle; statusId: number; excludeAmount: boolean; sheetId: string | null; rowNo: number | null
  settlementTxnId: bigint                   // id de SettlementTransaction: último desempate estable del orden (L3)
}
interface CandidateTransaction { transactionId: bigint; sourceTransactionId: string; channelId: number; statusId: number
                                 transactionDate: Date; lastStatusChangedAt: Date | null }
interface HeldReserve { transactionId: bigint; sourceTransactionId: string; channelId: number
                        statusId: number            // estado actual: el `statusId` esperado de un faltante R
                        transactionDate: Date; batchId: string; reserveHeldAmt: string; reserveEarlyReleasedAmt: string }
```
- **Dos pasos**: las candidatas dependen de los rangos, y los rangos solo de las filas. `computeRanges(rows, providerId, statuses)` es pública y pura (necesita el proveedor para descartar las filas ajenas, que no amplían rangos); #9 la llama, carga candidatas y reservas con `fecha ≤ máximo` de cada rango y luego llama `runValidations(input)`, que vuelve a calcular los rangos (barato) para no confiar en que el llamador pase los mismos.
- `ValidationRow.transaction` **no** lleva `merchantId`, nombre de canal ni importe: lo que el motor no recibe no puede filtrarlo (D7). `providerId` basta para `provider_mismatch`.
- `history` cubre tres usos con una sola lista: comparación *across* (movimientos de las transacciones del import), "ya procesada en ese ciclo" (comprobación de seguridad sobre las candidatas, D3) y "reserva ya liberada" (movimientos R de las reservas). #9 la carga con una consulta por `transactionId IN (filas ∪ candidatas ∪ reservas)` filtrada por proveedor y `status <> 'undone'`; como las candidatas ya llegan sin las procesadas en su ciclo, su aportación a `history` es pequeña (otros ciclos o nada).
- Dinero (`reserveHeldAmt`, `reserveEarlyReleasedAmt`) como string decimal; el motor solo necesita "> 0" y lo decide con una función sobre el texto (`/^0*(\.0*)?$/` = cero), sin `number` ni dependencia nueva.
- Invariantes violadas (fila `matched` sin `transaction`, `statusId` fuera del catálogo) son errores de programación: `Error` con mensaje, no `DomainError` (no hay HTTP en este change y no son culpa del usuario).
- *Alternativa descartada*: que el motor reciba puertos y cargue él mismo (async). Mezcla E/S en el dominio y complica la medición; los dos pasos mantienen el motor síncrono y puro.

### D3. Puertos para #9 (`application/ports.ts`)
| Puerto | Método | Qué devuelve | Nota para el adaptador de #9 |
|---|---|---|---|
| `ValidationRowSource` | `rowsOf(importId)` | `ValidationRow[]` | `ImportRow` ⋈ `ImportSheet` ⋈ `ImportFile` ⋈ `Transaction`; `excludeAmount` desde `detailJson`; `fileOrder` por `uploadedAt`, `sheetOrder` por posición en el libro |
| `AccountScopeSource` | `accountOf(importId)` | `account` de D2 | canales con `AccountChannel.isPrimary = 1` para la cuenta (pregunta 9) y `Channel.rollingReserveDays` de todos los canales del proveedor (`reserveDaysByChannel`, vencimiento de las reservas) |
| `SettlementHistorySource` | `hasPreviousBatches(providerId, excludeImportId)`, `movements(providerId, transactionIds, excludeImportId)` | `boolean`, `HistoryMovement[]` | `SettlementBatch.status <> 'undone'`, cuentas del proveedor, nunca los intentos del import en curso (`excludeImportId`); `transactionId` es `BIGINT`, así que `IN` de parámetros no sufre la conversión `NVARCHAR` de #5 D4; trocear bajo 2 100 parámetros u `OPENJSON` |
| `MissingCandidateSource` | `candidates(account, ranges)`, `heldReserves(account, rMax)` | `CandidateTransaction[]`, `HeldReserve[]` | por rango: estado del bucket (APP `Successful`, DEC `Declined`, I estados de ciclo I) + `Pending` para el conteo, `fecha ≤ máximo` (en I, `lastStatusChangedAt <= máximo OR lastStatusChangedAt IS NULL`: un `WHERE lastStatusChangedAt <= @max` descartaría los NULL y `undatedCandidateCount` valdría siempre 0), **y solo las no procesadas en ese ciclo** en un intento vigente de cualquier cuenta del proveedor (`NOT EXISTS` sobre `SettlementTransaction` ⋈ `SettlementBatch.status <> 'undone'`); reservas sin movimiento R vigente con vencimiento (`transactionDate` + `rollingReserveDays` del canal) ≤ `rMax`, el máximo del rango R, también de vencimiento; usa los índices `(providerId, transactionDate)` y `(transactionId, cycle)` |
| `RegisteredMissingSource` | `registered(providerId)` | `Set<string>` | `ValidationIssue` `missing` con `resolutionStatus = persistent` de corridas no superadas (`isSuperseded = 0`) de imports que tienen un `SettlementBatch` `processed` o `paid` (no `undone`) (pregunta 8) |

- **Por qué la exclusión de procesadas va en el adaptador** (ajuste a de la revisión): sin ella, `candidates` devolvería cada transacción `Successful`/`Declined`/ajustada de los canales de la cuenta con fecha ≤ máximo, es decir, **todo el histórico** liquidado desde el origen, y crecería sin límite con cada batch (más filas leídas, más `transactionId` en la consulta de `history`, más memoria). Con el `NOT EXISTS` el volumen queda acotado por lo que de verdad falta. El motor **vuelve a comprobarlo** (`procesado[ciclo]` sobre `history`, D5/D6) por seguridad: si el adaptador devolviera una procesada, se descarta y no produce hallazgo; un test lo fija.
- **Faltantes registrados** (pregunta 8): solo los de imports procesados (`processed` o `paid`). Un import sin procesar no registra nada, así que una corrida repetida del mismo import, u otro import sin procesar, vuelven a mostrar sus faltantes. Cuando un batch procesado incluye la transacción, el faltante pasa a `resolved` (gancho de #9/#11; si ese batch se deshace, vuelve a `persistent`).

Los fakes (`application/__fakes__/in-memory.ts`) implementan los cinco sobre `buildWorld()` y sobre listas inyectables (para `undone`, `Pending`, liberación anticipada…), con la misma semántica que la tabla; así el contrato queda ejercitado antes de que exista el adaptador.

### D4. Informe y `outcome`
```ts
interface ValidationReport {
  results: ValidationResult[]                 // 8, orden fijo
  blocked: boolean
  ranges: Record<'APP' | 'DEC' | 'I' | 'R', { min: Date; max: Date } | null>
  pendingInRangeCount: number
  undatedAdjustmentCount: number
  undatedCandidateCount: number               // candidatas I sin lastStatusChangedAt: no se clasifican, se cuentan (L2)
}
interface ValidationResult { code: ValidationCode; outcome: ValidationOutcome; issueCount: number; issues: Issue[] }
interface Issue {
  issueType: IssueType; scope: IssueScope | null; blocking: boolean
  transactionIdRaw: string | null; transactionId: bigint | null; cycle: Cycle | null; statusId: number | null
  missingType?: 'previous_to_batch' | 'in_range'; missingRange?: 'APP' | 'DEC' | 'I' | 'R'; relevantDate?: Date
  gatewayStatusId?: number                    // solo non_recorded_adjustment / status_mismatch
  source?: { fileId: string; sheetId: string; rowNo: number }  // hallazgos de una fila: provider_mismatch, NRA, status_mismatch
  occurrences: Occurrence[]                   // vacío salvo duplicate / collision
}
type Occurrence =
  | { sourceType: 'current_import'; fileId: string; sheetId: string; rowNo: number
      statusId: number | null                 // null: estado de la fila no resuelto (colisiona igualmente; 0005)
      excludeAmount: boolean; defaultIncluded: boolean }
  | { sourceType: 'previous_batch'; batchId: string; batchNo: number; attemptNo: number; accountId: string; statusId: number; excludeAmount: boolean; defaultIncluded: boolean }
```
- `deriveOutcome(issues, applicable)`: `!applicable` → `not_applicable`; sin hallazgos → `passed`; alguno `blocking` → `blocked`; si no → `warning`. `blocked` global = algún resultado `blocked`. Un `not_applicable` con hallazgos es imposible por construcción (test).
- `runValidations` tiene una tabla de ocho ranuras `{ code, run?: (ctx) => { applicable, issues } }`; una ranura sin `run` devuelve `not_implemented`. Durante el apply cada grupo rellena sus ranuras; el test final exige que ninguna quede vacía. `defaultIncluded` del informe es también el `includeInSettlement` inicial que #9 guardará.
- Los hallazgos de faltantes llevan `missingRange` además del ciclo, porque §3.2 los describe por APP/DEC/I/R y los oráculos por E/I/R; `countBy(result, 'cycle' | 'range' | 'issueType')` sirve a ambos y al oráculo de `non_recorded_adjustment`, que se cuenta por `issueType` (`non_recorded_adjustment`, `status_mismatch`).
- `Issue` lleva además `gatewayStatusId?: number` solo en `non_recorded_adjustment` y `status_mismatch` (filas propias: es dato del mismo merchant), para que #10 muestre qué dice el gateway sin otra consulta; #9 lo guarda en `detailJson`. `statusId` es siempre el estado reportado por la fila. `provider_mismatch` nunca lo lleva (D7).
- **Qué va a `detailJson` al persistir** (L5): `ValidationIssue` no tiene columna para `missingRange`, `gatewayStatusId` ni `source`, así que #9 los guarda en `detailJson`. `missingRange` es imprescindible: APP y DEC comparten `cycle = E` y, sin él, al leer la corrida no se sabría a qué rango pertenece un faltante E. Tampoco tienen columna en `ValidationRun` los contadores informativos `undatedAdjustmentCount` y `undatedCandidateCount`; #9 decide dónde guardarlos (p. ej. `ValidationResult.detailJson` de las validaciones de faltantes) o si basta con devolverlos en la respuesta.
- `Issue.source` (archivo, hoja y fila) lo llevan los hallazgos de una sola fila (`provider_mismatch`, `non_recorded_adjustment`, `status_mismatch`), porque el spec pide la fila de origen y no tienen apariciones; #9 lo guarda en `detailJson`.

### D5. Índices, orden y determinismo
- Los faltantes de las dos validaciones se calculan una vez en `buildContext` (`ValidationContext.missingIssues`), sin estado a nivel de módulo (L4).
- Una pasada construye: filas propias agrupadas por clave `${transactionId}:${cycle}` (bigint → string decimal), historia agrupada por la misma clave, conjunto `procesado[cycle]` de `transactionId`, conjunto `presente[cycle]`. Todas las validaciones consultan esos `Map`/`Set`: O(filas + historia + candidatas), sin bucles anidados sobre la historia.
- Orden de apariciones actuales: `(fileOrder, sheetOrder, rowNo)` (pregunta 13); históricas: `(batchNo, attemptNo, rowNo)`. Orden de hallazgos dentro de cada resultado: por `transactionId` y ciclo (faltantes: rango, `relevantDate`, `transactionId`). El escenario "Determinismo" baraja las filas de entrada y compara informes.
- Fechas como `Date` UTC; los límites se comparan en milisegundos (inclusivos), no por día: `ValidationRun.dateMin/Max*` son `datetime2` y los oráculos salen igual (comprobado).

### D6. Reglas por validación (dónde vive cada pregunta abierta)
- **Partición** (`partition.ts`, pregunta 3): `matched` con `transaction.providerId ≠ account.providerId` → ajenas (solo `provider_mismatch`); `matched` del proveedor → propias (todo lo demás); resto ignoradas. `applicable` de 1, 2, 3 y 4 = hay alguna `matched`, de cualquier ciclo (pregunta 4).
- **`provider_mismatch`**: un hallazgo por fila ajena; `statusId` = el de la fila (lo reportado), nunca el del gateway (D7).
- **`non_recorded_adjustment`** (`non-recorded-adjustment.ts`, decisión de negocio 2, preguntas 4 y 12): dos reglas sobre filas propias, un hallazgo por fila, no bloqueante, fila incluida por defecto:
  - `issueType = non_recorded_adjustment`: `cycle = I` y `naturalCycle(transaction.statusId) = E` (incluye `Pending`).
  - `issueType = status_mismatch`: `cycle = E`, gateway ≠ `Pending`, y (fila `Declined` y gateway ∈ {`Successful`, `Chargeback`, `Refund`, `RDR`}) o (fila `Successful` y gateway `Declined`).
  - No son hallazgo: fila E `Successful` con gateway `Chargeback`/`Refund`/`RDR` (ronda 1) ni ninguna otra combinación. Las dos reglas son independientes de las colisiones: la fila DEC de una colisión `Successful`+`Declined` produce `collision` **y** `status_mismatch` (es lo que pasa en `batch-issues`, dos veces: la colisión *in batch* y la *across*).
- **Comparación de estados** (`conflict-key.ts`, pregunta 7): dos apariciones son "iguales" si coinciden `statusId` y `excludeAmount`; el par `(Chargeback, false)` ↔ `(Chargeback, true)` se declara **compatible** y no genera nada; cualquier otra diferencia es colisión. Una sola función `relation(a, b) → 'same' | 'different' | 'compatible'` usada por *in batch* y *across*.
- **In batch** (pregunta 5): por clave, se agrupan las apariciones por estado-comparable; cada subgrupo con > 1 → `duplicate` (primera incluida); las parejas compatibles (`CHB`/`CHB 2`) cuentan como un solo grupo para decidir si hay colisión (solas no son hallazgo); si quedan ≥ 2 grupos → `collision` que lista la primera aparición de **cada** subgrupo, `CHB 2` incluido junto a su `Chargeback` (todas incluidas; M2 del review-diff). Una aparición con estado no resuelto nunca entra en un subgrupo: es un grupo de colisión propio (decisión de negocio 3).
- **Across** (pregunta 6): para cada clave con historia: apariciones actuales con algún histórico `same` → `duplicate_across_batches` (actuales `defaultIncluded = false`, históricas `true` como evidencia); con algún histórico `different` → `status_collision_across_batches` (actual incluida, históricas incluidas como evidencia). Una aparición actual con estado no resuelto es `different` de cualquier histórico (decisión de negocio 3). `applicable` = `hasPreviousBatches`.
- **Rangos** (`ranges.ts`, preguntas 1 y 11): APP filas propias E con estado del gateway ∉ {`Declined`, `Pending`}; DEC filas propias E con gateway `Declined`; I filas propias I con `transaction.statusId = row.statusId` y `lastStatusChangedAt ≠ null` (si no, `undatedAdjustmentCount++`); R filas propias R por vencimiento de la reserva, `transactionDate + reserveDaysByChannel(canal de la fila)` (`reserveExpiry`).
- **Faltantes** (`missing.ts`, preguntas 8–10): por rango con valor, candidatas del rango con `channelId ∈ primaryChannelIds`, no `presente[ciclo]`, no `procesado[ciclo]`, no registradas; fecha < min → `previous_to_batch`, ≤ max → `in_range`, > max → descartada (también se descarta si el adaptador la devolvió por error). R: reservas con `reserveHeldAmt > 0`, `reserveEarlyReleasedAmt = 0` y sin `procesado[R]` ni `presente[R]`, comparadas por su vencimiento (`transactionDate` + `rollingReserveDays` de su canal, de `account.reserveDaysByChannel`) con el rango R, que también es de vencimiento: vencimiento dentro del rango → `in_range`, antes del mínimo → `previous_to_batch`, después del máximo → todavía no vencida, no cuenta. Comparar por creación (la regla anterior) daba faltantes falsos en cuentas con plazos mezclados (180 y 120 días): el máximo del rango lo marca una reserva de 120 días más reciente, y las de 180 creadas antes sin vencer caían dentro (H1 del review-diff del PR #41). `relevantDate` de un faltante R = su vencimiento. Un canal sin días en el mapa es un error de programación. `Pending` con fecha en APP ∪ DEC → `pendingInRangeCount`. `applicable` = algún rango con valor. `statusId` del hallazgo = estado esperado (APP `Successful`, DEC `Declined`, I el actual de la transacción, R el de la transacción).

### D7. Ningún dato ajeno en el informe (D2 + D6)
La garantía es estructural: (1) `ValidationRow.transaction` no trae merchant, canal ni importe; (2) las filas ajenas solo alimentan `provider_mismatch`, cuyo hallazgo copia datos de la fila y el `transactionId`; (3) historia, candidatas y reservas llegan ya filtradas por proveedor (mismo merchant). Test con una fila de Provider C (merchant 2) en una cuenta de Provider B: el hallazgo serializado no contiene `channelId`, fechas ni `statusId` del gateway. #9 añadirá el ocultamiento por alcance del usuario al leer, como #5 D11.

### D8. Rendimiento (puerta del grupo 1)
- `test-support/bench-input.ts` genera, con `mulberry32` de `synthetic.ts` (semilla fija), una cuenta con dos canales, 25 000 transacciones (≈70 % `Successful`, 30 % `Declined`, 2,5 % ajustadas, unas `Pending`), 50 000 movimientos históricos repartidos en 100 batches (E de casi todas, I de las ajustadas, R de las antiguas; un batch `undone`), y 2 000 filas (APP/DEC/CHB/RR) con duplicados, colisiones y apariciones ya liquidadas sembradas.
- `run-validations.bench.test.ts` (proyecto `unit`): calienta una vez y mide `runValidations` con `performance.now()`; imprime el tiempo. La puerta es **< 2 000 ms en local** (se ejecuta, se anota aquí y en el PR); la aserción del test es **< 4 000 ms** para que CI (máquinas compartidas y más lentas) no lo vuelva intermitente. Se mide primero con el orquestador y los índices de D5 y validaciones mínimas, y se vuelve a medir al final del change con las ocho reales (tarea final); el valor se anota aquí y en el PR.
- Si la primera medición local o la final no cumplen 2 s: se para y se decide (perfilar índices, evitar `bigint → string` en claves, etc.). La carga desde SQL Server es de #9 y tendrá su propia medición.
- **Medición** (local, Windows 11, Node 22, `vitest run --project unit bench`):
  - Grupo 1 (orquestador, índices de D5 y ocho ranuras vacías): 29–51 ms en cinco ejecuciones. Con los índices rotos a propósito (historia buscada con `filter` por fila en lugar del `Map`): 1 990 ms.
  - Final (tarea 7.2, las ocho validaciones reales): 84–97 ms en cinco ejecuciones aisladas; hasta ~210 ms cuando corre en paralelo con el resto de la suite.

### D9. Entrada de las muestras sin base (`test-support/sample-input.ts`)
- **Filas**: se reutiliza el camino real de #5: `ImportService` con los fakes de `imports` (`FakeWorkbookReader` sobre los `.xlsx` de `data/samples`, `InMemoryTransactionLookup` sobre `worldTransactions()`, repositorios en memoria), `createImport → addFiles → confirmMapping(propuesta) → analyze`; las filas guardadas se proyectan a `ValidationRow` con `fileOrder`/`sheetOrder` del repositorio en memoria y `transaction` desde `worldTransactions()` (mismos `transactionId` = índice + 1).
- **Histórico**: se extrae de `seed.ts` a `synthetic.ts` una función pura `settlementMovementsOf(world, plan)` con la regla actual (E: estado al liquidar, reserva retenida `amount × pct`; I: estado actual, fecha del cambio; R: reserva liberada), devolviendo claves del mundo; `seed.ts` pasa a usarla sin cambiar lo que siembra. El test-support la usa para todas las cuentas del proveedor (`world.batches`).
- **Red de seguridad del refactor** (ajuste c de la revisión): **antes** de extraerla, un test unitario sin base (`settlement-movements.test.ts`) fija lo que produce hoy la lógica inline de `seed.ts` para todos los batches que siembra (`world.batches` y los `sampleBatch` procesados): número de movimientos por ciclo (E, I, R) y suma de `reserveHeldAmt`, como literales obtenidos ejecutando esa misma lógica sin tocarla. Tras el refactor el test debe dar exactamente lo mismo. Al final del change la persona ejecuta `! pnpm db:seed` una vez y se comparan esos valores con `COUNT(*)` por ciclo y `SUM(reserveHeldAmt)` de `SettlementTransaction`. **Resultado (2026-10-18):** 68 batches; E 21 151, I 360, R 1 920; `SUM(reserveHeldAmt)` 206 453.28 y `SUM(reserveReleasedAmt)` 25 792.84, idénticos a los literales del test.
- **Candidatas y reservas**: fakes de D3 sobre `worldTransactions()` con los canales primarios de `CHANNELS.account`.
- Lo que el mundo no tiene (proposal, último párrafo de "Oráculos") se construye con *builders* pequeños en los tests (`row()`, `movement()`, `candidate()`), no en el mundo, para no alterar seed ni muestras.

### D10. Oráculos recalculados (pregunta 2 y decisión de negocio 2)
- `data/samples/plan.ts` cambia solo el bloque `expected` de cada muestra:
  - `validations.non_recorded_adjustment` pasa de número a objeto por `issueType`: `{ non_recorded_adjustment, status_mismatch }` (igual que `missing_*` va por ciclo). `batch-clean`/`batch-split` y `legacy-provider` 0/0; `batch-issues` 1/2, con `affectedIds.status_mismatch` (las dos filas DEC `Successful` en el gateway) y `defaults.status_mismatch = "included"`.
  - `legacy-provider`: `missing_previous_to_batch.I` y `affectedIds.missing_previous_to_batch_I` con los refunds/RDR de la ventana que no van en la hoja `CB` y cuyo cambio de estado es anterior al mínimo del rango I (3).
  - `batch-blocked` no cambia: su oráculo solo afirma `provider_mismatch` y `blocked`.
- Se regeneran **solo** los `expected.json`: `pnpm samples:plan` y un script desechable que escribe cada `expected.json` desde `plan.json` con la misma forma que `main()` de `build-samples.py` (sin ejecutarlo), formateado con Biome. Con el `plan.ts` sin cambios ese camino reproduce byte a byte los cinco `expected.json` versionados (comprobado); `git status data/samples` no muestra ningún `.xlsx`.
- Commit `fix(samples)` propio, solo tras la confirmación de la persona (tarea 0.1).

### D11. Vocabulario compartido
`packages/shared/src/validation.ts`: `ValidationOutcome = z.enum(['passed','warning','blocked','not_applicable','not_implemented'])`, `IssueType` (`provider_mismatch`, `non_recorded_adjustment`, `status_mismatch`, `duplicate`, `collision`, `missing`), `IssueScope`, `OccurrenceSource`, `MissingType`, `MissingRange`, y `isApproved(outcome)` (`passed | warning`; documentado: `not_applicable` y `not_implemented` nunca). `ValidationCode` y `BLOCKING_VALIDATIONS` se siguen importando de `vocabulary.ts` sin modificarlo. `index.ts` gana `export * from './validation.js'`. #9 construirá los esquemas de respuesta encima.

### D12. Migraciones `0004_validation_outcome` y `0005_conflict_occurrence_unresolved_status`
El plan era generar la carpeta con `prisma migrate dev --create-only --name validation_outcome` (saldría vacía: los `CHECK` no están en `schema.prisma`), pero `recon_app` no puede crear la shadow database que necesita (`P3014`, correcto por mínimo privilegio); por decisión de la persona la carpeta se crea a mano con el mismo contenido. Se escribe:
```sql
-- Validation outcome vocabulary: failed is replaced by warning and blocked (validation-engine).
ALTER TABLE [dbo].[ValidationResult] DROP CONSTRAINT [CK_ValidationResult_outcome];
ALTER TABLE [dbo].[ValidationResult] ADD CONSTRAINT [CK_ValidationResult_outcome]
    CHECK ([outcome] IN ('passed', 'warning', 'blocked', 'not_applicable', 'not_implemented'));

-- status_mismatch: E row whose reported status contradicts the gateway (Declined vs Successful).
ALTER TABLE [dbo].[ValidationIssue] DROP CONSTRAINT [CK_ValidationIssue_issueType];
ALTER TABLE [dbo].[ValidationIssue] ADD CONSTRAINT [CK_ValidationIssue_issueType]
    CHECK ([issueType] IN ('provider_mismatch', 'non_recorded_adjustment', 'status_mismatch', 'duplicate', 'collision', 'missing'));
```
y los comentarios `/// passed | warning | blocked | not_applicable | not_implemented` (`ValidationResult.outcome`) y `/// provider_mismatch | non_recorded_adjustment | status_mismatch | duplicate | collision | missing` (`ValidationIssue.issueType`) en `schema.prisma` (sin cambio de modelo). `CK_ValidationIssue_blocking` no cambia: ya obliga a `blocking = 0` en todo lo que no es `provider_mismatch`. La aplica la persona con `! pnpm db:migrate`; un test de integración (`validation-outcome.int.test.ts`) inserta una corrida mínima y comprueba que `warning` y `blocked` se aceptan y `failed` se rechaza, que un `ValidationIssue` `status_mismatch` con `blocking = 0` se acepta y con `blocking = 1` se rechaza, y limpia lo creado.

**`0005_conflict_occurrence_unresolved_status`** (decisión del apply, 2026-10-18): una aparición con estado no resuelto colisiona (spec "Estado no resuelto en duplicados y colisiones"), así que `ConflictOccurrence.statusId` pasa a `INT NULL`. SQL Server no admite `ALTER COLUMN` sobre una columna con FK: se elimina `ConflictOccurrence_statusId_fkey`, se cambia la columna y se recrea con el mismo nombre, dentro de una transacción. Escrita a mano, revisada y aplicada por la persona; el test de integración `validation-outcome` comprueba una aparición con `statusId = NULL`.

### D13. Cobertura
`@vitest/coverage-v8` (misma versión mayor que `vitest`) como devDependency de `backend` y script `test:coverage` = `vitest run --project unit src/modules/validation --coverage --coverage.include=src/modules/validation/**`: solo los tests del módulo, porque con todo el proyecto `unit` la instrumentación lleva un test de `imports` (bomba de descompresión) por encima de su timeout. Objetivo ≥ 90 % de líneas y ramas en el módulo, comprobado a mano al cerrar y anotado en el PR; no es puerta de CI en este change. Stryker solo si sobra tiempo (dato en el PR).

### D14. README (commit `docs(readme)` propio)
§1.2 "Resultado de una validación" y párrafo "Ocho validaciones con detalle por caso" (con `status_mismatch` dentro de `non_recorded_adjustment`); §3.2 `ValidationResult.outcome` y `ValidationIssue.issueType` (añade `status_mismatch`); §3.3 "Resultados y persistencia" con la tabla de `outcome` y la sección de `non_recorded_adjustment` con las dos reglas de la decisión de negocio 2; §6 Ticket 2 tarea 5. Las demás decisiones de la revisión (preguntas 1, 3–11, 13) se escriben en §3.3 al cerrar (tarea 7.4). El conflicto con `web-import` en §6 se limita a bloques distintos (Ticket 2 frente a Ticket 3).

## Risks / Trade-offs

- [Las opciones por defecto de las preguntas abiertas podrían cambiar en la revisión] → Cada una vive en un único archivo (D6) con su test nombrado por la pregunta; cambiarla es cambiar un test y una función.
- [La entrada de las muestras depende del pipeline de `imports` y de sus fakes] → Es lo que se quiere (mismas filas que en producción); si #5 cambia sus fakes, el fallo aparece en los tests de oráculo, no en silencio.
- [Extraer `settlementMovementsOf` toca `seed.ts`] → Refactor sin cambio de comportamiento, fijado antes por un test de caracterización sin base (D9) y confirmado al final con `! pnpm db:seed` comparando conteos e importes.
- [La medición de 2 s es solo del motor; el criterio del README es de extremo a extremo] → Se dice en el PR; #9 mide la carga con SQL Server (la historia de 50 000 movimientos es una consulta por `BIGINT` indexado).
- [`bigint` como clave de `Map` vía `toString()`] → Coste medido en D8; alternativa: `Map<bigint, …>` directo (los `bigint` primitivos son claves válidas por valor) si la medición lo pide.
- [`history` y `candidates` podrían crecer con el tiempo] → Las candidatas llegan sin las procesadas en su ciclo (D3), así que no arrastran el histórico liquidado; `history` se acota por `transactionId IN (filas ∪ candidatas ∪ reservas)`, no por fechas: con 2 000 filas es del orden de decenas de miles.
- [`status_mismatch` repite la señal de una colisión `Successful`+`Declined`] → Es intencionado: la colisión dice que el archivo trae dos estados; `status_mismatch` dice cuál contradice al gateway. Se documenta en §3.3 y el oráculo de `batch-issues` lo fija.
- [Regenerar `expected.json` podría reescribir los `.xlsx`] → D10: no se ejecuta `build-samples.py`; solo se escriben los `expected.json`.
- [Conflictos con `web-import` en `pnpm-lock.yaml`, `README.md`, `packages/shared/src/index.ts`] → Cambios pequeños y localizados; se rebasa sobre `feature/entrega-2-MVP` antes del PR.

## Migration Plan

1. El agente escribe a mano `0004_validation_outcome` y `0005_conflict_occurrence_unresolved_status` (D12): `--create-only` no puede ejecutarse porque `recon_app` no tiene permiso para crear la shadow database.
2. La persona revisa el SQL, aplica cada una en local con `! pnpm db:migrate` y se corre el test de integración `validation-outcome` (cubre las dos).
3. Despliegue = merge del PR (CI aplica migraciones sobre su base). Rollback, en orden inverso: `0005` se deshace devolviendo `ConflictOccurrence.statusId` a `INT NOT NULL` (eliminando y recreando la FK; falla de forma visible si ya hay apariciones con `statusId` NULL, que habría que decidir antes); `0004` con una migración que restaura los dos `CHECK` (`outcome` con `failed`, `issueType` sin `status_mismatch`; no hay filas de `ValidationResult` ni `ValidationIssue` aún). El código del motor no se usa en ninguna ruta hasta #9.

## Open Questions

Ninguna: las trece del proposal se decidieron en la revisión del 2026-10-17 (proposal, "Decisiones de la revisión"). Solo queda la confirmación de los oráculos recalculados (D10) antes de su commit.
