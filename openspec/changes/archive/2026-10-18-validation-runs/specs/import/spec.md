# Spec Delta

## MODIFIED Requirements

### Requirement: Máquina de estados del import
SHALL admitirse solo estas transiciones: `uploaded → mapped` y `mapped → mapped` (confirmar pareo); `mapped → analyzed` (analizar); `analyzed → validated` (decisión de conjunto, `POST review`); `validated → analyzed` (validar de nuevo o cambiar una inclusión, que invalidan la revisión, P1 y P4); `uploaded`, `mapped`, `analyzed` o `validated → cancelled` (cancelar). En `analyzed`, validar, cambiar una inclusión y resolver una fila no cambian el estado. Cualquier otra combinación SHALL responder `409` con `details.status`: `import_not_mapped` al analizar fuera de `mapped`; `import_not_analyzed` al validar fuera de `analyzed` o `validated` y al revisar fuera de `analyzed`; `import_not_editable` al confirmar, añadir o quitar archivos, resolver filas o cambiar una inclusión fuera de su estado; `import_not_cancellable` al cancelar en `processed` o `cancelled`.

#### Scenario: Analizar sin confirmar
- **GIVEN** un import en `uploaded` con `readiness.canAnalyze = true`
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/analyze`
- **THEN** recibe `409` con `code = "import_not_mapped"` y `details.status = "uploaded"`, y el import no cambia

#### Scenario: Analizar dos veces
- **GIVEN** un import en `analyzed`
- **WHEN** se llama de nuevo a `POST /api/v1/imports/{id}/analyze`
- **THEN** recibe `409` con `code = "import_not_mapped"` y `details.status = "analyzed"`; las filas existentes no cambian

#### Scenario: Revisar pasa a validated
- **GIVEN** un import en `analyzed` con una corrida vigente sin bloqueantes
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/review` con ese `runId`
- **THEN** el import pasa a `validated` y un segundo `POST review` responde `409 import_not_analyzed` con `details.status = "validated"`

#### Scenario: Volver a analyzed
- **GIVEN** un import `validated`
- **WHEN** `analyst` llama a `POST validations`, o cambia una inclusión con `PATCH conflict-occurrence`
- **THEN** el import vuelve a `analyzed` y su revisión queda invalidada

#### Scenario: Tabla de transiciones
- **WHEN** se aplica cada acción a cada estado
- **THEN** `PUT mapping`: `uploaded`/`mapped` → `200 mapped`, resto `409 import_not_editable`; `POST analyze`: `mapped` → `200 analyzed` (o `422`), resto `409 import_not_mapped`; `POST/DELETE files`: `uploaded`/`mapped` → `200`, resto `409 import_not_editable`; `PATCH row`: `analyzed` → `200`, resto `409 import_not_editable`; `POST validations`: `analyzed` → `201`, `validated` → `201 analyzed`, resto `409 import_not_analyzed`; `POST review`: `analyzed` → `200 validated` (o `409` por la corrida), resto `409 import_not_analyzed`; `PATCH conflict-occurrence`: `analyzed` → `200`, `validated` → `200 analyzed`, resto `409 import_not_editable`; `POST cancel`: `uploaded`/`mapped`/`analyzed`/`validated` → `200 cancelled`, `processed`/`cancelled` → `409 import_not_cancellable`; `GET rows` y `GET validations`: siempre `200`

### Requirement: Resolución de una fila ambigua
`PATCH /api/v1/imports/{id}/rows/{sheetId}/{rowNo}` con cuerpo `{ gatewayId }` SHALL exigir `settlement.process` y el import en `analyzed`. Si la fila es `ambiguous` y `gatewayId` es una de sus candidatas, SHALL fijar `transactionId` y `gatewayId`, pasarla a `matched`, incrementar `rowsMatched`, marcar como superada la corrida vigente si la hay (P7), registrar en `AuditLog` (`import.row.resolve_gateway`, `entityType = "ImportRow"`, `entityId = "<sheetId>:<rowNo>"`, detalle con import, gateway, candidatas y la corrida superada) y responder `200` con la fila.

#### Scenario: Elegir el gateway
- **GIVEN** una fila `ambiguous` con candidatas en los gateways 1 y 3
- **WHEN** `analyst` envía `{ gatewayId: 3 }`
- **THEN** recibe `200` con `matchResult = "matched"`, `gatewayId = 3`, `transactionId` de la candidata de ese gateway, `candidates` conservadas, `rowsMatched` del import aumenta en 1, `analysis.rows.ambiguous` baja en 1, y existe una fila de `AuditLog` con `userId` de `analyst`, `action = "import.row.resolve_gateway"` y `entityId = "<sheetId>:<rowNo>"`

#### Scenario: Resolver una fila tras validar
- **GIVEN** un import `analyzed` con una corrida vigente y una fila `ambiguous`
- **WHEN** `analyst` resuelve la fila
- **THEN** la corrida pasa a `isSuperseded = 1` sin sustituta, `GET validations` devuelve `run = null`, `POST review` responde `409 validation_run_required` y el detalle de auditoría trae `supersededRunId`

#### Scenario: Gateway que no es candidato
- **WHEN** `analyst` envía `{ gatewayId: 2 }` y ninguna candidata pertenece al gateway 2
- **THEN** recibe `400 validation_error` con `details.candidates` y la fila no cambia

#### Scenario: Fila que no es ambigua
- **WHEN** se intenta resolver una fila `matched`, `unmatched` o `ignored`
- **THEN** recibe `409` con `code = "row_not_ambiguous"` y `details.matchResult`

#### Scenario: Estado, permiso y alcance
- **WHEN** el import no está en `analyzed`
- **THEN** recibe `409 import_not_editable` con `details.status`
- **AND** `viewer` recibe `403 forbidden`; una fila o un import inexistentes o fuera del alcance, `404 not_found`

### Requirement: Cancelación del import
`POST /api/v1/imports/{id}/cancel` SHALL exigir `settlement.process`, aceptarse en `uploaded`, `mapped`, `analyzed` y `validated`, pasar el import a `cancelled` conservando archivos en `UPLOAD_DIR`, hojas, pareo confirmado, filas, corridas, hallazgos y apariciones, registrar en `AuditLog` (`action = "import.cancel"`, `entityType = "Import"`, detalle con el estado anterior y la corrida vigente o `null`) y responder `200` con el detalle. En `processed` o `cancelled` SHALL responder `409 import_not_cancellable`.

#### Scenario: Cancelar un import analizado
- **GIVEN** `batch-clean` analizado
- **WHEN** `analyst` cancela
- **THEN** recibe `200` con `status = "cancelled"`, `files`, `analysis`, `channels` y `batchFees` iguales a los de antes, el archivo sigue en `storagePath`, las 783 filas siguen en base y `GET /api/v1/imports/{id}/rows` las devuelve; existe una fila de `AuditLog` con `action = "import.cancel"`, `entityId = importId`, `detailJson.previousStatus = "analyzed"` y `detailJson.runId = null`

#### Scenario: Cancelar tras validar
- **GIVEN** `batch-blocked` analizado con una corrida vigente bloqueada
- **WHEN** `analyst` cancela (la única salida, HU2 CA5 y CA8)
- **THEN** recibe `200` con `status = "cancelled"`, la corrida, sus resultados, hallazgos y apariciones siguen en base y legibles con `GET validations`, y `detailJson.runId` es el de esa corrida

#### Scenario: Cancelar sin analizar
- **GIVEN** un import en `uploaded`
- **WHEN** se cancela
- **THEN** recibe `200` con `status = "cancelled"`, `analysis = null`, y `POST /api/v1/imports/{id}/files` responde después `409 import_not_editable`

#### Scenario: Cancelar dos veces o un import procesado
- **WHEN** se cancela un import ya `cancelled`, o uno en `processed`
- **THEN** recibe `409` con `code = "import_not_cancellable"` y `details.status`
- **AND** `viewer` recibe `403 forbidden` y un import fuera del alcance `404 not_found`
