---
name: austero
description: Checkpoint de estado SDD al inicio de cada turno. Ancla el contexto en sesiones largas. Activa disciplina de tokens y modo austero para el resto de la sesión. Overlay Claude Code — la skill genérica del plugin es el resumen corto en sdd-methodology-plugin/skills/austero.
disable-model-invocation: false
allowed-tools: [Read, Write, Edit, Bash, Task]
---

# Austero — Modo Activo

> **Host overlay (Claude Code).** La skill portable del plugin solo hace el
> checkpoint de una línea. Esta versión añade hábitos, memoria y hooks de
> Claude. Handoff y paths se resuelven desde `sdd.config.yaml`
> (`implementer.entry_command`, `vars.RUTA_PLANNING`).

`[austero ON]`

## Al activar (una vez)

1. **Session resume**: si el hook reportó checkpoints activos (`checkpoint_*.md`), cargarlos antes de cualquier otra acción.
2. **Checkpoint**: 2-3 oraciones — qué se hizo, qué queda, decisiones clave. Si sesión nueva sin checkpoint: `Sesión nueva.`
3. **Auditoría de contexto**: identificar tool outputs grandes ya obsoletos (lecturas viejas, diffs superados). Anotarlos — se compactan primero.
4. **Trabajo restante**: listar qué falta. Si hay tareas independientes → sugerir delegación paralela a subagentes.
5. **Config SDD**: si `sdd.config.yaml` no está en contexto, cargarlo ahora.

## Por el resto de la sesión — hábitos activos

| Hábito | Regla |
|--------|-------|
| Leer archivos | < 100 líneas: entero · 100-500: grep primero, luego slice · > 500: nunca entero |
| Lecturas independientes | Una sola llamada con múltiples Read en paralelo; nunca una por turno |
| No re-leer tras Edit | El harness ya registró el cambio — re-leer es ruido |
| Investigación 3+ lecturas | Subagente Explore; no repetir la búsqueda después |
| Output largo de bash | Pipar con `tail -50` / `head -50` / `grep` / `jq '.campo'`; nunca dump crudo |
| No ecos de archivo | Ir directo al análisis; nunca "aquí está el contenido:" |
| Prosa | Fragmentos, no oraciones completas. "SP sin TRY/CATCH. Agregando." no "He detectado que el SP carece de manejo de errores, por lo que procederé a agregarlo." |
| Respuestas | ≤ 3 oraciones fuera de artefacto; sin preámbulos ni resúmenes de cierre |

## Antipatrones a eliminar

- Re-leer un archivo recién editado
- `cat` de archivos enteros para verificar un valor
- Planes como prosa en la conversación (usar TaskCreate)
- Resúmenes de varios párrafos al final del turno
- Misma búsqueda en 3 turnos seguidos — si volvés al mismo archivo, leíste mal la primera vez
- Pedir confirmación para trabajo reversible (editar un archivo, crear un borrador, correr un script de lectura)

## Modo ultra-corto automático

Desde que austero está activo: respuestas de 1-3 oraciones (o fragmentos) para cualquier explicación que no sea código o artefacto. Priorizar el trabajo sobre explicar lo que se hizo.

**Excepción:** claridad completa para advertencias de seguridad (OWASP, IDOR, secrets expuestos) o acciones irreversibles (DROP, DELETE sin WHERE, rollback de producción). Ahí no se fragmenta.

## Reglas SDD

- No re-leer `sdd.config.yaml` si ya está en contexto — usar los valores ya resueltos
- Antes de iniciar un REQ nuevo: verificar `_graph.md` para detectar colisiones con requerimientos en progreso
- Handoff al implementador al cerrar cada artefacto: usar
  `implementer.entry_command` y la ruta de planning de config
  (p.ej. `Cursor: abre <RUTA_PLANNING>/req-<id>/ y ejecuta /ejecutar`)
- Queries/comandos: verificar con `tools.verify` / MCP test del profile antes
  de incluir en artefacto; anotar evidencia (p.ej. `-- ✓ MCP test`)

## Por turno

**Inicio:** `[REQ · fase · qué queda]`
**Final:** `[REQ · fase · artefactos: generados/total]`

## Al 40% de contexto

1. Escribir checkpoint en memoria usando el template de abajo. Agregar entrada en `MEMORY.md`.
2. Comprimir learnings del profile activo: colapsar entradas individuales de `## Learnings` en reglas destiladas. Ejemplo: 8 filas sobre tipos de fechas → "Fechas: string ISO siempre." Preservar decisiones únicas; eliminar redundancias.
3. Delegar el siguiente paso de exploración a subagente Explore; resultado debe ser un párrafo, no un transcript.
4. Sugerir `/compact` o sesión nueva con el checkpoint como mensaje de arranque.

## Template checkpoint de memoria

Archivo: `memory/checkpoint_<req>.md`

```
---
name: checkpoint-<req>
description: Checkpoint sesión activa REQ-<id> — <título breve>
metadata:
  type: project
---

**REQ**: REQ-<id>
**Fase**: spec / design / delta
**Artefactos**: _index.md ✓ · spec.md ✓ · design.md ⏳
**Próximo paso**: <una oración>
**Decisiones clave**:
- <decisión 1>
- <decisión 2>
```

Entrada en `MEMORY.md`: `- [Checkpoint REQ-<id>](checkpoint_<req>.md) — sesión activa, fase X`

Tras escribir el archivo, marcar el checkpoint como registrado para que el Stop hook no avise:
```powershell
$cp = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId; New-Item "$env:TEMP\cca_checkpoint_$cp.flag" -Force | Out-Null
```
