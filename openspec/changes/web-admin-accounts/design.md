# Design — web-admin-accounts

## Context

La motivación y el alcance están en `proposal.md`; el comportamiento, en las delta specs `accounts`, `fees`, `web-shell` e `import`. El contrato del API es el design D2 de `admin-accounts` y sus delta specs, ya en la rama (63a88ae): esquemas en `packages/shared/src/catalog.ts` y rutas en `frontend/src/lib/api/schema.gen.ts`. `POST /providers/{id}/accounts` y `PATCH /accounts/{id}` ya están implementados (grupo 3 de `admin-accounts`); `GET /providers/{id}/matching-rule-sets` y el `409 account_inactive` llegan con su grupo 4. Este change trabaja contra MSW, y solo las capturas necesitan el backend real.

Lo que condiciona el diseño, comprobado en el código:

- **Rutas.** `app/router.tsx` declara rutas planas bajo `appRoute`. `/accounts/$accountId/fees` → `AccountFeesPage`, con `requires: 'fee.view'` y migas `Administration › Fees › Account fees`. La guarda de `AppLayout` junta los `staticData.requires` de **todas** las rutas coincidentes, y `Breadcrumbs` toma las migas de la más profunda que las declare. Por eso una ruta padre con hijas funciona sin tocar el layout.
- **Menú.** `nav-config.ts` tiene `activeWhen?: (pathname) => boolean`. Fees lo usa para activarse en `/accounts/<id>/fees` (web-admin-fees D2). Accounts se compara exacta con `/accounts`. Channel Assignment no tiene `to`, así que aparece deshabilitada.
- **Fees de la cuenta.** `features/fees/AccountFeesPage.tsx` mezcla una cabecera (título `Fees · <cuenta>`, jerarquía, `See all accounts`, **Add fee**) con la tarjeta de la tabla, los formularios (`FeeFormSheet`, `CloseFeeDialog`), el foco tras escribir (`focusAfterWrite`) y los estados de carga y error. Sus tests (`AccountFeesPage.test.tsx`, `fee-writes.test.tsx`) y la captura `e2e/screenshots/web-admin-fees.ts` buscan el título `Fees · <cuenta>`.
- **Accounts.** `AccountsPage` exige merchant → proveedor en la dirección. `ProviderAccounts` pinta la tabla y los enlaces **Settlements** y **Fees** (este último con `fee.view`). Las consultas de catálogo están en `features/accounts/queries.ts`, con claves por recurso: `['accounts', id]`, `['accounts', id, 'channels']`, `['providers', id]`, `['channels', { unassigned: true }]`.
- **Patrones que se reutilizan:**
  - `ReasonDialog` (AlertDialog; no se cierra con una petición en curso; error dentro del diálogo; el foco vuelve a la acción). Exige motivo, pero aquí el motivo es opcional.
  - `FeeFormSheet` (panel lateral con React Hook Form y errores del API por campo).
  - `fee-errors.ts` (`ApiError` → campos o mensaje general).
  - `canonical()` de `fee-form.ts` (normaliza un decimal como texto), que hoy es privada.
  - `rateToPercent` y `formatAuditDate`/`formatAuditDateTime` en `lib/format.ts`.
  - `useMe().permissions` para mostrar u ocultar.
- **UI.** No existe `components/ui/dialog.tsx`. `radix-ui` ya es dependencia, así que el diálogo de shadcn no añade paquetes.
- **MSW.** `test/msw/handlers.ts` sirve el catálogo desde `db.accounts`/`db.accountChannels`, con alcance (`visibleProvider`) y `404` fuera de él. Ya responde `createdBy`, `updatedAt`, `assignedInBatchNo` y `primaryAccount`. No hay handlers de escrituras de cuentas ni de conjuntos de reglas. Las respuestas de fees se validan con los esquemas de `@recon/shared` (`fees.ts`).
- **Usuarios.** Solo `admin` tiene `account.manage`. `analyst` tiene `settlement.process`. Todos tienen `fee.view`.

## Goals / Non-Goals

**Goals**

- Account Detail como contenedor de pestañas con direcciones propias. La pestaña Fees reutiliza el código de `features/fees` sin copiarlo.
- Formularios que no deciden reglas de negocio. Unicidad del nombre, conjunto válido y cuenta origen válida los decide el API; en local solo se rechaza lo que sería un `400` seguro.
- El dinero como texto de punta a punta: el tope nunca pasa por `number`.
- Un MSW que valida con los esquemas de `@recon/shared` y no decide reglas.

**Non-Goals**

- Lista global de cuentas, recuentos (fees activos, último batch, transacciones de un canal) y actividad: no hay endpoint (proposal, Fuera de alcance).
- Reescribir `AccountsPage`/`ProviderAccounts` o las tablas de fees.
- Administrar conjuntos de reglas (`admin-matching`).

## Decisions

### D1. Estructura

```
frontend/src/features/accounts/
  AccountDetailPage.tsx      /accounts/$accountId layout: header, actions, tabs, <Outlet/>
  AccountOverview.tsx        index child: data card + channels card
  AccountChannels.tsx        channels of the account (role, batch, term · reserve)
  NewAccountDialog.tsx       create (dialog)
  EditAccountSheet.tsx       edit (sheet)
  AccountStatusDialog.tsx    Close… / Reopen… (optional reason)
  ChannelAssignmentPage.tsx  /channel-assignment
  channel-assignment-search.ts  merchantId/providerId of the address
  account-form.ts            pure: values ⇄ AccountCreate / AccountPatch (only changed fields), local checks
  account-errors.ts          pure: ApiError → field errors / general message
  channel-display.ts         pure: term · reserve, role, "batch n"
  contract.ts                write calls and types from schema.gen.ts
  mutations.ts, permissions.ts (useCanManageAccounts)
  queries.ts                 + matchingRuleSetsQuery, channelsQuery, channelAccountsQuery
  strings.ts                 + detail, form, channelAssignment
frontend/src/features/fees/
  AccountFeesPanel.tsx       extracted from AccountFeesPage: card, table, Add fee, forms, focus, states
  (AccountFeesPage.tsx is removed: the route renders the panel inside Account Detail)
frontend/src/components/ui/dialog.tsx   shadcn dialog
frontend/src/lib/format.ts             + canonicalDecimal (moved from fee-form.ts)
frontend/src/test/msw/accounts.ts      account writes + matching rule sets fake (D9)
```

**Alternativa descartada:** poner Account Detail en una carpeta `features/account-detail`. La ficha es de cuentas, y `features/accounts` ya tiene sus consultas y textos.

### D2. Rutas, pestañas, migas y menú

- `accountDetailRoute`: `path: '/accounts/$accountId'`, `component: AccountDetailPage`, sin `requires` (como Settlement List: el API decide el alcance) y migas `['Administration', 'Accounts', 'Account detail']`. Hijas:
  - `accountOverviewRoute`: `path: '/'`, `AccountOverview`.
  - `accountFeesRoute`: `path: 'fees'`, `AccountFeesPanel`, `requires: 'fee.view'`. Las migas son las del padre, porque las de Fees ya no tienen sentido en una pestaña de la cuenta.
- Las pestañas son enlaces (`Link`) con `role="tab"` y `aria-selected` según la ruta activa, dentro de un `role="tablist"`. No se usa `components/ui/tabs` (Radix), porque su estado es local y aquí manda la dirección. La pestaña Fees solo se pinta con `fee.view`.
- `nav-config.ts`:
  - Accounts gana `activeWhen: (p) => /^\/accounts\/[^/]+(\/fees)?\/?$/.test(p)`.
  - Fees pierde su `activeWhen`. **Esto revierte web-admin-fees D2**: la página de fees de una cuenta pasa a ser una pestaña de su ficha, y la ficha es de Accounts.
  - Channel Assignment gana `to: '/channel-assignment'`.
  - `NavItem.to` añade `'/channel-assignment'`.
- `channelAssignmentRoute`: `path: '/channel-assignment'`, sin `requires`, `validateSearch` con `IntId` de `@recon/shared` (un valor inválido se descarta, como `list-search.ts`) y migas `['Administration', 'Channel Assignment']`.
- **Alternativa descartada:** pestañas con `?tab=fees` sobre una sola ruta. Rompería los enlaces existentes a `/accounts/$accountId/fees` y obligaría a una guarda de `fee.view` a mano.

### D3. `AccountFeesPanel`: extraer sin cambiar el comportamiento

- Pasa a `AccountFeesPanel` todo lo de `AccountFeesPage` salvo el `h1` y la jerarquía: la tarjeta con su `h2` (`Fees of the account`), **Add fee** junto al `h2`, `See all accounts` (enlace a `/fees` filtrado, dentro de la pestaña), la nota, los formularios y el foco.
- El panel lee `accountId` de `useParams({ from: '/app/accounts/$accountId/fees' })`. La cuenta (`accountQuery`) está en caché, compartida con la cabecera.
- `This account is not available.`: la cabecera de Account Detail ya lo muestra para un `404` de la cuenta y no pinta el `Outlet`. El panel conserva su manejo del `404` de `GET /accounts/{id}/fees` para el caso en que la cuenta se lea pero los fees no.
- **Tests:** `AccountFeesPage.test.tsx` y `fee-writes.test.tsx` siguen montando la ruta `/accounts/<id>/fees` y cambian solo lo que cambia la spec: el título pasa de `Fees · <cuenta>` (`h1`) a `<cuenta>` (`h1`) con la pestaña Fees seleccionada. Se renombra `AccountFeesPage.test.tsx` → `AccountFeesPanel.test.tsx`. `e2e/screenshots/web-admin-fees.ts` espera el nuevo `h1`.
- **Alternativa descartada:** montar `AccountFeesTable` directamente en Account Detail. Duplicaría el estado de los formularios, el foco y los errores que ya tiene la página de fees.

### D4. Cabecera y Overview

- **Cabecera:**
  - `h1` con el nombre, insignia de estado (nuevo `ACCOUNT_STATUS_TONE` en `lib/status-tone.ts`, con `toneOf`: `active` → `success`, `closed` → `neutral`) y `Merchant › Provider`.
  - Acciones: **Settlements** (enlace), **Edit** y **Close…**/**Reopen…** (`account.manage`), **New reconciliation** (`settlement.process` y `isActive`), que enlaza a `/reconciliations/new?merchantId&providerId&accountId`.
- **Overview, tarjeta General** (lista de definición):
  - Merchant / Provider, Reserve policy on chargeback, Reserve cap (`formatDecimal` o `none`).
  - Matching rules: el nombre del conjunto, buscado en `matchingRuleSetsQuery(providerId)` por `matchingRuleSetId`. Sin enlace: `None · global rules`. Si la consulta falla o el conjunto no aparece: `Rule set <id>`, sin bloquear.
  - Created: `formatAuditDate(createdAt)` + `by <userName>`. Last change: `formatAuditDateTime(updatedAt)`.
- **Overview, tarjeta Channels** (`AccountChannels`):
  - Columnas Channel, Gateway (`Gateway <gatewayId>`), Role here, Batch (`batch <assignedInBatchNo>` o `—`) y Term · reserve.
  - `channel-display.ts` es puro y con tests:
    - `termReserve(c)` → `14 d · 10 % / 180 d`, con `rateToPercent`, sin `Number`.
    - `roleOf(item)` → `primary` | `historical · primary in X` | `historical · no primary`.
- **Carga:** `Skeleton` por tarjeta. Error → `Could not load the account.` + **Retry** de lo que falló (como `ProviderAccounts`).

### D5. `account-form.ts`: valores ⇄ cuerpos

- **Valores:** `{ name, merchantId, providerId, policy, cap, copyFrom, ruleSetId, reason }`, todos como texto, como los guardan los inputs.
- **Validación local** (solo lo que sería un `400` seguro):
  - nombre recortado vacío o de más de 50 → `Name is required.` / `Use at most 50 characters.`;
  - tope que no casa con `^\d{1,15}(\.\d{1,4})?$` → `Enter an amount ≥ 0 with up to 4 decimals.`;
  - motivo de más de 500 caracteres.
  - El signo negativo se rechaza en local porque el dominio exige `≥ 0`. El `400` con `details.field = rollingReserveCapAmt` se sigue pintando (D6).
- **`createBody(values)`:** `AccountCreate` completo. Tope vacío → `null`; `copyFrom`/`ruleSetId` vacíos → `null`; `ruleSetId` como entero.
- **`patchBody(values, account)`:** solo los campos cambiados.
  - Nombre comparado tras recortar; un cambio solo de mayúsculas **es** un cambio, como en el dominio.
  - Tope con `canonicalDecimal` (`"50000"` = `"50000.0000"`).
  - Conjunto por id.
  - El motivo solo si hay algún cambio.
  - Sin cambios → `{ ok: false, general: 'Nothing to save.' }`.
- **Close/Reopen:** el cuerpo es `{ isActive, reason? }`. No pasa por `account-form.ts`.
- `canonicalDecimal` se mueve de `fee-form.ts` (`canonical`) a `lib/format.ts` y se exporta. `fee-form.ts` la importa, con sus tests intactos.
- **Tests:** `account-form.test.ts` cubre cada rama, incluidos la escala del tope, el cambio solo de mayúsculas, el desenlace (`null`), el motivo solo con cambios y que el tope viaja como string.
- **Alternativa descartada:** validar con `AccountCreate.safeParse` en el formulario. Daría mensajes de Zod en inglés técnico y no cubriría `≥ 0`. Sí se usa en el MSW (D9).

### D6. Errores del API en los formularios

`account-errors.ts` (puro, con tests) traduce un `ApiError` a `{ fields, general }`:

- `409 account_name_taken` → `fields.name = 'This name is already used by another account. Name must be unique.'`
- `400 validation_error` con `details.field` (forma de dominio):
  - `copyFeesFromAccountId` → `fields.copyFrom = 'Fees cannot be copied from this account.'`
  - `matchingRuleSetId` → `fields.ruleSetId = 'This rule set is no longer available for this provider.'`
  - `rollingReserveCapAmt` → `fields.cap = 'Enter an amount ≥ 0 with up to 4 decimals.'`
  - Además, `matchingRuleSetId` invalida `matchingRuleSetsQuery`.
- `400` con `details` en lista (esquema de Fastify) → `general = 'The account could not be saved: check the values.'`
- `403` → `You don't have permission to manage accounts.`
- `404` → `This account or provider is no longer available.`, e invalida la cuenta y el proveedor.
- `5xx` u otra respuesta → `The account could not be saved. Try again.`
- Error de red (sin respuesta, no es un `ApiError`) → `Could not reach the server. Try again.`

El formulario nunca se cierra ante un error y conserva lo escrito. El foco va al primer campo con error, en el orden visible, o al mensaje general (`role="alert"`), con el mismo criterio que `fee-focus.ts`. El mensaje general recupera el foco en cada envío rechazado, aunque repita el texto (`useShown` cuenta los intentos). Sin merchant, `createBody` marca también `merchantId`: el select de proveedor está deshabilitado y no puede recibir el foco.

### D7. Diálogo, panel y confirmación

- **`NewAccountDialog`** (`components/ui/dialog.tsx`, React Hook Form):
  - Merchant y proveedor con `merchantsQuery` y `providersQuery`, preseleccionados con los de `AccountsPage`.
  - Fees: `No fees` + `providerQuery(providerId).accounts` por nombre, con `(closed)` en las cerradas.
  - Matching rules: `None · global rules` + los conjuntos `isActive` de `matchingRuleSetsQuery(providerId)`.
  - Cambiar de merchant o de proveedor vacía `copyFrom` y `ruleSetId` (`setValue`).
  - **Create account** se deshabilita con la petición en curso, así que un doble clic hace una sola petición.
  - Con `201`: `setQueryData(['accounts', id], detail)`, invalidar `providerQuery(providerId)` y `matchingRuleSetsQuery(providerId)`, cerrar y `navigate` a la ficha.
- **`EditAccountSheet`** (`components/ui/sheet.tsx`):
  - Los mismos campos sin merchant, proveedor ni fees, más el motivo.
  - Matching rules ofrece los conjuntos activos más el actual aunque esté inactivo, marcado `(inactive)`, para que guardar sin tocarlo no lo cambie.
  - Con `200`: `setQueryData(['accounts', id], detail)` e invalidar `providerQuery(providerId)` (la lista de Accounts) y `['channels']` (el nombre de la cuenta aparece en Channel Assignment).
- **`AccountStatusDialog`:**
  - Sigue el patrón de `ReasonDialog` (AlertDialog; no se cierra con una petición en curso; error dentro; el foco vuelve a la acción), con el motivo **opcional**.
  - No se generaliza `ReasonDialog`: su motivo obligatorio es parte de la spec de settlement, y una opción `optional` añadiría ramas a un componente que funciona.
  - Con `200`: lo mismo que Edit.
- **Alternativa descartada:** editar en línea dentro de la Overview. El wireframe usa acciones de cabecera, y un panel conserva lo escrito ante un error igual que los fees.

### D8. Channel Assignment

- **Consultas:**
  - `channelsQuery` = `GET /channels`, clave `['channels', { unassigned: false }]`.
  - `unassignedChannelsQuery` (ya existe).
  - `merchantsQuery` y `useQueries(providersQuery(m))` por cada merchant visible, para nombrar merchant y proveedor de cada fila.
  - `useQueries(channelAccountsQuery(channelId))` = `GET /channels/{id}/accounts` por cada canal de la sección de principales (9 como máximo con `admin`, 7 con `viewer`; mismo patrón que `ProviderAccounts`).
- **Filtros:** `merchantId` y `providerId` opcionales en la dirección.
  - Elegir merchant borra el proveedor.
  - Un id que no está en las listas visibles → `This merchant or provider is not available.` y no se pintan las tablas.
  - Las listas se filtran en la pantalla: el API no tiene filtros en `GET /channels`.
- **Secciones:**
  - **Not assigned yet:** las filas de `?unassigned=true`.
  - **Primary account per channel:** el resto de `GET /channels`.
  - Primary account: `primaryAccount`, con enlace a la ficha, o `—`.
  - Since: el `assignedInBatchNo` de la fila `isPrimary` de `GET /channels/{id}/accounts`.
  - Historical accounts: las filas no principales, por nombre, o `—`.
- **Orden:** por nombre de canal en las dos secciones.
- **Errores:** cualquier consulta que falle → `Could not load channels.` + **Retry** de las que fallaron.
- **Alternativa descartada:** no mostrar Since ni las históricas para ahorrar las llamadas por canal. Decidido con la persona: el volumen es pequeño, y es lo que el administrador viene a comprobar.

### D9. MSW

`test/msw/accounts.ts`, registrado en `handlers.ts` como los demás, sobre el mismo `db`:

- **`POST /providers/{id}/accounts`:**
  - sin `account.manage` → `403`;
  - proveedor no visible → `404`;
  - cuerpo validado con `AccountCreate` → `400 validation_error` si no valida;
  - si no, guarda la cuenta en `db.accounts` y responde `201` con un `AccountDetail` validado con su esquema (`createdBy` = el usuario, `createdAt = updatedAt` = un instante fijo que avanza en cada escritura, como el `tick` de `fees.ts`).
  - No comprueba el nombre, el conjunto ni la cuenta origen, y no copia fees.
- **`PATCH /accounts/{id}`:**
  - `403` y `404` como arriba;
  - cuerpo con `AccountPatch` → `400`;
  - si no, aplica los campos y responde `200` con el `AccountDetail`.
- **`GET /providers/{id}/matching-rule-sets`:**
  - proveedor no visible → `404`;
  - si no, los fixtures `RULE_SETS` (Provider C legacy = 3, activo, con ProviderC-Alt; uno inactivo en Provider C para el caso del panel), con `accounts` calculadas desde `db.accounts`, validados con `MatchingRuleSetSummary`.
- **Errores de dominio guionados:** `409 account_name_taken`, `400` con `details.field`, `409 account_inactive` y los `500` de reintento los pone cada test con `server.use(...)`, como los de fees y settlements.
- **Tests del fake:** `accounts.test.ts` prueba que valida con los esquemas (un cuerpo inválido → `400`, una respuesta siempre parsea) y aplica alcance y permiso.

### D10. `409 account_inactive` en la subida

`rejectionText` de `features/imports/files/upload-queue.ts` gana el caso `account_inactive` → `strings.rejections.account_inactive` = `This account is closed. Choose another account.` Lo demás no cambia:

- la cola marca el archivo como rechazado;
- sin import creado, la pantalla sigue en New Reconciliation;
- los demás archivos de la selección intentan crear el import y reciben el mismo rechazo.

No se invalida la lista de cuentas de New Reconciliation: la persona puede elegir otra, y al recargar la cuenta cerrada desaparece.

### D11. Capturas

`e2e/screenshots/web-admin-accounts.ts`, como `web-admin-fees.ts`, contra el backend real con el seed:

- Accounts con **New account** (`admin`);
- el diálogo New account con Provider C y la copia de fees;
- `409` de nombre en uso;
- Overview de ProviderA-USD como `admin` y como `analyst`;
- pestaña Fees de ProviderA-USD;
- panel Edit;
- diálogo Close…;
- cuenta cerrada;
- Channel Assignment como `viewer`.

Cada una a 1280 y 1024 px, en `docs/wireframes/web-admin-accounts/`. Las cuentas que creen las capturas usan el prefijo `bruno-` para que los tests de integración las ignoren (`admin-accounts` D9) y se dejan cerradas.

## Risks / Trade-offs

- [El `activeWhen` de Accounts contradice web-admin-fees D2] → Se modifica la spec de `web-shell` en este change y el escenario "Entrada activa en los fees de una cuenta" pasa a Accounts.
- [Extraer `AccountFeesPanel` puede romper los tests de fees] → Se mueven sin cambiar lo que comprueban salvo el título. Primero se ejecuta la suite de fees con la extracción sola (grupo 2), antes de añadir nada de cuentas.
- [N+1 de `GET /channels/{id}/accounts` en Channel Assignment] → Como mucho 9 llamadas en paralelo con caché por canal. Si el catálogo crece, el API puede ampliar `GET /channels` (fuera de alcance).
- [`GET /providers/{id}/matching-rule-sets` responde `501` hasta el grupo 4 de `admin-accounts`] → La Overview cae a `Rule set <id>` y el diálogo a `None · global rules`. Las capturas esperan a ese grupo.
- [Las capturas crean cuentas en la base local] → Prefijo `bruno-`, cerradas al terminar; desaparecen con el siguiente `pnpm db:seed` ejecutado por la persona.

## Migration Plan

- Sin cambios de API ni de base. Despliegue normal del frontend.
- **Rollback:** revertir el PR. La ruta `/accounts/$accountId/fees` vuelve a ser la página de fees independiente.
