# Tasks — settlements-browse

Issue #64 (lista de Settlements de la cuenta). Rama: `feat/settlements-browse`, desde `feature/entrega-2-MVP`. Solo lectura: sin migraciones, sin cambios de esquema, sin escrituras nuevas. Referencias: `specs/settlement/spec.md`, `specs/accounts/spec.md` y `specs/web-shell/spec.md` (qué) y `design.md` "Contrato" y D1–D16 (cómo).

Orden test-first en cada grupo: los tests se escriben y se ven fallar (rojo) antes del código; en verde, se rompe el código a propósito una vez para comprobar que el test lo detecta, y se restaura. **Nada se ejecuta contra la base local sin turno de la persona** (el miércoles es de la sesión con revisores): turno dado el 2026-10-20; otro día, preguntar antes si sigue. Sin turno, solo tests unitarios y de componentes con MSW. Dinero siempre como texto; ninguna cifra se calcula en el navegador. Textos de interfaz en inglés y en el módulo de textos de cada pantalla; código y comentarios en inglés.

## 0. Gate de la persona

- [x] 0.1 La persona confirma los insumos 1 (filtros: las dos fechas con `dateField`, D2) y 2 (`All statuses` por defecto con los `undone` atenuados, D7) del proposal; design, spec y tareas actualizados. Verificación: proposal con la respuesta anotada en "Insumos" y `openspec validate settlements-browse --type change --strict` en verde
- [x] 0.2 Commit: `docs(openspec): proposal settlements-browse`

## 1. Esquemas compartidos (Contrato)

- [x] 1.1 Test (rojo) en `packages/shared/src/settlement-reads.test.ts`:
  - `AccountSettlementsQuery`: sin nada → `page = 1`, `pageSize = 50`, `dateField = settlementDate`; `page`/`pageSize` como texto se coercen; `status` `processed`/`paid`/`undone` válidos y `settled` no; `dateField` `settlementDate`/`processedAt` válidos y `createdAt` no; `from`/`to` `2026-10-24` válidas, `24/10/2026` y `2026-02-30` no; `from = to` válido y `from > to` no; `pageSize = 501` y un parámetro desconocido no;
  - `AccountSettlementsPage` y `AccountSettlement`: un ejemplo con `amountPayable` `"33771.3600"`, `settlementDate` `null` y `channels` `null` pasa; `amountPayable` como número, `processedAt` sin `Z` o `status` desconocido no
- [x] 1.2 Implementar los tres esquemas en `settlement-reads.ts` (exportados desde `index.ts`) según "Contrato" del design; verificar 1.1 en verde y `pnpm --filter @recon/shared test`; romper a propósito el `superRefine` de `from ≤ to` y ver fallar su caso; restaurar
- [x] 1.3 Commit: `test(shared): esquemas de los settlements de una cuenta` y `feat(shared): consulta y página de los settlements de una cuenta`

## 2. Servicio y ruta del backend (D1, D3, D5)

- [x] 2.1 Test (rojo) en `settlement-read-service.test.ts` con el falso en memoria (`__fakes__/in-memory-reads.ts`, ampliado con `accountSettlements`): cuenta inexistente o fuera del alcance → `NotFoundError('Account')` idéntico; la página lleva `accountId`, `page`, `pageSize`, `total` y los intentos tal como los da el puerto
- [x] 2.2 Test (rojo) en `settlement-read-routes.test.ts` con `inject`: `200` con la página para `analyst` y para `viewer` (sin permiso propio); `401 unauthorized` sin token; el mismo `404 not_found` "Account not found" para una cuenta de otro merchant y una inexistente; `400 validation_error` para `accountId` no UUID, `status=settled`, `dateField=createdAt`, `from=24/10/2026`, `from > to` y `pageSize=501`; `dateField=processedAt` llega al servicio tal cual
- [x] 2.3 Implementar `SettlementQueries.accountSettlements` (puerto), `SettlementReadService.accountSettlements` y la ruta `GET /accounts/:accountId/settlements` en `settlementReadRoutes`, con `summary` y `description` en inglés; verificar 2.1 y 2.2 en verde, `pnpm lint` y `pnpm typecheck`; romper a propósito el `NotFoundError` (devolver página vacía) y ver fallar el caso de otro merchant; restaurar
- [x] 2.4 Regenerar el contrato con `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`, y verificar `pnpm openapi:check` en verde con la ruta nueva en `docs/openapi.yaml` y `schema.gen.ts`
- [x] 2.5 README §4.4: la fila de `GET /accounts/{id}/settlements` en negrita con ✅, con filtros (`dateField` y los días de D2), orden, paginación y errores en minúsculas, como las filas de #12; verificar que la fila coincide con "Contrato" del design
- [x] 2.6 Commit: `test(settlement): lectura de los settlements de una cuenta` y `feat(settlement): GET /accounts/{id}/settlements con filtros y paginación`

## 3. Consulta contra la base (D1–D4) — con turno de base

**No empezar sin turno de base de la persona** (dado el 2026-10-20). Mientras, se puede seguir con los grupos 4 en adelante contra MSW.

- [x] 3.1 La persona prepara la base con `! pnpm db:up`, `! pnpm db:migrate` y `! pnpm db:seed`, y confirma el turno
- [x] 3.2 Test (rojo) en `backend/test/integration/account-settlements.int.test.ts` (proyecto `integration`, que solo recoge `test/integration/**/*.int.test.ts`; `prisma-settlement-queries.test.ts` es el unitario con Prisma falso) sobre el seed:
  - ProviderA-USD sin filtros → `total = 22`, del 122 al 101, todos `paid`/`settled`, intento 1, `approvedBy.userName = analyst`, `settlementDate` `YYYY-MM-DD`, `amountPayable` con cuatro decimales y `channels` como el texto guardado;
  - la suma de los `total` con `status=paid` de las cinco cuentas es 68;
  - `status=processed` → vacío; `from = to = settlementDate` del 122 → solo el 122; solo `from` del 112 → del 112 al 122;
  - páginas 1–3 con `pageSize = 10` → 10, 10 y 2 sin repetir, y repetir una devuelve lo mismo;
  - un intento con `settlementDate = null` creado en el test sale sin filtros y no con `from`;
  - `dateField=processedAt` con `from = to` = día ET del `processedAt` del 122 → solo el 122;
  - intentos creados en el test con `processedAt` `2026-10-21T03:59:59Z` y `2026-10-21T04:00:00Z`: `dateField=processedAt` con el día `2026-10-20` → solo el primero y con `2026-10-21` → solo el segundo;
  - cambio de hora: `2026-11-02T04:30:00Z` y `2026-11-02T05:00:00Z` → `2026-11-01` solo el primero y `2026-11-02` solo el segundo;
  - cuenta de ProviderC-Alt con el alcance de `viewer` → `null`
- [x] 3.3 Implementar `PrismaSettlementQueries.accountSettlements` (alcance en el `where` de la cuenta; filtros `Prisma.sql` con la expresión de fecha de un mapa cerrado por `dateField`, `COUNT(*)` y página de ids con `OFFSET/FETCH` en el orden de D3, `findMany` con el `select` del contrato; `settledStatusOf`, `toMoney`, día de `settlementDate` sin convertir); verificar 3.2 en verde con `pnpm --filter @recon/backend test:integration`; romper a propósito el orden (`asc`) y ver fallar el caso del 122 al 101, filtrar `settlementDate` con la expresión de `processedAt` y ver fallar "solo el 122", y usar un desfase fijo `-04:00` en vez de `AT TIME ZONE` y ver fallar el cambio de hora; restaurar. Dejar los datos creados por el test limpios al terminar
- [x] 3.4 Commit: `test(settlement): consulta de los settlements de una cuenta contra el seed` y `feat(settlement): consulta Prisma de los settlements de una cuenta`

## 4. Contrato del frontend y API falso (D12, D13)

- [x] 4.1 Test (rojo) en `test/msw/settlements.test.ts`, solo de lo que el falso modela: `seedAccountSettlements` devuelve los intentos paginados por `page`/`pageSize` con `total`, sin filtrar por `status`/`dateField`/`from`/`to` ni reordenar, y registra la consulta; un intento creado por Process aparece primero en su cuenta; `seedMovements` pagina por ciclo; `viewer` con una cuenta o un batch de ProviderC-Alt → `404`; `respondNextSettlement('accountSettlements', 400 validation_error)` devuelve lo guionizado; cada fixture pasa `safeParse` con `AccountSettlementsPage` y `SettlementTransactionsPage` de `@recon/shared`
- [x] 4.2 Añadir a `features/settlements/contract.ts` los alias `Dated<>` (`AccountSettlementsPage`, `AccountSettlement`, `SettlementTransactionsPage`, `SettlementMovement`, `AppliedFee`), `eventDate` y `expectedReserveReleaseAt` en `BusinessKey`, y las llamadas `getAccountSettlements` y `getSettlementTransactions` con el cliente generado; las dos lecturas y sus fixtures en `test/msw/settlements.ts`; verificar 4.1 en verde, `pnpm typecheck` y los tests existentes de `features/settlements` sin tocarlos; romper a propósito el `slice` de la paginación y ver fallar 4.1; restaurar
- [x] 4.3 Comprobar con Grep que `test/msw/settlements.ts` no compara `settlementDate` ni `status` para filtrar, y que las rutas `/accounts/:id/settlements` y `/settlements/:id/transactions` solo aparecen en `contract.ts` y en el falso; anotarlo en el PR
- [x] 4.4 Commit: `test(frontend): API falso de los settlements de una cuenta y de los movimientos` y `feat(frontend): contrato de la lista de settlements y de los movimientos`

## 5. Llegar a la lista: selector, ruta, menú y Accounts (D6, D7, D8)

- [x] 5.1 Test (rojo) `features/settlements/SettlementList.access.test.tsx` con "llegar a la lista": desde el menú, título, migas `Dashboard › Settlements › Settlement List`, selectores y `Choose an account to see its settlements.` sin ninguna petición de settlements; un merchant con un proveedor preseleccionados y en la dirección; `/settlements?accountId=<ProviderA-USD>` completa merchant y proveedor; `viewer` con ProviderC-Alt → cuenta no disponible sin lista; una cuenta cerrada se puede elegir
- [x] 5.2 Test (rojo) de los deltas de `web-shell` y `accounts`: en `app/layout/AppLayout.test.tsx` (o el test de navegación existente), Settlement List como enlace para `viewer`, `analyst` y `admin` y activa en `/settlements?accountId=…&status=paid`; en `features/accounts/AccountsPage.test.tsx`, `Settlements of ProviderA-USD` lleva a la lista con la cuenta elegida, también en una cuenta cerrada. Ajustar el escenario `admin` existente a "Dashboard, New Reconciliation, Settlement List y Accounts"
- [x] 5.3 Mover `useAccountChoice` y `AccountPicker` a `features/accounts/account-choice.ts(x)` con `{ search, navigate, includeClosed }` (D6) y adaptar New Reconciliation; verificar que los tests de `NewReconciliationPage.test.tsx` y `validate-search.test.ts` pasan **sin modificarlos**
- [x] 5.4 Implementar `settlementListRoute` (`/settlements`, `validateSearch`, migas), `SettlementListPage` con el selector y el estado vacío, `to: '/settlements'` en `nav-config.ts` y la columna de enlace en `ProviderAccounts.tsx`; verificar 5.1 y 5.2 en verde; romper a propósito `includeClosed` y ver fallar la cuenta cerrada; restaurar
- [x] 5.5 Commit: `test(frontend): llegada a Settlement List desde el menú y desde Accounts`, `refactor(frontend): selector de cuenta compartido entre New Reconciliation y Settlement List` y `feat(frontend): ruta de Settlement List, entrada del menú y enlace desde Accounts`

## 6. Lista: columnas, filtros, paginación y errores (D7, D9, D14)

- [x] 6.1 Test (rojo) `features/settlements/SettlementList.test.tsx` con "columnas", "filtros y paginación", "abrir el Settlement Summary" y "carga y errores":
  - fila del 122 con `122`, `1`, `Paid`, fecha `ET`, `analyst` con el instante en ET (con `process.env.TZ` distinta de Nueva York), importe con separador de miles alineado a la derecha y canales; `settlementDate = null` → `Not set`; `"123456789012345.1234"` → `123,456,789,012,345.1234`; un `undone` atenuado con su estado;
  - `Paid` → consulta `status=paid&page=1` y dirección; **From**/**To** enviadas tal cual y sin `dateField`; **Date** `Processed (ET)` → `dateField=processedAt` en la consulta y en la dirección, y sigue elegida al recargar; **From > To** → error en el campo y ninguna petición; cambiar un filtro en la página 2 vuelve a la 1;
  - 22 intentos con 20 por página → **Next** → `Page 2 of 2 · 22 settlements`, 102 y 101, **Next** deshabilitado con `This is the last page.` por `aria-describedby`;
  - sin resultados → `No settlements match these filters.`; error → `The settlements could not be loaded.` con **Retry** y los filtros en la dirección; `404` → cuenta no disponible;
  - `Batch 122 · attempt 1` lleva a `/settlements/<batchId>` y ve `Paid`
- [x] 6.2 Implementar `SettlementsTable.tsx`, `SettlementFilters.tsx`, `accountSettlementsQuery` en `queries.ts` (`keepPreviousData`), `SETTLEMENTS_PAGE_SIZE = 20` y los textos en `strings.ts`; invalidar `['accounts', accountId, 'settlements']` en `useProcessSettlement` con un caso nuevo en `process.test.tsx` (procesar y volver a la lista → el intento nuevo primero); verificar 6.1 en verde; romper a propósito el importe con `Number()` y ver fallar el de 15 dígitos, y quitar `page = 1` al filtrar y ver fallar su caso; restaurar
- [x] 6.3 Commit: `test(frontend): columnas, filtros y paginación de Settlement List` y `feat(frontend): tabla de Settlement List con filtros y paginación en la dirección`

## 7. Settlement Summary: pestaña Movements y vuelta a la lista (D8, D10, D11)

- [x] 7.1 Test (rojo) `features/settlements/SummaryMovements.test.tsx` con "pestaña Movements" y "volver a la lista":
  - pestañas **Summary** y **Movements**; Summary sin cambios (los tests existentes del Summary siguen en verde sin tocarlos);
  - **Movements** → `type=E&page=1`, ciclos `E (450)`, `I (10)`, `R (320)` desde `view.movements` y `Page 1 of 9 · 450 movements`; ninguna petición de movimientos mientras la pestaña no está activa;
  - `I` → `type=I&page=1`, estado, ronda y `feeAmount`, y el desglose `N fees` con `title · amountUsd`; `excludeAmount` → `excluded from the totals`;
  - `eventDate = null` → `Undated`; `sheetId = null` → `—`; `settled` → `Settled` / `Pending payment`; `eventDate` en ET sin convertir con otra `TZ`;
  - recargar `?tab=movements&cycle=R&page=2` → Movements, `R`, página 2; error → `The movements could not be loaded.` con **Retry** y Summary disponible;
  - **Settlements of ProviderA-USD** → `/settlements?accountId=<ProviderA-USD>`
- [x] 7.2 Implementar `validateSearch` de `settlementSummaryRoute`, las pestañas **Summary** | **Movements** en `SettlementSummaryPage.tsx` (no hizo falta un `SummaryTabs.tsx` aparte), `SummaryMovements.tsx`, `settlementTransactionsQuery` y el enlace del pie, con los textos en `strings.ts`; verificar 7.1 en verde; romper a propósito el contador de un ciclo con `query.data.total` del ciclo activo (contaría solo uno) y ver fallar "ciclos desde la vista", y `formatBusinessDate` por `formatAuditDateTime` en `eventDate` (no compila: anotarlo); restaurar
- [x] 7.3 Commit: `test(frontend): pestaña Movements del Settlement Summary` y `feat(frontend): movimientos E/I/R del intento en solo lectura y vuelta a la lista`

## 8. Solo lectura, teclado y anchura (spec "solo lectura" y "teclado y motivos")

- [x] 8.1 Test (rojo) en `features/settlements/read-only.test.tsx`: `viewer` recorre la lista de ProviderA-USD, el batch 122 y su Movements; ve lo mismo que `analyst`, sin pagar, retirar el pago, deshacer ni exportar la lista, y el registro del falso solo tiene `GET`
- [x] 8.2 Test (rojo) en `features/settlements/keyboard.test.tsx`: con Tab, flechas, Enter y Espacio, elegir cuenta, estado, **Date** y fechas, cambiar de página, abrir un batch, pasar a Movements, cambiar de ciclo y abrir un desglose; **Previous**/**Next** deshabilitados con su motivo
- [x] 8.3 Ajustar lo que 8.1 y 8.2 descubran y verificar en verde; romper a propósito el `aria-describedby` de **Next** y ver fallar 8.2; restaurar. La revisión a 1280 y 1024 px necesita datos reales y queda en el grupo 9
- [x] 8.4 Verificar `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @recon/frontend build` en verde y `openspec validate settlements-browse --type change --strict` sin avisos. Cierre (criterio de la persona, 2026-10-20): `pnpm test` con las tres suites en paralelo da timeouts de ~5 s en tests del backend ya existentes (validaciones, OpenAPI, health), distintos en cada ejecución; no se tocan tiempos en este change. Verde: lint, typecheck, build, `openspec validate`, y cada paquete por separado (backend 1022, frontend 501, shared 196); falta el CI del PR. Repetido tras 9.10, con las cifras actuales: lint, typecheck, build, `openspec validate --strict` y cada paquete en verde (backend 1022 y 3 omitidos, frontend 503, shared 196). Ningún test nuevo mostró el patrón de #56, así que no se comenta allí
- [x] 8.5 Commit: `test(frontend): solo lectura y teclado en Settlement List y Movements` y `fix(frontend): accesibilidad de Settlement List y Movements`

## 9. API real con el seed, Bruno y capturas — con turno de base (D16)

**No empezar sin turno de base de la persona.**

- [x] 9.1 La persona prepara la base con `! pnpm db:up`, `! pnpm db:migrate` y `! pnpm db:seed`, y levanta `! pnpm dev`
- [x] 9.2 Colección Bruno (a mano, sin reimportar): en `10-smoke`, `Account settlements` (`analyst`, ProviderA-USD: `200`, `total ≥ 22`, `processedAt` descendente, `amountPayable` como texto), `Account settlements - viewer out of scope` (`as: viewer`, `{{viewerToken}}`, ProviderC-Alt → `404` `not_found`), `Account settlements - bad range` (`from > to` → `400` `validation_error`), `Account settlements - processed date` (`dateField=processedAt&from=2000-01-01` → `200` con los 22), `Account settlements - bad date field` (`dateField=createdAt` → `400` `validation_error`) y `Account settlements - no token` (`selfAuth: true` sin `Authorization` → `401` `unauthorized`); en `20-flows/settlements/batch-clean`, `18 Account settlements` (`status=processed` → el batch 123 primero, `pending_payment`) y `18b Account settlements` (sin filtro de estado → los dos primeros son `[123, 122]`, añadido tras el verify). Verificar `pnpm test:api:smoke` y `pnpm test:api` en verde
- [x] 9.3 Prueba manual contra el API real como `analyst` y `viewer`: las cinco cuentas con `Paid` suman 68; ProviderA-USD en dos páginas (20 + 2); filtros de estado y fechas, con **Date** en `Settlement date` y en `Processed (ET)`; abrir el 122 (`Paid`, sin aviso de no Settled) y su Movements E / I / R (`—` en la fila de origen, `Settled`); procesar `batch-clean` (o usar el que procese el script de 9.5), volver a la lista y ver el 123 primero con `Processed · pending payment`, y su Movements con fila de origen y `Pending payment`; `viewer` con ProviderC-Alt por enlace → no disponible. Contrastar la forma real con las fixtures del falso y ajustarlas si difieren; anotar cualquier diferencia en el PR
- [x] 9.4 Escribir `e2e/screenshots/settlements-browse.ts` y el comando raíz `pnpm screenshots:settlements-browse` con las protecciones de `web-settlement` (credenciales por `process.loadEnvFile` sin leer ni imprimir el `.env`, contraseña vaciada tras el login, sin trace ni vídeo, `headless: false`, ninguna captura del login ni antes de cargar), con la comprobación de desplazamiento horizontal y de tablas recortadas a 1280 y 1024 px. Verificar con `pnpm test:e2e --list` que el smoke no lo recoge y que ningún workflow de `.github/` lo llama. El script solo lee: no procesa `batch-clean`, sino que exige el batch 123 que ya dejó `pnpm test:api` y se detiene con un mensaje si no está
- [x] 9.5 **Avisar a la persona antes de ejecutarlo.** Con su visto bueno, `pnpm screenshots:settlements-browse` deja en `docs/wireframes/settlements-browse/` `settlement-list.png`, `settlement-list-1024.png`, `settlement-movements-e.png` y `settlement-movements-i.png`, y la consola dice que no hay desplazamiento horizontal ni tablas recortadas. Revisar cada PNG antes de versionarlo (ninguna credencial, ninguna pantalla de login). Después, la persona vuelve a sembrar con `! pnpm db:seed` (hecho tras la tercera pasada, la que se versionó en `b1fee1d`)
- [x] 9.10 Corregir los anchos que midió la primera pasada de 9.5 (insumo de la persona del 2026-10-20: opciones 1 + 2). Tests primero, en `SettlementList.test.tsx` (encabezados, estado, Processed y Channels con `whitespace-normal`, el importe en `whitespace-nowrap`, los canales con un `<wbr>` tras cada coma y el texto intacto) y en `SummaryMovements.test.tsx` (nueve columnas con **Reserves**, una línea con su etiqueta por cifra y `Expected release`, importes e ID en `whitespace-nowrap`). Rotura a propósito en cada uno: sin `<wbr>` y con el importe sin `whitespace-nowrap`. D9, D11 y los escenarios "Lista a 1024 px", "Reservas en una columna" y "Movimientos a 1024 px" actualizados. La segunda pasada de 9.5 midió `false` en todo, pero mostró los canales y las fechas partidos en un guion (`RAM-` / `07`, `2026-` / `10-21`): cada nombre de canal y cada fecha de la lista van en `whitespace-nowrap`, con su test primero y la rotura a propósito (sin el `whitespace-nowrap` del nombre)
- [x] 9.6 Verificar que el smoke E2E sigue en verde con `pnpm test:e2e`
- [x] 9.7 Línea de las capturas en `docs/wireframes/README.md` y registro del change en `prompts.md`
- [x] 9.8 Descripción del PR con la plantilla: §1.3, §4.4 y el issue (`Closes #64`), decisiones de los insumos 1 y 2, lo comprobado en 4.3, las capturas y que pagar, retirar el pago y deshacer quedan para el tramo 6. No crear ni mover issues desde la sesión
- [x] 9.9 Commit: `test(api): colección Bruno de los settlements de una cuenta`, `chore(e2e): script de capturas de Settlement List y Movements fuera del smoke y de CI` y `docs(settlement): capturas de Settlement List y Movements y registro en prompts.md`

## Workflow follow-up

- `/opsx:verify` para contrastar implementación y artifacts.
- PR desde `feat/settlements-browse` hacia `feature/entrega-2-MVP`, con CI verde.
- `/opsx:archive` tras el merge: añade los requisitos a `openspec/specs/settlement/spec.md` y `openspec/specs/accounts/spec.md` y aplica los MODIFIED de `settlement` y `web-shell`.
