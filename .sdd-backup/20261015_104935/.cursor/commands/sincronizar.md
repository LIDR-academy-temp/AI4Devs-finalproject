﻿# sincronizar

Detecta drift entre el contexto documentado (specs/, sdd.config.yaml) y la
base de datos real. **Solo lee y reporta — no modifica la base.**

Ejecutar periódicamente (sugerido: mensual) o antes de un requerimiento grande.

---

## Objetivo

El source of truth documental envejece (ej: CSV de esquemas quedó 6 meses
desactualizado y le faltaba `wlt`). Este comando compara contra `sys.*` en vivo
y reporta diferencias para corregir la documentación.

---

## Flujo

1. Leer `sdd-toolkit/sdd.config.yaml` → instancias de `database` y sus `schemas`.
2. Por cada instancia, vía MCP (`<MCP_TEST>` / `<MCP_PROD>` según se indique):
   ```sql
   -- Esquemas reales
   SELECT s.name, COUNT(o.object_id) AS objetos
   FROM sys.schemas s
   LEFT JOIN sys.objects o ON o.schema_id = s.schema_id
   WHERE s.schema_id BETWEEN 5 AND 16000
   GROUP BY s.name ORDER BY s.name;
   ```
3. Comparar contra `schemas` + `other_schemas` de la config:
   - Esquema en BD pero no en config → **FALTANTE en config**.
   - Esquema en config pero no en BD → **OBSOLETO en config**.
4. Por cada dominio con `specs/<dominio>.md`: verificar que los objetos listados
   en su tabla "Objetos SQL" existan (`OBJECT_ID('esquema.nombre')`).
   - Objeto en spec pero no en BD → **spec desactualizado**.
5. Detectar esquemas sospechosos de basura (ej. nombre = patrón de requerimiento como
   `TK184247`) → reportar como **candidato a limpieza** (decisión humana).
6. Ejecutar `python sdd-toolkit/tools/sweep_graph.py --days 14` — reporta
   requerimientos estancados (sin cambio de estado en `_index.md` hace más de N días)
   y aprendizajes de `profiles/*.md` que ameritan revisión (mismo objeto
   citado por 2+ requerimientos distintos). Registrar los hallazgos en la tabla de
   "Reporte de drift" de abajo, con `Tipo = ESTANCADO` / `REVISAR-LEARNING`.
7. Regenerar el grafo de código: `python sdd-toolkit/tools/code_graph.py --target all`
   (TKT-CodeGraphSql). No bloquea el resto de `/sincronizar` si falla — solo
   reportar `Tipo = CODE-GRAPH-STALE` con la fecha de la última corrida si no
   se pudo regenerar (ej. sin acceso a `<RUTA_REPO_API>` o a la BD en ese
   momento).
8. Ejecutar `python sdd-toolkit/tools/check_api_drift.py` — simétrico al
   chequeo de esquemas SQL (paso 4), pero para endpoints: verifica que cada
   endpoint documentado en la sección `## Endpoints API` de cualquier
   `specs/<dominio>.md` siga existiendo en `Controllers/` de `<RUTA_REPO_API>`
   con esa misma ruta (normaliza nombres de parámetro — `{id}` vs
   `{EzTextingTemplateID}` no cuenta como drift). **No** audita los ~2600+
   controllers sin documentar — un endpoint sin documentar no es drift, es
   deuda de documentación preexistente, fuera de alcance de este chequeo.
   Registrar cada hallazgo como `Tipo = API-SPEC-OBSOLETO` con el endpoint y
   el archivo `specs/<dominio>.md` que lo cita.
9. Ejecutar `python sdd-toolkit/tools/check_doc_links.py` — chequeo 100%
   local (no toca MCP ni repos externos): la tabla "Índice de guardrails" de
   `.cursor/rules/00_sdd_flujo.mdc` debe tener una fila por cada `.mdc` real
   en `.cursor/rules/`. Registrar como `Tipo = RULES-INDEX-DESYNC`.

---

## Output

```md
### Reporte de drift — <fecha>

| Instancia | Hallazgo | Tipo | Acción sugerida |
|---|---|---|---|
| Nesgo | esquema `X` existe en BD, falta en config | FALTANTE | agregar a sdd.config.yaml |
| <DB_SECUNDARIA> | `TK184247` parece basura de requerimiento | LIMPIEZA | revisar y dropear manualmente |
| specs/ventas.md | `sls.prcGetX` ya no existe | SPEC OBSOLETO | actualizar spec |
| specs/wms.md | `GET Warehouse/CellBonusFactor` no existe en Controllers/ | API-SPEC-OBSOLETO | actualizar specs/wms.md |
| TKT-14930 | 21d sin cambio de estado (`LISTO PARA DISEÑAR`) | ESTANCADO | revisar con el usuario si sigue vigente |
| profiles/database.md | `AchievedPoints` citado por TKT-14977 y TKT-15040 | REVISAR-LEARNING | confirmar si el segundo aprendizaje reemplaza o complementa al primero |

Drift total: N hallazgos. ¿Aplico las correcciones documentales (config/specs)?
```

---

## Invariante de la escalera de decisión (citar, no redefinir)

> El toolchain `.github/` está **deprecado**: solo rige `.cursor/`. Ya no se
> verifica paridad de espejos.

Además del drift contra la BD, verificar que la **escalera de decisión** se cite,
no se redefina: cada archivo de `.cursor/` que la mencione (`08`, `09`, agentes)
debe contener `methodology.md` / `regla 6` y **no** una copia completa de los 5
peldaños. La definición vive SOLO en `sdd-toolkit/core/methodology.md` (regla 6).
Reportar cualquier redefinición como hallazgo `ESCALERA` en el reporte de drift.

---

## Reglas

- **Nunca** ejecutar DDL/DML — solo SELECT contra catálogos del sistema.
- Las correcciones se aplican solo a documentación (config, specs), nunca a la BD.
- Dropear esquemas/objetos basura es SIEMPRE decisión manual del usuario.
- Registrar la corrida en `_sdd_evolution.md` → Changelog (fecha + hallazgos).
- **Cadencia real**: si no quieres acordarte de correr `/sincronizar` manualmente
  (sugerido: mensual), prográmalo con `mcp__scheduled-tasks__create_scheduled_task`
  — no hace falta un scheduler propio del toolkit.
