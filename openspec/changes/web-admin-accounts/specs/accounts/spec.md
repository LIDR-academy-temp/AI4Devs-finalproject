# Delta — accounts

## ADDED Requirements

### Requirement: Pantalla Account Detail: acceso y cabecera
`/accounts/<accountId>` SHALL mostrarse a todos los roles con la cuenta en su alcance. La cabecera SHALL mostrar el nombre de la cuenta como título, su estado (`active` / `closed`), merchant y proveedor, y un enlace **Settlements** a su Settlement List. Una cuenta inexistente, fuera del alcance o con un identificador mal formado SHALL mostrar `This account is not available.` sin datos de la cuenta.

#### Scenario: Ficha de ProviderA-USD
- **GIVEN** `viewer`
- **WHEN** abre `/accounts/<ProviderA-USD>`
- **THEN** ve el título `ProviderA-USD`, `active`, `Merchant A › Provider A` y **Settlements**, que lleva a `/settlements` con Merchant A, Provider A y ProviderA-USD elegidos

#### Scenario: Cuenta de otro merchant
- **GIVEN** `viewer` (merchant 1)
- **WHEN** abre la ficha de ProviderC-Alt (merchant 2), la de un uuid inexistente o `/accounts/not-a-uuid`
- **THEN** ve `This account is not available.` en los tres casos

#### Scenario: Migas
- **WHEN** `viewer` abre la ficha de una cuenta
- **THEN** ve `Dashboard › Administration › Accounts › Account detail`, con Dashboard como enlace

### Requirement: Pantalla Account Detail: acciones de la cabecera
La cabecera SHALL ofrecer **Edit** y **Close…** (cuenta abierta) o **Reopen…** (cuenta cerrada) solo a quien tiene `account.manage`, y **New reconciliation** solo a quien tiene `settlement.process` y solo si la cuenta está abierta; este último SHALL llevar a New Reconciliation con merchant, proveedor y cuenta elegidos.

#### Scenario: admin en una cuenta abierta
- **WHEN** `admin` abre la ficha de ProviderA-USD
- **THEN** ve **Edit**, **Close…** y **New reconciliation**, y no **Reopen…**

#### Scenario: analyst
- **WHEN** `analyst` abre la ficha de ProviderA-USD
- **THEN** ve **New reconciliation**, que lleva a `/reconciliations/new` con Merchant A, Provider A y ProviderA-USD elegidos, y no ve **Edit**, **Close…** ni **Reopen…**

#### Scenario: viewer
- **WHEN** `viewer` abre la ficha de ProviderA-USD
- **THEN** no ve ninguna de las cuatro acciones

#### Scenario: Cuenta cerrada
- **GIVEN** una cuenta cerrada del alcance de `admin`
- **WHEN** `admin` abre su ficha
- **THEN** ve `closed`, **Edit** y **Reopen…**, y no **Close…** ni **New reconciliation**

### Requirement: Pantalla Account Detail: pestañas
La ficha SHALL tener dos pestañas, cada una con su dirección: **Overview** (`/accounts/<accountId>`) y **Fees** (`/accounts/<accountId>/fees`, solo con `fee.view`). Recargar o compartir la dirección SHALL mostrar la misma pestaña. No SHALL haber pestañas de reglas de pareo, settlements ni actividad.

#### Scenario: Cambiar de pestaña
- **GIVEN** `viewer` en la Overview de ProviderA-USD
- **WHEN** pulsa la pestaña **Fees**
- **THEN** la dirección pasa a `/accounts/<ProviderA-USD>/fees`, la pestaña Fees queda seleccionada y la cabecera de la cuenta sigue visible

#### Scenario: Enlace directo a la pestaña
- **WHEN** `viewer` abre `/accounts/<ProviderA-USD>/fees`
- **THEN** ve la ficha de ProviderA-USD con la pestaña Fees seleccionada

### Requirement: Pantalla Account Detail: Overview
La pestaña Overview SHALL mostrar la política de reserva ante chargeback, el tope (`none` si es `null`, a partir del string decimal sin convertirlo a número), el conjunto de reglas de pareo por su nombre (`None · global rules` si no tiene), la fecha de creación y quién la creó, y la última modificación en hora de Nueva York.

#### Scenario: Cuenta con tope
- **WHEN** `viewer` abre la Overview de ProviderA-EUR
- **THEN** ve `hold_until_term`, el tope `50,000.0000`, `None · global rules`, la creación con `by admin` y la fecha de `createdAt` en hora de Nueva York, y la última modificación de `updatedAt`

#### Scenario: Cuenta enlazada a un conjunto
- **WHEN** `admin` abre la Overview de ProviderC-Alt
- **THEN** ve `Provider C legacy` como reglas de pareo y el tope `none`

### Requirement: Pantalla Account Detail: canales
La Overview SHALL listar los canales de la cuenta con su gateway (`Gateway <id>`), su papel en la cuenta (`primary`, o `historical` con la cuenta principal actual del canal o `no primary`), el batch de la asociación (`batch <n>`, o `—` si no la creó ningún batch), y term y reserva (`14 d · 10 % / 180 d`). Una cuenta sin canales SHALL decirlo. SHALL explicar que los canales no se asignan a mano.

#### Scenario: Canales principales
- **WHEN** `viewer` abre la Overview de ProviderA-USD
- **THEN** ve `RAM-01` y `RAM-02` como `primary`, cada uno con `Gateway 1`, `batch <assignedInBatchNo>` y `14 d · 10 % / 180 d`

#### Scenario: Canal histórico
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en ProviderA-EUR con `isPrimary = false`
- **WHEN** `admin` abre la Overview de ProviderA-EUR
- **THEN** ve `RAM-01` como `historical · primary in ProviderA-USD` y `RAM-03` como `primary`

#### Scenario: Asociación sin batch
- **GIVEN** un canal de la cuenta con `assignedInBatchNo = null`
- **THEN** su fila muestra `—` en la columna del batch

#### Scenario: Cuenta sin canales
- **GIVEN** una cuenta recién creada
- **WHEN** se abre su Overview
- **THEN** ve `No channels yet. Channels join an account with the first processed settlement that includes them.`

### Requirement: Pantalla Account Detail: carga y errores
Mientras carga, la ficha SHALL indicar que está cargando sin mostrar datos de otra cuenta. Si una consulta falla (que no sea por sesión expirada ni `404`) SHALL mostrar `Could not load the account.` con **Retry**, que vuelve a pedir solo lo que falló.

#### Scenario: Error y reintento
- **GIVEN** que `GET /accounts/{id}/channels` responde `500` una vez y después `200`
- **WHEN** `viewer` abre la ficha de ProviderA-USD y pulsa **Retry**
- **THEN** ve los canales de ProviderA-USD

#### Scenario: Conjunto de reglas no disponible
- **GIVEN** que `GET /providers/{id}/matching-rule-sets` falla
- **WHEN** `admin` abre la Overview de ProviderC-Alt
- **THEN** ve el resto de la cuenta y, en lugar del nombre del conjunto, `Rule set 3` sin bloquear la pantalla

### Requirement: Pantalla New account: formulario
Quien tiene `account.manage` SHALL ver **New account** en Accounts, que abre un diálogo con nombre, merchant, proveedor (preseleccionados con los de la página), política de reserva ante chargeback (`hold_until_term` por defecto), tope opcional, fees y reglas de pareo. **Create account** SHALL enviar `POST /providers/{id}/accounts` una sola vez aunque se pulse dos veces y, con `201`, llevar a la ficha de la cuenta nueva. El texto de ayuda SHALL decir `Name must be unique`.

#### Scenario: Sin account.manage
- **WHEN** `analyst` o `viewer` abren Accounts
- **THEN** no ven **New account**

#### Scenario: Cuenta mínima
- **GIVEN** `admin` en Accounts con Merchant B y Provider C elegidos
- **WHEN** abre **New account**, escribe `ProviderC-New` y pulsa **Create account**
- **THEN** se envía `{ name: "ProviderC-New", chargebackReservePolicy: "hold_until_term", rollingReserveCapAmt: null, matchingRuleSetId: null, copyFeesFromAccountId: null }` a `POST /providers/201/accounts` y llega a la ficha de `ProviderC-New`

#### Scenario: Tope como texto
- **WHEN** `admin` escribe `25000.5` como tope y crea la cuenta
- **THEN** el cuerpo lleva `rollingReserveCapAmt = "25000.5"` como string

#### Scenario: Validación local
- **WHEN** `admin` pulsa **Create account** con el nombre vacío, de 51 caracteres, o con el tope `-1` o `1.23456`
- **THEN** ve el error junto a ese campo, el foco va al primer campo con error y no se envía nada

#### Scenario: Cancelar
- **WHEN** `admin` cierra el diálogo con **Cancel** o Escape
- **THEN** no se envía nada y el foco vuelve a **New account**

### Requirement: Pantalla New account: fees y reglas de pareo
El campo Fees SHALL ofrecer `No fees` (por defecto) y las cuentas del proveedor elegido, abiertas y cerradas (`(closed)`); explicará que se copian solo los fees activos, con vigencia abierta. El campo Matching rules SHALL ofrecer `None · global rules` (por defecto) y los conjuntos activos del proveedor. Cambiar de proveedor SHALL volver los dos campos a su valor por defecto.

#### Scenario: Copiar fees y enlazar conjunto en Provider C
- **GIVEN** `admin` en el diálogo con Provider C
- **WHEN** elige `ProviderC-USD` en Fees y `Provider C legacy` en Matching rules y crea la cuenta
- **THEN** el cuerpo lleva `copyFeesFromAccountId` = el `accountId` de ProviderC-USD y `matchingRuleSetId` = el `ruleSetId` de Provider C legacy

#### Scenario: Proveedor sin conjuntos
- **WHEN** `admin` elige Provider A en el diálogo
- **THEN** Matching rules solo ofrece `None · global rules`, y Fees ofrece `No fees`, `ProviderA-EUR` y `ProviderA-USD`

#### Scenario: Cambio de proveedor
- **GIVEN** `admin` con `ProviderC-USD` elegida en Fees
- **WHEN** cambia a Merchant A y Provider A
- **THEN** Fees vuelve a `No fees` y Matching rules a `None · global rules`

### Requirement: Pantalla Edit account
**Edit** SHALL abrir un panel lateral con nombre, política de reserva, tope, reglas de pareo (conjuntos activos del proveedor, más el actual aunque esté inactivo) y un motivo opcional (hasta 500 caracteres). **Save** SHALL enviar a `PATCH /accounts/{id}` solo los campos cambiados (el tope se compara como texto decimal normalizado) y el motivo si se escribió; sin cambios SHALL mostrar `Nothing to save.` sin enviar nada. Con `200`, el panel se cierra y la ficha muestra la respuesta.

#### Scenario: Cambiar política y tope
- **GIVEN** `admin` en la ficha de ProviderA-USD
- **WHEN** abre **Edit**, elige `release_on_chargeback`, escribe `1000` como tope y guarda
- **THEN** se envía `{ chargebackReservePolicy: "release_on_chargeback", rollingReserveCapAmt: "1000" }` y la Overview muestra `release_on_chargeback` y `1,000.0000`

#### Scenario: Mismo tope con otra escala
- **GIVEN** ProviderA-EUR con tope `50000.0000`
- **WHEN** `admin` escribe `50000` en el tope y guarda sin tocar nada más
- **THEN** ve `Nothing to save.` y no se envía nada

#### Scenario: Desenlazar el conjunto
- **GIVEN** ProviderC-Alt enlazada a Provider C legacy y sin tope
- **WHEN** `admin` elige `None · global rules` y guarda
- **THEN** se envía solo `{ matchingRuleSetId: null }` y la Overview muestra `None · global rules`

#### Scenario: Quitar el tope
- **GIVEN** ProviderA-EUR con tope `50000.0000`
- **WHEN** `admin` vacía el tope y guarda
- **THEN** se envía solo `{ rollingReserveCapAmt: null }` y la Overview muestra `none`

#### Scenario: Renombrar con motivo
- **WHEN** `admin` cambia el nombre de una cuenta a `ProviderA-USD2` con el motivo `typo` y guarda
- **THEN** se envía `{ name: "ProviderA-USD2", reason: "typo" }` y el título de la ficha pasa a `ProviderA-USD2`

### Requirement: Pantalla Close / Reopen de una cuenta
**Close…** y **Reopen…** SHALL pedir confirmación con un motivo opcional (hasta 500 caracteres) y explicar la consecuencia: una cuenta cerrada no admite imports nuevos, lo que ya estaba abierto sigue su curso y sus canales conservan su cuenta principal. Confirmar SHALL enviar `PATCH /accounts/{id}` con `isActive` y el motivo si lo hay, una sola vez; mientras la petición está en curso el diálogo no se cierra.

#### Scenario: Cerrar
- **GIVEN** `admin` en la ficha de ProviderA-USD
- **WHEN** pulsa **Close…**, escribe `provider stopped` y confirma
- **THEN** se envía `{ isActive: false, reason: "provider stopped" }`, la cabecera muestra `closed` y **Reopen…**, y desaparece **New reconciliation**

#### Scenario: Reabrir sin motivo
- **GIVEN** una cuenta cerrada
- **WHEN** `admin` pulsa **Reopen…** y confirma sin motivo
- **THEN** se envía `{ isActive: true }` y la cabecera muestra `active`

#### Scenario: Cancelar
- **WHEN** `admin` cancela el diálogo
- **THEN** no se envía nada y el foco vuelve a la acción

### Requirement: Formularios de cuenta: errores del API
Ante un error del API, el diálogo o el panel SHALL seguir abiertos con todo lo escrito. `409 account_name_taken` SHALL mostrarse en el campo Name; `400 validation_error` con `details.field` (`copyFeesFromAccountId`, `matchingRuleSetId`, `rollingReserveCapAmt`) junto a ese campo; el resto (`400` sin campo, `403`, `404`, error de red) como mensaje del formulario. El foco SHALL ir al campo con error o al mensaje.

#### Scenario: Nombre en uso
- **GIVEN** que `POST /providers/201/accounts` responde `409 account_name_taken`
- **WHEN** `admin` crea `ProviderA-USD` en Provider C
- **THEN** el campo Name muestra `This name is already used by another account. Name must be unique.`, el diálogo sigue abierto con los valores escritos y el foco en Name

#### Scenario: Conjunto ya no válido
- **GIVEN** que `PATCH /accounts/{id}` responde `400 validation_error` con `details.field = "matchingRuleSetId"`
- **WHEN** `admin` guarda el panel Edit
- **THEN** Matching rules muestra `This rule set is no longer available for this provider.` y el panel conserva lo escrito

#### Scenario: Cuenta origen de fees no válida
- **GIVEN** que `POST /providers/{id}/accounts` responde `400` con `details.field = "copyFeesFromAccountId"`
- **WHEN** `admin` crea la cuenta
- **THEN** el campo Fees muestra `Fees cannot be copied from this account.`

#### Scenario: Sin permiso o sin red
- **GIVEN** que la escritura responde `403`, o la red falla
- **WHEN** `admin` envía el formulario
- **THEN** ve el mensaje del formulario (`You don't have permission to manage accounts.` o `Could not reach the server. Try again.`) y lo escrito se conserva

### Requirement: Pantalla Channel Assignment: acceso y filtros
Administration › Channel Assignment (`/channel-assignment`) SHALL mostrarse a todos los roles, ser de solo lectura y ofrecer filtros opcionales de merchant (`All merchants`) y proveedor (`All providers`, del merchant elegido) reflejados en la dirección. Un merchant o proveedor fuera del alcance en la dirección SHALL mostrar `This merchant or provider is not available.` sin datos. SHALL explicar que la asignación ocurre al procesar settlements y que deshacer un batch no mueve la principal.

#### Scenario: viewer sin filtros
- **WHEN** `viewer` abre Channel Assignment
- **THEN** ve los canales de Provider A y Provider B, ninguno de Provider C, y ninguna acción para asignar o mover canales

#### Scenario: Filtro por proveedor
- **WHEN** `admin` elige Merchant A y Provider B
- **THEN** la dirección lleva `merchantId=1&providerId=102` y solo se ven `RAM-11`, `RAM-12` y `RAM-13`

#### Scenario: Proveedor fuera del alcance
- **WHEN** `viewer` abre `/channel-assignment?merchantId=2&providerId=201`
- **THEN** ve `This merchant or provider is not available.`

### Requirement: Pantalla Channel Assignment: canales sin asignar
La sección **Not assigned yet** SHALL listar los canales con transacciones y sin cuenta, con su gateway (`Gateway <id>`), merchant y proveedor, y term y reserva. Sin ninguno SHALL decir `Every channel with transactions has an account.`

#### Scenario: Canales nuevos del seed
- **WHEN** `viewer` abre Channel Assignment
- **THEN** **Not assigned yet (2)** lista `RAM-07` (`Merchant A › Provider A`) y `RAM-13` (`Merchant A › Provider B`)

#### Scenario: Sin canales sin asignar
- **WHEN** `admin` filtra por Provider C
- **THEN** ve `Every channel with transactions has an account.` en esa sección

### Requirement: Pantalla Channel Assignment: cuenta principal por canal
La sección **Primary account per channel** SHALL listar los demás canales visibles con su proveedor, su cuenta principal (enlace a su ficha, o `—` si no tiene o no es visible), desde qué batch lo es (`batch <n>`, o `—`) y sus cuentas históricas (o `—`).

#### Scenario: Principales de Provider A
- **WHEN** `viewer` filtra por Provider A
- **THEN** ve `RAM-01` y `RAM-02` con `ProviderA-USD` y `RAM-03` con `ProviderA-EUR`, cada uno con `batch <assignedInBatchNo>` y sin históricas, y `RAM-07` no aparece en esta sección

#### Scenario: Canal con histórica
- **GIVEN** una fila `AccountChannel` adicional de `RAM-01` en ProviderA-EUR con `isPrimary = false`
- **WHEN** `admin` abre Channel Assignment
- **THEN** `RAM-01` muestra `ProviderA-USD` como principal y `ProviderA-EUR` como histórica

#### Scenario: Ir a la cuenta
- **WHEN** `viewer` pulsa `ProviderA-EUR` en la fila de `RAM-03`
- **THEN** llega a la ficha de ProviderA-EUR

### Requirement: Pantalla Channel Assignment: carga y errores
Mientras carga, la pantalla SHALL indicar que está cargando. Si una consulta falla (que no sea por sesión expirada) SHALL mostrar `Could not load channels.` con **Retry**, que vuelve a pedir solo lo que falló.

#### Scenario: Error y reintento
- **GIVEN** que `GET /channels` responde `500` una vez y después `200`
- **WHEN** `viewer` abre Channel Assignment y pulsa **Retry**
- **THEN** ve las dos secciones con sus canales

## MODIFIED Requirements

### Requirement: Pantalla Accounts: cuentas del proveedor
Con un proveedor elegido, la pantalla SHALL listar sus cuentas ordenadas por nombre con nombre, política de reserva ante chargeback, tope de reserva y estado (`active` / `closed`). El nombre SHALL enlazar a la ficha de la cuenta (Account Detail). El tope SHALL mostrarse a partir del string decimal del API, sin convertirlo a número, y `none` cuando es `null`. Un proveedor sin cuentas SHALL mostrar un estado vacío. Quien tiene `account.manage` SHALL ver **New account**.

#### Scenario: Cuentas de Provider A
- **GIVEN** el usuario `viewer`
- **WHEN** elige `Provider A`
- **THEN** ve `ProviderA-EUR` y `ProviderA-USD`, en ese orden, ambas `active` y con `hold_until_term`
- **AND** el tope de `ProviderA-EUR` se muestra `50,000.0000` y el de `ProviderA-USD` `none`

#### Scenario: Política de liberación
- **WHEN** `viewer` elige `Provider B`
- **THEN** ve solo `ProviderB-Main` con `release_on_chargeback`

#### Scenario: Proveedor sin cuentas
- **GIVEN** un proveedor visible sin cuentas
- **WHEN** se elige
- **THEN** ve `This provider has no accounts yet.` en lugar de la tabla

#### Scenario: Enlace a la ficha
- **WHEN** `viewer` pulsa `ProviderA-USD` en la lista de Provider A
- **THEN** llega a `/accounts/<ProviderA-USD>` con la pestaña Overview

#### Scenario: New account solo con account.manage
- **WHEN** `admin` abre Accounts con Provider C elegido
- **THEN** ve **New account**; `analyst` y `viewer` no lo ven
