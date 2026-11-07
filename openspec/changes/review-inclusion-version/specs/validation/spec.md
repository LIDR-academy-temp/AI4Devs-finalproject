## ADDED Requirements

### Requirement: Versión de las inclusiones de una corrida
Cada corrida SHALL tener una versión de sus inclusiones (`inclusionVersion`), un entero que empieza en `0` y sube en `1` con cada cambio de inclusión aplicado sobre una aparición de esa corrida, en la misma transacción que el cambio. Un cambio con el valor que ya tenía la aparición SHALL no moverla. Una corrida nueva SHALL empezar en `0`. La auditoría `validation.occurrence.set_inclusion` SHALL llevar la versión resultante.

#### Scenario: Un cambio de inclusión sube la versión
- **GIVEN** la corrida vigente de `batch-issues` con `inclusionVersion = 0`
- **WHEN** `analyst` pone `includeInSettlement = true` en la segunda aparición de `441706751475644`
- **THEN** `GET validations` devuelve `run.inclusionVersion = 1` y la fila de `AuditLog` `validation.occurrence.set_inclusion` lleva `inclusionVersion = 1` en `detailJson`

#### Scenario: Mismo valor
- **GIVEN** la corrida vigente con `inclusionVersion = 1`
- **WHEN** se envía a una aparición el valor que ya tiene
- **THEN** `run.inclusionVersion` sigue en `1`

#### Scenario: Ida y vuelta
- **WHEN** una aparición se incluye y después se vuelve a excluir
- **THEN** `run.inclusionVersion` sube en `2`, aunque las inclusiones vuelvan a las de antes

#### Scenario: Corrida nueva
- **GIVEN** una corrida con `inclusionVersion = 2`
- **WHEN** se ejecuta una corrida nueva
- **THEN** la corrida nueva tiene `inclusionVersion = 0` y la superada conserva `2`

#### Scenario: Una resolución a mano no la mueve
- **WHEN** `analyst` resuelve a mano el `non_recorded_adjustment` de `batch-issues`
- **THEN** `run.inclusionVersion` no cambia y `run.manualChangeCount` sube en `1`

### Requirement: El review exige las inclusiones que se vieron
`POST review` SHALL exigir `inclusionVersion` (entero `>= 0`; sin él, `400 validation_error`). Si no es la vigente, SHALL responder `409 inclusions_changed` con `details = { runId, inclusionVersion, currentInclusionVersion }` sin escribir nada. Se comprueba en la transacción del review, tras `validation_run_superseded` y antes de `blocking_validation_issue` y `no_matched_rows`. `import.review` SHALL llevar la `inclusionVersion` aprobada.

#### Scenario: Otro analista cambia una inclusión antes de confirmar
- **GIVEN** `batch-issues` `analyzed` con la corrida vigente leída por `analyst` con `inclusionVersion = 0`
- **WHEN** otro usuario con `settlement.process` cambia una inclusión de esa corrida y después `analyst` envía `POST review` con el `runId` vigente e `inclusionVersion = 0`
- **THEN** recibe `409 inclusions_changed` con `details.runId` = la corrida vigente, `details.inclusionVersion = 0` y `details.currentInclusionVersion = 1`
- **AND** el import sigue `analyzed`, la corrida no tiene revisión y no hay ninguna fila `import.review` nueva en `AuditLog`

#### Scenario: Review con la versión vigente
- **GIVEN** la corrida vigente de `batch-issues` con `inclusionVersion = 1`
- **WHEN** `analyst` envía `POST review` con el `runId` vigente e `inclusionVersion = 1`
- **THEN** recibe `200` con `importStatus = "validated"` y la fila `import.review` lleva `inclusionVersion = 1` y `changedOccurrences = 1` en `detailJson`

#### Scenario: Corrida superada antes que inclusiones cambiadas
- **GIVEN** que se leyó la corrida 1 y después se ejecutó la corrida 2
- **WHEN** se envía `POST review` con `runId` = 1 y una `inclusionVersion` distinta de la de la corrida 2
- **THEN** recibe `409 validation_run_superseded`, no `inclusions_changed`

#### Scenario: Inclusiones cambiadas antes que el bloqueo y el batch vacío
- **GIVEN** una corrida vigente bloqueada, o un import sin filas asociadas
- **WHEN** se envía `POST review` con el `runId` vigente, una `inclusionVersion` caducada y sin `confirmEmptyBatch`
- **THEN** recibe `409 inclusions_changed`, no `blocking_validation_issue` ni `no_matched_rows`

#### Scenario: Sin versión en el cuerpo
- **WHEN** se envía `POST review` con `{ runId }` solo
- **THEN** recibe `400 validation_error` y el import no cambia

### Requirement: Pantalla Analysis & Validations: inclusiones cambiadas al continuar
Ante `409 inclusions_changed` en **Continue to settlement review**, la pantalla SHALL avisar de que las inclusiones cambiaron, releer la corrida y el import, y desmarcar la casilla del batch vacío. El siguiente clic SHALL enviar la versión releída. Mientras la corrida se recarga, Continue SHALL estar deshabilitado con el motivo visible, para que un cambio propio no envíe una versión vieja.

#### Scenario: Continue espera a la relectura tras un cambio propio
- **GIVEN** la corrida vigente de `batch-issues` cargada
- **WHEN** `analyst` cambia una inclusión en el detalle del hallazgo y la corrida se está releyendo
- **THEN** **Continue to settlement review** está deshabilitado con `Loading the latest results…`, y al terminar la relectura se habilita y envía `inclusionVersion = 1`

#### Scenario: Otro analista cambió una inclusión
- **GIVEN** la corrida vigente de `batch-issues` cargada con `inclusionVersion = 0` y otra pestaña que cambió una inclusión (versión `1` en el servidor)
- **WHEN** `analyst` pulsa **Continue to settlement review**
- **THEN** ve `The inclusions changed since you loaded them. Check them and continue again.`, el import sigue `analyzed` y la corrida se relee
- **AND** al volver a pulsar, se envía `POST review` con `inclusionVersion = 1` y el import pasa a `validated`

#### Scenario: Batch vacío confirmado
- **GIVEN** un import sin filas asociadas con la casilla del batch vacío marcada
- **WHEN** `POST review` responde `409 inclusions_changed`
- **THEN** la casilla queda desmarcada y Continue espera a que se vuelva a marcar

## MODIFIED Requirements

### Requirement: Leer la corrida vigente
`GET /api/v1/imports/{id}/validations` SHALL devolver, con autenticación y dentro del alcance, el estado del import, su corrida vigente (autor y fecha, ocho resultados con `outcome`, `issueCount` y si bloquean, `blocked`, rangos APP, DEC, I y R, contadores informativos, `manualChangeCount`, `inclusionVersion` y la revisión vigente si la hay) y la última revisión invalidada del import. Sin corrida vigente, la corrida SHALL ser `null`.

#### Scenario: Import validado de batch-issues
- **GIVEN** `batch-issues` con una corrida revisada
- **WHEN** `viewer` lee las validaciones
- **THEN** recibe `200` con `importStatus = "validated"`, la corrida con sus ocho resultados, su `inclusionVersion` y la revisión con el usuario `analyst` y su fecha

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

### Requirement: Decisión de conjunto
`POST /api/v1/imports/{id}/review` con `{ runId, inclusionVersion }` SHALL exigir `settlement.process` y el import en `analyzed`. Solo con la corrida vigente, las inclusiones que se vieron y sin bloqueantes SHALL pasar el import a `validated` y registrar la aprobación en `AuditLog` con el usuario, sin exigir decisión por hallazgo; los hallazgos SHALL seguir `persistent`. Responde `200` con la corrida y la revisión.

#### Scenario: Continuar con advertencias
- **GIVEN** `batch-issues` analizado y validado, con un cambio de inclusión hecho
- **WHEN** `analyst` llama a `POST review` con el `runId` y la `inclusionVersion` vigentes
- **THEN** recibe `200` con `importStatus = "validated"` y la revisión con `analyst` y su fecha
- **AND** los 23 hallazgos siguen `persistent`, el cambio de inclusión sigue guardado y hay una fila de `AuditLog` con `action = "import.review"`, `entityId = importId` y `detailJson` con `runId`, `inclusionVersion` y el número de hallazgos por validación (criterio 3 del issue, HU2 CA6)

#### Scenario: Provider mismatch
- **GIVEN** `batch-blocked` analizado y validado
- **WHEN** `analyst` llama a `POST review` con el `runId` y la `inclusionVersion` vigentes
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

### Requirement: Pantalla Analysis & Validations: continuar o cancelar
La pantalla SHALL ofrecer una sola decisión de conjunto: **Continue to settlement review**, que llama a `POST review` con el `runId` y la `inclusionVersion` de la corrida mostrada, y **Cancel and reprocess**, con confirmación. Continue SHALL estar deshabilitado sin corrida vigente o con la corrida bloqueada, con el motivo visible y asociado al botón.

#### Scenario: provider_mismatch (criterio 1 del issue, HU2 CA5)
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** **Continue to settlement review** está deshabilitado y ve `provider_mismatch: cancel the import and process it under the correct provider.`, con un enlace al hallazgo de `252570479111759`, y **Cancel and reprocess** está disponible

#### Scenario: Sin corrida
- **GIVEN** el import analizado sin corrida vigente
- **THEN** **Continue to settlement review** está deshabilitado con `Run the validations before continuing.`

#### Scenario: Solo advertencias (criterio 3 del issue, HU2 CA6)
- **GIVEN** la corrida vigente de `batch-issues` sin cambios
- **WHEN** `analyst` pulsa **Continue to settlement review**
- **THEN** se llama a `POST /imports/<importId>/review` con `{ "runId": <runId>, "inclusionVersion": 0 }`, el import muestra `validated`, ve `Reviewed by analyst on <fecha>` y se ofrece **Settlement Review**

#### Scenario: Corrida superada al continuar
- **WHEN** `POST review` responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before continuing.`, se relee la corrida y Continue usa el `runId` nuevo solo cuando se vuelva a pulsar

#### Scenario: Cancelar y reprocesar (HU2 CA8)
- **WHEN** `analyst` pulsa **Cancel and reprocess** y confirma
- **THEN** se llama a `POST cancel`, el import muestra `cancelled` y la corrida, la tabla y los hallazgos siguen visibles en solo lectura
