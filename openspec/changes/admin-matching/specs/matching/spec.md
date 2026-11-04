## ADDED Requirements

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
`PUT /api/v1/matching-rule-sets/{id}` SHALL recibir el documento completo (`name`, `isActive`, `sheetRules`, `columnRules` y `reason` opcional) y SHALL reemplazar todas las reglas de hoja y de columna del conjunto en una sola transacción. Responde `200` con el detalle. Un cuerpo que no cambia nada SHALL responder `200` sin escribir reglas ni auditoría. `providerId` no se edita y no hay borrado de conjuntos.

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
Una regla de hoja `transactions` SHALL llevar ciclo; una `batch_fees` o `ignore`, ni ciclo ni estado; el ciclo `R`, sin estado. Un estado fijo no SHALL ser `Pending` ni tener un ciclo natural distinto del de la hoja. Un regex SHALL compilar. Los patrones se guardan sin espacios de borde y no SHALL estar vacíos. Cada incumplimiento SHALL responder `400 validation_error` con `details.field` (p. ej. `sheetRules[2].statusId`) sin escribir.

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
- **THEN** recibe `400` con `details.field = "sheetRules[0].sheetPattern"`

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

## MODIFIED Requirements

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
