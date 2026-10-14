# validation

## Purpose
Las ocho validaciones sobre un import analizado, sus rangos, hallazgos y decisiones de inclusión. README §3.3, §3.2 (ValidationRun, ValidationResult, ValidationIssue, ConflictOccurrence), HU2.

## Requirements

### Requirement: Ocho validaciones en orden fijo
Una corrida SHALL producir exactamente ocho resultados con `validationCode` en este orden: provider_mismatch, non_recorded_adjustment, duplicate_in_batch, status_collision_in_batch, duplicate_across_batches, status_collision_across_batches, missing_previous_to_batch, missing_in_range; cada uno con `outcome` ∈ passed | failed | not_applicable y `issueCount`. Una corrida nueva SHALL marcar la anterior como superada sin borrarla.

#### Scenario: Batch limpio
- WHEN se valida `data/samples/batch-clean`
- THEN las ocho validaciones son `passed` (o `not_applicable` donde no hay rango) con `issueCount = 0`

#### Scenario: Batch con incidencias
- WHEN se valida `data/samples/batch-issues`
- THEN los conteos coinciden con `expected.validations` y los IDs con `expected.affectedIds`

### Requirement: Solo provider_mismatch bloquea
`provider_mismatch` SHALL ser el único hallazgo con `blocking = 1`; con uno o más, el import no puede procesarse y la única salida es cancelar. Las demás validaciones SHALL permitir continuar con una decisión única para todo el import, registrada con el usuario.

#### Scenario: Canal de otro proveedor
- WHEN se valida `data/samples/batch-blocked`
- THEN `provider_mismatch = 1`, `blocked = true` y el botón de continuar no está disponible

### Requirement: Clave de duplicado y colisión
Duplicados y colisiones SHALL evaluarse por `(transactionId, cycle)`: mismo estado → duplicado; estados distintos del mismo ciclo → colisión. Las apariciones SHALL guardarse en `ConflictOccurrence` (N por hallazgo). Valores por defecto de inclusión: duplicate in_batch → primera incluida; duplicate across_batches → actual excluida; collision in_batch → todas incluidas; collision across_batches → actual incluida. El analista puede cambiar la inclusión y queda auditado.

### Requirement: Rangos y faltantes
Los rangos APP, DEC, I y R SHALL derivarse de las filas asociadas del batch. `missing_previous_to_batch` SHALL listar transacciones de los canales de la cuenta anteriores al rango de su ciclo sin liquidar; `missing_in_range`, las que caen dentro del rango y no vienen en el archivo. Para R, las candidatas son las reservas retenidas vencidas no liberadas ni liberadas anticipadamente. DEC vacía SHALL no abrir rango DEC. Transacciones `Pending` SHALL contarse aparte (informativo).

#### Scenario: Declinadas del primer día omitidas
- GIVEN `data/samples/batch-issues`, donde el archivo omite todas las DEC del 2026-09-28
- THEN `missing_previous_to_batch.E = 10` y `missing_in_range.E = 3`, `missing_in_range.R = 3`

### Requirement: Los hallazgos persisten
Un faltante SHALL registrarse una sola vez por proveedor, ciclo y transacción y pasar a `resolved` cuando un batch `processed` posterior de cualquier cuenta del proveedor lo incluya; volver a `persistent` si ese batch se deshace.
