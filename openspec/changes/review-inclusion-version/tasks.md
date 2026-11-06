# Tasks — review-inclusion-version

Rama `feat/review-inclusion-version` (desde `origin/feature/entrega-3-MVP`), PR hacia `feature/entrega-3-MVP`; cierra #53. Decisiones D1–D10 en `design.md`; escenarios en las delta specs `validation` y `api-collection`.

**Reglas.** Cada grupo termina con su commit y un `git push`, sin `--no-verify`. Los grupos test-first comitean primero los tests en rojo (`test:`) y después la implementación (`feat:`), tras romper una vez el test a propósito para ver que falla por la razón correcta. **Base compartida:** la migración, el seed, la integración y Bruno no se ejecutan hasta que la persona dé turno. Para filtrar un archivo de integración: `pnpm --filter @recon/backend exec vitest run --project integration <archivo>`. El CI se vigila con `gh run list --branch feat/review-inclusion-version --json status,conclusion --jq '.[0]'`.

## 0. Artefactos del change

- [x] 0.1 Revisión de la persona: proposal, design (D1 contador frente a `updatedAt`, D4 orden, D6 nombre del código), specs y tasks, con `openspec validate review-inclusion-version --strict` en verde, y **confirmación expresa del cambio de esquema** (D2).
- [x] 0.2 Commit: docs(openspec): proponer review-inclusion-version (#53), y `git push`.

## 1. Esquema: `ValidationRun.inclusionVersion`

- [x] 1.1 Escribir a mano `backend/prisma/migrations/0009_validation_run_inclusion_version/migration.sql` (D2): `ALTER TABLE [dbo].[ValidationRun] ADD [inclusionVersion] INT NOT NULL CONSTRAINT [ValidationRun_inclusionVersion_df] DEFAULT 0` y `CONSTRAINT [CK_ValidationRun_inclusionVersion] CHECK ([inclusionVersion] >= 0)`, con el esqueleto `BEGIN TRY / TRAN` de `0008` y comentarios en inglés. Verificar leyéndola junto a `0006` (nombres y forma).
- [x] 1.2 Añadir `inclusionVersion Int @default(0)` a `model ValidationRun` en `schema.prisma`, con un comentario `///` en inglés, y regenerar el cliente (`pnpm --filter @recon/backend exec prisma generate`). Verificar con `pnpm typecheck` que el cliente expone el campo.
- [ ] 1.3 Cuando la persona dé turno, la persona aplica la migración con `! pnpm db:migrate` dentro de la sesión. Verificar en su salida que `0009` queda aplicada sin drift.
- [x] 1.4 Commit: feat(validation): columna inclusionVersion en ValidationRun (migración 0009), y `git push`.

## 2. Contrato compartido (`@recon/shared`), test-first

- [x] 2.1 Tests en `packages/shared/src/validation.test.ts`: `ReviewBody` exige `inclusionVersion` entero `>= 0` (rechaza ausente, `-1`, `1.5` y claves desconocidas); `ValidationRunSummary` exige `inclusionVersion` no negativo; `ErrorDetails['inclusions_changed']` tiene `{ runId, inclusionVersion, currentInclusionVersion }`. Romper uno a propósito, verlo fallar y comitear en rojo. Commit: test(shared): versión de inclusiones en el review, y `git push`.
- [x] 2.2 Añadir los campos y los `details` en `packages/shared/src/validation.ts` (D6, D7). Verificar con `pnpm --filter @recon/shared test` en verde y listar los errores de `pnpm typecheck` en backend y frontend que resuelven los grupos 4 y 6.
- [x] 2.3 Commit: feat(shared): inclusionVersion en la corrida y en el cuerpo del review, y `git push`.

## 3. Guarda pura del review (dominio), test-first

- [x] 3.1 Tests de `backend/src/modules/validation/domain/review-guard.test.ts` para `reviewRefusal` (D4): sin corrida → `run_required`; otro `runId` → `run_superseded` aunque la versión también difiera; mismo `runId` y otra versión → `inclusions_changed` con `currentInclusionVersion`; versión caducada en una corrida bloqueada → `inclusions_changed`, no `blocked`; corrida bloqueada con versión vigente → `blocked` con los códigos en el orden de `ValidationCode`; todo en orden → `null`. Romper uno a propósito (por ejemplo, invertir dos comprobaciones), verlo fallar y comitear en rojo. Commit: test(validation): orden de las negativas del review con la versión de inclusiones, y `git push`.
- [x] 3.2 Implementar `review-guard.ts`. Verificar con `pnpm --filter @recon/backend exec vitest run src/modules/validation/domain/review-guard.test.ts` en verde.
- [x] 3.3 Commit: feat(validation): guarda pura del review, y `git push`.

## 4. Servicio, repositorio y API, test-first

- [ ] 4.1 Tests unitarios con el fake en memoria (`validation-service.review.test.ts`, `validation-service.actions.test.ts`): un cambio de inclusión sube la versión y el mismo valor no; una corrida nueva empieza en `0`; una resolución a mano no la mueve; `review` con versión caducada da `409 inclusions_changed` con sus `details`, el import sigue `analyzed` y no hay `import.review`; con la vigente, `import.review` lleva `inclusionVersion`. Tests de ruta (`validation-routes.test.ts`): `400 validation_error` sin `inclusionVersion`. Romper uno a propósito, verlo fallar y comitear en rojo. Commit: test(validation): review con la versión de inclusiones vista, y `git push`.
- [ ] 4.2 Implementar: `InclusionsChangedError` en `application/errors.ts`; el fake en memoria (`__fakes__/in-memory-runs.ts`) con la versión; `ValidationService.review` recibe la versión; `StoredRun` y `runSummary` la devuelven; la ruta pasa `request.body.inclusionVersion` y su descripción lista `inclusions_changed` en el orden de D4.
- [ ] 4.3 `PrismaValidationRunRepository`: en `setInclusion`, `increment` de la versión tras el `update` de la aparición y `inclusionVersion` en la auditoría `set_inclusion` (D3); en `review`, la guarda de D4 tras el candado y `inclusionVersion` en `import.review` (D8); `currentRun` la lee. Verificar con `pnpm --filter @recon/backend test` (unitarios) y `pnpm typecheck` en verde.
- [ ] 4.4 Actualizar los llamadores de `POST review` de los tests de integración para que compilen (`backend/test/integration/import-flow.ts`, `validation-*.int.test.ts`, `settlement-*.int.test.ts`), tomando la versión de la vista leída. Verificar con `pnpm typecheck`; se ejecutan en el grupo 5.
- [ ] 4.5 Exportar el OpenAPI (`pnpm openapi:export`) y regenerar los tipos del frontend (`pnpm --filter @recon/frontend api:generate`). Verificar que el diff de `docs/openapi.yaml` solo trae `inclusionVersion`, `inclusions_changed` y la descripción del review.
- [ ] 4.6 README: §3.3 "Decisión de conjunto" (la versión, `409 inclusions_changed` y el orden completo de las negativas), la descripción de `AuditLog` en §3 (`import.review` con `inclusionVersion`, `set_inclusion` con la versión resultante), §4.4 (filas de `GET validations` con `inclusionVersion` y de `POST review` con el cuerpo `{ runId, inclusionVersion, confirmEmptyBatch? }` y el código nuevo) y quitar la fila de #53 de los riesgos aceptados. Verificar con `grep -n "inclusionVersion\|inclusions_changed\|#53" README.md`.
- [ ] 4.7 Commit: feat(validation): el review exige las inclusiones que vio el analista, y `git push`.

## 5. Integración de la carrera, test-first (con turno de la persona)

- [ ] 5.1 En `backend/test/integration/validation-review.int.test.ts`, con el gancho `beforeClaim('review')`: el review lee la corrida, se pausa antes de la guarda, un `PATCH` de otro usuario confirma un cambio de inclusión, el review continúa y recibe `409 inclusions_changed` con `currentInclusionVersion = 1`; el import sigue `analyzed`, sin revisión y sin fila `import.review`. Otro caso: el review con la versión vigente tras el cambio da `200` y su auditoría lleva `inclusionVersion = 1`. Romper a propósito (por ejemplo, comentar la comprobación de versión en el repositorio) para ver que el test falla con `200`, y restaurar.
- [ ] 5.2 Cuando la persona dé turno (y tras `! pnpm db:seed` si Bruno ensució la base), ejecutar `pnpm --filter @recon/backend exec vitest run --project integration test/integration/validation-review.int.test.ts` y después `pnpm test:integration` completo. Verificar en verde, incluidos los llamadores actualizados en 4.4.
- [ ] 5.3 Commit: test(validation): carrera entre un cambio de inclusión y el review, y `git push`.

## 6. Frontend, test-first

- [ ] 6.1 Fake de MSW (`frontend/src/test/msw/validations.ts`, D10): `inclusionVersion` en la corrida (0 al crearla, opción de siembra y `bumpInclusionVersion(importId)` para simular a otro analista), el handler de inclusión la sube solo si el valor cambia, `viewOf` la devuelve, y el review exige el campo (`400`) y comprueba en el orden de D4. Tests en `validations.test.ts` del fake (subida, mismo valor, orden frente a `validation_run_superseded` y `blocking_validation_issue`).
- [ ] 6.2 Tests RTL en `features/validations/decision.test.tsx`: Continue envía `{ runId, inclusionVersion }`; con la versión movida en el fake, `409 inclusions_changed` muestra `The inclusions changed since you loaded them. Check them and continue again.`, el import sigue `analyzed` y el siguiente clic envía la versión releída y valida. En `empty-batch.test.tsx`: ante `inclusions_changed` la casilla queda desmarcada. Romper uno a propósito, verlo fallar y comitear en rojo junto con 6.1. Commit: test(frontend): review con las inclusiones cambiadas, y `git push`.
- [ ] 6.3 Implementar: `reviewImport` con la versión (`contract.ts`), `useReview().review` con la corrida y el mensaje de `inclusions_changed` (`mutations.ts`, `strings.ts`), y `DecisionBar` envía la versión y desmarca la casilla también ante `inclusions_changed` (D9). Verificar con `pnpm --filter @recon/frontend test`, `pnpm lint` y `pnpm typecheck` en verde.
- [ ] 6.4 Test RTL primero (con rotura deliberada) y después implementación: Continue queda deshabilitado mientras `validationRunQuery` se recarga (`isFetching`), con `Loading the latest results…` asociado al botón (D9). El test retiene en el fake la relectura de `GET validations` que sigue a un `PATCH` de inclusión propio, comprueba el botón deshabilitado con su motivo, la suelta y comprueba que el clic envía `inclusionVersion = 1` y valida (sin `409`). Verificar con `pnpm --filter @recon/frontend test`.
- [ ] 6.5 Commit: feat(frontend): el DecisionBar envía la versión de inclusiones y trata inclusions_changed, y `git push`.

## 7. Colección de Bruno, test-first (con turno de la persona)

- [ ] 7.1 Las peticiones de `POST review` de `20-flows` envían la `inclusionVersion` guardada de la última corrida o lectura: `validations/batch-issues` (6, 15, 17), `validations/batch-blocked/5`, `validations/batch-wrong-account` (5, 6) y `settlements/batch-clean` (5, 29); los pasos que cambian una inclusión guardan la versión que devuelve la lectura siguiente.
- [ ] 7.2 Negativo nuevo en `batch-issues`, antes de `15 Review`: review con la versión guardada antes del último cambio de inclusión → `409 inclusions_changed` con `details.currentInclusionVersion` mayor, y lectura de validaciones con `importStatus = "analyzed"`. En `10-smoke`, `Review - missing inclusionVersion` → `400 validation_error`. Comprobar la rotura a propósito (aserción con el código equivocado) en la primera pasada.
- [ ] 7.3 Cuando la persona dé turno, `pnpm test:api` contra el backend local. Verificar en verde; avisar de que la base queda sucia hasta el siguiente `pnpm db:seed`.
- [ ] 7.4 Commit: test(api-collection): review con inclusiones caducadas, y `git push`.

## 8. Verificación de conjunto

- [ ] 8.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check` y `openspec validate review-inclusion-version --strict` en verde; CI verde en la rama.
- [ ] 8.2 Commit (solo si la verificación dejó correcciones): fix(validation): ajustes de la verificación de review-inclusion-version, y `git push`.
- [ ] 8.3 Abrir el PR hacia `feature/entrega-3-MVP` con la plantilla, enlazando #53.

## Workflow follow-up

- `/opsx:verify` y `/review-diff` en una sesión nueva, pedidos por la persona.
- `/opsx:archive` tras el merge.
