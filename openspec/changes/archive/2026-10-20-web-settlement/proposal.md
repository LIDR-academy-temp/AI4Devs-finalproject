# Proposal — web-settlement

Issue: #13 · T4 · HU3 · pantallas **Settlement Review** y **Settlement Summary**. Depende de #11 (`settlement-process`, en curso: hoy solo su proposal, sus specs, su design y sus tasks están en la rama `feat/settlement-process`) y de #12 (lecturas del intento y exports, sin empezar). Se apoya en `web-shell` (sesión, guarda por permiso, textos por pantalla), `web-import` (espacio del import, formularios con React Hook Form + Zod, TanStack Query, MSW) y `web-validations` (contrato aislado, falso guionizado, `BusinessDate` / `AuditInstant`, guardas síncronas, sin optimismo, `OPENING`, capturas con Playwright), los tres archivados. El issue dice "puede empezar con mocks": este change se construye contra "Contrato para #13" y "Contrato para #12" de `settlement-process/design.md` y se cierra con un rebase sobre #11 (y sobre #12 si ya está fusionado).

## Why

Un import llega hoy hasta `validated` y la pantalla ofrece **Settlement Review** como entrada deshabilitada (`SETTLEMENT_REVIEW = null`, `web-validations` D9). El analista no puede fijar el número de batch, revisar los fees por batch ni ver lo que se va a liquidar, y no hay pantalla que muestre el resultado del procesamiento. Sin estas dos pantallas la demo de la Entrega 2 no cierra de punta a punta. Cierra HU3 CA1, CA2, CA5 y CA6 en el frontend (CA3 y CA4 se ven en las cifras y advertencias que el API ya calcula).

## Secciones del README que implementa

- **§5 HU3**: CA1 (número propuesto y editable, rechazo de un número en uso, intento incrementado tras deshacer como dato del API), CA2 (fees por batch preestablecidos con importe ajustable o de importe libre con categoría y descripción, reflejados en el resumen previo y con el usuario), CA5 (aviso de canales con aceptación), CA6 (estado `processed`, nada Settled, exports identificados por intento). CA3 y CA4 solo se pintan: advertencia `undated_adjustment`, reservas retenidas y liberadas.
- **§1.2**: "Procesamiento del batch", "Exports", "Fees múltiples y vigencias" (un preestablecido solo con porcentaje no se calcula), "Settled por ciclo".
- **§1.3**: filas **Settlement Review** y **Settlement Summary** del mapa de pantallas y pasos 4 y 5 del recorrido.
- **§4.3 y §4.4**: consume `GET /accounts/{id}/batch-number/next`, `GET /accounts/{id}/fees`, `GET /fee-types`, `POST /imports/{id}/settlements/preview` y `POST /imports/{id}/settlements` (de #11), y `GET /settlements/{id}` y `GET /settlements/{id}/export` (de #12). **Ningún endpoint nuevo ni modificado.**

## What Changes

- **Settlement Review** en una ruta propia del import, solo para quien tiene `settlement.process` (design D1, D13):
  - **Número de batch** propuesto por `GET batch-number/next` y editable. Un número ocupado se avisa en el campo antes de procesar (`batchNoAvailable = false` de la vista previa) y con el `409 batch_no_taken` al procesar. El intento que se usará sale de la vista previa.
  - **`settlementDate`** obligatoria, como fecha de negocio, vacía hasta que el analista la elige (P8 de #11). Sin ella no se pide la vista previa ni se procesa, y el campo dice por qué.
  - **Fees por batch** en un formulario de filas (React Hook Form + Zod): los prellenados de `Other Fees` desde `GET /imports/{id}` (`batchFees`, `source = file`), los preestablecidos no transaccionales de la cuenta vigentes en `settlementDate` (`GET /accounts/{id}/fees?transactional=false&asOf=`) con el importe ajustable y los de importe libre, solo con los tipos que lo admiten (`GET /fee-types`, `allowsFreeAmount`) y con descripción obligatoria. Importes con signo, como texto. Un preestablecido solo con porcentaje (`fixedAmount = null`) llega vacío y lo escribe el analista: la pantalla no multiplica nada. Una fila de `Other Fees` con tipo desconocido queda marcada hasta que el analista le elige un tipo con importe libre o la quita.
  - **Aviso de canales a asociar** con casilla de confirmación, a partir de `channelsToAssign` y `requiresChannelConfirmation` de la vista previa.
  - **Resumen previo** con `POST settlements/preview` con debounce, que pinta los totales por categoría, el `payableBreakdown` línea a línea con su signo, `skipped` por motivo y las advertencias. Ninguna cifra se calcula ni se suma en el navegador.
  - **Process**, con guarda síncrona, habilitado solo cuando la vista previa a la vista corresponde exactamente al formulario actual, y con cada motivo de deshabilitado visible y enlazado por `aria-describedby`. Sin actualizaciones optimistas.
- **Settlement Summary** en `/settlements/$batchId`: la respuesta `201` de procesar y, al recargar, `GET /settlements/{id}` (de #12, simulado hasta su merge). Estado del intento (`processed · pending payment`, nada Settled), quién y cuándo, totales por categoría y por marca, `payableBreakdown` línea a línea para que la fórmula se pueda auditar, fees transaccionales y por batch con su usuario, reservas, canales asociados, resumen de incidencias, `skipped`, advertencias y tres descargas (summary, TXN CSV, RR CSV). `viewer` la ve en solo lectura.
- **Descargas**: mientras #12 no esté fusionado, los tres botones se pintan deshabilitados con su motivo, con una constante que el rebase cambia (mismo patrón que `SETTLEMENT_REVIEW`, design D12).
- **`SETTLEMENT_REVIEW`** de `features/validations/next-step.ts` pasa a la ruta real. En el paso Analysis, el acceso solo se ofrece con `settlement.process`; un import `processed` enlaza a su Summary por `currentBatchId` (design D13).
- **Contrato aislado**: tipos y llamadas de las siete rutas en `features/settlements/contract.ts`, y el API falso guionizado de MSW en `test/msw/settlements.ts`, que no decide reglas ni calcula cifras. Tras el rebase, el falso se contrasta con los esquemas Zod de `@recon/shared` (`settlement.ts`, `fees.ts`) (design D2, D15).
- **Fechas** con `BusinessDate` (`dateRanges`, `settlementDate`, vigencias de los fees) y `AuditInstant` (`processedAt`), como en `web-validations` D11.
- Componente shadcn nuevo: `checkbox`.
- **Capturas del PR con Playwright**: script en `e2e/screenshots/`, fuera de `pnpm test:e2e` y de CI, con las mismas protecciones que `web-validations` (design D16).

## Huecos del contrato detectados (no se cambia el backend en este change)

Resueltos en la revisión del 2026-10-19:

1. **Fecha de negocio de referencia (P8 de #11).** La vista previa no devolvía la fecha que el servidor usa sin `settlementDate`. **Decidido**: `settlementDate` es obligatoria en el formulario, vacía hasta que el analista la elige. Sin ella no se pide la vista previa ni se procesa, y el campo dice por qué. Los preestablecidos se piden siempre con `asOf = settlementDate` (design D4, D5).
2. **Fila de `Other Fees` con tipo desconocido** (`feeTypeId = null`, que `BatchFeeInput` no admite). **Decidido**: la fila se muestra marcada y el analista le elige un tipo con `allowsFreeAmount` o la quita. Mientras quede alguna, **Process** está deshabilitado con su motivo. El mantenimiento de tipos es #60 (design D5).
3. **Orden de `batchFees` en la vista previa.** **Decidido**: #11 deja escrito en su contrato que `batchFees` conserva el orden del request. El rebase lo comprueba.
4. **Descarga de los exports.** Las URL de `exports` exigen `Authorization: Bearer`, así que se descargan con el `fetch` autenticado. El nombre identificado por intento (`<account>_B<batchNo>_A<attempt>_<type>.csv`) tiene que llegar en `Content-Disposition`, expuesta en CORS si el API va en otro origen. **Comentado en #12.** Sin ella, la pantalla usa ese mismo patrón como nombre de respaldo (design D12).
5. **Descripción de un fee de importe libre.** **Decidido**: es obligatoria también en el API (#11, `400 batch_fee_invalid` con `reason = description_required`). El formulario la valida igual y el error del API se pinta en su fila (design D5, D6).

Pendiente de #12:

6. **`GET /settlements/{id}` y los exports son de #12.** Hasta su merge, la recarga del Summary solo funciona contra el falso; contra el API real responde `404`, y la pantalla lo dice. Se cierra en el rebase si #12 ya está fusionado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `settlement`: se añaden los requisitos de las pantallas Settlement Review y Settlement Summary. Los de #11 tienen otros nombres (`ADDED` sin prefijo de pantalla), así que los dos deltas no chocan al archivar. Los requisitos existentes no cambian y ya tienen escenario.
- `validation`: "Pantalla Analysis & Validations: acceso a Settlement Review" se sustituye por "Pantalla Analysis & Validations: enlace a Settlement Review" (enlace real, solo con `settlement.process`; su escenario "Import validado antes de #13" deja de ser cierto), y cambia "Pantalla Analysis & Validations: continuar o cancelar" (un import `processed` enlaza a su Summary).

## Fuera de alcance

- **Lista de Settlements de la cuenta** y lista de intentos del import: #64 (Entrega 3). Settlement Detail, pagar, retirar el pago y deshacer (tramo 6).
- Guardar el formulario y salir ("Save and leave" del prototipo): el API no guarda borradores.
- Calcular en el navegador cualquier importe (un preestablecido solo con porcentaje, totales, payable).
- Cambios de backend, de OpenAPI o de la colección Bruno: no hay endpoints nuevos ni modificados en este change. `docs/openapi.yaml` y `schema.gen.ts` llegan regenerados con #11 y #12.

## Impact

- **Código nuevo**: `frontend/src/features/settlements/` (Review, Summary, formulario de fees, panel del resumen previo, consultas, mutaciones, textos y tests), `features/settlements/contract.ts` (temporal hasta #11/#12) y `test/msw/settlements.ts` (API falso con estado).
- **Código modificado**: `app/router.tsx` (dos rutas), `features/validations/next-step.ts` (ruta real), `features/validations/DecisionBar.tsx` (acceso solo con permiso y enlace al Summary de un import `processed`), `test/msw/handlers.ts` (registra el falso), `test/msw/imports.ts` (expone y cambia el estado del import y `currentBatchId`), `components/ui/checkbox.tsx`.
- **E2E**: un script de capturas en `e2e/screenshots/`, excluido de `pnpm test:e2e` y de CI.
- **Dependencias nuevas**: ninguna salvo la primitiva que traiga `shadcn add checkbox` (de `radix-ui`, ya instalado).
- **Pruebas**: componentes con MSW. Mientras #11 esté en curso no se ejecuta integración ni E2E contra la base, porque se comparte. La prueba contra el API real va en el último grupo.

## Insumos que necesito de la persona

Revisión del 2026-10-19: D1–D17 aprobadas; huecos 1–5 decididos; debounce de 400 ms y enlace del import `processed` a su Summary aprobados; lista de Settlements en #64. Quedan:

1. **Para el último grupo** (espera al merge de #11): base local libre de las pruebas de #11, migración `0007` aplicada y seed (`! pnpm db:migrate`, `! pnpm db:seed`), `pnpm dev` levantado y saber si #12 está fusionado (decide si las descargas se habilitan y si la recarga del Summary se prueba contra el API real).
2. **Mirar la ejecución del script de capturas**: aviso antes de lanzarlo.
