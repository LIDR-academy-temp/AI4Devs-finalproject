# Proposal — review-inclusion-version

Issue #53 (origen: review-diff de `validation-runs`, PR #52, design D7). Backend, contrato compartido, frontend y colección.

## Why

`POST /imports/{id}/review` exige el `runId` que vio el analista, pero no las inclusiones de esa corrida. Si otro analista cambia una inclusión (`PATCH /conflict-occurrences/{id}`) entre la lectura y la confirmación, el review pasa el import a `validated` con un estado que quien revisa no vio. El cambio queda auditado y `changedOccurrences` lo cuenta, pero la aprobación ya no corresponde a lo que se miró. Es el último hueco aceptado en la decisión de conjunto antes de la entrega del 11 de noviembre.

## What Changes

- **Versión de las inclusiones por corrida.** Cada corrida lleva un contador entero `inclusionVersion`, que empieza en `0` y sube en `1` con cada cambio de inclusión aplicado, en la misma transacción del `PATCH`. Un `PATCH` con el valor que ya tenía la aparición no escribe nada y no la mueve. Una corrida nueva empieza otra vez en `0`.
- **Lectura.** `GET /imports/{id}/validations` (y las respuestas de `POST validations` y `POST review`, que devuelven la misma vista) incluye `run.inclusionVersion`. El detalle del import no cambia: la pantalla toma la corrida de `GET validations`.
- **BREAKING (contrato interno):** `POST /imports/{id}/review` exige `{ runId, inclusionVersion, confirmEmptyBatch? }`. Sin `inclusionVersion`, `400 validation_error`. Los únicos clientes son la pantalla, la colección de Bruno y los tests, y se actualizan en este mismo change.
- **Conflicto.** Si la versión enviada no es la vigente, el review responde `409 inclusions_changed` con `details = { runId, inclusionVersion, currentInclusionVersion }`, el import sigue `analyzed` y no se escribe nada (ni estado ni auditoría). Se comprueba dentro de la transacción del review, bajo el bloqueo del import, en este orden: `import_not_analyzed` → `validation_run_required` → `validation_run_superseded` → **`inclusions_changed`** → `blocking_validation_issue` → `no_matched_rows`.
- **Auditoría.** `import.review` añade `inclusionVersion` (la versión aprobada) a su `detailJson`.
- **Pantalla.** El DecisionBar envía la `inclusionVersion` de la corrida que tiene cargada. Ante `409 inclusions_changed` relee la corrida y el import, avisa en inglés (`The inclusions changed since you loaded them. Check them and continue again.`) y desmarca la casilla del batch vacío. Mientras la corrida se recarga, Continue queda deshabilitado, para que un cambio propio no dé un `409` falso. El fake de MSW guarda la versión, la sube en cada cambio de inclusión y comprueba en el mismo orden que el API.
- **README** §3.3 (decisión de conjunto, auditoría) y §4.4 (filas de `GET validations` y `POST review`) se actualizan; la fila de #53 se queda en la tabla de riesgos aceptados y se marca como hecha en la Entrega 3.

**Fuera de alcance:** las resoluciones a mano (`PATCH /validation-issues/{id}`) no mueven la versión (ver design, D5); `POST /imports/{id}/settlements` no la pide, porque un cambio de inclusión sobre un import `validated` ya lo devuelve a `analyzed` y el procesamiento responde `import_not_validated`; el detalle del import no cambia.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `validation`: la lectura de la corrida devuelve `inclusionVersion`; la decisión de conjunto exige la versión y responde `409 inclusions_changed` (requisito nuevo con la regla, el orden y la auditoría); la pantalla envía la versión y trata el 409.
- `api-collection`: la colección cubre el review con una versión de inclusiones caducada.

## Impact

- **Base de datos:** columna `ValidationRun.inclusionVersion INT NOT NULL DEFAULT 0` con `CHECK (>= 0)`, en una migración escrita a mano, `backend/prisma/migrations/0009_validation_run_inclusion_version`, y el campo en `backend/prisma/schema.prisma` (confirmados en el gate); la migración la aplica la persona.
- **Redespliegue del 10 de noviembre:** `0009` tiene que aplicarse también en el entorno desplegado, con `scripts/deploy.sh migrate`, que ejecuta la persona, antes de levantar el backend nuevo.
- **Shared:** `ValidationRunSummary.inclusionVersion`, `ReviewBody.inclusionVersion`, el código `inclusions_changed` y sus `details`.
- **Backend (`validation`):** guarda pura del review en el dominio, `PrismaValidationRunRepository.setInclusion` (sube la versión) y `review` (la compara y la audita), el fake en memoria, la ruta (descripción OpenAPI) y `docs/openapi.yaml` regenerado.
- **Frontend:** `features/validations/{contract,mutations,DecisionBar,strings}.ts(x)`, `test/msw/validations.ts` y los tests RTL.
- **Bruno:** las peticiones de review de `20-flows` (validations y settlements) envían la versión; un negativo `inclusions_changed` en `batch-issues` y uno `400` en `10-smoke`.
- **Tests de integración** que llaman a `POST review` (`import-flow.ts` y los `validation-*`/`settlement-*`) pasan la versión.
- Rama `feat/review-inclusion-version`, PR hacia `feature/entrega-3-MVP`; cierra #53.
