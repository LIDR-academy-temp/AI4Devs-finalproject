# matching

## Purpose
Reglas que convierten nombres de hoja y columna en ciclo, estado y campos; conjuntos por proveedor y reglas globales. README §3.2 "Reglas de pareo", §1.2.

## Requirements

### Requirement: Reglas globales y conjuntos por proveedor
Las reglas con `ruleSetId NULL` SHALL actuar como valores por defecto; una regla del conjunto enlazado a la cuenta SHALL prevalecer sobre la global con el mismo patrón; una cuenta sin conjunto SHALL usar solo las globales. La propuesta SHALL evaluar primero las reglas activas del conjunto de la cuenta y, si ninguna coincide, las globales; dentro de cada grupo gana la de menor `priority`; a igualdad, la de columna con `sheetPattern` antes que la genérica y luego la guardada antes.

#### Scenario: Conjunto legacy del proveedor C
- **GIVEN** la cuenta ProviderC-Alt enlazada a "Provider C legacy"
- **WHEN** se importa `data/samples/legacy-provider`, se confirma la propuesta tal cual y se analiza
- **THEN** la propuesta es TRX→E con estado por columna `Order Status`, Fail→E/Declined, CB→I con estado por columna, Summary→ignore, `Merchant Order No#`→transactionId, `Amount USD`→amount; y el análisis produce `rows = { total: 81, matched: 81, unmatched: 0, ambiguous: 0, ignored: 0 }`, `byCycle = { E: 80, I: 1, R: 0 }`, las filas de `Fail` con `statusName = "Declined"`, las de `CB` con `Chargeback`, y ninguna fila de `Summary`

#### Scenario: Origen de cada propuesta
- **WHEN** se propone el pareo de `legacy-provider` para `ProviderC-Alt`
- **THEN** las cuatro hojas y las columnas `Merchant Order No#`, `Order Status` y `Amount USD` llevan `source = account`, aunque `Merchant Order No#` y `Order Status` también existan como reglas globales
- **AND** para `batch-clean` en `ProviderA-USD` (sin conjunto) todas las hojas y columnas llevan `source = global`

#### Scenario: Igualdad sin mayúsculas y patrón regex
- **GIVEN** las reglas globales de la plantilla
- **WHEN** un libro trae las hojas `app`, ` DEC ` y `Other fees`
- **THEN** se proponen como APP, DEC y `Other Fees` con `source = global`
- **AND** una regla de columna `isRegex = true` con patrón `^amount( usd)?$` parea tanto `Amount` como `Amount USD`

#### Scenario: Sin regla
- **WHEN** una hoja o una cabecera no coincide con ninguna regla de la cuenta ni global
- **THEN** su propuesta es `source = none` con `kind` (o `targetField`) `null`, y nunca se adivina un valor

#### Scenario: Un campo destino por hoja
- **GIVEN** una hoja con cabecera `ID, Transaction ID, Amount`
- **WHEN** se propone el pareo con las reglas globales
- **THEN** `ID → transactionId` (origen `global`) y `Transaction ID` queda con `targetField = null` y `source = none`

#### Scenario: El conjunto gana aunque la global tenga mejor prioridad
- **GIVEN** un conjunto enlazado con la hoja `APP` → E/`Declined` y `priority = 100`, y la global `APP` → E/`Successful` con `priority = 10`
- **WHEN** se propone una hoja `APP`
- **THEN** la propuesta es E/`Declined` con `source = account`

#### Scenario: Desempate por orden de guardado
- **GIVEN** un conjunto con dos reglas de hoja de igual `priority`, `^A.*` (regex) y `APP`, guardadas en ese orden
- **WHEN** se propone una hoja `APP`
- **THEN** gana `^A.*`; si se guardan en el orden inverso, gana `APP`

#### Scenario: Columna de una hoja antes que la genérica
- **GIVEN** en el mismo conjunto `Amount` → `amount` para cualquier hoja y `Amount` → `reference` solo para la hoja `CB`, con la misma `priority`
- **WHEN** se propone una hoja `CB` con la cabecera `Amount`
- **THEN** `Amount` se propone como `reference`; en la hoja `TRX`, como `amount`

### Requirement: Alias de estado globales
El texto de estado leído SHALL resolverse por `MatchingStatusAlias` (sin distinguir mayúsculas ni espacios); `CHB 2` SHALL resolver a `Chargeback` con `excludeAmount = 1` (cuenta y aplica fee, no suma importe). En la propuesta, toda columna `status` SHALL listar sus valores distintos resueltos; un valor sin alias queda con `statusId = null` y aviso en `readiness.notes`. Al analizar, cada fila SHALL resolverse igual: sin alias → `statusId = null` y advertencia `status_unresolved`, sin bloqueo.

#### Scenario: CHB 2 legacy
- **GIVEN** `legacy-provider` analizado en `ProviderC-Alt`
- **WHEN** se consultan las filas de la hoja `CB`
- **THEN** la fila con `statusRaw = "CHB 2"` tiene `statusId = 4`, `statusName = "Chargeback"`, `excludeAmount = true` y `matchResult = "matched"`, su `transactionIdRaw` es el único elemento de `expected.excludeAmountRows` (`df14616d-4b26-4ffb-9984-72717ebff6a6`), y ninguna otra fila del import tiene `excludeAmount = true`

#### Scenario: CHB 2 reconocido en la propuesta
- **WHEN** se sube `legacy-provider` a `ProviderC-Alt`
- **THEN** la columna `Order Status` de la hoja CB trae `statusValues = [{ value: "CHB 2", statusId: 4, statusName: "Chargeback", excludeAmount: true }]`, la de TRX `[{ value: "Successful", statusId: 2, … excludeAmount: false }]` y la de Fail `[{ value: "Failed", statusId: 3, statusName: "Declined", excludeAmount: false }]`

#### Scenario: Alias sin distinguir mayúsculas
- **WHEN** una columna de estado trae `successful`, `APPROVED` y ` chb 2 `
- **THEN** resuelven a `Successful`, `Successful` y `Chargeback` con `excludeAmount = true`, respectivamente

#### Scenario: Valor sin alias
- **WHEN** una columna de estado trae el valor `Weird`
- **THEN** aparece en `statusValues` con `statusId = null`, `readiness.notes` lo avisa nombrando la hoja y el valor, y `readiness.canAnalyze` no cambia por ello

#### Scenario: Valor sin alias en el análisis
- **GIVEN** una hoja `TRX` (ciclo E, estado por columna) con una fila `Order Status = "Weird"`
- **WHEN** se analiza
- **THEN** la fila conserva `statusRaw = "Weird"`, `statusId = null`, `warnings` incluye `"status_unresolved"`, el cruce por ID se hace igual y `analysis.warnings.status_unresolved = 1`

### Requirement: Pareo confirmado es la fuente de verdad
La propuesta de pareo SHALL poder editarse por el analista y, una vez confirmada, `ImportSheetColumnMap` e `ImportSheet.cycle/statusId/kind` SHALL gobernar el parseo aunque la regla cambie después; la propuesta recalculada (`proposed`, `columns`) SHALL seguir devolviéndose solo como referencia. Mientras ninguna hoja esté confirmada (`mappingConfirmed = false`), la propuesta SHALL recalcularse con las reglas vigentes y no SHALL existir ninguna fila de `ImportSheetColumnMap`.

#### Scenario: Antes de confirmar
- **GIVEN** un import recién subido
- **WHEN** se consulta `GET /api/v1/imports/{id}`
- **THEN** todas sus hojas tienen `mappingConfirmed = false`, no hay filas de `ImportSheetColumnMap`, y `proposed` y `columns` coinciden con lo que devolvió la subida

#### Scenario: La regla cambia después de confirmar
- **GIVEN** un import `mapped` cuyo pareo confirmado de `APP` es `E`/`Successful` con `ID → transactionId`
- **WHEN** la regla global de la hoja `APP` pasa a proponer `Declined` y se analiza
- **THEN** todas las filas de `APP` tienen `statusId = 2` (`Successful`), `mapping` sigue mostrando lo confirmado y `proposed` muestra la nueva propuesta con `source = global`

#### Scenario: Columna no pareada se conserva
- **GIVEN** un pareo confirmado de `APP` sin `Currency`
- **WHEN** se analiza
- **THEN** `ImportRow.currency = null`, `rawData.Currency` conserva el texto y no hay advertencia `currency_invalid`

### Requirement: Coherencia ciclo–estado
Una fila cuyo estado resuelto tenga ciclo natural distinto del ciclo de la hoja (p. ej. estado Chargeback en hoja E) SHALL generar la advertencia `cycle_mismatch`, no un bloqueo, y SHALL contarse en `analysis.warnings.cycle_mismatch`. La propuesta de pareo SHALL anticipar esa advertencia en `readiness.notes` cuando un valor distinto de una columna `status` resuelva a un estado cuyo ciclo natural difiera del ciclo propuesto para la hoja.

#### Scenario: Estado de ciclo E en una hoja de ciclo I
- **GIVEN** una cuenta cuyo conjunto parea la hoja `CB` a ciclo I con estado por columna
- **WHEN** la columna `Order Status` de CB trae los valores `CHB` y `Successful`
- **THEN** `readiness.notes` avisa de que `Successful` (ciclo E) no corresponde al ciclo I de la hoja, y `readiness.canAnalyze` sigue siendo `true`

#### Scenario: Advertencia por fila en el análisis
- **GIVEN** esa misma hoja `CB` confirmada y analizada
- **WHEN** se consulta la fila con `Order Status = "Successful"`
- **THEN** `cycle = "I"`, `statusId = 2`, `warnings` incluye `"cycle_mismatch"`, la fila está `matched` si su ID existe, y `analysis.warnings.cycle_mismatch = 1`; las filas `CHB` no llevan la advertencia

### Requirement: Conjunto de reglas por proveedor
`MatchingRuleSet` SHALL pertenecer a un proveedor; una cuenta SHALL enlazarse a uno de los conjuntos de su proveedor o a ninguno, y un cambio de conjunto SHALL aplicar al siguiente import, nunca a imports ya analizados.

#### Scenario: Cuenta enlazada y cuenta sin conjunto
- **WHEN** se consultan las cuentas del seed
- **THEN** `ProviderC-Alt` está enlazada a "Provider C legacy" (proveedor 201) y `ProviderA-USD`, `ProviderA-EUR`, `ProviderB-Main` y `ProviderC-USD` no tienen conjunto, de modo que sus propuestas salen solo de las reglas globales

#### Scenario: El cambio de conjunto no toca imports analizados
- **GIVEN** un import de `ProviderC-Alt` ya `analyzed`
- **WHEN** la cuenta se desenlaza del conjunto legacy
- **THEN** las filas y el pareo confirmado de ese import no cambian, y solo un import nuevo recibe propuestas de las reglas globales

### Requirement: Comparación de patrones
Un patrón sin `isRegex` SHALL compararse por igualdad con el nombre de hoja o cabecera sin distinguir mayúsculas ni espacios de borde; con `isRegex`, como expresión regular sin distinguir mayúsculas. Una regla inactiva (`isActive = 0`) no SHALL aplicarse.

#### Scenario: Patrón literal y regex
- **GIVEN** la regla global `APP` sin `isRegex` y una regla de columna `isRegex = true` con `^amount( usd)?$`
- **WHEN** un libro trae la hoja `app ` y las cabeceras `Amount` y `AMOUNT USD`
- **THEN** la hoja se propone como APP y ambas cabeceras como `amount`

#### Scenario: Regla inactiva
- **GIVEN** una regla del conjunto de la cuenta con `isActive = 0` que parearía la hoja `Bonus`
- **WHEN** se propone el pareo
- **THEN** `Bonus` no recibe propuesta de esa regla (`source = none` si ninguna otra coincide)

### Requirement: Origen de cada propuesta
Cada propuesta de hoja y de columna SHALL indicar su origen: `account` (regla del conjunto enlazado a la cuenta), `global` (regla global) o `none` (sin propuesta).

#### Scenario: Origen por hoja y por columna
- **WHEN** se propone `legacy-provider` para `ProviderC-Alt` y `batch-clean` para `ProviderA-USD`
- **THEN** en el primero las hojas `TRX`, `Fail`, `CB`, `Summary` y las columnas `Merchant Order No#`, `Order Status`, `Amount USD` llevan `source = account`; en el segundo todo lleva `source = global`; y una hoja `Bonus` sin regla lleva `source = none`

### Requirement: Un campo destino por hoja
Un `targetField` SHALL proponerse como máximo una vez por hoja: cuando dos cabeceras resuelven al mismo campo, gana la columna más a la izquierda y la otra queda sin propuesta (`targetField = null`, `source = none`).

#### Scenario: Dos cabeceras para el mismo campo
- **GIVEN** una hoja con cabecera `Amount, ID, Amount USD` y las reglas globales
- **WHEN** se propone el pareo
- **THEN** `Amount → amount` y `ID → transactionId` con `source = global`, y `Amount USD` queda con `targetField = null` y `source = none`

### Requirement: Estado fijo por hoja frente a columna de estado
Cuando el pareo confirmado de una hoja `transactions` tiene estado fijo (`statusId`) y además una columna `status`, el estado fijo SHALL gobernar `ImportRow.statusId`; `statusRaw` SHALL conservar el texto de la columna y, si ese texto resuelve a un estado distinto del fijo, la fila SHALL llevar la advertencia `status_differs_from_sheet`. Sin estado fijo, la columna gobierna.

#### Scenario: Columna coincide con el estado fijo
- **GIVEN** `legacy-provider`, hoja `Fail` confirmada como `E`/`Declined` con `Order Status → status`
- **WHEN** se analiza
- **THEN** las 20 filas de `Fail` tienen `statusId = 3`, `statusRaw = "Failed"` y ninguna advertencia `status_differs_from_sheet`

#### Scenario: Columna discrepa del estado fijo
- **GIVEN** una hoja `APP` confirmada como `E`/`Successful` con una columna `Status → status` cuya fila trae `Declined`
- **WHEN** se analiza
- **THEN** la fila tiene `statusId = 2`, `statusRaw = "Declined"`, `warnings` incluye `"status_differs_from_sheet"` y `analysis.warnings.status_differs_from_sheet = 1`

### Requirement: Conjuntos de reglas de un proveedor
`GET /api/v1/providers/{id}/matching-rule-sets` SHALL responder `200` con los conjuntos del proveedor, activos e inactivos, ordenados por nombre: `{ ruleSetId, providerId, name, isActive, accounts }`, con `accounts` las cuentas enlazadas (`{ accountId, name, isActive }`, por nombre). SHALL exigir token y ningún permiso; proveedor inexistente o fuera del alcance SHALL responder `404`. Los conjuntos de prefijo `bruno-` que deja la colección SHALL salir como cualquier otro.

#### Scenario: Conjunto de Provider C
- **WHEN** `analyst` llama a `GET /api/v1/providers/201/matching-rule-sets`
- **THEN** descontando los conjuntos y las cuentas de prefijo `bruno-`, recibe un conjunto con `name = "Provider C legacy"`, `providerId = 201`, `isActive = true` y `ProviderC-Alt` en `accounts`

#### Scenario: Proveedor sin conjuntos
- **WHEN** `viewer` llama a `GET /api/v1/providers/101/matching-rule-sets`
- **THEN** recibe `200` con una lista vacía, sin contar los conjuntos de prefijo `bruno-`

#### Scenario: Proveedor fuera del alcance
- **WHEN** `viewer` llama a `GET /api/v1/providers/201/matching-rule-sets`
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo que para el proveedor 999

#### Scenario: Sin token
- **WHEN** se llama sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`

#### Scenario: Conjuntos de la colección presentes
- **GIVEN** un conjunto inactivo `bruno-x` en el proveedor 201
- **WHEN** se lista el proveedor 201
- **THEN** `bruno-x` sale en su orden por nombre con `isActive = false`, y los tests del seed lo ignoran

### Requirement: Crear un conjunto de reglas
`POST /api/v1/providers/{id}/matching-rule-sets` SHALL crear un conjunto en el proveedor con `name` (sin espacios de borde, 1–80), `isActive` (por defecto `true`), `sheetRules`, `columnRules` (pueden ir vacías) y `reason` opcional (≤ 500), y SHALL responder `201` con el detalle. El conjunto nace sin cuentas: se enlazan con `PATCH /accounts/{id}`.

#### Scenario: Conjunto nuevo en Provider C
- **GIVEN** `admin`
- **WHEN** crea en el proveedor 201 el conjunto `" Provider C v2 "` con la hoja `Transactions` → `transactions`/E sin estado y la columna `Txn Ref` → `transactionId`
- **THEN** recibe `201` con `name = "Provider C v2"`, `providerId = 201`, `isActive = true`, `accounts = []`, las dos reglas con `isActive = true` y `rowIgnoreRules = []`
- **AND** el conjunto aparece en `GET /providers/201/matching-rule-sets`

#### Scenario: Conjunto vacío
- **WHEN** `admin` crea un conjunto solo con `name`
- **THEN** recibe `201` con `sheetRules = []` y `columnRules = []`, y una cuenta enlazada a él recibe propuestas solo de las reglas globales

#### Scenario: Campo desconocido
- **WHEN** el cuerpo trae `providerId` o `rowIgnoreRules`
- **THEN** recibe `400` con `code = "validation_error"` y no se crea nada

### Requirement: Detalle de un conjunto de reglas
`GET /api/v1/matching-rule-sets/{id}` SHALL responder `200` con `ruleSetId`, `name`, `isActive`, `provider { providerId, name }`, `accounts` (como en la lista del proveedor), `sheetRules`, `columnRules` y `rowIgnoreRules`, cada regla con su id y sus campos. SHALL exigir token y ningún permiso. Las reglas SHALL salir en orden de `priority` y, a igualdad, en el orden en que se guardaron, que es el de desempate de la propuesta.

#### Scenario: Detalle del conjunto legacy
- **WHEN** `analyst` pide el detalle de "Provider C legacy"
- **THEN** recibe `200` con `provider.name = "Provider C"`, `ProviderC-Alt` en `accounts`, las hojas `TRX`, `CB`, `Fail` y `Summary` (`Fail` con `statusId = 3`) y las columnas `Merchant Order No#`, `Order Status` y `Amount USD` con `sheetPattern = null`

#### Scenario: Conjunto fuera del alcance o inexistente
- **WHEN** `viewer` (solo el merchant 1) pide el detalle de "Provider C legacy", o cualquiera pide el conjunto 999999
- **THEN** recibe `404` con `code = "not_found"`, el mismo cuerpo en los dos casos

#### Scenario: Identificador mal formado
- **WHEN** se pide `GET /api/v1/matching-rule-sets/abc`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Editar un conjunto de reglas
`PUT /api/v1/matching-rule-sets/{id}` SHALL recibir el documento completo (`name`, `isActive`, `sheetRules`, `columnRules` y `reason` opcional) y SHALL reemplazar, en una sola transacción, las listas que cambian en el orden dado (ids nuevos); una lista sin cambios conserva sus ids. Responde `200` con el detalle. Un cuerpo que no cambia nada SHALL responder `200` sin escribir reglas ni auditoría. `providerId` no se edita y no hay borrado de conjuntos.

#### Scenario: Cambiar una regla de hoja
- **GIVEN** un conjunto con la hoja `TRX` → E sin estado
- **WHEN** `admin` envía el documento con `TRX` → E/`Successful` y el resto igual
- **THEN** recibe `200`, el detalle muestra `TRX` con `statusId = 2` y las reglas tienen ids nuevos

#### Scenario: Renombrar
- **WHEN** `admin` envía el documento con otro `name` y las mismas reglas
- **THEN** recibe `200` con el nombre nuevo y la auditoría registra el cambio de nombre y ninguno de reglas

#### Scenario: Documento sin cambios
- **WHEN** `admin` reenvía el detalle tal cual lo recibió (sin ids de regla, con las mismas reglas en el mismo orden)
- **THEN** recibe `200`, los ids de las reglas no cambian y no hay entrada nueva en `AuditLog`

#### Scenario: Desactivar una regla
- **WHEN** `admin` envía una regla de hoja con `isActive = false`
- **THEN** se guarda, sale en el detalle con `isActive = false` y no se aplica en la propuesta

#### Scenario: Cuerpo parcial
- **WHEN** el cuerpo omite `columnRules`
- **THEN** recibe `400` con `code = "validation_error"` y el conjunto no cambia

### Requirement: Nombre de conjunto único por proveedor
El nombre de un conjunto SHALL ser único dentro de su proveedor sin distinguir mayúsculas, al crear y al renombrar. Un nombre en uso SHALL responder `409 rule_set_name_taken`. Dos proveedores distintos SHALL poder tener conjuntos con el mismo nombre.

#### Scenario: Nombre repetido en mayúsculas
- **WHEN** `admin` crea en el proveedor 201 el conjunto `PROVIDER C LEGACY`
- **THEN** recibe `409` con `code = "rule_set_name_taken"` y no se crea nada

#### Scenario: Mismo nombre en otro proveedor
- **WHEN** `admin` crea en el proveedor 101 un conjunto `Provider C legacy`
- **THEN** recibe `201`

#### Scenario: Renombrar al nombre de otro conjunto
- **GIVEN** dos conjuntos del mismo proveedor
- **WHEN** `admin` renombra el segundo con el nombre del primero
- **THEN** recibe `409 rule_set_name_taken` y el segundo conserva su nombre y sus reglas

### Requirement: Desactivar un conjunto en uso
Pasar `isActive` de `true` a `false` en un conjunto con cuentas enlazadas, abiertas o cerradas, SHALL responder `409 rule_set_in_use` con `details.accounts` (`{ accountId, name }` por nombre) sin escribir nada. Un conjunto inactivo SHALL poder editarse y reactivarse, y no SHALL poder enlazarse a una cuenta.

#### Scenario: Conjunto legacy en uso
- **WHEN** `admin` desactiva "Provider C legacy"
- **THEN** recibe `409` con `code = "rule_set_in_use"`, `details.accounts` incluye `ProviderC-Alt` y el conjunto sigue activo

#### Scenario: Cuenta cerrada enlazada
- **GIVEN** un conjunto cuya única cuenta enlazada está cerrada
- **WHEN** `admin` lo desactiva
- **THEN** recibe `409 rule_set_in_use` con esa cuenta en `details.accounts`

#### Scenario: Desactivar y reactivar un conjunto libre
- **GIVEN** un conjunto sin cuentas
- **WHEN** `admin` lo desactiva y después lo reactiva
- **THEN** las dos respuestas son `200` y la auditoría registra `matching_rule_set.deactivate` y `matching_rule_set.activate`

### Requirement: Validación del contenido de las reglas
Una regla de hoja `transactions` SHALL llevar ciclo; una `batch_fees` o `ignore`, ni ciclo ni estado; el ciclo `R`, sin estado. Un estado fijo no SHALL ser `Pending` ni tener un ciclo natural distinto del de la hoja. Un regex SHALL compilar. Los patrones se guardan sin espacios de borde y no SHALL estar vacíos (eso lo rechaza el esquema). Cada otro incumplimiento SHALL responder `400 validation_error` con `details.field` (p. ej. `sheetRules[2].statusId`) sin escribir.

#### Scenario: Hoja batch_fees con ciclo
- **WHEN** `admin` envía `Other Fees` → `batch_fees` con `cycle = "E"`
- **THEN** recibe `400` con `details.field = "sheetRules[0].cycle"`

#### Scenario: Ciclo R con estado
- **WHEN** envía `RR` → `transactions`/R con `statusId = 2`
- **THEN** recibe `400` con `details.field` en el `statusId` de esa regla

#### Scenario: Estado fijo de otro ciclo
- **WHEN** envía `APP` → `transactions`/E con `statusId = 4` (`Chargeback`, ciclo natural I)
- **THEN** recibe `400` con `details.field` en el `statusId` de esa regla

#### Scenario: Estado fijo Pending o inexistente
- **WHEN** envía una hoja E con `statusId = 1` (`Pending`) o con `statusId = 99`
- **THEN** recibe `400` con `details.field` en el `statusId` de esa regla

#### Scenario: Regex que no compila
- **WHEN** envía una columna con `isRegex = true` y `columnPattern = "^amount("`
- **THEN** recibe `400` con `details.field = "columnRules[0].columnPattern"`

#### Scenario: Patrón vacío tras recortar
- **WHEN** envía una hoja con `sheetPattern = "   "`
- **THEN** recibe `400` con `code = "validation_error"` del esquema, con `details[0].path = "/sheetRules/0/sheetPattern"`

#### Scenario: Campo destino fuera del vocabulario
- **WHEN** envía una columna con `targetField = "fee"`
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Patrones sin repetir y límites
Dentro de una misma lista no SHALL repetirse un patrón, comparando sin mayúsculas ni espacios de borde e independientemente de `isRegex`: las hojas por `sheetPattern`, las columnas por la pareja `sheetPattern`–`columnPattern` (`null` = cualquier hoja) y los alias por texto. Cada lista SHALL tener como mucho 200 elementos y cada texto SHALL respetar la longitud de su columna. El incumplimiento SHALL responder `400 validation_error` con `details.field`.

#### Scenario: Hoja repetida
- **WHEN** `admin` envía las hojas `APP` y ` app `
- **THEN** recibe `400` con `details.field = "sheetRules[1].sheetPattern"`

#### Scenario: Misma columna en hojas distintas
- **WHEN** envía `Amount` → `amount` para cualquier hoja y `Amount` → `amount` solo para la hoja `CB`
- **THEN** se acepta: la pareja hoja–columna es distinta

#### Scenario: Demasiadas reglas
- **WHEN** envía 201 reglas de columna
- **THEN** recibe `400` con `code = "validation_error"`

### Requirement: Reglas globales editables
`GET /api/v1/matching-rules/global` SHALL responder `200` con `sheetRules`, `columnRules` y `rowIgnoreRules` globales, `statusAliases` y el catálogo `statuses` (`{ statusId, name, cycle }`), exigiendo solo token. `PUT /api/v1/matching-rules/global` SHALL reemplazar las reglas de hoja y de columna globales y los alias con el documento completo y `reason` opcional, con las validaciones de los conjuntos. Sin cambios, responde `200` sin escribir.

#### Scenario: Reglas globales de la plantilla
- **WHEN** `viewer` pide `GET /api/v1/matching-rules/global`
- **THEN** recibe `200` con las hojas `APP`, `DEC`, `CHB`, `REF`, `RDR`, `RR`, `Other Fees`, `Duplicate Corrections`, `CHB Alerts` y `Settings`, la columna `ID` → `transactionId`, el alias `CHB 2` con `excludeAmount = true` y seis estados en `statuses`

#### Scenario: Reenviar las globales sin cambios
- **WHEN** `admin` reenvía lo que devolvió el `GET` (sin ids de regla ni `rowIgnoreRules` ni `statuses`)
- **THEN** recibe `200` y no hay entrada nueva en `AuditLog`

#### Scenario: Alias nuevo
- **WHEN** `admin` añade el alias `Approved OK` → `Successful`
- **THEN** recibe `200` y, en la propuesta siguiente, una columna de estado con `approved ok` resuelve a `statusId = 2`

#### Scenario: Alias repetido o de estado inexistente
- **WHEN** envía los alias `CHB` y ` chb `, o un alias con `statusId = 99`
- **THEN** recibe `400` con `details.field` en el alias repetido o en su `statusId`

### Requirement: Permiso y alcance de las escrituras de reglas
Las escrituras SHALL exigir `account.manage`: sin él, `403 forbidden` antes de mirar el proveedor o el conjunto. Un proveedor o conjunto inexistente o fuera del alcance SHALL responder `404 not_found`, el mismo cuerpo. `PUT /matching-rules/global` SHALL exigir además alcance `all`; con alcance `assigned`, `403 forbidden`. Sin token, `401`. La validación de esquema puede responder `400` antes (#72).

#### Scenario: Analista sin permiso
- **WHEN** `analyst` crea un conjunto en el proveedor 201, edita "Provider C legacy" o edita las globales
- **THEN** cada petición responde `403` con `code = "forbidden"` y no escribe

#### Scenario: Proveedor desconocido
- **WHEN** `admin` crea un conjunto en el proveedor 999
- **THEN** recibe `404` con `code = "not_found"`

#### Scenario: Admin con alcance limitado
- **GIVEN** un usuario con `account.manage` y alcance `assigned` al merchant 1
- **WHEN** edita las reglas globales
- **THEN** recibe `403 forbidden`
- **AND** al pedir el detalle de "Provider C legacy" (merchant 2) recibe `404 not_found`

#### Scenario: Sin token
- **WHEN** se llama a cualquiera de las rutas de reglas sin cabecera `Authorization`
- **THEN** recibe `401` con `code = "unauthorized"`

### Requirement: Auditoría de las reglas de pareo
Cada escritura SHALL dejar una entrada en `AuditLog` en la misma transacción. Conjuntos: `entityType = MatchingRuleSet`, `entityId` = el id, acción `matching_rule_set.create`, `.deactivate` (si `isActive` pasa a `false`), `.activate` (si pasa a `true`) o `.update`. Globales: `entityType = MatchingRules`, `entityId = global`, acción `matching_rules.update`. Detalle: `{ changes: { campo: { before, after } }, reason? }`, solo con los campos que cambian.

#### Scenario: Auditoría de una edición
- **WHEN** `admin` cambia las reglas de columna de un conjunto con `reason = "New column layout"`
- **THEN** hay una entrada `matching_rule_set.update` con `userId` de `admin`, `changes.columnRules.before` y `changes.columnRules.after` sin ids de regla, ningún cambio de `name` y el `reason`

#### Scenario: Desactivar con otros cambios
- **WHEN** `admin` desactiva un conjunto libre y a la vez lo renombra
- **THEN** la única entrada es `matching_rule_set.deactivate`, con `changes.isActive` y `changes.name`

#### Scenario: Auditoría de las globales
- **WHEN** `admin` añade un alias global
- **THEN** hay una entrada `matching_rules.update` con `entityId = "global"` y solo `changes.statusAliases`

### Requirement: Efecto de un cambio de reglas
Un cambio de reglas o alias SHALL regir desde la siguiente propuesta y el siguiente análisis. El pareo confirmado (`ImportSheetColumnMap` e `ImportSheet`) y las filas ya analizadas no SHALL cambiar; un import sin ninguna hoja confirmada SHALL ver la propuesta recalculada. Las reglas no se fijan por import porque eso exigiría guardarlas por import (una migración).

#### Scenario: Import subido sin confirmar
- **GIVEN** un import de `ProviderC-Alt` en `uploaded` con `legacy-provider` y la propuesta `Fail` → E/`Declined`
- **WHEN** `admin` cambia en "Provider C legacy" la hoja `Fail` a E sin estado y se pide `GET /imports/{id}`
- **THEN** `Fail` propone E sin estado con `source = account`

#### Scenario: Import con el pareo confirmado
- **GIVEN** ese import con el pareo confirmado (`mapped`)
- **WHEN** cambia la regla de `Fail`
- **THEN** `mapping` sigue mostrando E/`Declined`, `proposed` muestra la regla nueva y al analizar las filas de `Fail` tienen `statusId = 3`

#### Scenario: Alias cambiado antes del análisis
- **GIVEN** un import `mapped` cuya hoja `TRX` tiene estado por columna con el valor `Successful`
- **WHEN** `admin` cambia el alias `Successful` a otro estado y se analiza
- **THEN** las filas se resuelven con el alias nuevo: los alias se aplican al analizar, no al confirmar

#### Scenario: Import ya analizado
- **GIVEN** un import `analyzed` de `ProviderC-Alt`
- **WHEN** cambian las reglas del conjunto o los alias
- **THEN** sus filas (`statusId`, `cycle`, `matchResult`) no cambian

### Requirement: Filas a ignorar de solo lectura
Las reglas de filas a ignorar SHALL mostrarse en el detalle del conjunto y en las reglas globales (`{ rowIgnoreId, pattern, isRegex, description, isActive }`) y no SHALL poder escribirse: un `rowIgnoreRules` en el cuerpo de un `POST` o `PUT` SHALL responder `400 validation_error`. El motor aún no las aplica: las filas sin ID se ignoran por código (#120).

#### Scenario: Regla global sembrada
- **WHEN** se pide `GET /api/v1/matching-rules/global`
- **THEN** `rowIgnoreRules` tiene una regla con `pattern = "transactionId:empty"` e `isRegex = false`

#### Scenario: Intento de escribir filas a ignorar
- **WHEN** `admin` envía `PUT /matching-rules/global` con `rowIgnoreRules`
- **THEN** recibe `400` con `code = "validation_error"` y las reglas no cambian

### Requirement: Pantalla Matching Rules: acceso y conjuntos del proveedor
Administration › Matching Rules (`/matching-rules`) SHALL abrirse para todo rol con sesión, con merchant y proveedor en la dirección como Accounts. SHALL mostrar la entrada **Global defaults** y los conjuntos del proveedor de `GET /providers/{id}/matching-rule-sets`, activos e inactivos, con su nombre (enlace al detalle), su estado y sus cuentas. Un merchant o proveedor fuera del alcance SHALL decir `This merchant or provider is not available.`

#### Scenario: Conjuntos de Provider C
- **WHEN** `analyst` abre `/matching-rules?merchantId=2&providerId=201`
- **THEN** ve **Global defaults** con enlace a `/matching-rules/global`, `Provider C legacy` como `active` con `ProviderC-Alt` en sus cuentas, y `Provider C retired` como `inactive` sin cuentas
- **AND** cada nombre enlaza a `/matching-rules/<ruleSetId>`

#### Scenario: Proveedor sin conjuntos
- **WHEN** `viewer` abre `/matching-rules?merchantId=1&providerId=101`
- **THEN** ve **Global defaults** y `No rule sets for this provider. Its accounts use the global defaults.`

#### Scenario: Proveedor fuera del alcance
- **WHEN** `viewer` abre `/matching-rules?merchantId=2&providerId=201`
- **THEN** ve `This merchant or provider is not available.` y ninguna lista de conjuntos

#### Scenario: Migas
- **WHEN** `analyst` abre Matching Rules, las reglas globales o el detalle de "Provider C legacy" (`analyst` y no `viewer`, que no ve el conjunto del merchant 2)
- **THEN** ve `Dashboard › Administration › Matching Rules`

### Requirement: Pantalla Matching Rules: detalle de un conjunto
`/matching-rules/$ruleSetId` SHALL mostrar en el orden del API:
- nombre, estado, proveedor y cuentas enlazadas (enlace a su ficha, las cerradas como `closed`);
- reglas de hoja, de columna (`Any sheet` si `sheetPattern` es `null`) y filas a ignorar;
- cada estado fijo por su nombre del catálogo de `GET /matching-rules/global`.

Inexistente, mal formado o fuera del alcance SHALL decir `This rule set is not available.`

#### Scenario: Detalle del conjunto legacy
- **WHEN** `analyst` abre el detalle de "Provider C legacy"
- **THEN** ve `Provider C`, `ProviderC-Alt` con enlace a su ficha, las hojas `TRX`, `CB`, `Fail` (`E` · `Declined`) y `Summary` (`ignore`), y las columnas `Merchant Order No#`, `Order Status` y `Amount USD` con `Any sheet`

#### Scenario: Conjunto no disponible
- **WHEN** `viewer` abre el detalle de "Provider C legacy" (merchant 2), o cualquiera abre `/matching-rules/999999` o `/matching-rules/abc`
- **THEN** ve `This rule set is not available.` y ninguna regla

#### Scenario: Catálogo de estados no disponible
- **GIVEN** que `GET /matching-rules/global` falla
- **WHEN** `analyst` abre el detalle de "Provider C legacy"
- **THEN** ve las reglas y, en lugar de `Declined`, `Status 3`, sin bloquear la pantalla

#### Scenario: Error y reintento
- **GIVEN** que `GET /matching-rule-sets/{id}` responde `500` una vez y después `200`
- **WHEN** `analyst` abre el detalle y pulsa **Retry** junto a `Could not load the rule set.`
- **THEN** ve las reglas del conjunto

### Requirement: Pantalla Matching Rules: reglas globales
`/matching-rules/global` SHALL mostrar a todo rol con sesión, en el orden de `GET /matching-rules/global`:
- las reglas de hoja y de columna globales;
- los alias de estado, con texto y estado (`excluded` si `excludeAmount`, `legacy` si `isLegacy`);
- las filas a ignorar.

Si la lectura falla, SHALL decir `Could not load the global rules.` con **Retry**.

#### Scenario: Globales de la plantilla
- **WHEN** `viewer` abre `/matching-rules/global`
- **THEN** ve las hojas `APP` (`E` · `Successful`), `RR` (`R`, sin estado) y `Other Fees` (`batch_fees`), la columna `ID` → `transactionId` con `Any sheet`, y el alias `CHB 2` → `Chargeback` marcado `excluded`

### Requirement: Pantalla Matching Rules: filas a ignorar de solo lectura
Las filas a ignorar SHALL mostrarse sin acciones, también en modo edición, en el detalle de un conjunto y en las globales, con la nota `Not applied yet (#120).` Ningún guardado SHALL enviar `rowIgnoreRules`.

#### Scenario: Fila a ignorar global
- **WHEN** `admin` abre `/matching-rules/global` y pulsa **Edit rules**
- **THEN** ve `transactionId:empty` con la nota `Not applied yet (#120).` y sin controles para cambiarla
- **AND** al guardar, el cuerpo del `PUT` no lleva `rowIgnoreRules`

### Requirement: Pantalla Matching Rules: permisos de la pantalla
Las acciones de los conjuntos SHALL mostrarse solo con `account.manage`: **New rule set**, **Edit rules**, **Rename…**, **Deactivate…** y **Activate…**. **Edit rules** de las globales SHALL exigir además `merchantScope = all`. Sin ellas, la pantalla SHALL ser de solo lectura. Es solo presentación: un `403` del API SHALL mostrarse como mensaje del formulario.

#### Scenario: Sin account.manage
- **WHEN** `analyst` o `viewer` abren la lista de Provider C, el detalle de "Provider C legacy" o las globales
- **THEN** no ven ninguna acción de escritura

#### Scenario: Admin con alcance total
- **WHEN** `admin` abre las mismas pantallas
- **THEN** ve **New rule set** en la lista, **Edit rules**, **Rename…** y **Deactivate…** en el conjunto y **Edit rules** en las globales

#### Scenario: Admin con alcance limitado
- **GIVEN** un usuario con `account.manage` y `merchantScope = assigned` al merchant 2
- **WHEN** abre las globales y el detalle de "Provider C legacy"
- **THEN** las globales no tienen **Edit rules** y el conjunto sí

#### Scenario: 403 del API
- **GIVEN** que el `PUT` del conjunto responde `403 forbidden`
- **WHEN** `admin` guarda
- **THEN** ve `You don't have permission to change these rules.` y el formulario sigue abierto con lo escrito

### Requirement: Pantalla Matching Rules: modo edición
**Edit rules** SHALL convertir las tablas en un formulario:
- añadir y quitar reglas, y alias en las globales;
- mover reglas con **Move up** / **Move down**, deshabilitados en los extremos;
- `Reason` opcional y la nota `Order breaks ties at equal priority.`

**Save** SHALL enviar el documento completo una sola vez y, con `200`, salir del modo con el orden de la respuesta. **Cancel** SHALL descartarlo todo.

#### Scenario: Cambiar una regla de hoja
- **WHEN** `admin` edita "Provider C legacy", deja `Fail` en `E` sin estado y pulsa **Save**
- **THEN** se envía una sola vez `PUT /matching-rule-sets/3` con `name`, `isActive`, las cuatro hojas en su orden (`Fail` con `statusId = null`) y las tres columnas, sin `sheetRuleId`, `columnRuleId`, `rowIgnoreRules` ni `reason`
- **AND** sale del modo edición y muestra `Fail` como `E` sin estado

#### Scenario: Reordenar
- **WHEN** `admin` pulsa **Move up** en `CB` y guarda
- **THEN** el cuerpo lleva las hojas en el orden `CB`, `TRX`, `Fail`, `Summary`
- **AND** la pantalla muestra después el orden de la respuesta, sin reordenar por su cuenta

#### Scenario: Motivo
- **WHEN** `admin` escribe `  New column layout  ` en `Reason` y guarda
- **THEN** el cuerpo lleva `reason = "New column layout"`

#### Scenario: Cancelar
- **WHEN** `admin` añade una regla de columna y pulsa **Cancel**
- **THEN** no se envía nada y la tabla vuelve a las reglas guardadas

#### Scenario: Ids de una edición anterior
- **GIVEN** que un guardado devolvió reglas con ids nuevos
- **WHEN** `admin` vuelve a editar y guarda
- **THEN** el cuerpo se construye desde la última respuesta y no lleva ningún id de regla

#### Scenario: Alias de las globales
- **WHEN** `admin` añade el alias `Approved OK` → `Successful` en las globales y guarda
- **THEN** se envía `PUT /matching-rules/global` con `sheetRules`, `columnRules` y `statusAliases` (el nuevo con `excludeAmount = false` e `isLegacy = false`), sin `rowIgnoreRules` ni `statuses`

### Requirement: Pantalla Matching Rules: avisos del formulario
Antes de enviar, el formulario SHALL validar con `SheetRuleInput`, `ColumnRuleInput`, `StatusAliasInput` y el nombre de `@recon/shared` (obligatorios, longitudes, recorte): no envía nada y lleva el foco al primer error. SHALL adaptar los campos al tipo de hoja: `batch_fees` e `ignore` sin ciclo ni estado, ciclo `R` sin estado. No SHALL rechazar regex, repetidos, `Pending` ni estados de otro ciclo: los decide el API.

#### Scenario: Patrón vacío
- **WHEN** `admin` deja en blanco el patrón de la segunda hoja y guarda
- **THEN** ve `Enter a pattern.` junto a ese campo, con el foco en él, y no se envía nada

#### Scenario: Tipo de hoja sin ciclo
- **WHEN** `admin` pasa una hoja de `transactions` (`E` · `Declined`) a `batch_fees`
- **THEN** los campos de ciclo y estado desaparecen y el cuerpo lleva `cycle = null` y `statusId = null`

#### Scenario: Ciclo R
- **WHEN** `admin` pasa una hoja `E` · `Successful` al ciclo `R`
- **THEN** el campo de estado desaparece y el cuerpo lleva `statusId = null`

#### Scenario: Reglas que decide el API
- **WHEN** `admin` guarda una columna regex `^amount(` y una hoja `APP` → `E` · `Chargeback`
- **THEN** el formulario las envía sin avisar y muestra lo que responda el API

### Requirement: Pantalla Matching Rules: errores del API
Un `400 validation_error` con `details.field` (`sheetRules[i].campo`, `columnRules[i].campo`, `statusAliases[i].campo` o `name`) SHALL mostrar el mensaje del API junto a ese campo de esa fila, con el foco en él. El resto SHALL ser un mensaje general: un `400` sin campo que exista en el formulario, `403`, `404`, `5xx` o fallo de red. El formulario SHALL seguir abierto con los valores y el orden intactos.

#### Scenario: Estado de otro ciclo
- **GIVEN** que el `PUT` responde `400` con `details.field = "sheetRules[2].statusId"` y `message = "Chargeback is a cycle I status"`
- **WHEN** `admin` guarda
- **THEN** ve `Chargeback is a cycle I status` junto al estado de la tercera hoja, con el foco en él, y las hojas siguen en el orden en que las dejó

#### Scenario: Regex que no compila
- **GIVEN** que el `PUT` responde `400` con `details.field = "columnRules[0].columnPattern"`
- **WHEN** `admin` guarda
- **THEN** el mensaje aparece junto al patrón de la primera columna

#### Scenario: Campo desconocido o sin respuesta
- **GIVEN** que el `PUT` responde `400` con una lista de esquema, o con `details.field = "sheetRules[9].cycle"` y solo cuatro hojas, o la red falla
- **WHEN** `admin` guarda
- **THEN** ve un mensaje general del formulario y lo escrito sigue intacto

### Requirement: Pantalla Matching Rules: renombrar
**Rename…** SHALL abrir un panel lateral con el nombre y `Reason` opcional, y enviar el `PUT` completo: el nombre nuevo y las reglas del último detalle, sin ids. `409 rule_set_name_taken` SHALL mostrar `A rule set of this provider already uses this name.` en el nombre. Con cambios sin guardar en el modo edición, **Rename…**, **Deactivate…** y **Activate…** SHALL estar deshabilitados.

#### Scenario: Renombrar
- **WHEN** `admin` renombra "Provider C legacy" a `Provider C 2019`
- **THEN** se envía el `PUT` con `name = "Provider C 2019"` y las reglas tal como están guardadas, y el título muestra el nombre nuevo

#### Scenario: Nombre en uso
- **GIVEN** que el `PUT` responde `409 rule_set_name_taken`
- **WHEN** `admin` guarda el nombre
- **THEN** ve `A rule set of this provider already uses this name.` en el nombre, el panel sigue abierto y conserva lo escrito

#### Scenario: Cambios sin guardar
- **WHEN** `admin` cambia una regla en el modo edición sin guardar
- **THEN** **Rename…** y **Deactivate…** están deshabilitados

### Requirement: Pantalla Matching Rules: activar y desactivar
**Deactivate…** y **Activate…** SHALL pedir confirmación con `Reason` opcional y enviar el `PUT` completo con `isActive` cambiado. `409 rule_set_in_use` SHALL mostrar en el diálogo `This rule set is linked to these accounts. Link them to another set first.`, cada cuenta de `details.accounts` con enlace a su ficha, y el conjunto SHALL seguir igual.

#### Scenario: Conjunto en uso
- **GIVEN** que el `PUT` responde `409 rule_set_in_use` con `ProviderC-Alt` en `details.accounts`
- **WHEN** `admin` confirma **Deactivate…** en "Provider C legacy"
- **THEN** el diálogo sigue abierto con el texto y `ProviderC-Alt` como enlace a su ficha, y el conjunto sigue `active`

#### Scenario: Reactivar
- **WHEN** `admin` confirma **Activate…** en "Provider C retired"
- **THEN** se envía el `PUT` con `isActive = true` y las reglas guardadas, y el conjunto pasa a `active`

### Requirement: Pantalla Matching Rules: crear un conjunto
Con `account.manage` y un proveedor elegido, **New rule set** SHALL abrir un diálogo con el nombre y `Start from` (`Empty` o `Copy of <conjunto del proveedor>`). **Create rule set** SHALL enviar el `POST` una sola vez; con copia, con las reglas del conjunto de origen sin ids. Con `201` SHALL llevar al detalle nuevo. `409 rule_set_name_taken` SHALL mostrarse en el nombre.

#### Scenario: Conjunto vacío
- **WHEN** `admin` crea en Provider C el conjunto `Provider C v2` desde `Empty`
- **THEN** se envía `{ name: "Provider C v2", sheetRules: [], columnRules: [] }` a `POST /providers/201/matching-rule-sets` y llega al detalle de `Provider C v2`

#### Scenario: Copia de otro conjunto
- **WHEN** `admin` crea `Provider C v2` como copia de "Provider C legacy"
- **THEN** el cuerpo lleva las cuatro hojas y las tres columnas del legacy en su orden, sin ids de regla

#### Scenario: Nombre en uso al crear
- **GIVEN** que el `POST` responde `409 rule_set_name_taken`
- **WHEN** `admin` crea `PROVIDER C LEGACY`
- **THEN** ve el mensaje en el nombre y el diálogo sigue abierto con lo escrito
