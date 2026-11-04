# Design — web-admin-matching

## Context

- El motivo y el alcance están en `proposal.md`, y el comportamiento en las delta specs `matching`, `accounts` y `web-shell`.
- **El contrato** es el design D1–D9 de `admin-matching` y su delta `matching`:
  - esquemas en `packages/shared/src/matching.ts`;
  - rutas en `frontend/src/lib/api/schema.gen.ts`.

  Las cinco operaciones ya responden: los grupos 1–4 están publicados y el 5 solo añade tests, Bruno y documentación.
- **Base de la rama:**
  - `origin/feat/admin-matching` y un merge de `origin/feature/entrega-3-MVP`, que trae `web-admin-accounts`: Account Detail, `dialog.tsx`, `test/msw/accounts.ts` con `RULE_SETS` y `matchingRuleSetsQuery`.
  - Lo que suba `admin-matching` entra con otro merge, nunca con rebase.
- **Lo que ya existe y se reutiliza:**
  - `features/accounts/AccountsPage.tsx`: la elección merchant → proveedor en la dirección (`validateAccountsSearch`, preselección de un valor único, `This merchant or provider is not available.`).
  - `features/accounts/account-errors.ts`: el patrón `ApiError` → mensajes por campo y mensaje general.
  - `EditAccountSheet` y `AccountStatusDialog`: el panel lateral y la confirmación que devuelven el foco a su disparador.
  - `matchingRuleSetsQuery(providerId)` (clave `['providers', id, 'matching-rule-sets']`), que ya usan la Overview y los formularios de cuenta.
  - `react-hook-form` 7 y `@hookform/resolvers`. `useFieldArray` se usa por primera vez en el proyecto.
- **Hechos del API que marcan el diseño:**
  - Un `PUT` puede dar ids de regla nuevos (el API solo reemplaza las listas que cambian). El frontend nunca guarda ids entre ediciones.
  - Los esquemas son `strict`: un id de regla, `rowIgnoreRules` o `statuses` en el cuerpo es `400`.
  - El catálogo de estados solo llega en `GET /matching-rules/global`. El detalle de un conjunto trae `statusId` sin nombre.
  - Los alias no tienen id.
  - Gana la última escritura.

## Goals / Non-Goals

**Goals**

- Un solo editor de reglas para conjuntos y globales. Las globales le añaden la tabla de alias.
- Cuerpos y errores como funciones puras escritas test-first. Ningún cuerpo lleva ids ni campos de solo lectura.
- El navegador no decide ninguna regla de dominio: se limita a los esquemas `*Input` y a adaptar los campos al tipo de hoja.
- Errores en el formulario sin perder valores ni orden, con el foco en el primer error.

**Non-Goals**

- Probar reglas contra un archivo.
- Escribir filas a ignorar (#120).
- Borrar conjuntos.
- Control optimista de concurrencia.
- Arrastrar y soltar.
- Avisar de cambios sin guardar al salir de la página.

## Decisions

### D1. Estructura

```
frontend/src/features/matching/
  MatchingRulesPage.tsx     /matching-rules: provider choice, Global defaults, rule sets, New rule set
  RuleSetPage.tsx           /matching-rules/$ruleSetId: header, actions, linked accounts, RulesEditor
  GlobalRulesPage.tsx       /matching-rules/global: RulesEditor with aliases
  RulesEditor.tsx           read tables ⇄ edit mode (useForm + useFieldArray), Save / Cancel, Reason
  rule-tables.tsx           SheetRules, ColumnRules, StatusAliases, RowsToIgnore in read mode
  rule-edit-tables.tsx      the same lists as editable rows (useFieldArray), Move up / Move down, Remove, Add
  NewRuleSetDialog.tsx      name + Start from
  RenameRuleSetSheet.tsx    name + Reason
  RuleSetStatusDialog.tsx   Deactivate / Activate + Reason, 409 rule_set_in_use
  rule-form.ts              detail ⇄ form values ⇄ bodies (pure, test-first)
  rule-errors.ts            ApiError → field of a row or general message (pure, test-first)
  queries.ts                ruleSetQuery, globalRulesQuery (+ matchingRuleSetsQuery of accounts)
  mutations.ts              create, put rule set, put globals; cache updates
  permissions.ts            useCanManageRules, useCanEditGlobals
  strings.ts
frontend/src/features/accounts/provider-choice.tsx   merchant → provider choice extracted from AccountsPage
frontend/src/test/msw/matching.ts (+ matching.test.ts)
```

- **Elección merchant → proveedor.** Se extrae de `AccountsPage` a `provider-choice.tsx`: un hook con la lógica y un componente con los dos `select`. La usan Accounts y Matching Rules. Es un refactor protegido por `AccountsPage.test.tsx`, que no cambia.
- **Alternativa descartada:** copiar la elección en Matching Rules. Serían dos copias de la preselección y del `not available` que acabarían separándose.

### D2. Rutas, migas y menú

- **Rutas hermanas bajo `appRoute`, sin permiso** (el API decide el alcance):
  - `matchingRulesRoute`: `/matching-rules`, `validateSearch: validateAccountsSearch`;
  - `globalRulesRoute`: `/matching-rules/global`;
  - `ruleSetRoute`: `/matching-rules/$ruleSetId`.

  TanStack Router da preferencia al segmento estático `global` frente a `$ruleSetId`.
- **Migas:** las tres con `[Administration, Matching Rules]`. El nombre del conjunto va en el título, como en Account Detail.
- **Menú:**
  - `nav-config.ts`: Matching Rules con `to: '/matching-rules'`, sin `requires`, y `activeWhen: (p) => p.startsWith('/matching-rules/')`;
  - se amplía el tipo `NavItem['to']`.
- **Id mal formado.** El API responde `400` a `abc` y `404` a un id ajeno. Los dos se muestran como `This rule set is not available.`, como `notAvailable` de Account Detail.

### D3. Lecturas

- **Consultas nuevas en `features/matching/queries.ts`:**
  - `ruleSetQuery(id)`, con clave `['matching-rule-sets', id]`;
  - `globalRulesQuery`, con clave `['matching-rules', 'global']`.

  Las dos se validan con `MatchingRuleSetDetail.parse` y `GlobalMatchingRules.parse`, como hace `contract.ts` de cuentas.
- **El detalle de un conjunto** pide también `globalRulesQuery` para el catálogo `statuses`:
  - si falla, el estado se muestra como `Status <id>` sin bloquear, igual que el `Rule set <id>` de la Overview;
  - el editor del conjunto necesita ese catálogo para el `select` de estado. Sin él, **Edit rules** queda deshabilitado con `Statuses are not available. Retry.`
- **La lista del proveedor** reutiliza `matchingRuleSetsQuery`, sin duplicarla.
- **Orden.** Cada tabla pinta las reglas en el orden de la respuesta y nunca reordena.

### D4. `rule-form.ts`: detalle ⇄ valores ⇄ cuerpo

- **`valuesOf(detail)`** convierte la respuesta en los valores del formulario:
  - quita `sheetRuleId`, `columnRuleId`, `rowIgnoreRules` y `statuses`;
  - los `null` de `cycle`, `statusId` y `sheetPattern` pasan a `''` en los `select`;
  - `priority` se edita como texto.

  Las filas no llevan clave propia: la `key` de React es el `id` que genera `useFieldArray`, que no forma parte de los valores y nunca viaja al API.
- **`ruleSetBody(values, base)` y `globalsBody(values)`** construyen el documento completo:
  - `name` e `isActive` salen del formulario o de `base` (Rename y Activate cambian solo esos campos);
  - `reason` va recortado y solo si no está vacío;
  - el body nunca lleva ids, `rowIgnoreRules` ni `statuses`.
- **Adaptación por tipo de hoja**, al construir el body y al pintar:
  - `kind !== 'transactions'` → `cycle = null` y `statusId = null`;
  - `cycle === 'R'` → `statusId = null`.

  No es una regla de validación: el campo deja de existir para ese tipo. El API sigue validando la coherencia.
- **Validación local** con `SheetRuleInput`, `ColumnRuleInput` y `StatusAliasInput` de `@recon/shared` aplicados a cada fila del body (`safeParse`). Las rutas de Zod se traducen a la misma forma que `details.field` (`sheetRules[1].sheetPattern`), así que local y API comparten D6.
- **Mensajes locales** de texto fijo, solo para lo que rechazan los esquemas: `Enter a pattern.`, `At most <n> characters.`, `Enter a whole number from 0 to 32767.` y, en los alias, `Choose a status.` No se comprueban regex, repetidos, `Pending`, ciclo natural ni una hoja `transactions` sin ciclo, porque `SheetRuleInput` acepta `cycle: null` y esa coherencia es del dominio. En la interfaz no puede pasar: el `select` de ciclo de una hoja `transactions` no ofrece opción vacía, y pasar una hoja a `transactions` le pone `E`.
- **Columna para cualquier hoja.** El campo de hoja de una regla de columna es un texto: vacío significa `Any sheet` y viaja como `sheetPattern = null`.
- **Copia de un conjunto** (`Start from: Copy of …`): `createBody(name, source)` con `source` = `valuesOf(detail de origen)`. Se pide el detalle de origen al elegirlo y **Create rule set** espera a tenerlo.
- **Rotura deliberada:** que `valuesOf` conserve `sheetRuleId` debe hacer fallar el caso "sin ids"; después se revierte.

### D5. Modo edición (`RulesEditor`)

- **Entrada.** **Edit rules** monta un `useForm` con `defaultValues = valuesOf(último detalle)` y un `useFieldArray` por lista. Al salir del modo se desmonta, así que nunca se reutilizan valores ni ids de una edición anterior.
- **Por fila:**
  - campos editables;
  - **Move up** y **Move down** (`move(i, i ± 1)`, deshabilitados en los extremos);
  - **Remove**, con `aria-label` que nombra el patrón.

  Al pie de cada tabla van **Add sheet rule**, **Add column rule** y, en las globales, **Add alias**. Los alias no se mueven, porque el API los ordena por texto.
- **Valores por defecto de una fila nueva:**
  - hoja: `transactions`, `E`, sin estado, `100`, activa;
  - columna: `Any sheet`, `100`, activa;
  - alias: `excludeAmount = false`, `isLegacy = false`.
- **Foco.** Tras añadir, el foco va al patrón de la fila nueva. Tras mover, se queda en el botón de la fila movida, si no queda deshabilitado; si queda, pasa al otro botón.
- **Save:**
  - valida en local (D4) y envía una sola vez, con el botón deshabilitado mientras la petición está en curso;
  - con `200`, `setQueryData` del detalle o de las globales con la respuesta y sale del modo;
  - en un conjunto, invalida además `matchingRuleSetsQuery(providerId)`.
- **Cancel** desmonta el formulario sin enviar.
- **Cambios sin guardar.** `formState.isDirty` deshabilita **Rename…**, **Deactivate…** y **Activate…** (D7) y muestra `You have unsaved changes.` junto a Save.
- **Nota fija** en modo edición: `Order breaks ties at equal priority.`
- **Alternativas descartadas:**
  - Editar regla a regla en un panel, como los "Edit" del wireframe: cada guardado reenviaría el documento entero y, como un `PUT` puede dar ids nuevos, la regla que se edita puede cambiar de id entre una apertura y la siguiente.
  - Arrastrar y soltar: los botones son accesibles con teclado y no traen dependencias.

### D6. `rule-errors.ts`: errores del API

- **`ruleProblemOf(error, values)`** devuelve `{ fields: Record<path, message>, general: string | null, invalidate }`.
- **Qué va a un campo:**
  - `400` con `details.field` cuya ruta existe en `values` (`sheetRules[i].campo`, `columnRules[i].campo`, `statusAliases[i].campo`, `name`) → el `message` del API en ese campo. Los mensajes del API están en inglés y son legibles ("Chargeback is a cycle I status").
  - `409 rule_set_name_taken` → `name`, con `A rule set of this provider already uses this name.`
- **Qué es mensaje general:**
  - un `400` con una ruta que no existe en el formulario, o con la lista de Fastify → `The rules were not saved. Check the values and try again.`;
  - `403` → `You don't have permission to change these rules.`;
  - `404` → `This rule set is no longer available.`, que invalida el detalle;
  - `5xx` → `Could not save the rules. Try again.`;
  - sin respuesta → `Could not reach the server. Check your connection and try again.`
- **`409 rule_set_in_use`** lo trata el diálogo de estado (D7) con `RuleSetInUseDetails.safeParse(details)`. Si no parsea, muestra el texto sin lista.
- **Pintar el error.** `setError` sobre la ruta de RHF (`sheetRules.2.statusId`) y `setFocus` del primer campo con error en el orden del documento: nombre, hojas, columnas, alias. Los valores y el orden no se tocan, porque el formulario no se desmonta.
- **Alternativa descartada:** mostrar todos los errores del API en un resumen arriba. El API devuelve solo el primero, así que un resumen no ahorra nada, y junto al campo se ve qué fila es.

### D7. Rename, Deactivate / Activate y New rule set

- **Rename…** (`Sheet`, como `EditAccountSheet`):
  - nombre y `Reason`;
  - envía `ruleSetBody(valuesOf(detail), { name })`, es decir, las reglas tal como están guardadas;
  - `409` en el nombre.
- **Deactivate…** / **Activate…** (`AlertDialog`, como `AccountStatusDialog`):
  - `Reason` opcional y `ruleSetBody(valuesOf(detail), { isActive })`;
  - con `409 rule_set_in_use`, el diálogo sigue abierto con el texto y la lista de cuentas, cada una enlazada a `/accounts/$accountId`.
- **New rule set** (`Dialog`, como `NewAccountDialog`):
  - solo con un proveedor elegido;
  - `Start from` ofrece `Empty` y los conjuntos del proveedor (también los inactivos, marcados `(inactive)`), y el cuerpo sale de D4;
  - con `201`, `setQueryData(['matching-rule-sets', id])`, invalida `matchingRuleSetsQuery(providerId)` y `navigate` al detalle.
- **Al cerrar** cualquiera de los tres, el foco vuelve a su disparador. La petición se envía una sola vez aunque se pulse dos veces.
- **Base de los tres:** el último detalle de la caché. Si el modo edición tiene cambios, están deshabilitados (D5), así que nunca envían reglas a medio editar.

### D8. Permisos de la pantalla

- **Hooks en `features/matching/permissions.ts`:**
  - `useCanManageRules()` = `account.manage`;
  - `useCanEditGlobals()` = `account.manage && merchantScope === 'all'`.
- **Es solo presentación.** El `403` del API se muestra como en D6.
- **Admin con alcance limitado.** Ningún usuario del fake lo es. Un ayudante `withScopedAdmin()` cambia durante un test `USERS.admin` a `merchantScope = 'assigned'` con el merchant 2 y lo restaura con `onTestFinished`, como `withoutFeeView` de `AppLayout.test.tsx`. Así `GET /auth/me`, el alcance del fake y el `403` del `PUT` global dicen lo mismo. Con `server.use` sobre `/auth/me`, el fake seguiría viendo al admin con alcance total.

### D9. Account Detail: enlace, sin pestaña

- **Cambio en `AccountOverview.tsx`.** La fila **Matching rules** pasa a ser un `Link`:
  - con conjunto, a `/matching-rules/$ruleSetId` (nombre o `Rule set <id>`);
  - sin conjunto, `None · global rules` a `/matching-rules/global`.
- **Por qué no una pestaña.**
  - El conjunto es del proveedor y lo comparten varias cuentas (README §1.2). Una pestaña Matching rules en la ficha haría pensar que las reglas son de la cuenta.
  - Editarlas ahí cambiaría también las de las otras cuentas enlazadas sin que se vea.
  - El detalle del conjunto ya lista sus cuentas.
  - Cambiar a qué conjunto se enlaza la cuenta ya se hace en **Edit** de la ficha.

  Así queda cerrado lo que `web-admin-accounts` dejó fuera.
- **Alternativa descartada:** pestaña de solo lectura con las reglas del conjunto. Duplicaría el detalle sin aportar más que el enlace.

### D10. MSW (`test/msw/matching.ts`)

- **Rutas:**
  - `POST /providers/:providerId/matching-rule-sets`;
  - `GET` y `PUT /matching-rule-sets/:ruleSetId`;
  - `GET` y `PUT /matching-rules/global`.
- **Mismo patrón que `accounts.ts`:**
  - registro de peticiones;
  - `respondNextMatching(route, error)` para que cada test guione un error;
  - `401` sin token;
  - `403` sin `account.manage`, antes del alcance;
  - en el `PUT` global, `403` sin `merchantScope = all`;
  - `404` para lo inexistente y para lo que está fuera del alcance.
- **Contrato:**
  - los cuerpos pasan por `MatchingRuleSetCreate`, `MatchingRuleSetPut` y `GlobalMatchingRulesPut`, y un fallo es `400` con la lista de Zod;
  - toda respuesta pasa por `MatchingRuleSetDetail.parse` o `GlobalMatchingRules.parse`.
- **Datos:**
  - `RULE_SETS` se mueve a `test/msw/matching-fixtures.ts`, con las reglas del legacy (las del seed, spec "Detalle del conjunto legacy") y unas pocas en el retirado.
  - `accounts.ts` lo importa de ahí y su resumen sale de la misma lista, así que lo creado en Matching Rules aparece en los formularios de cuenta.
  - Las globales del fake son las de la plantilla y los seis estados.
- **Ids nuevos en las dos listas en cada `PUT`.** Un `PUT` del API puede dar ids nuevos, y el fake no decide qué listas cambiaron, porque eso sería una regla del API: siempre los da, y así los tests de "sin ids" tienen sentido. Que una lista sin cambios conserve sus ids lo prueba `admin-matching`.
- **El fake no decide reglas de negocio.** No hay regex, repetidos, `Pending`, nombre en uso ni conjunto en uso: los guiona cada test.
- **`resetMatching()`** se registra en `handlers.ts` y `resetDb`.

### D11. Capturas

- `e2e/screenshots/web-admin-matching.ts` y el script `screenshots:web-admin-matching`, como `web-admin-accounts`. Contra el backend real, con la base sembrada por la persona.
- **Capturas, a 1280 y 1024 px:**
  - la lista de Provider C;
  - el detalle de "Provider C legacy" en lectura y en modo edición;
  - un `400` junto a su campo;
  - el diálogo `rule_set_in_use`;
  - las globales con los alias;
  - la Overview de ProviderC-Alt con el enlace;
  - el diálogo New rule set del conjunto que crea la pasada.
- **Modo edición a 1024 px:** las celdas y los controles de las filas editables son más estrechos que los de lectura, para que las ocho columnas de una regla de hoja quepan en su tarjeta, y el error de un campo se parte dentro de su columna.
- **Lo que crea la captura** es un conjunto `bruno-<id de la pasada>` en Provider C, que queda inactivo. Lo ignoran los tests del seed (`admin-matching` D8), así que nada cambia en "Provider C legacy" ni en las globales.

## Risks / Trade-offs

- **[Última escritura gana]** Dos admins editando el mismo conjunto se pisan sin aviso. Lo acepta `admin-matching`, y el formulario siempre parte del último `GET`. Un aviso necesitaría `updatedAt` en el API.
- **[Reordenar entre prioridades distintas no se conserva]** El API ordena por `priority`, así que una regla movida por encima de otra de prioridad distinta vuelve a su sitio al guardar. La nota fija lo explica y la pantalla muestra el orden de la respuesta. Reordenar en el navegador sería decidir el orden por el API.
- **[El editor de un conjunto depende de las globales]** Sin `statuses` no hay `select` de estado. Si `GET /matching-rules/global` falla, la lectura sigue (`Status <id>`) y la edición espera al reintento.
- **[`useFieldArray` con 200 filas]** El límite del API cabe sin virtualizar. Las filas son controles nativos, no `Select` de Radix, para no montar 600 portales.
- **[Merges desde dos ramas]** La rama recibe `feature/entrega-3-MVP` y `feat/admin-matching` por merge. El PR espera a que `admin-matching` esté fusionado para que su diff sea solo el frontend.

## Migration Plan

- Sin migración ni cambios de API.
- Despliegue normal del frontend.
- **Rollback:** revertir el PR. La Overview vuelve a mostrar el conjunto sin enlace.
