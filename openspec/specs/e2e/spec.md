# e2e Specification

## Purpose

Suite E2E de las historias de usuario HU1 a HU3, en Gherkin contra la aplicación y el API reales: qué escenarios recorre, con qué muestras y oráculos de `data/samples/`, cómo deja la base y qué garantías da sobre las credenciales y el informe. README §2.6 y §5.

## Requirements

### Requirement: Suite E2E de las historias de usuario
El proyecto SHALL tener una suite E2E en Gherkin, ejecutable con `pnpm test:e2e`, que recorra HU1, HU2 y HU3 en el navegador contra la aplicación y el API reales, sobre una base recién sembrada. Las cifras esperadas SHALL leerse de los `expected.json` de `data/samples/`. Ningún paso SHALL llevar escrito un número de la muestra.

#### Scenario: Cifras desde el oráculo
- **GIVEN** un paso que comprueba filas, hallazgos, totales o el amount payable
- **WHEN** se ejecuta
- **THEN** compara con el valor de `expected.json` de la muestra del escenario, y el texto del paso nombra la muestra, no el número

#### Scenario: Base sin sembrar
- **GIVEN** una base en la que `batch-clean` ya se procesó, o en la que RAM-07 ya tiene cuenta principal
- **WHEN** se ejecuta la suite
- **THEN** el flujo feliz falla en su primer paso con un mensaje que pide `pnpm db:seed`, sin subir ningún archivo

### Requirement: Credenciales y evidencia de la suite E2E
La suite SHALL tomar las contraseñas solo de `SEED_PASSWORD` en el `.env` de la raíz, para los usuarios sembrados `analyst` y `payments`, y SHALL escribirlas desde la página, sin que aparezcan en el título de un paso, en la consola ni en el informe. SHALL ejecutarse sin traza ni vídeo, con captura de pantalla solo al fallar y con el campo de contraseña vacío.

#### Scenario: Informe sin contraseña
- **WHEN** termina una pasada, con éxito o con fallos
- **THEN** ni la salida ni `e2e/playwright-report/` contienen el valor de `SEED_PASSWORD`

### Requirement: Limpieza de la suite E2E
Cada escenario SHALL terminar retirando el pago, deshaciendo y cancelando lo que creó, en ese orden. Si falla a mitad, la limpieza SHALL hacerse igual por el API, y su propio fallo SHALL anotarse en el test sin ocultar el error original. Los números de batch consumidos, los intentos `undone`, los imports `cancelled`, la auditoría y la cuenta principal de RAM-07 no se pueden deshacer.

#### Scenario: Escenario que falla tras pagar
- **GIVEN** el flujo feliz falla con el intento `paid`
- **WHEN** termina el escenario
- **THEN** el intento queda `undone` y su import `cancelled`, y el informe muestra el error del paso que falló

#### Scenario: Después de una pasada verde
- **WHEN** termina la suite sin fallos
- **THEN** ningún import creado por ella está abierto y ningún intento creado por ella está `processed` ni `paid`

### Requirement: E2E del flujo feliz de HU1 a HU3
Con `batch-clean` en ProviderA-USD, `analyst` SHALL importar, confirmar la propuesta de pareo, analizar, validar sin hallazgos, continuar, procesar aceptando la asociación de RAM-07 y descargar el **Merchant summary**. Después, `payments` SHALL marcarlo pagado. `analyst` no SHALL ver **Mark as paid**.

#### Scenario: Batch limpio procesado, descargado y pagado
- **GIVEN** la base recién sembrada
- **WHEN** `analyst` recorre el flujo con `batch-clean`, procesa con los fees prellenados y descarga el summary
- **THEN** las filas leídas, asociadas, no asociadas, ambiguas e ignoradas, los rangos APP, DEC, I y R, y el resultado, los hallazgos y si bloquea de las ocho validaciones coinciden con `expected.json`
- **AND** tras procesar, RAM-07 ya no figura entre los canales sin cuenta del API
- **AND** el resumen previo y el Settlement Summary muestran su `amountPayable`, y el summary descargado se llama `ProviderA-USD_B<n>_A1_summary.csv` y trae `Amount payable` con ese importe
- **AND** `analyst` no ve **Mark as paid**; `payments` lo pulsa y ve `Paid` con `Paid by` `payments`
- **AND** al terminar, `payments` retira el pago con motivo, `analyst` deshace con motivo y cancela el import

### Requirement: E2E de provider_mismatch
Con `batch-blocked` en ProviderB-Main, la suite SHALL comprobar que la validación `provider_mismatch` bloquea, que **Continue to settlement review** está deshabilitado con su motivo y que **Cancel and reprocess** cancela el import.

#### Scenario: Batch bloqueado
- **WHEN** `analyst` importa, analiza y valida `batch-blocked`
- **THEN** `provider_mismatch` está `Blocked`, bloquea y tiene los hallazgos de `expected.json` con el ID de `affectedIds`; las otras siete validaciones no se comparan, porque el oráculo de `batch-blocked` solo trae `provider_mismatch`. Además, **Continue to settlement review** está deshabilitado con `provider_mismatch: cancel the import and process it under the correct provider.`
- **AND** al pulsar **Cancel and reprocess** y confirmar, el import queda `cancelled`

### Requirement: E2E de deshacer y reprocesar
Con `batch-split` (sus dos archivos en un import) en ProviderA-USD, la suite SHALL procesar el batch, deshacerlo con motivo, volver a validarlo y comprobar que Settlement Review propone el mismo número con el intento 2. Después SHALL procesar ese intento, deshacerlo y cancelar el import.

#### Scenario: Mismo número con el intento 2
- **GIVEN** `batch-split` procesado como batch `<n>` intento 1
- **WHEN** `analyst` lo deshace con un motivo, vuelve a **Run validations** y continúa
- **THEN** Settlement Review propone `<n> · attempt 2`, y al procesar llega al Settlement Summary del intento 2 con el `amountPayable` de `expected.json`

### Requirement: E2E del batch sin filas asociadas
Con `batch-wrong-account` en ProviderA-USD, la suite SHALL comprobar el desglose de no asociadas por motivo, el aviso de cuenta equivocada y la casilla **Continue with batch fees only** sin marcar. Con ella sin marcar, **Continue to settlement review** SHALL estar deshabilitado. Al final, **Cancel and reprocess** SHALL cancelar el import.

#### Scenario: Archivo de otra cuenta
- **WHEN** `analyst` importa, analiza y valida `batch-wrong-account`
- **THEN** `Unmatched` y su desglose `ID does not fit any gateway` dan los números de `expected.json`, y se ve el aviso de cuenta equivocada
- **AND** el resultado, los hallazgos y si bloquea de cada validación coinciden con los `outcomes` y las `validations` de `expected.json`
- **AND** con la casilla sin marcar, **Continue to settlement review** está deshabilitado con `Confirm that this batch has batch fees only.`
- **AND** al pulsar **Cancel and reprocess** y confirmar, el import queda `cancelled`, y **Start a new import** lleva a New Reconciliation con ProviderA-USD elegida

### Requirement: Vídeo de la demo: recorrido y salida
El proyecto SHALL tener un script, `pnpm video:demo`, fuera de `pnpm test:e2e` y de la CI, que grabe a 1280×720 en un contexto propio el flujo feliz de `batch-clean` en ProviderA-USD, de `analyst` importando a `payments` marcando el pago. Cada etapa SHALL llevar un rótulo en inglés que no tape cifras. La salida SHALL ser `docs/demo/recon-tool-demo.mp4`, H.264, sin audio y de menos de 20 MB.

#### Scenario: Grabación completa
- **GIVEN** la base local recién sembrada y la aplicación levantada con `pnpm dev`
- **WHEN** se ejecuta `pnpm video:demo`
- **THEN** `docs/demo/recon-tool-demo.mp4` dura entre 2 y 3 minutos, es H.264 a 1280×720 sin pista de audio, ocupa menos de 20 MB y muestra en orden, cada una con su rótulo, las nueve etapas: login de `analyst`, import, pareo de columnas, análisis, validaciones, Settlement Review con fees prellenados y fecha, Process, Settlement Summary con la descarga del merchant summary, y `payments` con **Mark as paid**
- **AND** las cifras que se muestran (filas leídas y asociadas, fees prellenados, amount payable) son las de `data/samples/batch-clean/expected.json`, comprobadas por el script antes de seguir

#### Scenario: La suite sigue sin vídeo
- **WHEN** se ejecuta `pnpm test:e2e` después de este change
- **THEN** la configuración de Playwright de la suite tiene `video` y `trace` desactivados, y los escenarios pasan igual que antes

### Requirement: Vídeo de la demo: credenciales y base
El script del vídeo SHALL tomar la contraseña solo de `SEED_PASSWORD` y escribirla desde la página en un campo `type="password"`, sin que aparezca en rótulos, en la URL ni en la consola. SHALL ejecutarse solo contra `http://localhost:5173` sobre una base recién sembrada, y fallar antes de grabar si no es así. Al terminar, con éxito o con fallo, SHALL deshacer por el API lo que creó y recordar `pnpm db:seed`.

#### Scenario: Base no recién sembrada
- **GIVEN** una base en la que `batch-clean` ya se procesó, o en la que RAM-07 ya tiene cuenta principal
- **WHEN** se ejecuta `pnpm video:demo`
- **THEN** el script falla antes de abrir el contexto grabado, con un mensaje que pide `pnpm db:seed`, y no modifica `docs/demo/recon-tool-demo.mp4`

#### Scenario: Aplicación local no levantada
- **WHEN** se ejecuta `pnpm video:demo` sin la aplicación o el API respondiendo en `http://localhost:5173`
- **THEN** el script falla antes de grabar, indicando los comandos para levantarlos, y nunca usa la URL pública

#### Scenario: Contraseña fuera del vídeo y de la salida
- **WHEN** el script inicia sesión como `analyst` o `payments` dentro de la grabación
- **THEN** la contraseña sale de `SEED_PASSWORD`, se escribe desde la página en un campo de tipo `password`, el campo se vacía tras pulsar **Sign in**, y su valor no aparece en ningún rótulo, en la URL ni en la salida de la consola

#### Scenario: Limpieza al terminar
- **WHEN** el script termina, con éxito o tras un fallo a mitad
- **THEN** el intento que creó queda `undone` y su import `cancelled`, por el API y fuera del vídeo
- **AND** la salida recuerda ejecutar `pnpm db:seed` antes de la suite o de la colección, porque el número de batch consumido y la cuenta principal de RAM-07 no se deshacen
