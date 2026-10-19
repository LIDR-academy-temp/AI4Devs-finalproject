# Spec Delta — validation (pantalla Analysis & Validations)

## ADDED Requirements

### Requirement: Pantalla Analysis & Validations: ejecutar la corrida
El paso Analysis de un import `analyzed` o `validated` SHALL ofrecer, con `settlement.process`, **Run validations** (sin corrida vigente) o **Run again** (con ella), que llama a `POST validations` y pinta la corrida devuelta. La pantalla SHALL NOT ejecutar las validaciones por su cuenta: ni al terminar el análisis ni al abrir el paso.

#### Scenario: Sin corrida todavía
- **GIVEN** el import de `batch-issues` analizado y sin corrida vigente
- **WHEN** `analyst` abre el paso Analysis
- **THEN** ve `No validation run yet.` y **Run validations**, y no se ha llamado a `POST validations`

#### Scenario: Primera corrida
- **GIVEN** el import de `batch-issues` analizado y sin corrida
- **WHEN** `analyst` pulsa **Run validations**
- **THEN** se llama una vez a `POST /imports/<importId>/validations` y la pantalla muestra las ocho validaciones de la corrida devuelta y el botón pasa a **Run again**

### Requirement: Pantalla Analysis & Validations: corrida sin doble envío y relectura ante conflicto
Mientras `POST validations` está en curso, **Run validations** / **Run again** y **Continue to settlement review** SHALL estar deshabilitados y un segundo clic SHALL NOT lanzar otra petición. Ante `409 import_changed` o `409 import_not_analyzed`, la pantalla SHALL releer la corrida vigente y el import y decir qué pasó.

#### Scenario: Doble clic
- **WHEN** `analyst` pulsa **Run validations** dos veces seguidas
- **THEN** el API recibe un solo `POST validations` y el botón queda deshabilitado hasta la respuesta

#### Scenario: El import cambió mientras se validaba
- **WHEN** `POST validations` responde `409 import_changed`
- **THEN** ve `The import changed while the validations ran. The results were reloaded.`, se vuelven a pedir `GET validations` y `GET /imports/<importId>`, y **Run again** vuelve a estar habilitado

#### Scenario: El import ya no admite validar
- **WHEN** `POST validations` responde `409 import_not_analyzed` con `status = cancelled`
- **THEN** ve `The validations cannot run on a cancelled import.`, el import se relee y ya no se ofrece **Run again**

### Requirement: Pantalla Analysis & Validations: aviso antes de volver a ejecutar
**Run again** SHALL pedir confirmación cuando la corrida vigente tiene `manualChangeCount > 0` o el import está `validated`. El diálogo SHALL decir cuántos cambios manuales se pierden y, si el import está `validated`, que la revisión quedará invalidada. Desistir SHALL NOT llamar al API. Sin ninguna de las dos condiciones, ejecuta sin diálogo.

#### Scenario: Cambios manuales que se pierden
- **GIVEN** la corrida vigente de `batch-issues` con `manualChangeCount = 2` y el import `analyzed`
- **WHEN** `analyst` pulsa **Run again**
- **THEN** ve `Running the validations again discards 2 manual changes (inclusions and resolutions).` y solo tras confirmar se llama a `POST validations`

#### Scenario: Revisión que se invalidará
- **GIVEN** el import de `batch-issues` `validated` con `manualChangeCount = 0`
- **WHEN** `analyst` pulsa **Run again**
- **THEN** el diálogo dice `The current review will be invalidated and the import returns to analyzed.`

#### Scenario: Desistir
- **WHEN** `analyst` cierra el diálogo de **Run again** sin confirmar
- **THEN** no se llama a `POST validations` y la corrida sigue igual

#### Scenario: Sin nada que perder
- **GIVEN** la corrida vigente con `manualChangeCount = 0` y el import `analyzed`
- **WHEN** `analyst` pulsa **Run again**
- **THEN** se llama a `POST validations` sin diálogo

### Requirement: Pantalla Analysis & Validations: cabecera de la corrida
Con corrida vigente, la pantalla SHALL mostrar el estado global (`Blocked` si `run.blocked`; si no, `Warnings` si alguna validación es `warning`; si no, `Passed`), el número de corrida con su fecha y su usuario, los rangos APP, DEC, I y R usados (`—` si el rango es nulo) y los contadores informativos `pendingInRangeCount`, `undatedAdjustmentCount` y `undatedCandidateCount`.

#### Scenario: Corrida con advertencias
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el paso Analysis
- **THEN** ve `Warnings`, `Run #<runId>` con su fecha en `ET` y `analyst`, los cuatro rangos con fecha mínima y máxima, y `Pending in range 0`, `Undated adjustments 1`, `Undated candidates 0`

#### Scenario: Corrida bloqueada
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** abre el paso Analysis
- **THEN** el estado global es `Blocked`

#### Scenario: Rango sin filas
- **WHEN** la corrida trae `ranges.DEC = null`
- **THEN** el rango DEC se muestra como `—`

### Requirement: Pantalla Analysis & Validations: fechas en hora de Nueva York
Toda fecha de la pantalla SHALL mostrarse en hora de America/New_York con el sufijo `ET`, sin depender de la zona del navegador. Las fechas de negocio (rangos, `relevantDate`, fechas de batch) SHALL mostrarse tal como llegan, sin convertir, porque ya son hora de Nueva York aunque el API las serialice con `Z`. Las de auditoría (corrida, revisión, invalidación, cambios, resolución, historial) SHALL convertirse desde UTC.

#### Scenario: Rango de negocio sin desplazamiento
- **WHEN** la corrida trae `ranges.APP.min = 2026-09-28T00:00:00.000Z`
- **THEN** el rango APP empieza en `2026-09-28 00:00 ET`, también con el navegador en otra zona

#### Scenario: Auditoría en horario de verano
- **WHEN** una aparición trae `changedAt = 2026-10-18T14:20:00.000Z`
- **THEN** se muestra `2026-10-18 10:20 ET`

#### Scenario: Auditoría en horario estándar
- **WHEN** una resolución trae `resolvedAt = 2026-11-02T15:00:00.000Z`
- **THEN** se muestra `2026-11-02 10:00 ET`

### Requirement: Pantalla Analysis & Validations: tabla de las ocho validaciones
La pantalla SHALL listar las ocho validaciones en el orden en que llegan del API, cada una con su nombre en inglés, su resultado (`Passed`, `Warning`, `Blocked`, `n/a` para `not_applicable`, `Not implemented`), su número de hallazgos, si bloquea y su desglose cuando no es nulo. Una validación con hallazgos SHALL poder abrir su lista desde el teclado.

#### Scenario: Validaciones de batch-issues
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el paso Analysis
- **THEN** ve en este orden `Provider mismatch` `Passed` `0`, `Non-recorded adjustment` `Warning` `3` con `1 non-recorded adjustment · 2 status mismatches`, `Duplicate in batch` `Warning` `1`, `Status collision in batch` `Warning` `1`, `Duplicate across batches` `Warning` `1`, `Status collision across batches` `Warning` `1`, `Missing previous to batch` `Warning` `10` con `DEC 10`, y `Missing in range` `Warning` `6` con `APP 3 · R 3`

#### Scenario: Validación bloqueante
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** abre el paso Analysis
- **THEN** `Provider mismatch` muestra `Blocked`, `1` y `Blocks`

#### Scenario: Validación no aplicable
- **WHEN** una validación llega con `outcome = not_applicable`
- **THEN** se muestra `n/a`, sin acceso a hallazgos y sin presentarse como aprobada

### Requirement: Pantalla Analysis & Validations: lista de hallazgos
Al elegir una validación, la pantalla SHALL listar los hallazgos de la corrida vigente filtrados por esa validación, paginados en el servidor (50 por página), en el orden del API, con ID leído como texto, ciclo, tipo y alcance, estado reportado y estado del gateway (si lo hay), rango del faltante, apariciones incluidas sobre el total y resolución. La validación, la página y el hallazgo abierto SHALL ir en la dirección.

#### Scenario: Faltantes anteriores al batch
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** elige `Missing previous to batch`
- **THEN** se pide `GET validation-issues?validationCode=missing_previous_to_batch&page=1&pageSize=50` y ve 10 hallazgos, todos con rango `DEC` y `Persistent`, entre ellos `292185165085382`

#### Scenario: Discrepancia de estado
- **WHEN** elige `Non-recorded adjustment`
- **THEN** ve 3 hallazgos: `281520820250015` como `Non-recorded adjustment` y `911545593909470` y `381797111970492` como `Status mismatch`, cada uno con el estado reportado y el del gateway

#### Scenario: Recargar conserva la vista
- **GIVEN** la lista de `Duplicate in batch` abierta con el hallazgo de `441706751475644` en el drawer
- **WHEN** recarga la página
- **THEN** vuelve a ver la misma validación elegida y el mismo hallazgo abierto

### Requirement: Pantalla Analysis & Validations: detalle de un hallazgo
Abrir un hallazgo SHALL mostrar en un panel lateral todas sus apariciones: las del import, con archivo, hoja y fila, y las de batches anteriores, con número de batch, intento, cuenta y estado actual del batch. De cada una SHALL mostrar el estado (`Unresolved status` si es nulo), `CHB 2` si `excludeAmount`, si está incluida por defecto, si está incluida ahora y quién y cuándo la cambió. Debajo, la resolución y el historial con usuario y fecha.

#### Scenario: Duplicado en el batch (HU2 CA2)
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** abre el hallazgo `Duplicate in batch` de `441706751475644`
- **THEN** ve dos apariciones de `Recon_Template_ProviderB-Main_batch-issues.xlsx` · `APP`, en las filas 12 y 338, ambas `Successful`; la primera `Included by default` e incluida, y la segunda excluida por defecto

#### Scenario: Aparición de un batch anterior
- **WHEN** abre el hallazgo `Duplicate across batches` de `504712738863260`
- **THEN** la aparición `previous_batch` muestra el número de batch, el intento, la cuenta y el estado del batch, y la del import aparece excluida por defecto

#### Scenario: Estado no resuelto
- **WHEN** una aparición llega con `status = null`
- **THEN** se muestra `Unresolved status` y la aparición no se oculta

#### Scenario: Hallazgo de una sola fila
- **WHEN** abre un hallazgo `Non-recorded adjustment`, `Status mismatch` o `Provider mismatch`, que el API devuelve con su fila en `source` y sin apariciones
- **THEN** ve la fila en `Row` (archivo, hoja y fila) y no la sección de apariciones ni ningún aviso de que la transacción no está en el batch

#### Scenario: Faltante sin apariciones
- **WHEN** abre un hallazgo `Missing previous to batch` o `Missing in range`
- **THEN** ve `No occurrences: the transaction is not in this batch.`

#### Scenario: Teclado
- **WHEN** el usuario abre un hallazgo con Enter desde la lista y pulsa Escape
- **THEN** el panel se abre con el foco dentro y, al cerrarse, el foco vuelve al hallazgo de la lista

### Requirement: Pantalla Analysis & Validations: cambiar la inclusión de una aparición
Una aparición con `editable = true` SHALL ofrecer un interruptor `Included in settlement`. Con `includable = false` solo SHALL permitir excluir y mostrar el motivo genérico. Al cambiarlo SHALL llamar a `PATCH conflict-occurrences` y pintar el detalle devuelto con el usuario, la fecha y la entrada del historial. Con `editable = false` SHALL mostrar el valor como texto.

#### Scenario: Incluir el duplicado (criterio 2 del issue)
- **GIVEN** el hallazgo `Duplicate in batch` de `441706751475644` abierto por `analyst`
- **WHEN** activa `Included in settlement` en la segunda aparición
- **THEN** se llama a `PATCH /conflict-occurrences/<occurrenceId>` con `{ "includeInSettlement": true }`, la aparición muestra `Changed by analyst` con la fecha, el historial suma `analyst` `excluded → included` con la fecha y la lista muestra `2 / 2` incluidas

#### Scenario: Reserva que no se puede incluir
- **WHEN** una aparición R llega con `editable = true`, `includable = false` y excluida
- **THEN** su interruptor está deshabilitado con `This reserve cannot be included: another occurrence is included or it was released in a previous batch.`

#### Scenario: Rechazo de la regla de R
- **WHEN** `PATCH conflict-occurrences` responde `409 occurrence_not_includable` con `reason = reserve_already_included`
- **THEN** ve `A reserve is released only once: exclude the included occurrence first.`, el hallazgo se relee y el interruptor muestra el valor del servidor

#### Scenario: Aparición histórica
- **WHEN** una aparición `previous_batch` llega con `editable = false`
- **THEN** muestra `Included` o `Excluded` como texto, sin interruptor

#### Scenario: Corrida superada
- **WHEN** `PATCH conflict-occurrences` responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. The results were reloaded.` y se relee la corrida vigente

### Requirement: Pantalla Analysis & Validations: inclusión sobre un import validado
Con el import `validated`, cambiar una inclusión SHALL pedir confirmación antes de llamar al API, avisando de que la revisión quedará invalidada y el import volverá a `analyzed`. Tras el cambio, la pantalla SHALL mostrar el import `analyzed` y el aviso de revisión invalidada.

#### Scenario: Confirmar el cambio
- **GIVEN** el import de `batch-issues` `validated`
- **WHEN** `analyst` cambia la inclusión de una aparición y confirma
- **THEN** se llama a `PATCH conflict-occurrences`, el import muestra `analyzed` y aparece el aviso de revisión invalidada con el motivo `an inclusion was changed`

#### Scenario: Desistir
- **WHEN** cierra el diálogo sin confirmar
- **THEN** no se llama al API y el interruptor conserva su valor

### Requirement: Pantalla Analysis & Validations: resolver a mano con nota
Un hallazgo con `resolvable = true` SHALL ofrecer **Mark as resolved** con una nota obligatoria de 1 a 500 caracteres (sin contar espacios de los extremos). Al guardar SHALL llamar a `PATCH validation-issues` y mostrar `Resolved`, el usuario, la fecha y la nota. Con `resolvable = false` SHALL NOT ofrecer la acción.

#### Scenario: Resolver el ajuste no registrado
- **GIVEN** el hallazgo `Non-recorded adjustment` de `281520820250015` abierto por `analyst`
- **WHEN** escribe `Checked in the gateway: adjustment recorded late` y pulsa **Mark as resolved**
- **THEN** se llama a `PATCH /validation-issues/<issueId>` con `{ "resolutionStatus": "resolved", "note": "Checked in the gateway: adjustment recorded late" }` y ve `Resolved by analyst` con la fecha y la nota, también en el historial

#### Scenario: Nota vacía
- **WHEN** pulsa **Mark as resolved** con la nota vacía o solo con espacios
- **THEN** ve `Write a note before resolving.` y no se llama al API

#### Scenario: Ya resuelto por otra persona
- **WHEN** `PATCH validation-issues` responde `409 issue_already_resolved`
- **THEN** ve `This finding was already resolved by <usuario> on <fecha>.` y el hallazgo se relee

#### Scenario: Hallazgo no resoluble a mano
- **WHEN** abre un hallazgo `Duplicate in batch`
- **THEN** no se ofrece **Mark as resolved**

### Requirement: Pantalla Analysis & Validations: aviso de revisión invalidada
Con `lastInvalidatedReview` no nulo y sin revisión vigente posterior (`run.review` nulo o con fecha anterior a `invalidatedAt`), la pantalla SHALL avisar de que la revisión anterior quedó invalidada: quién la hizo y cuándo, quién la invalidó y cuándo, y el motivo. Tras una revisión nueva SHALL dejar de mostrarlo.

#### Scenario: Volver a ejecutar tras revisar (criterio 4 del issue)
- **GIVEN** el import de `batch-issues` `validated` por `analyst`
- **WHEN** `analyst` pulsa **Run again** y confirma
- **THEN** ve `The review by analyst on <fecha> was invalidated by analyst on <fecha>: the validations ran again (run #<runId nuevo>).` y el import muestra `analyzed`

#### Scenario: Revisión nueva
- **GIVEN** el aviso de revisión invalidada a la vista
- **WHEN** `analyst` pulsa **Continue to settlement review** y el API responde `200`
- **THEN** el aviso desaparece

### Requirement: Pantalla Analysis & Validations: continuar o cancelar
La pantalla SHALL ofrecer una sola decisión de conjunto: **Continue to settlement review**, que llama a `POST review` con el `runId` de la corrida mostrada, y **Cancel and reprocess**, con confirmación. Continue SHALL estar deshabilitado sin corrida vigente o con la corrida bloqueada, con el motivo visible y asociado al botón. En `cancelled` y `processed` SHALL mostrar un texto de solo lectura por estado.

#### Scenario: provider_mismatch (criterio 1 del issue, HU2 CA5)
- **GIVEN** la corrida vigente de `batch-blocked`
- **WHEN** `analyst` abre el paso Analysis
- **THEN** **Continue to settlement review** está deshabilitado y ve `provider_mismatch: cancel the import and process it under the correct provider.`, con un enlace al hallazgo de `252570479111759`, y **Cancel and reprocess** está disponible

#### Scenario: Sin corrida
- **GIVEN** el import analizado sin corrida vigente
- **THEN** **Continue to settlement review** está deshabilitado con `Run the validations before continuing.`

#### Scenario: Solo advertencias (criterio 3 del issue, HU2 CA6)
- **GIVEN** la corrida vigente de `batch-issues` sin cambios
- **WHEN** `analyst` pulsa **Continue to settlement review**
- **THEN** se llama a `POST /imports/<importId>/review` con `{ "runId": <runId> }`, el import muestra `validated`, ve `Reviewed by analyst on <fecha>` y se ofrece **Settlement Review**

#### Scenario: Corrida superada al continuar
- **WHEN** `POST review` responde `409 validation_run_superseded`
- **THEN** ve `A newer validation run exists. Review it before continuing.`, se relee la corrida y Continue usa el `runId` nuevo solo cuando se vuelva a pulsar

#### Scenario: Import cancelado
- **GIVEN** el import de `batch-issues` `cancelled` con su corrida
- **WHEN** abre el paso Analysis
- **THEN** la sección de la decisión muestra `This import is cancelled. Its run and findings are kept for reference.` y ningún botón

#### Scenario: Import procesado
- **GIVEN** el import de `batch-issues` `processed` con su corrida
- **WHEN** abre el paso Analysis
- **THEN** la sección de la decisión muestra `This import is processed. Its run and findings are kept for reference.`, ningún botón y nada que diga `cancelled`

#### Scenario: Cancelar y reprocesar (HU2 CA8)
- **WHEN** `analyst` pulsa **Cancel and reprocess** y confirma
- **THEN** se llama a `POST cancel`, el import muestra `cancelled` y la corrida, la tabla y los hallazgos siguen visibles en solo lectura

### Requirement: Pantalla Analysis & Validations: acceso a Settlement Review
Con el import `validated`, la pantalla SHALL ofrecer **Settlement Review** como siguiente paso. Mientras esa pantalla no exista, SHALL mostrarse como entrada deshabilitada con `Settlement Review is not available yet.`, sin enlace a una ruta inexistente.

#### Scenario: Import validado antes de #13
- **GIVEN** el import de `batch-issues` `validated`
- **WHEN** abre el paso Analysis
- **THEN** ve **Settlement Review** deshabilitado con `Settlement Review is not available yet.` y no hay ningún enlace que lleve a una página no encontrada

### Requirement: Pantalla Analysis & Validations: solo lectura
Sin `settlement.process`, la pantalla SHALL mostrar corrida, validaciones, hallazgos y detalle sin **Run validations**, **Continue**, **Cancel and reprocess**, interruptores ni **Mark as resolved**. Con permiso, Run y Continue SHALL ocultarse fuera de los estados que los admiten; los controles del detalle SHALL seguir solo `editable`, `includable` y `resolvable` del API.

#### Scenario: viewer
- **GIVEN** la corrida vigente de `batch-issues`
- **WHEN** `viewer` abre el paso Analysis y el hallazgo `Duplicate in batch`
- **THEN** ve las ocho validaciones, la lista y las dos apariciones con `Included` / `Excluded` como texto, sin ningún botón de acción, y no aparece la sección de la decisión vacía

#### Scenario: Import cancelado con un ajuste aún resoluble
- **GIVEN** el import de `batch-issues` `cancelled` y el hallazgo `Non-recorded adjustment` con `resolvable = true` y apariciones con `editable = false`
- **WHEN** `analyst` lo abre
- **THEN** no hay **Run again** ni **Continue**, las apariciones no tienen interruptor y sí se ofrece **Mark as resolved**
