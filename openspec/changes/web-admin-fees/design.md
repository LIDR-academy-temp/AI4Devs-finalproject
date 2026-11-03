# Design — web-admin-fees

## Context

La motivación y el alcance están en `proposal.md`; el comportamiento, en las delta specs `fees`, `web-shell` y `settlement`. El contrato del API es el design D2 de `admin-fees` y su delta spec `fees`, ya publicados en `origin/feat/admin-fees` (8a2b415): esquemas en `packages/shared/src/fees.ts` y rutas en `frontend/src/lib/api/schema.gen.ts`. Mientras `admin-fees` no termine sus grupos 4 y 5, las rutas nuevas responden `501`: este change trabaja contra MSW y solo las capturas (último grupo) necesitan el backend real.

Lo que condiciona el diseño, comprobado en el código:

**Patrones del frontend que se reutilizan.**
- Listas con filtros en la dirección: `settlements/list-search.ts` (validación con esquemas de `@recon/shared`, `dropUndefined`), `navigate({ search, resetScroll: false })`, un filtro nuevo vuelve a la página 1, `Pager` + `useLastPageLimit`, `ListHeading` para el foco.
- Llamadas con el cliente tipado (`api.GET/POST/PATCH` + `unwrap`) y tipos derivados de `schema.gen.ts` (`ApiResponse<…>`), como `settlements/contract.ts`. Las fechas de negocio se marcan con `BusinessDate` y las de auditoría con `AuditInstant` (`lib/format.ts`).
- Permisos de presentación con `useMe().permissions` (`imports/permissions.ts`); la ruta declara `staticData.requires` y la guarda muestra `ForbiddenPage`.
- Formularios con React Hook Form (`ResolveForm`, `LoginPage`); diálogos de confirmación con motivo en `settlements/ReasonDialog.tsx`; panel lateral con `components/ui/sheet.tsx` (`validations/IssueDrawer.tsx`).
- Textos en un `strings.ts` por feature; colores de estado en `lib/status-tone.ts`.

**MSW hoy.** `test/msw/settlements.ts` sirve `GET /accounts/{id}/fees` (solo los preestablecidos de `ACCOUNT_FEES`, ya con los campos ampliados) y `GET /fee-types` (`FEE_TYPE_VIEWS`, los 27 tipos del seed). Settlement Review y sus tests dependen de ambos.

**Navegación.** `Sidebar` marca activa una entrada por ruta exacta o por el prefijo `activeUnder`. Accounts usa `exact: true`, así que `/accounts/<id>/fees` no la activa; Fees necesita activarse en `/fees` y en `/accounts/<id>/fees`, que un prefijo no expresa.

**Usuarios.** Solo `admin` tiene `fee.manage`; `analyst`, `payments` y `viewer` tienen `fee.view`.

## Goals / Non-Goals

**Goals:**
- Pantallas que no calculan reglas de negocio: estado, uso, fecha mínima de cierre, solapes y orden vienen del API.
- Dinero y porcentajes como texto decimal de punta a punta, sin pasar por `number`.
- Un único MSW de fees que valida con los esquemas de `@recon/shared` y que Settlement Review sigue usando sin cambiar de comportamiento.

**Non-Goals:**
- Reproducir en MSW las reglas de solape o de uso del dominio: el fake responde lo que el test le guiona (como `settlements.ts`).
- Componentes de tabla genéricos o un refactor de Settlement List.
- Variantes condicionales y por marca, Export CSV, simulate, retirada (ver proposal).

## Decisions

### D1. Estructura

```
frontend/src/features/fees/
  FeesPage.tsx              /fees: filters + table + pager (read only)
  FeeFilters.tsx            merchant → provider → account cascade with "All", kind, status, search
  FeesTable.tsx             global rows (merchant, provider, account columns)
  AccountFeesPage.tsx       /accounts/$accountId/fees: header, table, actions by permission and use
  AccountFeesTable.tsx      account rows + row actions
  FeeFormSheet.tsx          one form, three modes: create | correct | change (D4)
  CloseFeeDialog.tsx        end date (default today NY, min lastAppliedEventDate) + reason
  FeeHistorySheet.tsx       history of the type chain, newest first, before → after diff
  fee-display.ts            pure: value, validity, applies-to, history diff labels
  fee-form.ts               pure: form values ⇄ FeeCreate / FeeCorrection / FeeChange bodies (only changed fields)
  fee-errors.ts             pure: ApiError → field errors / overlap list / in-use message
  fees-search.ts            search params of /fees (D3)
  contract.ts               API calls and types from schema.gen.ts
  queries.ts, mutations.ts, permissions.ts, strings.ts
frontend/src/lib/format.ts  + newYorkToday(clock), percentToRate, rateToPercent (D5, D6)
frontend/src/test/msw/fees.ts  fees fake (D8)
```

Se elige una carpeta `features/fees` propia y no ampliar `accounts`: Account Detail (`admin-accounts`) podrá montar `AccountFeesTable` como pestaña sin moverla.

### D2. Rutas, migas y menú

- `/fees` → `FeesPage`, `staticData: { requires: 'fee.view', crumbs: ['Administration', 'Fees'] }`, `validateSearch: validateFeesSearch`.
- `/accounts/$accountId/fees` → `AccountFeesPage`, `requires: 'fee.view'`, migas `['Administration', 'Fees', 'Account fees']`. La cabecera lleva el nombre de la cuenta (de `GET /accounts/{id}`) y un enlace `see all accounts` a `/fees?accountId=…`. Las migas son estáticas, como en el resto de rutas.
- `nav-config.ts`: Fees gana `to: '/fees'`. `activeUnder` pasa de prefijo a `activeWhen?: (pathname) => boolean`, para que Fees sea activa en `/accounts/<id>/fees` sin activar Accounts (que sigue en `exact`). New Reconciliation conserva su comportamiento (`startsWith('/imports/')`). Alternativa descartada: un regex en datos; una función es igual de declarativa y tipada.
- `ProviderAccounts.tsx`: columna con el enlace **Fees** (`aria-label` `Fees of <cuenta>`), visible solo con `fee.view`, también para cuentas cerradas (sus fees siguen ahí).

### D3. Dirección de `/fees`

`FeesSearch = { merchantId?, providerId?, accountId?, kind?, status?: FeeStatus | 'all', q?, page? }`, validada con `IntId`, `z.uuid()`, `FeeKind` y `FeeStatus` de `@recon/shared`; un valor inválido se descarta (como `list-search.ts`).

- `status` ausente ⇒ se pide `status=active`; `status=all` ⇒ se pide sin `status`. Así el valor por defecto no ensucia la dirección y "todos" es compartible.
- Cambiar merchant borra proveedor y cuenta; cambiar proveedor borra la cuenta. Cualquier filtro borra `page`.
- `q` se escribe en la dirección con `useDebouncedValue` (300 ms) y se recorta; vacío ⇒ ausente. Longitud máxima 100, como `FeesQuery`.
- `pageSize` no va en la dirección: se usa el del API (50).
- Los desplegables en cascada usan `merchantsQuery`, `providersQuery` y `providerQuery` de `features/accounts/queries.ts`, con la opción `All …`. No se reutiliza `AccountPicker` porque obliga a elegir y preselecciona; aquí cada nivel es opcional. Un id que no está en las listas visibles se muestra como `This selection is not available.` y no se pide `GET /fees` (evita el `404` esperado del API).

### D4. Un formulario, tres modos

`FeeFormSheet` (panel lateral, para que la tabla siga visible como en el wireframe) recibe `mode`:

| Modo | Campos editables | Cuerpo |
|---|---|---|
| `create` | tipo, importe, porcentaje, `Valid from`/`always`, `Valid to`/`no end date`, descripción | `FeeCreate` completo |
| `correct` (sin uso) | todos menos el tipo, + motivo | `FeeCorrection` con solo los campos cambiados |
| `correct` (en uso) | descripción, `Valid to`, + motivo; el resto se ve deshabilitado con la explicación | ídem |
| `change` | `Effective from`, importe, porcentaje, descripción, + motivo | `FeeChange` con `effectiveFrom` y solo los valores cambiados |

- `fee-form.ts` es puro y con tests: valores del formulario (strings) → cuerpo. "Cambiado" se compara como texto normalizado (`"15"` y `"15.0000"` son el mismo importe) usando las mismas funciones de D6, nunca `Number`.
- Validación local mínima, la que evita un viaje seguro al `400`: al menos importe o porcentaje (create/correct), algún valor cambiado (`Nothing to save.` / `Change at least one value.`), formato de importe (hasta 4 decimales, puede ser negativo según `Money`) y porcentaje (0–100 con hasta 4 decimales, que dan 6 en fracción), descripción ≤ 100, motivo ≤ 500. El resto (`endDate < startDate`, solapes, uso, límites de `effectiveFrom`) lo decide el API y se pinta con D7.
- En `change`, el texto de ayuda dice el día de cierre (`The current fee will end on <effectiveFrom − 1>.`) calculado como texto de fecha civil; el mínimo de `effectiveFrom` no se calcula en la pantalla salvo `lastAppliedEventDate + 1` como `min` del input, que es solo una ayuda: el `409` sigue siendo la fuente.
- Un envío en curso deshabilita **Save** (un clic doble = una petición), como `Mark as paid`.

Alternativa descartada: tres formularios separados. Comparten casi todos los campos y la conversión; separar triplicaría la lógica de porcentajes.

### D5. "Hoy" en Nueva York

`newYorkToday(now = new Date()): BusinessDate` en `lib/format.ts`, con `Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TIME_ZONE, year, month, day })` → `YYYY-MM-DD`. Tests con relojes fijos a ambos lados de medianoche en Nueva York (p. ej. `2026-11-04T03:30:00Z` → `2026-11-03`) y en el cambio de horario. Solo alimenta el valor por defecto de **Close…**: `defaultEnd = max(newYorkToday(), lastAppliedEventDate)`, comparando texto `YYYY-MM-DD`.

### D6. Porcentajes e importes como texto

- `percentToRate("2.75") → "0.027500"` y `rateToPercent("0.027500") → "2.75"` desplazan la coma dos posiciones sobre el texto (sin `parseFloat`), con tests de bordes (`"0"`, `"100"`, `"0.0001"`, ceros a la izquierda).
- El formulario rechaza en local, antes de convertir, un porcentaje con más de 4 decimales en tanto por ciento (más de 6 en fracción) y uno fuera de 0–100, comparando sobre el texto; un test para cada rechazo.
- Visualización: porcentaje con 3 decimales y ` %` (`2.900 %`, como el wireframe) e importes con `formatDecimal` (4 decimales). El valor enviado conserva la precisión escrita; el API normaliza a `Money4`/`Rate6`.

### D7. Errores del API en los formularios

`fee-errors.ts` traduce un `ApiError` a un resultado que el formulario pinta:
- `400 validation_error` con `details.field` (forma de dominio) → error en ese campo (`fixedAmount` marca importe y porcentaje). Con `details` como lista `{ path, message }` (esquema de Fastify) → mensaje general.
- `409 fee_overlap` → `Overlaps another <tipo> fee:` y la lista de `details.conflicts` con `formatValidity` (`always` / `open`). Se valida `details` con `FeeOverlapDetails` de `@recon/shared`; si no valida, mensaje genérico.
- `409 fee_in_use` (`FeeInUseDetails`) → con `fields`: esos campos ya no son editables; con `lastAppliedEventDate`: la fecha mínima. En los dos casos se invalidan los fees de la cuenta, porque la pantalla tenía un `inUse` viejo.
- `403`, `404` y red → mensaje en el formulario; un `404` además invalida la lista.

El formulario nunca se cierra ante un error y conserva lo escrito.

### D8. MSW de fees

`test/msw/fees.ts` pasa a ser el dueño de `GET /accounts/{id}/fees` y `GET /fee-types`, movidos desde `settlements.ts` partiendo de la versión que dejó `admin-fees` (el fixture `preset` ya trae los campos ampliados de `AccountFee`); `settlements.ts` reexporta `ACCOUNT_FEES` y `FEE_TYPE_VIEWS` si sus tests los importan. Además añade:

- `GET /fees`: valida la consulta con `FeesQuery` (`400 validation_error` si no valida, `fee.view` o `403`, merchant/proveedor/cuenta fuera del alcance → `404`). Filtra por alcance, ids, `kind`, `status` y `q` sobre los fixtures y pagina. Ordena con la regla documentada del API (spec `fees` "Orden de la vista global") para que los fees que crea un test caigan en su sitio; no es una regla de negocio que la pantalla tenga que imitar.
- `POST /accounts/{id}/fees`: `fee.manage` o `403`, cuenta visible o `404`, cuerpo con `FeeCreate` o `400`; guarda y responde `201` con una `AccountFee` (`status` según la fecha de hoy inyectada, `inUse = false`).
- `PATCH /fees/{id}`: `fee.manage` antes que el alcance; cuerpo con `FeePatch`; aplica la corrección o el cambio (cierre + sucesor) en el estado del fake y responde `FeeUpdateResult`.
- `GET /fees/{id}/history`: `FeeHistoryQuery`; filas guardadas por el fake en cada escritura, más las sembradas.
- Respuestas guionadas por test (`respondNextFee(route, { status, code, details })`) para `fee_overlap`, `fee_in_use` y `validation_error`: el fake no decide solapes ni uso.
- Registro de peticiones (`feeRequests(route)`) para comprobar cuerpos y doble clic.
- Toda respuesta del fake se construye con los tipos de `@recon/shared` y un test del fake comprueba que pasa `AccountFee`/`FeePage`/`FeeUpdateResult`/`FeeHistoryEntry.parse`.

Los fixtures de fees transaccionales se añaden a `ACCOUNT_FEES` y Settlement Review sigue recibiendo solo los no transaccionales porque el handler filtra por `transactional` (hoy devuelve `[]` para `true`, ahora filtrará de verdad). Los tests de `settlements/*` deben seguir en verde sin tocarlos.

### D9. Consultas y caché

- Claves: `['fees', search]` para la vista global; `['accounts', accountId, 'fees', {}]` para la página de la cuenta (prefijo compartido con la consulta de Settlement Review, `['accounts', id, 'fees', { transactional: false, asOf }]`); `['fees', feeId, 'history']`.
- Tras una escritura correcta: se escribe la respuesta en la caché de la cuenta (fee + sucesor) para pintar sin esperar y se invalidan `['accounts', accountId, 'fees']` (también Settlement Review), `['fees']` (vista global e historiales).
- `placeholderData: keepPreviousData` en la vista global para que el `Pager` no parpadee, como Settlement List.

### D10. Línea del Settlement Summary

En `SummaryHeader.tsx`, junto al aviso de no Settled: `view.status === 'processed' && !useCanPay()` → `<p>` con `Waiting for a user with payment permission to mark it as paid.` (texto en `settlements/strings.ts`, tono neutro, `text-muted-foreground`). Se decide por `status` y no por `settledStatus` porque la regla habla del intento `processed`. Test `it.each` con los cuatro usuarios en `processed` y con `paid`/`undone`, en la línea de `lifecycle-actions.test.tsx`.

### D11. Capturas

`e2e/screenshots/web-admin-fees.ts` contra el backend local, como `settlement-lifecycle.ts`: vista global (1280 y 1024), página de una cuenta como `admin` y como `analyst`, formulario con el `409 fee_overlap`, **Close…** con el mínimo y el historial. Se guardan en `docs/wireframes/web-admin-fees/`. Necesita `admin-fees` implementado (grupos 4–5) y la base sembrada por la persona.

## Risks / Trade-offs

- **[Contrato antes que la lógica]** `admin-fees` puede ajustar un esquema en sus grupos 4–5. → El front usa los tipos de `schema.gen.ts` y los esquemas de shared: un cambio rompe `pnpm typecheck` o el test del fake. Antes del PR se vuelve a hacer `git fetch` y rebase sobre `origin/feat/admin-fees`.
- **[MSW sin reglas]** Un fake que no decide solapes ni uso puede ocultar un malentendido del contrato. → Las respuestas guionadas usan los `details` de los ejemplos de la spec de `admin-fees`, y las capturas del último grupo recorren el backend real.
- **[`inUse` viejo]** La pantalla puede ofrecer **Edit** completo a un fee que acaba de usarse. → El `409 fee_in_use` lo explica e invalida la lista (D7).
- **[Mover handlers de MSW]** Sacar `GET /accounts/{id}/fees` de `settlements.ts` puede romper Settlement Review. → Se mueve sin cambiar respuestas y la suite de `settlements/*` es el criterio; el filtro `transactional=true` deja de devolver `[]` siempre, pero Settlement Review solo pide `false`.
- **[Hoy en el navegador]** El reloj del usuario puede estar mal. → Solo es el valor por defecto; el API valida el cierre.
- **[Migas estáticas]** `Administration › Fees › Account fees` no muestra el nombre de la cuenta en las migas. → Sale en el título; se revisará con Account Detail.

## Migration Plan

Sin migraciones ni despliegue especial. Orden de merge: `admin-fees` primero; esta rama se rebasa con `git rebase --onto feature/entrega-3-MVP origin/feat/admin-fees` y su PR va después. Rollback: revertir el merge del PR; el menú vuelve a "Soon".
