# Proposal — validation-engine

Issue: #8 · T3 · HU2: motor de las ocho validaciones como funciones puras con TDD (RT2-BE-002) · Historia HU2 (CA 3–4) · Tramo 3 · Depende de #5 (`import-analyze`, archivado el 2026-10-17). Rama: `feat/validation-engine` (worktree `C:/Projects/recon-tool-2-validation`).

## Why

Tras #5 cada fila del import queda cruzada (`ImportRow` con `matchResult`, `cycle`, `statusId`, `transactionId` y `excludeAmount` en `detailJson`), pero nada la contrasta con el proveedor de la cuenta, con el resto del batch, con los batches anteriores ni con las transacciones propias que faltan. Las ocho validaciones de README §3.3 son el núcleo de HU2 y la condición para procesar un batch (#9 las persiste y las expone; #10 las muestra). Este change construye **solo el motor**: funciones puras, deterministas y probadas contra los oráculos de `data/samples`, con los puertos que #9 implementará.

## Secciones del README que implementa

- **§1.2 "Reglas de negocio confirmadas"**: "Validaciones y bloqueo", "Approved + Declined", "Refund + Chargeback", "Duplicados y colisiones", "CHB 2", "Rondas" (no participan en la detección), "Rangos de fechas por ciclo y faltantes", "Alcance del histórico", "Resultado de una validación" (con el vocabulario nuevo, ver abajo). **"Ocho validaciones con detalle por caso"**.
- **§3.2 "Validaciones e incidencias"**: forma de `ValidationRun` (rangos `dateMin/Max*`, `pendingInRangeCount`), `ValidationResult` (`validationCode`, `outcome`, `issueCount`), `ValidationIssue` (`issueType`, `scope`, `blocking`, `missingType`, `relevantDate`) y `ConflictOccurrence` (`sourceType`, `includeInSettlement`/`defaultIncluded` con las reglas de inclusión por defecto). El motor produce estos valores en memoria; **no** los persiste.
- **§3.3** completo: identidad y ciclos, duplicados y colisiones, rondas, `non_recorded_adjustment`, `provider_mismatch`, tabla de faltantes, alcance del histórico, resultados.
- **§6 Ticket 2 (RT2-BE-002)**: tareas 1–4 ampliadas a las ocho validaciones y criterios de aceptación 1, 2, 3, 4, 5, 7 (incluido el de rendimiento). Las tareas 5–7 (caso de uso que persiste, rutas, integración HTTP) son de #9.

## Decisiones de negocio que introduce este change (mandan sobre el README actual)

### 1. Vocabulario del resultado de cada validación (`outcome`)

| Valor | Significado | ¿Cuenta como aprobada? |
|---|---|---|
| `passed` | Corrió y no produjo hallazgos | Sí |
| `warning` | Hay hallazgos y ninguno es bloqueante | No bloquea; se muestra como advertencia |
| `blocked` | Al menos un hallazgo con `blocking = true` (hoy solo `provider_mismatch`) | No |
| `not_applicable` | Sin movimientos del ciclo o sin histórico sobre el que correr; se muestra n/a | No |
| `not_implemented` | La validación no está implementada | Nunca |

Desaparece `failed`. El hallazgo conserva `blocking` y el `outcome` se **deriva** de sus hallazgos. Resultado global de la corrida: `blocked = true` si alguna validación es `blocked`. El README se actualiza en este change, en un commit `docs(readme)` propio: §1.2 "Resultado de una validación" y párrafo "Ocho validaciones con detalle por caso", §3.2 `ValidationResult.outcome`, §3.3 "Resultados y persistencia" y §6 Ticket 2 tarea 5.

### 2. Discrepancias de estado con el gateway (decidida en la revisión del proposal)

La validación `non_recorded_adjustment` pasa a cubrir "el estado que reporta el archivo no cuadra con el del gateway", con dos `issueType`:

| `issueType` | Ciclo | Cuándo |
|---|---|---|
| `non_recorded_adjustment` | I | Fila de ciclo I cuya transacción está en el gateway en un estado de ciclo natural E (`Pending`, `Successful`, `Declined`). Es la regla actual. |
| `status_mismatch` (nuevo) | E | Fila E que el archivo reporta `Declined` y el gateway tiene `Successful`, `Chargeback`, `Refund` o `RDR`; o fila E que el archivo reporta `Successful` y el gateway tiene `Declined`. |

- Gateway `Pending` no se compara en E (ya va a `pendingInRangeCount`).
- Una fila APP cuya transacción pasó a `Chargeback`/`Refund`/`RDR` **no** es hallazgo: fue `Successful` al liquidarse (ronda 1 normal). La inversa de NRA (fila E con el gateway en estado I) tampoco.
- Ambos tipos son advertencia no bloqueante, con la fila incluida por defecto, y se resuelven a mano tras verificar el gateway (como NRA). El `validationCode` no cambia: siguen siendo ocho validaciones, y el `issueCount` de `non_recorded_adjustment` suma los dos tipos.
- `ValidationIssue.issueType` tiene un `CHECK` (`CK_ValidationIssue_issueType`, `0002_constraints`): la migración `0004` lo amplía con `status_mismatch`.
- README en el mismo commit `docs(readme)` que la decisión de negocio 1: §1.2 párrafo "Ocho validaciones con detalle por caso", §3.2 `ValidationIssue.issueType` y §3.3 sección de `non_recorded_adjustment`.

### 3. Estado no resuelto en duplicados y colisiones (decidida durante el apply, 2026-10-18)

Una aparición cuyo estado no se pudo resolver (`status_unresolved`) no se excluye de duplicados ni colisiones: frente a otra aparición de la misma `(transactionId, cycle)`, del batch o de un batch anterior vigente, cuenta como estado distinto y genera colisión (advertencia, apariciones actuales incluidas); dos apariciones no resueltas también colisionan; nunca forman duplicado. Motivo: README, "ninguna se resuelve en silencio". Como `ConflictOccurrence.statusId` era `NOT NULL`, la migración `0005` lo hace nullable (ver Esquema).

## What Changes

- **Módulo nuevo `backend/src/modules/validation`** con `domain/` (las ocho validaciones, cálculo de rangos, derivación del `outcome`, orquestador `runValidations`) y `application/ports.ts` (puertos de lectura que #9 implementará con Prisma). Sin Prisma ni Fastify en `domain/`.
- **Orden fijo**: `provider_mismatch`, `non_recorded_adjustment`, `duplicate_in_batch`, `status_collision_in_batch`, `duplicate_across_batches`, `status_collision_across_batches`, `missing_previous_to_batch`, `missing_in_range`. Siempre ocho resultados; una validación aún no implementada devuelve `not_implemented` (permite TDD por grupos sin romper la forma del informe).
- **Discrepancias de estado** (decisión de negocio 2): la validación `non_recorded_adjustment` produce hallazgos `non_recorded_adjustment` (ciclo I) y `status_mismatch` (ciclo E).
- **Hallazgos con apariciones**: duplicados y colisiones llevan N apariciones (`current_import` con archivo/hoja/fila, o `previous_batch` con batch e intento) y su inclusión por defecto (§3.2). Faltantes sin apariciones, con `missingType`, `relevantDate` y su rango (APP/DEC/I/R).
- **Rangos por ciclo** (APP, DEC, I, R) calculados de las filas asociadas del batch, devueltos en el informe junto con `pendingInRangeCount`.
- **Entrada del motor** (detalle en design): filas del import cruzadas con los datos de su transacción; cuenta (proveedor y canales); movimientos de batches anteriores **no deshechos de todas las cuentas del proveedor**; transacciones propias candidatas a faltante en los canales de la cuenta, con fecha ≤ máximo de cada rango; faltantes ya registrados para el proveedor; catálogo de estados con su ciclo natural. Las candidatas llegan ya sin las procesadas en ese ciclo en un intento vigente (la exclusión la hace #9 en SQL; el motor la repite por seguridad), y cuentan como registrados solo los faltantes persistentes de imports que tienen un `SettlementBatch` `processed` o `paid`. El motor se ejecuta en dos pasos: `computeRanges(rows)` (puro) dice al caso de uso de #9 qué candidatas cargar; `runValidations(input)` produce el informe.
- **Alcance por merchant** (lección del M3 de `import-analyze`): el histórico es de todas las cuentas del proveedor (mismo merchant), pero una fila cuya transacción es de otro proveedor solo produce el hallazgo `provider_mismatch`, y ese hallazgo no transporta ningún dato de la transacción ajena salvo `transactionId` (igual que las filas ocultas de #5). Ningún hallazgo del informe incluye canal, cuenta, importe ni estado del gateway de una transacción de otro proveedor.
- **Vocabulario compartido nuevo** en un archivo nuevo `packages/shared/src/validation.ts` (`ValidationOutcome`, `IssueType` con `status_mismatch`, `IssueScope`, `OccurrenceSource`, `MissingRange`), exportado con una línea en `packages/shared/src/index.ts`. **No se toca `vocabulary.ts`**, que la sesión de `web-import` está modificando (`TRANSACTION_STATUSES`); por la misma razón el motor recibe el catálogo de estados como entrada en lugar de importar esa constante.
- **Migración `0004_validation_outcome`**: el `CHECK` `CK_ValidationResult_outcome` de `0002_constraints` admite hoy `('passed', 'failed', 'not_applicable', 'not_implemented')`; la migración lo sustituye por `('passed', 'warning', 'blocked', 'not_applicable', 'not_implemented')`. En la misma migración, `CK_ValidationIssue_issueType` (hoy `provider_mismatch`, `non_recorded_adjustment`, `duplicate`, `collision`, `missing`) se sustituye por la misma lista más `status_mismatch` (`VARCHAR(30)` basta; `CK_ValidationIssue_blocking` ya lo deja no bloqueante). Los `CHECK` no viven en `schema.prisma`, así que la carpeta la genera el agente con `prisma migrate dev --create-only` (sale vacía), escribe a mano los `DROP CONSTRAINT` / `ADD CONSTRAINT`, actualiza los comentarios `///` de `ValidationResult.outcome` y `ValidationIssue.issueType`, y **la aplica la persona** con `! pnpm db:migrate`. Ningún código escribe aún `ValidationResult` ni `ValidationIssue`, así que no hay datos que convertir; si existiera una fila con `failed`, el `ADD CONSTRAINT` fallaría de forma visible (preferible a convertirla en silencio).
- **Migración `0005_conflict_occurrence_unresolved_status`** (decisión de negocio 3): `ConflictOccurrence.statusId` pasa de `INT NOT NULL` a `INT NULL` (NULL = estado de la fila no resuelto). SQL Server no admite `ALTER COLUMN` sobre una columna con FK, así que se elimina `ConflictOccurrence_statusId_fkey`, se cambia la columna y se recrea con el mismo nombre, en una transacción; `schema.prisma` pasa a `statusId Int?` con la relación opcional. Escrita a mano y aplicada por la persona.
- **Spec `validation`** actualizada: vocabulario nuevo, `status_mismatch`, reglas detalladas de cada validación y escenarios para los requisitos que no tenían (regla de `openspec/config.yaml`).
- **Medición de rendimiento como puerta del grupo 1**: 2 000 filas contra 50 000 movimientos anteriores (y ~25 000 transacciones candidatas) en **< 2 s** para `runValidations`, comprobado en local y anotado en el PR; en CI la aserción tiene margen (**< 4 s**) para no crear un test intermitente. Si la medición local no cumple, se para y se decide antes de seguir.
- **Oráculos de `data/samples`** recalculados con las reglas de la revisión (`plan.ts` + `expected.json` de `batch-clean`, `batch-split`, `batch-issues` y `legacy-provider`; ningún `.xlsx` cambia), en un commit `fix(samples)` propio que se hace solo tras la confirmación de la persona.

## Capabilities

### New Capabilities

Ninguna: la capability `validation` ya existe (tramo 0).

### Modified Capabilities

- `validation`: vocabulario de `outcome` (sin `failed`; con `warning` y `blocked`); `status_mismatch` dentro de `non_recorded_adjustment`; reglas exactas de cada una de las ocho validaciones; rangos por ciclo; inclusión por defecto; excepción `CHB 2`; alcance del histórico y por merchant; entrada pura del motor; rendimiento. Se completan con escenarios los requisitos "Clave de duplicado y colisión" y "Los hallazgos persisten".

## Escenarios de aceptación (del issue #8)

1. `batch-issues` → exactamente los hallazgos de `expected.json`: `non_recorded_adjustment` 3 (1 `non_recorded_adjustment` + 2 `status_mismatch`), `duplicate_in_batch` 1, `status_collision_in_batch` 1, `duplicate_across_batches` 1, `status_collision_across_batches` 1, `missing_previous_to_batch` E 10, `missing_in_range` E 3 / R 3, con los IDs de `affectedIds`; ninguno bloqueante.
2. `batch-blocked` → `provider_mismatch` = 1 y resultado global `blocked`.
3. `batch-clean` (y `batch-split`) → las ocho `passed` o `not_applicable`, sin hallazgos; rangos iguales a `expected.ranges`.
4. `legacy-provider` → `CHB 2` cuenta como `Chargeback` con `excludeAmount` y no genera duplicado ni colisión con el `Chargeback` del mismo movimiento (la muestra no trae ese par: se prueba con un fixture); `missing_previous_to_batch` I = 3 (los refunds omitidos de la hoja `CB`, pregunta 2).
5. Cada regla tiene un test que falló antes de implementarla (commit `test:` anterior al `feat:` por grupo) y una rotura deliberada por grupo.
6. 2 000 filas contra 50 000 movimientos en < 2 s en local (aserción < 4 s en CI; medido en el dominio; la carga desde SQL Server la mide #9).

## Oráculos sin base de datos: ¿basta `buildWorld()`?

Comprobado antes de proponer (script desechable fuera del repo que reconstruye filas desde `plan.ts`, histórico como lo siembra `seed.ts` y candidatas desde `buildWorld()`):

| Muestra | ¿Se reproduce? | Notas |
|---|---|---|
| `batch-clean` / `batch-split` | Sí | 0 hallazgos en las ocho; rangos APP/DEC/I/R idénticos a `expected.ranges`. Hay 3 filas E cuya transacción ya está en estado I (ronda 1): no deben producir hallazgo. |
| `batch-issues` | Sí, **con la regla de rangos de la pregunta 1** | Leyendo el rango DEC por el estado de la fila, la fila de `status_collision_across_batches` (declinada en el archivo, `Successful` en el gateway y fechada en la ventana anterior) adelanta el mínimo DEC y las 10 declinadas omitidas pasan a `missing_in_range` (contradice el oráculo). Por el estado del gateway salen exactamente E 10 / E 3 / R 3. Con la decisión de negocio 2, las dos filas DEC cuya transacción es `Successful` en el gateway (`911545593909470` de la colisión *in batch* y `381797111970492` de la colisión *across*) son `status_mismatch`: 2. |
| `batch-blocked` | Sí, lo que el oráculo afirma | El oráculo solo fija `provider_mismatch = 1` y `blocked`. Con 20 filas de una ventana, `missing_in_range` sale E 10: el test no lo afirma porque `expected.json` no lo dice. |
| `legacy-provider` | **Sí, tras corregir el oráculo** | La muestra solo lleva la hoja `CB` (un chargeback, el `CHB 2`): `plan.ts` omite los 4 `Refund` de la ventana. El rango I es el instante del cambio de estado de ese chargeback (2026-10-09 11:36:05); 3 refunds cambiaron antes (`missing_previous_to_batch` I = 3) y uno después (fuera de rango, descartado). El oráculo decía 0; se corrige (pregunta 2). |

Datos que el mundo sintético **no** tiene y que se prueban con fixtures unitarios construidos a mano: transacciones `Pending`, batches `undone`, reservas liberadas anticipadamente (`reserveEarlyReleasedAmt > 0`; el seed siempre pone 0), un par `Chargeback` + `CHB 2` del mismo movimiento, un `provider_mismatch` de **otro merchant** (el de `batch-blocked` es de Provider A, mismo merchant que Provider B), faltantes ya registrados, cuentas con canales no principales, y grupos de tres o más apariciones.

## Decisiones de la revisión (antes preguntas abiertas)

Revisadas el 2026-10-17. Aprobadas con la opción por defecto: 1, 3, 5, 6, 7, 9, 10, 11 y 13. Cambiadas: 2, 4, 8 y 12.

1. **Qué filas forman los rangos APP y DEC** — *por defecto*. Por el estado del gateway: APP con las filas E cuya transacción no está `Declined` ni `Pending` (una `Chargeback`/`Refund`/`RDR` nació `Successful`), DEC con las filas E cuya transacción está `Declined`. Es la única lectura que reproduce `batch-issues`.
2. **`legacy-provider` y los refunds omitidos** — *corregir el oráculo*, regenerando **solo** `expected.json`: `pnpm samples:plan` y escritura de los `expected.json` desde `plan.json` con la misma forma que `build-samples.py` (sin ejecutarlo; ningún `.xlsx` cambia), formateados con Biome. `missing_previous_to_batch.I = 3` con sus IDs en `affectedIds.missing_previous_to_batch_I`. Los oráculos de `import-analyze` no cambian.
3. **Filas con `provider_mismatch` en las demás validaciones** — *por defecto*. Solo producen `provider_mismatch`; quedan fuera de las validaciones 2–8 y de los rangos (el import está bloqueado de todos modos, y así ningún hallazgo expone datos de otro proveedor o merchant).
4. **`not_applicable` de las validaciones 1–4** — *cambiada para la 2*. `provider_mismatch`, `duplicate_in_batch` y `status_collision_in_batch` son `not_applicable` si no hay ninguna fila `matched`; `non_recorded_adjustment` (que ahora cubre también `status_mismatch` en E) es `not_applicable` **solo** si no hay ninguna fila `matched` de ningún ciclo.
5. **Grupo con estados mezclados y repetidos** — *por defecto*. Un `duplicate` por cada estado repetido (primera incluida, demás excluidas) y una `collision` por la clave con la primera aparición de cada estado (todas incluidas), para que nada se cuente dos veces.
6. **Varias apariciones históricas e interacción con *in batch*** — *por defecto*. Por clave `(transactionId, cycle)`, un `duplicate_across_batches` si alguna aparición histórica tiene el mismo estado que una actual (actuales con ese estado excluidas) y un `status_collision_across_batches` si alguna tiene estado distinto (actual incluida). Las detecciones *in batch* y *across* son independientes; cómo se combinan las inclusiones de una misma fila en varios hallazgos lo decide el procesamiento (fuera de alcance).
7. **Alcance exacto de la excepción `CHB 2`** — *por defecto*. Se compara por `(estado, excludeAmount)`; solo el par `Chargeback` ↔ `Chargeback`+`excludeAmount` no genera hallazgo (en el batch y contra el histórico, que guarda `SettlementTransaction.excludeAmount`); dos `CHB 2` del mismo movimiento son duplicado; `CHB 2` frente a `Refund` es colisión.
8. **"Ya registradas como faltantes"** — *cambiada*. Cuentan como registrados solo los faltantes persistentes de imports que tienen un `SettlementBatch` `processed` o `paid` (no `undone`). Las transacciones que faltan en imports sin procesar siguen saliendo como faltantes en cualquier corrida (también en una corrida repetida del mismo import). Cuando un batch procesado incluye la transacción, el faltante pasa a `resolved`: es el gancho de #9/#11, fuera de este change.
9. **Canales de la cuenta para las candidatas** — *por defecto*. Canales con `AccountChannel.isPrimary = true` para esta cuenta. Un canal sin asignar que aparece en el import (RAM-13) no aporta candidatas (el oráculo lo confirma: E 10, no 11).
10. **`pendingInRangeCount`** — *por defecto*. Transacciones `Pending` de los canales de la cuenta con fecha de creación dentro del rango APP o del DEC (contadas una vez).
11. **Fecha del evento I** — *por defecto*. Una fila I aporta fecha al rango I solo si el estado actual del gateway es el de la fila; si no (incluida la de `non_recorded_adjustment`, sin cambio de estado), no aporta fecha y el informe la cuenta como `undatedAdjustmentCount` informativo, no como hallazgo.
12. **La "inversa" de `non_recorded_adjustment`** — *cambiada (decisión de negocio 2)*. Una fila E cuya transacción ya pasó a un estado de ciclo I sigue sin ser hallazgo (ronda 1 normal: 3 casos en `batch-clean`). La discrepancia `Declined` ↔ `Successful` en E sí lo es: `status_mismatch`.
13. **Orden de "primera aparición"** — *por defecto*. Orden de subida del archivo, posición de la hoja en el libro y `rowNo`.

## Esquema

Dos migraciones, escritas a mano (`recon_app` no puede crear la shadow database de `migrate dev --create-only`) y aplicadas por la persona:

- `0004_validation_outcome`: cambia dos `CHECK`, `CK_ValidationResult_outcome` (vocabulario nuevo) y `CK_ValidationIssue_issueType` (añade `status_mismatch`) (ver What Changes).
- `0005_conflict_occurrence_unresolved_status`: `ConflictOccurrence.statusId` pasa a `INT NULL`, con la FK `ConflictOccurrence_statusId_fkey` eliminada y recreada con el mismo nombre (decisión de negocio 3).

Ningún otro cambio: `ValidationRun` y `ValidationIssue` (con `CK_ValidationIssue_blocking`, que ya deja `status_mismatch` no bloqueante) ya tienen lo necesario; el estado del gateway de un `status_mismatch` viaja en `detailJson`.

## Fuera de alcance

Persistencia de corridas, resultados, hallazgos y apariciones; caso de uso `RunValidations`; endpoints y OpenAPI; colección Bruno (#9). Pantalla Analysis & Validations (#10). Acciones del analista (cambiar inclusión, resolver NRA). Resolución de faltantes al procesar o deshacer. Rondas y cálculo de fees. Stryker solo si da tiempo (dato en el PR).

## Impact

- **Código nuevo**: `backend/src/modules/validation/{domain,application}/**` y sus tests; `backend/src/modules/validation/test-support/` (entrada de las muestras sobre `buildWorld()`); `packages/shared/src/validation.ts` (+ test).
- **Código modificado**: `packages/shared/src/index.ts` (una línea); `backend/prisma/schema.prisma` (comentarios `///` y `ConflictOccurrence.statusId Int?` con la relación opcional); `backend/prisma/synthetic.ts` (función pura que construye los movimientos históricos de un `BatchPlan`, extraída de `seed.ts` para que seed y tests compartan la regla) y `backend/prisma/seed.ts` (la usa, sin cambiar lo sembrado); `backend/package.json` (`@vitest/coverage-v8` y script `test:coverage`); `data/samples/plan.ts` + `expected.json` de `batch-clean`, `batch-split`, `batch-issues` y `legacy-provider` (commit `fix(samples)` tras la confirmación de la persona); `openspec/specs/validation/spec.md` (al archivar); `README.md` (§1.2, §3.2 `ValidationResult.outcome` y `ValidationIssue.issueType`, §3.3, §6 Ticket 2); `prompts.md`.
- **Migraciones**: `backend/prisma/migrations/0004_validation_outcome/migration.sql` y `backend/prisma/migrations/0005_conflict_occurrence_unresolved_status/migration.sql`.
- **Riesgo de conflicto con `web-import`**: `pnpm-lock.yaml` (dependencia de cobertura), `README.md` (§6 Ticket 2 frente a su Ticket 3, bloques distintos) y `packages/shared/src/index.ts`; ninguno toca `vocabulary.ts`.
- **API**: ninguna (no hay endpoints en este change).
