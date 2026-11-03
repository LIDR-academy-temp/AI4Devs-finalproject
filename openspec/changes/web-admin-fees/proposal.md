# Proposal — web-admin-fees

Issue #80, parte 1 de 3 (fees), en su lado de pantallas. El backend es el change `admin-fees` (rama `feat/admin-fees`); su design D2 y su delta spec `fees` son el contrato de este change. Después vienen `admin-accounts` (con Account Detail) y `admin-matching`.

Es un change **solo de frontend**: pantallas, MSW, tests y documentación. No toca el API, la base de datos ni la colección Bruno.

## Why

`admin-fees` deja a la aplicación crear, corregir, cambiar desde una fecha y cerrar fees, pero sin pantalla solo se puede hacer con el API a mano. Quien administra fees, que hoy lo hace por SQL (README §1.1), necesita las pantallas **Fees** (vista global) y **Account Fees / Fee History** de README §1.3. La entrada Fees del menú lleva desde la Entrega 2 en "Soon".

Además, en la cabecera del Settlement Summary, quien no tiene `payment.process` ve un intento `processed` sin ninguna acción y sin saber qué falta. Decidido el 3-nov: decírselo en una línea.

## What Changes

**Vista global `/fees`** (permiso `fee.view`, solo lectura)
- Tabla paginada en servidor con `GET /fees`: la cuenta con su merchant y su proveedor debajo, en cada fila (en el orden que da el API, sin cabeceras de grupo que se corten entre páginas; en una sola columna para que quepa a 1024 px, decidido al ver las capturas), tipo, a qué aplica, valor, vigencia (`always` / `open`), estado y último cambio.
- Filtros en la dirección: merchant, proveedor, cuenta, `kind` (`transactional` | `preset` | `free_amount`), `status` (`active` | `scheduled` | `closed`; **por defecto `active`**, con la opción de ver todos) y búsqueda `q`.
- Cada cuenta enlaza a su página de fees.

**Fees de una cuenta `/accounts/$accountId/fees`** (`fee.view` para verla; las acciones, solo con `fee.manage`)
- Lista de todos los fees de la cuenta (activos, programados y cerrados) con `GET /accounts/{id}/fees`.
- **Add fee**: tipo, importe fijo y/o porcentaje, vigencia (`always` / `no end date`) y descripción. Sin variantes condicionales ni por marca.
- **Fee sin uso** (`inUse = false`): **Edit** completo en el sitio.
- **Fee en uso**: **Edit** limitado a descripción y fecha de fin, y **Change from date…** (`effectiveFrom` + valores nuevos: cierra el vigente y abre el sucesor en una sola llamada).
- **Close…**: pide la fecha de fin, por defecto el día de hoy en Nueva York, con el mínimo `lastAppliedEventDate` que da el API (la pantalla no lo calcula). Motivo opcional en todas las escrituras.
- **Sin acción de retirar** un fee programado (roadmap #109 en `admin-fees`).
- **History**: historial de la cadena del tipo (`GET /fees/{id}/history?scope=type`) en un panel lateral.
- Los `400 validation_error` con `details.field`, `409 fee_overlap` (con los conflictos de `details`) y `409 fee_in_use` (campos rechazados o `lastAppliedEventDate`) se muestran en el formulario, junto al campo cuando se puede.
- Se llega desde `/fees` y desde Administration › Accounts (enlace **Fees** por cuenta). Account Detail llega con `admin-accounts`.

**Menú**: la entrada Administration › Fees pasa de "Soon" a enlace a `/fees` (sigue exigiendo `fee.view`), activa también en `/accounts/$accountId/fees`.

**Settlement Summary**: en un intento `processed`, quien no tiene `payment.process` (`analyst`, `viewer`) ve `Waiting for a user with payment permission to mark it as paid.`; `payments` y `admin` no la ven, ni nadie en un intento `paid` o `undone`.

**Utilidades**: "hoy" en Nueva York como `YYYY-MM-DD` en `lib/format.ts` (solo valor por defecto de Close; el límite lo pone el API) y conversión de porcentaje a fracción y vuelta como texto decimal, nunca por coma flotante.

**API falsa (MSW)**: handlers de `GET /fees`, `GET /accounts/{id}/fees`, `POST /accounts/{id}/fees`, `PATCH /fees/{id}` y `GET /fees/{id}/history` que validan consulta y cuerpos con los esquemas de `@recon/shared` (`FeesQuery`, `FeeCreate`, `FeePatch`, `FeeHistoryQuery`) y responden con la forma de `AccountFee`, `FeePage`, `FeeUpdateResult` y `FeeHistoryEntry`. No se duplica ningún esquema en el front.

**Documentación**: README §1.3 (filas de Fees y Account Fees: filtros, paginación, columnas en vez de grupos, acceso desde Accounts) y capturas en `docs/wireframes/web-admin-fees/`.

**Fuera de alcance**: Export CSV de la vista global y simulate (roadmap), la retirada de un fee programado (#109), las variantes condicionales y por marca en el formulario, Account Detail (`admin-accounts`) y cualquier cambio de backend.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `fees`: requisitos nuevos de las pantallas Fees (vista global) y Account Fees / Fee History: acceso, columnas, filtros y paginación, alta, edición según uso, cambio desde una fecha, cierre, historial y errores.
- `web-shell`: "Navegación filtrada por permisos" pasa a tener Fees como enlace para quien tiene `fee.view`.
- `settlement`: requisito nuevo en Settlement Summary, el aviso de espera del pago para quien no tiene `payment.process`.

## Impact

- **Código (frontend)**:
  - `frontend/src/features/fees/` nuevo: páginas, filtros, formularios, panel de historial, consultas, mutaciones, textos y tests.
  - `frontend/src/app/router.tsx` (dos rutas), `app/layout/nav-config.ts` y su test.
  - `frontend/src/features/accounts/ProviderAccounts.tsx` (enlace Fees) y sus textos.
  - `frontend/src/features/settlements/SummaryHeader.tsx`, `strings.ts` y un test.
  - `frontend/src/lib/format.ts` (hoy en Nueva York, porcentajes) y su test.
  - `frontend/src/test/msw/`: `fees.ts` nuevo; los handlers de `GET /accounts/{id}/fees` y `GET /fee-types` pasan de `settlements.ts` a `fees.ts` sin cambiar lo que ve Settlement Review.
- **Dependencias**: ninguna nueva. Usa los esquemas de `@recon/shared` y el `schema.gen.ts` que publica `admin-fees` en su grupo 1.
- **Rama**: `feat/web-admin-fees` rebasada sobre `origin/feat/admin-fees`; cuando este se mergee, `rebase --onto feature/entrega-3-MVP`. El PR va a `feature/entrega-3-MVP` después del de `admin-fees`.
- **API, base de datos y colección Bruno**: sin cambios.
