# Tasks — web-admin-matching

Rama `feat/web-admin-matching`. Contiene `origin/feat/admin-matching` (ad75fb8) y un merge de `origin/feature/entrega-3-MVP` (147ebff, con `web-admin-accounts`).

- **Integración.** Cuando `admin-matching` suba commits: `git fetch` y `git merge origin/feat/admin-matching`. Nunca rebase ni force push: si alguna vez hiciera falta, se le pide a la persona con la comprobación previa.
- **PR** hacia `feature/entrega-3-MVP`, cuando `admin-matching` esté fusionado.
- **Solo frontend.** Si una tarea pide cambiar un esquema de `@recon/shared` o el API, se para y se avisa: eso es de `admin-matching`. No se duplican esquemas en el front.

## 1. Base

- [x] 1.1 Verificar la base antes de tocar nada:
  - `git fetch`;
  - comprobar con `git merge-base --is-ancestor` que la rama contiene `origin/feat/admin-matching` y `origin/feature/entrega-3-MVP`;
  - integrar lo nuevo como dice la cabecera;
  - `pnpm typecheck`, `pnpm lint` y `pnpm --filter @recon/frontend test` en verde.

## 2. Elección de proveedor compartida y menú (refactor y test-first)

- [x] 2.1 Actualizar `AppLayout.test.tsx` y el test de `nav-config` a la delta `web-shell` y comprobar que fallan:
  - Matching Rules como enlace a `/matching-rules` para `viewer`, `analyst` y `admin`;
  - activa en `/matching-rules?merchantId=1`, `/matching-rules/global` y `/matching-rules/3`.
- [x] 2.2 Commit: test(web): Matching Rules habilitada en el menú
- [x] 2.3 Hacer pasar los tests de 2.1:
  - Extraer `features/accounts/provider-choice.tsx` de `AccountsPage.tsx` (design D1) sin cambiar su comportamiento.
  - Crear las tres rutas de design D2 con páginas mínimas (título y migas) y habilitar la entrada en `nav-config.ts`.
  - Verificar con los tests de 2.1, `AccountsPage.test.tsx` sin cambios y en verde, `pnpm typecheck` y `pnpm lint`.
- [x] 2.4 Commit: feat(web): rutas de Matching Rules y elección de proveedor compartida con Accounts

## 3. Cuerpos y errores (funciones puras, test-first)

- [x] 3.1 Escribir `features/matching/rule-form.test.ts` (design D4) y comprobar que falla:
  - `valuesOf` del legacy sin `sheetRuleId`, `columnRuleId`, `rowIgnoreRules` ni `statuses`, con las filas en el orden de la respuesta.
  - `ruleSetBody` exacto. `reason` va recortado y solo si no está vacío. Rename cambia solo `name` y Activate solo `isActive`.
  - `globalsBody` con `statusAliases` y sin `rowIgnoreRules` ni `statuses`.
  - Adaptación por tipo: `batch_fees` → `cycle = null`, `statusId = null`; ciclo `R` → `statusId = null`.
  - Validación local:
    - patrón vacío o de 129 caracteres;
    - prioridad `-1`, `32768` y `1.5`;
    - alias sin estado;
    - ruta en forma de `details.field`.
  - Lo que el navegador no rechaza: regex `^amount(`, `APP` y ` app `, `Pending`, `E` · `Chargeback` y una hoja `transactions` sin ciclo.
  - Columna con hoja vacía → `sheetPattern = null`.
  - `createBody` vacío y como copia del legacy, sin ids.
- [x] 3.2 Escribir `features/matching/rule-errors.test.ts` (design D6) y comprobar que falla:
  - `details.field` en `sheetRules[2].statusId`, `columnRules[0].columnPattern`, `statusAliases[1].alias` y `name`, con el mensaje del API;
  - una ruta fuera del formulario (`sheetRules[9].cycle`) y la lista de Fastify → mensaje general;
  - `rule_set_name_taken` → `name`;
  - `403`, `404` (invalida), `5xx` y red.
- [x] 3.3 Commit: test(web): cuerpos y errores de las reglas de pareo
- [x] 3.4 Implementar `rule-form.ts`, `rule-errors.ts` y sus textos en `features/matching/strings.ts`.
  - **Rotura deliberada:** que `valuesOf` conserve `sheetRuleId` debe hacer fallar su caso; después se revierte.
  - Verificar con `pnpm --filter @recon/frontend test rule-form rule-errors`.
- [x] 3.5 Commit: feat(web): cuerpos y errores de las reglas de pareo

## 4. API falsa de reglas de pareo

- [x] 4.1 Escribir `test/msw/matching.test.ts` (design D10) y comprobar que falla. Debe cubrir:
  - **Lecturas:**
    - `GET /matching-rule-sets/3`: el detalle del legacy pasa `MatchingRuleSetDetail.parse`;
    - `viewer` → `404` en el 3 y en `999999`;
    - `GET /matching-rules/global` pasa `GlobalMatchingRules.parse`, con los seis estados.
  - **`POST`:**
    - `analyst` → `403`;
    - proveedor 999 → `404`;
    - `rowIgnoreRules` en el cuerpo → `400`;
    - `201` que aparece en `GET /providers/201/matching-rule-sets` y en el formulario de cuenta.
  - **`PUT` del conjunto:**
    - `403` y `404` como el `POST`;
    - un `sheetRuleId` o un cuerpo sin `columnRules` → `400`;
    - `200` con ids nuevos.
  - **`PUT` global:**
    - `403` para `admin` con `merchantScope = assigned`;
    - `rowIgnoreRules` → `400`;
    - `200`.
  - **El fake no decide reglas de negocio:** no responde `409` ni `400` de dominio por sí mismo.
- [x] 4.2 Commit: test(web): API falsa de las reglas de pareo
- [x] 4.3 Implementar el fake:
  - `test/msw/matching-fixtures.ts`, con `RULE_SETS` movido desde `accounts.ts` y ampliado con reglas;
  - `test/msw/matching.ts`, registrado en `handlers.ts` y `resetDb`;
  - `accounts.ts` importa los fixtures.
  - Verificar con `matching.test.ts`, `accounts.test.ts` y toda la suite del frontend en verde.
- [x] 4.4 Commit: feat(web): API falsa de las reglas de pareo

## 5. Lectura: lista, detalle, globales y Overview (test-first)

- [x] 5.1 Escribir `features/matching/MatchingRulesPage.test.tsx`, `RuleSetPage.test.tsx` y `GlobalRulesPage.test.tsx`, y ampliar `AccountDetailPage.test.tsx`, con los escenarios de las deltas `matching` y `accounts`. Comprobar que fallan:
  - **"acceso y conjuntos del proveedor":** Provider C, Provider A sin conjuntos, fuera del alcance y migas.
  - **"detalle de un conjunto":**
    - el legacy;
    - no disponible (`viewer`, `999999` y `abc`);
    - catálogo de estados no disponible → `Status 3`;
    - error y reintento.
  - **"reglas globales"**, y **"filas a ignorar"** en lectura con la nota `Not applied yet (#120).`
  - **"permisos de la pantalla"** en lectura: `viewer`, `analyst` y `admin`, y `admin` con alcance `assigned` (con `withScopedAdmin()`, design D8).
  - **"Overview":** el enlace del legacy a `/matching-rules/3`, `None · global rules` a `/matching-rules/global` y sin pestaña de reglas.
- [x] 5.2 Commit: test(web): lista, detalle y reglas globales de Matching Rules en lectura
- [x] 5.3 Implementar lo necesario hasta dejar en verde los tests de 5.1 (design D3, D8, D9):
  - `queries.ts` y `permissions.ts`;
  - `rule-tables.tsx` en lectura;
  - `MatchingRulesPage.tsx`, `RuleSetPage.tsx` y `GlobalRulesPage.tsx`;
  - el enlace de `AccountOverview.tsx`;
  - sus textos.
  - Verificar con los tests de 5.1, `pnpm typecheck` y `pnpm lint`.
- [x] 5.4 Commit: feat(web): lista, detalle y reglas globales de Matching Rules en lectura

## 6. Modo edición (test-first)

- [ ] 6.1 Escribir `features/matching/rules-editor.test.tsx` con los escenarios de la delta `matching` y comprobar que fallan:
  - **"modo edición":**
    - cambiar `Fail`, con el cuerpo exacto y una sola petición aunque se pulse dos veces;
    - reordenar con **Move up**, con el orden de la respuesta después;
    - motivo recortado;
    - cancelar;
    - ids de una edición anterior;
    - alias nuevo en las globales;
    - **Move up** y **Move down** deshabilitados en los extremos y foco tras añadir y mover.
  - **"filas a ignorar":** sin controles en modo edición y fuera del cuerpo.
  - **"avisos del formulario":** patrón vacío con foco, `batch_fees`, ciclo `R` y reglas que decide el API.
  - **"errores del API":**
    - estado de otro ciclo con foco y orden intactos;
    - regex;
    - ruta fuera del formulario, lista de esquema y red;
    - `403` con lo escrito intacto.
- [ ] 6.2 Commit: test(web): modo edición de las reglas de pareo
- [ ] 6.3 Implementar `RulesEditor.tsx`, las filas editables de `rule-tables.tsx` y las mutaciones de `PUT` en `mutations.ts` (design D5, D6), con sus textos. Verificar con los tests de 6.1 y con toda la suite del frontend en verde.
- [ ] 6.4 Commit: feat(web): modo edición de las reglas de pareo

## 7. Rename, activar y desactivar, y crear (test-first)

- [ ] 7.1 Escribir `features/matching/rule-set-actions.test.tsx` con los escenarios de la delta `matching` y comprobar que fallan:
  - **"renombrar":** renombrar, nombre en uso con el panel abierto, y deshabilitado con cambios sin guardar.
  - **"activar y desactivar":** conjunto en uso con las cuentas enlazadas, reactivar "Provider C retired" y foco de vuelta al cerrar.
  - **"crear un conjunto":**
    - vacío, con el cuerpo exacto y la navegación al detalle;
    - copia del legacy;
    - nombre en uso;
    - sin proveedor elegido no hay **New rule set**;
    - doble clic = una petición.
- [ ] 7.2 Commit: test(web): renombrar, activar, desactivar y crear conjuntos de reglas
- [ ] 7.3 Implementar lo necesario hasta dejar en verde los tests de 7.1 (design D7):
  - `RenameRuleSetSheet.tsx`, `RuleSetStatusDialog.tsx` y `NewRuleSetDialog.tsx`;
  - la mutación de `POST` y la caché en `mutations.ts`;
  - sus textos.
  - Verificar con los tests de 7.1, `pnpm typecheck`, `pnpm lint` y toda la suite del frontend en verde.
- [ ] 7.4 Commit: feat(web): renombrar, activar, desactivar y crear conjuntos de reglas

## 8. Documentación

- [ ] 8.1 Actualizar la documentación y verificar releyendo que README y delta specs dicen lo mismo:
  - **README §1.3:**
    - fila **Matching Rules**: lista por proveedor, detalle, globales y alias; edición con `account.manage`, y las globales con alcance `all`; filas a ignorar de solo lectura (#120); sin "Test against a file…";
    - fila **Accounts / Account Detail**: el conjunto enlaza a Matching Rules, sin pestaña;
    - mención de `docs/wireframes/web-admin-matching/`.
  - **`docs/wireframes/README.md`:** la carpeta nueva.
- [ ] 8.2 Verificar con `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde.
- [ ] 8.3 Commit: docs(web): Matching Rules en el mapa de pantallas

## 9. Capturas contra el backend real

Requiere que `admin-matching` haya terminado y turno de base.

- [ ] 9.1 `git fetch` e integrar `origin/feat/admin-matching` por merge. Verificar con `pnpm typecheck` y `pnpm test` en verde. Si cambió algún esquema, ajustar el front y el fake en el mismo commit.
- [ ] 9.2 Generar las capturas en `docs/wireframes/web-admin-matching/`:
  - **Requisitos:** la base local sembrada por la persona (`! pnpm db:seed` dentro de la sesión) y `pnpm dev` levantado.
  - **Script:** escribir `e2e/screenshots/web-admin-matching.ts` y el script `screenshots:web-admin-matching` (design D11). Lo que se crea usa el prefijo `bruno-` y queda inactivo.
  - **Verificar** abriendo cada captura de D11 a 1280 y a 1024 px: sin tablas que se salgan de su tarjeta ni elementos solapados, con el modo edición incluido.
- [ ] 9.3 Commit: docs(web): capturas de Matching Rules

## 10. Revisión

- [ ] 10.1 `review-diff` en una sesión nueva, que pide la persona, antes del PR. Lo que encuentre se arregla con su test y su commit en esta rama.

## Workflow follow-up

- `/opsx:verify web-admin-matching`.
- PR hacia `feature/entrega-3-MVP` con la plantilla, cuando `admin-matching` esté fusionado, y CI en verde (vigilado con `gh … --jq`).
- `/opsx:archive web-admin-matching` tras el merge. Va después del archivo de `admin-matching`, porque las dos deltas tocan `matching`.
