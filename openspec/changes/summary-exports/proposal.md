# Proposal — summary-exports

Issue: #12 · T4 · HU3 CA6 · Settlement Summary y CSV del Back-Office. Rama `feat/summary-exports`, apilada sobre `feat/settlement-process` (#11, en revisión). Lee lo que #11 escribe según su "Contrato para #12" (`openspec/changes/settlement-process/design.md`) y devuelve `SettlementView` tal como la construye `PrismaSettlementReader.view` de #11. El apply espera al merge de #11 (tasks, grupo 1).

## Why

Tras procesar, el analista solo tiene la respuesta `201`: no puede volver a abrir el intento, ver sus movimientos ni descargar el summary y los dos CSV que Reconciliaciones guarda y ejecuta en el Back-Office después del pago (README §1.2 "Exports", HU3 CA6). Settlement Summary (#13) necesita `GET /settlements/{id}` al recargar y las tres descargas. Sin este change, la demo de la Entrega 2 termina en una pantalla que no se puede recargar y sin los archivos que son el producto final del flujo.

## What Changes

- **`GET /settlements/{id}`** (autenticado, alcance por la cuenta del batch): `SettlementView` con el lector de #11, sin recalcular nada, también para los batches del seed (sin auditoría `settlement.process`: `validationSummary = null`, `skipped` en 0, sin advertencias).
- **`GET /settlements/{id}/transactions?type=E|I|R&page=&pageSize=`** (autenticado): movimientos del intento de un ciclo con su desglose de fees (`SettlementTransactionFee`), en el orden estable del contrato `(cycle, sheetId, rowNo, settlementTxnId)`, paginados como `GET /imports/{id}/rows` (50 por defecto, máximo 500). `settled` se deriva del intento (`status = 'paid'`), nunca de `settlementStatusId`.
- **`GET /imports/{id}/settlements`** (autenticado): intentos del import, vigente y deshechos, con `isCurrent` (= `Import.currentBatchId`). Lo usa el Summary de #13; la lista de Settlements de la cuenta queda fuera.
- **`GET /settlements/{id}/export?type=summary|transactions|reserves`** (permiso `reports.view`, que el seed da a `admin`, `analyst`, `payments` y `viewer`): CSV generado al vuelo desde lo escrito, con `Content-Disposition: attachment; filename="<account>_B<batchNo>_A<attempt>_<type>.csv"`. No cambia ningún estado. Cada descarga escribe una fila `settlement.export` en `AuditLog` antes de enviar el archivo, y si la auditoría falla no se envía nada. Se puede descargar en cualquier estado del intento, también `undone`, porque los exports históricos se identifican por intento (README §3.2).
  - **TXN** (`transactions`): `ID,Status`, con movimientos E `Successful` (`SUC`) e I (`CHB`, también `excludeAmount`/`CHB 2`; `REF`; `RDR`), sin `Declined`.
  - **RR** (`reserves`): `ID,Description`, con movimientos R y `Description = Batch <batchNo>`.
  - **Summary**: bloques legibles (intento, totales por categoría, marcas, fees por batch, reservas, `payableBreakdown` línea a línea con su signo e importe total, incidencias y filas no procesadas). Las cifras salen de la vista y la fórmula no se recalcula.
- **Contrato**: esquemas Zod nuevos en `packages/shared/src/settlement-reads.ts` (no se toca `settlement.ts` de #11), OpenAPI regenerado, colección Bruno (`10-smoke` y el flujo `20-flows/settlements` ampliado) y README §1.2 (formato de los CSV), §3.2 (`AuditLog`: `settlement.export`) y §4.4.

## Decisiones que toma este change (detalle y alternativas en design.md)

1. **Formato de los CSV (D5), aprobado en el gate:** RFC 4180 con separador `,`, una fila de cabecera, fin de línea CRLF, UTF-8 **sin** BOM (el Back-Office lee la cabecera `ID` tal cual), decimales con punto y 4 decimales sin separador de miles, negativos con `-`, y comillas solo cuando el valor contiene `,`, `"` o salto de línea. El texto va al README §1.2.
2. **Contenido del summary (D7):** bloques separados por una línea vacía, cada uno con su cabecera. Fechas de negocio sin convertir (`2026-10-07 23:58:40`), con la etiqueta "New York time"; `processedAt` convertido a America/New_York con sufijo `ET`, como `formatAuditDateTime` de la pantalla. `payableBreakdown` con sus nueve líneas: `label`, `sign` y `amount` (magnitud), más la fila `Amount payable`. Así la fórmula se audita sumando la columna con su signo (P3 de #11).
3. **Nombre del archivo (D8):** el nombre de la cuenta pasa por una lista blanca `[A-Za-z0-9-]`. Cualquier otro carácter se convierte en `_`, los `_` repetidos se colapsan y se recortan en los extremos, y si queda vacío se usa `account`. Así sale siempre un `filename="…"` ASCII, sin `filename*`. Los nombres del seed (`ProviderA-USD`…) no cambian. #13 usa el mismo patrón como respaldo.
4. **CORS (D9):** no se registra `@fastify/cors`. La API se sirve en el mismo origen que la SPA (proxy de Vite y Nginx, D2 de `web-shell`), así que `Content-Disposition` llega a `fetch` sin `Access-Control-Expose-Headers`. Si algún día el API va en otro origen, ese change añade `exposedHeaders: ['Content-Disposition']`. Esto se aparta de la letra del encargo ("expuesto en CORS"): el comentario del issue lo condiciona a "si el API va en otro origen".
5. **Auditoría de la descarga (D10):** `settlement.export` (`entityType = 'SettlementBatch'`, `entityId = batchId`, `detail = { type, fileName, rows }`). Se escribe después de generar el CSV y antes de enviarlo. Si falla, la respuesta es `500` y no se envía el archivo: el criterio 4 del issue exige una entrada por descarga.
6. **Alcance (D3):** `PrismaSettlementReader.view` no recibe alcance. Este change no lo modifica: antes de llamar al lector, una consulta propia comprueba que el batch es de un merchant del alcance, con el mismo `404 not_found` ("Settlement not found") para un batch inexistente y para uno fuera del alcance. En el export, el permiso se comprueba antes que el alcance (`403` antes que `404`), como en `catalog-read` y `validation-runs`.

## Decisiones del gate (2026-10-19)

- **CORS, `reports.view` y auditoría: aprobados.** No se registra CORS (mismo origen, D2 de `web-shell`). `reports.view` lo tienen todos los roles del seed, y el `403` se prueba con permisos inyectados. Si falla la auditoría, la respuesta es `500` y no se envía el archivo.
- **P1. IDs como texto: CSV limpios.** TXN y RR llevan el ID tal cual, sin ningún truco para Excel: ni `="…"`, ni apóstrofo, ni prefijo, ni comillas que RFC 4180 no exija, porque los consume el Back-Office. El summary sigue la misma regla y no hay ninguna celda especial. Se documenta (README §1.2 y "Contrato para #13") que el CSV se sube al Back-Office **sin abrirlo ni guardarlo con Excel**, y la forma segura de mirarlo: Excel → **Datos → Desde texto/CSV** → columna `ID` como **Texto**. #13 muestra ese texto junto a las descargas. La lectura humana con ID como texto va en #68 (Entrega 3, descarga `.xlsx`): Excel guarda 15 dígitos significativos, así que al abrir un CSV un ID de 16–17 dígitos pierde los últimos.
- **P2. Aprobada:** una fila por par `(ID, Status)` distinto, en el orden estable. Refund + Chargeback da dos filas (`REF` y `CHB`); Chargeback + `CHB 2` o un duplicado E incluido a mano, una.
- **P3. Aprobada:** la R con `reserveReleasedAmt = 0` sale en el RR (una fila por ID distinto). Se revisa con #62.
- **P4. Aprobada:** RFC 4180, CRLF, UTF-8 sin BOM. No hay archivo de ejemplo del Back-Office, así que se sigue la especificación.

## Lo que falta o conviene saber de #11 (no se cambia aquí)

- `SettlementReader.view(batchId)` no tiene alcance. Lo resuelve una consulta propia de #12 (decisión 6), sin cambiar el puerto.
- En los batches sin auditoría `settlement.process` (todo el seed), `skipped` vale 0 en todos los motivos y no se distingue de "desconocido". El summary lo escribe como `Not available` cuando `validationSummary` es `null`, en lugar de ceros. Guardarlo en el batch es #65.
- Todos los batches sembrados están `paid` y ninguno `processed` ni `undone`. Los tests de "Settled solo si `paid`" comparan uno sembrado con uno procesado por el test.
- Lo único que este change toca del código de #11 es el cableado: registrar las rutas nuevas en `settlement-module.ts` y comprobarlas en `app.test.ts`. Los servicios, el lector y los esquemas de #11 no cambian.

## Capabilities

### New Capabilities

Ninguna. Las lecturas y los exports son de `settlement`, cuyo propósito ya incluye "exportar".

### Modified Capabilities

- `settlement`: "Exports" se precisa (formato, contenido de cada CSV, nombre por intento, auditoría por descarga) y se añaden las lecturas del intento (`GET /settlements/{id}`, movimientos, intentos del import), el summary del merchant, la descarga (cabeceras, permiso y alcance) y "Settled derivado del intento" en las lecturas.

## Impact

- **Backend**: en `modules/settlement`, archivos nuevos `domain/exports/` (CSV puro: `csv.ts`, `file-name.ts`, `transactions-csv.ts`, `reserves-csv.ts`, `summary-csv.ts`, `audit-time.ts`), `application/read-ports.ts` y `settlement-read-service.ts`, `infrastructure/prisma-settlement-queries.ts` y `http/settlement-read-routes.ts`. Cableado en `settlement-module.ts`. Sin migraciones ni cambios de esquema y sin dependencias nuevas (el CSV se escribe a mano, porque son cuatro reglas de RFC 4180).
- **Shared**: `packages/shared/src/settlement-reads.ts` (`SettlementTransactionsQuery`, `SettlementTransactionsPage`, `SettlementMovement`, `AppliedFee`, `ImportSettlements`, `ExportQuery`, `ExportType`) exportado desde el índice.
- **Contrato**: `docs/openapi.yaml`, `frontend/src/lib/api/schema.gen.ts`, `api-collection/` (`10-smoke`, `20-flows/settlements/batch-clean`), README §1.2, §3.2 y §4.4.
- **Base de datos**: solo lecturas y la fila de auditoría por descarga.

## Fuera de alcance

- `GET /accounts/{id}/settlements` (lista de Settlements de la cuenta, Entrega 3, #64).
- Pagar, retirar el pago y deshacer (tramo 6). Las pantallas son de #13.
- Política de reserva ante chargeback y P12 (#62), y cómo afecta a los CSV.
- Guardar los archivos generados: se generan al vuelo desde lo escrito, que no cambia salvo por el pago.
- Reportería avanzada y ejecución automática en el Back-Office.

## Insumos que necesito de la persona

1. ~~Respuestas a las preguntas abiertas 1–4~~: respondidas en el gate (arriba).
2. ~~Aprobar las decisiones 4 y 5~~: aprobadas.
3. ~~El `403` del export con usuarios del seed~~: aprobado probarlo con permisos inyectados; en Bruno los negativos son `404` y `400`.
4. **Para los grupos con base de datos** (después del merge de #11): avisar cuando la base local esté libre de #11 y #13, con la migración `0008` aplicada y el seed (`! pnpm db:migrate`, `! pnpm db:seed`), y `pnpm dev` levantado para Bruno. Antes de eso no se ejecuta nada contra la base.
