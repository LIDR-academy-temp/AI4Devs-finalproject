---
paths:
  - "**/design.md"
  - "**/templates/design.md"
---

## Pipeline SDD — design.md

1. Antes de escribir: leer el **profile del target en scope** (rutas en
   `sdd.config.yaml` → `targets.*.profile`) y aplicar sus convenciones.
   Cargar **solo** el profile del target activo del requerimiento — no todos.
   No asumir un target concreto (database/backend/…) si no está en scope.

2. **Reflection loop de verificación** (antes de incluir cualquier SQL):
   - Si hay queries SQL y `vars.MCP_TEST` está definido: ejecutar contra
     `mcp__<MCP_TEST>__execute_sql`. Si falla: corregir y re-ejecutar hasta que
     pase. Anotar: `-- ✓ MCP [<entorno>] → <N filas o resultado>`
     (ejemplo: `-- ✓ MCP [nesgotest] → 5 filas`). El hook `check-mcp-test.ps1`
     bloquea Write/Edit de `design.md` si detecta un bloque ` ```sql ` sin esa
     anotación estructurada.
   - Otros stacks: usar el runner declarado en `tools.verify` / el profile.
   - La ausencia de la anotación `-- ✓ MCP` es señal de SQL no verificado —
     no incluir nunca SQL sin haber ejecutado el loop completo.

3. Tras identificar objetos finales del requerimiento: si `tools.graph_query` está en
   `sdd.config.yaml`, ejecutarlo con `{query}` = esos objetos.
   Si hay requerimientos `En progreso` que toquen los mismos objetos, agregar
   advertencia `⚠ Conflicto potencial` en design.md.

4. Antes de cerrar design.md: aplicar poke-holes de seguridad (methodology.md)
   sobre el propio diseño — no darlo por completo solo porque "parece
   correcto". Preguntas mínimas por objeto/endpoint propuesto:
   - ¿Hay concatenación dinámica de entrada en vez de parámetros? → inyección.
   - ¿El handler valida ownership/tenant del recurso, o solo el ID? → IDOR.
   - ¿La respuesta expone campos que el rol que llama no debería ver?
   - ¿Falta un check de permiso/rol que el flujo existente sí tenía (revisar
     invariantes)?

5. Si el requerimiento toca >2 objetos/instancias o **cruza más de un target**: incluir
   el diagrama Mermaid de "Diagrama de flujo" (template). Un solo objeto o un
   solo endpoint: omitir — no diagramar por costumbre.
