# Spec Delta — import

Subida de uno o varios `.xlsx` de la plantilla para una cuenta, conservación del archivo original, lectura de hojas como texto y propuesta de pareo en la respuesta. README §1.2 "Importación de archivos con pareo revisado" e "Identidad", §3.2 "Importación", §4 (convenciones), §4.2, §4.4 filas Importación, HU1 criterios 1–3. Oráculo: `data/samples/batch-clean`, `batch-split` y `legacy-provider` con sus `expected.json`; los conteos por hoja salen de los propios `.xlsx` (APP 340, DEC 110, CHB 3, REF 7, RDR 3, RR 320, `Other Fees` 2, `Settings` 21; TRX 60, Fail 20, CB 1, Summary 1).

## ADDED Requirements

### Requirement: Subida de archivos de un import
`POST /api/v1/accounts/{id}/imports` SHALL exigir el permiso `settlement.process` y un cuerpo `multipart/form-data` con 1 a 10 partes `files`, cada una un `.xlsx` de como máximo 20 MiB (20 971 520 bytes). SHALL crear el `Import` en `uploaded` con `createdBy` el usuario de la petición y responder `201` con el detalle del import (archivos, hojas, propuesta de pareo, vista previa y `readiness`). Cualquier archivo rechazado SHALL impedir la creación del import completo.

#### Scenario: Plantilla en un archivo
- **GIVEN** `analyst` y la cuenta `ProviderA-USD`
- **WHEN** sube `data/samples/batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx`
- **THEN** recibe `201` con `status = "uploaded"`, `createdBy.userName = "analyst"`, un archivo con `fileName` igual al del cliente, `sizeBytes = 31510` y diez hojas con `rowCount` APP 340, DEC 110, CHB 3, REF 7, RDR 3, RR 320, `Duplicate Corrections` 0, `CHB Alerts` 0, `Other Fees` 2 y `Settings` 21
- **AND** la suma de `rowCount` de las hojas propuestas como `transactions` es 783, igual que `rows.read` de `expected.json`

#### Scenario: Batch repartido en dos archivos en una sola petición
- **WHEN** `analyst` sube `batch-split_part1.xlsx` y `batch-split_part2.xlsx` juntos a `ProviderA-USD`
- **THEN** recibe `201` con un solo `importId`, dos archivos (part1 con APP 340 y DEC 110; part2 con CHB 3, REF 7, RDR 3, RR 320 y `Other Fees` 2) y la propuesta calculada para las hojas de ambos

#### Scenario: Sin archivos
- **WHEN** se envía un `multipart/form-data` sin ninguna parte `files`, una petición que no es multipart, o un cuerpo multipart malformado (por ejemplo cortado antes del boundary de cierre)
- **THEN** recibe `400` con `code = "validation_error"` y no se crea ningún import

#### Scenario: Tipo no permitido
- **WHEN** una de las partes se llama `batch.csv` (o `.xls`, `.xlsm`, sin extensión)
- **THEN** recibe `400` con `code = "unsupported_file_type"` y `details.fileName`, no se crea el import y no queda ningún archivo en `UPLOAD_DIR`

#### Scenario: Tamaño excedido
- **WHEN** una parte `.xlsx` supera los 20 MiB
- **THEN** recibe `400` con `code = "file_too_large"` y `details.fileName`, y no se crea el import

#### Scenario: Más de diez archivos
- **WHEN** la petición trae once partes `files`
- **THEN** recibe `400` con `code = "too_many_files"` y no se crea el import

#### Scenario: Archivo ilegible
- **WHEN** una parte se llama `batch.xlsx` pero su contenido no es un paquete OOXML (por ejemplo un `.xls` renombrado, un libro protegido con contraseña o un zip sin `xl/workbook.xml`)
- **THEN** recibe `422` con `code = "file_unreadable"` y `details.fileName`, y no se crea el import

#### Scenario: Sin permiso
- **GIVEN** `viewer` (sin `settlement.process`)
- **WHEN** sube cualquier archivo a una cuenta de su alcance
- **THEN** recibe `403` con `code = "forbidden"`

#### Scenario: Cuenta fuera del alcance
- **GIVEN** `viewer` o `analyst` con permiso pero sin la cuenta en su alcance
- **WHEN** sube un archivo al `accountId` de una cuenta de otro merchant
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo que para un UUID inexistente, y no se crea ningún import

### Requirement: Archivo original conservado
Cada archivo aceptado SHALL guardarse sin modificar bajo `UPLOAD_DIR`, en una ruta formada solo por identificadores del sistema (`imports/<importId>/<fileId>.xlsx`), nunca por el nombre que envió el cliente, que SHALL conservarse únicamente en `fileName` (sin componentes de directorio, máximo 255 caracteres). `sha256` SHALL ser la huella hexadecimal en minúsculas de los bytes recibidos y `sizeBytes` su tamaño exacto.

#### Scenario: Bytes idénticos y nombre aislado
- **WHEN** se sube `Recon_Template_ProviderA-USD_batch-clean.xlsx`
- **THEN** `sha256 = "c46857d3b6580aba6daf6b63b66e67583b399cd356a71bd16e659bc252128352"`, el archivo en `storagePath` tiene exactamente esos bytes y esa huella, y `storagePath` no contiene el texto `Recon_Template`

#### Scenario: Nombre con ruta
- **WHEN** el cliente envía la parte con `filename = "..\\..\\evil.xlsx"`
- **THEN** `fileName = "evil.xlsx"` y el archivo se guarda bajo `imports/<importId>/`, nunca fuera de `UPLOAD_DIR`

### Requirement: Añadir y quitar archivos antes de analizar
`POST /api/v1/imports/{id}/files` (mismo cuerpo multipart y mismas reglas que la subida) y `DELETE /api/v1/imports/{id}/files/{fileId}` SHALL exigir `settlement.process` y SHALL aceptarse solo con el import en `uploaded` o `mapped`; en otro estado SHALL responder `409` con `code = "import_not_editable"`. Ambos SHALL responder `200` con el detalle completo del import y la propuesta recalculada, sin tocar las hojas de los archivos que no cambian.

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

### Requirement: Imports de una cuenta
`GET /api/v1/accounts/{id}/imports` SHALL responder `200` con los resúmenes de los imports de la cuenta, del más reciente al más antiguo, sin hojas ni propuesta. `status=` SHALL filtrar por un estado de `Import`; un valor fuera del vocabulario SHALL responder `400 validation_error`. Cuenta inexistente o fuera del alcance SHALL responder `404`.

#### Scenario: Lista tras una subida
- **GIVEN** un import recién creado con dos archivos en `ProviderA-USD`
- **WHEN** `viewer` llama a `GET /api/v1/accounts/{id}/imports?status=uploaded`
- **THEN** recibe `200` con ese import con `importId`, `accountId`, `status = "uploaded"`, `createdBy = { userId, userName: "analyst" }`, `createdAt`, `updatedAt`, `analyzedAt = null`, `rowsTotal = null`, `rowsMatched = null`, `rowsUnmatched = null`, `currentBatchId = null` y `fileCount = 2`

#### Scenario: Filtro sin coincidencias y cuenta ajena
- **WHEN** `viewer` pide `?status=processed` de `ProviderA-USD`
- **THEN** recibe `200` con `[]`
- **AND** `GET /api/v1/accounts/{id}/imports` con el `accountId` de `ProviderC-USD` responde `404` con `code = "not_found"`

### Requirement: Detalle de un import
`GET /api/v1/imports/{id}` SHALL responder `200` con la misma forma que la respuesta de la subida: archivos ordenados por `uploadedAt`, hojas en el orden del libro con su `sheetId` estable, propuesta de pareo recalculada con las reglas vigentes de la cuenta, vista previa y `readiness`. `importId` mal formado SHALL responder `400`; inexistente o fuera del alcance, `404`.

#### Scenario: Retomar un import
- **GIVEN** el import creado con `batch-clean`
- **WHEN** `analyst` llama a `GET /api/v1/imports/{id}`
- **THEN** el cuerpo es igual al que devolvió `POST` (mismos `fileId`, `sheetId`, `rowCount`, `proposed`, `columns`, `preview` y `readiness`)

#### Scenario: Import de otro merchant
- **GIVEN** un import de `ProviderC-Alt` (merchant 2)
- **WHEN** `viewer` lo pide
- **THEN** recibe `404` con `code = "not_found"`, igual que para `GET /api/v1/imports/00000000-0000-4000-8000-00000000ffff`

### Requirement: Celdas leídas como texto
El lector SHALL devolver toda celda como texto, tomando el valor tal como está escrito en el archivo, sin pasar nunca por un número de coma flotante. Excel no conserva más de 15 dígitos significativos en una celda numérica: una celda numérica con notación científica o más de 15 dígitos SHALL detectarse como pérdida de precisión ya presente en el archivo (nunca ocultarse). `preview` SHALL traer como máximo las cinco primeras filas de datos de cada hoja como objetos `cabecera → texto`.

#### Scenario: Vista previa como texto
- **WHEN** se sube `batch-clean`
- **THEN** la primera fila de `preview` de APP es `{ "ID": "252570479111759", "Amount": "16.22", "Currency": "USD" }`, con los tres valores de tipo string

#### Scenario: ID numérico de 17 dígitos
- **GIVEN** un libro cuya celda A2 es numérica (`t="n"`) con el texto `12345678901234567`
- **WHEN** se lee la hoja
- **THEN** la vista previa muestra el texto del archivo (`"12345678901234567"`) y la columna cuenta una celda numérica con pérdida de precisión

#### Scenario: ID numérico en notación científica
- **GIVEN** un libro cuya celda A2 es numérica con el texto `1.2345678901234567E16`
- **WHEN** se lee la hoja
- **THEN** la vista previa muestra `"1.2345678901234567E16"` y la columna cuenta una celda numérica con pérdida de precisión, mientras que una celda numérica `4512308877` (10 dígitos) no cuenta como pérdida

#### Scenario: Celda numérica con el valor crudo de Excel
- **WHEN** la última fila de APP de `batch-clean` trae `Amount` escrito como `72.09999999999999`
- **THEN** el texto leído es exactamente `"72.09999999999999"`

### Requirement: Cabeceras, conteo de filas y hojas ocultas
La fila 1 de cada hoja SHALL ser la cabecera: cada nombre se recorta, un nombre vacío se sustituye por `Column <letra>` y los repetidos se distinguen con ` (2)`, ` (3)`. `rowCount` SHALL contar las filas posteriores a la cabecera con al menos una celda con valor, texto o fórmula. Cada hoja SHALL indicar `hidden`.

#### Scenario: Fila residual de suma
- **WHEN** CHB, REF y RDR de `batch-clean` terminan con una fila cuya celda `ID` está vacía y `Amount` es una fórmula `=SUM(...)`
- **THEN** esa fila cuenta en `rowCount` (CHB 3, REF 7, RDR 3) y su `ID` en la vista previa es `""`

#### Scenario: Hoja oculta y cabecera vacía
- **WHEN** se lee la hoja `Settings` de la plantilla
- **THEN** `hidden = true`, `rowCount = 21` y las columnas son `Chargeback Alert Fee Types`, `Column B` y `Non-Transactional Fees`

#### Scenario: Cabeceras repetidas
- **GIVEN** una hoja con cabecera `ID, Amount, Amount`
- **WHEN** se lee
- **THEN** las columnas son `ID`, `Amount` y `Amount (2)`

### Requirement: Propuesta de pareo en la respuesta
Cada hoja SHALL traer `proposed` (`kind`, `cycle`, `statusId`, `statusName`, `source` ∈ `account` | `global` | `none`, `note` opcional) y `columns` (`sourceColumn`, `targetField` o `null`, `source`). Una columna propuesta como `status` SHALL traer además `statusValues` con cada valor distinto de la hoja resuelto por alias (`statusId`, `statusName`, `excludeAmount`).

#### Scenario: Propuesta de la plantilla estándar
- **WHEN** se sube `batch-clean` a `ProviderA-USD` (cuenta sin conjunto de reglas)
- **THEN** APP → `{ kind: transactions, cycle: E, statusId: 2, statusName: "Successful", source: global }`, DEC → E/3 "Declined", CHB → I/4 "Chargeback", REF → I/5 "Refund", RDR → I/6 "RDR", RR → `{ kind: transactions, cycle: R, statusId: null }`, `Other Fees` → `{ kind: batch_fees, cycle: null, statusId: null }`, y `Duplicate Corrections`, `CHB Alerts` y `Settings` → `{ kind: ignore }` con `note`, todas con `source = global`
- **AND** en las seis hojas de transacciones `ID → transactionId`, `Amount → amount`, `Currency → currency` con `source = global`; en `Other Fees`, `Type of Fee → feeType`

#### Scenario: Propuesta del conjunto legacy
- **WHEN** se sube `legacy-provider` a `ProviderC-Alt`
- **THEN** TRX → `{ kind: transactions, cycle: E, statusId: null, source: account }`, Fail → E/3 "Declined" `account`, CB → I sin estado `account`, Summary → `ignore` `account`; `Merchant Order No# → transactionId`, `Order Status → status`, `Amount USD → amount` con `source = account`
- **AND** la columna `Order Status` de CB trae `statusValues = [{ value: "CHB 2", statusId: 4, statusName: "Chargeback", excludeAmount: true }]` y la de Fail `[{ value: "Failed", statusId: 3, statusName: "Declined", excludeAmount: false }]`

#### Scenario: Hoja y columna sin propuesta
- **GIVEN** un libro con una hoja `Bonus` cuya cabecera es `Reference, Importe`
- **WHEN** se sube a una cuenta sin conjunto de reglas
- **THEN** la hoja trae `proposed = { kind: null, cycle: null, statusId: null, source: none }` y ambas columnas `targetField = null` y `source = none`

#### Scenario: Persistencia de la propuesta de hoja
- **WHEN** se sube `batch-clean`
- **THEN** cada `ImportSheet` guarda `kind`, `cycle`, `statusId` y `rowCount` de la propuesta con `mappingConfirmed = false`, y no existe ninguna fila de `ImportSheetColumnMap`

#### Scenario: Marcador de hoja sin propuesta
- **GIVEN** una hoja que no coincide con ninguna regla
- **WHEN** se persiste
- **THEN** `ImportSheet.kind` guarda `ignore` únicamente como marcador de "sin propuesta" (la columna no admite NULL), la respuesta la muestra con `kind = null` y `source = none`, y la hoja no puede analizarse hasta que el pareo se confirme

### Requirement: Readiness de la propuesta
La respuesta SHALL traer `readiness` con `canAnalyze`, `missing` (lo que impide analizar con el pareo tal como está) y `notes` (lo que conviene revisar), cada elemento con `sheetId`, `sheetName` y `message`. `canAnalyze` SHALL ser `true` exactamente cuando `missing` está vacío.

#### Scenario: Plantilla lista para analizar
- **WHEN** se sube `batch-clean` a `ProviderA-USD`
- **THEN** `readiness.canAnalyze = true`, `missing = []` y `notes` incluye una entrada por cada hoja ignorada (`Duplicate Corrections`, `CHB Alerts`, `Settings`) y una por la hoja `Settings` oculta

#### Scenario: Legacy listo para analizar
- **WHEN** se sube `legacy-provider` a `ProviderC-Alt`
- **THEN** `readiness.canAnalyze = true` y `missing = []`

#### Scenario: Hoja sin propuesta bloquea
- **GIVEN** un libro con una hoja `Bonus` que no coincide con ninguna regla
- **WHEN** se sube
- **THEN** `readiness.canAnalyze = false` y `missing` contiene `{ sheetName: "Bonus", message }` pidiendo clasificarla como `transactions`, `batch_fees` o `ignore`

#### Scenario: IDs numéricos con pérdida de precisión
- **GIVEN** un libro cuya hoja `APP` trae en la columna `ID` dos celdas numéricas con notación científica o más de 15 dígitos
- **WHEN** se sube a `ProviderA-USD`
- **THEN** `readiness.notes` contiene `{ sheetName: "APP", message }` indicando 2 celdas con pérdida de precisión que se rechazarán al analizar, y `readiness.canAnalyze` no cambia por ello

### Requirement: Límites de lectura del archivo
Antes de parsear, el lector SHALL rechazar con `400 file_too_large` un `.xlsx` cuyo contenido descomprimido supere 64 MiB en total, una hoja con más de 200 000 filas o más de 256 columnas, o un paquete con más de 10 000 entradas; SHALL detenerse al superar el límite sin descomprimir el resto. Un `.xlsx` sin ninguna hoja SHALL rechazarse con `422 file_unreadable`.

#### Scenario: Bomba de descompresión
- **GIVEN** un `.xlsx` de pocos KB cuya hoja se descomprime a más del límite
- **WHEN** se sube
- **THEN** recibe `400` con `code = "file_too_large"` y `details.fileName`, la lectura se interrumpe al superar el límite y no se crea el import

#### Scenario: Justo en el límite
- **GIVEN** un `.xlsx` cuyo contenido descomprimido suma exactamente 64 MiB y otro que suma un byte más
- **WHEN** se leen
- **THEN** el primero se acepta y el segundo responde `400 file_too_large`
- **AND** una hoja con exactamente 200 000 filas de datos se acepta y una con 200 001 responde `400 file_too_large`

#### Scenario: Muestras dentro de los límites
- **WHEN** se suben las cinco muestras de `data/samples`
- **THEN** ninguna supera los límites (la mayor se descomprime a menos de 200 KB) y todas responden `201`

## MODIFIED Requirements

### Requirement: Varios archivos por import
El sistema SHALL aceptar uno o varios archivos `.xlsx` en un mismo import de una cuenta y tratarlos como un solo batch. El mismo archivo (mismo `sha256`) no se admite dos veces en el mismo import, ni dentro de una misma petición, y el rechazo SHALL responder `409` con `code = "duplicate_file"` y `details = { fileId, fileName }` del archivo ya incluido (`fileId = null` si la coincidencia es entre dos partes de la misma petición). El mismo archivo SHALL poder subirse a otro import (por ejemplo tras cancelar y reprocesar).

#### Scenario: Batch repartido en dos archivos
- GIVEN la cuenta ProviderA-USD y los archivos `part1.xlsx` (APP, DEC) y `part2.xlsx` (CHB, REF, RDR, RR, Other Fees) de `data/samples/batch-split`
- WHEN se crea un import con ambos
- THEN las filas leídas, cruzadas y los totales son idénticos a los de `data/samples/batch-clean/expected.json`

#### Scenario: Archivo duplicado
- WHEN se añade un archivo cuyo `sha256` ya está en el import
- THEN se rechaza con 409 y el import no cambia

#### Scenario: Duplicado con el nombre del coincidente
- **GIVEN** el import creado con `batch-split_part1.xlsx` y `batch-split_part2.xlsx`
- **WHEN** `analyst` vuelve a subir `part1.xlsx` con `POST /api/v1/imports/{id}/files`
- **THEN** recibe `409` con `code = "duplicate_file"`, `details.fileName = "Recon_Template_ProviderA-USD_batch-split_part1.xlsx"` y `details.fileId` el del archivo original, y `GET /api/v1/imports/{id}` sigue mostrando exactamente dos archivos

#### Scenario: Duplicado dentro de la misma petición
- **WHEN** una sola petición trae dos veces el mismo `.xlsx` (mismos bytes, aunque cambie el nombre)
- **THEN** recibe `409 duplicate_file` con `details.fileId = null`, y no se crea el import ni queda ningún archivo en `UPLOAD_DIR`

#### Scenario: Mismo archivo en dos imports
- **GIVEN** un import de `ProviderA-USD` que ya contiene `batch-clean.xlsx`
- **WHEN** se crea otro import en la misma cuenta con el mismo archivo
- **THEN** recibe `201` con un `importId` distinto

### Requirement: Solo ID es obligatorio
El sistema SHALL poder analizar una hoja de transacciones cuando tiene identificada la columna `transactionId`; `amount` y `currency` son opcionales y solo generan advertencias. Ya en la propuesta de la subida, `readiness.missing` SHALL nombrar cada hoja `transactions` sin columna propuesta como `transactionId` y cada hoja de ciclo E o I sin estado fijo ni columna `status`; las hojas de ciclo R no necesitan estado.

#### Scenario: Hoja sin columna ID
- WHEN una hoja `kind = transactions` no tiene ninguna columna pareada como `transactionId`
- THEN el import no puede pasar a `analyzed` y la hoja aparece marcada como "falta ID"

#### Scenario: Readiness al subir
- **GIVEN** un libro con una hoja `APP` cuya cabecera es `Reference, Amount, Currency`
- **WHEN** se sube a `ProviderA-USD`
- **THEN** `readiness.canAnalyze = false` y `missing` contiene `{ sheetName: "APP", message }` indicando que no hay columna propuesta como `transactionId`

#### Scenario: Hoja de ciclo I sin forma de obtener el estado
- **GIVEN** una cuenta cuyo conjunto de reglas parea la hoja `CB` a ciclo I sin estado fijo
- **WHEN** el archivo trae `CB` con cabecera `Merchant Order No#, Amount USD` (sin columna de estado)
- **THEN** `readiness.missing` nombra `CB` por falta de estado, mientras que una hoja `RR` (ciclo R) sin estado no aparece en `missing`

### Requirement: Ciclo y estado por hoja
El ciclo (`E`/`I`/`R`) de cada fila SHALL venir de la regla de hoja (o del pareo confirmado), nunca del estado. La hoja `RR` SHALL asignar ciclo `R` sin estado. `Other Fees` SHALL leerse como `batch_fees`; `Duplicate Corrections`, `CHB Alerts` y `Settings` SHALL ignorarse con aviso. La propuesta de la subida SHALL reflejar exactamente esa asignación por hoja con su origen.

#### Scenario: Plantilla estándar
- WHEN se importa `data/samples/batch-clean`
- THEN APP→E/Successful, DEC→E/Declined, CHB→I/Chargeback, REF→I/Refund, RDR→I/RDR, RR→R, `Other Fees`→batch_fees (2 fees prellenados), y 3 hojas ignoradas con aviso

#### Scenario: Propuesta por hoja al subir
- **WHEN** se sube `batch-clean` y todavía no se ha confirmado nada
- **THEN** la respuesta propone APP→E/`Successful`, DEC→E/`Declined`, CHB→I/`Chargeback`, REF→I/`Refund`, RDR→I/`RDR`, RR→R sin estado, `Other Fees`→`batch_fees` y las tres hojas restantes → `ignore` con `note`, todas con `source = global`, y `readiness.notes` avisa de cada hoja ignorada

### Requirement: Importes positivos y moneda de referencia
`Amount` SHALL leerse siempre positivo (el sistema aplica el signo por ciclo); un negativo es advertencia. `Currency` SHALL conservarse como referencia (ISO-3) sin bloquear ni comparar; el importe procesado es siempre el USD del gateway. En la subida, `Amount` y `Currency` SHALL aparecer en la vista previa como texto tal cual, sin signo aplicado ni conversión.

#### Scenario: Importe y moneda en la vista previa
- **WHEN** se sube `batch-clean`
- **THEN** la primera fila de `preview` de RR trae `Amount = "2.27"` y `Currency = "USD"` como texto, y ninguna celda de la vista previa es un número JSON
