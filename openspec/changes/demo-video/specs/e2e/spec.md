## ADDED Requirements

### Requirement: Vídeo de la demo: recorrido y salida
El proyecto SHALL tener un script, `pnpm video:demo`, fuera de `pnpm test:e2e` y de la CI, que grabe a 1280×720 en un contexto propio el flujo feliz de `batch-clean` en ProviderA-USD: login de `analyst`, import, pareo, análisis, validaciones, Settlement Review, Process, Settlement Summary con descarga del merchant summary, y `payments` con **Mark as paid**. Cada etapa SHALL llevar un rótulo en inglés que no tape cifras. La salida SHALL ser `docs/demo/recon-tool-demo.mp4`, H.264, sin audio y de menos de 20 MB.

#### Scenario: Grabación completa
- **GIVEN** la base local recién sembrada y la aplicación levantada con `pnpm dev`
- **WHEN** se ejecuta `pnpm video:demo`
- **THEN** `docs/demo/recon-tool-demo.mp4` dura entre 2 y 3 minutos, es H.264 a 1280×720 sin pista de audio, ocupa menos de 20 MB y muestra las nueve etapas en orden, cada una con su rótulo
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
