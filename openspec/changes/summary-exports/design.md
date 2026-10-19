# Design

## Context

- #11 (`settlement-process`, fusionado y archivado en `2026-10-19-settlement-process`) escribe el intento y deja `PrismaSettlementReader.view(batchId, scope?): Promise<SettlementView | null>` (`infrastructure/prisma-settlement-reader.ts`). Lee con `Prisma.Decimal` y `toMoney`/`toPercentage` (`infrastructure/decimal.ts`), deriva `payableBreakdown` de las columnas del batch y reconstruye `skipped`, `warnings`, `channelsAssigned` y `validationSummary` de la auditoría `settlement.process`. Sin esa fila (todo el seed), devuelve `skipped` en 0, listas vacías y `validationSummary = null` (lo admite el esquema). `exports` ya trae `/api/v1/settlements/<id>/export?type=…`. **El alcance no filtra el batch**: con `scope`, `view` solo sustituye `channelsAssigned[].previousAccount` de un merchant fuera del alcance por `HiddenAccountRef` (`{ accountId: null, name: null, outOfScope: true }`, `shownAccount` de `domain/channels.ts`); sin `scope` la muestra. El "Contrato para #12" pide que #12 le pase el `scope` de la petición.
- Puerto `SettlementReader` en `application/ports.ts`. Rutas de #11 en `http/settlement-routes.ts`, cableadas en `settlement-module.ts`.
- Alcance: `scopeOf(auth)` → `{ merchantIds }`. Los repositorios filtran por `provider.merchantId IN (…)` y el servicio lanza `NotFoundError(entity)` → `404 not_found` "`<Entity> not found`". `requirePermission(code)` = `[authenticate, check]` → `403 forbidden` antes del handler.
- Permisos del seed (`shared/roles.ts`): `reports.view` lo tienen `admin`, `analyst`, `payments` y `viewer`. `viewer` solo ve el merchant 1. Ninguna ruta usa hoy `reports.view`.
- Paginación existente (`ImportRowsQuery`/`Page`, `ValidationIssuesQuery`/`Page`): `page` ≥ 1 (1 por defecto), `pageSize` 1–500 (50 por defecto) y respuesta `{ items, page, pageSize, total }`.
- No hay ninguna respuesta que no sea JSON (ni `reply.type`, ni `Content-Disposition`, ni librería CSV). No hay CORS: la SPA y la API comparten origen (proxy `/api` de Vite y Nginx, D2 de `web-shell`).
- Auditoría: `AuditLogger.record({ userId, action, entityType, entityId, detail })` (`PrismaAuditLogger`). `action` es `VARCHAR(60)`. Hasta ahora ninguna lectura audita.
- Fechas: las de negocio son hora de pared de Nueva York con una `Z` que solo es transporte (deuda #48). Las de auditoría son UTC. El frontend las formatea con `formatBusinessDate*` (sin convertir) y `formatAuditDateTime` (convertida a ET) en `frontend/src/lib/format.ts`. El backend no tiene formateador.
- Datos: `Transaction.sourceTransactionId VARCHAR(36)` (numérico de 15 dígitos o UUID) y `Account.name VARCHAR(50)` (en el seed, letras y un guion). Seed: 22 batches `paid` de ProviderA-USD (101–122) y batches `paid` en las demás cuentas, sin `sheetId`/`rowNo`, sin `excludeAmount` y sin fees por batch. Oráculos: `batch-clean` (E 450 = 340 + 110, I 10 = 2 CHB + 6 REF + 2 RDR, R 320, payable `33771.3600`, número 123) y `legacy-provider` (E 80 = 60 + 20, I 1 `CHB 2`, payable `7019.9440`, número 7). Ninguno trae dos movimientos I de la misma transacción.

## Goals / Non-Goals

**Goals:**
- Las cuatro lecturas sin redefinir la forma del intento y sin recalcular cifras: la vista es la de #11 y los CSV se construyen de ella y de los movimientos escritos.
- Generar los CSV con funciones puras y testeables (TDD contra `expected.json`), con el dinero como string de principio a fin.
- Un contrato que #13 pueda mockear con MSW sin leer el código.

**Non-Goals:**
- `GET /accounts/{id}/settlements` (#64), pagar, retirar el pago y deshacer (tramo 6).
- Guardar los archivos generados o versionarlos.
- Cambiar código, puertos o esquemas de #11. Solo se añade el cableado de las rutas nuevas.

## Decisions

### D1. Estructura
```
modules/settlement/
  domain/exports/                      pure and synchronous
    csv.ts                             RFC 4180 writer: escaping, CRLF, header + rows → string
    file-name.ts                       account name whitelist, <account>_B<n>_A<n>_<type>.csv
    transactions-csv.ts                TXN rows from movements: SUC/CHB/REF/RDR, distinct (ID, Status)
    reserves-csv.ts                    RR rows from movements: distinct ID, "Batch <batchNo>"
    summary-csv.ts                     summary blocks from SettlementView
    audit-time.ts                      UTC instant → "YYYY-MM-DD HH:mm:ss ET" (America/New_York)
    business-time.ts                   business date → "YYYY-MM-DD HH:mm:ss", no conversion
  application/
    read-ports.ts                      SettlementQueries (scope, movements page, attempts, export rows)
    settlement-read-service.ts         view, movements, import attempts, export
  infrastructure/
    prisma-settlement-queries.ts
  http/settlement-read-routes.ts       the four GET routes
  settlement-module.ts                 (wiring only: registers the read routes)
packages/shared/src/settlement-reads.ts
```
- *Alternativa descartada*: ampliar `SettlementReader`, `settlement-service.ts` y `settlement-routes.ts` de #11. Tocaría código en revisión y mezclaría escritura y lectura en el mismo servicio. Los puertos nuevos van en archivo propio y el lector de #11 se inyecta tal cual.
- *Alternativa descartada*: un módulo `reports`. Los exports son del intento ("los exports se identifican por intento") y la spec `settlement` ya los tiene.

### D2. La vista, sin recalcular
`GET /settlements/{id}` = comprobación de alcance (D3) + `PrismaSettlementReader.view(batchId, scope)`. El summary CSV también parte de la vista: totales, `payableBreakdown`, fees por batch y reservas salen de ella. Así #13, el CSV y la respuesta `201` muestran lo mismo. Lo único que el summary añade a la vista es una traducción acotada: las advertencias de la vista (`undated_adjustment`, `reserve_already_released`) llevan el `transactionId` interno, y el analista necesita el ID de origen. `SettlementQueries.sourceIds(transactionIds)` traduce a `sourceTransactionId` solo los `transactionId` de las advertencias del intento (`Transaction WHERE transactionId IN (…)`, troceado en bloques de ≤ 500) y el summary escribe ese ID. Sin advertencias con transacción no hay consulta.
- *Alternativa descartada*: que el summary CSV lea las columnas por su cuenta. Sería una segunda lectura de las mismas cifras que podría divergir de la pantalla.

### D3. Alcance sin tocar el lector
`SettlementQueries.batchHeader(scope, batchId)` → `{ batchId, accountId, accountName, batchNo, attemptNo, status } | null`, con una consulta `SettlementBatch ⋈ Account ⋈ Provider` filtrada por `merchantId IN scope`. `null` → `NotFoundError('Settlement')`. Si no, el servicio llama a `reader.view(batchId, scope)` con el alcance de la petición, tanto en `GET /settlements/{id}` como al generar el summary. La cabecera también da el nombre del archivo y el `batchNo` del RR sin cargar la vista. En `GET /imports/{id}/settlements`, el alcance es el del import (`NotFoundError('Import')`), como `GET /imports/{id}`.
- Dos comprobaciones distintas con el mismo `scope`: `batchHeader` decide si el batch se puede ver (`404` idéntico) y `view` decide qué cuentas anteriores de los canales asignados se ocultan (`HiddenAccountRef`), como la respuesta `201` de procesar y el aviso de canales del análisis. Un batch de merchant 1 puede tener un canal cuya primaria anterior era de merchant 2: `viewer` ve el batch con esa cuenta oculta.
- Hay dos lecturas sin transacción. Entre ellas, el batch solo puede cambiar de `status` por el pago o el deshacer (tramo 6), y la vista lee el suyo. No hay ventana que filtre datos fuera del alcance, porque la cuenta de un batch no cambia.
- *Alternativa descartada*: confiar en `view(batchId, scope)` para el `404`. No filtra el batch (devuelve la vista aunque su merchant esté fuera del alcance), y cambiarlo tocaría el lector de #11.
- *Alternativa descartada*: llamar a `view(batchId)` sin `scope`. Expondría el nombre y el id de cuentas de otros merchants en `channelsAssigned`, que #11 oculta desde el review de #66.

### D4. Movimientos paginados
`movementsPage(batchId, cycle, page, pageSize)`:
1. `total` = `COUNT(*)` del ciclo.
2. Página: `SettlementTransaction ⋈ Transaction ⋈ TransactionStatus ⋈ ImportSheet (LEFT)`, `ORDER BY sheetId, rowNo, settlementTxnId` (el ciclo es fijo por la consulta). SQL Server ordena `NULL` primero, así que los movimientos del seed, sin fila, quedan en orden de `settlementTxnId`. `OFFSET … FETCH`.
3. Desglose: `SettlementTransactionFee ⋈ FeeType` con `settlementTxnId IN (…ids de la página)` (≤ 500), `ORDER BY settlementTxnId, appliedFeeId`.
- Dinero con `Prisma.Decimal` → `toMoney`; si la consulta es `$queryRaw`, `CONVERT(VARCHAR(40), col)` (patrón de `prisma-settlement-repository.ts`). `BIGINT` (`settlementTxnId`, `transactionId`, `appliedFeeId`) como string. Fechas de negocio (`eventDate`, `expectedReserveReleaseAt`) con `toISOString()`, sin convertir (D11 de #11). `reservePolicySnapshot` y `configurationSnapshot` se devuelven parseados: si el JSON no se puede leer, `null` y `log.warn`.
- `settled = header.status === 'paid'` para toda la página.
- `type` obligatorio. *Alternativa descartada*: `type` opcional con todos los ciclos mezclados. Cada ciclo tiene columnas distintas en la pantalla (reserva retenida en E, liberada en R, ronda en I) y el README ya define la ruta por ciclo.
- *Alternativa descartada*: paginar por cursor (`settlementTxnId >`). `page` es el patrón de las otras dos listas y el total es pequeño (miles).

### D5. Formato CSV (aprobado en el gate, P4)
`csv.ts` escribe RFC 4180: separador `,`, CRLF, UTF-8 sin BOM, cabecera en la primera línea y un valor entre comillas solo si contiene `,`, `"`, CR o LF (con `"` duplicada). Todo valor es `string`: los importes llegan ya como string (`Money4` de la vista o `toMoney` de la consulta), así que no existe ningún camino por `number`. Un test lo fija pasando un importe con más dígitos de los que un `double` representa.
- Sin BOM porque TXN y RR los lee el Back-Office y un BOM delante de `ID` puede romperle la cabecera. Excel abre bien un UTF-8 sin BOM mientras todo sea ASCII (IDs, códigos, importes). En el summary pueden aparecer nombres o descripciones no ASCII: se acepta que Excel los muestre mal al abrir con doble clic, y se anota como riesgo.
- **IDs (P1 del gate)**: el ID se escribe tal cual (`sourceTransactionId`), en TXN, RR y summary, con las mismas reglas de comillas que cualquier valor. No hay ninguna celda especial para Excel. El README §1.2 y "Contrato para #13" dicen que el CSV se sube al Back-Office sin abrirlo ni guardarlo con Excel, y que para mirarlo hay que usar Excel → Datos → Desde texto/CSV → columna `ID` como Texto. La lectura humana con el ID como texto va en #68 (`.xlsx`, Entrega 3).
- *Alternativa descartada* para los IDs: `="…"`, apóstrofo, tabulador delante o comillas que RFC 4180 no exige. Todas cambian los bytes que recibe el Back-Office o no sirven para Excel. Y un summary con un formato distinto del de TXN y RR obligaría a explicar dos reglas.
- *Alternativa descartada*: `;` como separador (Excel con configuración regional europea). El Back-Office y el contrato hablan de `ID, Status`, y los importes con punto ya fijan la convención anglosajona.
- *Alternativa descartada*: una librería (`csv-stringify`). Son cuatro reglas, y una dependencia más para eso no compensa.
- *Alternativa descartada*: generar en streaming. Un intento tiene del orden de miles de movimientos (`batch-clean`: 780) y el archivo cabe en memoria. Generar todo antes de responder permite auditar (D10) y responder un error JSON si algo falla antes del primer byte.

### D6. TXN y RR
- **TXN**: movimientos E con estado `Successful` → `SUC`; I `Chargeback` → `CHB` (con o sin `excludeAmount`), `Refund` → `REF` y `RDR` → `RDR`. Los `Declined` no salen, y el estado `Pending` nunca llega a un movimiento (lo salta el procesado). Orden: el estable del contrato, `(cycle, sheetId, rowNo, settlementTxnId)`, E antes que I. Se quitan los pares `(ID, Status)` repetidos y se queda la primera aparición (P2 del gate). Refund + Chargeback da dos filas; Chargeback + `CHB 2` o un duplicado E incluido a mano, una.
- **RR**: movimientos R en el mismo orden, `Description = Batch <batchNo>`, y se quitan los `ID` repetidos (un duplicado R incluido a mano). Salen también las R con `reserveReleasedAmt = 0` (P3 del gate; se revisa con #62).
- El mapa estado → código del Back-Office es una constante del dominio (`BACK_OFFICE_STATUS`), escrita contra el catálogo fijo de `vocabulary.ts`.
- Lectura: `exportRows(batchId, cycles)` devuelve `{ sourceTransactionId, cycle, status }` en el orden estable, sin paginar.
- *Alternativa descartada*: una fila por movimiento sin deduplicar. Repite líneas idénticas cuyo efecto en el Back-Office no conocemos.
- *Alternativa descartada*: deduplicar en SQL con `DISTINCT`. Perdería el orden estable y la regla quedaría fuera del test unitario.

### D7. Summary
`summary-csv.ts(view)` → bloques separados por una línea vacía, cada uno con su cabecera:

| Bloque | Cabecera | Filas |
|---|---|---|
| Settlement | `Field,Value` | `Account`, `Batch`, `Attempt`, `Status`, `Payment`, `Processed by`, `Processed at` (`… ET`), `Settlement date`, `Channels` (unidos con `; `), `APP range (ET)`, `DEC range (ET)`, `I range (ET)`, `R range (ET)` (`<min> - <max>` en hora de Nueva York sin convertir, o vacío; sufijo `(ET)` como en la pantalla) |
| Totals | `Category,Qty,Amount,Fees,Fee rate` | las cinco categorías en su orden, con las etiquetas de la UI (`Deposits`, `Declined`, `Chargebacks`, `Refunds`, `RDR`) |
| Card brands | `Card brand,Qty,Amount` | `brandTotals` |
| Batch fees | `Fee type,Description,Source,Amount,Entered by` | en orden de `batchFeeId`; importe con signo |
| Reserves | `Item,Qty,Amount` | `Reserve held`, `Reserve released` (qty = `reservesReleasedQty`), `Reserve released on chargeback` |
| Amount payable | `Line,Sign,Amount` | las nueve líneas de `payableBreakdown` (`label`, `+`/`-`, magnitud) y la fila `Amount payable,,<amountPayable>` |
| Issues | `Item,Count` | `Persistent`, `Resolved`, `Blocking`, `Resolved missing`; con `validationSummary = null`, una única fila `Not available,` |
| Not processed | `Reason,Count` | los seis motivos de `skipped`; sin auditoría `settlement.process`, `Not available,` |
| Warnings | `Code,Transaction ID,Detail` | una fila por advertencia; `Transaction ID` es el ID de origen tal cual (D5), traducido con `sourceIds` (D2), y vacío en las advertencias sin transacción; `Detail` = `Row <rowNo>` (más `; fee skipped`) o `Fee <feeId>` |

- `Payment` = `Pending payment` | `Settled` | `Undone` desde `settledStatus`, nunca desde `settlementStatusId`.
- `audit-time.ts`: `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', hourCycle: 'h23', … })` → `YYYY-MM-DD HH:mm:ss ET`, el mismo criterio que `formatAuditDateTime` de la pantalla (con otro formato, porque es un archivo). Test con una fecha en horario de verano y otra en horario estándar.
- Saber si el intento tiene auditoría `settlement.process`: la vista no lo dice directamente. Se toma `validationSummary === null` como señal, porque el lector de #11 lo pone a `null` justo en ese caso. Si #65 cambia eso, cambia esta regla.
- *Alternativa descartada*: una sola tabla larga (`Section,Item,Qty,Amount,…`), más fácil de leer por máquina pero ilegible para el merchant, que es quien lo lee.
- *Alternativa descartada*: summary en `.xlsx` o PDF. El issue y el contrato de #13 nombran los tres archivos `.csv`, y haría falta una dependencia nueva.

### D8. Nombre del archivo
`fileName(accountName, batchNo, attemptNo, type)`: `accountName.replace(/[^A-Za-z0-9-]+/g, '_')`, después se colapsan los `_` repetidos y se recortan `_` y `-` en los extremos. Si queda vacío, `account`. Resultado: `<cuenta>_B<batchNo>_A<attemptNo>_<type>.csv`, con `type` ∈ `summary` | `transactions` | `reserves`. Cabecera: `attachment; filename="<nombre>"`. Como el nombre es ASCII y no tiene `"` ni `\`, no hace falta `filename*`.
- *Alternativa descartada*: conservar Unicode con `filename*=UTF-8''…` (RFC 6266). Los nombres sintéticos son ASCII, y un nombre con caracteres raros acaba en rutas de Windows y en el Back-Office.
- *Alternativa descartada*: usar `accountId` en el nombre. Es estable, pero no se puede leer en una carpeta de documentos de trabajo.

### D9. Sin CORS
No se registra `@fastify/cors`. La SPA llama a `/api` en su mismo origen (D2 de `web-shell`), y en una respuesta del mismo origen `fetch` puede leer `Content-Disposition` sin `Access-Control-Expose-Headers`. Un test de rutas comprueba la cabecera; #13 la lee en su prueba contra el API real.
- *Alternativa descartada*: registrar CORS con `exposedHeaders: ['Content-Disposition']` "por si acaso". Reabre una decisión archivada (`web-shell` D2 la descartó) y abre orígenes que nadie usa. Si el despliegue cambia, ese change añade el plugin con la cabecera expuesta.

### D10. Auditoría de la descarga
`export(scope, batchId, type, userId)`: cabecera (D3) → filas (D6) o vista con `view(batchId, scope)` más `sourceIds` de sus advertencias (D2, D7) → CSV en memoria → `audit.record({ action: 'settlement.export', entityType: 'SettlementBatch', entityId: batchId, detail: { type, fileName, rows } })` → respuesta. `rows` = filas de datos (sin cabecera; en el summary, el número de bloques no cuenta y se guarda `rows: null`).
- Si la auditoría falla, la petición responde `500` y no se envía el archivo: "una entrada de auditoría por descarga" (criterio 4) no se cumple si se envía sin ella. Si falla la generación, no queda auditoría.
- La fila queda escrita aunque el cliente corte la conexión después: registra que el servidor entregó el archivo, no que el usuario lo guardó.
- *Alternativa descartada*: auditar como `auth-service` (capturar el fallo y registrarlo en el log). Una descarga sin rastro rompe el criterio.
- *Alternativa descartada*: no auditar el summary, porque "no es del Back-Office". El criterio dice "una entrada por descarga" sin distinguir tipo.

### D11. Intentos de un import
`importAttempts(scope, importId)` → `null` si el import no existe o está fuera del alcance. Si existe, `{ importId, currentBatchId, items }` con `SettlementBatch WHERE importId = @id ORDER BY processedAt DESC, attemptNo DESC`, con el `User` que aprobó. `settledStatus` se deriva como en la vista. Sin paginar: un import tiene uno o pocos intentos.
- *Alternativa descartada*: devolver la `SettlementView` de cada intento. Sería pesado, y el Summary pide la vista del que elige.

### D12. Rutas y errores
| Ruta | Pre-handler | Esquemas |
|---|---|---|
| `GET /settlements/:batchId` | `authenticate` | params `{ batchId: uuid }`; `200 SettlementView` |
| `GET /settlements/:batchId/transactions` | `authenticate` | query `SettlementTransactionsQuery`; `200 SettlementTransactionsPage` |
| `GET /imports/:importId/settlements` | `authenticate` | `200 ImportSettlements` |
| `GET /settlements/:batchId/export` | `requirePermission('reports.view')` | query `ExportQuery`; `200 text/csv` (OpenAPI: `content: text/csv: schema: string`) |

Errores `readErrors` de #11 (`400`/`401`/`404`) y, en el export, `403` y `500`. Un `batchId` que no es UUID responde `400 validation_error`, como las demás rutas con UUID.

### D13. Tests
- **Dominio, TDD con rotura deliberada**: `csv.test.ts` (comillas, comillas internas, CRLF, sin BOM, celda vacía, importe de 19 dígitos intacto); `file-name.test.ts` (seed, espacios, barras, acentos, vacío, guiones en los extremos); `transactions-csv.test.ts` y `reserves-csv.test.ts` sobre movimientos de `buildWorld()` + `plan.ts` para `batch-clean` (350 filas TXN con el reparto de `expected.summary.qty`; 320 RR con `Batch 123`) y `legacy-provider` (`CHB 2` → `CHB`, 61 filas), y con builders para Refund + Chargeback, Chargeback + `CHB 2`, E duplicado y R con 0; `summary-csv.test.ts` sobre `exampleView()` de #11 y sobre una vista con `validationSummary = null`; `audit-time.test.ts` (EDT y EST). Roturas previstas: quitar `excludeAmount` del mapa hace fallar "CHB 2 en el TXN"; deduplicar por ID en vez de por `(ID, Status)` hace fallar "Refund y Chargeback"; convertir a ET la fecha de negocio hace fallar "Fechas del summary".
- **Servicio** sobre dobles en memoria: orden alcance → vista, el lector recibe el `scope` de la petición (en la vista y en el summary), `404` idéntico, auditoría después de generar, `500` sin archivo si `audit.record` falla (`InMemoryAuditLogger` con fallo inyectado).
- **Rutas** (`build-test-app`): `401`, `403` con un usuario sin `reports.view` antes de mirar el alcance, `400` (`type`, `pageSize`, UUID), cabeceras del export (`Content-Type`, `Content-Disposition`, `Cache-Control`), `safeParse` de las respuestas JSON y `/docs/json` con las cuatro rutas.
- **Integración** (`settlement-reads.int.test.ts`, base local libre tras el merge de #11): `batch-clean` procesado con `ImportFlow` → vista igual a la `201`; movimientos I (10, desglose que suma `feeAmount`); siete páginas E sin repetir; intentos del import; TXN/RR/summary contra `expected.json`; `legacy-provider` (`CHB 2`); batch sembrado `paid` (vista, `settled = true`, summary con `Not available`); `viewer` y batch de ProviderC-Alt → `404` idéntico; `batch-clean` procesado con un canal cuya primaria era una cuenta de merchant 2 (fixture como `import-analyze.int.test.ts`) → `previousAccount` visible para `analyst` y `HiddenAccountRef` para `viewer`; tres descargas → estado sin cambios y tres filas `settlement.export`. Limpieza con `removeSettlementsFrom`/`restoreAccountChannels` y borrado de las filas `settlement.export` creadas.

### D14. Contrato, OpenAPI, Bruno y README
- `packages/shared/src/settlement-reads.ts` con tests de forma (dinero y `BIGINT` como string).
- `pnpm openapi:export` y `pnpm --filter @recon/frontend api:generate`. El export se declara `text/csv`.
- Bruno (a mano, nunca se reimporta): en `10-smoke`, `Settlement - unknown` `404`, `Settlement - no token` `401`, `Settlement transactions - bad type` `400`, `Export - bad type` `400`, y `Settlement - out of scope` `404` con `as: viewer` sobre un batch sembrado de ProviderC-Alt. El id se obtiene encadenando `GET /accounts/{ProviderC-Alt}/imports` → `GET /imports/{id}/settlements` como `analyst`. No hay `403` con usuarios del seed (insumo 3). En `20-flows/settlements/batch-clean`, después de `10 Process`: `12 Get settlement` (cuerpo igual a la `201` en cifras), `13 Transactions I` (10), `14 Import settlements` (1, `isCurrent`), `15 Export transactions` (cabeceras y 351 líneas), `16 Export reserves`, `17 Export summary` (contiene `33771.3600`).
- README en un commit propio: §1.2 "Exports" (formato de los tres archivos; ID tal cual, subir al Back-Office sin abrir ni guardar con Excel y mirarlo con Datos → Desde texto/CSV con la columna `ID` como Texto; nombre por intento; auditoría de la descarga); §3.2 `AuditLog` (`settlement.export`); §4.4 (export con `Content-Disposition` y `reports.view`, `type` obligatorio en `/transactions`, paginación, forma de `/imports/{id}/settlements`).

## Contrato para #13

Base `/api/v1`, `Authorization: Bearer <access>`, mismo origen que la SPA. Errores JSON uniformes `{ code, message, details? }` con mensaje en inglés, **también en el export**: si la respuesta no es `2xx`, el cuerpo es JSON y no un CSV. Comunes: `401 unauthorized`, `400 validation_error` (`details` con los problemas de Zod), `404 not_found` (inexistente **o** fuera del alcance, mismo cuerpo: `"Settlement not found"` / `"Import not found"`). Dinero como string con 4 decimales, porcentajes con 6, `BIGINT` como string. Fechas como en "Contrato para #13" de #11: las de negocio en ISO con una `Z` que solo es transporte (hora de Nueva York) y las de auditoría (`processedAt`) en UTC.

### Tipos

```ts
type Money = string; type Rate = string
type UserRef = { userId: number; userName: string }
type ExportType = 'summary' | 'transactions' | 'reserves'

// GET /settlements/{id} → SettlementView (as in #11's contract, unchanged); like the 201, channelsAssigned[].previousAccount
// is HiddenAccountRef ({ accountId: null, name: null, outOfScope: true }) when its merchant is outside the caller's scope

type AppliedFee = {
  appliedFeeId: string            // BIGINT as string
  feeId: string | null            // uuid
  feeTypeId: number; code: string; title: string
  eventDate: string | null        // business date (ISO, Z is transport)
  amountUsd: Money
  configurationSnapshot: Record<string, unknown> | null
}

type SettlementMovement = {
  settlementTxnId: string         // BIGINT as string
  transactionId: string           // internal BIGINT as string
  sourceTransactionId: string     // external ID, always text
  gatewayId: number
  cycle: 'E' | 'I' | 'R'
  status: 'Successful' | 'Declined' | 'Chargeback' | 'Refund' | 'RDR'
  roundNo: 1 | 2 | null
  sheetId: string | null /* uuid */; sheetName: string | null; rowNo: number | null   // null for seeded history
  amount: Money; excludeAmount: boolean; feeAmount: Money
  eventDate: string | null        // null: undated adjustment
  appliedReservePct: Rate; reserveDaysUsed: number; expectedReserveReleaseAt: string | null
  reserveHeldAmt: Money; reserveReleasedAmt: Money; reserveEarlyReleasedAmt: Money
  reservePolicySnapshot: Record<string, unknown> | null
  settled: boolean                // the attempt is paid
  fees: AppliedFee[]              // ordered by appliedFeeId
}

type SettlementTransactionsQuery = { type: 'E' | 'I' | 'R'; page?: number /* ≥1, 1 */; pageSize?: number /* 1–500, 50 */ }
type SettlementTransactionsPage = { batchId: string; type: 'E' | 'I' | 'R'
                                    items: SettlementMovement[]; page: number; pageSize: number; total: number }

type ImportSettlementAttempt = {
  batchId: string; batchNo: number; attemptNo: number
  status: 'processed' | 'paid' | 'undone'
  settledStatus: 'pending_payment' | 'settled' | 'undone'
  processedAt: string             // audit instant (UTC)
  approvedBy: UserRef
  amountPayable: Money
  isCurrent: boolean              // === Import.currentBatchId
}
type ImportSettlements = { importId: string; currentBatchId: string | null; items: ImportSettlementAttempt[] }  // newest first
```

### Rutas

| Método y ruta | Permiso | Respuesta | Errores |
|---|---|---|---|
| `GET /settlements/{batchId}` | autenticado | `200 SettlementView` | `400` (UUID), `401`, `404` |
| `GET /settlements/{batchId}/transactions?type=&page=&pageSize=` | autenticado | `200 SettlementTransactionsPage` | `400` (`type` ausente o inválido, `pageSize` > 500), `401`, `404` |
| `GET /imports/{importId}/settlements` | autenticado | `200 ImportSettlements` (`items: []` sin intentos) | `400`, `401`, `404 "Import not found"` |
| `GET /settlements/{batchId}/export?type=` | `reports.view` | `200 text/csv; charset=utf-8` | `400`, `401`, `403 forbidden` (antes del alcance), `404`, `500 internal_error` (no se pudo auditar; sin archivo) |

**Descarga desde la pantalla**: `fetch` autenticado (`createAuthFetch`) de la URL de `SettlementView.exports[type]`, tal cual (ya es relativa y lleva `/api/v1`). Si `response.ok`: `blob()` y nombre tomado de `Content-Disposition` (`attachment; filename="…"`, sin `filename*`, ASCII). Si no llega, el respaldo es el mismo patrón (`<cuenta saneada>_B<batchNo>_A<attemptNo>_<type>.csv`) con la regla de D8. Si no es `ok`: `await response.json()` → `ApiError` con `code`. Descargar no cambia nada que la pantalla tenga en caché.

**Aviso junto a las descargas** (P1 del gate; #13 lo muestra con este contenido, texto de UI en inglés): el ID va tal cual en los tres CSV, sin formato para Excel. Los archivos TXN y RR se suben al Back-Office **sin abrirlos ni guardarlos con Excel**: Excel guarda 15 dígitos significativos y un ID de 16–17 dígitos pierde los últimos. Para mirarlos con seguridad: Excel → **Data → From Text/CSV** → columna `ID` como **Text**. Texto propuesto: `Upload the TXN and RR files to the Back-Office without opening or saving them in Excel. To view a file safely, use Excel → Data → From Text/CSV and set the ID column to Text.` La descarga `.xlsx` para lectura humana es #68 (Entrega 3).

### Ejemplos para MSW

`GET /api/v1/settlements/5c3f9e21-…/export?type=transactions` → `200`
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="ProviderA-USD_B123_A1_transactions.csv"
Cache-Control: no-store

ID,Status\r\n
911545593909470,SUC\r\n
4f0c2d1e-9a7b-4c3d-8e6f-1a2b3c4d5e6f,SUC\r\n
911545598812004,CHB\r\n
911545598812004,REF\r\n
```
(El ID va tal cual, sin ningún formato para Excel (D5). Los IDs son ilustrativos).

`…/export?type=reserves` → `filename="ProviderA-USD_B123_A1_reserves.csv"`
```
ID,Description\r\n
911545512345678,Batch 123\r\n
```

`…/export?type=summary` → `filename="ProviderA-USD_B123_A1_summary.csv"` (extracto)
```
Field,Value
Account,ProviderA-USD
Batch,123
Attempt,1
Status,processed
Payment,Pending payment
Processed by,analyst
Processed at,2026-10-19 11:40:03 ET
Settlement date,2026-10-24

Line,Sign,Amount
Deposits,+,39181.0700
Chargebacks,-,193.8600
Refunds,-,843.9900
RDR,-,391.5500
Transaction fees,-,4336.6070
Batch fees,-,40.0000
Reserve held,-,3918.1070
Reserve released,+,4314.4040
Reserve released on chargeback,+,0.0000
Amount payable,,33771.3600
```

`…/export?type=pdf` → `400`
```json
{ "code": "validation_error", "message": "Request validation failed", "details": [ { "path": "/type", "message": "…" } ] }
```
(`details` es la lista de problemas del validador que construye `plugins/error-handler.ts`. El falso solo necesita `code`).

`403` (sin `reports.view`): `{ "code": "forbidden", "message": "Insufficient permissions" }`.
`404`: `{ "code": "not_found", "message": "Settlement not found" }`.
`500` (auditoría fallida): `{ "code": "internal_error", "message": "Internal server error" }`.

`GET /api/v1/settlements/5c3f9e21-…/transactions?type=I&page=1&pageSize=50` → `200`
```json
{ "batchId": "5c3f9e21-8a4b-4f0e-b1d2-6e7f8a9b0c1d", "type": "I", "page": 1, "pageSize": 50, "total": 10,
  "items": [
    { "settlementTxnId": "88213", "transactionId": "40711", "sourceTransactionId": "911545598812004", "gatewayId": 1,
      "cycle": "I", "status": "Chargeback", "roundNo": 2, "sheetId": "2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f", "sheetName": "CHB", "rowNo": 2,
      "amount": "96.9300", "excludeAmount": false, "feeAmount": "45.0000",
      "eventDate": "2026-10-03T14:12:00.000Z",
      "appliedReservePct": "0.100000", "reserveDaysUsed": 180, "expectedReserveReleaseAt": null,
      "reserveHeldAmt": "0.0000", "reserveReleasedAmt": "0.0000", "reserveEarlyReleasedAmt": "0.0000",
      "reservePolicySnapshot": { "policy": "hold_until_term", "applied": false },
      "settled": false,
      "fees": [ { "appliedFeeId": "120334", "feeId": "0b8e…", "feeTypeId": 4, "code": "Chargeback", "title": "Chargeback",
                  "eventDate": "2026-10-03T14:12:00.000Z", "amountUsd": "45.0000",
                  "configurationSnapshot": { "fixedAmount": "45.0000", "percentage": null, "base": "96.9300" } } ] } ] }
```

`GET /api/v1/imports/7b0c…/settlements` → `200`
```json
{ "importId": "7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44", "currentBatchId": "5c3f9e21-8a4b-4f0e-b1d2-6e7f8a9b0c1d",
  "items": [ { "batchId": "5c3f9e21-8a4b-4f0e-b1d2-6e7f8a9b0c1d", "batchNo": 123, "attemptNo": 1,
               "status": "processed", "settledStatus": "pending_payment", "processedAt": "2026-10-19T15:40:03.120Z",
               "approvedBy": { "userId": 2, "userName": "analyst" }, "amountPayable": "33771.3600", "isCurrent": true } ] }
```
Los ids, el importe del chargeback y su fee son ilustrativos. Las cifras del summary son las de `batch-clean/expected.json`.

## Risks / Trade-offs

- [El formato que acepta el Back-Office no está en el repo; se sigue RFC 4180 (P4)] → está concentrado en `csv.ts` y dos constantes de cabecera, así que corregirlo cuando haya un ejemplo real no toca las consultas.
- [Un CSV abierto y guardado con Excel corrompe los IDs largos (15 dígitos significativos)] → el README y #13 avisan de que se sube sin abrir ni guardar con Excel y explican cómo mirarlo; el `.xlsx` para lectura humana es #68.
- [Lectura de una descarga que audita] → una petición `GET` escribe en `AuditLog`. Un prefetch o un reintento del navegador dejarían dos filas. #13 descarga con `fetch` explícito al pulsar, sin prefetch.
- [Excel y el UTF-8 sin BOM en el summary] → los textos no ASCII (descripciones de fees, nombres) se ven mal al abrir con doble clic. Hoy los datos son sintéticos y ASCII. Se aceptó sin BOM en el gate (P4).
- [La señal "sin auditoría" es `validationSummary === null`] → depende de cómo construye la vista #11. Un test lo fija con un batch del seed; #65 debe revisarlo.
- [El `403` del export no se ejecuta con usuarios del seed] → test de rutas con permisos inyectados; en Bruno solo hay negativos `404`/`400`.
- [Base de datos compartida con #11 y #13] → ningún grupo con base se ejecuta hasta el insumo 4.

## Migration Plan

Sin migraciones ni cambios de esquema. Desplegar es añadir rutas; revertir es quitarlas. Las filas `settlement.export` de `AuditLog` se conservan.
