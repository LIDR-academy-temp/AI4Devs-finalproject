# Tasks — web-settlement

Issue #13 (HU3, pantallas Settlement Review y Settlement Summary). Rama: `feat/web-settlement`, creada desde `feature/entrega-2-MVP`. Solo frontend: sin cambios de backend, API, esquema, OpenAPI ni colección Bruno. El contrato es el de "Contrato para #13" y "Contrato para #12" en `settlement-process/design.md` (rama `feat/settlement-process`, que se lee solo con `git show`). Si una tarea descubre que le falta algo, para y lo anota en el proposal ("Huecos del contrato") en lugar de tocar el backend o inventar un campo. Referencias: `specs/settlement/spec.md` y `specs/validation/spec.md` (qué) y `design.md` D1–D17 (cómo).

Orden test-first en cada grupo: los tests se escriben y se ven fallar (rojo) antes del código. En verde, se rompe el código a propósito una vez para comprobar que el test lo detecta, y se restaura. Tests de componentes con MSW (`renderApp`, `seedImport`, `seedValidationRun` y las ayudas del falso de settlements). **Mientras #11 esté en curso no se ejecutan integración ni E2E contra la base**, porque se comparte. Textos de interfaz en inglés y en `features/settlements/strings.ts`. Tipos y llamadas del contrato solo en `features/settlements/contract.ts`, y el API falso solo en `test/msw/settlements.ts` (D2). Ningún importe pasa por `number`.

## 1. Contrato aislado y API falso de settlement (D2, D15)

- [ ] 1.1 Test (rojo) `test/msw/settlements.test.ts` sobre el falso, sin pantallas, **solo de lo que el falso modela** (D15):
  - con el import de `batch-clean` `validated` y su corrida revisada, como `analyst`: `GET batch-number/next?importId=` → `{ batchNo: 123, attemptNo: 1, reason: 'next' }`; `GET /accounts/<ProviderA-USD>/fees?transactional=false&asOf=2026-10-24` → `Chargeback over 1%` con `fixedAmount = null` y la petición registrada con su `asOf`; `GET /fee-types` → los tipos del seed con `allowsFreeAmount`;
  - `POST settlements/preview` → la fixture base con `batchNo` y `batchFees` copiados del cuerpo, y `otherFeeAmt`, `amountPayable` y `payableBreakdown` **iguales a los de la fixture** aunque los fees enviados cambien;
  - un número sembrado como vigente → `batchNoAvailable = false` en la vista previa y `409 batch_no_taken` con `details` al procesar;
  - sin `confirmChannelAssignment` con una fixture que exige confirmación → `409 channel_assignment_not_confirmed` con los canales de la fixture;
  - `POST settlements` → `201` con `batchId` nuevo, `approvedBy` = quien llama, `processedAt` `AuditInstant`, el import en `processed` con `currentBatchId` en `importRecord(id)`; un segundo `POST` → `409 import_not_validated { status: 'processed' }`; `GET /settlements/<batchId>` devuelve el intento creado y uno desconocido → `404`;
  - `runId` distinto del vigente de `validations.ts` → `409 validation_run_superseded`;
  - `scriptPreview` y `respondNextSettlement` devuelven lo guionizado (`400 batch_fee_invalid { index, reason }`, también con `description_required`, y una vista previa cuyo `amountPayable` no cuadra); sin guion, una descripción vacía no provoca ningún `400` (el falso no lo deduce);
  - `viewer` → `403` en vista previa y procesar; un import de `ProviderC-Alt` → `404`;
  - las etiquetas de `payableBreakdown` de las fixtures coinciden con las de `features/settlements/strings.ts` (D7);
  - `holdNextSettlement` y `failNextSettlement` retienen o fallan una petición a voluntad
- [ ] 1.2 Implementar `features/settlements/contract.ts`:
  - tipos copiados de "Contrato para #13", con dinero y tasas como `string`, cada fecha como `BusinessDate` o `AuditInstant` (D2) y un comentario por campo;
  - `details` de los seis errores;
  - las siete llamadas con `createAuthFetch(session)` y `apiOrigin()`, lanzando `ApiError`, marcando las fechas al recibir y aceptando `signal` en la vista previa;
  - cabecera que lo marca como temporal hasta #11/#12.

  Implementar `test/msw/settlements.ts`: fixtures (vista previa y vista base de `batch-clean`, variante de ProviderB-Main, `AccountFee` y `FeeTypeView` del seed), almacén de intentos y de números vigentes por cuenta, guion por escenario, transiciones escritas en `importRecord(id)`, registro de peticiones. Registrarlo en `handlers.ts` y reiniciarlo con `resetDb`. Verificar 1.1 en verde y los tests existentes en verde (`pnpm --filter @recon/frontend test`). Romper a propósito la copia de `batchNo` del cuerpo y ver fallar 1.1; restaurar
- [ ] 1.3 Comprobar con `rg` que `test/msw/settlements.ts` no suma ni multiplica importes ni lee `amount` de los fees enviados para componer cifras, y que ninguna ruta `/settlements`, `/batch-number`, `/fee-types` ni `/accounts/:id/fees` aparece fuera de `contract.ts` y del falso; anotarlo en el PR
- [ ] 1.4 Commit: `test(frontend): API falso de settlement guionizado sobre el contrato de #11 y #12` y `feat(frontend): contrato de settlement aislado y API falso para los tests`

## 2. Formulario de Settlement Review como funciones puras (D4)

- [ ] 2.1 Test (rojo) `features/settlements/review-form.test.ts`:
  - `batchNo`: `123` válido; `0`, `-1`, `12a`, `1.5` y vacío → `Enter a positive whole number.`;
  - `settlementDate`: `2026-10-24` válida; vacía → `Choose the settlement date.`; `2026-02-30` y `24/10/2026` no válidas;
  - `amount`: `25.0000`, `-42.5000`, `30`, `123456789012345.1234` válidos; `12.34567`, `0`, `-0.0000`, `1,5`, `1e3` y vacío → `Enter an amount with up to 4 decimals, other than zero.`;
  - descripción obligatoria solo en filas `free`; fila `file` con `feeTypeId = null` sin tipo → no válida, con el motivo de tipo desconocido;
  - `toRequest` con `runId`: `batchNo` entero, `settlementDate` siempre, `batchFees` en el orden de las filas con `source` `file` o `manual`, `feeId` del preestablecido o `null`, importes **idénticos** al texto escrito y `confirmChannelAssignment` solo si se pide y está marcada
- [ ] 2.2 Implementar `features/settlements/review-form.ts` (esquema Zod y `toRequest`) sin `Number`, `parseFloat` ni `z.coerce` sobre importes; verificar 2.1 en verde, `pnpm typecheck` y `pnpm lint`; romper a propósito el importe con `Number(amount).toString()` y ver fallar el caso de 15 dígitos; restaurar
- [ ] 2.3 Commit: `test(frontend): esquema y cuerpo del formulario de Settlement Review` y `feat(frontend): formulario de Settlement Review como funciones puras sobre texto`

## 3. Rutas, acceso por estado y enlaces desde Analysis (D1, D13)

- [ ] 3.1 Test (rojo) `features/settlements/access.test.tsx` con "acceso y estado del import": `viewer` en `/imports/<id>/settlement-review` → `You don't have access to this page` y ninguna petición a `batch-number/next`, `fees`, `fee-types` ni `settlements/preview`; import `analyzed` → texto y enlace a Analysis, sin formulario ni vista previa; `processed` con `currentBatchId` → **View settlement summary** a `/settlements/<batchId>`; `cancelled` → su texto; migas `Dashboard › Reconciliation › Settlement Review`
- [ ] 3.2 Test (rojo) en `features/validations/decision.test.tsx` y `read-only.test.tsx` (deltas de `validation`): `validated` como `analyst` → enlace **Settlement Review** que lleva a la pantalla; como `viewer` → `Reviewed by …` sin enlace ni botón; `processed` con `currentBatchId` → **View settlement summary**; sustituir el test de `Settlement Review is not available yet.` por estos (escenario retirado)
- [ ] 3.3 Implementar las dos rutas en `app/router.tsx` (`requires: 'settlement.process'` en Review; `crumbs` en las dos), `SettlementReviewPage` con el reparto por estado y las consultas `enabled` solo con `validated`, `SettlementSummaryPage` mínima (cabecera y `404`), `settlementReviewRoute(importId)` en `features/validations/next-step.ts` en lugar de la constante, y `DecisionBar` (enlace solo con `canProcess`, enlace al Summary en `processed`); verificar 3.1, 3.2 y los tests existentes de `validations` en verde; romper a propósito el `requires` de la ruta y ver fallar el caso de `viewer`; restaurar
- [ ] 3.4 Commit: `test(frontend): acceso a Settlement Review por permiso y estado del import` y `feat(frontend): rutas de Settlement Review y Settlement Summary y enlace desde Analysis`

## 4. Número de batch, fecha y resumen previo (D6, D7, D8, D14)

- [ ] 4.1 Test (rojo) `features/settlements/batch-number.test.tsx` con "número de batch propuesto y editable" y "número de batch en uso": `123` y `Proposed: 123 · attempt 1`; `reprocess` → `118` con el texto del intento deshecho; `0` → error sin vista previa; `batchNoAvailable = false` → error en el campo y motivo de Process; `409 batch_no_taken` al procesar → error en el campo, sigue en la pantalla con lo escrito y se vuelve a pedir la vista previa
- [ ] 4.2 Test (rojo) `features/settlements/preview.test.tsx` con "resumen previo", "resumen previo al día" y "fecha de liquidación", con temporizadores falsos (D15):
  - al abrir, **Settlement date** vacía con su motivo, `Choose the settlement date to see the pre-summary.`, Process deshabilitado con `Choose the settlement date.` y ninguna vista previa;
  - al elegir `2026-10-24`, una vista previa con el `runId` revisado, esa `settlementDate` y los dos prellenados, y el panel con cinco categorías, nueve líneas con su signo en columna propia, `Batch fees` y **Amount payable** de la respuesta con separador de miles;
  - `skipped` con dos motivos distintos de cero → `Not processed: 3 ignored · 2 excluded`;
  - advertencias `undated_adjustment` y `reserve_cap_not_applied` con sus textos;
  - vista previa guionizada que no cuadra → se pinta su `amountPayable`;
  - línea `batch_fees` con `-42.5000` → `− Batch fees -42.5000`;
  - escribir `3`, `0`, `.5` seguidos → una sola petición con `30.5` y `Updating the pre-summary…`;
  - respuesta fuera de orden → sigue la última;
  - borrar la fecha → error en el campo, panel desactualizado y Process deshabilitado con ese motivo;
  - `409 validation_run_superseded` → mensaje con enlace a Analysis; error de red → mensaje y **Retry**
- [ ] 4.3 Implementar `useDebouncedValue`, `PREVIEW_DEBOUNCE_MS`, `features/settlements/{queries.ts,BatchSection.tsx,PreSummary.tsx,FiguresTables.tsx,PayableBreakdown.tsx,strings.ts}` (claves de D3, vista previa como consulta con `signal` y `keepPreviousData`, `isCurrent`, errores de D6 y D8); verificar 4.1 y 4.2 en verde; romper a propósito `isCurrent` (dar por buena la vista previa anterior) y ver fallar "Escritura seguida"; romper el signo componiendo `-${amount}` y ver fallar la línea de `-42.5000`; restaurar
- [ ] 4.4 Commit: `test(frontend): número de batch, fecha y resumen previo de Settlement Review` y `feat(frontend): número de batch editable y resumen previo con debounce`

## 5. Fees por batch (D5)

- [ ] 5.1 Test (rojo) `features/settlements/batch-fees.test.tsx` con "fees prellenados desde Other Fees", "añadir un fee preestablecido", "añadir un fee de importe libre", "importes de los fees" y "fee rechazado por el API":
  - `Wire Fee` y `Settlement Fee` `From file`; ajustar `Wire Fee` a `30.0000` → la vista previa lo envía así con `source = file`; quitar `Settlement Fee` → solo uno;
  - tipo desconocido (`Bank charge`) → fila marcada, selector solo con tipos de importe libre, Process deshabilitado con `Choose a type for the fees of unknown type, or remove them.` y sin vista previa; tras elegir `Special Adjustment`, enviada con ese `feeTypeId` y `source = file`; tras quitarla, el motivo se va y la vista previa sale sin ella; `amount = null` → importe obligatorio;
  - variante de ProviderB-Main: `Monthly Fee` con `250.0000` editable a `240.0000`, enviado con `feeId` y `source = manual`;
  - sin **Settlement date**: **Add preset fee** deshabilitado con `Choose the settlement date first.` y sin `GET fees`; con `2026-10-24`, `GET fees` con `asOf=2026-10-24`, y al cambiar la fecha se vuelve a pedir con la nueva;
  - ProviderA-USD: `Chargeback over 1%` vacío con el texto de solo porcentaje y sin vista previa hasta escribir el importe;
  - importe libre: solo tipos con `allowsFreeAmount` (`Special Adjustment` sí, `Wire Fee` no); `-42.5000` con descripción → enviado con `feeId = null`; sin descripción → error sin vista previa;
  - importes no válidos → error en la fila sin vista previa; `123456789012345.1234` enviado tal cual;
  - `400 batch_fee_invalid` guionizado (`free_amount_not_allowed`, `fee_not_in_force`, y `description_required` en la descripción de su fila) → texto en la fila de `index` y motivo de Process, que se borra al cambiar la fila
- [ ] 5.2 Implementar `features/settlements/{BatchFees.tsx,FeeRow.tsx,AddPresetFee.tsx,AddFreeFee.tsx}` con `useFieldArray` y los errores de D6 por `setError`; verificar 5.1 en verde; romper a propósito el filtro de `allowsFreeAmount` y ver fallar "Tipos ofrecidos"; romper el preestablecido solo con porcentaje rellenando `percentage` como importe y ver fallar su caso; restaurar
- [ ] 5.3 Commit: `test(frontend): fees por batch prellenados, preestablecidos y de importe libre` y `feat(frontend): formulario de fees por batch de Settlement Review`

## 6. Canales a asociar y Process (D9, D10)

- [ ] 6.1 Añadir el componente shadcn `checkbox` (formateado con Biome y versionado), comprobar que no entra ninguna dependencia fuera de `radix-ui` y verificar `pnpm lint` y `pnpm --filter @recon/frontend build`
- [ ] 6.2 Test (rojo) `features/settlements/process.test.tsx` con "canales a asociar" y "procesar":
  - `RAM-07 · not assigned yet`, casilla sin marcar y Process deshabilitado con `Confirm the channel assignment.`; marcada → habilitado;
  - la casilla se desmarca si cambia la lista de canales entre dos vistas previas;
  - `409 channel_assignment_not_confirmed` con `RAM-03` → lista, casilla desmarcada y nueva vista previa;
  - sin canales → sin casilla ni `confirmChannelAssignment`;
  - doble clic en **Process batch 123** → un solo `POST` con el cuerpo de la vista previa a la vista y `confirmChannelAssignment = true`; con el `201`, Summary del `batchId` sin `GET /settlements/<batchId>` y volver atrás no reabre el formulario;
  - cambiar un importe con la vista previa retenida → Process deshabilitado hasta la nueva vista previa, y el `POST` lleva el importe nuevo;
  - `POST` retenido → campos y botones deshabilitados y `Processing the batch…`;
  - `409 import_not_validated` → mensaje, relectura del import y estado de no validado; red → mensaje y Process de nuevo disponible;
  - cada motivo de deshabilitado enlazado por `aria-describedby`
- [ ] 6.3 Implementar `features/settlements/{ChannelsToAssign.tsx,ProcessBar.tsx,mutations.ts}` (`useProcessSettlement` con guarda síncrona, envío de `lastRequest`, escrituras de caché de D3, `navigate` con `replace`); verificar 6.2 en verde; romper a propósito la guarda síncrona y ver llegar dos `POST`; romper el envío componiendo el cuerpo desde el formulario y ver fallar el caso de la vista previa retenida; restaurar
- [ ] 6.4 Commit: `chore(frontend): componente checkbox de shadcn`, `test(frontend): canales a asociar y Process sin doble envío` y `feat(frontend): confirmación de canales y procesar el batch desde Settlement Review`

## 7. Settlement Summary y descargas (D11, D12)

- [ ] 7.1 Test (rojo) `features/settlements/SettlementSummary.test.tsx` con "estado y cabecera del intento", "totales y amount payable auditable", "fees, reservas, canales e incidencias", "recarga por su enlace" y "fechas en hora de Nueva York":
  - tras procesar: título, cuenta e intento, `Processed · pending payment`, `Processed by analyst on <fecha ET>` y el aviso de no Settled;
  - nueve líneas del desglose en orden con su signo y **Amount payable**; `reserve_early_released` en `0.0000` visible;
  - totales por categoría y por marca y `R · Reserve released` con `reservesReleasedQty`;
  - `Wire Fee · From file · 30.0000 · entered by analyst`; `RAM-07 · assigned to this account as primary`; incidencias con enlace a Analysis;
  - recargar → `GET /settlements/<batchId>` y el mismo intento; `404` → `Settlement not found` con enlace a Dashboard;
  - con `TZ` distinta de Nueva York: `2026-10-24 ET`, `2026-09-28 00:04 ET` y `2026-10-19 11:40 ET`
- [ ] 7.2 Test (rojo) `features/settlements/exports.test.tsx` con "descargas": con `SETTLEMENT_EXPORTS_AVAILABLE = false`, tres botones deshabilitados con `Downloads are not available yet.` por `aria-describedby` y ningún `<a>` de descarga; con la constante forzada a `true` en el test, cada botón pide su URL con `Authorization`, descarga con el nombre de `Content-Disposition` o, sin ella, `ProviderA-USD_B123_A1_<type>` y no cambia el estado pintado ni lanza otra lectura; sin `reports.view`, sin botones
- [ ] 7.3 Implementar `features/settlements/{SettlementSummaryPage.tsx,SummaryHeader.tsx,SummaryFees.tsx,SummaryIssues.tsx,Exports.tsx,exports.ts}` reutilizando las tablas y el desglose del grupo 4; verificar 7.1 y 7.2 en verde; romper a propósito `formatAuditDateTime` por `formatBusinessDateTime` en `processedAt` (no compila: anotarlo) y la constante de descargas a `true` sin URL autenticada (falla 7.2); restaurar
- [ ] 7.4 Commit: `test(frontend): Settlement Summary con desglose auditable y descargas` y `feat(frontend): pantalla Settlement Summary con descargas pendientes de #12`

## 8. Solo lectura, teclado y anchura (D13, D17)

- [ ] 8.1 Test (rojo) `features/settlements/read-only.test.tsx` con "solo lectura": `viewer` abre el Summary de un intento de su alcance y lo ve entero, con las descargas que su permiso admite y sin pagar, deshacer ni **New reconciliation**, y sin peticiones de escritura; `viewer` no ve el enlace a Settlement Review en Analysis (ya en 3.2, aquí solo se referencia)
- [ ] 8.2 Test (rojo) `features/settlements/keyboard.test.tsx` con "teclado y motivos": con solo Tab, Enter, Espacio y Escape se edita el número, se añade un preestablecido y un importe libre, se quita un fee, se marca la casilla y se pulsa Process; el foco va al nuevo importe al añadir y vuelve al botón de añadir al quitar; todo botón deshabilitado tiene un motivo visible asociado
- [ ] 8.3 Ajustar lo que 8.1 y 8.2 descubran (permisos de D13, `aria-describedby`, foco) y verificar 8.1 y 8.2 en verde; romper a propósito la devolución del foco al quitar una fila y ver fallar 8.2; restaurar. La revisión de anchura a 1280 px y 1024 px necesita datos reales y queda en 9.6
- [ ] 8.4 Verificar `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @recon/frontend build` en verde y `openspec validate web-settlement --type change --strict` sin avisos
- [ ] 8.5 Commit: `test(frontend): solo lectura y teclado en Settlement Review y Summary` y `fix(frontend): permisos y accesibilidad de las pantallas de settlement`

## 9. Rebase sobre #11 (y #12) y prueba contra el API real — espera al merge de #11 (D16)

**No empezar este grupo hasta que la persona confirme que #11 (`settlement-process`) está fusionado en `feature/entrega-2-MVP`, y diga si #12 también lo está.**

- [ ] 9.1 Rebase de `feat/web-settlement` sobre `feature/entrega-2-MVP`; si `frontend/src/lib/api/schema.gen.ts` no trae las rutas de #11 (y de #12 si está), regenerarlo con `pnpm --filter @recon/frontend api:generate` y verificar `pnpm openapi:check` en verde
- [ ] 9.2 Test (rojo) en `test/msw/settlements.test.ts`: cada fixture del falso pasa `safeParse` con los esquemas de `@recon/shared` (`settlement.ts`: `SettlementPreview`, `SettlementView`, `NextBatchNumber`; `fees.ts`: `AccountFee`, `FeeTypeView`); si alguno no existe, anotarlo en el PR y apoyarse en `typecheck`
- [ ] 9.3 Sustituir en `features/settlements/contract.ts` los tipos copiados por alias de los generados con las fechas marcadas y las llamadas por `api.GET/POST` (las de #12 que no estén siguen copiadas, con su comentario), sin cambiar los nombres exportados; tipar el falso con los tipos generados; verificar `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde **sin tocar ningún test de componente**, y 9.2 en verde
- [ ] 9.4 Si #12 está fusionado y sus descargas responden, `SETTLEMENT_EXPORTS_AVAILABLE = true` y 7.2 en verde con la constante real; si no, se queda en `false` y se anota en el PR
- [ ] 9.5 La persona prepara la base con `! pnpm db:up`, `! pnpm db:migrate` (migración `0007`) y `! pnpm db:seed`, y levanta `! pnpm dev`, con la base ya libre de las pruebas de #11
- [ ] 9.6 Prueba manual contra el API real con `batch-clean`, como `analyst` y `viewer`, a 1280 px y 1024 px:
  - `analyst`: número 123, fecha obligatoria, prellenados, `Chargeback over 1%` solo porcentaje, importe libre con descripción (y el `400 description_required` enviándolo sin ella desde la colección o con el formulario forzado en las herramientas del navegador), casilla de `RAM-07`, número ocupado (otro import de la cuenta procesado antes o número sembrado), Process, Summary y, si #12 está, recarga y las tres descargas con su nombre;
  - `viewer`: Settlement Review sin acceso y Summary en solo lectura.

  Contrastar la forma de las respuestas reales con las fixtures y ajustarlas si difieren; comprobar el orden de `batchFees` (hueco 3, contrato de #11) y, si #12 está, `Content-Disposition` (hueco 4); anotar en el PR cualquier diferencia
- [ ] 9.7 Verificar que el smoke E2E existente sigue en verde con `pnpm test:e2e` y que el diff del backend contra la base está vacío
- [ ] 9.8 Escribir el script de capturas `e2e/screenshots/web-settlement.ts` (D16 paso 7) y su comando raíz `pnpm screenshots:web-settlement`: fuera de los `.feature` y del `defineBddConfig` del smoke; `analyst` del seed con `SEED_PASSWORD` por `process.loadEnvFile`, sin leer ni imprimir el `.env`; contraseña vaciada tras el login; sin trace ni vídeo y `headless: false`; ninguna captura de la pantalla de login ni antes de que la pantalla esté cargada; recorre `batch-clean` por la pantalla hasta procesar y avisa en consola de que el import queda procesado y hay que volver a sembrar. Verificar con `pnpm test:e2e --list` que el smoke no lo recoge y que ningún workflow de `.github/` lo llama
- [ ] 9.9 **Avisar a la persona antes de ejecutarlo**, porque quiere mirar la ejecución. Con su visto bueno, ejecutar `pnpm screenshots:web-settlement` y comprobar que deja en `docs/wireframes/web-settlement/` `settlement-review.png`, `settlement-review-batch-taken.png`, `settlement-review-1024.png` y `settlement-summary.png`, y que la consola dice que no hay desplazamiento horizontal a 1280 ni a 1024 px. Revisar cada PNG antes de versionarlo: ninguna credencial y ninguna pantalla de login. Después, la persona vuelve a sembrar con `! pnpm db:seed`
- [ ] 9.10 Línea de las capturas en `docs/wireframes/README.md` y registro del change en `prompts.md`
- [ ] 9.11 Listar en la descripción del PR los huecos del contrato del proposal con su resolución (fecha obligatoria, tipo desconocido con #60, orden de `batchFees` y `description_required` en #11, `Content-Disposition` en #12) y lo que siga pendiente de #12, el estado de las descargas y la referencia a #64 (lista de Settlements). No crear issues desde la sesión
- [ ] 9.12 Commit: `refactor(frontend): contrato de settlement con el cliente generado tras #11`, `chore(e2e): script de capturas de Settlement Review y Summary fuera del smoke y de CI` y `docs(settlement): capturas de Settlement Review y Summary y registro en prompts.md`

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/web-settlement` hacia `feature/entrega-2-MVP` con la plantilla, citando §1.2, §1.3 y §5 HU3 y el issue #13 (`Closes #13`), con capturas; solo tras el grupo 9.
- `/opsx:archive` tras el merge, después del archivo de `settlement-process`: añade los requisitos de pantalla a `openspec/specs/settlement/spec.md` y aplica el delta de `validation`.
