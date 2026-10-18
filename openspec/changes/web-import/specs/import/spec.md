## ADDED Requirements

### Requirement: Pantalla Upload Files: elección de la cuenta
La pantalla New Reconciliation (`/reconciliations/new`) SHALL exigir `settlement.process` y ofrecer merchant → proveedor → cuenta, solo con merchants del alcance y cuentas activas; un único valor posible SHALL preseleccionarse. La selección SHALL reflejarse en la dirección (`merchantId`, `providerId`, `accountId`). La zona de subida SHALL habilitarse solo con una cuenta elegida.

#### Scenario: analyst elige la cuenta
- **GIVEN** `analyst` (merchants 1 y 2)
- **WHEN** abre New Reconciliation y elige `Merchant A`, `Provider A` y `ProviderA-USD`
- **THEN** la dirección es `/reconciliations/new?merchantId=1&providerId=101&accountId=<id de ProviderA-USD>` y la zona de subida queda habilitada

#### Scenario: Sin cuenta elegida
- **WHEN** `analyst` abre New Reconciliation con `Merchant A` y `Provider A` pero sin cuenta
- **THEN** la zona de subida está deshabilitada e indica que hay que elegir una cuenta, y no se llama a ninguna ruta de imports

#### Scenario: Cuenta fuera del alcance en el enlace
- **GIVEN** `analyst` cuyo alcance no incluye una cuenta
- **WHEN** abre `/reconciliations/new` con el `accountId` de esa cuenta
- **THEN** ve `This merchant, provider or account is not available.` y puede elegir entre sus merchants visibles

#### Scenario: viewer sin permiso
- **WHEN** `viewer` abre `/reconciliations/new`
- **THEN** ve `You don't have access to this page` y no se llama a ningún endpoint de la pantalla

### Requirement: Pantalla Upload Files: subida de archivos
El usuario SHALL poder arrastrar y soltar, o elegir con el teclado, uno o varios `.xlsx`, que se suben en orden. El primer archivo que el API acepta SHALL crear el import y la aplicación SHALL llevar a su paso Files sin esperar al resto; los demás SHALL añadirse a ese import aunque el usuario navegue. El paso Files SHALL listar cada archivo con sus hojas y sus filas.

#### Scenario: Batch repartido en dos archivos
- **GIVEN** `analyst` con `ProviderA-USD` elegida
- **WHEN** suelta `Recon_Template_ProviderA-USD_batch-split_part1.xlsx` y `…_part2.xlsx` a la vez
- **THEN** llega a `/imports/<importId>` en el paso Files con un solo import en `uploaded` y dos archivos: part1 con `APP` 340 y `DEC` 110; part2 con `CHB` 3, `REF` 7, `RDR` 3, `RR` 320 y `Other Fees` 2

#### Scenario: Plantilla en un archivo
- **WHEN** `analyst` sube `Recon_Template_ProviderA-USD_batch-clean.xlsx`
- **THEN** ve un archivo con diez hojas, `APP` 340, `DEC` 110, `CHB` 3, `REF` 7, `RDR` 3, `RR` 320, `Duplicate Corrections` 0, `CHB Alerts` 0, `Other Fees` 2 y `Settings` 21 marcada como oculta

#### Scenario: Añadir un archivo desde el paso Files
- **GIVEN** un import en `uploaded` creado con `batch-split_part1.xlsx`
- **WHEN** `analyst` añade `batch-split_part2.xlsx` en el paso Files
- **THEN** el import muestra los dos archivos y sigue siendo el mismo `importId`

#### Scenario: Subida en curso
- **WHEN** `analyst` suelta un archivo
- **THEN** el archivo aparece como `Uploading…` y la zona de subida no admite otra selección hasta que termina

#### Scenario: Diez archivos con navegación a mitad
- **GIVEN** `analyst` con `ProviderA-USD` elegida
- **WHEN** suelta diez `.xlsx` distintos y válidos, la aplicación pasa a `/imports/<importId>` tras el primero y, antes de que terminen, `analyst` abre Dashboard y vuelve al import
- **THEN** el API recibe las diez subidas, una sola de ellas crea el import, y el paso Files muestra los diez archivos

#### Scenario: Primer archivo ilegible
- **GIVEN** `analyst` con `ProviderA-USD` elegida
- **WHEN** suelta `broken.xlsx` (el API responde `422 file_unreadable`) seguido de `Recon_Template_ProviderA-USD_batch-clean.xlsx`
- **THEN** `broken.xlsx` aparece rechazado con su motivo, `batch-clean` crea el import con `POST /api/v1/accounts/{id}/imports` y el import contiene solo `batch-clean`

### Requirement: Pantalla Upload Files: archivos rechazados
Un archivo rechazado SHALL mostrarse en la lista con su nombre y el motivo, sin afectar a los archivos ya incluidos ni al pareo en edición. Antes de enviar, la pantalla SHALL rechazar sin llamar al API un archivo que no sea `.xlsx` o que supere 20 MiB, y una selección de más de 10 archivos. Los rechazos del API SHALL mostrarse con el mismo texto que los del cliente.

#### Scenario: Duplicado con el nombre del coincidente
- **GIVEN** el import con `batch-split_part1.xlsx` y `batch-split_part2.xlsx` y un cambio sin confirmar en la hoja `DEC`
- **WHEN** `analyst` vuelve a subir `part1` con otro nombre
- **THEN** la fila del archivo rechazado muestra `This file is already in the import as Recon_Template_ProviderA-USD_batch-split_part1.xlsx.`, el import sigue con dos archivos y el cambio sin confirmar de `DEC` se conserva

#### Scenario: Tipo no permitido
- **WHEN** `analyst` suelta `batch.csv`
- **THEN** ve `batch.csv` con `Only .xlsx files are accepted.` y no se envía ninguna petición

#### Scenario: Tamaño excedido
- **WHEN** `analyst` suelta un `.xlsx` de 20 971 521 bytes
- **THEN** ve el archivo con `The file exceeds the 20 MB limit.` y no se envía ninguna petición; un archivo de exactamente 20 971 520 bytes sí se envía

#### Scenario: Más de diez archivos
- **WHEN** `analyst` suelta once `.xlsx` a la vez
- **THEN** ve `Select at most 10 files at a time.` y no se envía ninguno

#### Scenario: Archivo ilegible
- **WHEN** el API responde `422 file_unreadable` a `batch.xlsx`
- **THEN** ve `batch.xlsx` con `The file cannot be read as an Excel workbook.` y los demás archivos de la selección se siguen subiendo

### Requirement: Pantalla Upload Files: quitar archivos
Mientras el import esté en `uploaded` o `mapped`, cada archivo SHALL tener **Remove**. Quitarlo SHALL actualizar la lista, las hojas del paso Mapping y la readiness con la respuesta del API, conservando los cambios sin confirmar de las hojas que siguen.

#### Scenario: Quitar la segunda parte
- **GIVEN** el import con `part1` y `part2` de `batch-split`
- **WHEN** `analyst` pulsa **Remove** en `part2`
- **THEN** la lista muestra solo `part1`, el paso Mapping ya no muestra la tarjeta de `part2` (con `CHB` 3, `REF` 7, `RDR` 3, `RR` 320 y `Other Fees` 2) y solo quedan las hojas de `part1`, y la readiness es la que devolvió el API

#### Scenario: Quitar el último archivo
- **WHEN** `analyst` quita el único archivo del import
- **THEN** ve el import vacío con la zona de subida, y **Analyze** deshabilitado

### Requirement: Pantalla Column Mapping: propuesta por hoja
El paso Mapping SHALL mostrar una tarjeta por archivo y, por hoja, destacados su nombre y la propuesta en lenguaje del analista (`Proposed: <ciclo> · <estado> — <origen>`, `Proposed: batch fees`, `Proposed: ignore` o `No proposal`, con origen `account rule` o `global rule` y su `note`), sus filas, si está oculta, y los controles de tipo, ciclo y estado fijo con el pareo efectivo.

#### Scenario: Propuesta de la plantilla estándar
- **WHEN** `analyst` abre el paso Mapping del import de `batch-clean` recién subido
- **THEN** `APP` muestra `Proposed: E · Successful — global rule`, `DEC` `Proposed: E · Declined — global rule`, `CHB` `Proposed: I · Chargeback — global rule`, `REF` `Proposed: I · Refund — global rule`, `RDR` `Proposed: I · RDR — global rule`, `RR` `Proposed: R · reserve, no status — global rule`, `Other Fees` `Proposed: batch fees — global rule` y las otras tres hojas `Proposed: ignore — global rule` con su nota
- **AND** los controles de `APP` muestran `Transactions`, `E` y `Successful`

#### Scenario: Propuesta del conjunto legacy
- **WHEN** abre el paso Mapping del import de `legacy-provider` en `ProviderC-Alt`
- **THEN** `TRX` muestra `Proposed: E · status from column — account rule`, `Fail` `Proposed: E · Declined — account rule`, `CB` `Proposed: I · status from column — account rule` y `Summary` `Proposed: ignore — account rule`

#### Scenario: La propuesta sigue visible al editar
- **WHEN** `analyst` cambia el ciclo de `DEC` a `I` sin confirmar
- **THEN** la cabecera de `DEC` sigue mostrando `Proposed: E · Declined — global rule` y el control de ciclo muestra `I`

#### Scenario: Hoja sin propuesta
- **GIVEN** un libro con una hoja `Bonus` sin regla
- **WHEN** abre el paso Mapping
- **THEN** `Bonus` muestra `No proposal` y el tipo sin elegir

### Requirement: Pantalla Column Mapping: propuesta por columna
Por cada columna de una hoja `Transactions` o `Batch fees`, el paso Mapping SHALL mostrar el campo del pareo efectivo y el origen de la propuesta, o `Keep as reference` cuando no se parea. Una columna pareada como `status` SHALL mostrar cómo se resuelve cada valor distinto de la hoja (`statusValues`). La lista de campos SHALL excluir `gateway`.

#### Scenario: Columnas de la plantilla
- **WHEN** abre el paso Mapping del import de `batch-clean`
- **THEN** en `APP` ve `ID` → `Transaction ID`, `Amount` → `Amount`, `Currency` → `Currency`, cada una con `Global rule`, y en `Other Fees` `Type of Fee` → `Fee type`

#### Scenario: Valores de estado del legacy
- **WHEN** abre el paso Mapping del import de `legacy-provider`
- **THEN** la columna `Order Status` de `CB` muestra `CHB 2` → `Chargeback` con importe excluido, y la de `Fail` `Failed` → `Declined`

#### Scenario: Sin campo gateway
- **WHEN** abre la lista de campos de cualquier columna
- **THEN** no aparece `Gateway`

### Requirement: Pantalla Column Mapping: vista previa
Cada hoja SHALL mostrar la vista previa que devuelve el API (hasta cinco filas) como texto tal cual, sin convertir números. La cabecera de cada columna SHALL indicar el campo del pareo en edición y SHALL cambiar en cuanto el usuario cambia el campo, antes de confirmar.

#### Scenario: ID como texto
- **WHEN** abre la vista previa de `APP` de `batch-clean`
- **THEN** la primera fila muestra `252570479111759`, `16.22` y `USD` tal cual

#### Scenario: Cambiar un campo actualiza la vista previa
- **WHEN** `analyst` cambia `Currency` de `APP` a `Keep as reference`
- **THEN** la cabecera de esa columna en la vista previa deja de indicar `Currency` sin que se haya enviado ninguna petición

### Requirement: Pantalla Column Mapping: edición del pareo
Con permiso y el import en `uploaded` o `mapped`, el usuario SHALL poder cambiar tipo, ciclo, estado fijo y campo de cada columna. Ciclo `R` SHALL dejar el estado fijo sin valor y deshabilitado; `Batch fees` e `Ignore` SHALL deshabilitar ciclo y estado; `Ignore` SHALL deshabilitar las columnas. Un mismo campo en dos columnas de una hoja SHALL marcarse como error y bloquear la confirmación.

#### Scenario: Reserva sin estado
- **WHEN** `analyst` cambia el ciclo de `REF` a `R`
- **THEN** el estado fijo de `REF` queda vacío y deshabilitado

#### Scenario: Campo repetido
- **WHEN** `analyst` parea `Amount` y `Currency` de `APP` a `Amount`
- **THEN** ambas columnas muestran `Amount is mapped twice in this sheet.` y **Confirm mapping** está deshabilitado

#### Scenario: Clasificar una hoja sin propuesta
- **GIVEN** la hoja `Bonus` sin propuesta
- **WHEN** `analyst` la marca como `Ignore`
- **THEN** sus columnas quedan deshabilitadas y `Bonus` puede confirmarse

### Requirement: Pantalla Column Mapping: confirmación
**Confirm mapping** SHALL enviar el pareo de todas las hojas del import, con las columnas no pareadas fuera y sin columnas en las hojas `Ignore`. Con `200` el import SHALL mostrarse en `mapped`, la pantalla SHALL tomar el pareo confirmado como estado sin cambios y SHALL mostrar la readiness de la respuesta. Un `400` o `409` SHALL mostrarse en contexto sin perder lo editado.

#### Scenario: Confirmar la propuesta de la plantilla
- **GIVEN** el import de `batch-clean` en `uploaded`
- **WHEN** `analyst` pulsa **Confirm mapping** sin cambiar nada
- **THEN** el `PUT` trae las diez hojas, con `ID`, `Amount` y `Currency` en las seis de transacciones, `Type of Fee`, `Amount` y `Currency` en `Other Fees` y ninguna columna en las tres ignoradas; el import muestra `mapped` y `Ready to analyze`

#### Scenario: Corregir una propuesta y confirmar
- **GIVEN** el import de `batch-clean` en `uploaded`
- **WHEN** `analyst` cambia `DEC` a ciclo `I` con estado `Refund` y confirma
- **THEN** el import muestra `mapped`, `DEC` muestra `I` · `Refund` como pareo confirmado y la vista previa sigue mostrando sus filas

#### Scenario: Import que ya no es editable
- **WHEN** el `PUT` responde `409 import_not_editable` con `details.status = "analyzed"`
- **THEN** ve `This import can no longer be edited (analyzed).` y la pantalla se recarga con el import tal como está

#### Scenario: Envío en curso
- **WHEN** `analyst` pulsa **Confirm mapping**
- **THEN** el botón queda deshabilitado hasta la respuesta y un segundo clic no envía otro `PUT`

### Requirement: Pantalla Column Mapping: readiness y Analyze
La barra de readiness SHALL mostrar `Ready to analyze` o cada elemento de `readiness.missing` como `<hoja> · <campo>: <mensaje>`, las `notes` y, en `mapped`, cada hoja con `mappingConfirmed = false` como `<hoja> · confirmation`. **Analyze** SHALL habilitarse solo en `mapped`, con `readiness.canAnalyze = true`, todas las hojas confirmadas y sin cambios sin confirmar; deshabilitado, SHALL indicar el motivo.

#### Scenario: Hoja sin ID
- **GIVEN** un import en `mapped` cuya hoja `APP` se confirmó sin `Transaction ID`
- **WHEN** `analyst` abre el paso Mapping
- **THEN** **Analyze** está deshabilitado y la barra muestra `APP · transactionId` con su mensaje
- **AND** al parear `ID` → `Transaction ID` y confirmar, la barra muestra `Ready to analyze` y **Analyze** se habilita

#### Scenario: Pareo sin confirmar
- **GIVEN** el import de `batch-clean` en `uploaded` con `readiness.canAnalyze = true`
- **WHEN** abre el paso Mapping
- **THEN** **Analyze** está deshabilitado con `Confirm the mapping before analyzing.`

#### Scenario: Cambios sin confirmar
- **GIVEN** un import en `mapped` listo para analizar
- **WHEN** `analyst` cambia un campo sin confirmar
- **THEN** **Analyze** se deshabilita con `Confirm the mapping before analyzing.` hasta que confirma

#### Scenario: Archivo añadido tras confirmar
- **GIVEN** un import en `mapped` con `part1` confirmado
- **WHEN** `analyst` añade `part2`
- **THEN** la barra nombra cada hoja de `part2` con `confirmation` y **Analyze** está deshabilitado, aunque el detalle del API responda `readiness.canAnalyze = true` (solo el `422` de analyze trae esas hojas; la pantalla las deriva de `mappingConfirmed`)

### Requirement: Pantalla Column Mapping: análisis en curso
**Analyze** SHALL lanzar `POST analyze` una sola vez: durante la espera, que puede durar decenas de segundos, SHALL mostrarse `Analyzing… this can take up to a minute.` con los controles del import deshabilitados. Con `200` SHALL llevar al paso Analysis. Ante `422 mapping_incomplete` SHALL mostrar los faltantes; ante `409` o un fallo de red, SHALL releer el import antes de decidir.

#### Scenario: Doble clic
- **WHEN** `analyst` pulsa **Analyze** dos veces seguidas
- **THEN** el API recibe un solo `POST analyze` y la pantalla muestra el estado de análisis en curso

#### Scenario: Análisis terminado
- **WHEN** `POST analyze` del import de `batch-clean` responde `200`
- **THEN** la pantalla pasa al paso Analysis con el resultado

#### Scenario: Pareo incompleto
- **WHEN** `POST analyze` responde `422 mapping_incomplete` con `APP` · `transactionId`
- **THEN** sigue en Mapping, la barra muestra `APP · transactionId` y **Analyze** queda deshabilitado

#### Scenario: Conexión perdida durante el análisis
- **WHEN** la petición de análisis falla por red y el import releído está en `analyzed`
- **THEN** la pantalla muestra el paso Analysis sin error
- **AND** si el import releído sigue en `mapped`, ve `The analysis did not finish. Try again.` y **Analyze** vuelve a estar disponible

### Requirement: Resultado del análisis: contadores
El paso Analysis de un import analizado SHALL mostrar `Rows read` (`analysis.rows.total`), `Matched`, `Unmatched`, `Ambiguous` e `Ignored`, y las filas por ciclo `E`, `I` y `R`. `Unmatched` y `Ambiguous` mayores que cero SHALL resaltarse como advertencia.

#### Scenario: Batch limpio
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** abre el paso Analysis
- **THEN** ve `Rows read 783`, `Matched 780`, `Unmatched 0`, `Ambiguous 0`, `Ignored 3` y `E 450 · I 10 · R 320`, sin resaltado

#### Scenario: Batch con incidencias
- **GIVEN** el import de `batch-issues` analizado
- **WHEN** abre el paso Analysis
- **THEN** ve `Rows read 770`, `Matched 766`, `Unmatched 1` resaltado, `Ambiguous 0`, `Ignored 3` y `E 440 · I 10 · R 317`

### Requirement: Resultado del análisis: aviso de canales
El paso Analysis SHALL mostrar un aviso ámbar con cada canal de `channels` cuya situación no sea `assigned`: `unassigned` como `<canal> is not assigned yet` y `assigned_to_other_account` como `<canal> is primary in <cuenta>`, con su número de filas y su `note`. Un canal o cuenta fuera del alcance SHALL mostrarse sin nombre. Sin canales así, el aviso SHALL no aparecer.

#### Scenario: Canal nuevo en el batch limpio
- **GIVEN** el import de `batch-clean` analizado en `ProviderA-USD`
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra solo `RAM-07 is not assigned yet` con su nota; RAM-01 y RAM-02 no aparecen

#### Scenario: Canal principal de otra cuenta
- **GIVEN** el import de `batch-blocked` analizado en `ProviderB-Main`
- **WHEN** abre el paso Analysis
- **THEN** el aviso muestra `RAM-01 is primary in ProviderA-USD` con `1` fila

#### Scenario: Formas ocultas
- **GIVEN** un import analizado cuyo `channels` trae un canal con `outOfScope = true` y otro con `otherAccount.outOfScope = true`
- **WHEN** abre el paso Analysis
- **THEN** el primero se muestra como `Channel <channelId> (another merchant)` y el segundo como `<canal> is primary in an account of another merchant`, sin ningún otro dato de ese merchant

### Requirement: Resultado del análisis: advertencias
El paso Analysis SHALL listar cada código de `analysis.warnings` con conteo mayor que cero, con una etiqueta en inglés y el conteo; sin ninguno, SHALL mostrar `No warnings`.

#### Scenario: Importe negativo
- **GIVEN** el import de `batch-issues` analizado
- **WHEN** abre el paso Analysis
- **THEN** ve `Negative amount` con `1` y ningún otro código

#### Scenario: Sin advertencias
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** abre el paso Analysis
- **THEN** ve `No warnings`

### Requirement: Resultado del análisis: tabla de filas
El paso Analysis SHALL mostrar las filas de `GET rows` paginadas en el servidor (50 por página), en el orden del API, con archivo, hoja, fila, ID leído como texto, ciclo, resultado y motivo, estado, importe, canal y advertencias. SHALL permitir filtrar por resultado. Una fila ambigua SHALL mostrar sus candidatas sin acción.

#### Scenario: No asociadas primero
- **GIVEN** el import de `batch-issues` analizado
- **WHEN** abre el paso Analysis
- **THEN** la primera fila de la tabla es la de `4260465812403708` con `Unmatched` y `No match`, y la paginación indica `770` filas

#### Scenario: Filtro y página
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** filtra por `Matched` y va a la página 16
- **THEN** la tabla muestra 30 filas, todas `Matched`, y se pidió `GET rows?match=matched&page=16&pageSize=50`

#### Scenario: Transacción de otro merchant
- **WHEN** una fila trae `transaction = null` y `out_of_scope_transaction` en `warnings`
- **THEN** la fila muestra `Matched` y `Transaction of another merchant`, sin canal ni importe

#### Scenario: Fila ambigua
- **WHEN** una fila es `ambiguous` con candidatas en dos gateways
- **THEN** muestra `Ambiguous` y el nombre de gateway de cada candidata, sin control para elegir

### Requirement: Cancelación del import desde la pantalla
Con permiso y el import en `uploaded`, `mapped`, `analyzed` o `validated`, el espacio del import SHALL ofrecer **Cancel import**, que pide confirmación antes de llamar a `POST cancel`. Cancelado, el import SHALL mostrarse en solo lectura con su estado y un enlace para empezar un import nuevo en la misma cuenta.

#### Scenario: Cancelar un import analizado
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** `analyst` pulsa **Cancel import** y confirma
- **THEN** el import muestra `cancelled`, el paso Analysis conserva contadores y filas, no hay acciones de edición y **Start a new import** lleva a `/reconciliations/new` con `ProviderA-USD` elegida

#### Scenario: Desistir
- **WHEN** `analyst` pulsa **Cancel import** y cierra el diálogo sin confirmar
- **THEN** no se llama a `POST cancel` y el import no cambia

#### Scenario: Ya no cancelable
- **WHEN** `POST cancel` responde `409 import_not_cancellable`
- **THEN** ve `This import can no longer be cancelled (<estado>).` y la pantalla se recarga

### Requirement: Import en solo lectura
Un import SHALL mostrarse en solo lectura, sin subir, quitar, editar, confirmar, analizar ni cancelar, cuando el usuario no tiene `settlement.process`. Con permiso, Files y Mapping SHALL quedar en solo lectura fuera de `uploaded` y `mapped`, y **Cancel import** SHALL ocultarse en `processed` y `cancelled`.

#### Scenario: viewer ve el resultado
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** `viewer` abre `/imports/<importId>`
- **THEN** ve el paso Analysis con los contadores, el aviso de canales y las filas, sin **Cancel import**; en Files no hay zona de subida ni **Remove**, y en Mapping los controles están deshabilitados sin **Confirm mapping** ni **Analyze**

#### Scenario: Import analizado para analyst
- **GIVEN** el import de `batch-clean` analizado
- **WHEN** `analyst` abre el paso Files
- **THEN** no hay zona de subida ni **Remove**, y ve `Files cannot change after the analysis. Cancel the import and start a new one.`

### Requirement: Retomar un import por su enlace
`/imports/<importId>` SHALL abrir el import en el paso de su estado: Files sin archivos, Mapping en `uploaded` o `mapped` con archivos, Analysis desde `analyzed` o si está cancelado con análisis. El usuario SHALL poder moverse a los pasos anteriores. Un import inexistente o fuera del alcance SHALL mostrar `This import is not available.`

#### Scenario: Import pareado
- **GIVEN** un import en `mapped`
- **WHEN** `analyst` abre su enlace
- **THEN** ve el paso Mapping con el pareo confirmado

#### Scenario: Import de otro merchant
- **WHEN** `viewer` abre el enlace de un import de `ProviderC-Alt`
- **THEN** ve `This import is not available.` y ningún dato del import

### Requirement: Smoke E2E de la importación
El proyecto SHALL tener un escenario E2E en Gherkin, ejecutable en local con un comando, que contra la aplicación y el API reales con el seed cargado recorra login → subida → confirmación → análisis, compruebe el resultado de `batch-clean` contra su `expected.json` y cancele el import al terminar.

#### Scenario: Batch limpio de punta a punta
- **GIVEN** la base sembrada y la aplicación levantada
- **WHEN** `analyst` entra, elige `ProviderA-USD`, sube `Recon_Template_ProviderA-USD_batch-clean.xlsx`, confirma la propuesta tal cual y pulsa **Analyze**
- **THEN** ve `Rows read 783` y `Matched 780` y el aviso `RAM-07 is not assigned yet`
- **AND** al cancelar el import como limpieza ve `cancelled`

#### Scenario: Aplicación no levantada
- **WHEN** se ejecuta el smoke sin la aplicación o el API levantados
- **THEN** falla antes del primer paso con un mensaje que indica cómo levantar la base, el seed y la aplicación
