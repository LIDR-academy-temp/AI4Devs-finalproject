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

### Requirement: Pantalla Upload Files: tope de archivos del import
Cuando añadir archivos a un import responde `409 import_file_limit_reached`, la pantalla SHALL mostrar cada archivo de la selección como rechazado con el motivo, que dice cuántos archivos tiene el import y el tope, sin afectar a los archivos ya incluidos ni al pareo en edición.

#### Scenario: Import con diez archivos
- **GIVEN** un import con diez archivos en Upload Files
- **WHEN** `analyst` suelta otro `.xlsx` y el API responde `409 import_file_limit_reached` con `details = { limit: 10, current: 10, adding: 1 }`
- **THEN** ve el archivo con `This import already has 10 files, the most it can hold. Remove one before adding another.` y el import sigue con sus diez archivos

## MODIFIED Requirements

### Requirement: Añadir y quitar archivos antes de analizar
`POST /api/v1/imports/{id}/files` (mismo cuerpo multipart y mismas reglas que la subida) y `DELETE /api/v1/imports/{id}/files/{fileId}` SHALL exigir `settlement.process` y SHALL aceptarse solo con el import en `uploaded` o `mapped`; en otro estado SHALL responder `409` con `code = "import_not_editable"`. Ambos SHALL responder `200` con el detalle completo del import y la propuesta recalculada, sin tocar las hojas de los archivos que no cambian ni su pareo confirmado. Un import SHALL tener como máximo 10 archivos: un `POST files` que lo superaría SHALL responder `409 import_file_limit_reached` con `details = { limit, current, adding }` sin leer ni guardar ningún archivo.

#### Scenario: Añadir la segunda parte
- **GIVEN** un import de `ProviderA-USD` creado con `batch-split_part1.xlsx`
- **WHEN** `analyst` añade `batch-split_part2.xlsx`
- **THEN** recibe `200` con dos archivos, los `sheetId` del primer archivo sin cambios y la propuesta cubriendo las hojas de los dos

#### Scenario: Quitar un archivo
- **GIVEN** el import con las dos partes
- **WHEN** `analyst` borra el `fileId` de part2
- **THEN** recibe `200` con un solo archivo, sus hojas desaparecen de la respuesta y el archivo deja de existir en `UPLOAD_DIR`

#### Scenario: Quitar el último archivo
- **WHEN** se borra el único archivo del import
- **THEN** recibe `200` con `files = []`, el import sigue en `uploaded` y `readiness.canAnalyze = false`

#### Scenario: Archivo o import desconocidos
- **WHEN** el `fileId` no pertenece al import, o el `importId` no existe o es de un merchant fuera del alcance
- **THEN** recibe `404` con `code = "not_found"`

#### Scenario: Import ya analizado
- **GIVEN** un import en `analyzed`, `validated`, `processed` o `cancelled`
- **WHEN** se intenta añadir o quitar un archivo
- **THEN** recibe `409` con `code = "import_not_editable"` y `details.status` con el estado actual, y el import no cambia

#### Scenario: Archivo añadido tras confirmar
- **GIVEN** un import en `mapped` con `part1.xlsx` confirmado
- **WHEN** `analyst` añade `part2.xlsx`
- **THEN** recibe `200`, el import sigue en `mapped`, las hojas de `part1` conservan `mappingConfirmed = true` y su `mapping`, las de `part2` llegan con `mappingConfirmed = false` y `mapping = null`, y un `POST analyze` inmediato responde `422 mapping_incomplete` nombrando cada hoja de `part2` con `field = "confirmation"`

#### Scenario: Tope de archivos del import
- **GIVEN** un import en `uploaded` con 9 archivos
- **WHEN** `analyst` añade dos archivos en una petición
- **THEN** recibe `409` con `code = "import_file_limit_reached"` y `details = { limit: 10, current: 9, adding: 2 }`, el import sigue con 9 archivos y no queda ningún archivo nuevo en `UPLOAD_DIR`
- **AND** añadir uno solo responde `200` con 10 archivos, y después cualquier `POST files` responde `409 import_file_limit_reached` con `current = 10`

#### Scenario: Quitar libera el hueco
- **GIVEN** un import con 10 archivos
- **WHEN** `analyst` borra uno y añade otro
- **THEN** las dos peticiones responden `200` y el import vuelve a tener 10 archivos

### Requirement: Detalle de un import
`GET /api/v1/imports/{id}` SHALL responder `200` con la misma forma que la respuesta de la subida: archivos ordenados por `uploadedAt`, hojas en el orden del libro con su `sheetId` estable, propuesta de pareo recalculada, pareo confirmado (`mappingConfirmed`, `mapping`), vista previa y `readiness`, más `analysis`, `channels` y `batchFees` (`null` hasta que el import se analiza). `analysis` SHALL incluir `rows.unmatchedByReason`, `requiresEmptyBatchConfirmation` y `likelyWrongAccount`. `importId` mal formado SHALL responder `400`; inexistente o fuera del alcance, `404`.

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

### Requirement: Aviso de canales
Tras el análisis, `channels` SHALL listar cada canal de las transacciones asociadas con `channelId`, `name`, `gatewayId`, `providerId`, `rowCount` y `assignment`: `assigned` (la cuenta del import es su principal), `unassigned` (sin fila en `AccountChannel`) o `assigned_to_other_account` (otra cuenta es la principal), con `otherAccount = { accountId, name }` en ese caso y `null` en los demás, y una `note` cuando procesar cambiará la asociación. Un canal de otro proveedor que el de la cuenta SHALL llevar `otherProvider: true` y la `note` de canal ajeno, nunca la de asociación. Ordenados por `channelId`.

#### Scenario: Canal nuevo en el batch limpio
- **GIVEN** `batch-clean` analizado en `ProviderA-USD`
- **WHEN** se consulta `channels`
- **THEN** contiene RAM-01 (1001) y RAM-02 (1002) con `assignment = "assigned"` y RAM-07 (1007) con `assignment = "unassigned"`, `otherAccount = null` y `note` indicando que se asociará a esta cuenta al procesar; ningún otro canal aparece y ninguno lleva `otherProvider`

#### Scenario: Canal nuevo del proveedor B
- **GIVEN** `batch-issues` analizado en `ProviderB-Main`
- **WHEN** se consulta `channels`
- **THEN** RAM-13 (1013) aparece con `assignment = "unassigned"` y RAM-11, RAM-12 con `assigned`

#### Scenario: Canal principal de otra cuenta
- **GIVEN** un import analizado en `ProviderA-USD` con una fila de una transacción de RAM-03 (1003, Provider A, principal en `ProviderA-EUR`)
- **WHEN** se consulta `channels`
- **THEN** RAM-03 aparece con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-EUR"`, sin `otherProvider` y con la `note` de que esta cuenta pasará a ser su principal al procesar

#### Scenario: Canal de otro proveedor
- **GIVEN** `batch-blocked` analizado en `ProviderB-Main`
- **WHEN** se consulta `channels`
- **THEN** RAM-01 (1001) aparece con `assignment = "assigned_to_other_account"`, `otherAccount.name = "ProviderA-USD"`, `providerId = 101`, `rowCount = 1`, `otherProvider = true` y `note = "Channel of another provider: its rows are not processed in this account"`
- **AND** la `note` no dice que esta cuenta pasará a ser su principal

### Requirement: Canal de otro merchant en el aviso de canales
Cuando un canal de `channels` pertenece a un merchant fuera del alcance de quien consulta, la entrada SHALL conservar `channelId`, `gatewayId`, `rowCount` y `assignment`, y SHALL devolver `name = null`, `providerId = null`, `outOfScope = true` y `otherProvider = true` (el canal de otro merchant siempre es de otro proveedor), con la `note` de canal ajeno. Para quien sí tiene ese merchant en su alcance la entrada no lleva `outOfScope`, y sí `otherProvider`.

#### Scenario: Canal de otro merchant
- **GIVEN** un import analizado de `ProviderA-USD` con una fila asociada a una transacción de un canal de otro merchant en un gateway compartido
- **WHEN** consulta el detalle un usuario cuyo alcance no incluye ese merchant
- **THEN** el canal aparece con su `channelId`, `rowCount` y `assignment`, `name = null`, `providerId = null`, `outOfScope = true` y `otherProvider = true`, y ni su nombre ni su proveedor aparecen en la respuesta
