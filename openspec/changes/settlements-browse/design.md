# Design — settlements-browse

## Context

- **Lecturas del intento** (`summary-exports`, archivado): `SettlementReadService` (`modules/settlement/application/settlement-read-service.ts`) sobre el puerto `SettlementQueries` (`application/read-ports.ts`) y su adaptador `PrismaSettlementQueries` (`infrastructure/prisma-settlement-queries.ts`), con rutas en `http/settlement-read-routes.ts` (`preHandler: app.authenticate`, esquemas Zod de `@recon/shared/settlement-reads.ts`). `importAttempts` ya lista intentos con `{ batchId, batchNo, attemptNo, status, settledStatus, processedAt, approvedBy, amountPayable }`, ordenados por `processedAt desc, attemptNo desc`; `settledStatusOf` vive en `domain/settled.ts`. El alcance se aplica en la consulta (`account.provider.merchantId IN scope`) y el servicio lanza `NotFoundError(entity)` → `404 not_found` "`<Entity> not found`".
- **Paginación existente** (`ImportRowsQuery`, `ValidationIssuesQuery`, `SettlementTransactionsQuery`): `page` ≥ 1 (1 por defecto), `pageSize` 1–500 (50 por defecto), respuesta `{ items, page, pageSize, total }`, con `skip/take` y `count`.
- **`SettlementBatch`**: `settlementDate DATE NULL` (la escribe #11; el seed la tiene en todos), `processedAt DATETIME2` (UTC), `channels VARCHAR(100) NULL` (nombres unidos por comas, cortados en el último nombre entero con `…` si pasan de 100, `domain/channels.ts`; el seed escribe los canales de los movimientos E). Índices: único `(accountId, batchNo, attemptNo)` e `(accountId, status, settlementDate)`. La lectura de fechas de negocio de `DATE` es `toISOString().slice(0, 10)` (`prisma-settlement-reader.ts`) y la escritura `new Date('<día>T00:00:00.000Z')` (`prisma-settlement-repository.ts`).
- **Seed** (`backend/prisma/synthetic.ts`): 68 batches `paid` en las cinco cuentas, intento 1, aprobados por `analyst`, sin `undone`; ProviderA-USD tiene 22 (101–122). Por cuenta, `processedAt` y `settlementDate` crecen con `batchNo` (ventanas consecutivas, `processedAt = fin + 15 días`, `settlementDate = fin + 17 días`).
- **Frontend**: `SettlementSummaryPage` (`/settlements/$batchId`, sin `requires`) pinta la `SettlementView`; `contract.ts` define los tipos como alias de los generados con `Dated<>` (`BusinessKey = 'min' | 'max' | 'settlementDate' | 'startDate' | 'endDate'`, `AuditKey = 'processedAt'`). `RowsTable` (`features/imports/analysis/`) es el precedente de tabla paginada en servidor con TanStack Table (`manualPagination`) y filtro y página en la dirección; `StepTabs` usa `components/ui/tabs`. `useAccountChoice` / `AccountPicker` (`features/imports/AccountPicker.tsx`) resuelven merchant → proveedor → cuenta en la dirección, atados a `/app/reconciliations/new` y solo con cuentas activas. `nav-config.ts`: Settlement List sin `to` (deshabilitada).
- **Falso de MSW** (`test/msw/settlements.ts`): guionizado, sin reglas, con almacén de intentos y registro de peticiones; no sirve aún ni la lista ni los movimientos.
- **Base local compartida**: el miércoles la usa la sesión con revisores. La persona dio turno el 2026-10-20, integración del grupo 3 incluida; antes de lanzar algo contra la base otro día, se le pregunta si el turno sigue (proposal, insumo 3).

## Goals / Non-Goals

**Goals:**
- Una lectura nueva con la forma y las reglas de las lecturas que ya existen (alcance, paginación, errores), sin tocar el esquema.
- Pantallas que pintan lo que llega: ningún importe, contador o total calculado en el navegador.
- Que el tramo 6 (pagar, deshacer) pueda colgar sus acciones de la misma lista y del mismo Summary sin rehacerlos.

**Non-Goals:**
- Una lista de varias cuentas a la vez, exportarla o filtrar por intento.
- Una pantalla Settlement Detail propia: la pestaña Movements vive en el Summary.
- Tiempo real: lo que cambie otra persona se ve al volver a pedir la lista.

## Contrato

`GET /api/v1/accounts/{accountId}/settlements` — tag `settlements`, `bearerAuth`, sin permiso propio.

**Parámetros**
- Ruta: `accountId` UUID (otro valor → `400 validation_error`).
- Consulta (`AccountSettlementsQuery`, `@recon/shared/settlement-reads.ts`, estricta):
  - `status?`: `processed` | `paid` | `undone` (`BatchStatus`).
  - `dateField`: `settlementDate` | `processedAt`, `settlementDate` por defecto. Elige la fecha que filtran `from` y `to` (D2).
  - `from?`, `to?`: `IsoDate` (`YYYY-MM-DD` de un día que existe), inclusivas. Con `dateField=settlementDate` son días de la columna `DATE`, sin convertir; con `dateField=processedAt` son días de calendario en `America/New_York`. Con las dos, `from ≤ to` (comparación de texto `YYYY-MM-DD`); si no, `400 validation_error` con el problema en `details`.
  - `page` (≥ 1, 1 por defecto), `pageSize` (1–500, 50 por defecto), coercidos como en `SettlementTransactionsQuery`.

**Respuesta `200`** (`AccountSettlementsPage`)
```
{
  accountId: uuid,
  items: AccountSettlement[],   // processedAt desc, batchNo desc, attemptNo desc
  page: int ≥ 1,
  pageSize: int ≥ 1,
  total: int ≥ 0
}

AccountSettlement = {
  batchId: uuid,
  importId: uuid,
  batchNo: int > 0,
  attemptNo: int > 0,
  status: 'processed' | 'paid' | 'undone',
  settledStatus: 'pending_payment' | 'settled' | 'undone',
  settlementDate: 'YYYY-MM-DD' | null,   // business date, unconverted
  processedAt: ISO datetime (UTC),       // audit instant
  approvedBy: { userId, userName },      // UserRef
  amountPayable: Money4,                 // "33771.3600"
  channels: string | null                // stored label, e.g. "RAM-01,RAM-02"
}
```

**Ejemplo** (ilustrativo, ProviderA-USD tras procesar `batch-clean`):
```
GET /api/v1/accounts/<ProviderA-USD>/settlements?pageSize=2
200 { "accountId": "…", "page": 1, "pageSize": 2, "total": 23, "items": [
  { "batchId": "…", "importId": "…", "batchNo": 123, "attemptNo": 1, "status": "processed",
    "settledStatus": "pending_payment", "settlementDate": "2026-10-24", "processedAt": "2026-10-20T15:40:03.120Z",
    "approvedBy": { "userId": 2, "userName": "analyst" }, "amountPayable": "33771.3600", "channels": "RAM-01,RAM-02,RAM-07" },
  { "batchId": "…", "batchNo": 122, "attemptNo": 1, "status": "paid", "settledStatus": "settled", … } ] }
```

**Errores** (JSON `{ code, message, details? }`, códigos en minúsculas)
| Estado | `code` | Cuándo |
|---|---|---|
| `400` | `validation_error` | `accountId` no UUID; `status` o `dateField` desconocido; fecha mal formada o imposible; `from > to`; `page`/`pageSize` fuera de rango; parámetro desconocido |
| `401` | `unauthorized` | Sin token o token inválido, antes de mirar la cuenta |
| `404` | `not_found` | `"Account not found"`: cuenta inexistente o de un merchant fuera del alcance, idéntico |

README §4.4: la fila pasa a negrita con ✅ y describe parámetros, orden, paginación y errores, como las de #12.

## Decisions

### D1. La ruta en el módulo `settlement`, junto a las demás lecturas de intentos
- `SettlementQueries.accountSettlements(scope, accountId, query) → { items, total } | null` (`null` = cuenta inexistente o fuera del alcance) y `SettlementReadService.accountSettlements(scope, accountId, query)`, que lanza `NotFoundError('Account')` con `null` y compone la página. La ruta se añade a `settlementReadRoutes`, con `params: AccountParams` (`accountId: z.uuid()`).
- El adaptador hace primero `account.findFirst({ accountId, provider.merchantId IN scope })` (alcance antes que datos, como `importAttempts`). Después, como `listIssues` de `prisma-validation-run-repository.ts`: filtros como fragmentos `Prisma.sql` parametrizados (cuenta, estado, fechas de D2), `SELECT COUNT(*)` y `SELECT batchId … ORDER BY … OFFSET … FETCH NEXT` con `$queryRaw`, y un `findMany({ where: { batchId: { in: ids } } })` con `select` de las columnas del contrato y `approvedBy { userId, userName }`, devuelto en el orden de los ids. `settledStatus` con `settledStatusOf`; dinero con `toMoney`; `settlementDate` con `slice(0, 10)`; `processedAt` con `toISOString()`.
- *Alternativa descartada*: ponerla en el módulo `catalog` (es una ruta bajo `/accounts`). Lo que devuelve son intentos de batch, con `settledStatusOf` y `toMoney` del módulo `settlement`, y el tramo 6 (pagar, deshacer) actuará sobre ellos desde `settlement`.

### D2. `from` y `to` sobre la fecha que elige `dateField` (insumo 1, decidido)
- La persona eligió las dos fechas con un selector. `dateField` decide la expresión SQL que comparan `from` y `to`, inclusivas, como texto `YYYY-MM-DD` parametrizado; la expresión sale de un mapa cerrado en el adaptador, nunca del texto de la petición:
  - `settlementDate` (por defecto, fecha de negocio): `b.[settlementDate]`, la columna `DATE` sin convertir de zona. Es la fecha con la que la cuenta, el proveedor y el analista hablan de un batch, y el índice `(accountId, status, settlementDate)` la cubre junto al estado. Con `from` o `to`, un intento sin `settlementDate` queda fuera (una comparación con `NULL` no es verdadera), y la spec lo dice.
  - `processedAt` (instante de auditoría en UTC): `CAST(b.[processedAt] AT TIME ZONE 'UTC' AT TIME ZONE 'Eastern Standard Time' AS date)`, el día de calendario de Nueva York, con cambio de hora incluido (SQL Server aplica el horario de verano de la zona `Eastern Standard Time`). Responde "qué se procesó tal día en ET", el mismo día que la pantalla muestra en la columna Processed. La expresión no usa índice: se acepta, porque el filtro de la cuenta ya acota a decenas de batches al año.
- La pantalla y la dirección llevan `dateField` (D7); el valor por defecto no se envía.
- *Alternativa descartada* (cómo filtrar `processedAt`): convertir en Node cada día ET en un intervalo UTC `[inicio, fin)` y comparar la columna sin convertir. Usaría el orden de la columna, pero duplica en la aplicación la regla del horario de verano que SQL Server ya tiene, y un día de 23 o 25 horas es justo el caso que se rompe.

### D3. Orden y paginación
- `ORDER BY processedAt DESC, batchNo DESC, attemptNo DESC`: "más reciente primero" por el instante en que se procesó, como `GET /imports/{id}/settlements`. Dentro de una cuenta `(batchNo, attemptNo)` es único, así que el orden es total y las páginas son estables entre llamadas.
- `OFFSET (page − 1) · pageSize ROWS FETCH NEXT pageSize ROWS ONLY` con `COUNT(*)` sobre los mismos filtros (D1), `pageSize` 1–500 y 50 por defecto, como las demás lecturas paginadas.
- *Alternativa descartada 1*: ordenar por `settlementDate`. Admite `NULL` y empates (dos intentos del mismo batch tienen la misma fecha), y un reprocesado reciente quedaría detrás de su intento deshecho.
- *Alternativa descartada 2*: paginación por cursor. Ninguna lectura del API la usa, una cuenta tiene decenas de batches al año y la pantalla necesita "página N de M".

### D4. Forma de cada intento y canales como texto guardado
- `AccountSettlement` reúne lo que pide el issue: los campos de `ImportSettlementAttempt` menos `isCurrent` (que es del import), más `importId` (para el tramo 6 y el enlace a Analysis), `settlementDate` y `channels`. Esquema propio en `settlement-reads.ts`; no se extiende `ImportSettlementAttempt`, porque cambiaría la respuesta de `GET /imports/{id}/settlements`.
- `channels` es el texto de `SettlementBatch.channels` tal cual, o `null`. La pantalla lo pinta sin partirlo.
- *Alternativa descartada 1*: calcular los canales con un `DISTINCT` sobre `SettlementTransaction → Transaction → Channel` por intento. Es una consulta por página sobre cientos de movimientos por batch para algo que ya está guardado.
- *Alternativa descartada 2*: devolver un array partiendo el texto por comas. El texto puede venir cortado con `…`, y un array haría creer que la lista está completa.

### D5. Alcance, autenticación y errores
- `preHandler: app.authenticate`: sin token, `401` antes del handler. No hay permiso propio (README §4.4, fila con "—"), así que no hay `403`; si algún día lo hubiera, iría antes del alcance, como en el export.
- Cuenta inexistente y cuenta fuera del alcance: mismo `404 "Account not found"`, sin distinguirlas por tiempo ni por mensaje (una sola consulta con el alcance en el `where`).
- `from > to` con un `superRefine` del esquema, que el proveedor de tipos convierte en `400 validation_error` como cualquier otro fallo de validación.
- *Alternativa descartada*: devolver `200` con lista vacía para una cuenta fuera del alcance. Es lo que haría un filtro, pero las demás lecturas por id responden `404`, y una lista vacía no distingue "no existe" de "no tiene batches".

### D6. Selector de cuenta compartido
- `useAccountChoice` pasa a `features/accounts/account-choice.ts` y recibe `{ search, navigate, includeClosed }` en vez de leer la ruta `/app/reconciliations/new`. New Reconciliation lo llama con sus `search` y `navigate` e `includeClosed: false`; la lista, con los suyos e `includeClosed: true`. `AccountPicker` se mueve con él y la cuenta cerrada se nombra `ProviderX (closed)` en su opción.
- Los tests de New Reconciliation no cambian y tienen que seguir en verde: es la prueba de que su comportamiento no cambia.
- *Alternativa descartada 1*: copiar el hook en `features/settlements`. Duplicaría la preselección, el aviso de no disponible y la escritura en la dirección, que ya tienen tests.
- *Alternativa descartada 2*: reutilizar los dos selectores de Accounts y elegir la cuenta en la tabla. Obligaría a pasar por la tabla de cuentas para cada consulta y no sirve con un enlace que trae solo `accountId`.

### D7. Ruta `/settlements` y estado en la dirección
- `settlementListRoute`: `path: '/settlements'`, `validateSearch` → `{ merchantId?, providerId?, accountId?, status?, dateField?, from?, to?, page? }` (enteros positivos, UUID, `BatchStatus`, `settlementDate` | `processedAt`, `YYYY-MM-DD` por expresión regular; un valor inválido se descarta), `staticData.crumbs: [Settlements, Settlement List]`, sin `requires`. Convive con `/settlements/$batchId`.
- `All statuses` es el valor por defecto y no envía `status`; los `undone` se ven atenuados con su estado escrito (insumo 2, aprobado). Junto a **From** / **To**, el desplegable **Date** (`Settlement date` por defecto, `Processed (ET)`) escribe `dateField=processedAt` en la dirección y en la consulta; `Settlement date` no lo envía. Cambiar estado, fecha elegida o fechas pone `page = 1`. **From > To** se detecta comparando el texto `YYYY-MM-DD` (no es dinero ni zona horaria) y deja la consulta deshabilitada con el error en el campo.
- *Alternativa descartada 1*: ocultar los `undone` por defecto con una casilla, como el prototipo. Necesitaría `status` con varios valores en el API o filtrar en el navegador una página ya paginada, que dejaría páginas cortas.
- *Alternativa descartada 2*: `/accounts/$accountId/settlements`. La entrada del menú no tiene cuenta, y el mapa de pantallas pone la lista bajo Settlements, no bajo Administration.

### D8. Llegar a la lista y volver
- Menú: Settlement List con `to: '/settlements'` y sin `requires` (`viewer` también). `Link` con `activeOptions: { exact: true, includeSearch: false }` ya la marca activa con cualquier filtro en la dirección; el Summary (`/settlements/$batchId`) no la marca, como hoy.
- Accounts: una columna nueva al final de la tabla de `ProviderAccounts` con el enlace `Settlements of <cuenta>` a `/settlements?merchantId&providerId&accountId`.
- Summary: en su pie, **Settlements of <accountName>** a `/settlements?accountId=<view.accountId>` (el selector completa merchant y proveedor desde la cuenta, como el enlace de un import en New Reconciliation). Las migas del Summary siguen siendo `Reconciliation › Settlement Summary`.
- *Alternativa descartada*: cambiar las migas del Summary a `Settlements › …` según de dónde se llegue. Las migas son la posición en el mapa, no el historial (web-shell); el enlace de vuelta cubre la navegación.

### D9. Tabla de la lista
- TanStack Table con `manualPagination` y `rowCount = total`, como `RowsTable`. `SETTLEMENTS_PAGE_SIZE = 20`, enviado como `pageSize`: con los 22 de ProviderA-USD se ve la paginación contra el seed real.
- Columnas: **Batch** (enlace, nombre accesible `Batch N · attempt M`), **Attempt**, **Status** (`Badge` con los textos de `settledStatus` del Summary), **Settlement date** (`formatBusinessDate`, `Not set` con `null`), **Processed** (`<userName> · <formatAuditDateTime>`), **Amount payable** (`formatDecimal`, derecha, `tabular-nums`) y **Channels** (texto). La tabla cabe a 1280 y a 1024 px sin desplazarse: encabezados, `Badge` de estado, **Processed** y **Channels** pueden partirse en líneas (los canales solo tras una coma, con `<wbr>` y cada nombre en `whitespace-nowrap`, porque el navegador también corta tras un guion; sin cambiar ni quitar un carácter de la etiqueta). Las fechas y el importe van en `whitespace-nowrap`: **Processed** solo se parte entre `analyst ·` y el instante. `Page N of M · T settlements` con `M = max(1, ceil(total / pageSize))`, que es aritmética de paginación sobre enteros del API, no una cifra del negocio.
- **Previous** / **Next** deshabilitados con su motivo (`This is the first page.` / `This is the last page.`) por `aria-describedby` (spec de teclado), en un `Pager` que comparten la lista y Movements.
- Una página más allá de la última (un enlace viejo, una lista que encogió) vuelve a la última con `replace`, la misma regla en la lista y en Movements (`useLastPageLimit`, review-diff B6). Las páginas se cuentan con el `pageSize` de la respuesta. *Alternativa descartada*: avisar de que la página no existe con un enlace a la última; deja al usuario un paso más y una tabla vacía.
- *Alternativa descartada*: 50 por página (el valor por defecto del API). Ninguna cuenta del seed llega a 50, así que la paginación solo se probaría con MSW.

### D10. Pestañas Summary | Movements en el Summary
- `validateSearch` en `settlementSummaryRoute`: `{ tab?: 'summary' | 'movements', cycle?: 'E' | 'I' | 'R', page? }`, con `summary`, `E` y 1 por defecto. `Tabs` de shadcn como `StepTabs`; cambiar de pestaña o de ciclo escribe la dirección (`replace: false`, para que Atrás vuelva a la pestaña anterior) y pone `page = 1` al cambiar de ciclo.
- La pestaña **Summary** es el contenido actual, sin cambios. **Movements** solo pide `GET /settlements/{id}/transactions` cuando está activa.
- *Alternativa descartada 1*: una ruta `/settlements/$batchId/movements`. Repetiría la cabecera y la carga de la vista, y el mapa la describe como una sección del detalle del intento.
- *Alternativa descartada 2*: construir ya Settlement Detail con las seis pestañas del prototipo. Fuera del alcance (tramo 6) y sin endpoints para la mitad.

### D11. Tabla de movimientos
- Selector de ciclo como botones con `aria-pressed` (patrón de `RowsTable`), cada uno con el contador de `view.movements` (`E (450)`): lo da la vista, no se cuenta nada. `pageSize` 50 (el del API).
- Columnas: **Transaction** (`sourceTransactionId` en monoespaciada, como texto), **Status** (`status`), **Round** (`roundNo`, vacío fuera de I), **Source row** (`<sheetName> · <rowNo>` o `—`), **Event date** (`formatBusinessDateTime`, con la hora como en el escenario de fechas de la spec; `Undated` con `null`), **Amount** (`formatDecimal`; con `excludeAmount`, además `excluded from the totals`), **Fees** (`feeAmount` y un botón `N fees` con `aria-expanded` que muestra `title · amountUsd` de cada `AppliedFee`; se descartó el `<details>` nativo porque Enter sobre `<summary>` no se puede probar en jsdom y el botón es igual de accesible), **Reserves** (una entrada con su etiqueta por cifra: `Held <reserveHeldAmt>`, `Released <reserveReleasedAmt>`, `Released on chargeback <reserveEarlyReleasedAmt>` y, si llega, `Expected release <expectedReserveReleaseAt>` con `formatBusinessDate`) y **Settled** (`Settled` / `Pending payment` desde `settled`). Nueve columnas.
- Anchos: la tabla cabe a 1280 y a 1024 px sin desplazarse ni recortarse. Encabezados y celdas pueden partirse en líneas; los importes (`amount`, `feeAmount`, las tres reservas) y el `sourceTransactionId` van en `whitespace-nowrap` y nunca se parten ni se recortan. **Event date** va en dos piezas enteras, fecha y hora (`2026-10-02` / `04:55 ET` como máximo), nunca cortadas por un guion ni por los dos puntos, y **Source row** (`CHB · 2`) es una sola pieza.
- En **Reserves**, la cifra nunca se parte; la etiqueta puede partirse entre palabras, y la cifra va unida a la última con un espacio de no separación (`Released on` / `chargeback 0.0000`), en las cuatro entradas. *Alternativa descartada* (review-diff B9, primera versión): etiqueta y cifra en una sola línea sin partir. A 1024 px, con el desglose de un fee abierto en el ciclo I, `Released on chargeback 0.0000` lleva **Reserves** a unos 180 px, la tabla no cabe (**Settled** quedaba recortada) y las demás columnas se estrujan hasta partir fechas por los guiones.
- Lo mide el script de capturas (tarea 9.5), que termina con error si alguna medición desborda o si alguna pieza sin partir ocupa más de una línea; en jsdom solo se comprueban las clases y las piezas.
- *Alternativa descartada 1*: las once columnas de la primera versión, con **Reserve held**, **Reserve released** y **Released on chargeback** por separado. Las capturas de 9.5 mostraron que no caben ni a 1280 px: **Released on chargeback** y **Settled** quedaban fuera de la vista.
- *Alternativa descartada 2*: aceptar el desplazamiento dentro de la tabla en Movements. Esconde cifras a la derecha, que es justo lo que la comprobación de las capturas prohíbe.
- Los `configurationSnapshot` y `reservePolicySnapshot` no se pintan: son auditoría en JSON.
- *Alternativa descartada*: pedir los tres ciclos para mostrar sus `total`. Serían tres lecturas para un número que la vista ya trae.

### D12. Contrato del frontend y estado de servidor
- Sin contrato aislado: backend y frontend van en el mismo PR, así que el grupo del backend regenera `docs/openapi.yaml` y `schema.gen.ts` antes de que empiece el frontend. `contract.ts` añade `AccountSettlementsPage`, `AccountSettlement`, `SettlementTransactionsPage`, `SettlementMovement` y `AppliedFee` como alias `Dated<>` de los generados, `getAccountSettlements(accountId, query)` y `getSettlementTransactions(batchId, { type, page })`. `BusinessKey` suma `eventDate` y `expectedReserveReleaseAt`.
- Claves: `accountSettlementsKey(accountId, filters) = ['accounts', accountId, 'settlements', { status, dateField, from, to, page }]` con `placeholderData: keepPreviousData`; `settlementTransactionsKey(batchId, cycle, page) = ['settlements', batchId, 'transactions', { cycle, page }]`, bajo el prefijo de `settlementKey`, con `staleTime: Infinity` como la vista (un intento escrito no cambia hasta el tramo 6, que invalidará `['settlements', batchId]` entero).
- `useProcessSettlement`, además de lo que ya hace, invalida `['accounts', accountId, 'settlements']`: el batch recién procesado aparece al volver a la lista.
- *Alternativa descartada*: un contrato escrito a mano antes del backend, como en `web-settlement`. Allí el backend era de otro change en curso; aquí es del mismo, y escribirlo dos veces solo abre la puerta a que difieran.

### D13. Falso de MSW guionizado
- `test/msw/settlements.ts` sirve las dos lecturas con **fixtures**: `seedAccountSettlements(accountId, items)` (intentos ya ordenados como los daría el API) y `seedMovements(batchId, cycle, items)`. El falso solo **pagina** (`slice` por `page` y `pageSize`, `total = items.length`) y registra la consulta; **no filtra por estado, `dateField` ni fechas ni ordena**: los tests de filtros comprueban la consulta enviada y que se pinta lo que llega. Un intento creado por Process en el falso se antepone en la lista de su cuenta, para el escenario de procesar y volver.
- Alcance como el resto del falso: `404` para una cuenta o un intento fuera del alcance del usuario; `400` para `from > to` solo por guion (`respondNextSettlement('accountSettlements', …)`), porque es regla del API.
- Cada fixture pasa `safeParse` con `AccountSettlementsPage` y `SettlementTransactionsPage` de `@recon/shared` (test propio).
- *Alternativa descartada*: un falso que filtre por estado y fechas. Sería una segunda implementación de la regla de D2 en el frontend, y los tests probarían el falso.

### D14. Fechas
Las de `web-validations` D11 sin cambios: `formatBusinessDate` para `settlementDate` y `expectedReserveReleaseAt`, `formatBusinessDateTime` para `eventDate` (lleva hora); `formatAuditDateTime` para `processedAt`. Los `input type="date"` de **From** / **To** dan `YYYY-MM-DD` y se envían tal cual, sin `Date` ni `toISOString()`, también con `Processed (ET)`: el día ET lo resuelve el servidor (D2), no el navegador.

### D15. Tests y roturas a propósito
- Backend, test-first: esquema de la consulta (`settlement-reads.test.ts`), servicio con el falso en memoria (`__fakes__/in-memory-reads.ts`), ruta con `inject` (`settlement-read-routes.test.ts`) y adaptador contra la base (`prisma-settlement-queries.test.ts`, proyecto `integration`, **con turno**). Roturas: quitar el alcance del `where` (falla "cuenta de otro merchant"), invertir el orden (falla "historia sembrada"), comparar `from` con `processedAt` con `dateField=settlementDate` (falla "por fecha de liquidación"), y cambiar el día ET por un desfase fijo `-04:00` (`SWITCHOFFSET`) (falla el caso del cambio de hora del 1-nov-2026). Para `processedAt` el test de integración crea intentos procesados justo antes y justo después de la medianoche de Nueva York (`2026-10-21T03:59:59Z` → `2026-10-20`, `2026-10-21T04:00:00Z` → `2026-10-21`) y alrededor del fin del horario de verano (`2026-11-02T04:30:00Z` → `2026-11-01`, que con `-04:00` fijo caería el 2; `2026-11-02T05:00:00Z` → `2026-11-02`).
- Frontend, con MSW: lista (llegada, columnas, filtros, paginación, errores), enlaces desde Accounts y el Summary, Movements, solo lectura y teclado. Roturas: convertir `amountPayable` con `Number()` (falla el importe de 15 dígitos), `formatBusinessDateTime` en `processedAt` (no compila: anotarlo), pedir la lista con **From > To** (falla "rango al revés"), no poner `page = 1` al filtrar (falla "filtrar por estado").

### D16. Último grupo: API real, Bruno y capturas (con turno)
1. La persona prepara la base (`! pnpm db:up`, `! pnpm db:migrate`, `! pnpm db:seed`) y levanta `pnpm dev`.
2. Colección Bruno: en `10-smoke`, `Account settlements` (ProviderA-USD como `analyst`: `total ≥ 22`, orden descendente por `processedAt`, dinero como texto), `Account settlements - viewer out of scope` (ProviderC-Alt → `404 not_found`), `Account settlements - bad range` (`from > to` → `400 validation_error`), `Account settlements - processed date` (`dateField=processedAt&from=2000-01-01` → `200`, los 22), `Account settlements - bad date field` (`dateField=createdAt` → `400 validation_error`) y `Account settlements - no token` (`401 unauthorized`); en `20-flows/settlements/batch-clean`, `18 Account settlements` tras procesar (`status=processed` → el batch 123 primero, `pending_payment`). `pnpm test:api` en verde.
3. Prueba manual como `analyst` y `viewer` a 1280 y 1024 px: los 68 pagados repartidos en las cinco cuentas (22 en ProviderA-USD, dos páginas), filtros, abrir un batch sembrado (`Paid`, sin aviso de no Settled), Movements E / I / R de un sembrado (`—` en la fila de origen) y de `batch-clean` procesado (fila de origen, `Pending payment`), y volver a la lista.
4. Capturas con `e2e/screenshots/settlements-browse.ts` y `pnpm screenshots:settlements-browse`, con las protecciones de `web-settlement` D16 paso 7 (credenciales por `process.loadEnvFile` sin leerlas ni imprimirlas, sin trace ni vídeo, `headless: false`, ninguna captura del login, aviso antes de lanzarlo). PNG en `docs/wireframes/settlements-browse/`: `settlement-list.png`, `settlement-list-1024.png`, `settlement-movements-e.png` y `settlement-movements-i.png`, con la comprobación de desplazamiento horizontal y tablas recortadas. Procesa `batch-clean` para tener un intento `processed`: la persona vuelve a sembrar después.

## Risks / Trade-offs

- [Filtro por `processedAt` sin índice] → `AT TIME ZONE` no aprovecha el índice; el filtro de la cuenta acota a decenas de batches al año (D2). Si una cuenta creciera mucho, se mediría antes de añadir una columna calculada.
- [`AT TIME ZONE` depende de los datos de zona del servidor SQL] → Los tests de integración del cambio de hora del 1-nov-2026 lo comprueban contra el contenedor real.
- [SQL a mano en el adaptador] → Fragmentos `Prisma.sql` parametrizados y expresión de fecha de un mapa cerrado, como `listIssues`; ningún texto de la petición llega al SQL.
- [`channels` cortado con `…` en batches con muchos canales] → Se pinta tal cual; la lista completa está en los movimientos y en el Summary. Ningún batch del seed llega a 100 caracteres.
- [Batches con `settlementDate = null` (creados por el API sin fecha) desaparecen al filtrar por fechas] → La spec lo dice y la columna muestra `Not set` sin filtros. La pantalla de Review ya la exige.
- [Generalizar `useAccountChoice` rompe New Reconciliation] → Sus tests existentes no se tocan y tienen que seguir en verde (D6).
- [La base local está ocupada el miércoles] → Integración y último grupo solo con turno; mientras, unitarios y MSW (insumo 3).
- [`count` + `findMany` sobre una cuenta con muchos batches] → Índice `(accountId, status, settlementDate)`; una cuenta tiene decenas de batches al año. Sin medición de rendimiento en este change.

## Migration Plan

Sin migraciones ni cambios de esquema. Despliegue: el del backend y la SPA juntos (la pantalla necesita la ruta). Rollback: revertir el PR; la ruta nueva no escribe nada.
