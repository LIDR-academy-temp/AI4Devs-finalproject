---
paths:
  - "**/spec.md"
  - "**/templates/spec.md"
---

## Pipeline SDD — spec.md

<important if="el requerimiento es Tipo: Bug Fix">
Antes de escribir `Contexto / problema` ni el CA-1 `[M]`: correr las 4 fases
de "Investigación sistemática de causa raíz" (methodology.md). No narrar una
causa raíz sin la evidencia de la fase 3 (verificación MCP / log / repro que
la confirma). Si tras 2 hipótesis descartadas no hay causa raíz confirmada,
proponer reclasificar el requerimiento a `Tipo: Spike` en vez de forzar el spec.md.
</important>

0. **Intake en 3 fases antes de generar** (methodology.md — "Intake de requerimiento en 3 fases"):
   - Fase 1 Discovery: confirmar tipo + síntoma.
   - Fase 2 Deep dive: identificar targets/instancias + objetos MCP + invariantes.
   - Fase 3 Confirm: proponer MoSCoW → usuario valida Must.
   Si el usuario provee todo en el primer mensaje: comprimir en validación rápida
   de los 3 puntos antes de generar. No escribir spec.md con Must sin validar.

1. Generar/actualizar `_index.md` del TKT (hub del requerimiento: estado, tipo,
   instancias en scope, decisión estándar/extendida, requerimientos futuros sugeridos).
   `_index.md` es `generated_by: context-generator` y debe existir antes de handoff.
2. Auto-crear `vars.RUTA_SPECS/<TKT>/` si no existe antes de escribir nada.
3. Antes de escribir: identificar objetos/módulos del requerimiento (según targets en
   scope) y, si `tools.graph_query` está en `sdd.config.yaml`, ejecutarlo con
   `{query}` = esos objetos. Si hay colisiones, incluir sección
   `## TKTs relacionados` con el output.
4. Al terminar spec.md: hacer append a `_graph.md` con dos cosas:
   a. Fila en la tabla de requerimientos (columnas: Requerimiento · Dominio · Estado · Artefactos · Contexto).
   b. Sección detallada al final del archivo:
      ```
      ### [[TKT-<id>]]: <titulo>
      - **Estado**: En progreso
      - **Dominios**: [[dom1]], [[dom2]]
      - **Objetos clave**: `obj1`, `obj2`
      - **Patrones**: <patrón principal identificado>
      - **Relacionado con**: [[TKT-X]]
      ---
      ```
