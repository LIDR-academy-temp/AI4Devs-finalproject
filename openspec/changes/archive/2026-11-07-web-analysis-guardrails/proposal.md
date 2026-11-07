# Proposal

## Why

`import-guardrails` (#92, PR #135) ya devuelve en `GET /imports/{id}` el desglose de las filas no asociadas, el indicio de cuenta equivocada y la marca de canal de otro proveedor. Pero el paso Analysis solo los usa a medias: el contador `Unmatched` no dice por qué, el aviso "¿cuenta equivocada?" solo aparece en el `DecisionBar` (y únicamente para quien puede continuar) y en Settlement Review, y un canal de otro proveedor se lee como si fuera a asociarse a esta cuenta. Es el #131, pendiente porque `web-ambiguous-rows` estaba editando la misma carpeta.

## What Changes

- **Contadores**: con `Unmatched` mayor que cero, la tarjeta desglosa `analysis.rows.unmatchedByReason` (`no_match`, `id_format`, `lossy_numeric_id`, `no_gateways`) con las mismas etiquetas en inglés que la tabla de filas; los motivos en 0 no aparecen.
- **Aviso de cuenta equivocada**: con `analysis.likelyWrongAccount = true`, el paso Analysis muestra junto a los contadores el mismo texto que Settlement Review, a cualquier usuario y en cualquier estado del import analizado.
- **Aviso de canales**: un canal con `otherProvider: true` se muestra como de otro proveedor, sea cual sea su `assignment`, con su `note`, y nunca con un texto que diga que se asociará a esta cuenta o que esta pasará a ser su principal. Los canales del proveedor de la cuenta siguen como hasta ahora.
- **Fakes de MSW**: el análisis falso marca `otherProvider` y la `note` de canal ajeno como el API real (mismo proveedor que la cuenta o no), y los fixtures del aviso dejan de devolver combinaciones que el API ya no puede dar.
- **Tabla de filas**: un ID con guiones (UUID) puede partirse, solo después de cada guion; uno sin guiones sigue sin partirse. Lo destapó la primera pasada de capturas con `batch-wrong-account`, cuyos IDs UUID hacían desbordar la tabla a 1024 px (#132).
- **Tests RTL** de `Counters` y `ChannelNotice`, y **capturas** a 1280 y 1024 px con `batch-wrong-account` y `batch-blocked`, comprobando que la tabla de filas no vuelve a desbordarse (#132).

Fuera de alcance: `features/validations` y `features/settlements` (los toca el #53), el backend, el contrato y la colección Bruno.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `import`: el requisito "Resultado del análisis: aviso de canales" se limita a los canales del proveedor de la cuenta; se añaden "Resultado del análisis: filas sin asociar por motivo", "Resultado del análisis: aviso de cuenta equivocada", "Resultado del análisis: canal de otro proveedor" y "Resultado del análisis: ID con guiones en la tabla de filas".

## Impact

- `frontend/src/features/imports/analysis/Counters.tsx`, `ChannelNotice.tsx` y sus tests nuevos; `RowsTable.tsx` y `RowsTable.test.tsx` (ID con guiones); `AnalysisStep.test.tsx` (los casos del aviso de canales que cambian).
- `frontend/src/features/imports/strings.ts` (textos nuevos en `analysis.counters` y `analysis.channels`).
- `frontend/src/test/msw/imports.ts` y `import-fixtures.ts` (el fake comparte esos módulos con los tests de validaciones y settlements: se corre la suite entera del frontend).
- `e2e/screenshots/web-analysis-guardrails.ts` nuevo, su script en `e2e/package.json` y en el `package.json` raíz, y `docs/wireframes/` con las capturas.
- Sin cambios de API, esquema, migraciones ni seed.
