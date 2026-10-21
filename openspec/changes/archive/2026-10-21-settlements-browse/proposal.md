# Proposal — settlements-browse

Issue: #64 · lista de Settlements de la cuenta. Se apoya en `summary-exports` (#12: lector del intento, alcance con `404` idéntico, `GET /settlements/{id}/transactions` con orden estable `(cycle, sheetId, rowNo, settlementTxnId)`), `web-settlement` (#13: Settlement Summary, `contract.ts` con tipos generados, falso de MSW guionizado y validado con `@recon/shared`, `BusinessDate` / `AuditInstant`, capturas con Playwright) y `catalog-read` / `web-shell` (Accounts, `404` idéntico, menú filtrado por permisos), todos archivados. Change pequeño y **de solo lectura**: no escribe nada en la base.

## Why

Hoy la única forma de llegar a un Settlement Summary es procesar un batch o el enlace del import procesado en Analysis. La entrada **Settlements › Settlement List** del menú está deshabilitada, los 68 batches pagados del seed no se ven desde ninguna pantalla y el Summary no enseña los movimientos que forman sus cifras. Para la demo de la Entrega 2 hace falta poder buscar un settlement de una cuenta, abrirlo y ver sus movimientos E / I / R. Además es la base del tramo 6 (pagar, retirar el pago, deshacer), que actúa sobre esta lista.

## Secciones del README que implementa

- **§4.4**, fila `GET /accounts/{id}/settlements?status=&from=&to=`: se implementa con paginación y se documenta en la fila (contrato en design "Contrato"). Consume `GET /settlements/{id}`, `GET /settlements/{id}/transactions` (de #12), y las lecturas de catálogo de `catalog-read`.
- **§1.3**, mapa de pantallas: **Settlement List** ("por merchant, proveedor, cuenta, estado, fechas e intento") y, de **Settlement Detail**, solo la parte de lectura de "movimientos por ciclo E/I/R" como pestaña del Summary.
- **§1.2** "Settled por ciclo": el estado de cada movimiento sale de `settled` del API (verdadero solo con el batch `paid`).

## What Changes

- **Backend** (módulo `settlement`): `GET /api/v1/accounts/{accountId}/settlements` con `status` (`processed` | `paid` | `undone`), `dateField` (`settlementDate` por defecto o `processedAt`), `from` y `to` (días `YYYY-MM-DD` inclusivos: la fecha de negocio sin convertir, o el día en Nueva York del instante de procesado, design D2), `page` y `pageSize`. Intentos de la cuenta, del más reciente al más antiguo por `processedAt`, con batch, intento, estado, `settledStatus`, fecha de liquidación, quién y cuándo lo procesó, `amountPayable` y canales. Solo autenticación, sin permiso propio (README §4.4); cuenta inexistente o de un merchant fuera del alcance → el mismo `404 not_found`. Esquemas Zod en `@recon/shared`, OpenAPI regenerado, fila del README §4.4 actualizada y colección Bruno (caso feliz y negativos).
- **Settlement List** en `/settlements`: elección merchant → proveedor → cuenta (las cerradas también, porque su historia sigue ahí), filtros de estado y de fechas (con el desplegable **Date**: `Settlement date` o `Processed (ET)`), tabla paginada con las columnas del issue y cada fila enlazada a `/settlements/$batchId`. Todo el estado de la pantalla vive en la dirección.
- **Llegar a la lista**: la entrada **Settlement List** del menú pasa a enlace para todos los roles; en **Accounts**, cada cuenta enlaza a su lista; en el **Settlement Summary**, un enlace vuelve a la lista de su cuenta.
- **Pestaña Movements** en el Settlement Summary: `Summary` | `Movements`, con el ciclo E / I / R elegido y la página en la dirección, movimientos de `GET /settlements/{id}/transactions` paginados, con su desglose de fees y su `settled`, en solo lectura.
- **`viewer`** ve la lista y las dos pestañas, en solo lectura (ninguna de estas pantallas escribe).
- Selector de cuenta compartido: el de New Reconciliation se generaliza para servir también a la lista (design D6), sin cambiar su comportamiento.
- Capturas del PR con Playwright, con las protecciones de `web-settlement`.

## Fuera de alcance

- Pagar, retirar el pago, deshacer y la pantalla Payments (tramo 6). Ningún botón de esas acciones aparece.
- Exportar la lista ("Export CSV" del prototipo) y una lista de todas las cuentas a la vez ("All accounts" del prototipo): el endpoint es por cuenta.
- Columnas E / I / R e incidencias por fila del prototipo, y la fecha de pago: no están en el issue; el Summary ya las da por intento.
- Las demás pestañas del Settlement Detail del prototipo (Batch fees, Validations, Attempts, Audit) y la columna Channel por movimiento, que `SettlementMovement` no trae.
- Cambios de esquema o migraciones: el índice `(accountId, status, settlementDate)` de `SettlementBatch` ya existe.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `settlement`: se añaden la lectura de los settlements de una cuenta (API), las pantallas Settlement List y la pestaña Movements del Summary con el enlace a la lista; cambian "Pantallas de settlement: fechas en hora de Nueva York" (fechas de la lista y de los movimientos) y "Pantallas de settlement: teclado y motivos" (recorrido de la lista y de Movements).
- `accounts`: se añade el enlace de cada cuenta de la pantalla Accounts a su Settlement List.
- `web-shell`: cambia "Navegación filtrada por permisos": Settlement List deja de estar deshabilitada.

## Impact

- **Backend**: `modules/settlement/{application/read-ports.ts, application/settlement-read-service.ts, infrastructure/prisma-settlement-queries.ts, http/settlement-read-routes.ts}` y sus tests y falsos; `packages/shared/src/settlement-reads.ts`. Sin migraciones.
- **Contrato**: `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts` regenerados (`pnpm openapi:check`); README §4.4.
- **Frontend**: `features/settlements/` (lista, pestañas del Summary, movimientos, consultas, textos y tests), `features/settlements/contract.ts` (dos llamadas), `features/accounts/ProviderAccounts.tsx`, el selector de cuenta de `features/imports/AccountPicker.tsx`, `app/router.tsx`, `app/layout/nav-config.ts`, `test/msw/settlements.ts`.
- **Colección Bruno**: `10-smoke` (caso feliz y negativos de la ruta nueva) y un paso en `20-flows/settlements/batch-clean`.
- **E2E**: un script de capturas en `e2e/screenshots/`, fuera de `pnpm test:e2e` y de CI.
- **Dependencias nuevas**: ninguna.
- **Base de datos**: los tests de integración y el último grupo usan la base local, solo con turno (abajo).

## Insumos que necesito de la persona

1. **Fecha de los filtros `from` / `to`**: propuse `settlementDate`. **Respuesta (2026-10-20): las dos, con un selector.** Parámetro `dateField` = `settlementDate` | `processedAt`, `settlementDate` por defecto; con `processedAt`, `from` / `to` son días en `America/New_York`, comparados en SQL con `CAST(processedAt AT TIME ZONE 'UTC' AT TIME ZONE 'Eastern Standard Time' AS date)` (cambio de hora incluido; sin índice, aceptable por el volumen por cuenta). En pantalla, el desplegable **Date** (`Settlement date` / `Processed (ET)`) junto a From / To, en la dirección. Tests de la medianoche de Nueva York y del cambio de hora del 1-nov-2026 (design D2, D15).
2. **Estado por defecto de la lista**: `All statuses`, con los `undone` incluidos y atenuados. **Respuesta (2026-10-20): aprobado** (design D7).
3. **Turnos de base**: el miércoles la base es de la sesión con revisores. **Respuesta (2026-10-20): turno dado desde ya, integración del grupo 3 incluida.** Antes de lanzar nada contra la base otro día, preguntar si sigue siendo mi turno. Prerrequisitos: `! pnpm db:up`, `! pnpm db:migrate`, `! pnpm db:seed` y `pnpm dev` levantado.
4. **Mirar la ejecución del script de capturas**: aviso antes de lanzarlo; deja `batch-clean` procesado y luego toca volver a sembrar. **Respuesta (2026-10-20): avisar antes.**
5. **Milestone del issue**: #64 está en "Entrega 3 - 11 nov" y este change lo trae a la Entrega 2. No muevo issues desde la sesión.

El resto de decisiones (design D1–D16) quedó aprobado el 2026-10-20; en D6, los tests de New Reconciliation no se tocan.
