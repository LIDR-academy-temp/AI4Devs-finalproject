# Design

## Context

Ver proposal.md. Estado actual, leído en el código:

- **Lo que hay en `e2e/`:**
  - Un solo escenario: `features/import-smoke.feature`, con sus pasos en `steps/import-smoke.steps.ts`.
  - Ese archivo de pasos tiene el inicio de sesión de `analyst` (contraseña escrita desde la página y campo vaciado en un `finally`), la subida (que guarda el `importId` de la respuesta del `POST`), el pareo, el análisis, la cancelación y un `After` que cancela el import si el escenario falla.
- **Configuración** (`playwright.config.ts` y `global-setup.ts`, de A):
  - un worker, `fullyParallel: false`, `timeout: 120_000` y `actionTimeout: 15_000`;
  - sin traza ni vídeo, y captura solo al fallar;
  - `SEED_PASSWORD` se lee del `.env` raíz, y `global-setup` falla si la aplicación o el API no responden.
- **Usuarios:** los usuarios sembrados comparten `SEED_PASSWORD` (`backend/prisma/seed.ts`). `analyst` tiene `settlement.process` pero no `payment.process`; `payments`, al revés (spec de settlement, "Pantalla Settlement Summary: acciones según permiso y estado").
- **Muestras y oráculos:**
  - `batch-clean` y `batch-split` dan el mismo resultado (`sameResultAs`), con `proposedBatchNo = 123` y `amountPayable = 33771.3600`. `batch-split` son los dos archivos de la ruta de §2.6: el README los nombra `provider-a-batch-118-part1/-part2`, un nombre que ya no existe.
  - `batch-blocked` trae `provider_mismatch: 1` y `affectedIds`.
  - `batch-wrong-account` trae `unmatchedByReason`, `likelyWrongAccount` y `requiresEmptyBatchConfirmation`.
- **Lo que no se deshace** (specs de settlement y accounts):
  - Deshacer no revierte la cuenta principal de un canal.
  - El siguiente número de batch es el mayor de la cuenta en cualquier estado + 1.
  - `undone` es final.
  - Los canales son de solo lectura, sin forma de desasignar RAM-07.
  - Un intento `undone` no cuenta como batch anterior en las validaciones, así que las cifras de una segunda pasada no cambian por él.

## Goals / Non-Goals

**Goals:**
- Cubrir HU1–HU3 en el navegador con los tres escenarios que pide §2.6 (flujo feliz, `provider_mismatch` y cancelar y reprocesar), más deshacer y reprocesar (HU3 CA1 y CA8), en cuatro escenarios nuevos.
- Que la suite entera corra en la CI de A en un tiempo razonable, sin tocar su configuración.
- Que ningún escenario deje imports abiertos ni intentos `processed` o `paid`, tampoco cuando falla.

**Non-Goals:**
- Repetir lo que ya prueban las capas de abajo: los 409 de las acciones, la concurrencia, los permisos de cada rol, el contenido entero de los CSV.
- Cambiar `playwright.config.ts`, `global-setup.ts`, `.github/workflows/ci.yml`, el frontend o el backend.
- Una suite repetible sin volver a sembrar (ver D2).

## Decisions

**D1. Cuatro escenarios nuevos, en un solo `features/user-stories.feature`.**

| # | Escenario | Muestra y cuenta | Usuarios | Cubre |
|---|---|---|---|---|
| 1 | Flujo feliz | `batch-clean`, ProviderA-USD | `analyst`, `payments` | HU1 CA6 (contadores), 7 · HU2 CA1 (resultado, hallazgos, si bloquea y rangos), 6 · HU3 CA1, 2 (prellenados), 5 (también por el API), 6 (summary), 7 |
| 2 | `provider_mismatch` | `batch-blocked`, ProviderB-Main | `analyst` | HU2 CA1 (solo `provider_mismatch`: resultado, hallazgos y si bloquea; su oráculo no trae las otras siete), 5, 8 |
| 3 | Deshacer y reprocesar | `batch-split` (2 archivos), ProviderA-USD | `analyst` | Un import con varios archivos · HU3 CA1, 8 |
| 4 | Batch sin filas asociadas | `batch-wrong-account`, ProviderA-USD | `analyst` | HU2 CA8 (cancelar y reprocesar) · guardarraíles de #92 y #131 |

- **Escenario 3 con `batch-split`:** cubre la subida de varios archivos a un import, que el flujo feliz no toca, con las mismas cifras de oráculo.
- **Fuera de la suite:** las hojas y filas por archivo de HU1 CA1, y la propuesta y el cambio del pareo de HU1 CA3 y CA4. La suite confirma la propuesta tal cual, sin comprobarla; eso lo cubren los tests de pantalla y la colección Bruno.
- **Escenario 4:** es el "cancelar y reprocesar" de §2.6. Llega hasta **Start a new import**, que abre New Reconciliation con la cuenta elegida, y no sube el archivo a la cuenta correcta, porque no hay `expected.json` para ese caso.
- **Un solo archivo:** con un worker, los escenarios de un archivo corren en orden y los archivos van por orden alfabético. `import-smoke` corre antes que `user-stories`, y dentro de este el flujo feliz es el primero (ver D2). Se comprueba con `playwright test --list`.

**D2. La suite parte de una base recién sembrada.** Procesar `batch-clean` asigna RAM-07 a ProviderA-USD para siempre, porque deshacer no revierte la cuenta principal. A partir de ahí:
- el smoke deja de ver `RAM-07 is not assigned yet`;
- el flujo feliz deja de ver RAM-07 entre los canales a asociar;
- `proposedBatchNo` deja de ser 123.

Así que cada pasada entera necesita `pnpm db:seed` antes, como en la CI. El primer paso del flujo feliz lo comprueba por el API, antes de subir nada: RAM-07 sigue en `GET /channels?unassigned=true` y el siguiente número de ProviderA-USD es `expected.proposedBatchNo`. Si algo falla, el escenario falla con `Run pnpm db:seed first`. Se descarta hacer los escenarios tolerantes ("si aparece RAM-07, acéptalo"), porque un paso que comprueba una cosa u otra según el estado no comprueba nada.

Los escenarios 2 y 4 no procesan, así que se pueden repetir sin sembrar con `--grep`. El 3 también, salvo por el número de batch, que se lee de la pantalla. Como el 3 procesa después del flujo feliz, RAM-07 ya es de ProviderA-USD y Settlement Review no pide asociar canales. Si se ejecuta solo sobre una base recién sembrada, sí lo pide: el paso de procesar marca la casilla de canales si está, y lo dice en su comentario. Es el único paso condicional de la suite, y no comprueba nada sobre los canales.

El escenario 3 tampoco compara sus validaciones con el oráculo. El de `batch-split` vale para el batch 123 sobre una base recién sembrada, pero en la suite el flujo feliz deja el 123 `undone` y `batch-split` va al siguiente número. Como un intento deshecho no cuenta como batch anterior, `missing_previous_to_batch` encuentra sus transacciones como faltantes previas: 633 en la primera pasada, que es lo que debe pasar. Las validaciones contra el oráculo las comprueba el flujo feliz. El escenario 3 comprueba filas, número, intento y amount payable, que no dependen de eso.

**D3. Cifras desde `expected.json`.** Un helper `e2e/support/expected.ts` lee `data/samples/<muestra>/expected.json` con un tipo mínimo de lo que se usa. Los pasos nombran la muestra (`Then they see the rows of "batch-clean"`), nunca un número. Los importes se comparan formateados como en la pantalla (agrupación en inglés y cuatro decimales, como `formatDecimal` del frontend) y sin formato en el CSV. El número de batch:
- en el flujo feliz es `expected.proposedBatchNo`, garantizado por D2;
- en el escenario 3 se lee del primer intento y se compara con el propuesto en el segundo (`<n> · attempt 2`).

**D4. Pasos comunes y usuarios.** Los pasos del smoke que reutilizan los escenarios nuevos (sesión, nueva conciliación, subida, pareo, análisis, cancelar, estado) pasan a `steps/common.steps.ts`, con el fixture en `steps/fixtures.ts`. El texto del smoke se mantiene. Se añaden dos pasos:
- `Given the {string} user is signed in`, con el mismo mecanismo de contraseña;
- `When they sign out`.

`the analyst is signed in` queda como el mismo paso con `analyst`. El cambio de `analyst` a `payments` en el flujo feliz se hace en la misma página: **Sign out** y entrar como `payments` en el Settlement Summary del intento, por su URL. Los pasos nuevos de validaciones y settlement van en `steps/validations.steps.ts` y `steps/settlement.steps.ts`. Los selectores son roles y textos accesibles, los de `strings.ts` de cada feature, como en el smoke.

**D5. Descarga del summary.** `page.waitForEvent('download')` al pulsar **Merchant summary**. Se comprueba que `suggestedFilename()` es `ProviderA-USD_B<n>_A1_summary.csv`, se lee el archivo descargado y se comprueba la fila `Amount payable` contra `expected.summary.amountPayable`. Después se comprueba que la cabecera sigue `Processed · pending payment` (HU3 CA6). El archivo se queda en la carpeta temporal de Playwright, que se borra al cerrar el contexto: no se guarda en el repositorio ni en el informe.

**D6. Limpieza: primero con los pasos del escenario, después con un `After` por el API.**
- **En verde:** cada escenario termina con su limpieza a la vista, como pasos: `payments` retira el pago con motivo, `analyst` deshace con motivo y cancela el import. Así la limpieza también se prueba.
- **Si falla a mitad:** el fixture guarda los `importId` y los `batchId` de la respuesta del `POST` que crea el import o procesa el batch (`createdBy` de `support/cleanup.ts`), así que un intento queda registrado aunque el Settlement Summary no llegue a abrirse. El `After` los recorre por el API: `unpay` como `payments` si está `paid`, `undo` como `analyst` si está `processed` y `cancel` si el import sigue abierto, cada uno con el motivo `E2E cleanup after a failure`.
- **Sesión del `After`:** inicia sesión con `POST /auth/login`, y el token vive solo en memoria.
- **Errores del `After`:** un error de la limpieza se anota en el test (`annotations`) con su primera línea, sin el cuerpo de la petición, como el smoke. No sustituye al error original.
- **Por qué por el API:** limpiar por la pantalla tras un fallo depende de la pantalla que falló.

**D7. Duración y timeouts.** Se estimaron de 5 a 8 minutos con un worker. Medido, con la base recién sembrada:

| Escenario | Estimación | Local (5.1) | CI, job `e2e` (#149) | Tras el review-diff: local / CI (run 42433370520) |
|---|---|---|---|---|
| Smoke | 30–45 s | 7,7 s | 2,8 s | 7,4 s / 3,6 s |
| Flujo feliz | 90–150 s | 21,3 s | 7,4 s | 16,3 s / 8,5 s |
| Deshacer y reprocesar | 120–200 s | 22,4 s | 9,5 s | 14,3 s / 9,2 s |
| `provider_mismatch` | 20–40 s | 4,6 s | 1,9 s | 3,4 s / 2,2 s |
| Sin filas asociadas | 20–40 s | 5,0 s | 1,9 s | 3,7 s / 2,1 s |
| **Total** | 5–8 min | 1,0 min | 26,5 s (job entero: 5 min 14 s) | 46,7 s / 27,2 s (job entero: 5 min 34 s) |

La suite queda muy por debajo de los 5 minutos del gate, así que el job `e2e` no se parte. Los escenarios 1 y 3 conservan la etiqueta `@timeout:300000` de playwright-bdd como margen en máquinas más lentas, sin tocar `playwright.config.ts`.

**D8. Credenciales y evidencia.** Igual que el smoke:
- la contraseña sale solo de `process.env.SEED_PASSWORD`, nunca de un argumento de paso;
- se escribe desde la página y el campo se vacía en un `finally`;
- no hay traza ni vídeo, por la configuración de A.

Tras la primera pasada se busca el valor de `SEED_PASSWORD` en la salida y en `e2e/playwright-report/`, sin imprimirlo: `rg -c` con la variable y solo el número de coincidencias. Tiene que dar 0.

**D9. Lo que queda tras una pasada verde**, documentado en la cabecera del `.feature` y en el PR:
- dos números de batch consumidos en ProviderA-USD (123 y 124 tras sembrar), con sus intentos `undone`: uno en el flujo feliz y dos intentos del mismo número en el escenario 3;
- cuatro imports `cancelled` más el del smoke;
- RAM-07 como canal principal de ProviderA-USD;
- la auditoría de cada acción.

Nada queda `processed` ni `paid`. Igual que la colección Bruno, conviene sembrar de nuevo antes de los tests de integración locales.

## Risks / Trade-offs

- [El orden de los escenarios importa (D1, D2).] → Un solo `.feature`, un worker de la configuración de A y una comprobación con `--list`. Si A cambia a varios workers, el flujo feliz y el escenario 3 se pisan en ProviderA-USD: se lo digo al entregar.
- [La suite no se repite sin sembrar (D2).] → En la CI siempre se siembra. En local, el primer paso falla pronto y dice cómo arreglarlo.
- [Los textos de la interfaz pueden cambiar.] → Los selectores son los de `strings.ts`, y el error de Playwright nombra el rol y el texto que no encontró.
- [La duración depende de la máquina.] → Medida en local por escenario y en la CI de A, con aviso por encima de 5 minutos.
- [Los tests de `support/` tienen que correr en la CI.] → `e2e/package.json` tiene un script `test` (`node --test "support/*.test.ts"`). El job `check` lo ejecuta con `pnpm test` (`pnpm -r test`) sin tocar `ci.yml`, con el Node 22 de `.node-version`, que ya quita los tipos.

## Decisiones del gate

1. D2 aprobado: la suite exige una base recién sembrada, y el primer paso lo comprueba con `Run pnpm db:seed first`. Se mantiene la cobertura de HU3 CA5. El paso condicional de la casilla de canales del escenario 3 se acepta con su comentario.
2. **D10. README §2.6, solo la estrategia de testing.** Este change cambia dos párrafos:
   - "End-to-end (Playwright)": los escenarios reales y `batch-split` en lugar de `provider-a-batch-118-*`;
   - el del smoke, que pasa a ser parte de la suite.

   El párrafo del smoke incluye su "Todavía no corre en CI…", que deja de ser verdad con el job e2e de la #147. La tabla de comandos, §1.4 y "En pipeline" los cambia A con el job. La #147 se trae a la rama con un merge antes de abrir el PR, sin rebase.
3. A mantiene `workers: 1`. La cabecera del `.feature` dice que la suite depende de eso y del orden alfabético de los archivos (D1).
4. Duración: se mide por escenario en la primera pasada entera. Si la suite pasa de 5 minutos, se avisa igualmente, porque A partirá el job en dos (sustituye el umbral de 10 minutos de D7).
5. **D11. Test primero en la lógica propia:** `support/expected.ts` (lectura del oráculo y `formatAmount`) y la limpieza de `support/cleanup.ts` (qué acción toca según el estado, en qué orden y con qué usuario).
   - Se prueban con el runner de Node (`node --test`), sin dependencias nuevas, con rotura deliberada. El script `test` de `e2e/package.json` los ejecuta, y por tanto también `pnpm test` del job `check`.
   - La limpieza separa la decisión (una función pura del estado) de las llamadas al API, que reciben un cliente inyectable.
   - Los tests van en `e2e/support/*.test.ts`, fuera de `steps/`, para que `bddgen` no los cargue como pasos.
   - Se añade `support` al `include` de `e2e/tsconfig.json` para que el typecheck los cubra.
