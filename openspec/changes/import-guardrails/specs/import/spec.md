## ADDED Requirements

### Requirement: Import sin filas asociadas
Tras el análisis, `analysis` SHALL traer `requiresEmptyBatchConfirmation` (ninguna fila `matched` de las hojas `transactions` cuya transacción sea del proveedor de la cuenta; una ambigua resuelta cuenta como `matched`), `likelyWrongAccount` (lo anterior, al menos una fila `unmatched` y todas con `reason = "id_format"`) y `rows.unmatchedByReason` con los cuatro motivos de `unmatched`, en 0 cuando no hay. No es una validación ni cambia la corrida.

#### Scenario: Archivo de otra cuenta
- **GIVEN** `data/samples/batch-wrong-account` (IDs UUID de `ProviderC-USD`) analizado en `ProviderA-USD`, cuyos canales son solo del gateway numérico
- **WHEN** se consulta `GET /api/v1/imports/{id}`
- **THEN** `analysis.rows` trae `total`, `matched = 0` y `unmatched` de `expected.rows`, y `unmatchedByReason = { no_match: 0, id_format: <expected.rows.unmatched>, lossy_numeric_id: 0, no_gateways: 0 }`
- **AND** `analysis.requiresEmptyBatchConfirmation = true`, `analysis.likelyWrongAccount = true`, `channels = []` y `batchFees` trae el fee de `Other Fees`

#### Scenario: Batch con filas asociadas
- **GIVEN** `batch-clean` analizado
- **THEN** `requiresEmptyBatchConfirmation = false`, `likelyWrongAccount = false` y `unmatchedByReason` vale 0 en los cuatro motivos

#### Scenario: Sin asociar por otros motivos
- **GIVEN** un import analizado sin filas `matched`, con una fila `id_format` y otra `no_match`
- **THEN** `requiresEmptyBatchConfirmation = true` y `likelyWrongAccount = false`

#### Scenario: Solo filas ignoradas
- **GIVEN** un import analizado cuyas hojas de transacciones solo traen filas sin ID (ignoradas)
- **THEN** `requiresEmptyBatchConfirmation = true`, `likelyWrongAccount = false` y `unmatchedByReason` vale 0 en los cuatro motivos

#### Scenario: Ambigua resuelta
- **GIVEN** un import analizado cuya única fila de transacciones era `ambiguous` y se resolvió con `PATCH rows`
- **THEN** `requiresEmptyBatchConfirmation = false`

#### Scenario: Solo filas de otro proveedor
- **GIVEN** un import analizado cuyas filas `matched` son todas de transacciones de otro proveedor
- **THEN** `requiresEmptyBatchConfirmation = true`, y la corrida de validaciones sigue bloqueada por `provider_mismatch`, que se comprueba antes

### Requirement: Tope de archivos por import
Un import SHALL tener como máximo 10 archivos, se suban en una petición o en varias. Un `POST /api/v1/imports/{id}/files` que lo superaría SHALL responder `409 import_file_limit_reached` con `details = { limit, current, adding }`, sin leer ni guardar ningún archivo. Más de 10 partes en una sola petición sigue siendo `400 too_many_files`.

#### Scenario: Tope de archivos del import
- **GIVEN** un import en `uploaded` con 9 archivos
- **WHEN** `analyst` añade dos archivos en una petición
- **THEN** recibe `409` con `code = "import_file_limit_reached"` y `details = { limit: 10, current: 9, adding: 2 }`, el import sigue con 9 archivos y no queda ningún archivo nuevo en `UPLOAD_DIR`
- **AND** añadir uno solo responde `200` con 10 archivos, y después cualquier `POST files` responde `409 import_file_limit_reached` con `current = 10`

#### Scenario: Quitar libera el hueco
- **GIVEN** un import con 10 archivos
- **WHEN** `analyst` borra uno y añade otro
- **THEN** las dos peticiones responden `200` y el import vuelve a tener 10 archivos

### Requirement: Canal de otro proveedor en el aviso de canales
Un canal de `channels` de otro proveedor que el de la cuenta del import SHALL llevar `otherProvider: true` y `note = "Channel of another provider: its rows are not processed in this account"`, nunca la `note` de asociación, con el mismo `assignment` que cualquier otro canal. Un canal de un merchant fuera del alcance de quien consulta SHALL llevar también `otherProvider: true`. Un canal del proveedor de la cuenta no SHALL llevar `otherProvider`.

#### Scenario: Canal de otro proveedor
- **GIVEN** `batch-blocked` analizado en `ProviderB-Main`
- **WHEN** se consulta `channels`
- **THEN** RAM-01 (1001) aparece con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-USD"`, `providerId = 101`, `rowCount = 1`, `otherProvider = true` y `note = "Channel of another provider: its rows are not processed in this account"`
- **AND** la `note` no dice que esta cuenta pasará a ser su principal

#### Scenario: Canal de otro merchant
- **GIVEN** un import analizado de `ProviderA-USD` con una fila asociada a una transacción de un canal de otro merchant en un gateway compartido
- **WHEN** consulta el detalle un usuario cuyo alcance no incluye ese merchant
- **THEN** el canal aparece con `name = null`, `providerId = null`, `outOfScope = true`, `otherProvider = true` y la `note` de canal ajeno

#### Scenario: Canal del mismo proveedor principal en otra cuenta
- **GIVEN** un import analizado en `ProviderA-USD` con una fila de una transacción de RAM-03 (1003, Provider A, principal en `ProviderA-EUR`)
- **WHEN** se consulta `channels`
- **THEN** RAM-03 aparece con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-EUR"`, sin `otherProvider` y con la `note` de que esta cuenta pasará a ser su principal al procesar

#### Scenario: Canales del batch limpio
- **GIVEN** `batch-clean` analizado en `ProviderA-USD`
- **THEN** ningún canal de `channels` lleva `otherProvider`

### Requirement: Pantalla Upload Files: tope de archivos del import
Cuando añadir archivos a un import responde `409 import_file_limit_reached`, la pantalla SHALL mostrar cada archivo de la selección como rechazado con el motivo, que dice cuántos archivos tiene el import y el tope, sin afectar a los archivos ya incluidos ni al pareo en edición.

#### Scenario: Import con diez archivos
- **GIVEN** un import con diez archivos en Upload Files
- **WHEN** `analyst` suelta otro `.xlsx` y el API responde `409 import_file_limit_reached` con `details = { limit: 10, current: 10, adding: 1 }`
- **THEN** ve el archivo con `This import already has 10 files, the most it can hold. Remove one before adding another.` y el import sigue con sus diez archivos

## MODIFIED Requirements

### Requirement: Detalle de un import
`GET /api/v1/imports/{id}` SHALL responder `200` con la misma forma que la respuesta de la subida: archivos ordenados por `uploadedAt`, hojas en el orden del libro con su `sheetId` estable, propuesta de pareo recalculada, pareo confirmado (`mappingConfirmed`, `mapping`), vista previa y `readiness`, más `analysis`, `channels` y `batchFees` (`null` hasta que el import se analiza). `importId` mal formado SHALL responder `400`; inexistente o fuera del alcance, `404`.

#### Scenario: Retomar un import
- **GIVEN** el import creado con `batch-clean`
- **WHEN** `analyst` llama a `GET /api/v1/imports/{id}`
- **THEN** el cuerpo es igual al que devolvió `POST` (mismos `fileId`, `sheetId`, `rowCount`, `proposed`, `columns`, `preview` y `readiness`), cada hoja trae `mappingConfirmed = false` y `mapping = null`, y `analysis`, `channels` y `batchFees` son `null`

#### Scenario: Import de otro merchant
- **GIVEN** un import de `ProviderC-Alt` (merchant 2)
- **WHEN** `viewer` lo pide
- **THEN** recibe `404` con `code = "not_found"`, igual que para `GET /api/v1/imports/00000000-0000-4000-8000-00000000ffff`

#### Scenario: Detalle de un import analizado
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** `viewer` llama a `GET /api/v1/imports/{id}`
- **THEN** el cuerpo es igual al que devolvió `POST analyze`: `status = "analyzed"`, cada hoja con `mappingConfirmed = true` y su `mapping`, `analysis.rows` (con `unmatchedByReason`), `analysis.byCycle`, `analysis.warnings`, `analysis.requiresEmptyBatchConfirmation = false`, `analysis.likelyWrongAccount = false`, `channels` con RAM-01, RAM-02 y RAM-07, y `batchFees` con dos fees
