# Tasks — web-validations

Issue #10 (HU2, pantalla Analysis & Validations). Rama: `feat/web-validations`, creada desde `feature/entrega-2-MVP`. Solo frontend: sin cambios de backend, API, esquema, OpenAPI ni colección Bruno. El contrato es el de "Contrato para #10" en `validation-runs/design.md` (rama `feat/validation-runs`). Si una tarea descubre que le falta algo, para y lo anota en el proposal ("Huecos del contrato") en lugar de tocar el backend o inventar un campo. Referencias: `specs/validation/spec.md` (qué) y `design.md` D1–D14 (cómo).

Orden test-first en cada grupo: los tests se escriben y se ven fallar (rojo) antes del código. En verde, se rompe el código a propósito una vez para comprobar que el test lo detecta, y se restaura. Tests de componentes con MSW (`renderApp`, `seedImport`, `seedValidationRun`). **Mientras #9 esté en curso no se ejecutan integración ni E2E contra la base**, porque se comparte. Textos de interfaz en inglés y en `features/validations/strings.ts`. Tipos y llamadas del contrato solo en `features/validations/contract.ts`, y el API falso solo en `test/msw/validations.ts` (D2).

## 1. Fechas en hora de Nueva York y búsqueda de la ruta (D5, D11)

- [x] 1.1 Test (rojo) en `lib/format.test.ts`, con `process.env.TZ = 'Asia/Tokyo'` para que no valga la zona del proceso:
  - negocio: `formatBusinessDateTime('2026-09-28T00:00:00.000Z')` → `2026-09-28 00:00 ET` y `formatBusinessDate` del mismo valor → `2026-09-28 ET`, sin convertir;
  - auditoría: `formatAuditDateTime('2026-10-18T14:20:00.000Z')` → `2026-10-18 10:20 ET` (EDT) y `formatAuditDateTime('2026-11-02T15:00:00.000Z')` → `2026-11-02 10:00 ET` (EST, tras el cambio del 1-nov-2026);
  - `DISPLAY_TIME_ZONE` es `America/New_York`;
  - un `// @ts-expect-error` comprueba que una `AuditInstant` no entra en `formatBusinessDateTime` ni una `BusinessDate` en `formatAuditDateTime`
  
  Los valores se construyen con las ayudas `businessDate()` / `auditInstant()`.
- [x] 1.2 Test (rojo) en `features/imports/validate-search.test.ts`: `validateImportSearch` conserva `validation` si es un `ValidationCode`, `ipage` > 1 e `issue` entero positivo; descarta `validation=foo`, `ipage=0`, `issue=abc`; y conserva `step`, `match` y `page` como hasta ahora
- [x] 1.3 Implementar en `lib/format.ts` `DISPLAY_TIME_ZONE`, `DISPLAY_ZONE_LABEL`, los tipos marca `BusinessDate` / `AuditInstant` con sus ayudas y los tres formateadores de D11 (`Intl.DateTimeFormat` con `formatToParts` y `hourCycle: 'h23'`; `timeZone: 'UTC'` en los de negocio y `DISPLAY_TIME_ZONE` en el de auditoría), y los tres parámetros de búsqueda; verificar 1.1 y 1.2 en verde, `pnpm typecheck`, `pnpm lint` y `pnpm --filter @recon/frontend build`; romper a propósito `formatAuditDateTime` (sin `timeZone`, zona del proceso) y ver fallar 1.1; romper `formatBusinessDateTime` (convertir a `DISPLAY_TIME_ZONE`) y ver fallar el caso de negocio; restaurar
- [x] 1.4 Commit: `test(frontend): fechas de negocio y de auditoría en hora de Nueva York y búsqueda de validaciones` y `feat(frontend): formateadores de fechas en ET y búsqueda de validaciones en la ruta del import`

## 2. Contrato aislado y API falso de validaciones (D2, D12)

- [x] 2.1 Test (rojo) `test/msw/validations.test.ts` sobre el falso, sin pantallas, **solo de lo que el falso modela** (D12):
  - con un import `analyzed` de `batch-issues` como `analyst`, `GET validations` → `run: null`; `POST validations` → `201` con la fixture base (ocho resultados y conteos tal como están fijados en ella) y la lista de `missing_previous_to_batch` → `total = 10`;
  - una segunda corrida supera a la primera (`runId` nuevo) y `manualChangeCount` vuelve a `0`;
  - **guion de los `PATCH`**:
    - un `PATCH conflict-occurrences` devuelve el detalle que el escenario guioniza, suma `manualChangeCount` y añade la entrada del historial con el usuario que llama y su `AuditInstant`;
    - un `PATCH` guionizado como `409` devuelve ese `code` con sus `details` y no cambia nada;
    - la variante de reserva R declara la aparición con `editable: true, includable: false` y guioniza `409 occurrence_not_includable` con `reserve_already_included`;
  - **transiciones**: `review` → `validated`; un `PATCH` aplicado sobre `validated` → `importStatus = analyzed` y `lastInvalidatedReview.reason = inclusion_change`; `POST validations` sobre `validated` → `reason = rerun` con `newRunId`; el estado queda en `importRecord(id).status`;
  - `review` con el `runId` de una corrida superada → `409 validation_run_superseded`; en la fixture de `batch-blocked` (con `run.blocked` fijado) → `409 blocking_validation_issue` con `issueIds`;
  - `viewer` → `403` en las cuatro escrituras y `404` sobre un import de `ProviderC-Alt`;
  - `holdNextValidation` y `failNextValidation` retienen o fallan una petición a voluntad
- [x] 2.2 Implementar `features/validations/contract.ts`:
  - tipos copiados de "Contrato para #10", con cada fecha como `BusinessDate` o `AuditInstant` según D11 y un comentario por campo;
  - enums de `@recon/shared`;
  - las siete llamadas con `createAuthFetch(session)` y `apiOrigin()`, lanzando `ApiError` y marcando las fechas al recibir;
  - cabecera que lo marca como temporal hasta #9.
  
  Implementar `test/msw/validations.ts`:
  - almacén por import;
  - fixtures base de `batch-issues` (desde `affectedIds` y `defaults` de `expected.json`) y de `batch-blocked` (con el supuesto del proposal hueco 5), con `editable`, `includable`, `resolvable`, `blocking` y resultados **fijados, no calculados**;
  - `seedValidationRun(importId, fixture, { patches })` para guionizar las respuestas de los `PATCH` por escenario;
  - transiciones escritas en `importRecord(id).status`;
  - registro de peticiones.
  
  Registrarlo en `handlers.ts` y reiniciarlo con `resetDb`. Verificar 2.1 en verde y que los tests existentes siguen en verde (`pnpm --filter @recon/frontend test`). Romper a propósito la puesta a cero de `manualChangeCount` al re-ejecutar y ver fallar 2.1; restaurar
- [x] 2.3 Comprobar con `rg` que `test/msw/validations.ts` no contiene ninguna regla de negocio: no lee `cycle`, `sourceType` ni `issueType` para decidir `editable`, `includable`, `resolvable` ni `outcome`. Anotarlo en el PR
- [x] 2.4 Comprobar con `rg` que ninguna ruta `/validations`, `/validation-issues` ni `/conflict-occurrences` aparece fuera de `contract.ts` y `test/msw/validations.ts`; anotarlo en el PR
- [x] 2.5 Commit: `test(frontend): API falso de validaciones guionizado sobre el contrato de #9` y `feat(frontend): contrato de validaciones aislado y API falso para los tests`

## 3. Cabecera, tabla de validaciones y ejecución de la corrida (D1, D3, D4, D5)

- [x] 3.1 Test (rojo) `features/validations/ValidationsSection.test.tsx` con los escenarios de la spec "ejecutar la corrida", "cabecera de la corrida" y "tabla de las ocho validaciones": sin corrida → `No validation run yet.` y ningún `POST`; **Run validations** → un `POST` y las ocho filas en orden con sus resultados, conteos, desgloses y `Blocks`; `Warnings` / `Blocked`; rangos sin convertir (`2026-09-28 00:00 ET` con `TZ` distinta de Nueva York), fecha de la corrida convertida a `ET` y contadores informativos; rango nulo → `—`; `not_applicable` → `n/a` sin acceso a hallazgos; el bloque está entre las advertencias y la tabla de filas del paso Analysis
- [x] 3.2 Test (rojo) `features/validations/run.test.tsx` con "corrida sin doble envío y relectura ante conflicto" y "aviso antes de volver a ejecutar": doble clic → un `POST` y Run y Continue deshabilitados mientras se retiene; `409 import_changed` → mensaje y nuevos `GET validations` y `GET /imports/<id>`; `409 import_not_analyzed` con `cancelled` → mensaje y sin **Run again**; `manualChangeCount = 2` → diálogo con `2 manual changes` y sin `POST` hasta confirmar; `validated` → frase de revisión invalidada; desistir → sin `POST`; sin nada que perder → sin diálogo
- [x] 3.3 Implementar `features/validations/{ValidationsSection.tsx,RunHeader.tsx,ValidationsTable.tsx,RunButton.tsx,queries.ts,mutations.ts,strings.ts}` (claves y escrituras de D3, `useRunValidations` con guarda síncrona, diálogo de D4, invalidación del detalle del import solo si cambia `importStatus`) y montar la sección en `features/imports/analysis/AnalysisStep.tsx` (actualizar su comentario de cabecera); verificar 3.1 y 3.2 en verde; romper a propósito la guarda síncrona y ver llegar dos `POST`; restaurar
- [x] 3.4 Commit: `test(frontend): corrida de validaciones, tabla de las ocho y aviso antes de re-ejecutar` y `feat(frontend): cabecera de la corrida, tabla de validaciones y Run validations`

## 4. Lista de hallazgos y detalle de solo lectura (D5, D6)

- [x] 4.1 Añadir el componente shadcn `sheet` (formateado con Biome y versionado), comprobar que no entra ninguna dependencia fuera de `radix-ui` y verificar `pnpm lint` y `pnpm --filter @recon/frontend build`
- [x] 4.2 Test (rojo) `features/validations/IssuesList.test.tsx` con "lista de hallazgos":
  - `Missing previous to batch` → petición `validationCode=missing_previous_to_batch&page=1&pageSize=50` y 10 filas con `DEC`, entre ellas `292185165085382`;
  - `Non-recorded adjustment` → los tres hallazgos con estado reportado y del gateway;
  - cambiar de validación quita `ipage` e `issue`;
  - recargar con `validation` e `issue` en la dirección reabre la lista y el drawer
- [x] 4.3 Test (rojo) `features/validations/IssueDrawer.test.tsx` con "detalle de un hallazgo" y las fechas de "fechas en hora de Nueva York" (`changedAt` y `at` del historial en `ET`, convertidos):
  - duplicado de `441706751475644` → dos apariciones `batch-issues.xlsx · APP · row N` con `Successful`, la primera `Included by default` e incluida y la segunda excluida;
  - `504712738863260` → aparición histórica con batch, intento, cuenta y estado del batch;
  - `status = null` → `Unresolved status`;
  - `excludeAmount` → `CHB 2`;
  - historial con usuario y fecha;
  - `run.isCurrent = false` → aviso de corrida superada;
  - `404` → se cierra y quita `issue`;
  - Enter abre con el foco dentro, y Escape cierra y devuelve el foco a la fila
- [x] 4.4 Implementar `features/validations/{IssuesList.tsx,IssueDrawer.tsx,Occurrences.tsx,IssueHistory.tsx}` con TanStack Table en `manualPagination` y el `sheet` de D6; verificar 4.2 y 4.3 en verde; romper a propósito la devolución del foco y ver fallar 4.3; restaurar
- [x] 4.5 Commit: `chore(frontend): componente sheet de shadcn`, `test(frontend): lista de hallazgos y detalle con sus apariciones` y `feat(frontend): lista de hallazgos por validación y drawer del hallazgo`

## 5. Acciones del drawer: inclusión y resolución (D7)

- [x] 5.1 Añadir los componentes shadcn `switch` y `textarea` (formateados con Biome y versionados), comprobar que no entra ninguna dependencia fuera de `radix-ui` y verificar `pnpm lint` y `pnpm --filter @recon/frontend build`
- [x] 5.2 Test (rojo) `features/validations/inclusion.test.tsx` con "cambiar la inclusión de una aparición" e "inclusión sobre un import validado":
  - incluir la segunda aparición del duplicado → `PATCH` con `{ includeInSettlement: true }`, `Changed by analyst` con la fecha, entrada del historial y `2 / 2` en la lista;
  - variante de reserva R del falso, con la aparición declarada `editable: true, includable: false` → interruptor deshabilitado con el texto genérico enlazado por `aria-describedby`;
  - `409 occurrence_not_includable` guionizado → mensaje específico y valor del servidor;
  - `previous_batch` → texto sin interruptor;
  - `409 validation_run_superseded` → mensaje y relectura;
  - interruptores deshabilitados mientras se retiene el `PATCH`;
  - sobre `validated` → diálogo, y tras confirmar, `analyzed` y aviso con `an inclusion was changed`; desistir → sin `PATCH`
- [x] 5.3 Test (rojo) `features/validations/resolve.test.tsx` con "resolver a mano con nota": nota → `PATCH` con la nota recortada y `Resolved by analyst` con fecha en `ET` (el escenario de horario estándar, `2026-11-02 10:00 ET`) y nota, también en el historial; vacía o solo espacios → `Write a note before resolving.` sin `PATCH`; 501 caracteres → error de longitud; `409 issue_already_resolved` → mensaje con usuario y fecha de `details` y relectura; duplicado → sin **Mark as resolved**
- [x] 5.4 Implementar `features/validations/{InclusionSwitch.tsx,ResolveForm.tsx}` y sus mutaciones en `mutations.ts` (escritura del detalle devuelto, invalidación de corrida y listas, sin optimismo); verificar 5.2 y 5.3 en verde; romper a propósito el habilitado del interruptor (ignorar `includable`) y ver fallar 5.2; restaurar
- [x] 5.5 Commit: `chore(frontend): componentes switch y textarea de shadcn`, `test(frontend): cambiar la inclusión y resolver a mano desde el drawer` y `feat(frontend): acciones del drawer con usuario, fecha e historial`

## 6. Revisión invalidada, Continue, Cancel and reprocess y Settlement Review (D8, D9)

- [x] 6.1 Test (rojo) `features/validations/decision.test.tsx` con "continuar o cancelar" y "acceso a Settlement Review" (los tests del Continue deshabilitado que pide la Definición de hecho del issue):
  - `batch-blocked` → Continue deshabilitado con el texto de `provider_mismatch` enlazado por `aria-describedby`, enlace que abre los hallazgos de `provider_mismatch` y **Cancel and reprocess** disponible;
  - sin corrida → `Run the validations before continuing.`;
  - `batch-issues` → `POST review` con el `runId` pintado, `validated`, `Reviewed by analyst` y **Settlement Review** deshabilitado con `Settlement Review is not available yet.`, sin ningún enlace hacia él;
  - `409 validation_run_superseded` y `409 blocking_validation_issue` → mensaje y relectura;
  - **Cancel and reprocess** confirmado → `cancelled` con corrida, tabla y hallazgos visibles y sin acciones
- [x] 6.2 Test (rojo) `features/validations/invalidated.test.tsx` con "aviso de revisión invalidada": re-ejecutar un import `validated` → texto con revisor, invalidador, fechas y `run #<nuevo>`; tras un `review` nuevo desaparece; `lastInvalidatedReview` anterior a `run.review.reviewedAt` → sin aviso
- [x] 6.3 Implementar `features/validations/{DecisionBar.tsx,InvalidatedReviewNotice.tsx,next-step.ts}` (`SETTLEMENT_REVIEW = null`, D9), `useReview` con guarda síncrona y la prop `label` en `features/imports/CancelImportDialog.tsx` (sin cambiar su comportamiento ni sus tests); verificar 6.1, 6.2 y `features/imports/cancel.test.tsx` en verde; romper a propósito el habilitado de Continue (ignorar `run.blocked`) y la comparación de fechas del aviso, y ver fallar 6.1 y 6.2; restaurar
- [x] 6.4 Commit: `test(frontend): decisión de conjunto, aviso de revisión invalidada y Settlement Review deshabilitado` y `feat(frontend): Continue, Cancel and reprocess y aviso de revisión invalidada`

## 7. Solo lectura, teclado y anchura (D10, D14)

- [x] 7.1 Test (rojo) `features/validations/read-only.test.tsx` con "solo lectura": `viewer` ve las ocho validaciones, la lista y las apariciones con `Included`/`Excluded` como texto, sin Run, Continue, Cancel and reprocess, interruptores ni **Mark as resolved**, y sin peticiones de escritura; import `cancelled` con el NRA `resolvable` → sin Run ni Continue, sin interruptores y con **Mark as resolved**; import `processed` → sin Run ni Continue
- [x] 7.2 Test (rojo) de teclado en `features/validations/keyboard.test.tsx`: con solo Tab, Enter, Espacio y Escape se elige una validación, se abre un hallazgo, se cambia una inclusión, se confirma un diálogo y se vuelve a la lista; todos los botones deshabilitados tienen un motivo visible asociado
- [x] 7.3 Ajustar lo que 7.1 y 7.2 descubran (permisos de D10 en `ValidationsSection` y `DecisionBar`, `aria-describedby`, foco) y verificar 7.1 y 7.2 en verde; romper a propósito el ocultado de Run para `viewer` y ver fallar 7.1; restaurar. La revisión de anchura a 1280 px y 1024 px necesita datos reales y queda en 8.5, porque MSW solo corre en los tests
- [x] 7.4 Verificar `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @recon/frontend build` en verde y `openspec validate web-validations --type change --strict` sin avisos
- [x] 7.5 Commit: `test(frontend): solo lectura y teclado en Analysis & Validations` y `fix(frontend): permisos y accesibilidad de la pantalla de validaciones`

## 8. Rebase sobre #9 y prueba contra el API real — espera al merge de #9 (D13)

**No empezar este grupo hasta que la persona confirme que #9 (`validation-runs`) está fusionado en `feature/entrega-2-MVP`.**

- [x] 8.1 Rebase de `feat/web-validations` sobre `feature/entrega-2-MVP`; si `frontend/src/lib/api/schema.gen.ts` no trae las siete rutas, regenerarlo con `pnpm --filter @recon/frontend api:generate` y verificar `pnpm openapi:check` en verde
- [x] 8.2 Test (rojo) en `test/msw/validations.test.ts`: cada fixture del falso pasa `safeParse` con los esquemas de respuesta que #9 publique en `@recon/shared` (`ValidationRunView`, `ValidationIssueDetail` y la página de la lista); si #9 no los publica, anotarlo en el PR y apoyarse solo en `typecheck`
- [x] 8.3 Sustituir en `features/validations/contract.ts` los tipos copiados por alias de `ApiResponse<…>` (ampliando `lib/api/types.ts` a `patch` y a respuestas `201`) y las llamadas por `api.GET/POST/PATCH`, sin cambiar los nombres exportados; tipar el falso con los tipos generados; verificar `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde **sin tocar ningún test de componente**, y 8.2 en verde
- [x] 8.4 La persona prepara la base con `! pnpm db:up`, `! pnpm db:migrate` (migración `0006`) y `! pnpm db:seed`, y levanta `! pnpm dev`, con la base ya libre de las pruebas de #9
- [ ] 8.5 Prueba manual contra el API real con `analyst` y `viewer`, a 1280 px y 1024 px:
  - `batch-issues`: corrida, duplicado `441706751475644`, incluir la segunda aparición, resolver el NRA, Continue, re-ejecutar con el diálogo y ver el aviso de revisión invalidada;
  - `batch-blocked`: Continue deshabilitado y Cancel and reprocess.
  
  Contrastar los resultados de `batch-blocked` con el supuesto del falso y corregir el fixture si difieren. Anotar en el PR cualquier diferencia entre falso y real
- [ ] 8.6 Verificar que el smoke E2E existente sigue en verde con `pnpm test:e2e` y que `pnpm --filter @recon/backend test:integration` no cambia (este change no toca backend)
- [ ] 8.7 Escribir el script de capturas `e2e/screenshots/web-validations.ts` (D13 paso 7) y su comando raíz `pnpm screenshots:web-validations`:
  - fuera de los `.feature` y del `defineBddConfig` del smoke;
  - `analyst` del seed con `SEED_PASSWORD` cargada con `process.loadEnvFile`, sin leer ni imprimir el `.env`;
  - campo de contraseña vaciado tras el login, `trace: 'off'`, `video: 'off'` y `headless: false`;
  - ninguna captura antes de cargar el import ni de la pantalla de login;
  - imports de `batch-issues` y `batch-blocked` creados por la pantalla y cancelados al terminar.
  
  Verificar con `pnpm test:e2e --list` que el smoke no lo recoge y que ningún workflow de `.github/` lo llama
- [ ] 8.8 **Avisar a la persona antes de ejecutarlo**, porque quiere mirar la ejecución. Con su visto bueno, ejecutar `pnpm screenshots:web-validations` y comprobar que deja en `docs/wireframes/web-validations/` cuatro PNG a 1280 px: `batch-issues-validations.png`, `batch-issues-duplicate-drawer.png` (con historial), `batch-issues-invalidated-review.png` y `batch-blocked-continue-disabled.png`. Revisar cada PNG antes de versionarlo: ningún dato de credenciales y ninguna pantalla de login
- [ ] 8.9 Línea de las capturas en `docs/wireframes/README.md` y registro del change en `prompts.md`
- [ ] 8.10 Listar en la descripción del PR:
  - los huecos del contrato del proposal (Settlement Review hasta #13, motivo de `includable`, indicadores `canRun`/`canReview`, oráculo de `batch-blocked`), para que la persona abra los issues;
  - las referencias a #47 (motivo al cancelar) y #48 (fechas de negocio sin `Z`);
  - el pendiente de roadmap de la zona horaria del gateway UUID.
  
  No crear issues desde la sesión
- [ ] 8.11 Commit: `refactor(frontend): contrato de validaciones con el cliente generado tras #9`, `chore(e2e): script de capturas de Analysis & Validations fuera del smoke y de CI` y `docs(validation): capturas de Analysis & Validations y registro en prompts.md`

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/web-validations` hacia `feature/entrega-2-MVP` con la plantilla, citando §1.3, §3.3 y §5 HU2 y el issue #10 (`Closes #10`), con capturas; solo tras el grupo 8.
- `/opsx:archive` tras el merge: añade los requisitos de pantalla a `openspec/specs/validation/spec.md`, después de los de #9.
