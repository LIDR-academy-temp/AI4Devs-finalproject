# Spec Delta — settlement

## ADDED Requirements

### Requirement: Settlements de una cuenta
`GET /api/v1/accounts/{id}/settlements` SHALL responder `200` con los intentos de la cuenta en cualquier estado, del más reciente al más antiguo por `processedAt` (luego `batchNo` e intento descendentes), paginados (`page` desde 1, `pageSize` 1–500, 50 por defecto) y con `total`. Cada intento SHALL traer batch, intento, estado, `settledStatus`, `settlementDate`, `processedAt`, quién lo aprobó, `amountPayable` como texto y canales.

#### Scenario: Historia sembrada de ProviderA-USD
- **GIVEN** el seed recién sembrado
- **WHEN** `analyst` pide los settlements de ProviderA-USD sin filtros
- **THEN** recibe `total = 22`, todos con `status = paid` y `settledStatus = settled`, el primero el batch 122 y el último el 101, cada uno con `attemptNo = 1`, `approvedBy.userName = analyst`, su `settlementDate` como `YYYY-MM-DD` y `amountPayable` con cuatro decimales

#### Scenario: Los 68 batches pagados del seed
- **GIVEN** el seed recién sembrado
- **WHEN** `analyst` (merchants 1 y 2) pide con `status=paid` los settlements de las cinco cuentas
- **THEN** la suma de sus `total` es 68

#### Scenario: Intento recién procesado
- **GIVEN** `batch-clean` procesado como batch 123
- **WHEN** se piden los settlements de ProviderA-USD
- **THEN** el primero es el batch 123, intento 1, con `status = processed` y `settledStatus = pending_payment`, y el segundo el 122

#### Scenario: Paginación estable
- **GIVEN** el seed recién sembrado
- **WHEN** se piden las páginas 1, 2 y 3 de ProviderA-USD con `pageSize = 10`
- **THEN** traen 10, 10 y 2 intentos, ninguno repetido, y repetir una página devuelve los mismos en el mismo orden

#### Scenario: Cuenta sin settlements
- **GIVEN** una cuenta del alcance sin intentos
- **WHEN** se piden sus settlements
- **THEN** recibe `200` con `items = []` y `total = 0`

### Requirement: Filtros de los settlements de una cuenta
`status` SHALL filtrar por estado (`processed`, `paid`, `undone`). `from` y `to` SHALL ser días `YYYY-MM-DD` inclusivos sobre la fecha de `dateField`: con `settlementDate` (por defecto), la columna sin convertir, y sin ella el intento queda fuera; con `processedAt`, el día de calendario en Nueva York del instante, con cambio de hora. Un `status` o `dateField` desconocido, una fecha mal formada o `from` posterior a `to` SHALL responder `400 validation_error`.

#### Scenario: Por estado
- **GIVEN** el seed recién sembrado, sin ningún batch procesado
- **WHEN** se piden los settlements de ProviderA-USD con `status=processed`
- **THEN** la lista está vacía, y con `status=paid` trae los 22

#### Scenario: Por fecha de liquidación
- **GIVEN** la `settlementDate` del batch 122 de ProviderA-USD leída de la lista
- **WHEN** se piden con `from` y `to` iguales a esa fecha
- **THEN** la lista trae solo el batch 122

#### Scenario: Rango abierto por un lado
- **GIVEN** la `settlementDate` del batch 112 de ProviderA-USD
- **WHEN** se piden con solo `from` igual a esa fecha
- **THEN** la lista trae los batches 112 a 122 y ninguno anterior

#### Scenario: Por día de procesado en Nueva York
- **GIVEN** un intento procesado en `2026-10-21T03:59:59Z` (23:59:59 del 20 en Nueva York) y otro en `2026-10-21T04:00:00Z` (medianoche del 21)
- **WHEN** se piden con `dateField=processedAt&from=2026-10-20&to=2026-10-20`
- **THEN** la lista trae solo el primero, y con `from=2026-10-21&to=2026-10-21` solo el segundo

#### Scenario: Cambio de hora del 1 de noviembre de 2026
- **GIVEN** un intento procesado en `2026-11-02T04:30:00Z` (23:30 EST del 1 de noviembre) y otro en `2026-11-02T05:00:00Z` (medianoche EST del 2)
- **WHEN** se piden con `dateField=processedAt&from=2026-11-01&to=2026-11-01`
- **THEN** la lista trae solo el primero, y con `from=2026-11-02&to=2026-11-02` solo el segundo

#### Scenario: Filtros inválidos
- **WHEN** se piden con `status=settled`, con `dateField=createdAt`, con `from=24/10/2026`, con `from=2026-02-30` o con `from=2026-10-24&to=2026-10-01`
- **THEN** responde `400` con `code = "validation_error"`

### Requirement: Alcance de los settlements de una cuenta
La lectura SHALL exigir autenticación y ningún permiso propio, de modo que `viewer` la usa. Sin token SHALL responder `401 unauthorized` antes de mirar la cuenta. Una cuenta inexistente o de un merchant fuera del alcance del usuario SHALL responder el mismo `404 not_found` (`"Account not found"`), y un identificador que no es UUID, `400 validation_error`.

#### Scenario: viewer en su alcance
- **WHEN** `viewer` (solo merchant 1) pide los settlements de ProviderA-USD
- **THEN** recibe `200` con los mismos intentos que `analyst`

#### Scenario: Cuenta de otro merchant
- **WHEN** `viewer` pide los settlements de ProviderC-Alt (merchant 2)
- **THEN** recibe el mismo `404` con `code = "not_found"` que para un `accountId` inexistente

#### Scenario: Sin token
- **WHEN** se piden sin `Authorization`
- **THEN** responde `401` con `code = "unauthorized"`

### Requirement: Pantalla Settlement List: llegar a la lista
La entrada **Settlements › Settlement List** del menú SHALL llevar a `/settlements`, donde se elige merchant → proveedor → cuenta, incluidas las cerradas. Un único valor posible SHALL preseleccionarse. La cuenta elegida, los filtros y la página SHALL guardarse en la dirección, de modo que recargar o compartir el enlace muestra lo mismo. Sin cuenta elegida no se SHALL pedir ningún settlement.

#### Scenario: Desde el menú
- **GIVEN** `analyst` en Dashboard
- **WHEN** pulsa **Settlement List**
- **THEN** ve `Settlement List`, las migas `Dashboard › Settlements › Settlement List`, los selectores de merchant, proveedor y cuenta y `Choose an account to see its settlements.`, y no se ha pedido ningún settlement

#### Scenario: Un solo merchant y un solo proveedor
- **GIVEN** un usuario cuyo alcance tiene un merchant y ese merchant un único proveedor
- **WHEN** abre la lista
- **THEN** merchant y proveedor llegan elegidos y la dirección los lleva

#### Scenario: Enlace con la cuenta
- **WHEN** `analyst` abre `/settlements?accountId=<ProviderA-USD>`
- **THEN** ve elegidos Merchant A, Provider A y ProviderA-USD y la lista de sus settlements

#### Scenario: Cuenta fuera del alcance por enlace
- **WHEN** `viewer` abre `/settlements?accountId=<ProviderC-Alt>`
- **THEN** ve que la cuenta no está disponible, sin lista y sin decir si existe

### Requirement: Pantalla Settlement List: columnas
Cada fila SHALL mostrar el batch, el intento, el estado (`Processed · pending payment`, `Paid` o `Undone`), la fecha de liquidación, quién lo procesó y cuándo, el amount payable alineado a la derecha y los canales, tal como llegan del API. Ninguna cifra SHALL calcularse, sumarse ni reformatearse más allá del separador de miles. Un intento `undone` SHALL verse atenuado.

#### Scenario: Batch sembrado
- **GIVEN** la lista de ProviderA-USD del seed
- **THEN** la primera fila muestra `122`, `1`, `Paid`, su fecha de liquidación con sufijo `ET`, `analyst` con el instante de procesado en ET, su `amountPayable` con separador de miles y sus canales

#### Scenario: Sin fecha de liquidación
- **GIVEN** un intento con `settlementDate = null`
- **THEN** su celda dice `Not set`

#### Scenario: Importe sin pasar por number
- **GIVEN** un intento con `amountPayable = "123456789012345.1234"`
- **THEN** se ve `123,456,789,012,345.1234`

### Requirement: Pantalla Settlement List: filtros y paginación
La pantalla SHALL ofrecer el estado (`All statuses` por defecto, `Processed · pending payment`, `Paid`, `Undone`), el desplegable **Date** (`Settlement date` por defecto, `Processed (ET)`) y las fechas **From** y **To**, que se envían tal cual como `YYYY-MM-DD`, y SHALL paginar en el servidor. Cambiar un filtro SHALL volver a la página 1. Con **From** posterior a **To** SHALL avisar en el campo y no pedir la lista.

#### Scenario: Filtrar por estado
- **GIVEN** la lista de ProviderA-USD
- **WHEN** elige `Paid`
- **THEN** se pide con `status=paid&page=1` y la dirección lo lleva

#### Scenario: Filtrar por fechas
- **WHEN** elige **From** `2026-09-01` y **To** `2026-09-30`
- **THEN** se pide con `from=2026-09-01&to=2026-09-30`, sin convertir de zona y sin `dateField`

#### Scenario: Filtrar por día de procesado
- **WHEN** elige **Date** `Processed (ET)` con **From** `2026-10-20`
- **THEN** se pide con `dateField=processedAt&from=2026-10-20&page=1`, sin convertir de zona, y la dirección lo lleva; al recargar, **Date** sigue en `Processed (ET)`

#### Scenario: Rango al revés
- **WHEN** elige **From** `2026-10-24` y **To** `2026-10-01`
- **THEN** ve `The start date must not be after the end date.` en el campo y no se pide la lista

#### Scenario: Dos páginas
- **GIVEN** los 22 batches de ProviderA-USD y 20 por página
- **WHEN** pulsa **Next**
- **THEN** ve `Page 2 of 2 · 22 settlements`, los batches 102 y 101, y **Next** deshabilitado

#### Scenario: Sin resultados
- **GIVEN** filtros que no dejan ningún intento
- **THEN** ve `No settlements match these filters.`

### Requirement: Pantalla Settlement List: abrir el Settlement Summary
El batch de cada fila SHALL ser un enlace a `/settlements/<batchId>`, con nombre accesible `Batch <batchNo> · attempt <attemptNo>`. El Settlement Summary SHALL ofrecer un enlace de vuelta a la lista de su cuenta.

#### Scenario: Abrir un batch sembrado
- **GIVEN** la lista de ProviderA-USD
- **WHEN** `analyst` pulsa `Batch 122 · attempt 1`
- **THEN** ve su Settlement Summary con `Paid` y sin el aviso de no Settled

#### Scenario: Volver a la lista
- **GIVEN** el Settlement Summary de un intento de ProviderA-USD
- **WHEN** pulsa **Settlements of ProviderA-USD**
- **THEN** vuelve a `/settlements` con ProviderA-USD elegida

### Requirement: Pantalla Settlement List: carga y errores
Mientras se pide la lista SHALL verse un estado de carga. Un error SHALL mostrarse con **Retry**, sin vaciar los filtros. Un `404` de la cuenta SHALL mostrarse como cuenta no disponible.

#### Scenario: Error de red
- **WHEN** la lectura de la lista falla
- **THEN** ve `The settlements could not be loaded.` con **Retry**, y los filtros siguen en la dirección

#### Scenario: Cuenta que deja de estar disponible
- **WHEN** la lectura responde `404`
- **THEN** ve que la cuenta no está disponible

### Requirement: Pantalla Settlement Summary: pestaña Movements
El Settlement Summary SHALL tener las pestañas **Summary** y **Movements**. **Movements** SHALL mostrar los movimientos del ciclo elegido (E, I o R, con E por defecto) en el orden del API, paginados en el servidor, con transacción, estado, ronda, fila de origen, fecha del evento, importe, fees con su desglose, reserva y Settled, tal como llegan. Pestaña, ciclo y página SHALL guardarse en la dirección.

#### Scenario: Movimientos E de batch-clean
- **GIVEN** `batch-clean` procesado
- **WHEN** `analyst` abre **Movements**
- **THEN** se pide `type=E&page=1`, ve los ciclos `E (450)`, `I (10)` y `R (320)` con los contadores de la vista y `Page 1 of 9 · 450 movements`

#### Scenario: Ajustes con su desglose
- **GIVEN** la pestaña **Movements**
- **WHEN** elige `I`
- **THEN** se pide `type=I&page=1`, ve los 10 movimientos con su estado, su ronda y su `feeAmount`, y al abrir el desglose de uno ve cada fee con su título y su `amountUsd`

#### Scenario: Movimiento sin fecha ni fila
- **GIVEN** un movimiento con `eventDate = null` y uno sembrado con `sheetId = null`
- **THEN** el primero dice `Undated` en la fecha y el segundo `—` en la fila de origen

#### Scenario: Settled según el intento
- **GIVEN** un batch sembrado `paid` y un intento `processed`
- **THEN** los movimientos del primero dicen `Settled` y los del segundo `Pending payment`

#### Scenario: Recargar en Movements
- **WHEN** recarga `/settlements/<batchId>?tab=movements&cycle=R&page=2`
- **THEN** ve **Movements** con `R` y la página 2

#### Scenario: Error al leer movimientos
- **WHEN** la lectura de movimientos falla
- **THEN** ve `The movements could not be loaded.` con **Retry**, y la pestaña **Summary** sigue disponible

### Requirement: Pantalla Settlement List: solo lectura
`viewer` SHALL poder usar la lista y las dos pestañas del Settlement Summary de las cuentas de su alcance. Ninguna de estas pantallas SHALL ofrecer pagar, retirar el pago, deshacer ni exportar la lista, ni hacer peticiones de escritura.

#### Scenario: viewer recorre la lista y los movimientos
- **WHEN** `viewer` abre la lista de ProviderA-USD, abre el batch 122 y su pestaña **Movements**
- **THEN** ve lo mismo que `analyst`, sin botones de pagar, retirar el pago, deshacer ni exportar la lista, y no sale ninguna petición que no sea `GET`

## MODIFIED Requirements

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio (`dateRanges`, `settlementDate`, vigencias de los fees, y `eventDate` y `expectedReserveReleaseAt` de los movimientos) SHALL mostrarse con los dígitos recibidos y sufijo `ET`, sin convertir. Las de auditoría (`processedAt`, también en Settlement List) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11.000Z"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24 ET`, `2026-09-28 00:04 ET` y `2026-10-19 11:40 ET`

#### Scenario: Fechas de la lista y de los movimientos
- **GIVEN** una fila de Settlement List con `settlementDate = "2026-10-24"` y `processedAt = "2026-10-19T15:40:03.120Z"`, y un movimiento con `eventDate = "2026-09-28T00:04:11.000Z"`, con el navegador en otra zona
- **THEN** la fila muestra `2026-10-24 ET` y `2026-10-19 11:40 ET`, y el movimiento `2026-09-28 00:04 ET`

### Requirement: Pantallas de settlement: teclado y motivos
Todas las acciones de Settlement Review, Settlement Summary (con sus dos pestañas) y Settlement List SHALL poder hacerse solo con teclado. Todo botón deshabilitado SHALL llevar su motivo en texto visible asociado con `aria-describedby`.

#### Scenario: Procesar con teclado
- **WHEN** `analyst` recorre Settlement Review con Tab, Enter y Espacio
- **THEN** puede editar el número, añadir y quitar fees, marcar la casilla de canales y pulsar **Process**, y cada botón deshabilitado anuncia su motivo

#### Scenario: Summary con teclado
- **GIVEN** las descargas disponibles
- **WHEN** `analyst` recorre el Settlement Summary con Tab
- **THEN** llega a **Merchant summary**, **Transactions (CSV)**, **Reserves (CSV)**, **View the validations** y **Back to Dashboard**

#### Scenario: Lista y movimientos con teclado
- **WHEN** `viewer` recorre Settlement List con Tab, flechas, Enter y Espacio
- **THEN** elige la cuenta, el estado, la fecha que filtra y las fechas, cambia de página, abre un batch, pasa a **Movements**, cambia de ciclo y abre el desglose de un movimiento, y **Previous** / **Next** deshabilitados anuncian su motivo
