# Proposal

## Why

La Entrega 3 pide un vídeo de 2–3 minutos con el sistema funcionando, y el README lo anuncia en §0.4 y §2.4 como respaldo si la URL pública no responde el día de la revisión ([#96](https://github.com/kajirioji/AI4Devs-finalproject/issues/96)). Grabarlo a mano no se puede repetir y arriesga enseñar la contraseña. Un script de Playwright sobre la base local recién sembrada lo hace reproducible, con las mismas garantías de credenciales que la suite E2E.

## What Changes

- Script nuevo `e2e/video/demo-video.ts`, fuera de la suite y de la CI, con `pnpm video:demo` en la raíz y en `e2e/`. Abre su propio contexto de Chromium con `recordVideo` a 1280×720 y recorre el flujo feliz de `batch-clean` en ProviderA-USD:
  1. Login de `analyst`.
  2. New Reconciliation y subida del archivo.
  3. Confirmación del pareo de columnas.
  4. Análisis, con los contadores y las filas.
  5. Las ocho validaciones.
  6. Settlement Review con los fees prellenados y la fecha.
  7. Process.
  8. Settlement Summary con el amount payable y la descarga del merchant summary (CSV).
  9. Cambio a `payments` y **Mark as paid**.
- Pausas medidas para leer cada pantalla, y un rótulo corto en inglés por etapa en una franja inferior que la página deja libre. Los rótulos no tapan cifras.
- Credenciales como en la suite: la contraseña sale de `SEED_PASSWORD`, se escribe desde la página en un campo `type="password"` y nunca aparece en un rótulo, en la consola ni en la URL.
- Comprobaciones previas: la aplicación local responde y la base está recién sembrada. Si no, el script falla antes de grabar.
- Al terminar, con éxito o con fallo, limpieza por el API, como el `After` de la suite: retirar el pago, deshacer y cancelar. El número de batch 123 consumido y RAM-07 como canal principal no se pueden deshacer; está documentado que después hay que volver a sembrar.
- Conversión del `.webm` a `docs/demo/recon-tool-demo.mp4` con ffmpeg (H.264, sin audio, `faststart`, menos de 20 MB). El `.mp4` se versiona como binario (`.gitattributes`).
- La suite no se toca. El script reutiliza lo que ya existe en `e2e/support/` (`api.ts`, `cleanup.ts`, `expected.ts`) y `global-setup.ts`, y duplica en `e2e/video/` los pocos pasos de pantalla que necesita. `playwright.config.ts` sigue con `video: 'off'` y `trace: 'off'`.
- README: enlace al vídeo en §0.4 (Entrega 3), en §2.4 (evidencia de funcionamiento) y en §1.3; en §1.4 / §2.6, cómo regenerarlo.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `e2e`: se añaden dos requisitos del script del vídeo de la demo: recorrido y salida, y credenciales y base (local, recién sembrada y limpia al terminar).

## Impact

- `e2e/`: `video/demo-video.ts` y sus helpers de pantalla en `video/` (nuevos), `package.json` y `tsconfig.json` (`include` añade `video`). `steps/`, `features/`, `support/` y `playwright.config.ts` no cambian.
- `package.json` de la raíz: script `video:demo`.
- `docs/demo/recon-tool-demo.mp4` (nuevo, menos de 20 MB), `.gitattributes` (`*.mp4 binary`), `README.md`.
- Dependencia externa solo para quien regenera el vídeo: ffmpeg en el `PATH` o en `FFMPEG_PATH`. En Windows: `winget install Gyan.FFmpeg`.
- Sin cambios en la aplicación, el API, el esquema ni la CI. La congelación de las 18:00 no aplica.
- Base local: tras grabar quedan el batch 123 de ProviderA-USD consumido (intento `undone`), el import `cancelled` y RAM-07 principal. Antes de la suite o de Bruno hay que ejecutar `pnpm db:seed`.
