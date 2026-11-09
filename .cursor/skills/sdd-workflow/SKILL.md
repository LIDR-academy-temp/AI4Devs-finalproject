---
name: sdd-workflow
description: "Activa el generador de contexto SDD. Usar cuando el usuario menciona un requerimiento (TKT-XXXX), pide generar spec.md, design.md, delta.md, o inicia planificación de un cambio. Prerrequisito: sdd.config.yaml en el proyecto."
metadata:
  trigger: "TKT, requerimiento, spec.md, design.md, test, pruebas, TDD, delta.md, planificación, implementar, archivar, bug, feature, refactor, spike"
---

# Generador de Contexto SDD

Rol: convierto requerimientos en artefactos de planificación (`_index.md`, `spec.md`,
`design.md`, `*PruebasUnitarias.sql`, `delta.md`) y — cuando `implementer.mode: claude` — ejecuto también
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
5. TEST            → AUTOMÁTICO tras DISEÑAR: *PruebasUnitarias.sql en ROJO (manual: /test)
6. ENTREGAR        → handoff al implementador  (hybrid) / continuar (claude)
7. ARCHIVAR        → delta.md → cerrar requerimiento
```

### Gate de documentos de entrada (paso 0 — duro)

Antes de INVESTIGAR/DEFINIR, verificar los documentos del requerimiento
(detalle en `references/methodology.md` → "Prerequisito absoluto"):

| Documento | Condición |
|-----------|-----------|
| Contexto del Requerimiento | Obligatorio siempre |
| Contexto Técnico | Obligatorio siempre |
| Mockup / Diseño Visual | Obligatorio si hay UI; opcional si no hay interfaz gráfica. Si llega en crudo (HTML, bundle, imágenes), traducirlo antes con la skill `mockup-a-contexto` |

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
- **Hotspot:** si ≥3 Bug Fix tocaron el mismo objeto en 6 meses → abrir el spec con `> ⚠ HOTSPOT` y
  sugerir `/escalar` a refactor con paridad (decide el usuario). Ver `/definir` paso 3.6.
- Si Tipo: Bug Fix — correr las 4 fases de "Investigación sistemática de causa raíz" (references/methodology.md) antes de escribir `Contexto / problema` ni el CA-1 `[M]`. No narrar una causa raíz sin evidencia de la fase 3.
- **Actores reales:** todo CA nombra el SP / controller / campo exacto — sin "el sistema hace X".
- **Contenido configurable** (regla 7, `references/contenido-configurable.md`): si el requerimiento muestra textos,
  estatus, mensajes o números de negocio, un CA dice qué cambia negocio **sin publicar la app ni alterar un SP**.
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
- **Contenido configurable** (regla 7): llenar la sección «Contenido configurable» del template. Ningún SP
  propuesto devuelve literales de negocio ni de error; los números de regla son parámetros y los textos que
  los mencionan llevan placeholder; los catálogos nuevos traen alcance, ES/EN, `IsActive`, auditoría y POST de
  ambos idiomas. Estándar: `references/contenido-configurable.md`.
- **Valores nuevos → consumidores:** si agrega un estado/tipo/OverrideID/código/ID de catálogo,
  buscar los valores hermanos en `sys.sql_modules` (MCP) y llenar «Valores nuevos y sus consumidores».
- **SP que escribe:** tabla «Contratos de escritura» (TC-IDEM obligatorio; concurrencia, falla
  parcial y transición o «N/A porque…»). Un `ErrorID=0` no es completitud.
- **Sondas canario** si toca cálculos de negocio o datos (las usa release.md).
- Si el requerimiento toca >2 objetos/instancias o cruza más de un target: incluir el diagrama Mermaid de "Diagrama de flujo" (template-design.md). Un solo objeto/endpoint no lo necesita.
- **Pasada adversarial (`abogado-del-diablo`):** paso obligatorio antes de finalizar el design — retar el CÓMO: alternativa descartada, escalera de decisión, Pre-mortem y llamadores fuera del análisis de impacto. Paso del proceso, no opcional.

### Fase TEST (`<yyyymmdd>_<TKT>_PruebasUnitarias.sql`) — automática

Corre **sin que el usuario la pida**, en el mismo turno, justo después de la pasada
adversarial del design. Un SDD generado = `_index.md` + `spec.md` + `design.md` +
suite de pruebas. Manual: `/test tkt-<id>` o "genera el test del TKT" (regenerar
tras cambiar la matriz, o TKT diseñado antes de esta fase). Detalle: comando `test.md`.

1. **Fuente única:** la matriz "Plan de pruebas" de `design.md`. No crear otra matriz;
   si falta un caso (Happy por CA `[M]`, `TC-ERR-x` negativo, `TC-CHAR-x` Refactor,
   `[ROJO]` Bug Fix) → completarlo primero en `design.md`.
2. Generar el script en `<RUTA_SPECS>/<TKT>/` desde `references/template-pruebas.sql`:
   un bloque por fila, mismo ID y `Expected` idéntico al design. `.http` si hay endpoints.
3. Fixture propio en `TRAN+ROLLBACK` (no depender de datos "existentes" en TEST).
   Objetos aún no creados → `EXEC sys.sp_executesql` dentro de `TRY` (si no, el batch aborta).
4. Correr en `tools.verify` / MCP TEST y anotar `-- [OK] TESTS [<env>] -> N PASS / M ROJO esperado`.
   Comportamiento nuevo/bug = ROJO; si un caso nuevo sale PASS antes de implementar → caso inútil, reforzarlo.
5. Paths críticos: listar los 3 mutantes T-SQL y el caso que mata cada uno.
6. `abogado-del-diablo` sobre el suite en SP de negocio: ¿pasa con una implementación equivocada?
7. `_index.md`: fila `Test` + log (estado no cambia).
7.5. **Lectura en frío** (subagente con solo spec + design + pruebas, sin la conversación):
   `SCORE` 0-10 de implementabilidad sin adivinar. `< 7` → corregir y repetir (máx. 2); sigue
   `< 7` → `BLOQUEADO`, no hay handoff. Subagente fallido = no aprobado.
7.6. **Sello de diseño:** `python sdd-toolkit/tools/sello.py registrar --tkt-dir <carpeta> --fase diseno`.
8. **Expected congelados:** el implementador cambia código, no asertos; un aserto mal
   se corrige en la matriz + `⚠ Ajustado` justificado en `impl.md`; REVISAR lo compara.
9. Si MCP TEST no está disponible: dejar el script sin evidencia y avisarlo en el handoff
   (no inventar la anotación).

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

Al terminar `spec.md` + `design.md` validados **y la fase TEST corrida**, entregar siempre
(no hay handoff sin suite de pruebas):

```
Implementador: <implementer.tool>
Requerimiento: tkt-<id>
Ruta: <RUTA_SPECS>/tkt-<id>/
Tests: <yyyymmdd>_<TKT>_PruebasUnitarias.sql — N PASS / M ROJO esperado (llevar a VERDE sin tocar Expected)
Instancias en scope: <target:instancia, ...>
Comando: <implementer.entry_command>
```

### Modo `claude` — fases de implementación

*Activas solo cuando `implementer.mode: claude`. El pipeline continúa en esta misma skill.*

#### IMPLEMENTAR

Trigger: `/ejecutar` o "implementa el TKT".

1. Leer `spec.md` + `design.md` + `*PruebasUnitarias.sql` del TKT (si falta el suite o su evidencia es
   `[PENDIENTE]` → correr la fase TEST primero). Verificar `sello.py verificar --fase diseno`: `VIEJO` →
   `/test` (solo cambió el suite) o re-diseño (cambió el spec).
2. Implementar en el orden de la sección "Orden de implementación" del `design.md`.
   Al completar cada paso: actualizar columna `Estado` en la tabla → `✓ Hecho` o `⚠ Ajustado`.
3. Por cada objeto, aplicar el profile del target activo (naming, patrones, índices…).
4. **SQL**: ejecutar via `tools.verify` / MCP TEST antes de dar por verificado; anotar `-- ✓ MCP [<entorno>] → <N filas>` (ej: `-- ✓ MCP [nesgotest] → 5 filas`).
5. **API/Frontend**: aplicar convenciones del profile antes de editar.
6. Re-correr el suite de la fase TEST hasta 0 ROJO sin tocar `Expected`; actualizar la evidencia `-- [OK] TESTS`.
6.1. Crear/actualizar `impl.md` paso a paso con evidencia de verificación por cada uno.
6.2. Mutation en paths críticos (3 mutantes T-SQL listados en el suite) — cada uno debe morir.
6.3. Tras auditorías/correcciones: re-correr el suite y registrar el sello `verde` con el hash
     (`HASHBYTES('SHA2_256', OBJECT_DEFINITION(...))` por MCP) de cada objeto tocado.
7. Stop: si un CA `[M]` no puede verificarse → documentar como riesgo residual y escalar.

#### REVISAR

Trigger: `/revisar` o "revisa el TKT".

-1. **Frescura:** `sello.py verificar --fase verde --obj <obj>=<hash actual>`; `VIEJO` → re-correr el
   suite antes de revisar.
0. **Completitud** (antes de tests): ¿cada CA `[M]` tiene resultado en `impl.md`? ¿sin scope creep? ¿objetos coinciden con `design.md`? Si ≥1 falla → `REQUIERE CAMBIOS`, devolver a implementador sin auditar.
1. Verificar cada CA `[M]` del `spec.md` contra `impl.md`.
1.1. Comparar los `Expected` del `*PruebasUnitarias.sql` contra la matriz de `design.md`: diferencia sin `⚠ Ajustado` justificado → `REQUIERE CAMBIOS`.
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
4.5. Si `APROBADO`: si hubo correcciones, re-correr el suite y re-sellar `verde`; luego registrar el sello `revisar`.
5. **Reporte de APIs para Front — AUTOMÁTICO, no se pide** (si paso 3 = `APROBADO` Y el TKT creó o modificó endpoints backend; en modo `hybrid` lo genera el `/revisar` de Cursor, paso 11.5):
   - Generar `TKT-<Numero>-APIS.md` en la misma carpeta de specs (`<RUTA_SPECS>/tkt-<id>/`).
   - Usar plantilla `references/template-apis.md`.
   - Incluir **solo** APIs creadas o modificadas — no vistas, SPs ni objetos internos.
   - Redactar como si Front no tuviera contexto previo del proyecto ni del ticket.
   - Por cada endpoint: descripción, métodos (GET/POST/DELETE), body de ejemplo, y respuesta JSON **real** (ejecutada en MCP TEST o tomada del `.http` corrido — nunca inventada; si se modificó un endpoint existente, el JSON vigente completo).
   - Re-revisión: actualizar el archivo existente, no duplicar. `REQUIERE CAMBIOS` → no generar aún, anotarlo como pendiente.
   - **Variante A** (CRUD estándar) para recursos con múltiples verbos; **Variante B** (acción única) para endpoints de proceso/acción con un solo verbo.
   - Si el recurso es un **catálogo** (valores finitos para selects/etiquetas), incluir valores base.
   - Si la respuesta tiene estructura atípica (FOR JSON anidado, paginación, doble parseo), agregar `⚠️ Nota de consumo` explicando cómo parsear.
   - Tabla resumen de endpoints al final.
   - Si el TKT no tocó ningún endpoint → no generar el archivo.

#### COMPLETAR

Trigger: `/completar` o "completa el TKT".

Prerrequisito: `impl.md` existe con auditoría `APROBADO`.

0. Verificar `sello.py verificar --fase revisar` (`VIEJO` → `EN REVISIÓN` + REVISAR; `SIN SELLO` en URGENTE → anotar y seguir).
1. Leer `spec.md` + `design.md` + `impl.md` → generar `delta.md` (planeado vs implementado).
2. Identificar learnings reutilizables con evidencia citable → `## Aprendizajes`.
3. Decisiones técnicas con alternativas descartadas → `## Decisiones (ADR)` formato MADR.
4. Si `tools.compound_loop` configurado: ejecutarlo (`--tkt TKT-<id> --date <fecha>`).
4.5. Esqueleto de `release.md` (si hay piezas desplegables) con la sección Canario copiada de «Sondas canario».
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
- `template-pruebas.sql` — plantilla del suite de la fase TEST
- `template-delta.md` — plantilla completa de delta.md
- `template-release.md` — plantilla completa de release.md
- `template-apis.md` — plantilla de TKT-XXXX-APIS.md (reporte de APIs para Front)
- `sdd-config-template.yaml` — plantilla de sdd.config.yaml para nuevos proyectos
