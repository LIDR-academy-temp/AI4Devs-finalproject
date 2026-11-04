# Proposal — web-admin-accounts

Issue #80, parte 2 de 3 (cuentas y canales), en su lado de pantallas. El backend es el change `admin-accounts` (rama `feat/admin-accounts`); su proposal, su design (D2, contrato en `@recon/shared`) y sus delta specs `accounts`, `fees`, `import` y `matching` son el contrato de este change. El grupo 1 de `admin-accounts` ya publicó los esquemas, `docs/openapi.yaml` y `schema.gen.ts`; las escrituras responden `501` hasta sus grupos 3 y 4, así que este change trabaja contra MSW y solo las capturas (último grupo) necesitan el backend real.

## Why

Hoy Administration › Accounts solo lista las cuentas de un proveedor: no hay ficha de la cuenta, no se puede crear, editar, cerrar ni reabrir una cuenta desde la aplicación, y Channel Assignment aparece deshabilitada en el menú. Con el API de `admin-accounts` publicado, la cuenta —la única entidad propia del Recon Tool (README §1.2)— pasa a administrarse desde la pantalla, como prevé el mapa de README §1.3 (Accounts / Account Detail, Channel Assignment).

## What Changes

**Account Detail** (`/accounts/$accountId`, todos los roles con la cuenta en su alcance)

- Cabecera con el nombre de la cuenta, su estado (`active` / `closed`), merchant y proveedor, un enlace a sus settlements (`/settlements?…&accountId=`) y, según permiso, **Edit**, **Close…** / **Reopen…** (`account.manage`) y **New reconciliation** (`settlement.process`, solo si la cuenta está abierta).
- Dos pestañas, cada una con su ruta para que recargar o compartir conserve la pestaña:
  - **Overview** (`/accounts/$accountId`): política de reserva ante chargeback, tope, conjunto de reglas de pareo por nombre (o `None · global rules`), quién y cuándo la creó, última modificación; y la tarjeta **Channels**: cada canal con su papel en la cuenta (principal o histórico, y en ese caso la cuenta principal actual), `batch <assignedInBatchNo>` de la asociación, term y reserva. Nota fija: los canales nunca se asignan a mano.
  - **Fees** (`/accounts/$accountId/fees`): la tabla y las acciones de fees de la cuenta de `web-admin-fees`, montadas como pestaña sin duplicarlas. La ruta ya existe; los enlaces actuales (vista global de Fees, enlace **Fees** de Accounts) siguen funcionando y ahora llegan a la pestaña.
- Cuenta inexistente o fuera del alcance: `This account is not available.`
- Fuera: pestañas Matching rules (`admin-matching`), Settlements (solo el enlace de la cabecera) y Activity (no hay endpoint de auditoría por cuenta).

**Crear, editar, cerrar y reabrir** (`account.manage`; solo `admin`)

- **New account**: botón en Accounts que abre un diálogo con nombre, merchant y proveedor (preseleccionados desde el filtro de la página), política de reserva, tope opcional, fees (`No fees` por defecto o copiar los de otra cuenta del proveedor, abierta o cerrada) y conjunto de reglas (`None · global rules` o un conjunto activo del proveedor, de `GET /providers/{id}/matching-rule-sets`). Al crear, se navega a Account Detail de la cuenta nueva. El texto de ayuda dice `Name must be unique` (el wireframe decía "unique per provider"; el README y el API la hacen única en todo el sistema).
- **Edit**: panel lateral con nombre, política, tope, conjunto y motivo opcional; envía solo lo que cambió.
- **Close…** / **Reopen…**: confirmación con motivo opcional.
- **Errores**, sin cerrar el formulario ni perder lo escrito: `409 account_name_taken` en el campo Name; `400 validation_error` con `details.field` (`copyFeesFromAccountId`, `matchingRuleSetId`, `rollingReserveCapAmt`) en ese campo; el resto (`400` de esquema, `403`, `404`, red) como mensaje del formulario.

**Channel Assignment** (`/channel-assignment`, solo lectura, todos los roles)

- Entrada del menú habilitada.
- Filtros opcionales de merchant y proveedor en la dirección.
- **Not assigned yet**: canales con transacciones y sin cuenta (`GET /channels?unassigned=true`), con gateway (`Gateway <id>`), merchant y proveedor, term y reserva.
- **Primary account per channel**: el resto de canales visibles con su cuenta principal (enlace a Account Detail), desde qué batch lo es y sus cuentas históricas (`GET /channels/{id}/accounts`). Nota fija: la asignación ocurre al procesar settlements y deshacer un batch no la revierte.
- Fuera: recuentos de transacciones y "first seen" (no los da el API).

**Accounts** (lista actual)

- Se mantiene la selección merchant → proveedor (no hay lista global de cuentas en el API).
- El nombre de cada cuenta enlaza a Account Detail; botón **New account** con `account.manage`.

**Navegación**

- Accounts queda activa en el menú en `/accounts/<id>` y `/accounts/<id>/fees`. Esto revierte la regla de `web-admin-fees` (design D2) que activaba Fees en `/accounts/<id>/fees`: la página de fees de una cuenta pasa a ser una pestaña de su ficha.
- Migas de Account Detail: `Administration › Accounts › Account detail` (estáticas, como el resto; el nombre va en el título).

**New Reconciliation**

- `409 account_inactive` al crear el import (cuenta cerrada entre la elección y la subida) se muestra como `This account is closed.`; la pantalla ya no lista cuentas cerradas.

**MSW**

- Handlers de `POST /providers/{id}/accounts`, `PATCH /accounts/{id}` y `GET /providers/{id}/matching-rule-sets`, que validan cuerpos y respuestas con `AccountCreate`, `AccountPatch`, `AccountDetail` y `MatchingRuleSetSummary` de `@recon/shared` y guardan lo creado. El fake no decide reglas de negocio: los `409` y los `400` de dominio los guiona cada test.

**Capturas** a 1280 y 1024 px contra el backend real (necesitan los grupos 3 y 4 de `admin-accounts` y turno de base).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `accounts`: requisitos nuevos de pantalla para Account Detail (cabecera y acciones, Overview, canales), New account, Edit, Close/Reopen, errores de los formularios y Channel Assignment; **MODIFIED** "Pantalla Accounts: cuentas del proveedor" (enlace a Account Detail y botón New account).
- `fees`: **MODIFIED** "Pantalla Account Fees: acceso y contenido" (pasa a ser la pestaña Fees de Account Detail, con la cabecera de la cuenta).
- `web-shell`: **MODIFIED** "Navegación filtrada por permisos" (Channel Assignment habilitada; Accounts activa dentro de una cuenta, Fees no).
- `import`: **MODIFIED** "Pantalla Upload Files: archivos rechazados" (motivo de `409 account_inactive` cuando la primera subida intenta crear el import en una cuenta cerrada).

## Impact

- **Código (solo `frontend/`):**
  - `features/accounts/`: `AccountDetailPage` (cabecera, pestañas, Overview, canales), `NewAccountDialog`, `EditAccountSheet`, diálogo de cierre y reapertura, `ChannelAssignmentPage`, errores, contrato, mutaciones y permisos; `ProviderAccounts` con el enlace y `AccountsPage` con el botón.
  - `features/fees/`: `AccountFeesPanel` extraído de `AccountFeesPage` (tabla, acciones y formularios sin la cabecera), sin cambiar su comportamiento.
  - `features/imports/`: mensaje de `409 account_inactive`.
  - `app/router.tsx`, `app/layout/nav-config.ts` (Channel Assignment habilitada, `activeWhen` de Accounts en lugar del de Fees) y sus textos.
  - `components/ui/dialog.tsx` (shadcn) nuevo.
  - `test/msw/`: handlers y fixtures de escrituras de cuentas y de conjuntos de reglas.
- **API, base de datos y backend:** ningún cambio; el contrato es el de `admin-accounts`.
- **Documentación:** capturas en `docs/wireframes/web-admin-accounts/` y la mención en README §1.3.
- **Dependencia:** la rama avanza por fast-forward a `origin/feat/admin-accounts` cuando esta integre `feature/entrega-3-MVP` (con `features/fees` de `web-admin-fees` y las specs vivas sincronizadas en #116). La delta de `fees` se escribe contra esas specs.
- **Fuera de alcance:** lista global de cuentas con filtros y búsqueda, recuentos de fees y último batch por cuenta, actividad de la cuenta, recuentos y primera vista de los canales sin asignar, asignación manual de canales (no existe por diseño) y administración de conjuntos de reglas (`admin-matching`).
