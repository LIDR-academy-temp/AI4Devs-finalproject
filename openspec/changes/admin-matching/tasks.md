# Tasks — admin-matching

Rama `feat/admin-matching`. Las decisiones D1–D9 están en `design.md`; los escenarios, en las delta specs. Sin migraciones.

## 1. Contrato en `@recon/shared` y export de OpenAPI

- [x] 1.1 Escribir `packages/shared/src/matching.test.ts` con los esquemas de D1 y comprobar que falla porque los exports no existen. Debe cubrir:
  - `SheetRuleInput`: patrón recortado; vacío tras recortar o de 129 caracteres, rechazado; `kind` desconocido, rechazado; `priority` y `isActive` por defecto.
  - `ColumnRuleInput`: `sheetPattern` `null` o recortado; `targetField = "fee"`, rechazado.
  - `StatusAliasInput`: alias recortado, 1–50.
  - `MatchingRuleSetCreate`: solo `name` → listas vacías; `name` de 81 caracteres, rechazado; `providerId` y `rowIgnoreRules`, rechazados (`strict`); 201 reglas, rechazado.
  - `MatchingRuleSetPut`: sin `columnRules`, rechazado; un `sheetRuleId` dentro de una regla, rechazado; `reason` recortado, 1–500.
  - `GlobalMatchingRulesPut`: `rowIgnoreRules` y `statuses`, rechazados.
  - `MatchingRuleSetDetail` y `GlobalMatchingRules`, con ids y `rowIgnoreRules`.
- [x] 1.2 Commit: test(shared): contrato de la administración de reglas de pareo
- [x] 1.3 Implementar los esquemas en `packages/shared/src/matching.ts`, reutilizando `Cycle`, `SheetKind`, `TargetField` y `MatchingRuleSetSummary`, y exportarlos desde `index.ts`. Verificar con `pnpm --filter @recon/shared test` y `pnpm typecheck`.
- [x] 1.4 Declarar en `matching/http/matching-routes.ts` las cinco rutas de D5, con `preHandler` de permiso (y la comprobación de alcance `all` en el `PUT` global) y handlers provisionales en `501 not_implemented`. Verificar con `matching-routes.test.ts`: `401` sin token, `403` de `analyst` en las tres escrituras antes de mirar el recurso, `403` de un admin con alcance `assigned` en el `PUT` global, y `400` de esquema (`rowIgnoreRules` en el cuerpo, `GET /matching-rule-sets/abc`).
- [x] 1.5 Ejecutar `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`. Ampliar `app.test.ts` con las rutas nuevas y añadir los fixtures de MSW (`frontend/src/test/msw/fixtures.ts`: detalle del conjunto legacy y reglas globales) solo para el contrato. Verificar con `pnpm openapi:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test`.
- [x] 1.6 Actualizar README §4.4:
  - filas de `POST /providers/{id}/matching-rule-sets`, `GET`/`PUT /matching-rule-sets/{id}` y `GET`/`PUT /matching-rules/global`, con permisos (alcance `all` en el `PUT` global) y códigos de error;
  - filas a ignorar de solo lectura (#120);
  - corregir la frase "Reglas de hoja, columna y filas a ignorar".

  Verificar con `grep` que aparecen `rule_set_name_taken`, `rule_set_in_use` y `#120`.
- [x] 1.7 Commit: feat(matching): contrato de la administración de reglas de pareo y export de OpenAPI
- [x] 1.8 Hacer `git push` de `feat/admin-matching`, vigilar el CI con `gh run list --branch feat/admin-matching --json status,conclusion --jq` y avisar a la persona de que el contrato está publicado, porque `web-admin-matching` parte de aquí. No seguir hasta su confirmación.

## 2. Validación y diff de reglas (TDD)

- [ ] 2.1 Escribir `matching/domain/rule-validation.test.ts` (D2) y comprobar que falla. Debe cubrir cada escenario de "Validación del contenido de las reglas" y de "Patrones sin repetir y límites":
  - ruta exacta de `details.field`;
  - se señala el segundo repetido;
  - repetición independiente de `isRegex`;
  - la misma columna en hojas distintas, aceptada;
  - alias repetidos o de estado inexistente.
- [ ] 2.2 Escribir `matching/domain/rule-diff.test.ts` (D2) y comprobar que falla. Debe cubrir:
  - sin cambios → `changes = {}`;
  - renombrar solo en mayúsculas es un cambio;
  - reordenar reglas es un cambio;
  - `isActive` a `false` con otros cambios → `deactivate`; a `true` → `activate`; el resto → `update`;
  - `before`/`after` sin ids;
  - diff de las globales por lista (`sheetRules`, `columnRules`, `statusAliases`).
- [ ] 2.3 Commit: test(matching): validación y comparación de reglas de pareo
- [ ] 2.4 Implementar `rule-validation.ts`, `rule-diff.ts` y `matching/domain/errors.ts` (`MatchingRuleError`, `RuleSetNameTakenError`, `RuleSetInUseError`) hasta dejar los tests en verde. Rotura deliberada: aceptar `Pending` como estado fijo debe hacer fallar su caso; después se revierte.
- [ ] 2.5 Commit: feat(matching): validación y comparación de reglas como funciones puras

## 3. Conjuntos: crear, ver y editar

- [ ] 3.1 Escribir `matching/application/rule-set-admin-service.test.ts` con un repositorio en memoria en `__fakes__` (D3) y comprobar que falla. Debe cubrir los escenarios de "Crear un conjunto de reglas", "Detalle de un conjunto de reglas", "Editar un conjunto de reglas", "Nombre de conjunto único por proveedor", "Desactivar un conjunto en uso", "Permiso y alcance de las escrituras de reglas" y "Auditoría de las reglas de pareo" (salvo los de concurrencia):
  - orden de los pasos de D3;
  - `404` de proveedor y de conjunto;
  - `400` sin escrituras;
  - cuerpo sin cambios: sin escritura, sin auditoría y con los mismos ids.
- [ ] 3.2 Escribir `test/integration/rule-set-admin.int.test.ts` contra la base local, con los mismos escenarios por HTTP, y comprobar que falla.
  - Conjuntos `it-rs-<n>`; el `afterEach` borra en orden de claves foráneas (D8).
  - Incluye "Nombre repetido en mayúsculas" (intercalación), "Mismo nombre en otro proveedor" y "Cuenta cerrada enlazada" (con una cuenta `it-acc-` cerrada).
  - Incluye un test de integración que no da por hecho que `createMany` conserva el orden: inserta las reglas en un orden no alfabético y con prioridades iguales, las lee de la base ordenadas por `sheetRuleId`/`columnRuleId` y comprueba que salen en el orden del cuerpo; repite con el orden invertido. Es lo que sostiene el desempate (D3).
  - Si no hay turno de base, se anota y se ejecuta en rojo en el turno de la 3.4.
- [ ] 3.3 Commit: test(matching): crear, ver y editar conjuntos de reglas
- [ ] 3.4 Implementar:
  - `PrismaMatchingRulesAdminRepository`: `inProvider`, `inRuleSet` con `UPDLOCK, HOLDLOCK`, `retryOnDeadlock`, respaldo de `MatchingRuleSet_providerId_name_key` por número de error y `createMany` en orden;
  - `RuleSetAdminService.create`/`.put`;
  - `RuleSetReadService.detail` (D4).

  Conectar en `matching-module.ts` y quitar los `501` de las rutas de conjuntos. Verificar con 3.1, 3.2 y `pnpm test`.
- [ ] 3.5 Escribir un test de concurrencia con compuertas, como `fee-concurrency.int.test.ts`: dos `PUT` simultáneos sobre el mismo conjunto se serializan, el resultado es el documento del segundo entero (sin reglas mezcladas) y hay dos entradas de auditoría. Quitar el `UPDLOCK` debe hacer fallar el test o mezclar reglas; después se revierte.
- [ ] 3.6 Commit: feat(matching): crear, ver y editar conjuntos de reglas con auditoría

## 4. Reglas globales

- [ ] 4.1 Escribir `matching/application/global-rules-service.test.ts` (con el doble en memoria) y `test/integration/global-rules.int.test.ts`, y comprobar que fallan. Deben cubrir:
  - los escenarios de "Reglas globales editables" y "Filas a ignorar de solo lectura";
  - el `403` de alcance `assigned` (en el test de rutas);
  - la auditoría `matching_rules.update` con solo las listas que cambian.

  El fichero de integración lee las globales en `beforeAll`, las restaura en `afterAll` y comprueba que la propuesta de `batch-clean` en `ProviderA-USD` sigue siendo toda `source = global` (D8).
- [ ] 4.2 Commit: test(matching): reglas globales editables
- [ ] 4.3 Implementar `GlobalRulesService.get`/`.put` e `inGlobals` con `sp_getapplock` (D3), sin tocar `MatchingRowIgnoreRule`, y quitar los `501` de las globales. Añadir a la 3.5 un caso de dos `PUT` globales simultáneos que se serializan. Verificar con 4.1, la 3.5 ampliada y `pnpm test`. Ejecutar `pnpm openapi:check`: si el contrato cambió respecto al grupo 1, regenerar y avisar a la persona.
- [ ] 4.4 Commit: feat(matching): reglas globales y alias de estado editables

## 5. Efecto de un cambio y escenarios de #21

- [ ] 5.1 Escribir en `matching/domain/propose-mapping.test.ts` los escenarios MODIFIED de "Reglas globales y conjuntos por proveedor":
  - "El conjunto gana aunque la global tenga mejor prioridad";
  - "Desempate por orden de guardado";
  - "Columna de una hoja antes que la genérica".

  Deberían pasar ya: protegen de regresiones. Comprobarlo rompiendo a propósito `byColumnPrecedence` y revirtiendo.
- [ ] 5.2 Escribir `test/integration/matching-effect.int.test.ts` (D7) con los cuatro escenarios de "Efecto de un cambio de reglas". Usa un conjunto `it-rs-` copia del legacy y una cuenta `it-acc-` enlazada en Provider C con `legacy-provider`. El alias se cambia y se restaura en `try`/`finally`. Verificar que pasa sin cambios en `imports` y que, si se fija la propuesta en la subida (prueba a propósito), "Import subido sin confirmar" falla.
- [ ] 5.3 Añadir el ayudante `seedRuleSets()` (sin los de prefijo `bruno-`) a `test/integration/helpers.ts` y usarlo en `matching-rule-sets.int.test.ts` y en cualquier otro test que liste conjuntos exactos (buscar con Grep `Provider C legacy` y `toHaveLength` sobre conjuntos en `backend/test`). Cubrir "Conjuntos de la colección presentes" con un conjunto `bruno-` inactivo creado en `beforeAll` y borrado en `afterAll`.
- [ ] 5.4 Actualizar README:
  - §1.2: efecto de un cambio de reglas (pareo confirmado y filas analizadas intactos; import `uploaded` sin confirmar con la propuesta nueva; alias en el siguiente análisis), con el porqué: fijarlo por import exigiría una migración;
  - §3.2: acciones `matching_rule_set.*` y `matching_rules.update`, nombre único por proveedor sin distinguir mayúsculas, y filas a ignorar aún no aplicadas (#120);
  - §1.5: se quita el recorte de #80.

  Verificar con `grep` que §1.5 ya no lista "Administración de reglas de pareo".
- [ ] 5.5 Commit: test(matching): efecto de un cambio de reglas y conjuntos de la colección

## 6. Colección Bruno

- [ ] 6.1 Añadir a `10-smoke` las peticiones de D8, cada una con su código de estado y `code`. Ninguna escribe.
- [ ] 6.2 Añadir `20-flows/matching/` con la secuencia 1–9 de D8, con `admin` (`as: admin`, `{{adminToken}}`):
  - Provider C y "Provider C legacy" se buscan por nombre;
  - el nombre `bruno-<id>` sale de la pasada;
  - un script de petición quita ids, `rowIgnoreRules` y `statuses` antes del `PUT` global.
- [ ] 6.3 La persona ejecuta `! pnpm test:api` con `pnpm dev` levantado. Verificar que todo lo de reglas de pareo pasa dos veces seguidas sin `db:seed` entre medias y que, tras esas dos pasadas, `pnpm test` sigue en verde. Los fallos conocidos de #111 se anotan, no se arreglan aquí.
- [ ] 6.4 Actualizar la sección Bruno de `CLAUDE.md`: las escrituras de reglas de pareo usan `admin` y sus `403` usan `analyst`; el flujo `20-flows/matching` deja un conjunto `bruno-` inactivo por pasada en Provider C hasta el siguiente `pnpm db:seed`; el `PUT` global reenvía lo leído; los tests ignoran el prefijo.
- [ ] 6.5 Commit: test(api): colección Bruno de la administración de reglas de pareo

## 7. Cierre

- [ ] 7.1 Verificar con `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm openapi:check`, `openspec validate admin-matching --strict` y la integración completa sobre una base recién sembrada (la siembra la ejecuta la persona con `! pnpm db:seed` dentro de la sesión).
- [ ] 7.2 Commit: docs(matching): OpenAPI y verificación final de la administración de reglas de pareo (solo si 7.1 dejó cambios)

## Workflow follow-up

- `/opsx:verify`, PR hacia `feature/entrega-3-MVP` con la plantilla y CI en verde, y `/opsx:archive`.
- `web-admin-matching` parte del contrato del grupo 1:
  - los ids de regla cambian en cada `PUT`;
  - las filas a ignorar son de solo lectura;
  - hay que traducir `rule_set_name_taken` y `rule_set_in_use`;
  - la edición de las globales solo se ofrece con alcance `all`.
- #120: aplicar y escribir las reglas de filas a ignorar.
