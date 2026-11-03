## ADDED Requirements

### Requirement: Permisos y alcance de la administración de fees
Las escrituras (`POST /accounts/{id}/fees`, `PATCH /fees/{id}`) SHALL exigir `fee.manage` y las lecturas de administración (`GET /fees`, `GET /fees/{id}/history`), `fee.view`. El permiso SHALL comprobarse antes que el alcance y que los datos. Un fee o una cuenta inexistentes o de un merchant fuera del alcance SHALL responder el mismo `404 not_found`. Sin sesión, `401`.

#### Scenario: Sin permiso de administración
- GIVEN el usuario `analyst` (sin `fee.manage`)
- WHEN pide `POST /accounts/{ProviderA-USD}/fees` o `PATCH /fees/{id}` con un cuerpo válido
- THEN recibe `403 forbidden` y la base no cambia

#### Scenario: Permiso antes que el alcance
- GIVEN el usuario `analyst`
- WHEN pide `PATCH /fees/{id}` de un fee que no existe
- THEN recibe `403 forbidden`, no `404`

#### Scenario: Fee fuera del alcance
- GIVEN el usuario `viewer` (merchant 1)
- WHEN pide `GET /fees/{id}/history` de un fee de ProviderC-Alt (merchant 2) o de un `feeId` inexistente
- THEN recibe el mismo `404 not_found` en los dos casos

#### Scenario: Sin sesión
- WHEN se pide `GET /fees` sin `Authorization`
- THEN la respuesta es `401 unauthorized`

### Requirement: Crear un fee
`POST /api/v1/accounts/{accountId}/fees` SHALL crear un fee de la cuenta con:
- `feeTypeId` de un tipo activo;
- `fixedAmount` y/o `percentage`;
- las variantes opcionales (`conditionalPercentage`, `conditionThresholdAmt`, `brandFixedAmount`, `brandPercentage`);
- `startDate` y `endDate` (`null` = −∞ / +∞);
- `description` (hasta 100 caracteres).

Responde `201` con la `AccountFee`. Las variantes SHALL guardarse tal como llegan, aunque el motor de settlement no las aplica.

#### Scenario: Fee creado con vigencia abierta
- GIVEN una cuenta sin fee de `Wire Fee`
- WHEN `admin` crea `{ feeTypeId: Wire Fee, fixedAmount: "15.0000", startDate: null, endDate: null }`
- THEN recibe `201` con `fixedAmount = "15.0000"`, `percentage = null`, `startDate = null`, `endDate = null`, `status = "active"`, `inUse = false`, `lastAppliedEventDate = null` y `createdBy.userName = "admin"`

#### Scenario: Fee programado junto al vigente
- GIVEN un fee MDR con vigencia NULL…2026-12-31 en la cuenta
- WHEN `admin` crea otro MDR con vigencia 2027-01-01…NULL
- THEN recibe `201`, el nuevo tiene `status = "scheduled"` y los dos coexisten

### Requirement: Formato de los datos de un fee
Importes y porcentajes SHALL viajar como strings decimales: los importes con hasta 4 decimales y los porcentajes como fracción de 0 a 1 con hasta 6 decimales. Las fechas de vigencia, como `YYYY-MM-DD` o `null`. Un número JSON, una fecha con otro formato o un campo desconocido SHALL responder `400 validation_error`, tanto al crear como al editar.

#### Scenario: Importe como número JSON
- WHEN `admin` envía `fixedAmount: 15`
- THEN recibe `400 validation_error` y la base no cambia

#### Scenario: Porcentaje con demasiados decimales
- WHEN `admin` envía `percentage: "0.0250001"`
- THEN recibe `400 validation_error`

### Requirement: Reglas de un fee válido
Un fee, al crearlo o tras editarlo, SHALL tener al menos `fixedAmount` o `percentage`. También SHALL cumplir `endDate ≥ startDate` cuando ambos están informados y ser de un tipo activo del catálogo. Si incumple alguna, responde `400 validation_error` con `details.field` (`fixedAmount`, `endDate` o `feeTypeId`).

#### Scenario: Ni importe ni porcentaje
- WHEN `admin` crea un fee sin `fixedAmount` ni `percentage`
- THEN recibe `400 validation_error` con `details.field = "fixedAmount"` y la base no cambia

#### Scenario: Fin anterior al inicio
- WHEN `admin` crea un fee con `startDate = 2027-02-01` y `endDate = 2027-01-31`
- THEN recibe `400 validation_error` con `details.field = "endDate"`

#### Scenario: Tipo inactivo o inexistente
- WHEN `admin` crea un fee con un `feeTypeId` que no está activo en el catálogo
- THEN recibe `400 validation_error` con `details.field = "feeTypeId"`

### Requirement: Uso de un fee
Un fee SHALL estar en uso (`inUse = true`) si lo referencia el desglose de algún movimiento o algún fee por batch, de cualquier intento, incluidos los deshechos. Su `lastAppliedEventDate` SHALL ser el mayor de estos días: el de negocio de las fechas de evento de sus desgloses y la `settlementDate` de los batches que lo usan como fee por batch. Las apariciones sin fecha no cuentan. Sin uso, es `null`.

#### Scenario: Fee aplicado por settlements procesados
- GIVEN un fee de una cuenta con batches procesados que lo aplicaron
- WHEN se lee con `GET /accounts/{id}/fees`
- THEN sale con `inUse = true` y `lastAppliedEventDate` igual al día del último evento al que se aplicó

#### Scenario: Fee recién creado
- WHEN se crea un fee
- THEN sale con `inUse = false` y `lastAppliedEventDate = null` hasta que un settlement lo aplique

### Requirement: Corregir un fee en el sitio
`PATCH /api/v1/fees/{feeId}` sin `effectiveFrom` SHALL corregir el fee en el sitio:
- Un fee sin uso admite cualquiera de `fixedAmount`, `percentage`, las variantes, `startDate`, `endDate` y `description`.
- `feeTypeId` y `accountId` no se editan nunca (`400 validation_error`).
- El resultado SHALL cumplir las reglas de un fee válido y no solaparse.

Responde `200` con `{ fee, successor: null }`.

#### Scenario: Corrección completa de un fee sin uso
- GIVEN un fee MDR sin uso con `percentage = "0.025000"`
- WHEN `admin` envía `{ percentage: "0.027500", reason: "typo" }`
- THEN recibe `200` con `percentage = "0.027500"` y `FeeHistory` tiene una fila `updated` con `reason = "typo"`, `beforeJson` con 0.025000 y `afterJson` con 0.027500

#### Scenario: Campo no editable
- WHEN `admin` envía `{ feeTypeId: 2 }`
- THEN recibe `400 validation_error` y la base no cambia

#### Scenario: Cuerpo vacío
- WHEN `admin` envía `{}`
- THEN recibe `400 validation_error`

### Requirement: Corrección sin cambios
En una corrección en el sitio, un valor igual al guardado (los importes y porcentajes, comparados como decimales) SHALL no contar como cambio. Si ningún campo cambia, `PATCH /fees/{id}` SHALL responder `200` con el fee tal cual, sin escribir en `FeeHistory` ni en `AuditLog`, aunque el fee esté en uso.

#### Scenario: Mismo valor con otra escritura
- GIVEN un fee MDR en uso con `percentage = "0.100000"`
- WHEN `admin` envía `{ percentage: "0.1" }`
- THEN recibe `200` con el fee sin cambios, y no se escribe ninguna fila en `FeeHistory` ni en `AuditLog`

### Requirement: Campos editables de un fee en uso
Un fee en uso SHALL admitir en el sitio solo `description` y `endDate`. Cualquier otro campo SHALL responder `409 fee_in_use` con `details.fields`, la lista de campos rechazados. Para cambiar sus valores se usa el cambio desde una fecha.

#### Scenario: Cambiar el valor de un fee en uso
- GIVEN un fee MDR en uso
- WHEN `admin` envía `{ percentage: "0.030000" }`
- THEN recibe `409 fee_in_use` con `details.fields = ["percentage"]` y la base no cambia

#### Scenario: Descripción de un fee en uso
- GIVEN un fee en uso
- WHEN `admin` envía `{ description: "Renegotiated in 2027" }`
- THEN recibe `200` y solo cambia la descripción

### Requirement: Cerrar la vigencia de un fee
Cerrar un fee SHALL ser ponerle `endDate` con `PATCH`. La acción del historial es `closed` cuando solo cambia `endDate` y pasa de `null` a una fecha, y `updated` en otro caso. En un fee en uso, `endDate` SHALL ser ≥ `lastAppliedEventDate`; si no, `409 fee_in_use` con `details.lastAppliedEventDate`. Cerrar nunca recalcula movimientos ya procesados.

#### Scenario: Cierre posterior al último evento aplicado
- GIVEN un fee de Chargeback NULL…NULL con `lastAppliedEventDate = 2026-10-15`
- WHEN `admin` envía `{ endDate: "2026-10-31" }`
- THEN recibe `200` con `endDate = "2026-10-31"` y `FeeHistory` tiene una fila `closed`

#### Scenario: Cierre que dejaría fuera eventos ya aplicados
- GIVEN el mismo fee
- WHEN `admin` envía `{ endDate: "2026-10-01" }`
- THEN recibe `409 fee_in_use` con `details.lastAppliedEventDate = "2026-10-15"` y la base no cambia

### Requirement: Cambiar un fee desde una fecha
`PATCH /api/v1/fees/{feeId}` con `effectiveFrom` (`YYYY-MM-DD`) y al menos un valor nuevo (`fixedAmount`, `percentage`, variantes, `description`) SHALL hacer el cambio en una transacción:
- cierra el fee con `endDate = effectiveFrom − 1 día` (historial `closed`);
- crea un sucesor de la misma cuenta y tipo, con `startDate = effectiveFrom`, el `endDate` original y los valores del original sustituidos por los enviados (historial `created`).

Responde `200` con `{ fee, successor }`.

#### Scenario: Sucesor con el valor nuevo y el resto heredado
- GIVEN un fee MDR vigente NULL…NULL con `percentage = "0.100000"` y descripción "MDR", cuyo `lastAppliedEventDate` es anterior a 2026-10-31
- WHEN `admin` envía `{ effectiveFrom: "2026-11-01", percentage: "0.095000" }`
- THEN recibe `200` con `fee.endDate = "2026-10-31"` y un `successor` con `startDate = "2026-11-01"`, `endDate = null`, `percentage = "0.095000"` y la descripción "MDR"

#### Scenario: Los movimientos procesados no cambian
- GIVEN un movimiento procesado con el fee MDR al 10 %
- WHEN el fee se cambia desde una fecha posterior a su evento
- THEN `GET /settlements/{id}/transactions` devuelve el mismo importe de fee y la misma configuración aplicada que antes

### Requirement: Límites del cambio desde una fecha
`effectiveFrom` SHALL ser posterior al `startDate` del fee (cualquiera si es `null`) y no posterior a su `endDate`. Si no, `400 validation_error` con `details.field = "effectiveFrom"`. `effectiveFrom − 1` SHALL ser ≥ `lastAppliedEventDate`; si no, `409 fee_in_use` con `details.lastAppliedEventDate`. Combinar `effectiveFrom` con `startDate` o `endDate`, o enviarlo sin valores nuevos, SHALL responder `400 validation_error`.

#### Scenario: Cambio con fecha anterior a eventos ya aplicados
- GIVEN un fee con `lastAppliedEventDate = 2026-10-15`
- WHEN `admin` envía `{ effectiveFrom: "2026-10-10", fixedAmount: "50.0000" }`
- THEN recibe `409 fee_in_use` con `details.lastAppliedEventDate = "2026-10-15"` y no se crea ningún fee

#### Scenario: Fecha fuera de la vigencia del fee
- GIVEN un fee con vigencia 2027-01-01…NULL
- WHEN `admin` envía `{ effectiveFrom: "2027-01-01", fixedAmount: "1.0000" }`
- THEN recibe `400 validation_error` con `details.field = "effectiveFrom"`

#### Scenario: effectiveFrom con startDate
- WHEN `admin` envía `{ effectiveFrom: "2027-01-01", startDate: "2027-01-01", fixedAmount: "1.0000" }`
- THEN recibe `400 validation_error`

### Requirement: Vista global de fees
`GET /api/v1/fees` SHALL devolver los fees de las cuentas del alcance del usuario, paginados en servidor (`page` desde 1, `pageSize` 1–500, 50 por defecto), como `{ items, page, pageSize, total }`. Cada elemento SHALL llevar los campos de `AccountFee` más `merchant`, `provider` y `account` (`{ id, name }`). Un parámetro inválido o desconocido SHALL responder `400 validation_error`.

#### Scenario: Paginación estable
- WHEN se piden dos páginas consecutivas con `pageSize = 5`
- THEN no se repite ni se pierde ningún fee entre ellas, y `total` es el mismo en las dos

#### Scenario: Tamaño de página inválido
- WHEN se pide `GET /fees?pageSize=0`
- THEN la respuesta es `400 validation_error`

### Requirement: Orden de la vista global
Los elementos de `GET /fees` SHALL ordenarse de forma estable entre páginas por:
1. nombre del merchant;
2. nombre del proveedor;
3. nombre de la cuenta;
4. título del tipo;
5. `startDate`, con `null` primero;
6. `feeId`.

Así, el front puede mostrar el grupo merchant › proveedor › cuenta como columnas sin cortar el orden.

#### Scenario: Activos de un merchant
- GIVEN el usuario `analyst`
- WHEN pide `GET /fees?merchantId=1&status=active`
- THEN recibe solo fees de cuentas del merchant 1, vigentes hoy, ordenados por proveedor, cuenta, tipo y `startDate`

### Requirement: Filtros de la vista global
`GET /fees` SHALL admitir estos filtros, combinables:
- `merchantId`, `providerId`, `accountId`;
- `kind`: `transactional`, o, entre los no transaccionales, `preset` (`allowsFreeAmount = false`) y `free_amount`;
- `status`: `active`, `scheduled` o `closed`. Sin `status` se devuelven todos;
- `q`, sin distinguir mayúsculas: nombre de la cuenta, código y título del tipo y descripción.

Un `merchantId`, `providerId` o `accountId` inexistente o fuera del alcance SHALL responder `404 not_found`.

#### Scenario: Preestablecidos por batch
- WHEN `analyst` pide `GET /fees?accountId={ProviderB-Main}&kind=preset`
- THEN recibe el `Monthly Fee` con `fixedAmount = "250.0000"` y ningún fee transaccional

#### Scenario: Alcance
- GIVEN el usuario `viewer` (merchant 1)
- WHEN pide `GET /fees` sin filtros
- THEN ningún elemento es de una cuenta del merchant 2
- AND `GET /fees?merchantId=2` responde `404 not_found`

#### Scenario: Búsqueda
- WHEN `analyst` pide `GET /fees?q=chargeback`
- THEN todos los elementos tienen "chargeback" en el nombre de la cuenta, el tipo o la descripción

### Requirement: Estado de un fee
El `status` de un fee SHALL derivarse del día de calendario de hoy en Nueva York, en este orden:
- `scheduled` si `startDate` es posterior a hoy;
- `closed` si `endDate` es anterior a hoy;
- `active` en otro caso.

#### Scenario: Programado, cerrado y activo
- GIVEN hoy es 2026-11-03 en Nueva York
- WHEN se leen tres fees con vigencias 2026-11-04…NULL, NULL…2026-11-02 y NULL…2026-11-03
- THEN sus `status` son `scheduled`, `closed` y `active`

### Requirement: Historial de un fee por API
`GET /api/v1/fees/{feeId}/history?scope=fee|type` SHALL devolver, de la más reciente a la más antigua, las filas de `FeeHistory`: las del fee (`scope=fee`, por defecto) o las de todos los fees del mismo tipo en su cuenta (`scope=type`). Cada fila lleva `feeHistoryId`, `feeId`, `action`, `changedAt`, `changedBy`, `reason`, `before` y `after`; estos dos, con la forma de la API.

#### Scenario: Cadena de un tipo
- GIVEN un MDR cambiado desde 2026-11-01 (un `closed` del original y un `created` del sucesor)
- WHEN `analyst` pide `GET /fees/{sucesor}/history?scope=type`
- THEN recibe las dos filas nuevas y la `created` del seed del original, de la más reciente a la más antigua

#### Scenario: Historial del seed
- WHEN se pide el historial de un fee del seed
- THEN su fila `created` trae `after.percentage` como string decimal (por ejemplo, `"0.100000"`), no como número

#### Scenario: Alcance inválido
- WHEN se pide `GET /fees/{id}/history?scope=account`
- THEN la respuesta es `400 validation_error`

### Requirement: Auditoría de los cambios de fees
Toda escritura de fees SHALL dejar una entrada en `AuditLog` en la misma transacción que el cambio y que su fila de `FeeHistory`: `fee.create`, `fee.update`, `fee.close` o `fee.change`, con el `feeId` y, en `fee.change`, el del sucesor. Si una de las escrituras falla, el cambio no se aplica.

#### Scenario: Corrección auditada
- WHEN `admin` corrige la descripción de un fee
- THEN `AuditLog` tiene una entrada `fee.update` del usuario `admin` con ese `feeId`

#### Scenario: Cambio desde una fecha auditado
- WHEN `admin` cambia un fee desde una fecha
- THEN `AuditLog` tiene una entrada `fee.change` con el `feeId` original y el del sucesor

#### Scenario: Fallo a mitad
- WHEN la escritura de la auditoría falla durante un cambio
- THEN no queda ni el cambio del `Fee` ni su fila de `FeeHistory`

### Requirement: Solapes al administrar fees
Crear, corregir o cambiar desde una fecha un fee que se solape con otro del mismo tipo en la cuenta SHALL responder `409 fee_overlap` con `details.conflicts`, una lista de `{ feeId, startDate, endDate }`, sin cambiar la base. Dos escrituras simultáneas sobre la misma cuenta SHALL serializarse.

#### Scenario: Solapamiento al corregir
- GIVEN dos fees de Refund sin uso, NULL…2026-12-31 y 2027-01-01…NULL
- WHEN se corrige el segundo con `startDate = 2026-12-15`
- THEN la API responde `409 fee_overlap` con el primero en `details.conflicts`

#### Scenario: Dos altas simultáneas
- WHEN dos peticiones crean a la vez un fee del mismo tipo y con vigencias solapadas en la misma cuenta
- THEN una responde `201` y la otra `409 fee_overlap`, y la cuenta queda con un solo fee de ese tipo en ese rango

### Requirement: Campos ampliados de un fee de la cuenta
Cada `AccountFee` SHALL llevar, además de sus campos previos y sin cambiarlos:
- las variantes condicionales y por marca, como texto o `null`;
- `status`, `inUse` y `lastAppliedEventDate` (`YYYY-MM-DD` o `null`);
- `createdBy` (`{ userId, userName }`), `createdAt` y `updatedAt`.

Esto vale para `GET /accounts/{id}/fees`, para la vista global (calculado solo para la página pedida) y para las respuestas de escritura.

#### Scenario: Campos ampliados
- WHEN `analyst` pide los fees de ProviderA-USD
- THEN cada fee trae `status`, `inUse`, `lastAppliedEventDate`, `createdBy.userName = "admin"`, y el `Chargeback over 1%` trae `conditionalPercentage = "0.020000"`

## MODIFIED Requirements

### Requirement: Vigencia con NULL como infinito
`startDate NULL` SHALL significar "desde siempre" y `endDate NULL` "sin fin". Dos fees del mismo (cuenta, tipo) SHALL no solaparse, evaluando los NULL como centinelas. El caso de uso lo valida y el trigger `TR_Fee_NoOverlap` lo respalda. Cambiar un fee SHALL cerrar el vigente con `endDate = nuevo startDate − 1 día` y abrir el nuevo. Los fees no se borran.

#### Scenario: Solapamiento rechazado
- GIVEN un fee MDR vigente NULL…NULL en ProviderA-USD
- WHEN se crea otro MDR con startDate 2026-11-01 sin cerrar el anterior
- THEN la API responde `409 fee_overlap` con el fee vigente en `details.conflicts` y la base no cambia

#### Scenario: Tipos distintos no se solapan
- GIVEN un fee MDR NULL…NULL
- WHEN se crea un `TRX Fee - Deposit` NULL…NULL en la misma cuenta
- THEN se crea sin conflicto

#### Scenario: Bordes contiguos
- GIVEN un fee de Refund NULL…2026-10-31
- WHEN se crea otro de Refund 2026-11-01…NULL
- THEN se crea sin conflicto

#### Scenario: Respaldo del trigger
- WHEN una escritura directa en la base inserta un fee solapado con otro del mismo tipo y cuenta
- THEN el trigger la rechaza

### Requirement: Historial
Toda creación, edición o cierre SHALL dejar una fila en `FeeHistory`: usuario, fecha, acción, la fila antes y después en JSON (dinero como string decimal y fechas `YYYY-MM-DD`) y el `reason` opcional (1–500 caracteres).

#### Scenario: Cambiar un fee cierra el vigente y abre el nuevo
- GIVEN un fee MDR vigente NULL…NULL en una cuenta
- WHEN el analista lo cambia con un nuevo valor desde 2026-11-01
- THEN el fee anterior queda con `endDate = 2026-10-31` y no se borra, y existe un fee nuevo con `startDate = 2026-11-01`
- AND `FeeHistory` tiene una fila `closed` para el anterior y una `created` para el nuevo, cada una con usuario, fecha, `beforeJson` y `afterJson`

#### Scenario: Motivo demasiado largo
- WHEN `admin` envía `reason` con 501 caracteres
- THEN recibe `400 validation_error` y la base no cambia

### Requirement: Fees de la cuenta vigentes a una fecha
`GET /api/v1/accounts/{id}/fees?transactional=&asOf=` SHALL exigir `fee.view` y alcance, y devolver los fees de la cuenta, filtrados por tipo transaccional o no, y vigentes en `asOf` (fecha de negocio) si se indica. Cada uno con tipo, importe fijo y porcentaje como texto, y vigencia con `null` para "always".

#### Scenario: Preestablecidos de ProviderB-Main
- WHEN `analyst` pide `GET /accounts/{ProviderB-Main}/fees?transactional=false`
- THEN recibe el fee `Monthly Fee` con `fixedAmount = "250.0000"`, `startDate = null` y `endDate = null`

#### Scenario: Vigentes a una fecha
- GIVEN un fee con vigencia NULL…2026-10-31 y otro del mismo tipo 2026-11-01…NULL
- WHEN se pide `asOf=2026-10-15`
- THEN solo se devuelve el primero

#### Scenario: Cuenta de otro merchant
- WHEN `viewer` pide los fees de ProviderC-Alt (merchant 2) o de una cuenta inexistente
- THEN recibe el mismo `404 not_found`
