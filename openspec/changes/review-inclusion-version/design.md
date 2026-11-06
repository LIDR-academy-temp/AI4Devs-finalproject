# Design — review-inclusion-version

## Context

Motivación y alcance en `proposal.md`. El estado actual que condiciona el diseño:

- **El candado del import.** Toda escritura del flujo de validación empieza con un `UPDATE` con guarda sobre `Import` (`PrismaValidationRunRepository`), que retiene el bloqueo exclusivo hasta el commit. `setInclusion` toma la guarda con `claimForInclusion` (analyzed o validated, sin versión) y `review` con `status = 'analyzed'`; los dos leen la corrida vigente después de la guarda. Por eso dos escrituras sobre el mismo import ya se serializan, y lo que una lee después de su guarda no puede cambiar antes de su commit.
- **El review hoy** comprueba, en este orden y bajo el candado: estado (`import_not_analyzed`), corrida vigente (`validation_run_required`), `runId` (`validation_run_superseded`), bloqueo (`blocking_validation_issue`) y batch vacío (`no_matched_rows`, #92). Después escribe `validated` y `import.review` con `runId`, `issueCounts`, `changedOccurrences` y `emptyBatchConfirmed`.
- **`Import.updatedAt`** lo mueven muchas escrituras: la guarda de `setInclusion`, la de `review`, `saveRun` (que además lo usa como versión optimista, con la regla de precisión `datetime2` comentada en `claimForRun`), el mapeo, el análisis, la cancelación y la resolución de filas ambiguas. No está en `ValidationRunView`: la pantalla solo lo tendría por el detalle del import, otra consulta con otro ciclo de caché.
- **El frontend** recibe la corrida de `GET validations` (`validationRunQuery`). Tras un `PATCH` propio, `storeIssue` invalida esa consulta; el detalle del import solo se relee si cambió el estado (`syncImportStatus`). El `DecisionBar` lleva `key = runId`, así que la casilla del batch vacío se desmarca al cambiar de corrida y, explícitamente, ante `no_matched_rows`.
- **El fake de MSW** (`test/msw/validations.ts`) replica el orden de comprobaciones del review del API.

## Goals / Non-Goals

**Goals:**

- Que un review solo pase a `validated` si las inclusiones de la corrida son las que la pantalla tenía cargadas, decidido bajo el mismo candado que ya serializa review y `PATCH`.
- Una guarda pura del review, testeable sin base, que fije el orden de los `409` de la corrida.
- Un falso positivo como mucho (un `409` que se resuelve releyendo), nunca un falso negativo.

**Non-Goals:**

- Fijar las resoluciones a mano o cualquier otro dato de la corrida (D5).
- Pedir la versión en `POST settlements` o en la vista previa.
- Cambiar el detalle del import o el resto de la pantalla.

## Decisions

### D1. La versión es un contador entero por corrida, no el `updatedAt` del import

| | `ValidationRun.inclusionVersion` (contador) | `Import.updatedAt` |
|---|---|---|
| Qué la mueve | Solo un cambio de inclusión aplicado de esa corrida | Cualquier escritura del import: guardas de review, `saveRun`, `setInclusion` (también los `PATCH` sin cambio, que la tocan antes de revertir), mapeo, análisis, cancelación, filas ambiguas |
| Precisión | Entero: igualdad exacta | `datetime2` frente a `Date` de JS (ms): exige la regla de precisión en cada escritor; un escritor que redondee a `datetime` rompe todas las comparaciones |
| Dónde la ve la pantalla | En la corrida que ya tiene (`GET validations`) | En el detalle del import, que hoy no se relee tras un `PATCH` propio: cada cambio propio daría un `409` falso hasta recargar |
| Corrida nueva | Empieza en `0` con ella; el `runId` ya distingue corridas | Sigue el import, no la corrida |
| Esquema | Columna nueva (migración `0009`) | Ninguno |
| Semántica del error | "Cambiaron las inclusiones": se puede decir con precisión | "Cambió algo del import": el mensaje tendría que ser genérico |

**Decisión: el contador.** Mide exactamente lo que el review aprueba, no depende de la precisión de las fechas, no lo mueven otras escrituras del import y la pantalla ya lo tiene en la consulta que usa para decidir. El coste es una columna y una migración pequeña, sin datos que migrar.

**Alternativas descartadas también:** derivar la versión del número de `validation.occurrence.set_inclusion` de la corrida en `AuditLog` (sin migración, pero exige `JSON_VALUE` sobre `detailJson` sin índice y ata la regla al formato de la auditoría); `MAX(changedAt)` de las apariciones (vuelve a depender de la precisión y no cambia si se repite el instante); un hash de todas las inclusiones enviado por la pantalla (detecta incluso el ida y vuelta, pero obliga a calcularlo igual en tres sitios y a leer todas las apariciones en cada review).

### D2. Columna en `ValidationRun`, escrita a mano

`ValidationRun.inclusionVersion INT NOT NULL` con default `0` y `CHECK ([inclusionVersion] >= 0)`, en `0009_validation_run_inclusion_version`, con el mismo esqueleto `BEGIN TRY / TRAN` que `0008` y los nombres de restricción de `0006` (`ValidationRun_inclusionVersion_df`, `CK_ValidationRun_inclusionVersion`). En `schema.prisma`, `inclusionVersion Int @default(0)` con un comentario de una línea. Se genera el cliente; la migración no se genera desde el esquema (CLAUDE.md). Las corridas existentes quedan en `0`: la versión solo tiene que cambiar respecto de la que se leyó, no contar la historia.

Va en la corrida, no en el import: una corrida nueva empieza con sus inclusiones por defecto (P6) y su propio contador, y P7 (corrida superada sin sustituta) no necesita tocarlo.

### D3. Sube dentro de la transacción del `PATCH`, después de escribir la aparición

En `setInclusion`, justo tras el `update` de `ConflictOccurrence` y antes de la auditoría: `tx.validationRun.update({ where: { runId }, data: { inclusionVersion: { increment: 1 } } })`. Como va después de la guarda del import, el review y el `PATCH` se serializan por el candado de `Import`: el review lee la versión ya confirmada o espera. El `PATCH` sin cambio sigue revirtiendo la transacción entera (`NO_CHANGE`), así que no la mueve. La auditoría de la inclusión añade la versión resultante (`inclusionVersion`) para poder seguir la secuencia.

Un ida y vuelta (A → B → A) deja la versión en `2` aunque el estado sea el inicial: el review con `0` recibe `409`. Es conservador a propósito (D1, objetivo de "como mucho un falso positivo").

### D4. Guarda pura del review y orden de los `409`

Nueva función de dominio `reviewRefusal(request, current)` en `validation/domain/review-guard.ts`:

- `request = { runId, inclusionVersion }`, `current = { runId, inclusionVersion, blockedCodes } | null`.
- Devuelve la primera negativa o `null`: `run_required` → `run_superseded` (con `currentRunId`) → `inclusions_changed` (con `currentInclusionVersion`) → `blocked` (con los códigos en el orden de `ValidationCode`).

El repositorio la llama bajo el candado, después de la guarda de estado (`import_not_analyzed`, que no depende de la corrida), y traduce la negativa a su `DomainError`; los `issueIds` del bloqueo solo se consultan si la negativa es `blocked`. `no_matched_rows` sigue después y fuera de la función, porque necesita cargar los hechos del batch (`loadEmptyBatchFacts`) y no hace falta si ya hay otra negativa.

**Por qué este orden.** Primero lo que dice que la pantalla está desfasada, de lo más grueso a lo más fino (la corrida, luego sus inclusiones); después las reglas del contenido (bloqueo y batch vacío). Así un `409` de contenido se da siempre sobre lo que el analista vio. El caso de los dos a la vez es raro (una corrida bloqueada no habilita Continue en la pantalla), y el bloqueo no depende de las inclusiones: tras releer, el analista verá el bloqueo igual.

### D5. Las resoluciones a mano no mueven la versión (fuera de alcance)

`PATCH /validation-issues/{id}` no cambia qué se liquida, hoy no toma el candado del import ni invalida una revisión, y el issue habla de inclusiones. Hacer que cuente cambiaría la semántica de `resolveIssue` (guarda, invalidación) y el nombre del campo. Decisión del gate: queda fuera de alcance, sin issue de seguimiento. `manualChangeCount` sigue sumando las dos cosas, como hasta ahora.

### D6. Código `inclusions_changed`

Nombre: `inclusions_changed` (`409`), mensaje `The inclusions of the run changed since they were read; review them again`, `details = { runId, inclusionVersion, currentInclusionVersion }`. Describe lo que pasó, con la misma forma que `import_changed`. Descartados: `inclusion_version_mismatch` (habla del mecanismo, no del hecho) y `stale_inclusions` (no sigue el patrón sujeto + verbo de los demás). Clase `InclusionsChangedError` en `validation/application/errors.ts`; el tipo de `details` se añade al mapa `ErrorDetails` del contrato compartido.

### D7. Campo obligatorio en el cuerpo

`ReviewBody = { runId, inclusionVersion: entero >= 0, confirmEmptyBatch? }`, estricto. Opcional dejaría el hueco abierto para cualquier cliente que lo olvide. `ValidationRunSummary.inclusionVersion: entero >= 0`. Se exporta `docs/openapi.yaml` y se regeneran los tipos del frontend (`openapi:check` en CI).

### D8. Auditoría

`import.review` añade `inclusionVersion` (la aprobada, igual a la vigente) a su `detailJson`, junto a `runId` y `changedOccurrences`. Con eso, la auditoría responde a "qué aprobó exactamente": la corrida y la versión, y las `set_inclusion` de esa corrida hasta esa versión.

### D9. Pantalla

- `reviewImport(importId, runId, inclusionVersion, confirmEmptyBatch)` y `useReview().review(run, confirm)` toman la versión de la corrida mostrada (`view.run.inclusionVersion`).
- Ante `409 inclusions_changed`: el mensaje `The inclusions changed since you loaded them. Check them and continue again.` en la zona `aria-live` del DecisionBar, la relectura de corrida e import que ya hace `useReview` para todo `409`, y el DecisionBar desmarca la casilla del batch vacío igual que con `no_matched_rows` (la `key` por `runId` no cambia, porque la corrida es la misma). El siguiente clic usa la versión releída.
- Descartado: `key = runId:inclusionVersion`. Desmarcaría la casilla también tras cada cambio propio del analista, que sí lo ha visto.
- **Continue espera a la relectura.** Mientras la consulta de la corrida se recarga (`isFetching` de `validationRunQuery`, por ejemplo tras el `PATCH` propio que invalida `storeIssue`), Continue queda deshabilitado, con el motivo `Loading the latest results…` asociado al botón. Así el cambio propio del analista no puede dar un `409` falso: el clic siempre envía la versión ya releída.

### D10. Fake de MSW

La corrida del fake guarda `inclusionVersion` (0 al crearla o sembrarla, con opción de sembrarla), el handler de inclusión la sube solo cuando el valor cambia, `viewOf` la devuelve y el handler de review valida el cuerpo (`400` sin ella) y comprueba en el orden de D4. El fake no decide reglas: solo compara la versión que guarda; un test puede forzar el caso de otro analista sembrando una versión mayor (`bumpInclusionVersion(importId)` o la opción de siembra).

## Risks / Trade-offs

- **Falso `409` tras un cambio propio** → Entre la respuesta del `PATCH` y la relectura de la corrida (que `storeIssue` ya lanza) Continue enviaría la versión vieja. Mitigado en D9: Continue queda deshabilitado mientras la corrida se recarga. Coste: un instante de botón deshabilitado en cada relectura en segundo plano (foco de ventana incluido).
- **Ida y vuelta da `409`** → Conservador a propósito (D3).
- **Cambio de contrato obligatorio** → Backend, frontend y colección se despliegan juntos (mismo Compose); no hay clientes externos.
- **Integración y Bruno sobre base compartida** → No se ejecutan hasta que la persona dé turno; los tests de integración se escriben, pero se ejecutan después (y tras `pnpm db:seed` si Bruno ensució la base).

## Migration Plan

1. La persona confirma el cambio de esquema (este gate) y, cuando le toque, aplica `0009` con `! pnpm db:migrate` en la base local.
2. La columna tiene default: un backend anterior funciona con la base migrada. El orden de despliegue es migrar y luego levantar el backend y el frontend nuevos (`scripts/deploy.sh migrate` lo ejecuta la persona).
3. **Rollback:** desplegar la versión anterior; la columna puede quedarse (default `0`). Si hay que quitarla, una migración `0010` que suelte `CK_ValidationRun_inclusionVersion`, `ValidationRun_inclusionVersion_df` y la columna.
