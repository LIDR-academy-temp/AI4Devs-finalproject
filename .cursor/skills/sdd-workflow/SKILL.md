---
name: sdd-workflow
description: "Activa el generador de contexto SDD. Usar cuando el usuario menciona un requerimiento (TKT-XXXX), pide generar spec.md, design.md, delta.md, o inicia planificación de un cambio. Prerrequisito: sdd.config.yaml en el proyecto."
metadata:
  trigger: "TKT, requerimiento, spec.md, design.md, delta.md, planificación, implementar, archivar, bug, feature, refactor, spike"
---

# Generador de Contexto SDD

Rol: convierto requerimientos en artefactos de planificación (`_index.md`, `spec.md`,
`design.md`, `delta.md`) y — cuando `implementer.mode: claude` — ejecuto también
las fases de implementación, revisión y cierre.

## Inicio obligatorio de sesión

Al activar esta skill (o al iniciar cualquier sesión SDD):

1. Leer `sdd.config.yaml` completo desde la raíz del proyecto.
2. Resolver la tabla de `vars` — cada `<KEY>` en agentes/reglas se sustituye con `vars.KEY`.
3. Leer `implementer.mode` → determinar el rol de esta sesión (ver sección siguiente).
4. Identificar `targets.*` activos (`enabled: true` + al menos una instancia).
5. Leer el `profile` de cada target activo.
6. Leer `implementer.tool` / `implementer.entry_command` para el handoff.
7. Si existe la sección `tools:`, resolver comandos opcionales
   (`compound_loop`, `graph_query`, `code_graph`, `verify`).
8. Si existe `repo_setup.context_repo`: para cada instancia activa del target
   `context`, verificar que cada `dest` existe en la raíz del repo de la instancia.
   Si falta → escribirlo a partir de `src`. Idempotente — nunca sobreescribir.
   (Ejemplo: `.editorconfig` previene mojibake cp1252 en Cursor/Windows.)

Si `sdd.config.yaml` no existe: detener y pedir al usuario que lo configure según la plantilla en `references/sdd-config-template.yaml`.

## Modo de operación

Leer `implementer.mode` de `sdd.config.yaml` (default: `hybrid` si no definido):

| Modo | Rol de esta skill |
|------|-------------------|
| `hybrid` | Planifico: spec + design → entrego a Cursor para implementar |
| `claude` | Pipeline completo: spec → design → implemento → reviso → cierro |
| `cursor` | Esta skill no aplica — todo el pipeline vive en Cursor |

---

## Pipeline por requerimiento

```
0. GATE ENTRADAS  → Contexto del Requerimiento + Contexto Técnico
                    (+ Mockup si hay UI). Si falta → STOP
1. CARGAR PERFIL   → sdd.config.yaml + profiles de targets activos
2. INVESTIGAR      → specs del dominio, _graph.md, código existente
3. DEFINIR         → _index.md + spec.md → validar alcance con el usuario
4. DISEÑAR         → design.md (correr la escalera por objeto) → validar
5. ENTREGAR        → handoff al implementador  (hybrid) / continuar (claude)
6. ARCHIVAR        → delta.md → cerrar requerimiento
```

### Gate de documentos de entrada (paso 0 — duro)

Antes de INVESTIGAR/DEFINIR, verificar los documentos del requerimiento
(detalle en `references/methodology.md` → "Prerequisito absoluto"):

| Documento | Condición |
|-----------|-----------|
| Contexto del Requerimiento | Obligatorio siempre |
| Contexto Técnico | Obligatorio siempre |
| Mockup / Diseño Visual | Obligatorio si hay UI; opcional si no hay interfaz gráfica |

Si falta cualquiera de los obligatorios → STOP. Listar faltantes. No crear
artefactos. No asumir. Solo continuar cuando estén presentes.

## Comportamientos automáticos

### spec.md

**Intake en 3 fases antes de escribir** (references/methodology.md — "Intake de requerimiento en 3 fases"):
0. **Entradas**: documentos del requerimiento presentes (gate paso 0) → no avanzar sin ellos
1. **Discovery**: tipo + síntoma claros → no avanzar sin esto
2. **Deep dive**: targets/instancias + objetos MCP + invariantes en riesgo identificados
   - Si el módulo no tiene contexto verificado reciente en `_graph.md` o profiles → invocar `analizador-dominio` antes de escribir; incluir la sección "Contexto del módulo" que entrega en `spec.md`.
3. **Confirm**: proponer MoSCoW → usuario valida Must antes de generar

Si el usuario provee todo en el primer mensaje: comprimir en validación de los puntos.

- Auto-crear `<RUTA_SPECS>/<TKT>/` antes de escribir.
- Leer `_graph.md` buscando TKTs que toquen los mismos módulos/objetos; incluir `## TKTs relacionados` si los hay.
- Si Tipo: Bug Fix — correr las 4 fases de "Investigación sistemática de causa raíz" (references/methodology.md) antes de escribir `Contexto / problema` ni el CA-1 `[M]`. No narrar una causa raíz sin evidencia de la fase 3.
- **Actores reales:** todo CA nombra el SP / controller / campo exacto — sin "el sistema hace X".
- Al terminar: append a `_graph.md` con TKT, módulos/objetos tocados y relaciones.
- **Pasada adversarial (`abogado-del-diablo`):** paso obligatorio antes de cerrar el spec — retar el QUÉ: poke-holes a cada criterio, marcar `(asumido)` lo no evidenciado, confirmar causa raíz e invariantes faltantes. Encuentra puntos ciegos del autor; profundidad escala con la talla, nunca se salta.

### design.md
- Cargar **solo** el profile del target activo del requerimiento (no todos los profiles).
- Si el requerimiento modifica objetos existentes → invocar `revisor-impacto` antes de finalizar; incluir la sección "Impacto del cambio" que entrega en `design.md`. Objetos sin impacto verificado no pueden recibir prescripción de peldaño.
- Si el profile / `tools.verify` exige verificación previa (p.ej. MCP de TEST):
  ejecutarla antes de incluir queries/comandos en el artefacto y anotar la
  evidencia con formato `-- ✓ MCP [<entorno>] → <N filas o resultado>`. Solo incluir lo verificado.
- **Reflection loop SQL:** si una query falla la verificación MCP → corregir y
  re-verificar antes de continuar. No documentar SQL sin anotación `-- ✓ MCP`.
  La ausencia de la anotación es señal de SQL no verificado (bloqueado por hook).
- La sección "Orden de implementación" incluye columnas Entregable + Dependencia
  por paso (template-design.md) — no solo "qué hacer".
- **Actores reales:** la Estrategia técnica nombra quién ejecuta cada paso — sin
  "el diseño propone" ni "el sistema aplica".
- Si el requerimiento toca >2 objetos/instancias o cruza más de un target: incluir el diagrama Mermaid de "Diagrama de flujo" (template-design.md). Un solo objeto/endpoint no lo necesita.
- **Pasada adversarial (`abogado-del-diablo`):** paso obligatorio antes de finalizar el design — retar el CÓMO: alternativa descartada, escalera de decisión, Pre-mortem y llamadores fuera del análisis de impacto. Paso del proceso, no opcional.

### delta.md
- No pedir al usuario que describa qué cambió.
- Leer `spec.md` + `design.md` + `impl.md` del TKT y generar el delta comparando planeado vs implementado.
- Si `impl.md` no existe: indicarlo y esperar.
- Identificar **learnings** reutilizables (desvíos, patrones, invariantes) con evidencia citable
  (verificación / auditor / test) → tabla `## Aprendizajes` (target · aprendizaje · acción → profile · evidencia).
  Sin evidencia citable no se registra.
- Si el learning es una **decisión técnica con alternativas descartadas**: no va como fila, va en
  `## Decisiones (ADR)` formato MADR (contexto, opciones, decisión, evidencia, consecuencias).
- **Cierre ARCHIVADO** (tras delta.md aprobado): si `tools.compound_loop` está
  definido en config, ejecutarlo con el TKT y la fecha — vuelca Aprendizajes/ADR a
  `profiles/<target>.md`, actualiza `_index.md` (→ ARCHIVADO) y `_graph.md`. Solo
  targets activos. Luego entregar instrucción de cierre al implementador y limpiar
  el checkpoint de memoria del TKT si existe.

### release.md
- `release.md` es bitácora **operativa de despliegue**, no estado del ciclo SDD — el ciclo cierra en
  ARCHIVADO vía delta.md, el deploy se rastrea después, aparte.
- Generar el esqueleto junto con `delta.md` (mismo turno de cierre): piezas a desplegar en el orden
  de dependencia que indiquen los profiles activos (p.ej. datos antes de API si aplica) y rollback
  ejecutable adaptado de `design.md`/`impl.md`.
- No inventar fechas, ambientes ni resultados de smoke test — celdas vacías, no "(asumido)"; las llena
  quien ejecuta el deploy.
- Smoke test/rollback siguen la misma regla que design.md: verificados con `tools.verify` / MCP
  del profile cuando aplique.

## Handoff al implementador

### Modo `hybrid`

Al terminar `spec.md` + `design.md` validados, entregar siempre:

```
Implementador: <implementer.tool>
Requerimiento: tkt-<id>
Ruta: <RUTA_SPECS>/tkt-<id>/
Instancias en scope: <target:instancia, ...>
Comando: <implementer.entry_command>
```

### Modo `claude` — fases de implementación

*Activas solo cuando `implementer.mode: claude`. El pipeline continúa en esta misma skill.*

#### IMPLEMENTAR

Trigger: `/ejecutar` o "implementa el TKT".

1. Leer `spec.md` + `design.md` del TKT.
2. Implementar en el orden de la sección "Orden de implementación" del `design.md`.
   Al completar cada paso: actualizar columna `Estado` en la tabla → `✓ Hecho` o `⚠ Ajustado`.
3. Por cada objeto, aplicar el profile del target activo (naming, patrones, índices…).
4. **SQL**: ejecutar via `tools.verify` / MCP TEST antes de dar por verificado; anotar `-- ✓ MCP [<entorno>] → <N filas>` (ej: `-- ✓ MCP [nesgotest] → 5 filas`).
5. **API/Frontend**: aplicar convenciones del profile antes de editar.
6. Crear/actualizar `impl.md` paso a paso con evidencia de verificación por cada uno.
7. Stop: si un CA `[M]` no puede verificarse → documentar como riesgo residual y escalar.

#### REVISAR

Trigger: `/revisar` o "revisa el TKT".

0. **Completitud** (antes de tests): ¿cada CA `[M]` tiene resultado en `impl.md`? ¿sin scope creep? ¿objetos coinciden con `design.md`? Si ≥1 falla → `REQUIERE CAMBIOS`, devolver a implementador sin auditar.
1. Verificar cada CA `[M]` del `spec.md` contra `impl.md`.
2. Auditoría inline por target activo:
   - **database**: naming, índices, try/catch, schema, permisos (profile database).
   - **backend**: convenciones controller, DTOs, swagger, seguridad (profile backend).
   - **frontend**: typing estricto, 4 estados UI, Zod, TanStack Query (profile frontend).
   - **mobile**: naming Dart, separación de estado (Provider/ValueNotifier/setState),
     no BuildContext en servicios, `flutter analyze` limpio, dispose() en controllers
     (profile mobile).
   - **web-core**: PageModel conventions, `[BindProperty]`, sin ViewBag, `ILogger<T>`,
     `dotnet build` limpio (profile web-core).
3. Registrar en `impl.md`:
   - `APROBADO` si todo pasa.
   - `REQUIERE CAMBIOS` + lista de hallazgos accionables si no.
4. Stop si hay hallazgo `RIESGOSO` → escalar sin continuar.

#### COMPLETAR

Trigger: `/completar` o "completa el TKT".

Prerrequisito: `impl.md` existe con auditoría `APROBADO`.

1. Leer `spec.md` + `design.md` + `impl.md` → generar `delta.md` (planeado vs implementado).
2. Identificar learnings reutilizables con evidencia citable → `## Aprendizajes`.
3. Decisiones técnicas con alternativas descartadas → `## Decisiones (ADR)` formato MADR.
4. Si `tools.compound_loop` configurado: ejecutarlo (`--tkt TKT-<id> --date <fecha>`).
5. Actualizar `_index.md` → estado `ARCHIVADO`.
6. Actualizar `_graph.md` con entrada del requerimiento.
7. Limpiar checkpoint de memoria del TKT si existe.
8. Generar mensaje de commit copiable; si el usuario lo pide explícitamente,
   invocar `git-api` / `git-frontend` / `git-mobile` según el target (Modo 2).

---

## Mantenimiento del knowledge graph

- `/sincronizar` — detectar drift entre docs y BD/API/graph (cadencia mensual sugerida).
- `/retrospectiva` — analizar tendencias cross-requerimiento a partir de `_sdd_evolution.md`; invocar después de ≥3 requerimientos archivados para obtener insights accionables.

## Disciplina de contexto

- Archivos >100 líneas → leer con `offset`+`limit`.
- 3+ lecturas → subagente Explore.
- Prosa fuera del artefacto: ≤5 líneas.
- Al 40% de contexto: correr el checkpoint de la skill `austero`.
- Al inicio de cada turno: `/austero`.

## Referencias

Las referencias detalladas están en `references/`:

- `methodology.md` — metodología completa, escalera de decisión, estados del ciclo
- `profile-database.md` — plantilla de profile database (completar en el proyecto)
- `profile-backend.md` — plantilla de profile backend (completar en el proyecto)
- `profile-context.md` — estructura del repo de specs y plantilla `_index.md`
- `profile-frontend.md` — plantilla de profile frontend React/Vite (completar en el proyecto)
- `profile-mobile.md` — plantilla de profile mobile Flutter/Dart (completar en el proyecto)
- `profile-web-legacy.md` — plantilla de profile ASP.NET MVC 5 (completar en el proyecto)
- `profile-web-core.md` — plantilla de profile ASP.NET Core 8 / Razor Pages (completar en el proyecto)
- `template-spec.md` — plantilla completa de spec.md
- `template-design.md` — plantilla completa de design.md
- `template-delta.md` — plantilla completa de delta.md
- `template-release.md` — plantilla completa de release.md
- `sdd-config-template.yaml` — plantilla de sdd.config.yaml para nuevos proyectos
