# Spec Delta — settlement (pantallas Settlement Review y Settlement Summary)

## ADDED Requirements

### Requirement: Pantalla Settlement Review: acceso y estado del import
Settlement Review SHALL ser una pantalla del import que exige `settlement.process`. Sin el permiso SHALL mostrar `You don't have access to this page` sin llamar a ningún endpoint de la pantalla. Con el permiso, SHALL mostrar el formulario solo si el import está `validated`. En otro estado SHALL decir por qué y SHALL enlazar a donde se puede seguir, sin formulario ni **Process**.

#### Scenario: viewer por enlace directo
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `viewer` abre su Settlement Review por la dirección
- **THEN** ve `You don't have access to this page` y no se llama a `batch-number/next`, `fees`, `fee-types` ni `settlements/preview`

#### Scenario: Import analizado
- **GIVEN** el import de `batch-clean` `analyzed`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** ve `This import is not validated. Review its validations before processing.` con un enlace al paso Analysis, sin formulario ni **Process**, y no se llama a `settlements/preview`

#### Scenario: Import ya procesado
- **GIVEN** el import de `batch-clean` `processed` con `currentBatchId`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** ve `This import is already processed.` con **View settlement summary**, que lleva al Settlement Summary de ese intento

### Requirement: Pantalla Settlement Review: número de batch propuesto y editable
Al abrir Settlement Review de un import `validated`, el campo **Batch number** SHALL llegar con el número de `GET /accounts/{accountId}/batch-number/next?importId=` y SHALL poder editarse. Solo SHALL admitir un entero positivo. La pantalla SHALL mostrar el intento que devuelve la vista previa, y SHALL decir cuándo el número propuesto es el de un intento deshecho del mismo import.

#### Scenario: Número propuesto de batch-clean (HU3 CA1)
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** el campo **Batch number** vale `123`, ve `Proposed: 123 · attempt 1` y puede escribir otro número

#### Scenario: Reproceso tras deshacer
- **GIVEN** `batch-number/next` responde `{ batchNo: 118, attemptNo: 2, reason: "reprocess" }`
- **WHEN** `analyst` abre Settlement Review
- **THEN** el campo vale `118` y ve `Proposed: 118 · attempt 2 (the previous attempt of this import was undone)`

#### Scenario: Número no válido
- **WHEN** `analyst` escribe `0` o `12a` en **Batch number**
- **THEN** ve `Enter a positive whole number.` en el campo y no se pide una vista previa con ese valor

### Requirement: Pantalla Settlement Review: número de batch en uso
Un número con intento vigente en la cuenta SHALL avisarse en el propio campo, tanto si lo dice la vista previa (`batchNoAvailable = false`) como si lo dice el `409 batch_no_taken` al procesar. Mientras el aviso esté a la vista, **Process** SHALL estar deshabilitado con su motivo. Tras el `409` no SHALL haberse creado nada y la pantalla SHALL seguir con lo que el analista escribió.

#### Scenario: Aviso desde la vista previa
- **GIVEN** la vista previa con `batchNo = 117` responde `batchNoAvailable = false`
- **WHEN** `analyst` escribe `117`
- **THEN** ve `Batch 117 already has an active attempt for this account.` en el campo y **Process** está deshabilitado con `Choose a batch number that is not in use.`

#### Scenario: Número tomado al procesar (criterio 1 del issue)
- **GIVEN** la vista previa de `123` decía `batchNoAvailable = true`
- **WHEN** `analyst` pulsa **Process** y el API responde `409 batch_no_taken` con `details.batchNo = 123`
- **THEN** ve `Batch 123 already has an active attempt for this account.` en el campo **Batch number**, sigue en Settlement Review con sus fees y su fecha, y se vuelve a pedir la vista previa

### Requirement: Pantalla Settlement Review: fecha de liquidación
**Settlement date** SHALL ser una fecha de negocio obligatoria (`YYYY-MM-DD`), vacía al abrir hasta que el analista la elige, y enviada tal cual en `settlementDate` (P8 de #11). Sin ella SHALL NOT pedirse la vista previa ni procesarse, y el campo SHALL mostrar su motivo. La fecha SHALL NOT convertirse de zona.

#### Scenario: Al abrir
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review
- **THEN** **Settlement date** está vacía con `Choose the settlement date.`, el resumen previo dice `Choose the settlement date to see the pre-summary.`, **Process** está deshabilitado con `Choose the settlement date.` y no se llama a `settlements/preview`

#### Scenario: Fecha elegida
- **WHEN** `analyst` elige `2026-10-24` en **Settlement date**
- **THEN** se pide la vista previa con `"settlementDate": "2026-10-24"` y el procesamiento envía la misma fecha

#### Scenario: Fecha borrada
- **GIVEN** una vista previa con `2026-10-24`
- **WHEN** `analyst` borra **Settlement date**
- **THEN** ve `Choose the settlement date.` en el campo, el resumen previo queda desactualizado y **Process** se deshabilita con ese motivo

### Requirement: Pantalla Settlement Review: fees prellenados desde Other Fees
Los `batchFees` de `GET /imports/{id}` SHALL aparecer como filas de fees por batch con su tipo, su importe y origen `From file` (`source = file`), y el analista SHALL poder ajustar el importe, cambiar la descripción o quitarlas. Una fila con `feeTypeId = null` SHALL mostrarse marcada hasta que el analista le elija un tipo con `allowsFreeAmount` o la quite. Una fila sin importe SHALL exigir el importe.

#### Scenario: Prellenados de batch-clean
- **GIVEN** el import de `batch-clean` `validated`
- **WHEN** `analyst` abre su Settlement Review y elige **Settlement date**
- **THEN** ve dos filas `From file`: `Wire Fee` con `25.0000` y `Settlement Fee` con `15.0000`
- **AND** la vista previa se pide con esos dos fees, `source = "file"` y `feeId = null`

#### Scenario: Ajustar un prellenado (criterio 2 del issue)
- **WHEN** `analyst` cambia el importe de `Wire Fee` a `30.0000`
- **THEN** la siguiente vista previa envía ese fee con `"amount": "30.0000"` y `source = "file"`, y el resumen previo pinta lo que el API devuelve

#### Scenario: Quitar un prellenado
- **WHEN** `analyst` pulsa **Remove** en `Settlement Fee`
- **THEN** la fila desaparece y la siguiente vista previa envía solo `Wire Fee`

#### Scenario: Tipo desconocido en el archivo
- **GIVEN** `GET /imports/{id}` trae un fee con `feeTypeId = null`, `title = "Bank charge"` y su advertencia
- **WHEN** `analyst` abre Settlement Review
- **THEN** la fila aparece marcada con `Unknown fee type in the file: choose a free-amount type or remove the fee.`, el selector solo ofrece tipos con `allowsFreeAmount`, **Process** está deshabilitado con `Choose a type for the fees of unknown type, or remove them.` y no se pide la vista previa

#### Scenario: Tipo elegido para la fila desconocida
- **WHEN** `analyst` elige `Special Adjustment` para la fila `Bank charge`
- **THEN** la fila deja de estar marcada y la vista previa la envía con ese `feeTypeId`, `feeId = null` y `source = "file"`

#### Scenario: Fila desconocida quitada
- **WHEN** `analyst` pulsa **Remove** en la fila `Bank charge`
- **THEN** la fila desaparece, el motivo de **Process** se va y la vista previa se pide sin ella

### Requirement: Pantalla Settlement Review: añadir un fee preestablecido
**Add preset fee** SHALL ofrecer los fees no transaccionales de la cuenta vigentes en **Settlement date** (`GET /accounts/{id}/fees?transactional=false&asOf=<settlementDate>`), y SHALL estar deshabilitado con su motivo mientras no haya fecha. Con `fixedAmount` el importe SHALL llegar con ese valor y ser editable. Con solo porcentaje SHALL llegar vacío para que lo escriba el analista: la pantalla SHALL NOT calcular ningún importe.

#### Scenario: Sin fecha todavía
- **GIVEN** **Settlement date** vacía
- **THEN** **Add preset fee** está deshabilitado con `Choose the settlement date first.` y no se llama a `GET /accounts/{id}/fees`

#### Scenario: Preestablecidos de la fecha
- **WHEN** `analyst` elige `2026-10-24` en **Settlement date** y abre **Add preset fee**
- **THEN** se llama a `GET /accounts/<ProviderA-USD>/fees?transactional=false&asOf=2026-10-24` y ve sus preestablecidos con su configuración y su vigencia

#### Scenario: Preestablecido con importe fijo (HU3 CA2)
- **GIVEN** una cuenta con el preestablecido `Monthly Fee` de `fixedAmount = 250.0000`
- **WHEN** `analyst` lo añade y cambia el importe a `240.0000`
- **THEN** la fila muestra `Preset` y la vista previa la envía con su `feeId`, `feeTypeId`, `"amount": "240.0000"` y `source = "manual"`

#### Scenario: Preestablecido solo con porcentaje
- **GIVEN** ProviderA-USD con el preestablecido `Chargeback over 1%` con `percentage = 0.010000` y `fixedAmount = null`
- **WHEN** `analyst` lo añade
- **THEN** el importe está vacío con `Percentage-only fee (rate 0.010000): enter the amount.` y no se pide otra vista previa hasta que el analista escriba un importe

### Requirement: Pantalla Settlement Review: añadir un fee de importe libre
**Add free-amount fee** SHALL ofrecer solo los tipos no transaccionales con `allowsFreeAmount` de `GET /fee-types`. La fila SHALL pedir importe y descripción (1–200 caracteres, obligatoria también en el API) y SHALL enviarse con `feeId = null` y `source = "manual"`.

#### Scenario: Ajuste negativo (HU3 CA2)
- **WHEN** `analyst` añade un fee de importe libre `Special Adjustment` con `-42.5000` y la descripción `Duplicate in batch 118`
- **THEN** la vista previa lo envía con `"feeId": null`, `"amount": "-42.5000"`, la descripción y `source = "manual"`

#### Scenario: Tipos ofrecidos
- **WHEN** `analyst` abre **Add free-amount fee**
- **THEN** ve `Special Adjustment` y `Bram Fine` y no ve `Wire Fee` (sin importe libre) ni ningún tipo transaccional

#### Scenario: Sin descripción
- **WHEN** deja vacía la descripción de un fee de importe libre
- **THEN** ve `Write a description for a free-amount fee.` y no se pide otra vista previa hasta que la escriba

### Requirement: Pantalla Settlement Review: importes de los fees
El importe de cada fee SHALL escribirse y enviarse como texto decimal con signo opcional, hasta 4 decimales y distinto de cero. Un importe no válido SHALL marcarse en su fila y, mientras el formulario tenga un campo no válido, SHALL NOT pedirse otra vista previa. El importe SHALL NOT convertirse a número en ningún paso.

#### Scenario: Importe no válido
- **WHEN** `analyst` escribe `12.34567`, `0`, `-0.0000` o `1,5` en un importe
- **THEN** ve `Enter an amount with up to 4 decimals, other than zero.` en esa fila y no se pide una vista previa con ese valor

#### Scenario: Importe con muchos dígitos
- **WHEN** `analyst` escribe `123456789012345.1234`
- **THEN** la vista previa lo envía exactamente como `"123456789012345.1234"`

### Requirement: Pantalla Settlement Review: fee rechazado por el API
Un `400 batch_fee_invalid` de la vista previa o del procesamiento SHALL mostrarse en la fila de `details.index` con el texto de su `reason`, y **Process** SHALL quedar deshabilitado hasta que esa fila cambie o se quite.

#### Scenario: Importe libre no admitido
- **WHEN** la vista previa responde `400 batch_fee_invalid` con `{ index: 1, reason: "free_amount_not_allowed" }`
- **THEN** la segunda fila muestra `This fee type does not accept a free amount.` y **Process** está deshabilitado con `Fix the highlighted fields.`

#### Scenario: Preestablecido fuera de vigencia
- **WHEN** la vista previa responde `400 batch_fee_invalid` con `reason = "fee_not_in_force"` para la fila 0
- **THEN** la primera fila muestra `This preset fee is not in force on the settlement date.`

#### Scenario: Descripción exigida por el API
- **WHEN** la vista previa o el procesamiento responde `400 batch_fee_invalid` con `{ index: 2, reason: "description_required" }`
- **THEN** la descripción de la tercera fila muestra `Write a description for a free-amount fee.`

### Requirement: Pantalla Settlement Review: resumen previo
Tras cada cambio válido del formulario, con debounce, la pantalla SHALL pedir `POST /imports/{id}/settlements/preview` con el `runId` revisado y SHALL pintar los movimientos E/I/R, los totales de las cinco categorías, las nueve líneas de `payableBreakdown` con su signo, `amountPayable`, `skipped` por motivo y las advertencias. Toda cifra SHALL salir de la respuesta: la pantalla SHALL NOT calcular ni sumar importes.

#### Scenario: Resumen previo de batch-clean
- **GIVEN** el import de `batch-clean` `validated` con sus dos fees prellenados
- **WHEN** `analyst` abre su Settlement Review y elige `2026-10-24` en **Settlement date**
- **THEN** se pide una vista previa con el `runId` de la corrida revisada y ve las cinco categorías, las nueve líneas del desglose en el orden del API con `+` o `−`, `Batch fees` con el `otherFeeAmt` de la respuesta y **Amount payable** con el `amountPayable` de la respuesta, todos con separador de miles y sus cuatro decimales

#### Scenario: Filas que no se procesan
- **GIVEN** la vista previa con `skipped = { ignored: 3, unmatched: 0, ambiguous: 0, excluded: 2, unresolvedStatus: 0, pending: 0 }`
- **THEN** ve `Not processed: 3 ignored · 2 excluded` y ningún motivo con 0

#### Scenario: Advertencias
- **GIVEN** la vista previa trae `undated_adjustment` de `441706751475644` y `reserve_cap_not_applied`
- **THEN** ve `Adjustment 441706751475644 has no event date: it is processed without one.` y `The reserve cap of the account is not applied yet.`

#### Scenario: Una cifra que no cuadra con la suma
- **GIVEN** una vista previa guionizada cuyo `amountPayable` no es la suma de sus líneas
- **THEN** la pantalla pinta el `amountPayable` de la respuesta tal cual, sin corregirlo

### Requirement: Pantalla Settlement Review: resumen previo al día
Mientras el formulario tenga cambios sin vista previa, o una vista previa esté en curso, el resumen previo SHALL marcarse como desactualizado y **Process** SHALL estar deshabilitado. Cambios seguidos dentro del debounce SHALL producir una sola petición, y la respuesta de una petición superada SHALL NOT pintarse.

#### Scenario: Escritura seguida
- **WHEN** `analyst` escribe `3`, `0` y `.5` seguidos en un importe
- **THEN** se pide una sola vista previa, con `"30.5"`, y mientras tanto ve `Updating the pre-summary…` y **Process** deshabilitado con `Waiting for the pre-summary.`

#### Scenario: Respuesta fuera de orden
- **GIVEN** una vista previa A retenida y una posterior B ya respondida
- **WHEN** A responde
- **THEN** la pantalla sigue pintando B

### Requirement: Pantalla Settlement Review: canales a asociar
Si la vista previa trae `requiresChannelConfirmation = true`, la pantalla SHALL listar `channelsToAssign` (sin cuenta, o el nombre de la otra cuenta) y SHALL pedir la casilla **Assign these channels to this account as primary**. Sin marcarla, **Process** SHALL estar deshabilitado con su motivo. Marcada, el cuerpo SHALL llevar `confirmChannelAssignment: true`.

#### Scenario: RAM-07 sin cuenta (HU3 CA5)
- **GIVEN** la vista previa de `batch-clean` con `RAM-07` `unassigned` en `channelsToAssign`
- **THEN** ve `RAM-07 · not assigned yet`, la casilla sin marcar y **Process** deshabilitado con `Confirm the channel assignment.`
- **AND** al marcarla, **Process** se habilita y el procesamiento envía `"confirmChannelAssignment": true`

#### Scenario: Canales cambiados al procesar
- **WHEN** **Process** responde `409 channel_assignment_not_confirmed` con `RAM-03` en `details.channels`
- **THEN** ve `RAM-03` en la lista, la casilla vuelve a estar sin marcar y se pide otra vista previa

#### Scenario: Sin canales que asociar
- **GIVEN** la vista previa con `requiresChannelConfirmation = false`
- **THEN** no hay casilla ni aviso, y el cuerpo no lleva `confirmChannelAssignment`

### Requirement: Pantalla Settlement Review: procesar
**Process batch N** SHALL enviar a `POST /imports/{id}/settlements` exactamente el cuerpo de la vista previa a la vista más la confirmación de canales, una sola vez aunque se pulse dos veces, y SHALL estar deshabilitado con cada motivo visible y asociado al botón. Con `201` SHALL llevar al Settlement Summary del intento devuelto y pintar esa respuesta sin otra petición.

#### Scenario: Procesar batch-clean (HU3 CA6)
- **GIVEN** la vista previa de `batch-clean` al día y la casilla de canales marcada
- **WHEN** `analyst` pulsa **Process batch 123** dos veces seguidas
- **THEN** el API recibe un solo `POST /imports/<importId>/settlements` con `runId`, `batchNo = 123`, los dos fees prellenados y `confirmChannelAssignment = true`, y con el `201` la pantalla pasa al Settlement Summary del `batchId` devuelto sin pedir `GET /settlements/<batchId>`

#### Scenario: Botón deshabilitado mientras procesa
- **WHEN** el `POST` está retenido
- **THEN** **Process** y los campos están deshabilitados y ve `Processing the batch…`

#### Scenario: Import que ya no está validado
- **WHEN** **Process** responde `409 import_not_validated` con `details.status = analyzed`
- **THEN** ve `The import is no longer validated (status: analyzed). Review its validations again.`, se relee el import y la pantalla pasa al estado de import no validado

#### Scenario: Corrida superada
- **WHEN** **Process** o la vista previa responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before processing.` con un enlace al paso Analysis y **Process** deshabilitado

#### Scenario: Fallo de red
- **WHEN** **Process** falla sin respuesta del API
- **THEN** ve `The batch could not be processed. Try again.`, sigue en Settlement Review con lo escrito y **Process** vuelve a estar disponible

### Requirement: Pantalla Settlement Summary: estado y cabecera del intento
Settlement Summary SHALL mostrar el intento (cuenta, batch, intento), su estado (`Processed · pending payment`, `Paid` o `Undone`), quién lo procesó y cuándo, la fecha de liquidación y los rangos de fechas, y SHALL decir que un intento `processed` no tiene movimientos Settled.

#### Scenario: Recién procesado (HU3 CA6)
- **GIVEN** la respuesta `201` de procesar `batch-clean`
- **THEN** ve `Settlement Summary · batch 123`, `ProviderA-USD · attempt 1`, `Processed · pending payment`, `Processed by analyst on <fecha>` y `Movements are not Settled yet: that happens when the batch is marked as paid.`

### Requirement: Pantalla Settlement Summary: totales y amount payable auditable
La pantalla SHALL mostrar los movimientos E/I/R, los totales de las cinco categorías con cantidad, importe y fee, los totales por marca, `reservesReleasedQty`, y las nueve líneas de `payableBreakdown` en el orden del API, con su etiqueta, su signo y su importe, hasta `amountPayable`. Toda cifra SHALL salir de la vista del API sin recalcularse.

#### Scenario: Desglose de batch-clean
- **GIVEN** la vista del intento de `batch-clean`
- **THEN** ve las líneas `+ Deposits`, `− Chargebacks`, `− Refunds`, `− RDR`, `− Transaction fees`, `− Batch fees`, `− Reserve held`, `+ Reserve released` y `+ Reserve released on chargeback` con los importes de la respuesta y, debajo, **Amount payable** con su `amountPayable`

#### Scenario: Línea en cero
- **GIVEN** la vista con `reserve_early_released` en `0.0000`
- **THEN** la línea aparece con `0.0000`, no se oculta

### Requirement: Pantalla Settlement Summary: fees, reservas, canales e incidencias
La pantalla SHALL mostrar los fees transaccionales (`transactionalFeeAmt`, `mdrAmt` y su tasa), cada fee por batch con su origen y su usuario, las reservas retenida, liberada y liberada por chargeback, los canales asociados en el intento, el resumen de incidencias de la corrida, `skipped` y las advertencias.

#### Scenario: Fee ajustado con mi usuario (criterio 2 del issue)
- **GIVEN** `batch-clean` procesado por `analyst` con `Wire Fee` ajustado a `30.0000`
- **THEN** ve `Wire Fee · From file · 30.0000 · entered by analyst`

#### Scenario: Canal asociado
- **GIVEN** la vista con `RAM-07` en `channelsAssigned` como `new_primary`
- **THEN** ve `RAM-07 · assigned to this account as primary`

#### Scenario: Incidencias
- **GIVEN** `validationSummary = { persistent: 13, resolved: 2, blocking: 0, resolvedMissing: 4 }`
- **THEN** ve `13 persistent · 2 resolved · 0 blocking · 4 missing resolved by this batch` con un enlace al paso Analysis del import

### Requirement: Pantalla Settlement Summary: recarga por su enlace
Al abrir o recargar `/settlements/<batchId>`, la pantalla SHALL pedir `GET /settlements/{batchId}`. Un `404` SHALL mostrar `Settlement not found` con un enlace a Dashboard.

#### Scenario: Recargar
- **GIVEN** `analyst` en el Settlement Summary del batch recién procesado
- **WHEN** recarga la página
- **THEN** se pide `GET /settlements/<batchId>` y ve el mismo intento

#### Scenario: Intento inexistente o fuera del alcance
- **WHEN** `GET /settlements/<batchId>` responde `404`
- **THEN** ve `Settlement not found` y un enlace a Dashboard

### Requirement: Pantalla Settlement Summary: descargas
La pantalla SHALL ofrecer **Merchant summary**, **Transactions (CSV)** y **Reserves (CSV)** a quien tenga `reports.view`. Mientras las descargas del API no existan, SHALL mostrarlas deshabilitadas con su motivo. Disponibles, cada una SHALL descargar el archivo con el nombre identificado por intento, y descargar SHALL NOT cambiar nada en pantalla.

#### Scenario: Antes de las descargas del API
- **GIVEN** las descargas aún no disponibles
- **THEN** los tres botones están deshabilitados con `Downloads are not available yet.` asociado a cada uno, y no hay enlaces de descarga

#### Scenario: Descargar los tres (criterio 3 del issue)
- **GIVEN** las descargas disponibles y un intento `processed`
- **WHEN** `analyst` pulsa los tres botones
- **THEN** se descargan `ProviderA-USD_B123_A1_summary`, `ProviderA-USD_B123_A1_transactions.csv` y `ProviderA-USD_B123_A1_reserves.csv` y el estado sigue `Processed · pending payment`

#### Scenario: Sin reports.view
- **GIVEN** un usuario sin `reports.view`
- **THEN** no ve los botones de descarga

### Requirement: Pantalla Settlement Summary: solo lectura
`viewer` SHALL poder abrir Settlement Summary de un intento de su alcance y verlo entero, sin acciones que escriban. Ninguna pantalla de settlement SHALL ofrecer pagar, retirar el pago ni deshacer.

#### Scenario: viewer
- **WHEN** `viewer` abre el Settlement Summary del intento de `batch-clean`
- **THEN** ve el intento, los totales, el desglose, los fees y las descargas que su permiso admite, y ningún botón de pagar ni de deshacer

### Requirement: Pantallas de settlement: fechas en hora de Nueva York
Las fechas de negocio (`dateRanges`, `settlementDate`, vigencias de los fees) SHALL mostrarse con los dígitos recibidos y sufijo `ET`, sin convertir. Las de auditoría (`processedAt`) SHALL convertirse de UTC a la hora de Nueva York con sufijo `ET`. Ninguna SHALL depender de la zona del navegador.

#### Scenario: Fechas del intento
- **GIVEN** `settlementDate = "2026-10-24"`, `dateRanges.APP.min = "2026-09-28T00:04:11.000Z"` y `processedAt = "2026-10-19T15:40:03.120Z"`, con el navegador en otra zona
- **THEN** ve `2026-10-24 ET`, `2026-09-28 00:04 ET` y `2026-10-19 11:40 ET`

### Requirement: Pantallas de settlement: teclado y motivos
Todas las acciones de Settlement Review y Settlement Summary SHALL poder hacerse solo con teclado. Todo botón deshabilitado SHALL llevar su motivo en texto visible asociado con `aria-describedby`.

#### Scenario: Procesar con teclado
- **WHEN** `analyst` recorre Settlement Review con Tab, Enter y Espacio
- **THEN** puede editar el número, añadir y quitar fees, marcar la casilla de canales y pulsar **Process**, y cada botón deshabilitado anuncia su motivo
