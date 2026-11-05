# Tasks — settlement-reserve-chargeback

Rama `feat/settlement-reserve-chargeback`. Las decisiones D1–D7 están en `design.md`, las reglas del gate P1–P8 en `proposal.md` y los escenarios en las delta specs (`settlement`, `validation`). Sin migración ni seed.

Liberan los tres ajustes I: `Chargeback` (con `CHB 2`), `Refund` y `RDR` (P4). Cada grupo termina con su commit y un `git push`. El CI se vigila con `gh run list --branch feat/settlement-reserve-chargeback --json status,conclusion --jq '.[0]'`. Los pasos de integración y Bruno necesitan la base local: antes de ejecutarlos se pide turno a la persona.

## 0. Artefactos del change

- [x] 0.1 Revisión rápida de proposal, specs, design y tasks por la persona, con `openspec validate settlement-reserve-chargeback --strict` en verde.
- [x] 0.2 Commit: docs(openspec): proponer settlement-reserve-chargeback (#62), y `git push`.

## 1. Oráculo de `batch-issues`

- [x] 1.1 Añadir en `data/samples/plan.ts` el bloque `expected.reserveEarlyRelease` de `batch-issues` (D6): `released: [{ id, sheet, amount, heldInBatchNo }]`, `notReleased: [{ id, sheet, outcome }]` y `reserveEarlyReleasedAmt`.
  - Se recorren las hojas CHB, REF y RDR en el orden de proceso.
  - Libera la primera fila de cada transacción cuyo E `Successful` con reserva está en un batch sembrado anterior o en el APP final de la muestra, sin R previa ni en el RR de la muestra.
  - El importe es `reserveOf(t)` con `Decimal`: toda la reserva, sin prorratear.
  - `notReleased` contiene el `non_recorded_adjustment` de RAM-13 (`no_held_reserve`) y cualquier otro que no libere, con su motivo.
  - La `note` aclara que los totales siguen sin fijarse.
- [x] 1.2 Regenerar con `pnpm samples:plan && python data/samples/build-samples.py`. Verificar con `git diff --stat data/samples`:
  - solo cambia `batch-issues/expected.json`;
  - los demás `expected.json` no cambian: `batch-clean`, `batch-split` y `legacy-provider` son `hold_until_term`, y `batch-blocked` no se procesa.

  Si cambia algún `.xlsx` u otro `expected.json`, parar y preguntar a la persona.

  Resultado: los `expected.json` solo cambian de formato hasta pasar Biome, y entonces solo cambia `batch-issues`. Los seis `.xlsx` cambian de bytes con el openpyxl local, pero tienen las mismas celdas que en HEAD (comparación celda a celda), así que se restauran.
- [x] 1.3 Commit: test(samples): oráculo de la liberación de reserva por ajuste en batch-issues, y `git push`.

## 2. Dominio: liberación ante un ajuste (TDD)

- [x] 2.1 Escribir `backend/src/modules/settlement/domain/adjustment-reserve.test.ts` con builders (`test-support/builders.ts`, ampliado con `reserveStates`) y comprobar que falla porque el módulo no existe. Debe cubrir cada escenario de "Política de reserva ante chargeback" y de "Reserva ya liberada por un ajuste":
  - `Chargeback`, `Refund` y `RDR` de ronda 2 liberados, cada uno con su `heldInBatchId`;
  - ronda 1 (E del mismo batch, `heldInBatchId = null`, retenida y liberada que se compensan);
  - refund parcial (50.0000 de 200.0000) que libera toda la reserva (20.0000);
  - E de otra cuenta del proveedor, con la política de la cuenta que procesa;
  - `hold_until_term` en los tres estados → `held_until_term`;
  - sin E → `no_held_reserve`;
  - `Chargeback` + `CHB 2` y `Refund` + `Chargeback` de la misma transacción → el segundo `already_released`;
  - liberación previa vigente por cualquier estado → `already_released`;
  - R vigente o R en el batch → `released_in_r`, con la R entera (P3);
  - RR de una reserva liberada → R a 0 y `reserve_already_released` con transacción, hoja y fila;
  - sin estado previo (intento deshecho) → `released`.
- [x] 2.2 Ampliar `compute-settlement.test.ts`:
  - con `settlementSampleInput('batch-issues')`: cada fila de `expected.reserveEarlyRelease.released` (por ID y hoja) con su importe, las de `notReleased` en 0 con su `outcome`, `summary.reserveEarlyReleasedAmt` igual al total, la línea `reserve_early_released` con ese importe, la suma con signo del desglose igual a `amountPayable`, y sin `chargeback_reserve_policy_not_applied`;
  - `batch-clean` y `legacy-provider` sin cambios en `expected.summary`.

  `settlementSampleInput` construye `reserveStates` con la historia sembrada (D6). Ajustar en `movements.test.ts` la expectativa del snapshot del I, que ya no lo escribe `buildMovements`. Comprobar que fallan.

  Hecho: `prefilledBatchFees` (`backend/src/modules/settlement/test-support/sample-input.ts:68`) deja fuera los tipos de fee fuera de catálogo ("Fraud Monitoring Fee" de `batch-issues`), que antes hacían fallar la carga de la muestra. Es solo montaje de test: el helper simula la confirmación del analista, y `BatchFeeInput` exige un `feeTypeId`. Producción no cambia y no pierde el fee en silencio. El análisis lo conserva como importe libre con `feeTypeId: null` y la advertencia "Fee type not in the catalog" (`imports/domain/batch-fees.ts`, cubierto en `batch-fees.test.ts` e `import-service.analysis.test.ts`). Si se envía sin tipo, la revisión lo rechaza con `400 batch_fee_invalid` (`unknown_fee_type`).
- [x] 2.3 Commit: test(settlement): liberación de la reserva ante un ajuste con el oráculo de batch-issues
- [x] 2.4 Implementar (D1–D3):
  - `PriorReserveState` y `reserveStates` en `domain/types.ts`;
  - `ReservePolicyOutcome` y el snapshot `{ policy, applied: true, outcome, heldInBatchId }`;
  - `domain/adjustment-reserve.ts`;
  - la llamada desde `compute-settlement.ts`, que deja de emitir `chargeback_reserve_policy_not_applied`;
  - `movements.ts` sin snapshot en el I;
  - en el fake de la aplicación y en `load-settlement-input.ts`, `reserveStates` vacío hasta el grupo 3 (`sample-input.ts` ya lo construye con la historia sembrada en 2.2, con `reserveStatesOf`).

  Verificar con `pnpm --filter @recon/backend test` en verde. Romper el test a propósito una vez (no marcar la reserva como liberada en el batch, para que el segundo ajuste también libere), comprobar que falla y restaurarlo.
- [x] 2.5 Commit: feat(settlement): liberar la reserva ante chargeback, refund o RDR con release_on_chargeback, y `git push`.

## 3. Fuente del proceso: `reserveStates`

- [x] 3.1 Ampliar `application/load-settlement-input.test.ts`: `reserveStates` se pide después de `previousE`, una lectura tras otra, solo con los IDs de las filas asociadas I y R. Añadir el puerto a `ports.ts` y al fake `__fakes__/in-memory.ts`, y añadir en `backend/test/integration/settlement-source.int.test.ts` los casos de `reserveStates`:
  - un E retenido de un batch sembrado `paid`, con su `batchId` y su importe como texto;
  - `releasedInR` de una R sembrada;
  - `releasedByAdjustment` de un I `Refund` con liberación;
  - un intento `undone` que no cuenta;
  - el import excluido;
  - más de 2 000 IDs por lotes.

  Comprobar que fallan: los unitarios sin base, y la integración en el turno de base que se pide a la persona.
- [x] 3.2 Commit: test(settlement): estado previo de las reservas en la fuente del proceso
- [ ] 3.3 Implementar `reserveStates` en `prisma-settlement-source.ts` (D2): una consulta por lote con `chunks`, sumas en `CONVERT(VARCHAR(40), …)` y el primer E por `processedAt` y `settlementTxnId`. Cargarlo en `load-settlement-input.ts`. Verificar con los tests unitarios y, con turno de base, con `pnpm --filter @recon/backend test:integration -- settlement-source`.
- [ ] 3.4 Commit: feat(settlement): leer el estado previo de las reservas al procesar, y `git push`.

## 4. Validación: faltantes R con la liberación en el I (TDD)

- [ ] 4.1 Ampliar los tests de `validation`:
  - `domain/missing.test.ts`: "Reserva liberada anticipadamente" (ahora con el I vigente), "Reserva liberada por un refund o un RDR", "Liberación de un intento deshecho" y "Ajuste sin liberación";
  - `application/__fakes__/in-memory.test.ts`: `heldReserves` suma la liberación de los I vigentes del proveedor, de cualquier estado, y no la de un `undone`;
  - `backend/test/integration/validation-sources.int.test.ts`: los mismos casos con datos escritos por el test.

  Comprobar que fallan: la integración, con turno de base.
- [ ] 4.2 Commit: test(validation): faltantes R con la liberación por ajuste de los movimientos I
- [ ] 4.3 Implementar D4: la subconsulta de `heldReserves` en `prisma-validation-sources.ts`, la misma regla en `InMemoryValidationSources.heldReserves` y el comentario de `HeldReserve` en `domain/types.ts`. Verificar con los unitarios y, con turno de base, con la integración de `validation-sources`.
- [ ] 4.4 Commit: feat(validation): leer la liberación anticipada de los movimientos I vigentes, y `git push`.

## 5. Integración del proceso

- [ ] 5.1 En `backend/test/integration/settlement-process.int.test.ts`:
  - reescribir "ProviderB-Main releases on chargeback, a policy not applied yet (#62)": con el oráculo de `batch-issues`, los movimientos `type=I` de las tres hojas con su `reserveEarlyReleasedAmt` y su snapshot, la vista y el desglose, y sin la advertencia antigua;
  - añadir la vista previa igual que procesar;
  - ronda 1 con un `xlsx` APP + REF en ProviderB-Main;
  - `hold_until_term` en ProviderA-USD (0 y `held_until_term`);
  - P12: procesar `batch-issues` y después un import con la RR de un ID liberado (R a 0, `reserve_already_released` y el RR con esa fila);
  - deshacer el intento y reprocesar, para que vuelva a liberar;
  - el summary CSV con la advertencia y el ID de origen.

  Verificar, con turno de base, con `pnpm --filter @recon/backend test:integration -- settlement-process`.
- [ ] 5.2 Commit: test(settlement): integración de la liberación de reserva ante un ajuste, y `git push`.

## 6. Colección Bruno

- [ ] 6.1 Añadir en `api-collection/20-flows/validations/batch-issues` dos peticiones tras `17 Review again`, con el import en `validated`, y renumerar `seq` de las siguientes:
  - `17b Preview reserve early release`: `200`; `reserveEarlyReleasedAmt` igual al oráculo, comentado como en `batch-clean/7 Preview`; la línea `reserve_early_released` con ese importe; el desglose sumado con `BigInt` igual a `amountPayable`; sin `chargeback_reserve_policy_not_applied`;
  - `17c Preview as viewer`: `as: viewer` y `{{viewerToken}}`, `403` con `code = "forbidden"`.

  Prerrequisitos, en el turno de base que se pide a la persona: `pnpm db:up`, `pnpm db:seed` (lo ejecuta la persona con `! pnpm db:seed` dentro de la sesión) y `pnpm dev`. Verificar con `pnpm test:api` dos veces seguidas sin sembrar entre medias (lo ejecuta la persona con `! pnpm test:api`).
- [ ] 6.2 Commit: test(api): vista previa de batch-issues con la reserva liberada por ajuste, y `git push`.

## 7. Documentación y contrato

- [ ] 7.1 Actualizar la documentación:
  - README §1.2: la fila de #62 del recorte pasa a hecha, y "Reserva por cuenta" lleva la regla exacta: aplica a `Chargeback`, `Refund` y `RDR`, el primer ajuste libera toda la reserva retenida de un E vigente, gana la R, y manda la política de la cuenta que procesa;
  - README §3: `chargebackReservePolicy` (`release_on_chargeback` aplica a los tres ajustes, el nombre se mantiene), `reserveEarlyReleasedAmt` sin "En la Entrega 2 vale 0" y `reservePolicySnapshot` con sus dos formas;
  - README §3.3: candidatas R "sin liberación anticipada en un movimiento I vigente";
  - el ejemplo del §4, si lo necesita;
  - `docs/openapi.yaml`: descripción de `reservePolicySnapshot` y de las dos advertencias;
  - el comentario de `reserve_already_released` en `packages/shared/src/settlement.ts`.

  La etiqueta "Reserve released on chargeback" no cambia (P8). Verificar con `pnpm openapi:check` (o el export si la descripción sale del código) y con Grep de `#62` y `Refund` en `readme.md`.
- [ ] 7.2 Commit: docs(settlement): regla de la reserva ante un ajuste en README y OpenAPI, y `git push`.

## 8. Verificación de conjunto

- [ ] 8.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` y, con turno de base, la integración completa, todo en verde, y `openspec validate settlement-reserve-chargeback --strict` en verde. Verificación: salida de los comandos en el PR.
- [ ] 8.2 `/review-diff` del PR con los cinco focos (README §7):
  - dinero nunca `number`, ni siquiera al comparar `reserveHeldAmt`;
  - ningún movimiento Settled al procesar;
  - ningún comentario en español en `.ts`/`.sql`;
  - ningún `console.log`;
  - snapshot y advertencias con el vocabulario fijo.

  Verificación: hallazgos resueltos o anotados en el PR.
- [ ] 8.3 Commit: chore(settlement): arreglos de la verificación de settlement-reserve-chargeback, y `git push`.

## Workflow follow-up

- `/opsx:verify`, PR hacia `feature/entrega-3-MVP` con la plantilla, CI en verde y `/opsx:archive`.
- Cerrar #62 al fusionar.
- Hecho en el gate: #125 (roadmap) para renombrar la etiqueta "Reserve released on chargeback" (P8), y la casilla del riesgo aceptado en #67 (dos imports simultáneos con el mismo ajuste podrían liberar dos veces).
