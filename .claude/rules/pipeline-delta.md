---
paths:
  - "**/delta.md"
  - "**/templates/delta.md"
---

## Pipeline SDD — delta.md

No pedir al usuario que describa qué cambió. Leer `spec.md` + `design.md` +
`impl.md` del TKT y generar el delta comparando lo planeado vs lo implementado.
Si `impl.md` no existe aún, indicarlo y esperar.

Al comparar planeado vs implementado, identificar **learnings**: desvíos
significativos, patrones emergentes o invariantes descubiertos que no estaban
en los profiles. Si existen, incluir al final del `delta.md`:

```md
## Aprendizajes
| Target | Aprendizaje | Acción | Evidencia |
|--------|-------------|--------|-----------|
| <target> | <patrón/invariante descubierto> | → profiles/<target>.md | <verificación / auditor / test citado> |
```

Solo incluir si el aprendizaje es reutilizable en requerimientos futuros. Un
aprendizaje sin evidencia citable no se registra — es una opinión, no un
learning.

Si un aprendizaje es una **decisión técnica con alternativas descartadas**
(no solo un patrón), no va como fila — va en `## Decisiones (ADR)` en formato
MADR (ver `methodology.md`):

```md
## Decisiones (ADR)
### 2026-07-08 — <título de la decisión>
**Target**: `database`
**Contexto**: <problema/situación que forzó decidir>
**Opciones consideradas**: <lista breve>
**Decisión**: <la elegida y por qué>
**Evidencia**: <query MCP / resultado auditor / test citado que respalda la decisión>
**Consecuencias**: <qué queda limitado, pendiente o abierto>
```

## Cierre ARCHIVADO (tras delta.md aprobado)
1. Si `tools.compound_loop` está definido en `sdd.config.yaml`, ejecutarlo
   sustituyendo `{tkt}` y `{date}`. Si no está definido, hacer a mano los
   pasos que describe el bloque abajo.
   El comando automatiza profiles, `_index.md` y `_graph.md`.
2. Entregar instrucción de cierre al implementador (rama → PR → merge).
3. **Limpiar checkpoint**: si existe `memory/checkpoint_<tkt>.md`, eliminarlo y quitar su entrada de `MEMORY.md`.

> **Qué hace el compound loop (`tools.compound_loop`):**
> - Lee `## Aprendizajes` de `delta.md` → append a `profiles/<target>.md` bajo `## Learnings (acumulado)`.
> - Lee `## Decisiones (ADR)` de `delta.md` → append verbatim a `profiles/<target>.md` bajo `## Decisiones (ADR)`.
> - Actualiza `_index.md`: `estado → ARCHIVADO` + `fecha_cierre`.
> - Actualiza `_graph.md`: línea de cierre + `Estado → ARCHIVADO` en sección `### [[TKT-<id>]]`.
> - Solo targets activos. Omite duplicados. No toca `methodology.md`.
