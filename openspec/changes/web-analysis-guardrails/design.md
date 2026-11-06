# Design

## Context

Ver proposal.md, "Why". Estado actual, leído en el código:

- `Counters.tsx` pinta cinco tarjetas y la de ciclos; `Unmatched` y `Ambiguous` se resaltan y enlazan al filtro de la tabla. No lee `unmatchedByReason` ni `likelyWrongAccount`.
- `ChannelNotice.tsx` filtra `assignment !== 'assigned'` y describe cada canal por su `assignment`. No lee `otherProvider`. Como el API ya manda la `note` de canal ajeno, hoy un canal de otro proveedor sale con la nota correcta pero con el texto `RAM-01 is primary in ProviderA-USD` o `is not assigned yet`, que sugieren que procesar lo va a asociar.
- El texto de cuenta equivocada existe dos veces fuera de esta carpeta, y no son iguales:
  - `features/settlements/strings.ts` (`emptyBatch.wrongAccount`): `The IDs do not fit any gateway of this account: the files may belong to another account.`
  - `features/validations/strings.ts` (`decision.emptyBatch.wrongAccount`): la misma frase más `Cancel and reprocess under the right account.`
- El `DecisionBar` está en la misma pantalla (dentro de `ValidationsSection`), pero solo pinta su aviso con `analyzed`, permiso `import.process`, corrida no bloqueada y batch vacío.
- El análisis falso (`test/msw/imports.ts` → `analyze`) copia `facts.channels` de `import-fixtures.ts` sin `otherProvider`; RAM-01 de `batch-blocked` sale con la nota de "pasará a ser la principal", y el test de "Formas ocultas" construye un canal `outOfScope` sin `otherProvider` y con `note: null`. Desde #135 el API ya no puede devolver ninguna de las dos cosas (`backend/src/modules/imports/domain/channel-notice.ts`).
- Las tablas de filas se miden con el script de capturas, que falla si la página o una tabla se desbordan (#132).

## Goals / Non-Goals

**Goals:**
- Que el paso Analysis explique por sí solo por qué no se asoció nada y si el archivo parece de otra cuenta, también a quien no puede continuar.
- Que los fakes del frontend vuelvan a devolver solo lo que el API real puede devolver.

**Non-Goals:**
- Unificar los textos de cuenta equivocada en un módulo común: obligaría a tocar `features/validations` y `features/settlements` (#53).
- Corregir el caso `assigned_to_other_account` con `otherAccount = null` del mismo proveedor: fuera de alcance, en el #140.

## Decisions

**D1. El desglose va dentro de la tarjeta `Unmatched`.** Debajo del número y antes del enlace `Show unmatched rows`, una lista (`<ul aria-label="Unmatched by reason">`) con un `<li>` por motivo mayor que cero: etiqueta y número. Las etiquetas se reutilizan de `strings.analysis.rows.reasons`, las mismas que la columna de resultado de la tabla. Así la persona ve la misma palabra arriba y en las filas, y no hay un segundo juego de textos. El orden es fijo (`no_match`, `id_format`, `lossy_numeric_id`, `no_gateways`) y no por cantidad, para que no cambie de un import a otro. Alternativa descartada: una tarjeta por motivo, porque añade hasta cuatro tarjetas a una fila que ya se parte a 1024 px, y casi siempre estarían a 0.

**D2. El aviso de cuenta equivocada usa la frase de Settlement Review, en una copia en `imports/strings.ts`.** Texto: `The IDs do not fit any gateway of this account: the files may belong to another account.`, igual que `settlements/strings.ts`, y es también la primera frase del `DecisionBar`. No se añade `Cancel and reprocess under the right account.`, porque en Analysis lo leen también `viewer` (no puede cancelar) e imports ya `cancelled` o `processed`, donde esa instrucción no aplica. La acción la sigue dando el `DecisionBar` a quien puede tomarla. Se copia en vez de importarse de `features/settlements`, para no acoplar `imports` a un módulo que está cambiando en el #53. Un test de `Counters` compara el texto con la cadena literal, así que si alguien cambia una copia, el test lo dice. Unificar las tres copias queda como seguimiento en el #139, después del #53.

El aviso es una `<section aria-label="Wrong account?">` ámbar, entre los contadores y el aviso de canales, dentro de `Counters` (la propia tarjeta de `Unmatched` sigue resaltada). Con `analyst` en un import `analyzed` se ve dos veces en la pantalla: arriba como diagnóstico y abajo, en el `DecisionBar`, junto a la casilla de confirmación. Se acepta, porque están separados por las advertencias y las validaciones, y cada uno responde a una pregunta distinta (qué pasa y qué hago).

**D3. Un canal de otro proveedor se describe por su proveedor, no por su asignación.** En `ChannelNotice` cambian dos cosas:
- el filtro pasa a ser `otherProvider === true || assignment !== 'assigned'`;
- `describe()` mira primero `otherProvider`: un canal `outOfScope` sigue siendo `Channel <id> (another merchant)` (ya dice que no es de aquí), y uno con nombre pasa a `<canal> belongs to another provider`.

La `note` se pinta tal cual llega, como hoy: es el API quien garantiza que no dice "pasará a ser la principal". El canal de otro proveedor se marca además con `data-other-provider` en su `<li>`, para que el test lo encuentre sin depender del texto. No hay otro tratamiento visual: el aviso entero ya es ámbar. Alternativa descartada: una sección aparte "Channels of another provider". Separaría canales que el API entrega ordenados por `channelId`, y en la práctica un import con canal ajeno ya está bloqueado por `provider_mismatch`, que la sección de validaciones explica justo debajo.

**D4. `primaryElsewhere` se queda como respaldo.** Con D3, la forma `is primary in an account of another merchant` solo podría salir para un canal del mismo proveedor cuya principal sea de otro merchant, cosa que la jerarquía no permite (un proveedor es de un merchant). El tipo generado sí la admite (`otherAccount.name: string | null`), así que la rama se mantiene para no pintar `null`, sin test propio y sin escenario. El escenario "Formas ocultas" de la spec pasa a cubrir solo el canal oculto, que el API marca siempre con `otherProvider`.

**D5. El fake calcula `otherProvider` como el API, en un solo sitio.** El cambio en `test/msw/imports.ts` se limita a eso (el #53 toca el mismo archivo): sin reordenar ni reformatear el resto, y un conflicto se resuelve fusionando `feature/entrega-3-MVP` en la rama, sin rebase. En `analyze()` de `test/msw/imports.ts`, después de tomar `facts.channels`, cada canal con `outOfScope` o con `providerId` distinto del de la cuenta del import recibe `otherProvider: true` y la nota de canal ajeno (constante `OTHER_PROVIDER_NOTE` en `import-fixtures.ts`, con el texto exacto del backend). Así RAM-01 de `batch-blocked` sale como en el escenario de la spec del API, y `legacy-provider` sembrado en `ProviderA-USD` también. Los fixtures escritos a mano en `AnalysisStep.test.tsx` se corrigen (canal oculto con `otherProvider` y nota; RAM-03 con la nota de cuenta principal). El test "does not appear when every channel is assigned" pasa a sembrar `legacy-provider` en su propia cuenta, `ProviderC-Alt`, porque en `ProviderA-USD` su canal es de otro proveedor y el aviso aparece.

**D6. Los tests asertan el elemento exacto.** jsdom no calcula el layout, así que no se comprueba "dentro de la tarjeta" midiendo, sino por la estructura:
- el desglose está dentro de `section[aria-label="Unmatched"]` (`within`), con `getAllByRole('listitem')` en orden;
- el aviso de cuenta equivocada es `getByRole('region', { name: 'Wrong account?' })`, con el texto exacto;
- cada canal es su `listitem`, con `toHaveTextContent` sobre ese `<li>`.

El caso `batch-wrong-account` se monta con `seedImport('batch-clean', { unmatched: 'id_format' })`, igual que `features/validations/empty-batch.test.tsx`: el fake no tiene ese libro y daría 780 filas en vez de 12. El test aserta que el motivo vale lo mismo que `Unmatched`, no el 12; el 12 de `expected.json` se comprueba en las capturas, contra el API real. El caso de varios motivos cambia el `reason` de una fila del registro falso, y el resumen se recalcula desde las filas, como en el API.

**D7. Capturas.** Un script nuevo, `e2e/screenshots/web-analysis-guardrails.ts`, con las mismas protecciones que `web-ambiguous-rows.ts`: contraseña desde el `.env` raíz puesta desde la página, sin traza ni vídeo, y medida de desborde de la página y de cada tabla, incluida la de filas (#132). Como `analyst`, a través de las pantallas:
1. `batch-wrong-account` en `ProviderA-USD`: subir, confirmar el pareo, analizar. Captura del paso Analysis con el desglose (`ID does not fit any gateway 12`) y el aviso de cuenta equivocada, y otra con la tabla de filas a la vista.
2. `batch-blocked` en `ProviderB-Main`: subir, confirmar, analizar. Captura del aviso de canales con `RAM-01 belongs to another provider`.

Cada pantalla se captura a 1280×900 y a 1024×768, en total seis capturas en `docs/wireframes/web-analysis-guardrails/`. Ninguno de los dos imports se valida ni se procesa (no consumen números de batch), y al final se cancelan los dos con un motivo, para poder repetir sin sembrar. No se usa `batch-clean` (#111). Solo se ejecuta con turno de base de la persona.

## Risks / Trade-offs

- [El fake se comparte con los tests de `features/validations` y `features/settlements`; D5 cambia la nota de RAM-01 y los canales de `legacy-provider` fuera de su cuenta.] → Se corre la suite entera del frontend tras D5. Si falla un test de esas carpetas, se para y se avisa, sin tocarlo.
- [Tres copias del texto de cuenta equivocada.] → Test literal en `Counters` y el #139 para unificarlas después del #53.
- [La tarjeta `Unmatched` crece con etiquetas largas (`ID does not fit any gateway`), y la fila de tarjetas se parte antes.] → Se comprueba en las capturas a 1024 px. Las tarjetas ya hacen `flex-wrap`, así que no hay desborde, solo una línea más.
- [Un canal de otro proveedor `assigned` aparece ahora en el aviso, cuando antes se escondía.] → Es lo que pide la spec, porque sus filas no se procesan en esta cuenta. Lo cubre el escenario "Canal de otro proveedor asignado".
