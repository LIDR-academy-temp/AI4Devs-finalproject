## ADDED Requirements

### Requirement: Pantalla Fees: acceso
Administration › Fees (`/fees`) SHALL exigir `fee.view`; sin él, la guarda de ruta muestra `You don't have access to this page` sin llamar a `GET /fees`. La pantalla SHALL ser de solo lectura para todos los usuarios, también para quien tiene `fee.manage`: crear, editar y cerrar se hace en la página de fees de cada cuenta.

#### Scenario: Usuario con fee.view
- **WHEN** `viewer` abre `/fees`
- **THEN** ve `Fees · all accounts` con la tabla y ningún botón para crear, editar o cerrar

#### Scenario: admin tampoco edita aquí
- **WHEN** `admin` abre `/fees`
- **THEN** no ve **Add fee**, **Edit**, **Change from date…** ni **Close…**, y cada cuenta enlaza a su página de fees

#### Scenario: Sin fee.view
- **GIVEN** un usuario sin `fee.view`
- **WHEN** escribe `/fees` en el navegador
- **THEN** ve `You don't have access to this page` y no se llama a `GET /fees`

### Requirement: Pantalla Fees: columnas y orden
Cada fila SHALL mostrar la cuenta (enlace a `/accounts/<accountId>/fees`) con su merchant y su proveedor debajo, en la misma celda, tipo, a qué aplica (ciclo y estado, o `batch · preset` / `batch · free amount`), valor (importe con 4 decimales y/o porcentaje como `2.900 %`), `Valid from` (`always` si es `null`), `Valid to` (`open` si es `null`), estado (`Active`, `Scheduled`, `Closed`) y el día del último cambio en Nueva York (quién lo hizo está en el historial: el API no lo da en la fila). Las filas SHALL seguir el orden del API, sin reordenarse ni agruparse en la pantalla.

#### Scenario: Fee abierto por los dos lados
- **GIVEN** un MDR de ProviderA-USD con `percentage = "0.029000"`, `startDate = null` y `endDate = null`
- **THEN** su fila muestra `ProviderA-USD` con `Merchant A · Provider A` debajo, `MDR`, `E · Successful`, `2.900 %`, `always`, `open` y `Active`

#### Scenario: Programado
- **GIVEN** un fee con `status = "scheduled"`
- **THEN** su fila muestra el estado `Scheduled` con su color de estado

#### Scenario: Sin cabeceras de grupo
- **GIVEN** una página cuyo primer elemento es de `Provider A` y el último de `Provider C`
- **THEN** la tabla no tiene filas de cabecera `Merchant › Provider`: merchant y proveedor van bajo la cuenta en cada fila

#### Scenario: A 1024 px
- **GIVEN** la vista global a 1024 px de ancho, con la barra lateral
- **THEN** la tabla cabe en su tarjeta sin desplazamiento: `Merchant A · Provider A` solo se parte tras el separador, el tipo puede ocupar dos líneas, y la cuenta, los importes y los días quedan en una línea

### Requirement: Pantalla Fees: filtros en la dirección
La pantalla SHALL filtrar por merchant, proveedor y cuenta (en cascada, solo los del alcance), tipo (`All kinds`, `Transactional`, `Batch preset`, `Free amount`), estado (`Active`, `Scheduled`, `Closed`, `All statuses`) y búsqueda. Sin estado en la dirección SHALL pedir `status=active`; `All statuses` SHALL pedir sin `status`. Cada filtro SHALL escribirse en la dirección y volver a la primera página; la búsqueda, con espera entre pulsaciones. Valores inválidos de la dirección SHALL descartarse.

#### Scenario: Por defecto, los activos
- **WHEN** `analyst` abre `/fees`
- **THEN** la pantalla pide `GET /fees?status=active&page=1` y el filtro de estado muestra `Active`

#### Scenario: Todos los estados
- **WHEN** elige `All statuses`
- **THEN** la dirección lleva `status=all`, se pide `GET /fees` sin `status` y se vuelve a la página 1

#### Scenario: Recargar con filtros
- **GIVEN** `/fees?merchantId=1&kind=preset&q=monthly&page=2`
- **WHEN** se recarga
- **THEN** los filtros muestran esos valores y se pide esa misma consulta

#### Scenario: Valor inválido en la dirección
- **WHEN** se abre `/fees?status=withdrawn&kind=other`
- **THEN** se ignoran los dos valores y se piden los fees activos de todos los tipos

#### Scenario: Merchant fuera del alcance
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre `/fees?merchantId=2`
- **THEN** ve que la selección no está disponible, no ve fees del merchant 2 y puede volver a elegir

### Requirement: Pantalla Fees: paginación, carga y errores
La tabla SHALL paginarse en servidor con **Previous** / **Next**, el resumen `Page N of M · T fees` y la página en la dirección; una página posterior a la última SHALL llevar a la última sin dejarla en el historial. Mientras carga SHALL mostrar un esqueleto; sin resultados, `No fees match these filters.`; ante un error, un mensaje con **Retry**.

#### Scenario: Siguiente página
- **GIVEN** `total = 120` y `pageSize = 50`
- **WHEN** pulsa **Next**
- **THEN** la dirección lleva `page=2`, se pide `page=2` y el resumen dice `Page 2 of 3 · 120 fees`

#### Scenario: Página que ya no existe
- **WHEN** se abre `/fees?page=9` y el API dice `total = 60`
- **THEN** la dirección pasa a `page=2` sin añadir una entrada al historial

#### Scenario: Sin resultados
- **WHEN** la búsqueda no encuentra ningún fee
- **THEN** ve `No fees match these filters.`

#### Scenario: Fallo del API
- **WHEN** `GET /fees` responde `500`
- **THEN** ve el mensaje de error y **Retry** vuelve a pedir la misma página

### Requirement: Pantalla Account Fees: acceso y contenido
`/accounts/<accountId>/fees` SHALL exigir `fee.view` y mostrar el nombre de la cuenta, su merchant y proveedor, y todos sus fees (activos, programados y cerrados) con las columnas de la vista global salvo merchant, proveedor y cuenta, más el uso (`In use` o nada). Se llega desde el enlace de la cuenta en `/fees` y desde el enlace **Fees** de cada cuenta en Administration › Accounts. Una cuenta inexistente o fuera del alcance SHALL mostrar `This account is not available.`

#### Scenario: Desde Accounts
- **GIVEN** `viewer` en Administration › Accounts con Provider A elegido
- **WHEN** pulsa **Fees** en la fila de ProviderA-USD
- **THEN** llega a `/accounts/<ProviderA-USD>/fees` y ve `Fees · ProviderA-USD` con sus fees

#### Scenario: Desde la vista global
- **WHEN** pulsa `ProviderA-USD` en una fila de `/fees`
- **THEN** llega a la página de fees de esa cuenta

#### Scenario: Cuenta de otro merchant
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre la página de fees de ProviderC-Alt (merchant 2) o de un uuid inexistente
- **THEN** ve `This account is not available.` en los dos casos

#### Scenario: Cerrado
- **GIVEN** un fee con `status = "closed"` y `endDate = "2025-12-31"`
- **THEN** su fila muestra `Closed` y `2025-12-31`, y no ofrece **Close…**

### Requirement: Pantalla Account Fees: acciones según permiso y uso
Las acciones SHALL ofrecerse solo a quien tiene `fee.manage`: **Add fee** en la cabecera y, por fila, **Edit** (completo si `inUse = false`; limitado a descripción y fecha de fin si `inUse = true`), **Change from date…** solo si `inUse = true`, y **Close…** si el fee no está cerrado y su `endDate` es `null`. **History** SHALL ofrecerse a todos. No SHALL existir acción para retirar o borrar un fee.

#### Scenario: Sin fee.manage
- **WHEN** `analyst` abre la página de fees de ProviderA-USD
- **THEN** ve la tabla y **History** en cada fila, y no ve **Add fee**, **Edit**, **Change from date…** ni **Close…**

#### Scenario: Fee sin uso
- **GIVEN** `admin` y un fee con `inUse = false` y `endDate = null`
- **THEN** su fila ofrece **Edit**, **Close…** y **History**, y no **Change from date…**

#### Scenario: Fee en uso
- **GIVEN** `admin` y un fee con `inUse = true` y `endDate = null`
- **THEN** su fila ofrece **Edit**, **Change from date…**, **Close…** y **History**

#### Scenario: Sin retirar
- **GIVEN** `admin` y un fee programado sin uso
- **THEN** ninguna acción lo retira o lo borra: se corrige con **Edit**

### Requirement: Pantalla Account Fees: alta
**Add fee** SHALL abrir un formulario con tipo (los de `GET /fee-types`), importe fijo, porcentaje (en tanto por ciento), `Valid from` con la casilla `always (no start date)`, `Valid to` con `no end date` y descripción (hasta 100 caracteres). SHALL exigir al menos importe o porcentaje antes de enviar. El porcentaje SHALL enviarse como fracción en texto (`2.75` → `"0.027500"`) y el importe con hasta 4 decimales, nunca como número JSON. Al crearse, la lista SHALL mostrar el fee nuevo.

#### Scenario: Alta válida
- **GIVEN** `admin` en la página de fees de ProviderA-USD
- **WHEN** crea `Wire Fee` con importe `15`, `always` y `no end date`
- **THEN** se envía `POST /accounts/<ProviderA-USD>/fees` con `{ feeTypeId: 121, fixedAmount: "15", startDate: null, endDate: null }`, el formulario se cierra y la lista muestra el `Wire Fee` con `15.0000`

#### Scenario: Porcentaje
- **WHEN** crea un MDR con porcentaje `2.75` desde `2027-01-01`
- **THEN** el cuerpo lleva `percentage: "0.027500"` y `startDate: "2027-01-01"`, y la fila sale `Scheduled` con `2.750 %`

#### Scenario: Ni importe ni porcentaje
- **WHEN** intenta guardar sin importe ni porcentaje
- **THEN** ve `Enter a fixed amount, a percentage or both.` junto a los dos campos y no se envía nada

#### Scenario: Doble clic
- **WHEN** pulsa **Save fee** dos veces seguidas
- **THEN** se envía un solo `POST`

### Requirement: Pantalla Account Fees: corrección en el sitio
**Edit** SHALL abrir el formulario con los valores del fee. Sin uso, todos los campos menos el tipo son editables. En uso, solo descripción y `Valid to`, con la explicación `This fee has been applied to settlements: change its values from a date instead.` SHALL enviar `PATCH /fees/{id}` con solo los campos cambiados y el motivo opcional.

#### Scenario: Corrección de un fee sin uso
- **GIVEN** un MDR sin uso al `2.500 %`
- **WHEN** `admin` lo cambia a `2.75` con motivo `typo`
- **THEN** se envía `PATCH` con `{ percentage: "0.027500", reason: "typo" }` y la fila muestra `2.750 %`

#### Scenario: Fee en uso
- **GIVEN** un fee con `inUse = true`
- **WHEN** `admin` pulsa **Edit**
- **THEN** importe, porcentaje y `Valid from` se ven pero no se pueden editar, y la explicación está asociada al formulario

#### Scenario: Sin cambios
- **WHEN** abre **Edit** y guarda sin cambiar nada
- **THEN** ve `Nothing to save.` y no se envía nada

### Requirement: Pantalla Account Fees: cambio desde una fecha
**Change from date…** SHALL pedir `Effective from` y los valores nuevos (importe, porcentaje, descripción; prellenados con los actuales) y enviar `PATCH /fees/{id}` con `effectiveFrom` y solo los valores cambiados. SHALL explicar que el fee actual termina el día anterior y que los settlements ya procesados no cambian. Al aplicarse, la lista SHALL mostrar el fee cerrado y su sucesor.

#### Scenario: Cambio aplicado
- **GIVEN** un MDR en uso al `10.000 %`, `NULL…NULL`, con `lastAppliedEventDate = "2026-10-15"`
- **WHEN** `admin` lo cambia a `9.5` desde `2026-11-01`
- **THEN** se envía `{ effectiveFrom: "2026-11-01", percentage: "0.095000" }` y la lista muestra el MDR hasta `2026-10-31` y el nuevo desde `2026-11-01` al `9.500 %`

#### Scenario: Sin valores nuevos
- **WHEN** elige la fecha sin cambiar ningún valor
- **THEN** ve `Change at least one value.` y no se envía nada

### Requirement: Pantalla Account Fees: cierre de la vigencia
**Close…** SHALL pedir `Valid to`, por defecto el día de hoy en Nueva York, y un motivo opcional, y enviar `PATCH /fees/{id}` con `endDate`. Si el fee tiene `lastAppliedEventDate`, SHALL mostrarlo como fecha mínima (`Applied up to <fecha>: the end date cannot be earlier.`) y no SHALL dejar enviar una fecha anterior. Si el valor por defecto es anterior a ese mínimo, el campo SHALL empezar en el mínimo. El límite final lo pone el API.

#### Scenario: Valor por defecto
- **GIVEN** hoy es 2026-11-03 en Nueva York y son las 22:30 (ya 2026-11-04 en UTC)
- **WHEN** `admin` abre **Close…** de un fee sin uso
- **THEN** `Valid to` vale `2026-11-03`

#### Scenario: Cierre válido
- **GIVEN** un fee de Chargeback con `lastAppliedEventDate = "2026-10-15"`
- **WHEN** lo cierra el `2026-10-31`
- **THEN** se envía `{ endDate: "2026-10-31" }` y la fila muestra `2026-10-31`

#### Scenario: Antes del último evento aplicado
- **GIVEN** el mismo fee
- **WHEN** escribe `2026-10-01`
- **THEN** ve el mensaje del mínimo, **Close fee** está deshabilitado con el motivo asociado y no se envía nada

### Requirement: Pantalla Account Fees: errores del API
Un `400 validation_error` con `details.field` SHALL mostrarse junto a ese campo. `409 fee_overlap` SHALL listar los conflictos de `details.conflicts` con su vigencia. `409 fee_in_use` SHALL mostrar `details.fields` o `details.lastAppliedEventDate` y volver a pedir los fees de la cuenta. Ante cualquier error, también `403` o red, el formulario SHALL seguir abierto con lo escrito.

#### Scenario: Solape
- **GIVEN** un MDR vigente `2026-01-01…open` en la cuenta
- **WHEN** `admin` crea otro MDR desde `2026-11-01` y el API responde `409 fee_overlap` con ese conflicto
- **THEN** ve `Overlaps another MDR fee:` con `2026-01-01 → open`, y el formulario sigue abierto con sus valores

#### Scenario: Campo rechazado por el dominio
- **WHEN** el API responde `400 validation_error` con `details.field = "endDate"`
- **THEN** el mensaje sale junto a `Valid to`

#### Scenario: El fee pasó a estar en uso
- **GIVEN** un fee que la pantalla ve sin uso
- **WHEN** `admin` corrige su porcentaje y el API responde `409 fee_in_use` con `details.fields = ["percentage"]`
- **THEN** ve que ese campo ya no se puede editar porque el fee se ha aplicado, y la lista se vuelve a pedir y lo muestra `In use`

### Requirement: Pantalla Account Fees: historial
**History** SHALL abrir un panel lateral con el historial de la cadena del tipo en la cuenta (`GET /fees/{id}/history?scope=type`), del cambio más reciente al más antiguo: acción (`Created`, `Updated`, `Closed`, `Copied`), fecha y hora en Nueva York con `ET`, usuario, motivo si lo hay y lo que cambió entre `before` y `after`. Tras una escritura, el historial abierto SHALL actualizarse.

#### Scenario: Cadena tras un cambio desde una fecha
- **GIVEN** un MDR cambiado desde `2026-11-01`
- **WHEN** `analyst` abre **History** del sucesor
- **THEN** ve `Created` del sucesor, `Closed` del original con `Valid to: open → 2026-10-31` y la `Created` del seed, en ese orden

#### Scenario: Corrección con motivo
- **GIVEN** una fila `updated` con `reason = "typo"` y el porcentaje de `0.025000` a `0.027500`
- **THEN** el panel muestra `Updated`, `typo` y `Percentage: 2.500 % → 2.750 %`

#### Scenario: Teclado
- **WHEN** cierra el panel con Escape
- **THEN** el foco vuelve al botón **History** que lo abrió
