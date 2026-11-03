# Tasks — admin-accounts

Rama `feat/admin-accounts`. Las decisiones D1–D10 están en `design.md`; los escenarios, en las delta specs.

## 1. Contrato en `@recon/shared` y export de OpenAPI

- [ ] 1.1 Escribir en `packages/shared/src/catalog.test.ts` los esquemas de D2 y comprobar que falla porque los exports no existen. Debe cubrir:
  - `AccountCreate`: nombre con espacios de borde recortado; vacío tras recortar o de 51 caracteres, rechazado; política desconocida, rechazada; tope como string, `null` u omitido; tope numérico (`25000`), rechazado; campo desconocido (`color`), rechazado.
  - `AccountPatch`: cualquier subconjunto; `{}` y `{ reason }` solos, rechazados; `providerId` y `copyFeesFromAccountId`, rechazados; `reason` recortado, 1–500.
  - `AccountDetail` con `createdBy` y `updatedAt`; `assignedInBatchNo` entero o `null` en `AccountChannelItem` y `ChannelAccountItem`; `ChannelListItem` con `primaryAccount` `AccountRef` o `null`; `MatchingRuleSetSummary`.
- [ ] 1.2 Commit: test(shared): contrato de la administración de cuentas
- [ ] 1.3 Implementar los esquemas en `packages/shared/src/catalog.ts` (y `MatchingRuleSetSummary` donde vivan los tipos de pareo) y exportarlos desde `index.ts`. Verificar con `pnpm --filter @recon/shared test` y `pnpm typecheck`.
- [ ] 1.4 Ampliar las lecturas ya existentes para que cumplan el contrato nuevo (D8): `createdBy` y `updatedAt` en `findAccount`; `assignedInBatchNo` en `listAccountChannels` y `listChannelAccounts`; `primaryAccount` en `listChannels` (oculto fuera del alcance); el doble en memoria `catalog/application/__fakes__/in-memory.ts` igual. Cambiar la respuesta de `GET /channels` a `z.array(ChannelListItem)`. Verificar con `catalog-service.test.ts`, `catalog-routes.test.ts` y `test/integration/catalog.int.test.ts`, añadiendo los escenarios MODIFIED de la delta de `accounts` ("Quién creó la cuenta", "Cuenta principal de cada canal", "Principal de otro merchant oculta", "Asociación sin batch", "Número de batch de la asociación").
- [ ] 1.5 Crear el módulo `backend/src/modules/accounts` (D1) con `accounts-module.ts` y `http/account-admin-routes.ts` declarando `POST /providers/:providerId/accounts` y `PATCH /accounts/:accountId` (D10), y el módulo `matching-module.ts` con `GET /providers/:providerId/matching-rule-sets` (D8). Registrar los dos en `app.ts`. Los handlers provisionales responden `501 not_implemented`. Verificar con un test de rutas que cubra `401`, `403` de `analyst` antes que el alcance y `400` de esquema (`providerId` en el `PATCH`, nombre vacío).
- [ ] 1.6 Ejecutar `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`; ampliar `app.test.ts` con las rutas nuevas y los fixtures de MSW (`frontend/src/test/msw/fixtures.ts`: `createdBy`, `updatedAt`, `assignedInBatchNo`, `primaryAccount`) solo para el contrato. Verificar con `pnpm openapi:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test`.
- [ ] 1.7 Actualizar README §4.4: filas de `POST /providers/{id}/accounts`, `PATCH /accounts/{id}`, `GET /channels` (`primaryAccount`), `GET /accounts/{id}/channels` y `GET /channels/{id}/accounts` (`assignedInBatchNo`), `GET /providers/{id}/matching-rule-sets` (sin permiso para leer) y el `409 account_inactive` de `POST /accounts/{id}/imports`, con sus códigos de error. Verificar con `grep` que aparecen `account_name_taken` y `account_inactive`.
- [ ] 1.8 Commit: feat(accounts): contrato de la administración de cuentas y export de OpenAPI
- [ ] 1.9 Hacer `git push` de `feat/admin-accounts` y avisar a la persona de que el contrato está publicado, porque `web-admin-accounts` parte de aquí. No seguir hasta su confirmación.

## 2. Dominio de cuentas y plan de copia (TDD)

- [ ] 2.1 Escribir `accounts/domain/account-rules.test.ts` (D3) y comprobar que falla. Debe cubrir:
  - `normalizeCap`: `"25000"` → `"25000.0000"`; `null` → `null`; `"-1"` → `AccountRuleError` con `field = rollingReserveCapAmt`.
  - `planAccountPatch`: sin cambios → `changes = {}`; mismo tope con otra escala, sin cambio; renombrar solo en mayúsculas, con cambio; `isActive` false → `account.close` aunque haya otros campos, true → `account.reopen`; resto → `account.update`; `before`/`after` de cada campo con el dinero como string.
- [ ] 2.2 Escribir `fees/domain/fee-copy.test.ts` (D3) y comprobar que falla. Debe cubrir: solo `active` respecto a `today` (un `scheduled` de mañana y un `closed` de ayer quedan fuera; uno que cierra hoy entra); la copia conserva valores, variantes y `description` con `startDate = endDate = null` y `feeId` nuevo; orden por `feeTypeId` y `feeId`; lista vacía si no hay activos.
- [ ] 2.3 Commit: test(accounts): reglas de edición de cuenta y plan de copia de fees
- [ ] 2.4 Implementar `account-rules.ts`, `accounts/domain/errors.ts` (`AccountRuleError`, `AccountNameTakenError`) y `fee-copy.ts` hasta dejar los tests en verde. Rotura deliberada: hacer que `planCopy` copie también los `scheduled` debe hacer fallar su caso; después se revierte.
- [ ] 2.5 Commit: feat(accounts): reglas de edición de cuenta y plan de copia de fees como funciones puras

## 3. Crear y editar cuentas

- [ ] 3.1 Escribir `accounts/application/account-admin-service.test.ts` con un repositorio en memoria en `__fakes__` (D4) y comprobar que falla. Debe cubrir los escenarios de "Crear una cuenta", "Nombre de cuenta único en todo el sistema" (salvo el concurrente), "Conjunto de reglas de una cuenta", "Editar una cuenta", "Cerrar y reabrir una cuenta", "Auditoría de cuentas" y "Copia de fees al crear cuenta" (salvo el concurrente): orden de los pasos de D4, `404` de proveedor y cuenta, `400` con `details.field` y sin escrituras, y cuerpo sin cambios sin auditoría.
- [ ] 3.2 Escribir `test/integration/account-admin.int.test.ts` contra la base local con los mismos escenarios por HTTP y comprobar que falla. Cuentas `it-acc-<n>`; un `afterEach` borra en orden `AuditLog`, `FeeHistory`, `Fee`, `Import` y `Account` de esas cuentas (D9). Incluye "providerc-usd" (intercalación, D5), "Copia de los cinco fees de ProviderC-USD", "Historial de la copia" vía `GET /fees/{id}/history`, "Cuenta origen cerrada" (cerrando una cuenta `it-acc-` con fees) y "Canales de solo lectura" (`AccountChannel` intacto tras crear, editar y cerrar).
- [ ] 3.3 Commit: test(accounts): crear y editar cuentas con copia de fees y auditoría
- [ ] 3.4 Ampliar `FeeHistoryWrite.action` con `copied` (D4). Implementar `PrismaAccountAdminRepository` (`inProvider`, `inAccount` con `UPDLOCK, HOLDLOCK`, `lockSourceAccount`, `retryOnDeadlock`, respaldo de `Account_name_key` por número de error, D5) y `AccountAdminService.create`/`.patch`, respondiendo con `CatalogService.getAccount`. Conectar las rutas del grupo 1 y quitar sus `501`. Verificar con 3.1, 3.2 y `pnpm test`.
- [ ] 3.5 Escribir los tests de concurrencia con compuertas, como `fee-concurrency.int.test.ts`:
  - "Dos altas simultáneas con el mismo nombre": `201` y `409 account_name_taken`, una sola cuenta. Quitar la comprobación previa debe hacer que el respaldo del índice siga dando `409` (no `500`); después se revierte.
  - "Copia y cambio de fee simultáneos": con la copia retenida tras bloquear la cuenta origen, un `PATCH /fees/{id}` con `effectiveFrom` sobre ella espera; la cuenta nueva no tiene dos fees del mismo tipo. Quitar `lockSourceAccount` debe hacer fallar el test; después se revierte.
- [ ] 3.6 Actualizar README §1.2 (catálogo: nombre único en todo el sistema; cuenta cerrada sin imports nuevos; renombrar cambia el nombre de los exports al vuelo), §3.2 (`Account`: `UNIQUE` global sin distinguir mayúsculas; acciones `account.create`, `account.update`, `account.close`, `account.reopen` en `AuditLog`; copia con `FeeHistory copied` y pares en `account.create`) y §1.5 (se quita el recorte de cuentas y canales de #80; las reglas de pareo siguen pendientes en `admin-matching`). Verificar con `grep` que §1.5 ya no lista "Administración de cuentas, canales".
- [ ] 3.7 Commit: feat(accounts): crear, editar, cerrar y reabrir cuentas con copia de fees

## 4. Cuenta cerrada en imports y conjuntos de reglas del proveedor

- [ ] 4.1 Escribir los escenarios de "Cuenta cerrada no admite imports nuevos" en `import-service.test.ts` (con el doble en memoria) y en `test/integration/imports.int.test.ts`, y comprobar que fallan. Incluye que no quede nada en `UPLOAD_DIR` y que el listado, el pareo y el análisis de un import abierto sigan funcionando tras cerrar la cuenta.
- [ ] 4.2 Escribir los escenarios de "Conjuntos de reglas de un proveedor" en un test de rutas de `matching` y en `test/integration/matching-rule-sets.int.test.ts`, y comprobar que fallan.
- [ ] 4.3 Commit: test(imports): cuenta cerrada y conjuntos de reglas del proveedor
- [ ] 4.4 Implementar D7: `isActive` en `AccountRef` del repositorio de imports y del doble, `AccountInactiveError` (`409 account_inactive`) comprobado en `createImport` dentro de `withStaged`. Implementar D8 para `GET /providers/{id}/matching-rule-sets` y quitar su `501`. Verificar con 4.1, 4.2 y `pnpm test`. Ejecutar `pnpm openapi:check`: si el contrato cambió respecto al grupo 1, regenerar y avisar a la persona.
- [ ] 4.5 Commit: feat(imports): cuenta cerrada sin imports nuevos y conjuntos de reglas del proveedor

## 5. Tests robustos ante cuentas de la colección

- [ ] 5.1 Añadir el ayudante `seedAccounts()` (sin las de prefijo `bruno-`) a `test/integration/helpers.ts` y usarlo en `catalog.int.test.ts` (líneas 113–121, 225–240, 275) y en cualquier otro test que liste cuentas exactas: buscar con Grep `ProviderA-EUR', 'ProviderA-USD`, `toHaveLength` sobre cuentas y nombres de cuentas del seed en `backend/test`. Verificar insertando a mano en la prueba una cuenta `bruno-` temporal (y borrándola) que los tests siguen en verde, escenario "Cuentas de la colección presentes".
- [ ] 5.2 Commit: test(catalog): las listas de cuentas del seed ignoran las cuentas bruno-

## 6. Colección Bruno

- [ ] 6.1 Añadir a `10-smoke` las peticiones de D9 (`Create account - analyst`, `Create account - unknown provider`, `Patch account - viewer`, `Patch account - unknown`, `Patch account - providerId`, `Matching rule sets`, `Matching rule sets - viewer out of scope`), cada una con su código de estado y `code`. Ninguna escribe.
- [ ] 6.2 Añadir `20-flows/accounts/` con la secuencia 1–8 de D9 en Provider C, con `admin` (`as: admin`, `{{adminToken}}`) y la subida con `analyst`, y el nombre `bruno-<id>` derivado de la pasada. Añadir a `20-flows/catalog` una comprobación de `primaryAccount` en `GET /channels` y de `assignedInBatchNo` en `5 Account channels`.
- [ ] 6.3 La persona ejecuta `! pnpm test:api` con `pnpm dev` levantado. Verificar que todo lo de cuentas (`10-smoke` de cuentas y conjuntos, `20-flows/accounts` y los cambios de `20-flows/catalog`) pasa dos veces seguidas sin `db:seed` entre medias, y que tras esas dos pasadas `pnpm test` sigue en verde. Los fallos conocidos de #111 se anotan, no se arreglan aquí.
- [ ] 6.4 Actualizar la sección Bruno de `CLAUDE.md`: las escrituras de cuentas usan `admin` y sus `403` usan `analyst`; el flujo `20-flows/accounts` deja una cuenta `bruno-` cerrada por pasada en Provider C hasta el siguiente `pnpm db:seed`, y los tests ignoran ese prefijo.
- [ ] 6.5 Commit: test(api): colección Bruno de la administración de cuentas

## 7. Cierre

- [ ] 7.1 Verificar con `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check` y `openspec validate admin-accounts --strict`.
- [ ] 7.2 Commit: docs(accounts): OpenAPI y verificación final de la administración de cuentas (solo si 7.1 dejó cambios)

## Workflow follow-up

- `/opsx:verify`, PR hacia `feature/entrega-3-MVP` con la plantilla y CI en verde, y `/opsx:archive`.
- `web-admin-accounts` parte del contrato del grupo 1: el diálogo dice "unique", no "unique per provider".
- `admin-matching` amplía `GET /providers/{id}/matching-rule-sets` en `matching` sin redefinirlo.
