# delta.md — TKT-<id>: <título>

> Generado por: **generador de contexto SDD** al archivar (con el impl.md del implementador como insumo)
> Consumido por: agentes de cierre del implementador (`implementer.tool`) y el knowledge graph

## Resumen del cambio

<Qué se construyó, en 2-4 líneas.>

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|

## Invariantes verificados

<!-- Una fila por invariante de spec.md: confirmar que su test de regresión pasó.
     Si algún TC-INV-x falló, el requerimiento NO se archiva. -->
| Invariante | Test | Resultado |
|---|---|---|
| INV-1 | `TC-INV-1` | ✅ / ❌ |

## Desviaciones vs design.md

<!-- Qué cambió durante la implementación y por qué. "Ninguna" si aplica. -->

## Specs de dominio a actualizar

- `specs/<dominio>.md` → <qué sección actualizar>

## Actualización de _graph.md

- TKT-<id> relacionado con: <TKTs, patrones>

## Aprendizajes

<!-- Compound Loop (si sdd.config.yaml declara tools.compound_loop): el generador
     hace append de estas filas a profiles/<target>.md al archivar. Omitir sección
     si no hay aprendizajes reutilizables en requerimientos futuros. Si el aprendizaje
     es una decisión con alternativas descartadas, NO va aquí como fila — va en
     "## Decisiones (ADR)" abajo (methodology.md).
     Evidencia: cita concreta que respalda el aprendizaje — output de verificación
     (MCP/test), resultado de auditoría, o referencia a impl.md. Sin evidencia
     citable, el aprendizaje no se registra (es una opinión, no un learning). -->
| Target | Aprendizaje | Acción | Evidencia |
|--------|-------------|--------|-----------|
| — | — | — | — |

## Decisiones (ADR)

<!-- Solo si hubo una decisión con alternativas descartadas (ver methodology.md). -->

<!--
### <fecha> — <título de la decisión>
**Target**: `<target>`
**Contexto**: <problema que forzó decidir>
**Opciones consideradas**: <lista breve>
**Decisión**: <la elegida y por qué>
**Evidencia**: <query MCP / resultado auditor / test citado que respalda la decisión>
**Consecuencias**: <qué queda limitado o abierto>
-->

## Ronda N — <título addon/corrección> (reopen <fecha>)

<!--
  Usar esta sección cuando el REQ reabre post-ARCHIVADO con trabajo adicional.
  - El hub permanece en LISTO PARA PR hasta que esta sección esté completa.
  - No ARCHIVAR el hub hasta que el delta consolidado incluya todas las rondas.
  - Una sección por cada reopen; incrementar N (Ronda 2, Ronda 3…).
-->

### Objetos afectados en esta ronda

| Target:Instancia | Objeto | Acción |
|---|---|---|

### Desviaciones vs correcciones-<fecha>.md

<!-- "Ninguna" si aplica. -->

### Aprendizajes de esta ronda

| Target | Aprendizaje | Acción | Evidencia |
|--------|-------------|--------|-----------|

---

## Quick Checks — antes del cierre (ARCHIVADO)

<!-- Un ✗ bloquea el cierre. Correr antes de archivar el requerimiento. -->
- [ ] Todo Aprendizaje tiene evidencia citable (MCP/test/auditor) — sin evidencia no se registra
- [ ] Toda Decisión (ADR) tiene opciones descartadas documentadas — no solo la elegida
- [ ] Desviaciones vs design.md documentadas — "Ninguna" solo si aplica de verdad
- [ ] Invariantes verificados: todo TC-INV-x con resultado ✅ — ningún ❌ sin escalación previa
- [ ] Resumen del cambio: actor real nombrado — sin "el sistema construyó X"
- [ ] Presupuesto de cambio respetado: cambio total ≤ 400 líneas — si se excedió, la excepción está documentada en "Desviaciones vs design.md"
