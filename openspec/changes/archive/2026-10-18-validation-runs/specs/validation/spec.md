# Spec Delta

## ADDED Requirements

### Requirement: Ejecutar una corrida
`POST /api/v1/imports/{id}/validations` SHALL exigir `settlement.process`, ejecutar las ocho validaciones con los datos de la base, guardar la corrida con sus resultados, hallazgos y apariciones, marcar como superada la vigente anterior sin borrarla y responder `201`. SHALL aceptarse en `analyzed` o `validated` (P1); en `validated`, el import vuelve a `analyzed` en la misma transacción. En otro estado, `409 import_not_analyzed` con `details.status`.

#### Scenario: Corrida de batch-issues
- **GIVEN** `batch-issues` analizado en `ProviderB-Main`
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/validations`
- **THEN** recibe `201` con ocho resultados en el orden fijo cuyos conteos coinciden con `expected.validations`, `blocked = false` y los rangos de la corrida
- **AND** en base hay una `ValidationRun` con `isSuperseded = 0`, ocho `ValidationResult` y 23 `ValidationIssue`, todos `persistent`

#### Scenario: Dos corridas seguidas
- **GIVEN** un import `analyzed` con una corrida vigente
- **WHEN** se ejecuta otra corrida
- **THEN** la anterior queda con `isSuperseded = 1` y conserva sus resultados, hallazgos y apariciones, y la nueva es la única con `isSuperseded = 0` (HU2 CA1)

#### Scenario: Re-validar un import validado
- **GIVEN** `batch-issues` `validated` con la corrida 1 revisada por `analyst`
- **WHEN** `analyst` llama a `POST validations`
- **THEN** recibe `201` con la corrida 2 e `importStatus = "analyzed"`, la corrida 1 queda superada y su revisión, invalidada (spec "Invalidación de la revisión", motivo `rerun`)

#### Scenario: Import que no está analizado ni validado
- **WHEN** se llama a `POST validations` sobre un import en `uploaded`, `mapped`, `processed` o `cancelled`
- **THEN** recibe `409` con `code = "import_not_analyzed"` y `details.status`, y no se crea ninguna corrida

#### Scenario: Sin permiso o fuera del alcance
- **WHEN** `viewer` llama a `POST validations`, o `analyst` lo llama sobre un import de otro merchant o inexistente
- **THEN** recibe `403 forbidden` en el primer caso y `404 not_found` idéntico en los otros dos

### Requirement: Una sola corrida vigente por import
Un import SHALL tener como máximo una corrida con `isSuperseded = 0`, también ante peticiones simultáneas. Una corrida SHALL persistirse solo si el import no cambió desde que empezó a calcularse; si cambió, SHALL responder `409 import_changed` con `details.status` sin escribir nada.

#### Scenario: Dos corridas simultáneas
- **GIVEN** un import `analyzed`
- **WHEN** dos peticiones `POST validations` se solapan
- **THEN** una recibe `201` y la otra `409 import_changed` (o `201` si empezó después de que la primera confirmara)
- **AND** al terminar hay exactamente una corrida con `isSuperseded = 0`

#### Scenario: Cambio de inclusión mientras se calcula una corrida
- **GIVEN** una corrida en cálculo sobre un import `analyzed`
- **WHEN** antes de que se persista se confirma un `PATCH` de inclusión en el mismo import
- **THEN** la corrida recibe `409 import_changed` y el cambio de inclusión se conserva

### Requirement: Qué se guarda de cada hallazgo
Cada hallazgo SHALL guardarse con su tipo, alcance, bloqueo, movimiento, ciclo, estado y, si es un faltante, `missingType` y `relevantDate`; SHALL conservar además, para releerlos, el rango del faltante (APP, DEC, I o R), el estado del gateway de un `non_recorded_adjustment` o `status_mismatch` y la fila de origen de los hallazgos de una sola fila. Cada aparición SHALL guardarse con `includeInSettlement = defaultIncluded`.

#### Scenario: Faltantes E distinguibles por rango
- **GIVEN** la corrida guardada de `batch-issues`
- **WHEN** se leen sus hallazgos `missing`
- **THEN** los 10 de `missing_previous_to_batch` tienen rango `DEC` y los 3 E de `missing_in_range` rango `APP`, con los IDs de `affectedIds`, aunque los 13 tengan `cycle = E`

#### Scenario: Estado del gateway y fila de origen
- **GIVEN** la corrida guardada de `batch-issues`
- **WHEN** se lee el hallazgo `non_recorded_adjustment` de `281520820250015`
- **THEN** trae el estado reportado, el estado del gateway `Successful` y el archivo, la hoja y la fila de origen

#### Scenario: Inclusión inicial
- **GIVEN** la corrida guardada de `batch-issues`
- **WHEN** se leen sus apariciones
- **THEN** todas tienen `includeInSettlement = defaultIncluded`, sin usuario ni fecha de cambio, y las de `441706751475644` son una incluida y otra excluida

#### Scenario: Aparición sin estado resuelto
- **GIVEN** una colisión con una aparición cuyo estado no se resolvió
- **WHEN** se guarda la corrida
- **THEN** esa aparición queda con estado nulo y `includeInSettlement = true`

#### Scenario: Contadores informativos
- **GIVEN** un import con una fila I sin fecha de cambio de estado y una candidata I sin fecha
- **WHEN** se guarda la corrida
- **THEN** la corrida conserva `pendingInRangeCount`, `undatedAdjustmentCount = 1` y `undatedCandidateCount = 1`, y la lectura los devuelve

### Requirement: Aparición histórica con su fila
Una aparición `previous_batch` SHALL llevar el batch (número, intento, estado y cuenta) y, cuando el movimiento histórico la tiene, la hoja y la fila de las que salió; si el movimiento no tiene fila, ambas SHALL ser nulas.

#### Scenario: Movimiento histórico con fila
- **GIVEN** un movimiento E de un batch vigente anterior con hoja y fila de su import
- **WHEN** un import nuevo trae la misma transacción en APP y se valida
- **THEN** el `duplicate` / `across_batches` tiene una aparición `previous_batch` con `batchNo`, `attemptNo`, esa hoja, su archivo y esa fila

#### Scenario: Movimiento histórico sin fila
- **GIVEN** un movimiento histórico sin hoja ni fila
- **WHEN** se valida un import que colisiona con él
- **THEN** su aparición `previous_batch` tiene archivo, hoja y fila nulos y conserva el batch y el intento

### Requirement: Leer la corrida vigente
`GET /api/v1/imports/{id}/validations` SHALL devolver, con autenticación y dentro del alcance, el estado del import, su corrida vigente (autor y fecha, ocho resultados con `outcome`, `issueCount` y si bloquean, `blocked`, rangos APP, DEC, I y R, contadores informativos, `manualChangeCount` y la revisión vigente si la hay) y la última revisión invalidada del import. Sin corrida vigente, la corrida SHALL ser `null`.

#### Scenario: Import validado de batch-issues
- **GIVEN** `batch-issues` con una corrida revisada
- **WHEN** `viewer` lee las validaciones
- **THEN** recibe `200` con `importStatus = "validated"`, la corrida con sus ocho resultados y la revisión con el usuario `analyst` y su fecha

#### Scenario: Import sin corrida
- **GIVEN** un import `analyzed` que nunca se validó
- **WHEN** se leen sus validaciones
- **THEN** recibe `200` con `run = null` y `lastInvalidatedReview = null`

#### Scenario: Cambios manuales contados
- **GIVEN** la corrida vigente de `batch-issues` con una aparición cuya inclusión cambió y el `non_recorded_adjustment` resuelto a mano
- **WHEN** se leen sus validaciones
- **THEN** `run.manualChangeCount = 2`; si la aparición se devuelve a su valor por defecto, baja a 1

#### Scenario: Import ajeno
- **WHEN** `viewer` lee las validaciones de un import de `ProviderC-Alt`, o de un id inexistente
- **THEN** recibe `404 not_found` idéntico en los dos casos

### Requirement: Listar los hallazgos de la corrida vigente
`GET /api/v1/imports/{id}/validation-issues` SHALL devolver, paginados, los hallazgos de la corrida vigente, filtrables por `type`, `scope`, `status`, `validationCode` y `cycle`, cada uno con su resolución y el número de apariciones incluidas por defecto y actualmente. Orden fijo: orden de las validaciones, ciclo, rango, `relevantDate`, `transactionIdRaw` e id. Sin corrida vigente, la lista SHALL estar vacía.

#### Scenario: Filtrar los duplicados en el batch
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** se piden `?type=duplicate&scope=in_batch`
- **THEN** recibe `200` con `total = 1` y el hallazgo de `441706751475644`, con 2 apariciones, 1 incluida por defecto

#### Scenario: Faltantes persistentes
- **WHEN** se piden `?type=missing&status=persistent&pageSize=50`
- **THEN** recibe los 16 faltantes de `batch-issues` en el orden fijo

#### Scenario: Filtro inválido
- **WHEN** se pide `?type=failed`
- **THEN** recibe `400 validation_error`

### Requirement: Detalle de un hallazgo
`GET /api/v1/validation-issues/{id}` SHALL devolver el hallazgo con todas sus apariciones (import actual y batches anteriores) con archivo, hoja, fila, estado, si está incluida por defecto y ahora, y el usuario y la fecha del último cambio; la resolución con usuario, fecha y nota; y el historial de cambios de inclusión y de resolución con usuario y fecha. Un hallazgo de una corrida superada SHALL leerse indicándolo.

#### Scenario: Colisión en el batch
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** se abre la `collision` / `in_batch` de `911545593909470`
- **THEN** ve dos apariciones `current_import` con su archivo, hoja `APP` y `DEC`, fila, estado `Successful` y `Declined`, ambas incluidas por defecto y ahora, sin usuario de cambio, y un historial vacío (HU2 CA2)

#### Scenario: Después de cambiar una inclusión
- **GIVEN** que `analyst` excluyó y luego volvió a incluir una aparición
- **WHEN** se abre su hallazgo
- **THEN** la aparición muestra `analyst` y la fecha del último cambio, y el historial trae los dos cambios con el valor anterior y el nuevo, el usuario y la fecha

#### Scenario: Hallazgo de una corrida superada
- **WHEN** se abre un hallazgo de una corrida superada
- **THEN** recibe `200` con `run.isCurrent = false`

#### Scenario: Id ajeno, inexistente o malformado
- **WHEN** se pide un hallazgo de un import de otro merchant, uno inexistente o `abc`
- **THEN** recibe `404 not_found` idéntico en los dos primeros casos y `400 validation_error` en el tercero

### Requirement: Nada de otro merchant en las lecturas
Las respuestas de corrida, lista y detalle SHALL limitarse a lo que guarda el informe: de una transacción de otro proveedor solo SHALL figurar `transactionId` y lo que trae la fila del archivo; nunca su canal, cuenta, importe, fecha ni estado del gateway.

#### Scenario: Hallazgo provider_mismatch de batch-blocked
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** se abre el hallazgo `provider_mismatch` de `252570479111759`
- **THEN** trae `transactionId`, `transactionIdRaw`, ciclo, estado reportado y la fila de origen, y no trae canal, proveedor, importe, fecha ni estado del gateway

### Requirement: Cambiar la inclusión de una aparición
`PATCH /api/v1/conflict-occurrences/{id}` con `{ includeInSettlement }` SHALL exigir `settlement.process`, admitirse solo en apariciones `current_import` (P2) de la corrida vigente de un import `analyzed` o `validated` (P4), guardar el valor con el usuario y la fecha, registrarlo en `AuditLog` con el valor anterior y responder `200` con el detalle del hallazgo. En `validated`, el import SHALL volver a `analyzed` en la misma transacción. El hallazgo SHALL seguir existiendo y con el mismo estado.

#### Scenario: Incluir el duplicado excluido
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** `analyst` pone `includeInSettlement = true` en la segunda aparición de `441706751475644`
- **THEN** recibe `200` con el detalle del hallazgo, en el que esa aparición tiene `includeInSettlement = true`, `defaultIncluded = false`, `changedBy.userName = "analyst"` y `changedAt`, y el historial trae el cambio
- **AND** hay una fila de `AuditLog` con `action = "validation.occurrence.set_inclusion"`, `entityId` = id de la aparición y `detailJson` con `from = false`, `to = true`, `issueId` y `runId`
- **AND** el hallazgo `duplicate` sigue `persistent`

#### Scenario: Mismo valor
- **WHEN** se envía el valor que ya tiene la aparición
- **THEN** recibe `200` con el detalle sin cambios y no se escribe nada en `AuditLog`

#### Scenario: Aparición histórica
- **WHEN** se intenta cambiar una aparición `previous_batch`
- **THEN** recibe `409 occurrence_not_editable` con `details.sourceType = "previous_batch"` (P2)

#### Scenario: Import ya revisado
- **GIVEN** `batch-issues` `validated` con la corrida vigente revisada
- **WHEN** `analyst` cambia una inclusión
- **THEN** recibe `200` con `importStatus = "analyzed"`, la corrida sigue vigente, el cambio queda guardado y la revisión, invalidada con motivo `inclusion_change` (P4)

#### Scenario: Import en otro estado
- **WHEN** se intenta cambiar una inclusión con el import en `processed` o `cancelled`
- **THEN** recibe `409 import_not_editable` con `details.status`

#### Scenario: Corrida superada
- **WHEN** se intenta cambiar una aparición de una corrida superada
- **THEN** recibe `409 validation_run_superseded` con `details.runId` y `details.currentRunId`

#### Scenario: Duplicado de ajuste o de E incluido a mano
- **GIVEN** un `duplicate` de ciclo I o E, en el batch o contra un batch anterior, con la aparición actual excluida
- **WHEN** `analyst` la incluye
- **THEN** recibe `200` y el cambio queda auditado; cómo se liquida lo decide el procesamiento (P3)

### Requirement: Una reserva se incluye una sola vez
En ciclo R (la reserva no tiene estado y no se libera dos veces), un hallazgo SHALL tener como máximo una aparición incluida, y ninguna aparición `current_import` SHALL incluirse si el hallazgo tiene una aparición `previous_batch`. Incluir otra SHALL responder `409 occurrence_not_includable` con `details.reason` sin cambiar nada (P3). Excluir siempre se admite.

#### Scenario: Segunda fila RR de la misma reserva
- **GIVEN** un `duplicate` / `in_batch` de ciclo R con la primera aparición incluida y la segunda excluida
- **WHEN** `analyst` incluye la segunda
- **THEN** recibe `409 occurrence_not_includable` con `details.reason = "reserve_already_included"`
- **AND** si antes excluye la primera, incluir la segunda responde `200`

#### Scenario: Reserva ya liberada en un batch anterior
- **GIVEN** un `duplicate` / `across_batches` de ciclo R con la aparición actual excluida y una `previous_batch`
- **WHEN** `analyst` incluye la aparición actual
- **THEN** recibe `409 occurrence_not_includable` con `details.reason = "reserve_already_released"`

#### Scenario: Excluir una reserva
- **WHEN** `analyst` excluye la aparición incluida de un hallazgo de ciclo R
- **THEN** recibe `200` y el hallazgo queda sin ninguna aparición incluida

### Requirement: Invalidación de la revisión
Una corrida nueva sobre un import `validated` o un cambio de inclusión sobre un import `validated` SHALL devolverlo a `analyzed` en la misma transacción y registrar en `AuditLog` la revisión invalidada: la corrida revisada, quién y cuándo revisó, quién y cuándo la invalidó y el motivo (`rerun` o `inclusion_change`). `GET validations` SHALL devolver la última como `lastInvalidatedReview`.

#### Scenario: Invalidada al re-ejecutar
- **GIVEN** `batch-issues` revisado por `analyst` sobre la corrida 1
- **WHEN** `analyst` ejecuta la corrida 2 y se leen las validaciones
- **THEN** `run.review = null` y `lastInvalidatedReview` trae `runId` = 1, `reviewedBy.userName = "analyst"`, `reviewedAt`, `invalidatedBy`, `invalidatedAt` y `reason = "rerun"`
- **AND** hay una fila de `AuditLog` con `action = "import.review.invalidate"` y `entityId = importId`

#### Scenario: Invalidada al cambiar una inclusión
- **GIVEN** un import `validated`
- **WHEN** se cambia una inclusión y se leen las validaciones
- **THEN** `importStatus = "analyzed"`, la corrida es la misma, `run.review = null` y `lastInvalidatedReview.reason = "inclusion_change"` con el `occurrenceId` cambiado

#### Scenario: Nueva revisión tras invalidar
- **GIVEN** una revisión invalidada
- **WHEN** `analyst` revisa de nuevo la corrida vigente
- **THEN** el import pasa a `validated`, `run.review` trae la revisión nueva y `lastInvalidatedReview` sigue trayendo la invalidada

#### Scenario: Sin efecto en un import analizado
- **WHEN** se ejecuta una corrida o se cambia una inclusión con el import en `analyzed`
- **THEN** no se registra ninguna invalidación

#### Scenario: Sin permiso, ajena o cuerpo inválido
- **WHEN** `viewer` hace el `PATCH`, o se envía a una aparición de otro merchant, o con `includeInSettlement = "yes"`
- **THEN** recibe `403 forbidden`, `404 not_found` y `400 validation_error` respectivamente

### Requirement: Resolver a mano un ajuste o una discrepancia de estado
`PATCH /api/v1/validation-issues/{id}` con `{ resolutionStatus: "resolved", note }` (nota de 1 a 500 caracteres) SHALL exigir `settlement.process`, admitirse solo en `non_recorded_adjustment` y `status_mismatch` de la corrida vigente, en cualquier estado del import (P5), pasar el hallazgo a `resolved` con usuario, fecha y nota, auditarlo y responder `200` con el detalle. No SHALL cambiar ninguna inclusión.

#### Scenario: Ajuste verificado en el gateway
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** `analyst` resuelve el `non_recorded_adjustment` de `281520820250015` con la nota `Verified in the gateway`
- **THEN** recibe `200` con `resolutionStatus = "resolved"`, `resolvedBy.userName = "analyst"`, `resolvedAt` y la nota, y la inclusión de la fila no cambia
- **AND** hay una fila de `AuditLog` con `action = "validation.issue.resolve"`, `entityType = "ValidationIssue"` y la nota en `detailJson`

#### Scenario: Ya resuelto
- **WHEN** se resuelve de nuevo el mismo hallazgo
- **THEN** recibe `409 issue_already_resolved` con `details.resolvedAt` y `details.resolvedBy`

#### Scenario: Tipo que no se resuelve a mano
- **WHEN** se intenta resolver un `duplicate`, un `collision`, un `missing` o un `provider_mismatch`
- **THEN** recibe `422 issue_not_resolvable` con `details.issueType`

#### Scenario: Nota vacía o demasiado larga
- **WHEN** se envía `note = ""` o una nota de 501 caracteres
- **THEN** recibe `400 validation_error` y el hallazgo no cambia

#### Scenario: Corrida superada
- **WHEN** se intenta resolver un hallazgo de una corrida superada
- **THEN** recibe `409 validation_run_superseded`

### Requirement: Decisión de conjunto
`POST /api/v1/imports/{id}/review` con `{ runId }` SHALL exigir `settlement.process` y el import en `analyzed`. Solo con la corrida vigente y sin bloqueantes SHALL pasar el import a `validated` y registrar la aprobación en `AuditLog` con el usuario, sin exigir decisión por hallazgo; los hallazgos SHALL seguir `persistent`. Responde `200` con la corrida y la revisión.

#### Scenario: Continuar con advertencias
- **GIVEN** `batch-issues` analizado y validado, con un cambio de inclusión hecho
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente
- **THEN** recibe `200` con `importStatus = "validated"` y la revisión con `analyst` y su fecha
- **AND** los 23 hallazgos siguen `persistent`, el cambio de inclusión sigue guardado y hay una fila de `AuditLog` con `action = "import.review"`, `entityId = importId` y `detailJson` con `runId` y el número de hallazgos por validación (criterio 3 del issue, HU2 CA6)

#### Scenario: Provider mismatch
- **GIVEN** `batch-blocked` analizado y validado
- **WHEN** `analyst` llama a `POST review` con el `runId` vigente
- **THEN** recibe `409 blocking_validation_issue` con un mensaje que dice que el import debe cancelarse y procesarse con el proveedor correcto y `details` con `runId`, `validationCodes = ["provider_mismatch"]` e `issueIds`; el import sigue `analyzed` y no hay forma de forzarlo (HU2 CA5)

#### Scenario: Corrida superada
- **GIVEN** que `analyst` revisó la corrida 1 y después se ejecutó la corrida 2
- **WHEN** envía `POST review` con `runId` = 1
- **THEN** recibe `409 validation_run_superseded` con `details.currentRunId` = 2 y el import sigue `analyzed`

#### Scenario: Sin corrida vigente
- **WHEN** se llama a `POST review` sobre un import `analyzed` sin corrida vigente
- **THEN** recibe `409 validation_run_required`

#### Scenario: Import no analizado
- **WHEN** se llama a `POST review` sobre un import `validated`, `processed` o `cancelled`
- **THEN** recibe `409 import_not_analyzed` con `details.status`

#### Scenario: Sin permiso
- **WHEN** `viewer` llama a `POST review`
- **THEN** recibe `403 forbidden`

### Requirement: Revisión y corrida concurrentes
Un review y una corrida que se solapan sobre el mismo import SHALL serializarse: si el review confirma primero, la corrida SHALL recibir `409 import_changed` (no invalida una revisión confirmada después de que empezara a calcularse); si la corrida confirma primero, el review SHALL recibir `409 validation_run_superseded`. Nunca SHALL quedar un import `validated` cuya corrida vigente no sea la revisada.

#### Scenario: Review y corrida a la vez
- **GIVEN** un import `analyzed` con la corrida 1 vigente
- **WHEN** se solapan `POST review` con `runId` = 1 y `POST validations`
- **THEN** o bien el import queda `validated` con la corrida 1 vigente y la corrida recibe `409 import_changed`, o bien queda `analyzed` con la corrida 2 vigente y el review recibe `409 validation_run_superseded`

### Requirement: Lo hecho a mano no pasa a la corrida siguiente
Una corrida nueva SHALL crear sus hallazgos `persistent` y sus apariciones con la inclusión por defecto, sin heredar los cambios de inclusión ni las resoluciones de la anterior (P6), que SHALL seguir legibles en la corrida superada y en `AuditLog`.

#### Scenario: Re-validar tras cambiar una inclusión
- **GIVEN** una corrida con una aparición cuya inclusión cambió `analyst`
- **WHEN** se ejecuta una corrida nueva
- **THEN** la aparición equivalente de la corrida nueva tiene `includeInSettlement = defaultIncluded` y sin usuario de cambio, la de la corrida superada conserva el cambio y la corrida nueva tiene `manualChangeCount = 0`

### Requirement: Corrida contra la base igual al oráculo
Ejecutada contra SQL Server con el seed, la corrida de cada muestra SHALL coincidir con su `expected.json`, igual que el motor sobre el mundo sintético en memoria.

#### Scenario: Las cinco muestras
- **WHEN** se suben, se parean con la propuesta, se analizan y se validan `batch-clean`, `batch-split`, `batch-issues`, `batch-blocked` y `legacy-provider` en su cuenta
- **THEN** los resultados, conteos, rangos, IDs afectados y `blocked` coinciden con su `expected.json`, leído del disco

### Requirement: Límite exacto del vencimiento en la carga de reservas
La carga de reservas retenidas desde la base SHALL usar el plazo vigente del canal y conservar la precisión de `datetime2`: una reserva que vence exactamente en el máximo del rango R SHALL cargarse y una que vence un milisegundo después no.

#### Scenario: Fuente y motor con el mismo vencimiento contra la base
- **GIVEN** dos reservas retenidas de un canal de 120 días, con creación de milisegundos distintos de cero, una que vence exactamente en el máximo del rango R y otra que vence 1 ms después
- **WHEN** la fuente de la base las carga con ese máximo y se valida
- **THEN** la primera llega y el motor la clasifica `missing_in_range` con el mismo vencimiento; la segunda no llega

#### Scenario: Candidatas I sin fecha desde la base
- **GIVEN** una transacción `Chargeback` de un canal de la cuenta sin fecha de cambio de estado y un rango I en el import
- **WHEN** se valida contra la base
- **THEN** la corrida guarda `undatedCandidateCount = 1` y ningún faltante para ella

#### Scenario: Candidata ya procesada
- **GIVEN** una transacción `Successful` dentro del rango APP con un movimiento E en un intento vigente de otra cuenta del proveedor
- **WHEN** se valida contra la base
- **THEN** la fuente no la devuelve y no es faltante

### Requirement: Rendimiento de extremo a extremo
Validar y guardar una corrida del volumen de referencia, carga desde SQL Server incluida, SHALL tardar menos de 4 segundos, afirmado por el test. La escritura tiene como objetivo menos de 300 ms, registrado en el log sin aserción (288 ms medidos). El objetivo local de 2 segundos no se alcanza en la Entrega 2 y la carga queda pendiente en el issue #50. El test SHALL ejecutarse solo con `RECON_BENCH=1`, nunca en CI, con la máquina tranquila (sin `pnpm dev`).

#### Scenario: Volumen de referencia contra la base
- **GIVEN** `RECON_BENCH=1`, un import analizado de 2 000 filas, 50 000 movimientos anteriores del proveedor en la base y rangos de pocos días (perfil del doc 06)
- **WHEN** se llama a `POST validations`
- **THEN** responde `201` en menos de 4 s, con la carga, el motor y la escritura (y sus fases) registrados por separado
- **AND** el dato medido en la Entrega 2 (2 603 ms, 2 231 de ellos de carga) queda anotado en el PR, sin alcanzar el objetivo de 2 s

#### Scenario: Sin la variable
- **WHEN** se ejecuta la suite de integración sin `RECON_BENCH=1` (también en CI)
- **THEN** el test de rendimiento se omite y no crea fixtures

### Requirement: Caso extremo registrado
El test de rendimiento SHALL ejecutar también un caso extremo (rangos de meses) solo para registrar su tiempo, sin aserción.

#### Scenario: Rangos de meses
- **GIVEN** `RECON_BENCH=1` y un escenario con rangos de meses y ~23 000 hallazgos
- **WHEN** se llama a `POST validations`
- **THEN** responde `201` y su tiempo, con la carga, el motor y la escritura, queda en el log
