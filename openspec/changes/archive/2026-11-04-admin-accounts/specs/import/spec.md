# Delta — import

## ADDED Requirements

### Requirement: Cuenta cerrada no admite imports nuevos
`POST /api/v1/accounts/{id}/imports` sobre una cuenta cerrada (`isActive = false`) SHALL responder `409` con `code = "account_inactive"` sin crear el import ni dejar archivos en `UPLOAD_DIR`. El permiso y el alcance se comprueban antes. Los imports ya creados de la cuenta SHALL seguir su curso: listarlos, añadir o quitar archivos, confirmar el pareo, analizar, validar, procesar y cancelar no cambian por el cierre.

#### Scenario: Subida a una cuenta cerrada
- **GIVEN** una cuenta `bruno-` cerrada
- **WHEN** `analyst` sube `data/samples/batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx` a ella
- **THEN** recibe `409` con `code = "account_inactive"` y la cuenta no tiene ningún import nuevo

#### Scenario: Cuenta cerrada fuera del alcance
- **GIVEN** una cuenta cerrada de un merchant fuera del alcance de `viewer`
- **WHEN** `viewer` sube un archivo a ella
- **THEN** recibe `403` con `code = "forbidden"`, porque no tiene `settlement.process`; y un usuario con el permiso y sin ese merchant recibe `404`, nunca `409`

#### Scenario: Import abierto de una cuenta que se cierra
- **GIVEN** un import en `uploaded` de una cuenta que después se cierra
- **WHEN** el analista confirma el pareo y lo analiza
- **THEN** las dos acciones responden como con la cuenta abierta

#### Scenario: Reabrir permite subir otra vez
- **GIVEN** una cuenta cerrada y después reabierta
- **WHEN** `analyst` sube un archivo a ella
- **THEN** recibe `201`
