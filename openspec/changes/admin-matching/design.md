# Design — admin-matching

## Context

- El motivo y el alcance están en `proposal.md`; los requisitos, en las delta specs `matching` y `api-collection`.
- **Lo que ya existe:**
  - Las tablas `MatchingRuleSet`, `MatchingSheetRule`, `MatchingColumnRule`, `MatchingRowIgnoreRule` y `MatchingStatusAlias`.
  - Las `CHECK` `CK_MatchingSheetRule_kind`, `_kindCycle`, `_cycleR` y `CK_MatchingColumnRule_targetField`, el `UNIQUE (providerId, name)` de `MatchingRuleSet` y el índice filtrado `UX_MatchingSheetRule_global_pattern` (`sheetPattern` único entre las globales).
  - Ninguna tabla referencia `sheetRuleId`, `columnRuleId` ni `rowIgnoreId`.
- **Módulo `matching`:** `domain/rules.ts` y `propose-mapping.ts` (funciones puras), `PrismaMatchingRulesRepository.rulesFor()` (lo usa `imports` en cada subida, lectura del detalle, confirmación y análisis) y la lectura `GET /providers/{id}/matching-rule-sets` que trajo `admin-accounts` (D8): `RuleSetReadService`, `PrismaRuleSetReadRepository` y `matching-module.ts`.
- **Desempate de la propuesta:** `byPriority` y `byColumnPrecedence` desempatan por `priority` y después por el id de la regla. Al reemplazar reglas, el orden de inserción decide el desempate.
- **Patrón de las escrituras:** `admin-accounts` (D4–D6 y D9–D10): unidad de trabajo con `UPDLOCK, HOLDLOCK`, `retryOnDeadlock`, respaldo del índice único por número de error y auditoría en la misma transacción.

## Goals / Non-Goals

**Goals**

- Validación de reglas como funciones puras escritas test-first, compartidas por conjuntos y globales.
- Un solo camino de escritura por documento (conjunto o globales): validar, comparar, reemplazar y auditar.
- Ningún cambio en `rulesFor()` ni en `propose-mapping.ts`. El comportamiento de la propuesta solo se fija con escenarios nuevos.

**Non-Goals**

- Aplicar las filas a ignorar (#120).
- Guardar las reglas por import.
- Control optimista de concurrencia.
- Probar reglas contra un archivo.

## Decisions

### D1. Contrato en `@recon/shared` (`matching.ts`, nuevo)

- **Piezas:**
  - `SheetRuleInput`: `sheetPattern` (recortado, 1–128), `isRegex`, `kind`, `cycle`, `statusId` (o `null`), `priority` (entero de 0 a 32767, por defecto 100) e `isActive` (por defecto `true`).
  - `ColumnRuleInput`: `sheetPattern` (recortado, 1–128, o `null`), `columnPattern` (recortado, 1–128), `isRegex`, `targetField`, `priority` e `isActive`.
  - `StatusAliasInput`: `alias` (recortado, 1–50), `statusId`, `excludeAmount` e `isLegacy`.
  - Las versiones de salida añaden `sheetRuleId` o `columnRuleId`. `RowIgnoreRule` es solo de salida: `rowIgnoreId`, `pattern`, `isRegex`, `description` e `isActive`.
- **Cuerpos:**
  - `MatchingRuleSetCreate`: `name` (recortado, 1–80), `isActive?`, `sheetRules` (por defecto `[]`), `columnRules` (por defecto `[]`) y `reason?` (recortado, 1–500).
  - `MatchingRuleSetPut`: los mismos campos, todos obligatorios salvo `reason`.
  - `GlobalMatchingRulesPut`: `sheetRules`, `columnRules`, `statusAliases` y `reason?`.
  - Las listas tienen `.max(200)`.
- **Respuestas:**
  - `MatchingRuleSetDetail`: `ruleSetId`, `name`, `isActive`, `provider { providerId, name }`, `accounts` (el `AccountRef` con `isActive` de `MatchingRuleSetSummary`), `sheetRules`, `columnRules` y `rowIgnoreRules`.
  - `GlobalMatchingRules`: `sheetRules`, `columnRules`, `rowIgnoreRules`, `statusAliases` y `statuses` (`{ statusId, name, cycle }`).
- **Esquemas `strict`.** Un campo desconocido (`providerId`, `rowIgnoreRules`, un id de regla) es `400`. Así se cumple "filas a ignorar de solo lectura" sin código propio, y un id de regla en el cuerpo nunca aparenta conservarse.
- **Coherencia kind–ciclo–estado.** Va en el dominio (D2) y no en el esquema, para responder con `details.field` exacto y no con el mensaje genérico de Zod.
- **Alternativa descartada:** aceptar ids de regla y actualizar en el sitio. Complica el contrato sin beneficio, porque nada referencia esos ids.

### D2. Dominio puro (TDD): `matching/domain/rule-validation.ts` y `rule-diff.ts`

- **`validateSheetRules(rules, statuses)`, `validateColumnRules(rules)` y `validateAliases(aliases, statuses)`:**
  - Lanzan `MatchingRuleError(field, message)` con la ruta `sheetRules[i].campo`, en el orden de la spec: forma kind/ciclo/estado, estado inexistente, `Pending`, ciclo natural distinto, regex y repetidos.
  - Señalan el **segundo** elemento repetido.
  - La clave de repetición es `trim().toLowerCase()`, sin `isRegex`, igual que el índice filtrado de las globales y que la comparación de la propuesta.
  - El regex se comprueba con `new RegExp(p, 'i')`, el mismo constructor que `matchesPattern`.
- **`diffRuleSet(before, after)` y `diffGlobals(before, after)`:**
  - Comparan los documentos normalizados (sin ids, listas en el orden de guardado) y devuelven `changes: { campo: { before, after } }` solo con lo que cambia.
  - El orden cuenta: reordenar es un cambio, porque cambia el desempate.
  - `actionFor(changes)` devuelve `deactivate` o `activate` si cambia `isActive`, aunque haya otros cambios, y `update` en el resto, como `planAccountPatch`.
- **Rotura deliberada:** aceptar `Pending` como estado fijo debe hacer fallar su caso; después se revierte.

### D3. Servicio y unidad de trabajo

- **`RuleSetAdminService`** (`create`, `put`) y **`GlobalRulesService`** (`get`, `put`), con un puerto `MatchingRulesAdminRepository`:
  - `inProvider(scope, providerId, work)`: transacción; `null` → `404`.
  - `inRuleSet(scope, ruleSetId, work)`: transacción con la fila de `MatchingRuleSet` en `UPDLOCK, HOLDLOCK`, filtrada por el merchant del proveedor en el alcance; `null` → `404`.
  - `inGlobals(work)`: transacción que toma `sp_getapplock @Resource = 'matching_rules_global', @LockMode = 'Exclusive', @LockOwner = 'Transaction'`, porque no hay una fila que bloquear.
  - Las tres envuelven `retryOnDeadlock` con el timeout de 15 s de fees y cuentas.
- **La unidad expone:**
  - `nameTaken(providerId, name, exceptId?)`;
  - `linkedAccounts(ruleSetId)` (abiertas y cerradas, por nombre);
  - `statuses()`;
  - `readRuleSet` y `readGlobals` (documento normalizado);
  - `replaceRuleSet`, `replaceGlobals` e `insertRuleSet`;
  - `audit`.
- **Orden de un `PUT` de conjunto:**
  1. Bloqueo y alcance.
  2. Validar con `statuses()`.
  3. `diffRuleSet` frente a lo leído bajo bloqueo; si no hay cambios, responder sin escribir.
  4. Si `isActive` pasa a `false`, `linkedAccounts` → `409 rule_set_in_use`.
  5. Si cambia el nombre, `nameTaken` → `409`.
  6. Borrar las reglas de hoja y de columna del conjunto e insertarlas en el orden del cuerpo, con `createMany` por lista: los ids crecen en ese orden y el desempate se conserva.
  7. Actualizar `name` e `isActive`.
  8. `audit`.
- **Validación antes que el estado.** Se valida antes de comparar, así que un documento inválido es `400` aunque coincida con lo guardado, cosa que no puede pasar con datos válidos en la base.
- **El `POST`** sigue el mismo orden sin el paso 4. El `PUT` global, sin los pasos 4 y 5. Reemplaza solo las filas con `ruleSetId NULL` y todos los alias, y nunca toca `MatchingRowIgnoreRule`.
- **Respaldo del nombre.** `MatchingRuleSet_providerId_name_key` (2627/2601, o `P2002`) se traduce a `RuleSetNameTakenError` por número, como D5 de `admin-accounts`. Lo mismo para `UX_MatchingSheetRule_global_pattern`, que no debería saltar tras la validación: si salta, es `400` en `sheetRules`.
- **Alternativa descartada:** diff fila a fila con `update`, `create` y `delete` para conservar ids. Más código y más casos para el mismo resultado observable.

### D4. Lecturas

- **`RuleSetReadService` gana `detail(scope, id)`.** El repositorio Prisma añade `findDetail`: un `findFirst` filtrado por `provider.merchantId in scope`, con `sheetRules`, `columnRules` y `rowIgnores` ordenados por `priority` y por id, y las cuentas por nombre.
- **`GlobalRulesService.get`** lee las globales en el mismo orden, los alias por texto y `transactionStatus` por id.
- **Una sola forma.** Las respuestas de `POST` y `PUT` se construyen con la misma lectura, dentro de la transacción.

### D5. Rutas

- **En `matching-routes.ts`, `tags: ['matching']`:**
  - `POST /providers/:providerId/matching-rule-sets`;
  - `GET` y `PUT /matching-rule-sets/:ruleSetId`;
  - `GET` y `PUT /matching-rules/global`.
- Las escrituras llevan `preHandler: app.requirePermission('account.manage')`. El `PUT` global añade una comprobación `request.auth.merchantScope === 'all'`, que si falla lanza `ForbiddenError` antes de abrir la transacción. Las lecturas llevan `app.authenticate`.
- **Respuestas declaradas:** `200`/`201`, `400`, `401`, `403`, `404` y `409`.
- **Mapeo de errores:**
  - `MatchingRuleError` → `400 validation_error` con `details.field`;
  - `RuleSetNameTakenError` → `409 rule_set_name_taken`;
  - `RuleSetInUseError` → `409 rule_set_in_use` con `details.accounts`.
- **Grupo 1:** handlers provisionales en `501 not_implemented`, como en `admin-accounts`, para publicar el contrato.

### D6. Auditoría

- **Conjuntos:** `entityType = 'MatchingRuleSet'` y `entityId = String(ruleSetId)`.
  - `matching_rule_set.create`: detalle `{ providerId, name, isActive, sheetRules, columnRules, reason? }`.
  - Edición: `{ changes, reason? }`.
- **Globales:** `entityType = 'MatchingRules'`, `entityId = 'global'` y acción `matching_rules.update`.
- **Contenido del detalle.** Las listas van en el detalle sin ids y en la forma del API. Con 200 reglas cabe de sobra en `nvarchar(max)`.

### D7. Efecto de un cambio: solo tests

- `imports` ya llama a `rulesFor()` con el conjunto actual de la cuenta en cada operación y resuelve los alias al analizar. Los escenarios de "Efecto de un cambio de reglas" se fijan con tests y no cambian código.
- **Integración (`matching-effect.int.test.ts`):**
  - crea un conjunto `it-rs-` copia del legacy y una cuenta `it-acc-` enlazada en Provider C;
  - sube `legacy-provider`, cambia la regla por HTTP y comprueba `proposed`, `mapping` y las filas;
  - borra todo en el `afterEach`.
- **El alias** se cambia y se restaura dentro del test (`try`/`finally`). Los ficheros de integración corren en serie.

### D8. Bruno y tests robustos

- **`20-flows/matching`, con `admin`:**
  1. Buscar Provider C por nombre en `GET /merchants` y `GET /merchants/{id}/providers`.
  2. Crear `bruno-<Date.now() en base 36>`.
  3. Nombre repetido en mayúsculas: `409`.
  4. Detalle: `200`.
  5. `PUT` con una regla nueva: `200`.
  6. `PUT` con `APP` → E/`Chargeback`: `400`.
  7. Desactivar "Provider C legacy" (id buscado en la lista por nombre): `409 rule_set_in_use`.
  8. Desactivar el `bruno-`: `200`.
  9. `GET` de las globales, con un script que quita los ids, `rowIgnoreRules` y `statuses`, y `PUT` de vuelta: `200`.
- **`10-smoke`**, sin escrituras:
  - `Create rule set - analyst` (`403`);
  - `Create rule set - unknown provider` (`404`, `admin`);
  - `Rule set detail` (`200`);
  - `Rule set detail - viewer out of scope` (`404`);
  - `Put rule set - analyst` (`403`);
  - `Global rules` (`200`);
  - `Put global rules - analyst` (`403`);
  - `Put global rules - rowIgnoreRules` (`400`, `admin`).
- **Tests de integración del seed.** `matching-rule-sets.int.test.ts` y cualquier otro que liste los conjuntos exactos de un proveedor filtran `name.startsWith('bruno-')` con un ayudante `seedRuleSets()` en `test/integration/helpers.ts`.
- **Conjuntos de los tests:** `it-rs-<n>`. El `afterEach` borra en orden de claves foráneas `AuditLog` (MatchingRuleSet), las cuentas `it-acc-` y sus imports, `MatchingSheetRule`, `MatchingColumnRule` y `MatchingRuleSet`. El fichero de globales restaura en `afterAll` el documento leído en `beforeAll` y comprueba que la propuesta de `batch-clean` sigue igual.

### D9. Documentación

- README §1.2: efecto de un cambio y su porqué.
- README §1.5: se quita el recorte de #80.
- README §3.2:
  - acciones de auditoría;
  - nombre único por proveedor sin distinguir mayúsculas;
  - filas a ignorar aún no aplicadas (#120).
- README §4.4: filas de pareo, permisos (alcance `all` para las globales), códigos de error y filas a ignorar de solo lectura.
- `CLAUDE.md`: el flujo `20-flows/matching` y sus conjuntos `bruno-`.

## Risks / Trade-offs

- **[Última escritura gana]** Dos admins que editan el mismo conjunto se pisan; el segundo no ve el aviso. **Riesgo aceptado.** Las escrituras se serializan (`UPDLOCK` o `sp_getapplock`), así que no hay estado mezclado, y la auditoría guarda los dos. Un control optimista necesitaría `updatedAt` (una migración).
- **[Cambiar las globales afecta a todas las cuentas sin conjunto]** El `PUT` global exige alcance `all`, queda auditado con el antes y el después, y no permite dejar listas inválidas.
- **[Alias cambiado entre confirmar y analizar]** Un import `mapped` se analiza con el alias nuevo. Se documenta en el README y en un escenario; fijarlo exigiría una migración.
- **[Ids de regla nuevos en cada `PUT`]** Nada los referencia. El frontend no debe guardarlos entre ediciones.
- **[Conjuntos `bruno-` acumulados]** Quedan inactivos, se ignoran en los tests y desaparecen con `pnpm db:seed`.
- **[Un test de integración que deja las globales cambiadas]** `afterAll` las restaura y comprueba la propuesta de `batch-clean`. Si un fallo deja las globales mal, `pnpm db:seed` las recrea.
- **[`sp_getapplock` con el adaptador mssql]** Se ejecuta con `$executeRaw` dentro de la transacción interactiva. Lo cubre un test de concurrencia con compuertas, como `fee-concurrency.int.test.ts`.

## Migration Plan

- Sin migración de base.
- Despliegue normal (`scripts/deploy.sh build | up`).
- **Rollback:** revertir el PR. Los conjuntos y reglas creados siguen siendo válidos para el código anterior, porque usan las mismas columnas.
