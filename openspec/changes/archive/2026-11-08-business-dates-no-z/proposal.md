## Why

Las fechas de negocio (transacción, rangos APP/DEC/I/R, `relevantDate`, rangos y movimientos del settlement) son hora de pared de America/New_York guardada sin zona en `DATETIME2`, pero el API las devuelve con `Z`, como si fueran instantes UTC. Cualquier cliente que lea el formato al pie de la letra las desplaza 4 o 5 horas. El frontend lo evita formateándolas "en UTC" (`formatBusinessDate` / `formatBusinessDateTime`), y el CSV del summary igual: es la deuda #48, que vuelve a la Entrega 3 con corte el domingo por la noche.

## What Changes

- **BREAKING** (para clientes del API; hoy el único es el frontend del monorepo, que cambia en el mismo PR): 7 campos de fecha de negocio salen sin zona ni milisegundos, `YYYY-MM-DDTHH:mm:ss` (por ejemplo `"2026-10-24T13:05:00"`), en 16 operaciones:
  - `transaction.transactionDate` en `GET /imports/{id}/rows` y `PATCH /imports/{id}/rows/{sheetId}/{rowNo}`;
  - `ranges.APP/DEC/I/R.min/max` en `GET` y `POST /imports/{id}/validations` y `POST /imports/{id}/review`;
  - `relevantDate` en `GET /imports/{id}/validation-issues`, `GET` y `PATCH /validation-issues/{id}` y `PATCH /conflict-occurrences/{id}`;
  - `dateRanges.APP/DEC/I/R.min/max` en `POST /imports/{id}/settlements/preview`, `POST /imports/{id}/settlements`, `GET /settlements/{id}`, `pay`, `unpay` y `undo`;
  - `eventDate` y `expectedReserveReleaseAt` de cada movimiento, y `eventDate` de cada fee aplicado, en `GET /settlements/{id}/transactions`.
- Esquema nuevo `BusinessDateTime` en `packages/shared`, que rechaza la `Z`, los milisegundos y las fechas imposibles. El `serializerCompiler` valida cada respuesta, así que un sitio olvidado da `500`.
- No cambian:
  - los instantes de auditoría (`createdAt`, `runAt`, `processedAt`…), que siguen en UTC con `Z`;
  - las columnas de solo día (`settlementDate`, vigencias de fees, `asOf`);
  - las peticiones, porque ninguna recibe una fecha de negocio con hora.
- El CSV del summary y el frontend leen los dígitos sin `Date`, así que no dependen de la zona del proceso ni del navegador. Lo que se ve en pantalla y en el CSV no cambia: `2026-09-28` y `2026-09-28 00:04 ET`. La suite E2E, que compara la tabla de rangos con `<día> HH:MM <zona>`, sigue igual.
- OpenAPI y cliente generado regenerados; README §3.2 y §4 y la fila de #48 en pendientes.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `import`: la fecha de la transacción enlazada a una fila sale sin zona (requisito nuevo).
- `validation`: las fechas de negocio de la corrida y de los hallazgos salen sin zona (requisito nuevo), y "Pantalla Analysis & Validations: fechas en hora de Nueva York" deja de decir que el API las serializa con `Z`.
- `settlement`: las fechas de negocio del settlement salen sin zona (requisito nuevo), y "Pantallas de settlement: fechas en hora de Nueva York" cambia sus ejemplos con `Z`.

## Impact

- **Shared:** `vocabulary.ts` (`BusinessDateTime`) y los esquemas de `imports.ts`, `validation.ts`, `settlement.ts` y `settlement-reads.ts`.
- **Backend:** un ayudante `businessDateTime` en `backend/src/shared/`, 7 sitios que hoy llaman a `toISOString()` (con el fake de validaciones) y `business-time.ts` del CSV.
- **API:** `docs/openapi.yaml` y `frontend/src/lib/api/schema.gen.ts`.
- **Frontend:** `frontend/src/lib/format.ts` y las fixtures de fechas de negocio de MSW y de las pruebas de componentes.
- **Bruno:** dos aserciones de formato.
- **E2E:** sin cambios; la comparación de rangos de `e2e/steps/validations.steps.ts` sirve de red.
- **Base de datos:** ninguna migración.
