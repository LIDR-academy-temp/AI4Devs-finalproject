---
paths:
  - "**/release.md"
  - "**/templates/release.md"
---

## Pipeline SDD — release.md

`release.md` es **bitácora operativa de despliegue**, no un estado del ciclo SDD.
El ciclo de planificación cierra en `ARCHIVADO` (vía `delta.md` +
`tools.compound_loop` si está en config);
el despliegue a ambientes se rastrea aquí, después del archivado.

1. **Generar el esqueleto junto con `delta.md`** (mismo turno de cierre). El
   generador de contexto llena solo lo derivable de `design.md`/`delta.md`:
   - "Piezas a desplegar" en el orden de dependencia que indiquen los profiles
     de targets en scope (p.ej. datos antes de API si aplica).
   - "Rollback ejecutable" copiado de la estrategia de rollback de `design.md`,
     ajustado a lo realmente implementado (fuente: `impl.md`).
2. **No inventar fechas, ambientes ni resultados de smoke test**: esas filas las
   llena quien ejecuta cada deploy. Dejar las celdas vacías, no `(asumido)`.
3. Smoke test / rollback incluidos aquí siguen la misma regla que `design.md`:
   verificados con `tools.verify` / MCP del profile cuando aplique (si hay SQL:
   `mcp__<MCP_TEST>__execute_sql`, anotado `-- ✓ MCP test`).
4. Un requerimiento **no está operativamente cerrado** hasta que la bitácora refleja PROD
   (o se registra la decisión explícita de no desplegar). El estado `ARCHIVADO` del
   SDD y el despliegue en PROD son eventos distintos — no confundirlos.
