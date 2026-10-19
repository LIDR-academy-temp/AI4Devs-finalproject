# Spec Delta

## MODIFIED Requirements

### Requirement: Máquina de estados del import
SHALL admitirse solo estas transiciones: `uploaded → mapped` y `mapped → mapped` (confirmar pareo); `mapped → analyzed` (analizar); `analyzed → validated` (decisión de conjunto, `POST review`); `validated → analyzed` (validar de nuevo o cambiar una inclusión, que invalidan la revisión, P1 y P4); `validated → processed` (procesar el batch, `POST settlements`); `uploaded`, `mapped`, `analyzed` o `validated → cancelled` (cancelar). En `analyzed`, validar, cambiar una inclusión y resolver una fila no cambian el estado.

#### Scenario: Revisar pasa a validated
- **GIVEN** un import en `analyzed` con una corrida vigente sin bloqueantes
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/review` con ese `runId`
- **THEN** el import pasa a `validated` y un segundo `POST review` responde `409 import_not_analyzed` con `details.status = "validated"`

#### Scenario: Volver a analyzed
- **GIVEN** un import `validated`
- **WHEN** `analyst` llama a `POST validations`, o cambia una inclusión con `PATCH conflict-occurrence`
- **THEN** el import vuelve a `analyzed` y su revisión queda invalidada

#### Scenario: Procesar pasa a processed
- **GIVEN** un import `validated` con su revisión vigente
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/settlements` con el `runId` revisado
- **THEN** el import pasa a `processed` con `currentBatchId` del intento creado, y desde ahí no admite validar, cambiar inclusiones ni cancelar

#### Scenario: Tabla de transiciones
- **WHEN** se aplica cada acción a cada estado
- **THEN** `PUT mapping`: `uploaded`/`mapped` → `200 mapped`, resto `409 import_not_editable`; `POST analyze`: `mapped` → `200 analyzed` (o `422`), resto `409 import_not_mapped`; `POST/DELETE files`: `uploaded`/`mapped` → `200`, resto `409 import_not_editable`; `PATCH row`: `analyzed` → `200`, resto `409 import_not_editable`; `POST validations`: `analyzed` → `201`, `validated` → `201 analyzed`, resto `409 import_not_analyzed`; `POST review`: `analyzed` → `200 validated` (o `409` por la corrida), resto `409 import_not_analyzed`; `PATCH conflict-occurrence`: `analyzed` → `200`, `validated` → `200 analyzed`, resto `409 import_not_editable`; `POST settlements` y `POST settlements/preview`: `validated` → `201 processed` / `200` (o `409` por la corrida, el número o los canales), resto `409 import_not_validated`; `POST cancel`: `uploaded`/`mapped`/`analyzed`/`validated` → `200 cancelled`, `processed`/`cancelled` → `409 import_not_cancellable`; `GET rows` y `GET validations`: siempre `200`

### Requirement: Transiciones no admitidas del import
Cualquier otra combinación de acción y estado del import SHALL responder `409` con `details.status`: `import_not_mapped` al analizar fuera de `mapped`; `import_not_analyzed` al validar fuera de `analyzed` o `validated` y al revisar fuera de `analyzed`; `import_not_editable` al confirmar, añadir o quitar archivos, resolver filas o cambiar una inclusión fuera de su estado; `import_not_validated` al procesar o pedir la vista previa fuera de `validated`; `import_not_cancellable` al cancelar en `processed` o `cancelled`.

#### Scenario: Analizar sin confirmar
- **GIVEN** un import en `uploaded` con `readiness.canAnalyze = true`
- **WHEN** `analyst` llama a `POST /api/v1/imports/{id}/analyze`
- **THEN** recibe `409` con `code = "import_not_mapped"` y `details.status = "uploaded"`, y el import no cambia

#### Scenario: Analizar dos veces
- **GIVEN** un import en `analyzed`
- **WHEN** se llama de nuevo a `POST /api/v1/imports/{id}/analyze`
- **THEN** recibe `409` con `code = "import_not_mapped"` y `details.status = "analyzed"`; las filas existentes no cambian

#### Scenario: Procesar un import ya procesado
- **GIVEN** un import en `processed`
- **WHEN** se llama de nuevo a `POST /api/v1/imports/{id}/settlements`
- **THEN** recibe `409` con `code = "import_not_validated"` y `details.status = "processed"`, y no se crea otro intento
