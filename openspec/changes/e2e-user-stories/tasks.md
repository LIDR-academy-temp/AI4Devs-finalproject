# Tasks — e2e-user-stories

En la rama `feat/e2e-user-stories` (#38), con PR hacia `feature/entrega-3-MVP`.

- **Archivos:**
  - `e2e/features/`, `e2e/steps/` y `e2e/support/`;
  - `support` en el `include` de `e2e/tsconfig.json` (D11);
  - los dos párrafos de README §2.6 (D10).

  No se tocan `playwright.config.ts`, `global-setup.ts`, `.github/workflows/ci.yml` (son de A), el frontend, el backend ni la colección Bruno.
- **Comprobación sin base:**
  - `pnpm --filter @recon/e2e exec bddgen`;
  - `pnpm --filter e2e typecheck`;
  - `pnpm lint`;
  - `node --test` de los tests de `e2e/support/`.
- **Pasadas contra la base:** solo con turno de base de la persona, que siembra antes de cada una, y `pnpm dev` levantado desde esta carpeta.

## 1. Pasos comunes (D4)

- [x] 1.1 Mover el fixture `test` a `steps/fixtures.ts`, con `importIds` y `batchIds`. Mover a `steps/common.steps.ts` los pasos del smoke que reutilizan los escenarios nuevos: sesión, nueva conciliación, subida, pareo, análisis, cancelar y estado. Añadir `Given the {string} user is signed in` (con `the analyst is signed in` como el mismo paso) y `When they sign out`. `features/import-smoke.feature` no cambia. Verificar:
  - `bddgen`, el typecheck y `pnpm lint`;
  - que `playwright test --list` sigue dando el mismo escenario del smoke.
- [x] 1.2 Commit: `refactor(e2e): pasos comunes del smoke compartidos para la suite de las historias`

## 2. Oráculos y limpieza, test primero (D3, D6, D11)

- [ ] 2.1 Tests primero, en `support/expected.test.ts` y `support/cleanup.test.ts`, con `node:test`. Añadir `support` al `include` de `e2e/tsconfig.json`.
  - `expected`: lee `batch-clean` (783 filas leídas, `proposedBatchNo`, `summary.amountPayable`) comparando con el JSON leído aparte, no con números escritos; una muestra inexistente falla con su ruta; `formatAmount("33771.3600")` es `33,771.3600`, y también con negativos, ceros y miles.
  - `cleanup`, la decisión según el estado: `paid` → `unpay` como `payments` y después `undo` como `analyst`; `processed` → `undo`; `undone` → nada; import `uploaded`, `mapped`, `analyzed` o `validated` → `cancel`; `cancelled` o `processed` → nada. Primero los intentos y después los imports.
  - `cleanup`, la ejecución con un cliente falso: los motivos, el orden de las llamadas, un fallo que no detiene las demás acciones y que se devuelve como anotación de una línea, sin cuerpo de petición ni contraseña.

  Verificar que fallan
- [ ] 2.2 Commit: `test(e2e): oráculos desde expected.json y limpieza de la suite de las historias`
- [ ] 2.3 Implementar `support/expected.ts` y `support/cleanup.ts` (cliente del API con `POST /auth/login` y `SEED_PASSWORD`, tokens solo en memoria), y el `After` de `steps/fixtures.ts` que lo usa (sustituye al del smoke). Verificar con `node --test`, el typecheck y `pnpm lint`. Romper a propósito una vez el orden intento → import y una vez `formatAmount`; comprobar que los tests fallan y restaurar con `cp` desde el scratchpad
- [ ] 2.4 Commit: `test(e2e): lectura de los oráculos y limpieza por el API para la suite de las historias`

## 3. Escenarios sin procesar: provider_mismatch y batch sin filas asociadas (D1)

- [ ] 3.1 Escribir `features/user-stories.feature`:
  - cabecera con lo que deja una pasada (D9), la necesidad de sembrar (D2) y la dependencia de `workers: 1` y del orden alfabético de los archivos;
  - los escenarios 2 y 4 (spec "E2E de provider_mismatch" y "E2E del batch sin filas asociadas"), con pasos que nombran la muestra y no números;
  - los escenarios 1 y 3 como `@skip` hasta el grupo 4.

  Pasos nuevos en `steps/validations.steps.ts`: ejecutar las validaciones, el resultado de una validación contra `expected.json`, **Continue** deshabilitado con su motivo, **Cancel and reprocess**, el desglose y el aviso de cuenta equivocada, y **Start a new import**. Verificar con `bddgen`, el typecheck y `pnpm lint`
- [ ] 3.2 **Con turno de base, sembrada por la persona:** `pnpm test:e2e --grep` de los dos escenarios, en verde, con los dos imports `cancelled`. Romper a propósito una vez el oráculo (por ejemplo, `affectedIds` de otra muestra), comprobar que el escenario falla con un mensaje claro y que el `After` cancela el import, y restaurar con `cp`
- [ ] 3.3 Commit: `test(e2e): provider_mismatch y batch sin filas asociadas en la suite de las historias (#38)`

## 4. Escenarios que procesan: flujo feliz y deshacer y reprocesar (D2, D5, D6)

- [ ] 4.1 Pasos nuevos en `steps/settlement.steps.ts`:
  - la comprobación de base recién sembrada por el API (RAM-07 sin cuenta y `proposedBatchNo`), que falla con `Run pnpm db:seed first`;
  - en Settlement Review: número propuesto, fees prellenados, resumen previo, casilla de canales con RAM-07 (y la condicional del escenario 3, comentada) y **Process batch N**;
  - en Settlement Summary: estado, `amountPayable` y la descarga del summary (D5);
  - **Mark as paid** visible o no según el usuario, **Unpay…** y **Undo batch…** con motivo, **Go to Analysis & Validations** y el número propuesto con `attempt 2`.

  Quitar los `@skip` y poner `@timeout:300000` en los escenarios 1 y 3. Verificar con `bddgen`, el typecheck y `pnpm lint`
- [ ] 4.2 **Con turno de base, sembrada por la persona:** `pnpm test:e2e --grep` de los dos escenarios, en verde. Romper a propósito una vez la comparación del amount payable del summary descargado, comprobar que falla y que el `After` deja el intento `undone` y el import `cancelled`, y restaurar con `cp`
- [ ] 4.3 Commit: `test(e2e): flujo feliz de HU1 a HU3 y deshacer y reprocesar en la suite de las historias (#38)`

## 5. Pasada entera, medidas y README (D7, D8, D9, D10)

- [ ] 5.1 **Con turno de base, sembrada por la persona:**
  - `playwright test --list`: el smoke primero, y el flujo feliz primero dentro de `user-stories`;
  - `pnpm test:e2e` entero, en verde, con la duración de cada escenario y la total;
  - comprobar que no queda ningún import abierto ni intento `processed` o `paid` creado por la suite;
  - buscar `SEED_PASSWORD` en la salida y en `e2e/playwright-report/` sin imprimirlo: 0 coincidencias;
  - repetir sin sembrar y comprobar que el flujo feliz falla en su primer paso con `Run pnpm db:seed first`.

  Si la suite pasa de 5 minutos, avisar
- [ ] 5.2 README §2.6: los párrafos "End-to-end (Playwright)" (los escenarios reales y `batch-split`) y del smoke, con la duración medida. No tocar la tabla de comandos, §1.4, "En pipeline" ni la frase de que el E2E no corre en la CI. Commit: `docs: estrategia E2E de README §2.6 con la suite de las historias (#38)`

## 6. PR

- [ ] 6.1 Push y PR hacia `feature/entrega-3-MVP` con la plantilla. Incluir:
  - "Closes #38";
  - la duración por escenario;
  - lo que queda tras una pasada (D9);
  - lo que necesita el job de A: base recién sembrada, un worker, `SEED_PASSWORD` y Chromium;
  - la propuesta de un script `test` en `e2e/package.json` para los tests de `support/`.

  Vigilar el CI con `gh --jq` hasta que esté verde

## Workflow follow-up

- Review-diff en una sesión nueva.
- `/opsx:archive e2e-user-stories` después del merge.
