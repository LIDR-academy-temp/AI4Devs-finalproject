# Proposal

## Why

README §2.6 pide un E2E del flujo completo en Gherkin (login → cuenta → importar → confirmar pareo → revisar validaciones → procesar → descargar el summary → marcar pagado), con el flujo feliz, "cancelar y reprocesar" y `provider_mismatch`. Hoy solo existe el smoke de HU1, que llega hasta el análisis (`e2e/features/import-smoke.feature`). HU2 y HU3 no tienen ninguna prueba en el navegador. Es el #38, y A monta en paralelo el job de CI que va a ejecutar la suite (#40).

## What Changes

Cuatro escenarios nuevos en Gherkin, con playwright-bdd, contra la aplicación y el API reales. Con el smoke, la suite queda en cinco:

- **Flujo feliz de HU1 a HU3** con `batch-clean` en ProviderA-USD.
  - `analyst` importa, confirma la propuesta de pareo, analiza y ejecuta las validaciones (las ocho sin hallazgos, con su resultado y los rangos), continúa, y procesa aceptando la asociación de RAM-07.
  - Después descarga el **Merchant summary**.
  - `payments` marca el batch como pagado (`analyst` procesa pero no paga, README §2.5).
  - Limpieza: `payments` retira el pago, `analyst` deshace y cancela el import.
- **`provider_mismatch`** con `batch-blocked` en ProviderB-Main: **Continue** deshabilitado con su motivo, y el import se cancela con **Cancel and reprocess**.
- **Deshacer y reprocesar con el mismo número**, con `batch-split` (los dos archivos en un import):
  - procesar, deshacer con motivo, volver a validar;
  - Settlement Review propone el mismo número con el intento 2;
  - procesar, deshacer de nuevo y cancelar.
- **Batch sin filas asociadas** con `batch-wrong-account` en ProviderA-USD: el desglose por motivo, el aviso de cuenta equivocada y la casilla **Continue with batch fees only** sin marcar. **Continue** queda deshabilitado, y el import se cancela con **Cancel and reprocess**, que es el "cancelar y reprocesar" del README.

Cómo se construyen:

- **Cifras:** todas salen de los `expected.json` de `data/samples/` (filas, validaciones, totales, `amountPayable`, fees prellenados, IDs afectados). Ningún paso lleva un número escrito.
- **Pasos comunes:** el inicio de sesión, la subida, el pareo, el análisis y la cancelación pasan del smoke a pasos compartidos, con el usuario como parámetro. El texto del smoke no cambia.
- **Limpieza ante un fallo:** cada escenario deja la base como la encontró en lo posible. Si un escenario falla a mitad, un hook `After` deshace por el API lo que dejó abierto (retirar el pago, deshacer, cancelar).
- **Lo que no se puede deshacer** queda documentado. Cada pasada consume números de batch, deja RAM-07 como canal principal de ProviderA-USD y deja intentos `undone` e imports `cancelled`. Por eso la suite entera parte de una base recién sembrada, como en la CI.

Fuera de alcance:
- `playwright.config.ts`, `global-setup.ts` y `.github/workflows/ci.yml` (son de A, que monta el job).
- El backend, el frontend, el contrato y la colección Bruno.
- Reprocesar `batch-wrong-account` en la cuenta correcta, porque no hay `expected.json` para ese caso.

## Capabilities

### New Capabilities
- `e2e`: la suite E2E de las historias de usuario. Cubre qué escenarios recorre, con qué muestras y oráculos, cómo deja la base y qué garantías da sobre las credenciales y el informe.

### Modified Capabilities

Ninguna. El requisito "Smoke E2E de la importación" de `import` no cambia: el escenario sigue igual y solo se reparten sus pasos.

## Impact

- **Nuevos:** `e2e/features/user-stories.feature`; `e2e/steps/` (pasos comunes, de validaciones y de settlement, fixtures y hook de limpieza); un helper `e2e/support/` para leer los `expected.json` y para la limpieza por el API.
- **Modificado:** `e2e/steps/import-smoke.steps.ts`, cuyos pasos comunes se mueven a los compartidos sin cambiar su comportamiento.
- **CI (A):** la suite necesita una base recién sembrada y un solo worker, como ya está configurado. No hace falta tocar `playwright.config.ts`: los escenarios largos alargan su timeout con la etiqueta `@timeout` de playwright-bdd.
- **Duración** de la suite entera, con el smoke: se estimaron entre 5 y 8 minutos y se midió 1,0 min en local y 26,5 s en el job `e2e` de la CI (design D7).
- Sin cambios de API, esquema, migraciones ni seed.
