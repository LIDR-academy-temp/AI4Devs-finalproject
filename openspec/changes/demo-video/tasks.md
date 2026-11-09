# Tasks

## 1. Script de grabación (D1–D8)

- [ ] 1.1 Crear `e2e/video/steps.ts` con las copias de los pasos de pantalla de D3: `signIn` (más `setPassword` y `clearPassword`, y exige `type="password"` antes de escribir), `uploadFile`, `processBatch`, `downloadMerchantSummary`, `assertFreshSeed`, `cardNumber`, `amountPayable` y `headerValue`. Cada uno cita su step de origen. Solo importa de `support/` lo que ya existe (`api.ts`, `cleanup.ts`, `expected.ts`). Verificación: `pnpm --filter @recon/e2e typecheck` limpio con `video` en el `include` de `e2e/tsconfig.json`.
- [ ] 1.2 Crear `e2e/video/demo-video.ts` con:
  - Las comprobaciones previas: `globalSetup()`, `assertFreshSeed('batch-clean')` y ningún rótulo que contenga `SEED_PASSWORD`.
  - Un contexto con viewport y `recordVideo` a 1280×720 y `acceptDownloads`.
  - `addInitScript` para la franja de rótulos y el `padding-bottom`, más los helpers `caption`, `highlight` y `hold`.

  Verificación: typecheck limpio.
- [ ] 1.3 Escribir el recorrido de las nueve etapas con los rótulos de D4 y las comprobaciones contra `expectedOf('batch-clean')`:
  - Filas leídas y asociadas.
  - Fees prellenados.
  - Amount payable del pre-summary y del summary.
  - CSV del merchant summary.
  - `Paid` con `Paid by` `payments`.

  Al terminar, imprimir la marca de tiempo de cada etapa. Verificación: revisión contra el escenario "Grabación completa" del delta spec.
- [ ] 1.4 Añadir la limpieza en `finally`, después de cerrar el contexto: `cleanUp(created, apiClient(), 'Demo video cleanup')`, las notas impresas y el recordatorio de `pnpm db:seed`. Verificación: revisión contra el escenario "Limpieza al terminar".
- [ ] 1.5 Añadir la conversión con ffmpeg de D8:
  - ffmpeg desde `FFMPEG_PATH` o el `PATH`, con el mensaje de `winget` si falta.
  - El `.mp4` va primero a un archivo temporal.
  - El renombrado a `docs/demo/recon-tool-demo.mp4` solo ocurre si mide menos de 20 MB.
  - Informe de `ffprobe`.

  Verificación: con `FFMPEG_PATH` apuntando a un archivo inexistente, el script falla con el mensaje de instalación antes de abrir el navegador.
- [ ] 1.6 Añadir los scripts `video:demo` en `e2e/package.json` (`node video/demo-video.ts`) y en el `package.json` de la raíz (`pnpm --filter @recon/e2e video:demo`), y `*.mp4 binary` en `.gitattributes`. Verificación: `pnpm lint` y `pnpm typecheck` limpios; `git diff --stat origin/feature/entrega-3-MVP -- e2e/steps e2e/features e2e/support e2e/playwright.config.ts` vacío.
- [ ] 1.7 Commit: feat(e2e): script del vídeo de la demo con rótulos, limpieza y conversión a mp4

## 2. Grabación y ajuste (un solo turno de base; K siembra antes de cada pasada)

- [ ] 2.1 Pedir turno de base a K. Tras `! pnpm db:seed`, ejecutar `pnpm video:demo` con la salida redirigida al scratchpad. Verificación: termina sin error, imprime las marcas de tiempo y la limpieza no deja notas.
- [ ] 2.2 Revisar el `.mp4` fotograma a fotograma, con `ffmpeg -vf fps=1/5` a PNG en el scratchpad:
  - Cada rótulo está en su etapa.
  - Ninguna cifra queda bajo la franja.
  - La contraseña solo se ve como puntos.
  - No sale ningún nombre de sistema real.

  Ajustar las pausas hasta que dure entre 2:15 y 2:45. Verificación: `ffprobe` muestra la duración en rango, h264, 1280×720 y sin pista de audio. El archivo mide menos de 20 MB.
- [ ] 2.3 Solo si alguna espera del sistema supera 8 s en 2.1: anotar los tramos y recortarlos en la conversión (D5). Verificación: el tramo ya no aparece en el `.mp4` y la duración sigue en rango. Si no hace falta, marcarla como no aplicable con la medida.
- [ ] 2.4 Pasada final tras `! pnpm db:seed`, y otro `! pnpm db:seed` al terminar para dejar la base lista. Verificación: `docs/demo/recon-tool-demo.mp4` regenerado y comprobado como en 2.2. Cierre del turno de base.
- [ ] 2.5 Commit: docs(demo): vídeo de la demo de la Entrega 3

## 3. Documentación

- [ ] 3.1 README:
  - §0.4: sustituir "Previsto para la Entrega 3" por el enlace a `docs/demo/recon-tool-demo.mp4` y la duración.
  - §1.3: enlace en lugar de "El vídeo llega en la Entrega 3".
  - §2.4: enlace en la frase del respaldo con el vídeo ("evidencia de funcionamiento").
  - §2.6: cómo regenerarlo (`pnpm db:seed`, `pnpm dev`, `pnpm video:demo`, ffmpeg con `winget install Gyan.FFmpeg` y volver a sembrar después).

  Verificación: los enlaces relativos abren el archivo en GitHub, en la vista del PR.
- [ ] 3.2 Comentario de cabecera de `e2e/video/demo-video.ts` en inglés: qué graba, qué necesita, qué escribe en la base y qué deja. Verificación: revisión.
- [ ] 3.3 Commit: docs(readme): enlace al vídeo de la demo y cómo regenerarlo

## 4. Cierre

- [ ] 4.1 `pnpm lint`, `pnpm typecheck` y `pnpm --filter @recon/e2e test` en verde. `openspec validate demo-video` pasa sin avisos.
- [ ] 4.2 `/opsx:verify demo-video` y PR hacia `feature/entrega-3-MVP` con la plantilla, citando #96. Verificación: CI en verde, incluido el job `e2e` con la suite sin cambios.

## Workflow follow-up

- `/review-diff` en una sesión distinta, a petición de K.
- `/opsx:archive demo-video` tras el merge.
