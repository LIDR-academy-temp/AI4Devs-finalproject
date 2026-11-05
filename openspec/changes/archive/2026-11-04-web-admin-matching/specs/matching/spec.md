## ADDED Requirements

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
