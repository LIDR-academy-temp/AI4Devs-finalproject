# Design

## Context

La suite E2E (`e2e/features/user-stories.feature`, escenario "Happy path from the upload to the payment") ya recorre el flujo que pide el vídeo, con los selectores por rol y texto accesible. Los helpers que importan para el vídeo viven hoy dentro de los steps:

- `signIn`, `setPassword` y `clearPassword` en `steps/common.steps.ts`.
- `upload`, que guarda el `importId` con `createdBy`.
- `processBatch` y los localizadores `amountPayable` y `headerValue`.
- El chequeo "database is freshly seeded", en `steps/settlement.steps.ts`.

Los steps no se pueden importar fuera de playwright-bdd, porque registran `Given`/`When` al cargarse. En cambio, `support/` (`cleanup.ts`, `api.ts`, `expected.ts`) y `global-setup.ts` sí se importan desde un script de Node.

Los scripts de `e2e/screenshots/` se ejecutan con `node <archivo>.ts` y lanzan su propio Chromium. Cada uno duplica su `signIn`. `playwright.config.ts` tiene `video: 'off'` y `trace: 'off'` a propósito.

La aplicación hace scroll en el documento (`AppLayout`: `min-h-screen`), no en un contenedor interno, y ffmpeg 8.1 está instalado en esta máquina (winget, `Gyan.FFmpeg`).

## Goals / Non-Goals

**Goals:**
- Un vídeo reproducible con un comando, que dure entre 2:15 y 2:45 y se lea sin audio.
- Que la suite no cambie: ni `steps/`, ni `features/`, ni `support/`, ni `playwright.config.ts`.
- Que ninguna pasada, con éxito o con fallo, deje abierto lo que el script creó.

**Non-Goals:**
- Mostrar un hallazgo con sus apariciones: `batch-clean` no tiene hallazgos y el recorrido pedido usa esa muestra. Mostrarlo exigiría una segunda muestra y alargaría el vídeo.
- Descargar los CSV de transacciones y reservas: el vídeo descarga el merchant summary, y los otros dos botones salen en pantalla.
- Puntero del ratón real, narración, música o edición fuera de ffmpeg.
- Grabar contra `https://recon.aperit.io/`.

## Decisions

### D1. El login se graba, con las protecciones de la suite

El issue #96 proponía hacer el login en un contexto sin grabar. El encargo de esta entrega pide que se vea el login de `analyst` y el cambio a `payments`, así que se graba. La contraseña sigue estas reglas:

- Sale de `SEED_PASSWORD` del `.env` de la raíz.
- Se escribe desde la página con el setter nativo de `value`, nunca con `fill()`, como hace la suite.
- Antes de escribir, el script exige que el campo sea `type="password"`. En el vídeo solo se ven puntos.
- Se vacía en un `finally` tras pulsar **Sign in**.

El vídeo de Playwright captura solo el viewport, sin barra de direcciones. El login es un `POST` con cuerpo JSON y nunca pone la contraseña en la URL. Los rótulos son constantes del script, y una comprobación al arrancar falla si alguno contiene el valor de `SEED_PASSWORD`. El nombre de usuario sí se teclea a la vista con `pressSequentially`, para que se lea quién entra.

Alternativa descartada: el login en un contexto aparte con `storageState`. Es más segura, pero no enseña el cambio de rol y contradice el recorrido pedido.

### D2. Script propio en `e2e/video/`, con su contexto y `recordVideo`

`e2e/video/demo-video.ts` hace `chromium.launch()` y abre un solo contexto con:

- `viewport` y `recordVideo.size` a 1280×720.
- `deviceScaleFactor` a 1.
- `acceptDownloads` activado.

Ese contexto tiene una sola página. `analyst` cierra sesión y entra `payments` en la misma página, como en la suite, así que sale un único `.webm`.

El script no pasa por `playwright test`, de modo que no hereda ni modifica `playwright.config.ts`, que sigue con `video: 'off'` y `trace: 'off'`. Se ejecuta con `pnpm video:demo` en la raíz, que llama a `node video/demo-video.ts` en `@recon/e2e`. `e2e/tsconfig.json` incluye `video` para que `pnpm typecheck` lo cubra.

Alternativa descartada: un proyecto de Playwright con `video: 'on'`. Mezcla la grabación con la suite y la expone a la CI.

### D3. Duplicación aceptada para no tocar la suite

La suite está en verde y el change se hace el día de la congelación, así que no se modifica. El script reutiliza solo lo que ya se puede importar:

- `global-setup.ts`: la aplicación y el API responden, y `SEED_PASSWORD` existe.
- `support/api.ts`: `apiSession`, para el chequeo de base recién sembrada.
- `support/cleanup.ts`: `cleanUp`, `apiClient` y `createdBy`.
- `support/expected.ts`: `expectedOf`, `sampleFile`, `formatAmount` y `sameDecimal`.

Los pasos de pantalla que necesita se copian en `e2e/video/steps.ts`, con los mismos selectores y un comentario que remite al step de origen:

- `signIn`, con `setPassword` y `clearPassword`.
- La subida de un archivo.
- El procesado del batch.
- La descarga del merchant summary.
- `cardNumber`, `amountPayable` y `headerValue`.
- El chequeo de base recién sembrada (`assertFreshSeed`).

Las acciones de una línea (**Confirm mapping**, **Analyze**, **Run validations**…) van directamente en el recorrido.

Coste aceptado: si cambia un selector de la interfaz, hay que tocarlo en la suite y en el vídeo. Lo mismo pasa ya con los scripts de `screenshots/`. Como la suite no cambia, basta con que el CI de la rama pase el job `e2e`; no hace falta repasarla en local.

Alternativa descartada: extraer los helpers a `support/` y que la suite y el vídeo los compartan. Es menos código, pero toca la suite el día de la congelación y obliga a repasarla con la base local.

### D4. Rótulos en una franja inferior reservada

Un `context.addInitScript` crea en cada carga de documento una franja fija al pie:

- 52 px de alto y ancho completo.
- Fondo oscuro semiopaco y texto blanco de 20 px.
- `pointer-events: none` y `z-index` máximo.

El script añade también `padding-bottom: 64px` al `body`, para que el contenido pueda subir por encima de la franja. El texto vive en `sessionStorage`, así que sobrevive a un `goto` o a una recarga. El helper `caption(page, text)` actualiza la franja y el almacenamiento.

Antes de cada pausa, el script lleva la cifra que importa al centro con `scrollIntoViewIfNeeded`, o con `scrollIntoView({ block: 'center' })` cuando hace falta. Así ninguna cifra queda bajo la franja.

Como el vídeo no graba el puntero, `highlight(locator)` dibuja un contorno de 600 ms sobre el botón antes de pulsarlo, para que se vea qué se pulsa.

Rótulos (constantes en inglés):

1. `Recon Tool 2.0 · demo with synthetic data` y `1. Sign in as analyst`
2. `2. Import the provider file · ProviderA-USD`
3. `3. Confirm the column mapping`
4. `4. Analysis: rows read and matched`
5. `5. Run the eight validations`
6. `6. Settlement Review: prefilled fees and settlement date`
7. `7. Process the batch`
8. `8. Settlement Summary: amount payable and CSV download`
9. `9. Sign in as payments and mark as paid`

Alternativa descartada: rótulos arriba, sobre la barra de la aplicación. Taparían la navegación y el título de cada pantalla.

### D5. Ritmo

Hay tres pausas fijas:

| Pausa | Duración | Uso |
|---|---|---|
| `HOLD_SHORT` | 2,5 s | Transiciones |
| `HOLD` | 4 s | Una pantalla normal |
| `HOLD_LONG` | 7 s | Contadores, tabla de validaciones, pre-summary y summary |

El usuario y la fecha de liquidación (`2026-10-24`, la de la suite) se teclean con un retardo de 80 ms por carácter. El script imprime al terminar la marca de tiempo de cada etapa respecto al inicio del vídeo, para ajustar las pausas hasta quedar entre 2:15 y 2:45.

Las esperas del sistema (analizar, validar, procesar) se graban tal cual. Si en la pasada de prueba alguna supera 8 s, el script anota su tramo y la conversión lo recorta con el filtro `select` de ffmpeg. Si no, ese código no se escribe (tarea 4.3).

### D6. Solo base local y recién sembrada

`BASE_URL` es la constante `http://localhost:5173`, sin variable de entorno que la cambie.

Antes de abrir el contexto grabado, el script ejecuta `globalSetup()` y su copia del chequeo de base recién sembrada (D3) para `batch-clean`: RAM-07 sin cuenta y siguiente batch de ProviderA-USD igual a `proposedBatchNo`. Si algo falla, termina sin grabar.

Durante el recorrido, el script comprueba con `expect` las mismas cifras que la suite:

- Filas leídas y asociadas.
- Fees prellenados.
- Amount payable del pre-summary y del summary.
- Nombre y fila `Amount payable` del CSV.

Si una no cuadra, el vídeo no se genera.

### D7. Limpieza fuera de cámara, por el API

El script guarda en `created` el `importId` y el `batchId` a partir de las respuestas, como la suite. Al terminar el recorrido (rótulo 9 con `Paid` en pantalla y `HOLD_LONG`), cierra el contexto, lo que finaliza el `.webm`. Después, en un `finally` que también corre si algo falla, ejecuta `cleanUp(created, apiClient(), 'Demo video cleanup')`:

1. `payments` retira el pago.
2. `analyst` deshace el intento.
3. `analyst` cancela el import.

Las notas de fallo de la limpieza se imprimen sin la contraseña (`oneLine` ya la enmascara). Al final siempre imprime: `Run pnpm db:seed before pnpm test:e2e or pnpm test:api: batch 123 of ProviderA-USD is used up and RAM-07 is primary.`

La limpieza no sale en el vídeo, porque el recorrido pedido termina en **Mark as paid**.

### D8. Conversión con ffmpeg y salida versionada

El `.webm` se escribe en un directorio temporal del sistema. Después:

1. ffmpeg se toma de `FFMPEG_PATH` o del `PATH`. Si no está, el script falla con: `ffmpeg not found: install it with "winget install Gyan.FFmpeg" and open a new terminal, or set FFMPEG_PATH.`
2. La conversión es: `-c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -r 25 -an -movflags +faststart`, con `-ss 0.3` para quitar el primer fotograma en blanco.
3. El resultado va a un archivo temporal junto al destino y solo se renombra a `docs/demo/recon-tool-demo.mp4` si mide menos de 20 MB. Un fallo nunca pisa el vídeo anterior.
4. Si `ffprobe` está junto a ffmpeg, el script imprime la duración, el códec y si hay pista de audio.

`.gitattributes` gana `*.mp4 binary`. A 1280×720 y CRF 28, una grabación de pantalla de unos 3 minutos ronda los 5–10 MB.

## Risks / Trade-offs

- [El análisis o la validación tardan y dejan tiempo muerto] → Se mide en la pasada de prueba. Si algún tramo pasa de 8 s, se recorta (D5).
- [Una cifra queda bajo la franja o fuera del viewport de 720 px] → `scrollIntoView` al centro antes de cada pausa y revisión fotograma a fotograma de la pasada de prueba (tarea 4.2).
- [Los pasos duplicados se desfasan de la suite] → Cada copia cita su step de origen. Una pasada del vídeo falla en el `expect` que deje de cuadrar, nunca graba en silencio una pantalla equivocada.
- [El vídeo muestra cuántos caracteres tiene la contraseña] → Es lo que muestra cualquier login, y el valor no está en ningún fotograma. Se acepta.
- [La grabación ensucia la base local] → Se limpia por el API y se recuerda volver a sembrar. La base pública no se toca nunca (D6).
- [Un `.mp4` en git pesa en cada clon] → Menos de 20 MB y un solo archivo. Si se regenera, se sustituye en el mismo commit.
- [El vídeo queda desfasado de la interfaz] → Se regenera con un comando sobre una base recién sembrada.

## Migration Plan

No aplica: no hay despliegue ni cambios en la aplicación. Para volver atrás basta revertir el PR. La persona vuelve a sembrar la base local tras grabar.

## Estimación

| Bloque | Horas |
|---|---|
| Pasos de pantalla duplicados en `e2e/video/steps.ts` | 0,5 |
| Script de grabación (recorrido, rótulos, resaltado, limpieza) | 2 |
| Conversión ffmpeg, tamaño y salida segura | 0,5 |
| Pasadas de prueba, ajuste de pausas y revisión fotograma a fotograma | 1,5 |
| README, `docs/demo`, `.gitattributes` | 0,5 |
| Verify y PR (la suite la pasa el CI) | 0,5 |
| **Total** | **5,5** (rango 4,5–7) |

Necesita un solo turno de base: dos o tres pasadas del vídeo, y la persona siembra antes de cada una y al terminar.
