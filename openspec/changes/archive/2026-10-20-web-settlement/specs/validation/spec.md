# Spec Delta — validation (acceso a Settlement Review desde Analysis & Validations)

## MODIFIED Requirements

### Requirement: Pantalla Analysis & Validations: continuar o cancelar
La pantalla SHALL ofrecer una sola decisión de conjunto: **Continue to settlement review**, que llama a `POST review` con el `runId` de la corrida mostrada, y **Cancel and reprocess**, con confirmación. Continue SHALL estar deshabilitado sin corrida vigente o con la corrida bloqueada, con el motivo visible y asociado al botón. En `cancelled` y `processed` SHALL mostrar un texto de solo lectura por estado; en `processed`, con un enlace al Settlement Summary de su intento vigente (`currentBatchId`).

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
- **THEN** se llama a `POST /imports/<importId>/review` con `{ "runId": <runId> }`, el import muestra `validated`, ve `Reviewed by analyst on <fecha>` y se ofrece **Settlement Review**

#### Scenario: Corrida superada al continuar
- **WHEN** `POST review` responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before continuing.`, se relee la corrida y Continue usa el `runId` nuevo solo cuando se vuelva a pulsar

#### Scenario: Import cancelado
- **GIVEN** el import de `batch-issues` `cancelled` con su corrida
- **WHEN** abre el paso Analysis
- **THEN** la sección de la decisión muestra `This import is cancelled. Its run and findings are kept for reference.` y ningún botón

#### Scenario: Import procesado
- **GIVEN** el import de `batch-issues` `processed` con su corrida y `currentBatchId`
- **WHEN** abre el paso Analysis
- **THEN** la sección de la decisión muestra `This import is processed. Its run and findings are kept for reference.` y el enlace **View settlement summary** al Settlement Summary de `currentBatchId`, ningún botón y nada que diga `cancelled`

#### Scenario: Cancelar y reprocesar (HU2 CA8)
- **WHEN** `analyst` pulsa **Cancel and reprocess** y confirma
- **THEN** se llama a `POST cancel`, el import muestra `cancelled` y la corrida, la tabla y los hallazgos siguen visibles en solo lectura

## REMOVED Requirements

### Requirement: Pantalla Analysis & Validations: acceso a Settlement Review
**Reason**: Settlement Review existe con este change; la entrada deshabilitada con `Settlement Review is not available yet.` y su escenario "Import validado antes de #13" dejan de ser ciertos.
**Migration**: Lo sustituye "Pantalla Analysis & Validations: enlace a Settlement Review" (ADDED), con el enlace real y solo con `settlement.process`.

## ADDED Requirements

### Requirement: Pantalla Analysis & Validations: enlace a Settlement Review
Con el import `validated` y `settlement.process`, la pantalla SHALL ofrecer **Settlement Review** como enlace a la pantalla Settlement Review de ese import. Sin el permiso SHALL NOT ofrecerlo: la pantalla de destino lo exige.

#### Scenario: Import validado
- **GIVEN** el import de `batch-issues` `validated`
- **WHEN** `analyst` abre el paso Analysis y pulsa **Settlement Review**
- **THEN** llega a Settlement Review de ese import

#### Scenario: Import validado visto por viewer
- **GIVEN** el import de `batch-issues` `validated`
- **WHEN** `viewer` abre el paso Analysis
- **THEN** ve `Reviewed by analyst on <fecha>` y ningún enlace ni botón **Settlement Review**
