# Tasks — admin-accounts

Rama `feat/admin-accounts`. Las decisiones D1–D10 están en `design.md`; los escenarios, en las delta specs.

## 1. Contrato en `@recon/shared` y export de OpenAPI

- [x] 1.1 Escribir en `packages/shared/src/catalog.test.ts` los esquemas de D2 y comprobar que falla porque los exports no existen. Debe cubrir:
  - `AccountCreate`: nombre con espacios de borde recortado; vacío tras recortar o de 51 caracteres, rechazado; política desconocida, rechazada; tope como string, `null` u omitido; tope numérico (`25000`), rechazado; campo desconocido (`color`), rechazado.
  - `AccountPatch`: cualquier subconjunto; `{}` y `{ reason }` solos, rechazados; `providerId` y `copyFeesFromAccountId`, rechazados; `reason` recortado, 1–500.
  - `AccountDetail` con `createdBy` y `updatedAt`; `assignedInBatchNo` entero o `null` en `AccountChannelItem` y `ChannelAccountItem`; `ChannelListItem` con `primaryAccount` `AccountRef` o `null`; `MatchingRuleSetSummary`.
- [x] 1.2 Commit: test(shared): contrato de la administración de cuentas
- [x] 1.3 Implementar los esquemas en `packages/shared/src/catalog.ts` (y `MatchingRuleSetSummary` donde vivan los tipos de pareo) y exportarlos desde `index.ts`. Verificar con `pnpm --filter @recon/shared test` y `pnpm typecheck`.
- [x] 1.4 Ampliar las lecturas ya existentes para que cumplan el contrato nuevo (D8): `createdBy` y `updatedAt` en `findAccount`; `assignedInBatchNo` en `listAccountChannels` y `listChannelAccounts`; `primaryAccount` en `listChannels` (oculto fuera del alcance); el doble en memoria `catalog/application/__fakes__/in-memory.ts` igual. Cambiar la respuesta de `GET /channels` a `z.array(ChannelListItem)`. Verificar con `catalog-service.test.ts`, `catalog-routes.test.ts` y `test/integration/catalog.int.test.ts`, añadiendo los escenarios MODIFIED de la delta de `accounts` ("Quién creó la cuenta", "Cuenta principal de cada canal", "Principal de otro merchant oculta", "Asociación sin batch", "Número de batch de la asociación").
- [x] 1.5 Crear el módulo `backend/src/modules/accounts` (D1) con `accounts-module.ts` y `http/account-admin-routes.ts` declarando `POST /providers/:providerId/accounts` y `PATCH /accounts/:accountId` (D10), y el módulo `matching-module.ts` con `GET /providers/:providerId/matching-rule-sets` (D8). Registrar los dos en `app.ts`. Los handlers provisionales responden `501 not_implemented`. Verificar con un test de rutas que cubra `401`, `403` de `analyst` antes que el alcance y `400` de esquema (`providerId` en el `PATCH`, nombre vacío).
- [x] 1.6 Ejecutar `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`; ampliar `app.test.ts` con las rutas nuevas y los fixtures de MSW (`frontend/src/test/msw/fixtures.ts`: `createdBy`, `updatedAt`, `assignedInBatchNo`, `primaryAccount`) solo para el contrato. Verificar con `pnpm openapi:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test`.
- [x] 1.7 Actualizar README §4.4: filas de `POST /providers/{id}/accounts`, `PATCH /accounts/{id}`, `GET /channels` (`primaryAccount`), `GET /accounts/{id}/channels` y `GET /channels/{id}/accounts` (`assignedInBatchNo`), `GET /providers/{id}/matching-rule-sets` (sin permiso para leer) y el `409 account_inactive` de `POST /accounts/{id}/imports`, con sus códigos de error. Verificar con `grep` que aparecen `account_name_taken` y `account_inactive`.
- [x] 1.8 Commit: feat(accounts): contrato de la administración de cuentas y export de OpenAPI
- [x] 1.9 Hacer `git push` de `feat/admin-accounts` y avisar a la persona de que el contrato está publicado, porque `web-admin-accounts` parte de aquí. No seguir hasta su confirmación.

## 2. Dominio de cuentas y plan de copia (TDD)

- [x] 2.1 Escribir `accounts/domain/account-rules.test.ts` (D3) y comprobar que falla. Debe cubrir:
  - `normalizeCap`: `"25000"` → `"25000.0000"`; `null` → `null`; `"-1"` → `AccountRuleError` con `field = rollingReserveCapAmt`.
  - `planAccountPatch`: sin cambios → `changes = {}`; mismo tope con otra escala, sin cambio; renombrar solo en mayúsculas, con cambio; `isActive` false → `account.close` aunque haya otros campos, true → `account.reopen`; resto → `account.update`; `before`/`after` de cada campo con el dinero como string.
- [x] 2.2 Escribir `fees/domain/fee-copy.test.ts` (D3) y comprobar que falla. Debe cubrir: solo `active` respecto a `today` (un `scheduled` de mañana y un `closed` de ayer quedan fuera; uno que cierra hoy entra); la copia conserva valores, variantes y `description` con `startDate = endDate = null` y `feeId` nuevo; orden por `feeTypeId` y `feeId`; lista vacía si no hay activos.
- [x] 2.3 Commit: test(accounts): reglas de edición de cuenta y plan de copia de fees
- [x] 2.4 Implementar `account-rules.ts`, `accounts/domain/errors.ts` (`AccountRuleError`, `AccountNameTakenError`) y `fee-copy.ts` hasta dejar los tests en verde. Rotura deliberada: hacer que `planCopy` copie también los `scheduled` debe hacer fallar su caso; después se revierte.
- [x] 2.5 Commit: feat(accounts): reglas de edición de cuenta y plan de copia de fees como funciones puras

## 3. Crear y editar cuentas

- [x] 3.1 Escribir `accounts/application/account-admin-service.test.ts` con un repositorio en memoria en `__fakes__` (D4) y comprobar que falla. Debe cubrir los escenarios de "Crear una cuenta", "Nombre de cuenta único en todo el sistema" (salvo el concurrente), "Conjunto de reglas de una cuenta", "Editar una cuenta", "Cerrar y reabrir una cuenta", "Auditoría de cuentas" y "Copia de fees al crear cuenta" (salvo el concurrente): orden de los pasos de D4, `404` de proveedor y cuenta, `400` con `details.field` y sin escrituras, y cuerpo sin cambios sin auditoría.
- [x] 3.2 Escribir `test/integration/account-admin.int.test.ts` contra la base local con los mismos escenarios por HTTP y comprobar que falla. Cuentas `it-acc-<n>`; un `afterEach` borra en orden `AuditLog`, `FeeHistory`, `Fee`, `Import` y `Account` de esas cuentas (D9). Incluye "providerc-usd" (intercalación, D5), "Copia de los cinco fees de ProviderC-USD", "Historial de la copia" vía `GET /fees/{id}/history`, "Cuenta origen cerrada" (cerrando una cuenta `it-acc-` con fees) y "Canales de solo lectura" (`AccountChannel` intacto tras crear, editar y cerrar).
  - La 3.2 no se ejecutó en rojo antes de implementar porque no había turno de base. Se compensó en el turno del grupo 4: sin la escritura de la fila `copied` en la creación, `account-admin.int.test.ts` falla ("writes one copied history row per copy…": `expected [] to have a length of 1 but got +0`). Después se restauró, Grep confirmó que no quedaba rastro y el fichero volvió a 23/23.
- [x] 3.3 Commit: test(accounts): crear y editar cuentas con copia de fees y auditoría
- [x] 3.4 Escribir el historial `copied` desde la unidad de cuentas reutilizando los ayudantes del repositorio de fees (D4). Implementar `PrismaAccountAdminRepository` (`inProvider`, `inAccount` con `UPDLOCK, HOLDLOCK`, `lockSourceAccount`, `retryOnDeadlock`, respaldo de `Account_name_key` por número de error, D5) y `AccountAdminService.create`/`.patch`, respondiendo con `CatalogService.getAccount`. Conectar las rutas del grupo 1 y quitar sus `501`. Verificar con 3.1, 3.2 y `pnpm test`.
- [x] 3.5 Escribir los tests de concurrencia con compuertas, como `fee-concurrency.int.test.ts`:
  - "Dos altas simultáneas con el mismo nombre": `201` y `409 account_name_taken`, una sola cuenta. Quitar la comprobación previa debe hacer que el respaldo del índice siga dando `409` (no `500`); después se revierte.
  - "Copia y cambio de fee simultáneos": con la copia retenida tras bloquear la cuenta origen, un `PATCH /fees/{id}` con `effectiveFrom` sobre ella espera; la cuenta nueva no tiene dos fees del mismo tipo. Quitar `lockSourceAccount` debe hacer fallar el test; después se revierte.
- [x] 3.6 Actualizar README §1.2 (catálogo: nombre único en todo el sistema; cuenta cerrada sin imports nuevos; renombrar cambia el nombre de los exports al vuelo), §3.2 (`Account`: `UNIQUE` global sin distinguir mayúsculas; acciones `account.create`, `account.update`, `account.close`, `account.reopen` en `AuditLog`; copia con `FeeHistory copied` y pares en `account.create`) y §1.5 (se quita el recorte de cuentas y canales de #80; las reglas de pareo siguen pendientes en `admin-matching`). Verificar con `grep` que §1.5 ya no lista "Administración de cuentas, canales".
- [x] 3.7 Commit: feat(accounts): crear, editar, cerrar y reabrir cuentas con copia de fees

## 4. Cuenta cerrada en imports y conjuntos de reglas del proveedor

- [x] 4.1 Escribir los escenarios de "Cuenta cerrada no admite imports nuevos" en `import-service.test.ts` (con el doble en memoria) y en `test/integration/imports.int.test.ts`, y comprobar que fallan. Incluye que no quede nada en `UPLOAD_DIR` y que el listado, el pareo y el análisis de un import abierto sigan funcionando tras cerrar la cuenta.
  - Unitario en rojo por la aserción: `expected … to be an instance of AccountInactiveError`. La clase del error entra con los tests porque es el contrato que comprueban. Los escenarios "import abierto de una cuenta que se cierra" y "reabrir" pasan ya: protegen de regresiones.
  - El `404` con permiso y sin el merchant se cubre en el unitario: el seed no tiene ningún usuario con `settlement.process` y sin el merchant 2.
  - La integración se ejecuta en el turno de base de la 4.4.
- [x] 4.2 Escribir los escenarios de "Conjuntos de reglas de un proveedor" en un test de rutas de `matching` y en `test/integration/matching-rule-sets.int.test.ts`, y comprobar que fallan.
  - El test de rutas falla al cargar porque aún no existe `RuleSetReadService`. El puerto y el doble en memoria entran con los tests.
  - La integración se ejecuta en el turno de base de la 4.4. Añade un conjunto inactivo `it-rs-` y lo borra al terminar.
- [x] 4.3 Commit: test(imports): cuenta cerrada y conjuntos de reglas del proveedor
- [x] 4.4 Implementar D7: `isActive` en `AccountRef` del repositorio de imports y del doble, `AccountInactiveError` (`409 account_inactive`) comprobado en `createImport` dentro de `withStaged`. Implementar D8 para `GET /providers/{id}/matching-rule-sets` y quitar su `501`. Verificar con 4.1, 4.2 y `pnpm test`. Ejecutar `pnpm openapi:check`: si el contrato cambió respecto al grupo 1, regenerar y avisar a la persona.
  - Integración de 4.1 y 4.2: 17/17 en verde. Integración completa: 416 en verde y 8 omitidos. Los `afterAll` comprueban que no quedan cuentas `it-acc-` ni conjuntos `it-rs-`.
  - El contrato solo cambia en que `GET /providers/{id}/matching-rule-sets` ya no documenta el `501`; OpenAPI y `schema.gen.ts` regenerados. `NotImplementedError` eliminado.
  - Unitarios del backend: 1219 en verde. Dos timeouts de 5 s al arrancar la app (`app.test.ts` health y `export-openapi.test.ts`) pasan aislados: carga local, anotada para el PR.
- [x] 4.5 Commit: feat(imports): cuenta cerrada sin imports nuevos y conjuntos de reglas del proveedor

## 5. Tests robustos ante cuentas de la colección

- [x] 5.1 Añadir el ayudante `seedAccounts()` (sin las de prefijo `bruno-`) a `test/integration/helpers.ts` y usarlo en `catalog.int.test.ts` (líneas 113–121, 225–240, 275) y en cualquier otro test que liste cuentas exactas: buscar con Grep `ProviderA-EUR', 'ProviderA-USD`, `toHaveLength` sobre cuentas y nombres de cuentas del seed en `backend/test`. Verificar insertando a mano en la prueba una cuenta `bruno-` temporal (y borrándola) que los tests siguen en verde, escenario "Cuentas de la colección presentes".
  - Las únicas listas exactas de cuentas estaban en `catalog.int.test.ts`. La cuenta `bruno-` temporal no se inserta a mano una sola vez: el `beforeAll` crea una cerrada en Provider C y el `afterAll` la borra, así que el escenario se comprueba en cada ejecución.
  - Resultado: 35/35 sobre la base recién sembrada y otra vez 35/35 con las dos cuentas `bruno-` reales que dejaron las pasadas de la 6.3.
- [x] 5.2 Commit: test(catalog): las listas de cuentas del seed ignoran las cuentas bruno-

## 6. Colección Bruno

- [x] 6.1 Añadir a `10-smoke` las peticiones de D9 (`Create account - analyst`, `Create account - unknown provider`, `Patch account - viewer`, `Patch account - unknown`, `Patch account - providerId`, `Matching rule sets`, `Matching rule sets - viewer out of scope`), cada una con su código de estado y `code`. Ninguna escribe.
- [x] 6.2 Añadir `20-flows/accounts/` con la secuencia 1–8 de D9 en Provider C, con `admin` (`as: admin`, `{{adminToken}}`) y la subida con `analyst`, y el nombre `bruno-<id>` derivado de la pasada. Añadir a `20-flows/catalog` una comprobación de `primaryAccount` en `GET /channels` y de `assignedInBatchNo` en `5 Account channels`.
  - El paso 8 de D9 ("Reopen and close") son dos peticiones: `8 Reopen` y `9 Close again`. El paso 2 repite el nombre en mayúsculas, que además comprueba la unicidad sin distinguir mayúsculas.
  - En `20-flows/catalog`, `4 Account detail` comprueba también `createdBy` y `updatedAt`. El paso nuevo `6 Channels` exige RAM-01 → ProviderA-USD y, para RAM-07, `null` o ProviderA-USD: batch-clean se lo asigna en la primera pasada (#111). `5 Account channels` comprueba que `assignedInBatchNo` es un número positivo, no un valor exacto.
- [x] 6.3 La persona ejecuta `! pnpm test:api` con `pnpm dev` levantado. Verificar que todo lo de cuentas (`10-smoke` de cuentas y conjuntos, `20-flows/accounts` y los cambios de `20-flows/catalog`) pasa dos veces seguidas sin `db:seed` entre medias, y que tras esas dos pasadas `pnpm test` sigue en verde. Los fallos conocidos de #111 se anotan, no se arreglan aquí.
  - **Primera pasada:** 213/213 peticiones y 225/225 tests.
  - **Segunda pasada:** todo lo de cuentas pasa. Los fallos son los de #111:
    - `10-smoke/Channels unassigned` (RAM-07 ya asignado);
    - `20-flows/imports/13 Analyze` (RAM-07 asignado);
    - la cadena de `20-flows/settlements/batch-clean`, del paso 6 al 30 (batch 123 ya consumido).
  - **`pnpm test` después de las dos pasadas:**
    - shared 255 y frontend 811 en verde;
    - backend 1219 en verde y dos timeouts de 5 s (Argon2 y `export-openapi` "is deterministic") que pasan aislados: carga local;
    - el frontend tuvo un fallo intermitente en una primera ejecución y pasó en las dos siguientes.
  - **Integración completa tras las pasadas, sin sembrar:** pasan todos los ficheros de cuentas, catálogo, imports, matching y fees (`catalog` 35, `account-admin` 23, `account-concurrency` 2, `imports` 13, `matching-rule-sets` 4, `fee-*`, `fees`). Fallan 59 tests en 10 ficheros de settlement y validación (`settlement-*`, `account-settlements`, `validation-samples`, `validation-sources`). Todos esperan el estado de una base recién sembrada (batch 123 libre, RAM-07 sin asignar, 22 intentos pagados de ProviderA-USD) que batch-clean de Bruno consume: es #111. Sobre una base recién sembrada, la integración completa dio 416/416 en el grupo 4.
- [x] 6.4 Actualizar la sección Bruno de `CLAUDE.md`: las escrituras de cuentas usan `admin` y sus `403` usan `analyst`; el flujo `20-flows/accounts` deja una cuenta `bruno-` cerrada por pasada en Provider C hasta el siguiente `pnpm db:seed`, y los tests ignoran ese prefijo.
- [x] 6.5 Commit: test(api): colección Bruno de la administración de cuentas

## 7. Cierre

- [x] 7.1 Verificar con `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check` y `openspec validate admin-accounts --strict`.
  - Lint, typecheck (4 paquetes), `openapi:check` y `validate --strict`: limpios.
  - `pnpm test`: shared 255, backend 1219 y frontend 811 en verde. Los timeouts de 5 s por carga local (arranque de la app, `export-openapi`, Argon2) pasan aislados; criterio aprobado por la persona, el CI decide.
  - `/opsx:verify` sin críticos. Su aviso 2 se resolvió: `account-admin.int.test.ts` ("Canales de solo lectura") acepta RAM-07 sin cuenta o con ProviderA-USD (#111), como `6 Channels`.
  - Integración completa sobre una base recién sembrada, tras los grupos 5 y 6: 416 en verde y 8 omitidos.
- [x] 7.2 Commit: docs(accounts): OpenAPI y verificación final de la administración de cuentas (solo si 7.1 dejó cambios)
  - 7.1 no dejó cambios de OpenAPI ni de docs. El commit final solo lleva el test relajado y `tasks.md`, como `test(accounts)`.

## Workflow follow-up

- `/opsx:verify`, PR hacia `feature/entrega-3-MVP` con la plantilla y CI en verde, y `/opsx:archive`.
- `web-admin-accounts` parte del contrato del grupo 1: el diálogo dice "unique", no "unique per provider".
- `admin-matching` amplía `GET /providers/{id}/matching-rule-sets` en `matching` sin redefinirlo.
