# Design

## Context

- El motor (`backend/src/modules/validation/domain`) es puro y síncrono. Recibe un `ValidationInput` y devuelve un `ValidationReport` (archivado `validation-engine`, D2–D4). Los cinco puertos de lectura están declarados en `application/ports.ts` y tienen dobles sobre `buildWorld()`. Falta todo lo que toca la base y HTTP. El motivo está en proposal.md.
- El esquema ya tiene `ValidationRun` (con `isSuperseded`), `ValidationResult` (con `detailJson`), `ValidationIssue` (con `resolvedByUserId`, `resolvedAt`, `resolutionNote`, `detailJson`) y `ConflictOccurrence` (con `changedByUserId`, `changedAt`; `statusId` admite NULL desde `0005`). Las `CHECK` de vocabulario están en `0002` y `0004`.
- Patrón heredado de `import-analyze` (D1, D2, D13): toda escritura empieza con una `UPDATE` con guarda sobre la fila de `Import`, que la bloquea en exclusiva hasta el commit. El análisis usa `updatedAt` como versión optimista. El cancel usa `UPDATE … OUTPUT deleted.status`. Una auditoría que falla se registra y no deshace la acción.
- Alcance por merchant: `scopeOf(request.auth)` + `visibleAccount(scope)`. El `404` es idéntico para ajeno e inexistente (`NotFoundError`). Ids enteros en ruta con `IntId`.
- `ImportSheet` no guarda la posición de la hoja en el libro, y README §3.3 la usa para la "primera aparición". Hoy solo el doble del motor la conoce.

## Goals / Non-Goals

**Goals:**
- Persistir corridas reproducibles y leerlas en el orden del motor, sin pérdida (rango del faltante, estado del gateway, fila de origen).
- Garantizar una sola corrida vigente y una revisión que corresponda siempre a la corrida vigente, también con peticiones concurrentes.
- Dejar a #10 un contrato que pueda mockearse sin leer el código (sección "Contrato para #10").

**Non-Goals:**
- Combinar inclusiones al procesar, resolver faltantes por batch (solo se declara el puerto, D11) y agregados por ciclo (#13).
- Editar apariciones históricas (P2) y heredar acciones manuales entre corridas (P6, deuda de la Entrega 3). Las decisiones P1–P7 están en proposal.md.

## Decisions

### D1. Estructura del módulo
```
modules/validation/
  domain/            (existente) + occurrence previous_batch con sheetId/rowNo (D3)
  application/
    ports.ts         (existente) + StatusCatalogSource, ValidationSources, ValidationRunRepository, WritePhases,
                     MissingResolution (D11)
    load-validation-input.ts  carga en dos pasos del motor (D4, paso 2), compartida por servicio y tests
    validation-service.ts   run, getCurrentRun, listIssues, getIssue, setInclusion, resolveIssue, review
    run-record.ts    desglose de cada resultado y detailJson de cada hallazgo (D5), igual en Prisma y en el doble
    issue-order.ts   orden fijo de la lista (D8), del que el SQL es espejo
    reserve-rule.ts  regla de R (D9), para includable y para rechazar dentro de la transacción
    errors.ts        DomainError del módulo (D9)
    __fakes__/in-memory-runs.ts  doble del repositorio para los tests del servicio
  infrastructure/
    prisma-validation-sources.ts  los cinco puertos de lectura y el catálogo de estados (D2)
    prisma-validation-run-repository.ts  escrituras con guarda (D4–D7, D9) y, en PrismaIssueReader, las lecturas
                     de hallazgos (D8)
  http/validation-routes.ts       siete rutas (contrato para #10)
  validation-module.ts            composición (como imports-module.ts)
```
- *Alternativa descartada*: colgar las rutas y la persistencia del módulo `imports`, porque son "del import". Mezclaría dos agregados y dos specs en un servicio de ~800 líneas, y la validación ya es un módulo hexagonal con su dominio.

### D2. Adaptadores de los cinco puertos
- `ValidationRowSource.rowsOf`: `ImportRow ⋈ ImportSheet ⋈ ImportFile ⟕ Transaction` con un solo `findMany`. `excludeAmount` sale de `ImportRow.detailJson.excludeAmount`. `fileOrder` es el rango por `(uploadedAt, fileName, fileId)`, el mismo orden que el detalle del import. `sheetOrder` es `ImportSheet.sheetIndex` (D10); si vale `NULL` (imports anteriores a la migración), el orden es por `sheetName` con colación binaria y después `sheetId`. Una fila `matched` sin `Transaction` es un error de programación (`Error`), como fija el motor.
- `AccountScopeSource.accountOf`: cuenta del import, `AccountChannel.isPrimary = 1` de la cuenta y `Channel.rollingReserveDays` de **todos** los canales del proveedor, incluidos los inactivos.
- `SettlementHistorySource`: `SettlementTransaction ⋈ SettlementBatch` con `status <> 'undone'`, de las cuentas del proveedor y `importId <> @excludeImportId`. `transactionId IN (…)` va troceado a 2 000 parámetros (es `BIGINT`, así que no sufre la conversión `NVARCHAR` de #5 D4). Devuelve `settlementTxnId`, `sheetId` y `rowNo`.
- `MissingCandidateSource.candidates`: una consulta por rango con rango no nulo, con `NOT EXISTS` sobre movimientos del mismo ciclo en intentos vigentes del proveedor. Para I, `(lastStatusChangedAt <= @max OR lastStatusChangedAt IS NULL)`. Para `Pending`, la fecha de creación dentro de APP o DEC.
- `StatusCatalogSource.statuses`: `TransactionStatus` con su ciclo natural, el catálogo contra el que el motor resuelve los códigos. Los seis puertos forman `ValidationSources`, que recibe `loadValidationInput`.
- `MissingCandidateSource.heldReserves`: movimientos E vigentes con `reserveHeldAmt > 0`, de transacciones de los **canales primarios de la cuenta** (como las candidatas, el doble y el motor), sin movimiento R vigente, con el predicado sargable `t.transactionDate <= DATEADD(day, -c.rollingReserveDays, @rMax)` (equivale a `DATEADD(day, c.rollingReserveDays, t.transactionDate) <= @rMax`, pero usa el índice `(providerId, transactionDate)`). Usa el plazo **vigente** del canal y nunca `expectedReserveReleaseAt` (#44).
- **Precisión de `@rMax`**: va en `$queryRaw` como texto ISO con `CAST(@p AS datetime2(7))`. Sin el `CAST`, el adaptador envía el `Date` como texto; asignado a una columna `datetime2` se convierte exacto, pero `DATEADD(day, -c.rollingReserveDays, @p)` sobre un texto devuelve `datetime`, que redondea a 1/300 s y mueve el límite (comprobado en la revisión: sin el `CAST` entra la reserva de +1 ms). Todo escritor de `Import.updatedAt` (la versión optimista) guarda también precisión `datetime2`: escrituras del modelo de Prisma, o crudas con el mismo `CAST` (el `cancel`). El test de límite (spec "Límite exacto del vencimiento") usa milisegundos distintos de cero y una reserva 1 ms después del límite. Si alguien cambia el `CAST`, el test falla.
- `RegisteredMissingSource.registered`: `ValidationIssue` con `issueType = 'missing'` y `resolutionStatus = 'persistent'`, de corridas con `isSuperseded = 0` de imports del proveedor que tienen algún `SettlementBatch` `processed` o `paid`.
- *Alternativa descartada*: filtrar las reservas por `expectedReserveReleaseAt`. Es la deuda #44 y rompería la igualdad con el cálculo del motor.

### D3. Aparición histórica con hoja y fila (cambio pequeño del motor)
`Occurrence` `previous_batch` gana `sheetId: string | null` y `rowNo: number | null`, copiados del `HistoryMovement`, y `across-batches.ts` los rellena. Los oráculos no cambian, porque no comparan apariciones históricas por fila. Los tests del motor que construyen apariciones históricas se actualizan. Al persistir, `ConflictOccurrence.fileId` de una aparición histórica se resuelve con una consulta de las `ImportSheet` implicadas.
- *Alternativa descartada*: buscar la fila al leer por `(batchId, transactionId, cycle)`, que `UNIQUE (transactionId, cycle, batchId)` hace único. Funciona, pero añade una consulta a cada detalle, y el motor ya tiene el dato en la mano.

### D4. Corrida: cálculo fuera de la transacción, persistencia con guarda (concurrencia)
`ValidationService.run(scope, userId, importId)`:
1. `requireImport(scope, importId)` → `404`. Si no está en `analyzed` ni en `validated` → `409 import_not_analyzed` (P1: `uploaded`, `mapped`, `processed`, `cancelled`). Se guarda `expectedUpdatedAt = import.updatedAt`.
2. Carga en dos pasos (motor D2): `rowsOf` + `accountOf`, después `computeRanges`, y después `candidates`, `heldReserves(rMax)`, `registered`, `hasPreviousBatches` y `movements(ids de filas ∪ candidatas ∪ reservas)`. Luego `runValidations(input)`. Se registra con `log.info({ importId, runId, loadMs, engineMs, writeMs, issueCount, writePhases })`; `writePhases` lo devuelve `saveRun` con los milisegundos de cada fase de la escritura (`claimMs`, `supersedeMs`, `runMs`, `resultsMs`, `plainIssuesMs`, `occurrenceIssuesMs`, `auditMs`).
3. `repo.saveRun(importId, expectedUpdatedAt, userId, report, now)` en **una** transacción:
   - **Guarda**: dos `UPDATE [Import] SET status = 'analyzed', updatedAt = @now WHERE importId = @id AND status = @s AND updatedAt = @expected` con guarda, primero con `@s = 'validated'` y, si no toca ninguna fila, con `@s = 'analyzed'`. Cada una es atómica y solo casa con la versión leída, así que ningún otro escritor cabe entre ellas; la que toca la fila dice el estado anterior (si había revisión que invalidar) y bloquea la fila hasta el commit. Deja siempre `analyzed`. Con 0 filas en las dos, se relee: si el estado no es `analyzed` ni `validated` → `409 import_not_analyzed`; si lo es → `409 import_changed` (otro escritor confirmó entre la lectura y la escritura).
   - Si el estado anterior era `validated`: fila de `AuditLog` `import.review.invalidate` con motivo `rerun` (D16).
   - `UPDATE ValidationRun SET isSuperseded = 1 WHERE importId = @id AND isSuperseded = 0`.
   - Inserta la corrida, sus ocho resultados (en orden), los hallazgos y las apariciones (D5).
4. Responde la vista de la corrida (contrato).

**Una sola corrida vigente**: la guarda serializa a todos los escritores del import, la versión optimista impide persistir una corrida calculada sobre un import que cambió, y el índice único filtrado `UX_ValidationRun_current_import` (`0006`) es la última barrera. Si alguna vez saltara, el error de unicidad se traduce a `409 import_changed`.

**Review mientras corre una corrida**: el review (D7) toma la misma guarda y relee la corrida vigente dentro de su transacción. Si confirma antes, el review avanzó `updatedAt` y la corrida recibe `409 import_changed`: no invalida una revisión confirmada después de que empezara a calcularse, y el analista vuelve a lanzarla sabiendo que invalidará la revisión. Si confirma después, la corrida vigente ya no es el `runId` que se revisó y el review recibe `409 validation_run_superseded`. En ningún orden queda un import `validated` con otra corrida vigente.

**Cambio de inclusión mientras corre una corrida**: el `PATCH` toma la guarda y avanza `updatedAt`, así que la corrida en vuelo recibe `409 import_changed`. Es lo que se quiere: una corrida nunca borra, sin que el analista lo sepa, una decisión tomada mientras se calculaba (P6).

- *Alternativa descartada 1*: calcular dentro de la transacción. Mantiene el bloqueo de `Import` durante la carga y el motor (cientos de ms con volumen alto) y bloquea las lecturas del import sin RCSI (riesgo L7 de `import-analyze`).
- *Alternativa descartada 2*: "la última gana" sin versión optimista. Dos corridas simultáneas persistirían las dos en serie y la segunda podría basarse en datos anteriores a un cambio confirmado entre medias.
- *Alternativa descartada 3*: `sp_getapplock` por import. Funciona, pero añade un mecanismo nuevo cuando la guarda sobre `Import` ya serializa todas las escrituras del flujo.

### D5. Escritura de hallazgos y apariciones
- Hallazgos sin apariciones (`missing`, `provider_mismatch`, `non_recorded_adjustment`, `status_mismatch`): una sola sentencia `INSERT … SELECT … FROM OPENJSON(@json)`, con los tipos explícitos de cada columna en el `WITH` (sin conversión implícita `NVARCHAR → VARCHAR`, la lección de `import-analyze`).
- Hallazgos con apariciones (`duplicate`, `collision`): `MERGE … OUTPUT src.ordinal, inserted.issueId` desde `OPENJSON`, que correlaciona sin depender del orden de `IDENTITY`, y después un `INSERT … SELECT … FROM OPENJSON` de las apariciones con su `issueId`. Las dos, en la transacción de la corrida y detrás de su guarda.
- *Revisión tras el primer bench (2026-10-18)*: la primera versión (`createMany` troceado y un `create` anidado por hallazgo) tardaba 20,3 s en escribir los 23 482 hallazgos del caso extremo: 17,0 s en los sin apariciones (187 sentencias de 125 filas) y 0,6 s en los 110 con apariciones. Con la escritura en bloque, 20 301 hallazgos se escriben en 1,1 s (`validation-runs-write.int.test.ts`, umbral de 3 s). El `MERGE` dejó de ser condicional: es la forma de escribir los hallazgos con apariciones.
- `detailJson` del hallazgo: `{ missingRange?, gatewayStatusId?, source?: { fileId, sheetId, rowNo } }`, solo las claves presentes. `missingRange` es imprescindible, porque APP y DEC comparten `cycle = E`.
- `ConflictOccurrence`: `includeInSettlement = defaultIncluded`, `statusId` NULL cuando el estado no se resolvió, `batchId`, `fileId`, `sheetId` y `rowNo` según el origen. `excludeAmount` no tiene columna y se deriva al leer (D8).
- `ValidationResult.detailJson`: el desglose de conteos (`{ byRange: { APP, DEC, I, R } }` en los faltantes y `{ byIssueType }` en `non_recorded_adjustment`), para que #10 lo muestre sin agregar. Es el desglose de hallazgos, no el resumen de importes de #13.
- `detectedInBatchId` queda NULL: no hay batch al validar, y lo fijará #11 si lo necesita.
- *Alternativa descartada*: guardar el `ValidationReport` entero como JSON en la corrida. Es rápido, pero impide consultar por tipo, estado o transacción (`RegisteredMissingSource`, #11) y duplica la fuente de verdad.

### D6. Contadores informativos en columnas
`undatedAdjustmentCount` y `undatedCandidateCount` pasan a ser columnas de `ValidationRun` (`0006`), igual que `pendingInRangeCount`.
- *Alternativa descartada*: `ValidationResult.detailJson` de las validaciones de faltantes (la propuesta de #8). Son contadores de la corrida, no de una validación: habría que duplicarlos en dos resultados o elegir uno arbitrariamente, y #10 los lee junto a `pendingInRangeCount`.

### D7. Revisión (decisión de conjunto) y su registro
`POST /imports/{id}/review { runId }`, en una transacción: guarda sobre `Import` (`status = 'analyzed'`) → corrida vigente (si no hay → `409 validation_run_required`) → `runId` distinto del vigente → `409 validation_run_superseded { runId, currentRunId }` → algún resultado `blocked` → `409 blocking_validation_issue { runId, validationCodes, issueIds }` (README §4.3, en minúsculas) → `UPDATE Import SET status = 'validated'` → fila de `AuditLog` `import.review` (`entityType = 'Import'`, `entityId = importId`, `detail = { runId, issueCounts: { <validationCode>: n }, changedOccurrences: n }`) **dentro de la misma transacción**.
- **`runId` obligatorio** en el cuerpo, para que la decisión sea sobre la corrida que el analista vio. *Descartado*: revisar "la vigente", sin `runId`, porque aprobaría una corrida nueva que nadie miró.
- **Registro en `AuditLog`**, porque README §3.2 lista ahí la "aprobación de batch con hallazgos". *Descartado*: columnas `reviewedByUserId` y `reviewedAt` en `ValidationRun`, porque son un cambio de esquema para algo que el README ya ubica en `AuditLog`. La lectura de la revisión (`GET validations`) trae, sobre el índice `(entityType, entityId)`, las filas `import.review` e `import.review.invalidate` del import en orden (`createdAt`, `auditId`), y el servicio decide: la revisión válida de la corrida vigente es su última `import.review` si después no hay una invalidación de esa misma corrida (`validReview` en `validation-service.ts`); `lastInvalidatedReview` es la última invalidación de cualquier corrida. Al invalidar, el revisor se copia de la última `import.review` de la corrida, buscada por `runId` en el `detailJson` ya leído.
- **Auditoría dentro de la transacción** en las tres acciones de este change (review, inclusión, resolución). Se aparta del criterio de `import-analyze`, donde un fallo de auditoría no deshacía la acción, porque aquí `AuditLog` es el registro de la decisión y la fuente del historial que ve #10. Sin la fila, la acción no debe existir. El repositorio escribe la fila con el mismo `tx`, y `PrismaAuditLogger` no cambia.
- Cancelar sigue en `POST /imports/{id}/cancel`, que ahora añade `runId` (vigente o `null`) a su detalle de auditoría. *Descartado*: `review { decision: 'cancel' }`, porque duplicaría una ruta que ya existe y que la pantalla de import ya usa.

### D8. Lecturas y su forma
- **Corrida vigente**: `ValidationRun` con `isSuperseded = 0`, sus ocho resultados (en el orden fijo de `VALIDATION_CODES`, no por `resultId`) y la revisión (D7). Sin corrida → `run: null` con `200`. *Descartado*: `404` cuando no hay corrida, porque se confundiría con un import ajeno o inexistente.
- **Lista**: solo la corrida vigente, con filtros `type`, `scope`, `status`, `validationCode` y `cycle` y paginación como `GET rows` (`page`, `pageSize` ≤ 500, por defecto 50). Orden total, sin depender del orden de `IDENTITY`: índice de la validación (`CASE`), ciclo (E, I, R, nulos al final), rango (`JSON_VALUE` APP, DEC, I, R), `relevantDate`, `transactionIdRaw COLLATE Latin1_General_BIN2` e `issueId`. Los volúmenes por corrida son de cientos, así que el `JSON_VALUE` sin índice basta. Los conteos de apariciones salen de un `GROUP BY` sobre `ConflictOccurrence` de la página.
- **Detalle**: hallazgo + `run { runId, isCurrent }` + `importId` e `importStatus` + apariciones con ubicación (`ImportSheet`/`ImportFile`), batch (`SettlementBatch` ⋈ `Account`, con su estado **actual**), estado (`TransactionStatus`), `excludeAmount` derivado (fila actual: `ImportRow.detailJson`; histórica: `SettlementTransaction.excludeAmount` por `(batchId, transactionId, cycle)`), `changedBy` y `changedAt`, `editable` (D9) + `resolvable` + historial.
- **Historial** desde `AuditLog`: `(entityType = 'ConflictOccurrence' AND entityId IN ids)` o `(entityType = 'ValidationIssue' AND entityId = issueId)`, ordenado por `createdAt` y `auditId`. Así se cumple "usuario y fecha de **cada** cambio", no solo del último. *Descartado*: solo `changedBy`/`changedAt` de la columna, porque pierde los cambios intermedios (excluir y volver a incluir). *Descartado*: una tabla de historial propia, porque duplica lo que `AuditLog` ya guarda con el mismo índice.
- **Usuarios** como `UserRef` (`userId`, `userName`), igual que `createdBy` del import.
- **Nada de otro merchant** (spec): el hallazgo `provider_mismatch` se responde con lo que guarda (fila y `transactionId`). Las lecturas no hacen join a `Transaction` para enriquecer hallazgos, y por eso no pueden filtrar datos ajenos.

### D9. Acciones del analista: guardas y errores
- `setInclusion(occurrenceId, includeInSettlement)`: guarda sobre `Import` (`status IN ('analyzed', 'validated')`, avanza `updatedAt`; P4) → la aparición es de la corrida vigente (si no → `409 validation_run_superseded`) → `sourceType = 'current_import'` (si no → `409 occurrence_not_editable`, P2) → si el valor es el mismo → `200` sin escribir nada → regla de R al incluir (abajo) → `UPDATE` con `changedByUserId`/`changedAt` + `AuditLog` `validation.occurrence.set_inclusion` (`entityType = 'ConflictOccurrence'`, `detail = { issueId, runId, importId, from, to }`) → si el import estaba `validated`: `status = 'analyzed'` + `import.review.invalidate` con motivo `inclusion_change` (D16), todo en la misma transacción. En otro estado → `409 import_not_editable`. La guarda no cambia el estado hasta que la acción se acepta: un `409` posterior deshace la transacción entera y la revisión sigue vigente.
- **Regla de R** (P3, regla "Ciclo R sin estado" del archivado `validation-engine`): con `includeInSettlement = true` y `cycle = 'R'`, si otra aparición `current_import` del hallazgo ya está incluida → `409 occurrence_not_includable { reason: 'reserve_already_included' }`; si el hallazgo tiene alguna aparición `previous_batch` → `409 occurrence_not_includable { reason: 'reserve_already_released' }`. Excluir siempre se admite. La comprobación va dentro de la transacción, después de la guarda, así que dos `PATCH` simultáneos sobre el mismo hallazgo no pueden dejar dos incluidas. En E e I no hay regla propia: incluir a mano un duplicado, en el batch o entre batches, se admite y se audita.
- *Alternativa descartada* para R: dejar que #11 lo resuelva al procesar, como en E e I. Una reserva no se libera dos veces, así que la inclusión doble no tiene ninguna lectura de negocio válida y es mejor que la pantalla no la permita.
- `resolveIssue(issueId, note)`: sin guarda sobre `Import` (P5: cualquier estado). Una sola sentencia `UPDATE ValidationIssue SET resolutionStatus = 'resolved', resolvedByUserId, resolvedAt, resolutionNote WHERE issueId = @id AND resolutionStatus = 'persistent' AND issueType IN ('non_recorded_adjustment', 'status_mismatch') AND EXISTS (corrida vigente)`. Con 0 filas, se relee y se decide `422 issue_not_resolvable` / `409 issue_already_resolved` / `409 validation_run_superseded`. Después, `AuditLog` `validation.issue.resolve` en la misma transacción. Si una corrida nueva confirma justo después, el hallazgo resuelto queda en la corrida superada como historia, que es coherente.
- `editable` (aparición) = corrida vigente ∧ `current_import` ∧ import `analyzed` o `validated` ∧ el usuario tiene `settlement.process`. En `validated`, #10 avisa antes del cambio de que invalidará la revisión. `includable` (aparición) = `editable` ∧ no la bloquea la regla de R; con `includable = false` y `editable = true`, solo se puede excluir. `resolvable` (hallazgo) = corrida vigente ∧ tipo resoluble ∧ `persistent` ∧ el usuario tiene permiso. Con ellos #10 deshabilita controles sin duplicar las reglas.
- `occurrenceId` es `BIGINT`: la ruta lo valida con `/^\d{1,19}$/` y lo pasa como texto; el repositorio lo convierte a `bigint` (`BigInt(occurrenceId)`) en cada consulta. En la respuesta va como string. `issueId` y `runId` son `INT`: `IntId`.
- Errores del módulo en `validation/application/errors.ts`, como subclases de `DomainError` (D10 de #4). `ImportNotAnalyzedError` (409) vive en `imports/domain/errors.ts`, porque lo lanzan los guardas de la máquina de estados (`assertCanValidate`, `assertCanReview` en `import-state.ts`), y `validation/application/errors.ts` lo reexporta. El resto: `ImportChangedError` (409), `ValidationRunRequiredError` (409), `ValidationRunSupersededError` (409), `BlockingValidationIssueError` (409), `OccurrenceNotEditableError` (409), `OccurrenceNotIncludableError` (409), `IssueAlreadyResolvedError` (409), `IssueNotResolvableError` (422). Se reutilizan `ImportNotEditableError` y `NotFoundError`.
- *Alternativa descartada* para resolver: tomar la guarda sobre `Import` como en la inclusión. Bloquearía o haría avanzar `updatedAt` en imports `processed` o `cancelled`, donde P5 permite resolver, sin ganar nada: la sentencia condicionada ya es atómica.

### D10. `ImportSheet.sheetIndex`
Columna `INT NULL` con `CHECK (sheetIndex >= 0)`, rellenada en `createImport`/`addFiles` con la posición que da `describeWorkbook` (el orden en que ya se crean las hojas). En imports previos a `0006` vale `NULL` y se ordena por nombre (D2). Solo afecta al orden de imports creados antes de la migración, todos sintéticos y de pruebas.
- *Alternativa descartada 1*: releer el `.xlsx` al validar para saber el orden. Acopla la validación al almacén de archivos y relee el libro en cada corrida.
- *Alternativa descartada 2*: ordenar siempre por `sheetName`. No es la regla del README ("posición de la hoja en el libro") y cambia la primera aparición cuando dos hojas del mismo ciclo y estado traen la misma transacción.

### D11. Gancho de resolución de faltantes (para #11)
Se declara en `application/ports.ts`, sin implementación ni adaptador:
```ts
/** #11 calls it inside the transaction that processes or undoes a batch (README §3.2 "Faltantes", HU2 CA9). */
export interface MissingResolution {
  /** Persistent missing findings of the provider whose (transactionId, cycle) is in the batch → resolved with it. */
  resolveForBatch(tx: unknown, batchId: string, at: Date): Promise<number>
  /** Findings resolved by this batch → persistent again, resolvedInBatchId/resolvedAt cleared. */
  reopenForBatch(tx: unknown, batchId: string): Promise<number>
}
```
El tipo de `tx` lo fija #11 (cliente transaccional de Prisma). El comentario deja escrito que solo cuentan los hallazgos de corridas vigentes (`isSuperseded = 0`), como `RegisteredMissingSource`.
- *Alternativa descartada*: implementarlo ya con tests sobre batches sembrados. No hay todavía quién lo llame ni cómo se crea un batch (#11), y fijaría la firma de la transacción antes de tiempo.

### D12. Cambio de `PATCH row` (P7) y de `cancel`
- `PrismaImportRowRepository.resolve` añade, en su transacción ya guardada, `UPDATE ValidationRun SET isSuperseded = 1 OUTPUT inserted.runId WHERE importId = @id AND isSuperseded = 0`, y el servicio pone `supersededRunId` en el detalle de auditoría. Es una escritura del módulo `imports` sobre una tabla de `validation`. Se acepta porque tiene que ser atómica con la fila y es una sola sentencia; queda comentada como dependencia.
- `cancel` lee la corrida vigente (si la hay) y la añade al detalle de auditoría (`runId`). No la supera: la corrida de un import cancelado sigue siendo su evidencia vigente.
- *Alternativa descartada* para P7: que el review compruebe que la corrida es posterior a la última resolución de fila. Necesitaría una marca de tiempo de filas que no existe, y es más difícil de explicar en la UI que "no hay corrida vigente".

### D13. Contrato compartido, OpenAPI y README
- `packages/shared/src/validation.ts`: los esquemas de la sección siguiente, con tests de forma en `validation.test.ts`. Los enums reutilizan `ValidationCode`, `ValidationOutcome`, `IssueType`, `IssueScope`, `OccurrenceSource`, `MissingType`, `MissingRange`, `Cycle`, `ImportStatus` y `UserRef`.
- `pnpm openapi:export` + `pnpm --filter @recon/frontend api:generate` regeneran `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` (CI `openapi:check`). `app.test.ts` comprueba que las siete rutas están en `/docs/json`.
- README (commit `docs(readme)` propio): §3.2 `ValidationRun` (dos contadores y "una sola vigente"), `ImportSheet.sheetIndex`; §4.3, el ejemplo `BLOCKING_VALIDATION_ISSUE` → `blocking_validation_issue` (CLAUDE.md, códigos en minúsculas); §4.4, las filas de Validaciones con el cuerpo `{ runId }` de review y `validationCode`/`cycle`/`page` en la lista; §3.3, las decisiones P1–P7 de la revisión y la regla de inclusión de R (como máximo una aparición incluida por hallazgo y ninguna si la reserva ya se liberó en un batch anterior, por "Ciclo R sin estado").

### D14. Tests
- **Unitarios (sin base)**: el servicio sobre los dobles de puertos + `InMemoryRunRepository`, repartido en `validation-service.test.ts` (corrida y lectura), `validation-service.issues.test.ts` (lista y detalle), `validation-service.actions.test.ts` (inclusión con la regla de R y resolución) y `validation-service.review.test.ts` (decisión de conjunto), con cada guarda, cada código de error, P1–P7, mismo valor sin auditoría, historial y `editable`/`includable`/`resolvable`. `validation-routes.test.ts` comprueba las siete rutas con `safeParse` contra los esquemas compartidos, `401`/`403`/`400` y el `occurrenceId` de 20 dígitos. Los tests del motor se amplían con D3, `import-state.test.ts` con los tres guardas nuevos y `bench-input.test.ts` protege la calibración del bench. `shared/validation.test.ts` cubre las formas.
- **Integración** (SQL Server local o CI), repartida por tema y con el helper `import-flow.ts` (subir, parear con la propuesta, analizar y limpiar por subconsultas):
  - `validation-schema.int.test.ts`: la migración `0006`.
  - `validation-sources.int.test.ts`: los adaptadores (límites exactos) y las cinco muestras con la entrada de la base igual a la de memoria.
  - `validation-runs.int.test.ts`: lo que guarda una corrida, la concurrencia, la re-ejecución de un import `validated`, lista y detalle (D8) y los dos ciclos completos.
  - `validation-actions.int.test.ts`: inclusión, resolución, auditoría dentro de la transacción y regla de R.
  - `validation-review.int.test.ts`: la decisión de conjunto, el solape con una corrida, P7 y la cancelación.
  - `validation-samples.int.test.ts`: las cinco muestras por la API frente a su `expected.json`.
  - `validation-runs-write.int.test.ts`: la escritura en bloque (D5).
  - `validation-edges.int.test.ts`: la aparición histórica con hoja y fila, los contadores informativos de punta a punta y el alcance de las cinco rutas con un import de otro merchant.

  Lo que cubren:
  - **Ciclo completo** con `batch-issues`: subir, `PUT mapping` con la propuesta (`confirmProposal`), `analyze`, `POST validations` (`201`, conteos de `expected.json`), segunda corrida (la primera superada), `review` con el `runId` viejo (`409 validation_run_superseded`), lista, detalle, `PATCH` de inclusión (`AuditLog`), resolver el NRA, `review` con el `runId` vigente (`200 validated`; de los 23 hallazgos, 22 siguen `persistent` y el NRA queda `resolved`; `AuditLog import.review`), `PATCH` de inclusión sobre el import `validated` (`200 analyzed`, `lastInvalidatedReview.reason = inclusion_change`), nuevo `review`, `POST validations` sobre el import `validated` (`201 analyzed`, `reason = rerun`, `manualChangeCount = 0`) y `cancel`.
  - **Ciclo bloqueado** con `batch-blocked`: `analyze`, `validations` (`blocked = true`), `review` (`409 blocking_validation_issue`, import sigue `analyzed`), `cancel` (corrida conservada, `runId` en auditoría).
  - **Las cinco muestras** contra `expected.json`, leído del disco.
  - **Concurrencia**: dos `POST validations` con `Promise.all` (exactamente una vigente); `review` + `validations` solapados (uno de los dos resultados de la spec); un `PATCH` de inclusión durante una corrida. Los solapes se hacen deterministas con un repositorio envuelto en el test que pausa `saveRun` (o `review`) hasta que el otro lado llega o confirma.
  - **Límites del adaptador**: fixture de canal de 120 días con dos reservas (exacta y +1 ms), candidata I sin fecha y candidata ya procesada en otra cuenta, con ids 9xxx fuera del rango del seed, creados y limpiados por su `describe`.
  - **P7** con el fixture ambiguo de `import-analyze` (helper compartido).
  - **Regla de R** (D9): fixture con dos filas RR de la misma transacción (`reserve_already_included`, y `200` tras excluir la primera) y con una RR cuya reserva ya está liberada en un batch vigente (`reserve_already_released`); dos `PATCH` simultáneos que incluyen apariciones distintas del mismo hallazgo R dejan exactamente una incluida.
  - **Invalidación** (D16): por re-ejecución y por cambio de inclusión, con la fila `import.review.invalidate` y el revisor copiado; sin invalidación en `analyzed`; un `409` posterior a la guarda (regla de R sobre un import `validated`) deja la revisión vigente.
  - **Alcance**: con un import real de ProviderC-Alt (merchant 2), `viewer` recibe `404` idéntico al de un recurso inexistente en las tres lecturas y `403` en las dos escrituras (el permiso se comprueba antes que el alcance); un usuario de fixture con `settlement.process` y solo el merchant 1 recibe `404` idéntico en los dos `PATCH`.
  - **Aparición histórica con fila** y **contadores informativos**: fixtures 9xxx propios (batch 9401 cuyos movimientos tienen hoja y fila; proveedor aislado 9501).
  - **Migración `0006`**: dos corridas vigentes del mismo import → violación de `UX_ValidationRun_current_import`; `sheetIndex = -1` rechazado.
- **Rendimiento** (`validation-runs.bench.int.test.ts`, condicionado a `RECON_BENCH=1` desde el principio con `describe.skipIf`; no corre en CI y, sin la variable, no crea fixtures): fixture *set-based* insertado con `OPENJSON` (pocas sentencias, en vez de `createMany`, que costaría ~30 s) sobre un mundo aislado 9301 (gateway, proveedor, canales y cuenta), un import de 2 000 filas insertado igual y `POST validations` cronometrado, con `loadMs`/`engineMs`/`writeMs` y las fases de escritura en el log. La limpieza va en orden de FK (lo que cuelga de los imports, después movimientos, intentos, imports y transacciones), es idempotente y corre antes y después de cada escenario; un test propio comprueba con una consulta de solo lectura que no queda nada del rango 9xxx. Se ejecuta con la máquina tranquila (sin `pnpm dev`) y el dato local va al PR.
  - **Decisión de la persona tras el primer bench (2026-10-18).** El primer escenario usaba la entrada del benchmark del motor, cuyos rangos APP y DEC abarcan casi cuatro meses: 22 969 de sus 23 482 hallazgos eran faltantes `in_range` (24 798 de las 25 000 transacciones sin liquidar caían dentro de los rangos). No representa un batch real, y el `POST` tardaba 24,6 s (escritura 20,3 s). Se divide en dos escenarios:
    - **Volumen de referencia, con aserción de menos de 4 s** (umbral local aprobado: menos de 2 s): historial grande del proveedor (50 000 movimientos, con las reservas vencidas ya liberadas), pero rangos de pocos días calibrados con el perfil del doc 06 (ventana E de 10 días, como el mundo sintético), un import de 2 000 filas y un caso malo de como máximo 2 000 faltantes (`referenceBenchInput`: 1 023 hallazgos, 933 faltantes; APP 11 días, DEC 10, I 9, R 4). `bench-input.test.ts` protege la calibración.
    - **Caso extremo, sin aserción**: el escenario anterior (`benchInput`, ~23 500 hallazgos), solo registrado en el log para el PR.
  - **Resultado, con la máquina tranquila (2026-10-18), y decisión.**
    - Referencia: 2 603 ms (carga 2 231, motor 10, escritura 288: guarda 6, cierre de la anterior 4, corrida 11, resultados 59, hallazgos sin apariciones 87, con apariciones 110); 1 023 hallazgos. Pasa la aserción de menos de 4 s, no el objetivo local de 2 s.
    - Extremo: 5 060 ms (carga 3 922, motor 40, escritura 935, de ella 845 en hallazgos sin apariciones); 23 659 hallazgos.
    - Se acepta para la Entrega 2: la escritura queda por debajo de 300 ms (D5 cumplido) y el cuello de botella es la carga (86 % del total). Medirla por consulta y revisar índices y planes queda en un issue de la Entrega 3.
- TDD con rotura deliberada por grupo, por ejemplo: quitar el `CAST … datetime2` debe hacer fallar el límite +1 ms; quitar `updatedAt = @expected` de la guarda debe hacer fallar el test de dos corridas simultáneas; ordenar por `resultId` en vez de por `VALIDATION_CODES` debe fallar con resultados insertados en otro orden.

### D15. Colección Bruno
- `20-flows/validations` (como `20-flows/imports`, con login automático):
  - `batch-issues`: `0 Provider B accounts` (resuelve por nombre el `accountId` de ProviderB-Main, sin UUID literales; también lo usa `batch-blocked`), `1 Upload`, `2 Confirm mapping` (cuerpo construido en `pre-request` desde `GET detail`), `3 Analyze`, `4 Run validations` (`201`, guarda `runId1`), `5 Run again` (`201`, guarda `runId2`), `6 Review superseded run` (`409 validation_run_superseded`), `7 Issues duplicate in_batch` (`total = 1`, guarda `issueId` y la `occurrenceId` excluida), `8 Issue detail`, `9 Include occurrence` (`200`, `changedBy.userName = analyst`), `10 Include again` (`200`, sin historial nuevo), `11 Issues NRA` (guarda el id), `12 Resolve NRA` (`200`), `13 Resolve again` (`409 issue_already_resolved`), `14 Resolve duplicate` (`422 issue_not_resolvable`), `15 Review` (`200 validated`), `16 Include after review` (`200`, `importStatus = analyzed`), `16b Validations after include` (`GET validations`: la misma corrida, `run.review = null` y `lastInvalidatedReview.reason = inclusion_change`; los `seq` de 16b a 19 van de 17 a 20 para que se ejecuten en ese orden), `17 Review again` (`200 validated`), `18 Run after review` (`201`, `importStatus = analyzed`, `lastInvalidatedReview.reason = rerun`, `manualChangeCount = 0`), `19 Cancel` (`200`).
  - `batch-blocked`: `1–3` (subida, pareo y análisis), `4 Run validations` (`blocked = true`), `5 Review blocked` (`409 blocking_validation_issue`), `6 Cancel` (`200`).
- `10-smoke`: `Validations - viewer` (`403`), `Validations - unknown import` (`as: viewer`, `404`), `Validation issues - unknown import` (`404`), `Validation issue - malformed id` (`400`), `Validation issue - unknown` (`404`), `Occurrence - viewer` (`403`), `Resolve issue - viewer` (`403`), `Review - viewer` (`403`), `Review - missing runId` (`400 validation_error`).
- Los flujos terminan en `cancelled`, como los de imports, y no dejan imports abiertos.

### D16. Invalidación de la revisión y cambios manuales (P1, P4, P6)
- **Cuándo**: una corrida (D4) o un cambio de inclusión (D9) sobre un import `validated` lo devuelve a `analyzed` en su misma transacción. Resolver a mano un hallazgo (P5) no invalida, porque no cambia lo que se liquida. Resolver una fila (P7) solo ocurre en `analyzed`.
- **Registro**: fila de `AuditLog` `import.review.invalidate` (`entityType = 'Import'`, `entityId = importId`) con `detail = { runId, reviewedByUserId, reviewedAt, reason: 'rerun' | 'inclusion_change', newRunId?, occurrenceId? }`, en la misma transacción. El revisor se copia de la última `import.review` de esa corrida, que se lee dentro de la transacción, así que la lectura no tiene que reconstruir la pareja.
- **Lectura**: `GET validations` devuelve `lastInvalidatedReview`, la invalidación más reciente del import, de cualquier corrida, en el nivel superior de `ValidationRunView`. `run.review` es solo la revisión válida de la corrida vigente. #10 decide si muestra el aviso, por ejemplo comparando `invalidatedAt` con `run.review?.reviewedAt`.
  - *Descartado 1*: un `run.review` con `status: 'current' | 'invalidated'`. Al re-ejecutar, la revisión invalidada es de la corrida superada y desaparecería de la vigente, o habría que mezclar datos de dos corridas en `run`.
  - *Descartado 2*: un historial `reviews[]` completo. No tiene cota y la pantalla solo necesita la última; el historial completo sigue en `AuditLog`.
  - *Descartado 3*: columnas de invalidación en `ValidationRun`. Son un cambio de esquema para algo que, como la revisión (D7), el README ubica en `AuditLog`, y no cubren el cambio de inclusión, que no cambia de corrida.
- **`run.manualChangeCount`**: se calcula al leer: apariciones de la corrida con `includeInSettlement <> defaultIncluded` más hallazgos con `resolvedByUserId IS NOT NULL`. Volver una aparición a su valor por defecto la descuenta. Con él #10 avisa antes de re-ejecutar de que se perderán N cambios (P6).
  - *Descartado*: contar las filas de `AuditLog` de la corrida. Contaría dos veces excluir y volver a incluir, y no es lo que se pierde.
- **Deuda de la Entrega 3**: heredar las acciones manuales entre corridas (inclusiones por `(transactionId, cycle, ubicación)` y resoluciones por `(issueType, transactionId, cycle)`).

## Contrato para #10

Base `/api/v1`. Todas las rutas exigen `Authorization: Bearer <access>`. Formato de error uniforme: `{ code: string, message: string, details?: unknown }`. Fechas en ISO 8601 con milisegundos y `Z` (`2026-10-18T10:15:30.123Z`). Las de negocio (`ranges`, `relevantDate`) son hora de pared de America/New_York y la `Z` es solo transporte; las de auditoría (`runAt`, `reviewedAt`, `invalidatedAt`, `resolvedAt`, `changedAt`, `history[].at`) son instantes UTC (README §3.2 "Fechas y zona horaria", deuda en el issue #48). Los ids `BIGINT` y el dinero viajan como string. Errores comunes a todas las rutas: `401 unauthorized` (sin token o caducado); `400 validation_error` (parámetros, query o cuerpo inválidos; `details` con los problemas de Zod); `404 not_found` (import, hallazgo o aparición inexistente **o** fuera del alcance, con el mismo cuerpo: `{ code: "not_found", message: "Import not found" | "Validation issue not found" | "Conflict occurrence not found" }`).

### Tipos compartidos

```ts
type UserRef = { userId: number; userName: string }
type StatusRef = { statusId: number; code: 'Pending' | 'Successful' | 'Declined' | 'Chargeback' | 'Refund' | 'RDR'; name: string }
type DateRange = { min: string; max: string } // ISO datetimes, inclusive
type ValidationCode = 'provider_mismatch' | 'non_recorded_adjustment' | 'duplicate_in_batch' | 'status_collision_in_batch'
  | 'duplicate_across_batches' | 'status_collision_across_batches' | 'missing_previous_to_batch' | 'missing_in_range'
type ValidationOutcome = 'passed' | 'warning' | 'blocked' | 'not_applicable' | 'not_implemented'
type IssueType = 'provider_mismatch' | 'non_recorded_adjustment' | 'status_mismatch' | 'duplicate' | 'collision' | 'missing'
type IssueScope = 'in_batch' | 'across_batches' | 'previous_to_batch' | 'in_range'
type ImportStatus = 'uploaded' | 'mapped' | 'analyzed' | 'validated' | 'processed' | 'cancelled'

type ValidationResultView = {
  validationCode: ValidationCode
  outcome: ValidationOutcome
  issueCount: number
  blocking: boolean                 // outcome === 'blocked'
  approved: boolean                 // outcome is passed or warning
  /** missing_*: { APP, DEC, I, R }; non_recorded_adjustment: { non_recorded_adjustment, status_mismatch }; else null */
  breakdown: Record<string, number> | null
}

type ValidationRunView = {
  importId: string
  importStatus: ImportStatus
  run: null | {
    runId: number
    runAt: string
    runBy: UserRef
    blocked: boolean
    ranges: { APP: DateRange | null; DEC: DateRange | null; I: DateRange | null; R: DateRange | null }
    pendingInRangeCount: number
    undatedAdjustmentCount: number
    undatedCandidateCount: number
    results: ValidationResultView[] // always 8, fixed order
    /** occurrences with includeInSettlement !== defaultIncluded + findings resolved by hand; lost on re-run (P6) */
    manualChangeCount: number
    review: null | { reviewedBy: UserRef; reviewedAt: string }   // review of this run, while it is valid
  }
  /** Most recent invalidated review of the import, of any run; null if none (D16) */
  lastInvalidatedReview: null | {
    runId: number                   // the run that had been reviewed
    reviewedBy: UserRef
    reviewedAt: string
    invalidatedBy: UserRef
    invalidatedAt: string
    reason: 'rerun' | 'inclusion_change'
    newRunId: number | null         // rerun: the run that superseded it
    occurrenceId: string | null     // inclusion_change: the occurrence changed
  }
}

type RowLocation = { fileId: string; fileName: string; sheetId: string; sheetName: string; rowNo: number }

type ValidationIssueSummary = {
  issueId: number
  runId: number
  validationCode: ValidationCode
  issueType: IssueType
  scope: IssueScope | null
  blocking: boolean
  transactionIdRaw: string | null
  transactionId: string | null      // BIGINT as string
  cycle: 'E' | 'I' | 'R' | null
  missingType: 'previous_to_batch' | 'in_range' | null
  missingRange: 'APP' | 'DEC' | 'I' | 'R' | null
  relevantDate: string | null
  status: StatusRef | null          // reported (or expected, for missing)
  gatewayStatus: StatusRef | null   // only non_recorded_adjustment / status_mismatch
  source: RowLocation | null        // one-row findings: provider_mismatch, non_recorded_adjustment, status_mismatch
  resolutionStatus: 'persistent' | 'resolved'
  resolvedAt: string | null
  resolvedBy: UserRef | null
  resolutionNote: string | null
  occurrenceCount: number
  includedByDefaultCount: number
  includedCount: number
}

type OccurrenceView = {
  occurrenceId: string              // BIGINT as string
  sourceType: 'current_import' | 'previous_batch'
  location: RowLocation | null      // null for a historical movement without a row
  batch: null | { batchId: string; batchNo: number; attemptNo: number; status: 'processed' | 'paid' | 'undone';
                  accountId: string; accountName: string }
  status: StatusRef | null          // null: the row status could not be resolved
  excludeAmount: boolean            // CHB 2
  defaultIncluded: boolean
  includeInSettlement: boolean
  changedBy: UserRef | null         // last change
  changedAt: string | null
  editable: boolean                 // can be changed now (excluding is always possible when editable)
  includable: boolean               // editable and not blocked by the R rule (D9)
}

type IssueHistoryEntry = {
  at: string
  user: UserRef
  action: 'set_inclusion' | 'resolve'
  occurrenceId: string | null       // set_inclusion
  from: boolean | null              // set_inclusion
  to: boolean | null                // set_inclusion
  note: string | null               // resolve
}

type ValidationIssueDetail = ValidationIssueSummary & {
  importId: string
  importStatus: ImportStatus
  run: { runId: number; isCurrent: boolean }
  resolvable: boolean
  occurrences: OccurrenceView[]     // current_import first (first-occurrence order), then previous_batch (history order)
  history: IssueHistoryEntry[]      // oldest first
}
```

### Rutas

| Método y ruta | Permiso | Parámetros | Cuerpo | Respuesta | Errores propios |
|---|---|---|---|---|---|
| `POST /imports/{importId}/validations` | `settlement.process` | `importId: uuid` | — | `201 ValidationRunView` (`run` no nulo, `importStatus: 'analyzed'`; si el import estaba `validated`, `lastInvalidatedReview.reason: 'rerun'`) | `403 forbidden`; `409 import_not_analyzed { status }` (`uploaded`, `mapped`, `processed`, `cancelled`); `409 import_changed { status }` |
| `GET /imports/{importId}/validations` | autenticado | `importId: uuid` | — | `200 ValidationRunView` (`run: null` si no hay corrida vigente) | — |
| `GET /imports/{importId}/validation-issues` | autenticado | `importId: uuid`; query `type?: IssueType`, `scope?: IssueScope`, `status?: 'persistent' \| 'resolved'`, `validationCode?: ValidationCode`, `cycle?: 'E' \| 'I' \| 'R'`, `page = 1`, `pageSize = 50` (1–500) | — | `200 { items: ValidationIssueSummary[]; page; pageSize; total }` (vacío sin corrida vigente) | — |
| `GET /validation-issues/{issueId}` | autenticado | `issueId: IntId` | — | `200 ValidationIssueDetail` | — |
| `PATCH /validation-issues/{issueId}` | `settlement.process` | `issueId: IntId` | `{ resolutionStatus: 'resolved'; note: string }` (nota 1–500 tras `trim`, estricto) | `200 ValidationIssueDetail` (`resolvedBy`, `resolvedAt`, `resolutionNote` y una entrada `resolve` en `history`) | `403 forbidden`; `409 validation_run_superseded { runId, currentRunId }`; `409 issue_already_resolved { resolvedAt, resolvedBy }`; `422 issue_not_resolvable { issueType }` |
| `PATCH /conflict-occurrences/{occurrenceId}` | `settlement.process` | `occurrenceId: /^\d{1,19}$/` | `{ includeInSettlement: boolean }` (estricto) | `200 ValidationIssueDetail` del hallazgo de la aparición (con `changedBy`/`changedAt` y una entrada `set_inclusion` en `history` si cambió; `importStatus: 'analyzed'` si estaba `validated`, con la revisión invalidada) | `403 forbidden`; `409 import_not_editable { status }` (`processed`, `cancelled`, …); `409 validation_run_superseded { runId, currentRunId }`; `409 occurrence_not_editable { sourceType }`; `409 occurrence_not_includable { reason: 'reserve_already_included' \| 'reserve_already_released' }` |
| `POST /imports/{importId}/review` | `settlement.process` | `importId: uuid` | `{ runId: number }` (entero positivo, estricto) | `200 ValidationRunView` (`importStatus: 'validated'`, `run.review` no nulo) | `403 forbidden`; `409 import_not_analyzed { status }`; `409 validation_run_required {}`; `409 validation_run_superseded { runId, currentRunId }`; `409 blocking_validation_issue { runId, validationCodes: ['provider_mismatch'], issueIds: number[] }` |
| `POST /imports/{importId}/cancel` (existente) | `settlement.process` | `importId: uuid` | — | `200 ImportDetail` (`status: 'cancelled'`) | `409 import_not_cancellable { status }` |

Mensajes (en inglés, como toda la API): `blocking_validation_issue` → `"provider_mismatch: cancel the import and process it under the correct provider"`; `validation_run_superseded` → `"A newer validation run exists; review it before continuing"`; `validation_run_required` → `"Run the validations before reviewing"`; `import_changed` → `"The import changed while validating; retry"`; `issue_not_resolvable` → `"Only non_recorded_adjustment and status_mismatch findings are resolved by hand"`; `occurrence_not_includable` → `"A reserve is released only once: exclude the included occurrence first"` (`reserve_already_included`) o `"This reserve was already released in a previous batch"` (`reserve_already_released`).

### Ejemplos para MSW

`GET /api/v1/imports/7b0c…/validations` → `200`
```json
{ "importId": "7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44", "importStatus": "analyzed",
  "run": { "runId": 12, "runAt": "2026-10-18T10:15:30.123Z", "runBy": { "userId": 2, "userName": "analyst" },
    "blocked": false,
    "ranges": { "APP": { "min": "2026-09-28T00:00:00.000Z", "max": "2026-10-07T23:59:59.000Z" },
                "DEC": { "min": "2026-09-29T00:00:00.000Z", "max": "2026-10-07T23:59:59.000Z" },
                "I": { "min": "2026-09-28T00:00:00.000Z", "max": "2026-10-11T00:00:00.000Z" },
                "R": { "min": "2026-03-31T00:00:00.000Z", "max": "2026-04-09T00:00:00.000Z" } },
    "pendingInRangeCount": 0, "undatedAdjustmentCount": 1, "undatedCandidateCount": 0,
    "results": [
      { "validationCode": "provider_mismatch", "outcome": "passed", "issueCount": 0, "blocking": false, "approved": true, "breakdown": null },
      { "validationCode": "non_recorded_adjustment", "outcome": "warning", "issueCount": 3, "blocking": false, "approved": true,
        "breakdown": { "non_recorded_adjustment": 1, "status_mismatch": 2 } },
      { "validationCode": "duplicate_in_batch", "outcome": "warning", "issueCount": 1, "blocking": false, "approved": true, "breakdown": null },
      { "validationCode": "status_collision_in_batch", "outcome": "warning", "issueCount": 1, "blocking": false, "approved": true, "breakdown": null },
      { "validationCode": "duplicate_across_batches", "outcome": "warning", "issueCount": 1, "blocking": false, "approved": true, "breakdown": null },
      { "validationCode": "status_collision_across_batches", "outcome": "warning", "issueCount": 1, "blocking": false, "approved": true, "breakdown": null },
      { "validationCode": "missing_previous_to_batch", "outcome": "warning", "issueCount": 10, "blocking": false, "approved": true,
        "breakdown": { "APP": 0, "DEC": 10, "I": 0, "R": 0 } },
      { "validationCode": "missing_in_range", "outcome": "warning", "issueCount": 6, "blocking": false, "approved": true,
        "breakdown": { "APP": 3, "DEC": 0, "I": 0, "R": 3 } } ],
    "manualChangeCount": 0, "review": null },
  "lastInvalidatedReview": { "runId": 11, "reviewedBy": { "userId": 2, "userName": "analyst" }, "reviewedAt": "2026-10-18T10:02:11.000Z",
    "invalidatedBy": { "userId": 2, "userName": "analyst" }, "invalidatedAt": "2026-10-18T10:15:30.123Z",
    "reason": "rerun", "newRunId": 12, "occurrenceId": null } }
```
(Los rangos son ilustrativos. Los reales salen de `expected.json` de cada muestra.)

`PATCH /api/v1/conflict-occurrences/4402` con `{ "includeInSettlement": true }` → `200` (extracto)
```json
{ "issueId": 881, "runId": 12, "validationCode": "duplicate_in_batch", "issueType": "duplicate", "scope": "in_batch",
  "blocking": false, "transactionIdRaw": "441706751475644", "transactionId": "100234", "cycle": "E",
  "missingType": null, "missingRange": null, "relevantDate": null,
  "status": { "statusId": 2, "code": "Successful", "name": "Successful" }, "gatewayStatus": null, "source": null,
  "resolutionStatus": "persistent", "resolvedAt": null, "resolvedBy": null, "resolutionNote": null,
  "occurrenceCount": 2, "includedByDefaultCount": 1, "includedCount": 2,
  "importId": "7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44", "importStatus": "analyzed", "run": { "runId": 12, "isCurrent": true },
  "resolvable": false,
  "occurrences": [
    { "occurrenceId": "4401", "sourceType": "current_import",
      "location": { "fileId": "…", "fileName": "batch-issues.xlsx", "sheetId": "…", "sheetName": "APP", "rowNo": 14 },
      "batch": null, "status": { "statusId": 2, "code": "Successful", "name": "Successful" }, "excludeAmount": false,
      "defaultIncluded": true, "includeInSettlement": true, "changedBy": null, "changedAt": null, "editable": true, "includable": true },
    { "occurrenceId": "4402", "sourceType": "current_import",
      "location": { "fileId": "…", "fileName": "batch-issues.xlsx", "sheetId": "…", "sheetName": "APP", "rowNo": 233 },
      "batch": null, "status": { "statusId": 2, "code": "Successful", "name": "Successful" }, "excludeAmount": false,
      "defaultIncluded": false, "includeInSettlement": true,
      "changedBy": { "userId": 2, "userName": "analyst" }, "changedAt": "2026-10-18T10:20:01.456Z", "editable": true, "includable": true } ],
  "history": [ { "at": "2026-10-18T10:20:01.456Z", "user": { "userId": 2, "userName": "analyst" }, "action": "set_inclusion",
                 "occurrenceId": "4402", "from": false, "to": true, "note": null } ] }
```

`POST /api/v1/imports/…/review` con `{ "runId": 7 }` sobre `batch-blocked` → `409`
```json
{ "code": "blocking_validation_issue", "message": "provider_mismatch: cancel the import and process it under the correct provider",
  "details": { "runId": 7, "validationCodes": ["provider_mismatch"], "issueIds": [512] } }
```

## Risks / Trade-offs

- [El bloqueo de la fila de `Import` durante la escritura de la corrida retiene las lecturas de ese import sin RCSI] → La escritura es corta (cálculo fuera de la transacción, D4). La medición `writeMs` va en el PR. RCSI sigue como mejora registrada en `import-analyze`.
- [`409 import_changed` en un uso normal (doble clic en "Run validations")] → Lo absorbe la UI de #10, que deshabilita el botón mientras corre y relee la corrida ante un `409`. Es documentado y no destructivo.
- [Escribir `AuditLog` dentro de la transacción convierte un fallo de auditoría en un fallo de la acción] → Es intencionado (D7). El mensaje de error es el genérico `500` y la acción no queda a medias.
- [Re-ejecutar o cambiar una inclusión invalida una revisión sin pedir confirmación en la API] → Es la regla decidida (P1, P4). La confirmación es de #10, que tiene `importStatus`, `editable` y `manualChangeCount` para avisar antes, y la invalidación queda auditada y visible en `lastInvalidatedReview`.
- [Dos apariciones incluidas de la misma clave no caben en `UNIQUE (transactionId, cycle, batchId)` de `SettlementTransaction`: Refund + Chargeback (colisión I, todas incluidas por defecto), Chargeback + `CHB 2` (no son hallazgo, pero son dos filas I) y los duplicados E o I incluidos a mano] → No es un problema de este change (aquí no se liquida; en R la regla de D9 ya lo impide). Queda avisado en #11, cuyo proposal debe decidir la clave.
- [El historial depende de `AuditLog`, que también usan otros módulos] → Se filtra por `entityType` y por `action`. Una acción nueva sobre esas entidades no aparece en el historial sin añadirla al mapeo (test).
- [Una corrida no detecta que otro import del proveedor se procesó mientras se calculaba] → La versión optimista protege solo el import propio. La ventana es de cientos de ms y la consecuencia es un faltante o duplicado que la siguiente corrida corrige. Queda registrado y no se mitiga en el MVP.
- [El bench no corre en CI, así que una regresión de rendimiento no la detecta el pipeline] → Va condicionado a `RECON_BENCH=1` por decisión de la revisión: 50 000 movimientos en la base efímera alargan CI y dan cifras ruidosas. Se ejecuta en local antes del PR y en cada change que toque consultas de validación, y el benchmark del motor sí sigue en CI.

## Migration Plan

1. `backend/prisma/migrations/0006_validation_runs/migration.sql`, escrita a mano (no hay base sombra, `P3014`):
```sql
-- validation-runs: informative counters of a run, one current run per import, sheet position in its workbook.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[ValidationRun] ADD
    [undatedAdjustmentCount] INT NOT NULL CONSTRAINT [ValidationRun_undatedAdjustmentCount_df] DEFAULT 0,
    [undatedCandidateCount] INT NOT NULL CONSTRAINT [ValidationRun_undatedCandidateCount_df] DEFAULT 0;

-- Position of the sheet in its workbook (0 = first); NULL for imports uploaded before this migration.
ALTER TABLE [dbo].[ImportSheet] ADD [sheetIndex] INT NULL CONSTRAINT [CK_ImportSheet_sheetIndex] CHECK ([sheetIndex] >= 0);

-- Only one current (not superseded) run per import.
CREATE UNIQUE NONCLUSTERED INDEX [UX_ValidationRun_current_import]
    ON [dbo].[ValidationRun]([importId]) WHERE [isSuperseded] = 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
```
   Antes de crear el índice no hace falta limpiar datos, porque hoy ningún código escribe `ValidationRun`. Si la base local tuviera filas de pruebas manuales con dos vigentes, el índice fallaría y la transacción se desharía entera.
2. `schema.prisma`: `undatedAdjustmentCount Int @default(0)`, `undatedCandidateCount Int @default(0)` en `ValidationRun`; `sheetIndex Int?` en `ImportSheet`; comentario `// filtered unique index (importId) WHERE isSuperseded = 0 → migration`. `prisma generate`.
3. La persona la revisa y la aplica con `! pnpm db:migrate`. CI la aplica en su base efímera.
4. **Rollback**: revertir el merge y una migración inversa a mano (`DROP INDEX`, `DROP CONSTRAINT` de los defaults y la `CHECK`, `DROP COLUMN`). Las corridas guardadas quedan inertes, porque ningún código anterior las lee.

## Open Questions

Ninguna. Las decisiones de negocio P1–P7 se tomaron en la revisión del 2026-10-18 (proposal.md) y están en specs y tareas. Heredar acciones manuales entre corridas es deuda de la Entrega 3, no una pregunta abierta.
