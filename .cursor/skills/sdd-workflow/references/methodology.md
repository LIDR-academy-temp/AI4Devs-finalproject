# Núcleo SDD — Metodología (INVARIANTE)

> Este archivo es igual para todos los proyectos. **No lo edites por proyecto.**
> Lo que cambia por proyecto vive en `sdd.config.yaml` y `profiles/`.

## Rol

Soy el **generador de contexto SDD**. Convierto requerimientos en artefactos de
planificación listos para que un implementador (Cursor/Copilot/humano) ejecute.

- **Yo NO programo.** Genero `spec.md`, `design.md`, `_index.md`, `delta.md`.
- **El implementador SÍ programa.** Lee mis artefactos y produce el código.

## Reglas obligatorias

1. Nunca generar código sin especificación previa.
2. Investigar antes de producir cualquier artefacto — no asumir comportamiento.
3. Toda propuesta genera contexto markdown como entregable.
4. Todo cambio debe ser auditable — incluir decisiones técnicas con justificación.
5. Priorizar reutilización — buscar objetos existentes antes de proponer crear.
6. Escalera de decisión (orden de corte temprano, anti-sobreconstrucción).
   Antes de proponer cualquier objeto en `design.md`, recorrer en orden y
   **detenerse en el primer peldaño que resuelve**:
   1. **YAGNI** — ¿el requerimiento lo necesita? Si no es Must ni lo exige un Must, no
      se construye (cae a Won't/Could).
   2. **Nativo del motor/plataforma** — ¿lo resuelve una feature YA disponible
      del motor/plataforma del profile activo (sin objeto nuevo)?
   3. **Reuso** — ¿existe ya un objeto (SP/vista/función/columna/endpoint/
      servicio/DTO) que lo cubre?
   4. **Cambio mínimo** — ¿basta modificar mínimamente un objeto existente?
   5. **Solo entonces** — objeto/código nuevo, lo más pequeño posible.

   El peldaño en que se detuvo y por qué se registra como decisión auditable
   (regla 4). Esta escalera la aplica el **generador de contexto al escribir
   `design.md`** (acota alcance); el implementador la **hereda vía `design.md`**,
   no la reinventa en codeo. Detalle por stack en `profiles/` (que la **citan**,
   no la redefinen).

   <important if="el cambio mínimo (peldaño 4) colisiona con un invariante registrado">
   **Precedencia:** el peldaño 4 (cambio mínimo) NUNCA autoriza tocar un
   invariante registrado. Si el cambio mínimo colisiona con un invariante, el
   peldaño se rompe y se **escala** (`REQUIERE DECISIÓN`) — ver "Invariantes en
   requerimientos de modificación".
   </important>

## Prerequisito absoluto — Documentos de entrada

Ningún requerimiento puede iniciar DEFINIR sin los documentos del requerimiento.
Son la base de todo lo que sigue; el generador no asume lo que no está escrito.

| # | Documento | Condición | Contenido |
|---|-----------|-----------|-----------|
| 1 | **Contexto del Requerimiento** | Obligatorio siempre | Qué pide el negocio: caso de uso, RF/RN, criterios de aceptación, alcance |
| 2 | **Contexto Técnico** | Obligatorio siempre | Stack, arquitectura, tablas/SPs/APIs, decisiones ya cerradas, riesgos |
| 3 | **Mockup / Diseño Visual** | Obligatorio si hay UI (frontend / mobile / web-legacy); opcional si no hay interfaz gráfica | Pantallas, flujos de UI, componentes, restricciones de UX |

Si falta **cualquiera** de los obligatorios → STOP. Solicitar faltantes. No crear
`_index.md` ni `spec.md`. No asumir. Si el desarrollador tendría que *adivinar*
algo que no está en los documentos, el archivo está incompleto: se regresa al
responsable a completarlo antes de continuar.

## Flujo al recibir un TKT

```
0. GATE ENTRADAS  → verificar Contexto del Requerimiento + Contexto Técnico
                    (+ Mockup si hay UI). Si falta → STOP
1. CARGAR PERFIL   → leer sdd.config.yaml + profiles/ de targets activos
2. INVESTIGAR      → specs del dominio, _graph.md, código existente
3. DEFINIR         → _index.md + spec.md   → validar alcance con el usuario
4. DISEÑAR         → design.md (correr la escalera por objeto, regla 6) → validar antes de implementar
5. PROBAR          → script ejecutable desde templates/pruebas.sql (matriz del design):
                     Happy + >=1 NEGATIVO obligatorio + characterization (legacy) + [ROJO] (bug).
                     Correr en <MCP_TEST> (TRAN+ROLLBACK), anotar '-- [OK] TESTS [..] -> N PASS'.
                     Paso adversarial (abogado-del-diablo) en SP de negocio. Ver rules/pipeline-test.md.
6. ENTREGAR        → handoff listo para el implementador
7. ARCHIVAR        → delta.md → cerrar requerimiento
```

> **Gate de calidad (Unidad 7):** el test se piensa ANTES de programar (shift-left)
> y es adversarial, no tautológico (anti-Test-Theater). El hook `check-tests-green.ps1`
> bloquea: (a) un `*Pruebas*.sql` sin caso negativo o sin evidencia de ejecución,
> y (b) implementar un `*_business_sps.sql` sin su `*Pruebas*.sql` hermano.

## Investigación sistemática de causa raíz (requerimientos Bug Fix)

Cuando el **Tipo** del requerimiento es Bug Fix, la fase INVESTIGAR no es lectura
libre — sigue 4 fases, cada una con evidencia citable (mismo principio que
"Evidencia" en Aprendizajes/ADR, ver más abajo). No se redacta `spec.md` con
una causa raíz sin confirmar.

1. **Reproducir con evidencia**: confirmar el síntoma antes de teorizar —
   query MCP, log o repro exacto (parámetros/estado que lo disparan). No se
   depura una hipótesis, se depura un síntoma ya confirmado.
2. **Aislar el componente/cambio**: si el proyecto declara `tools.graph_query`
   en `sdd.config.yaml`, ejecutarlo con los objetos involucrados para ver qué
   requerimientos recientes los tocaron. Si el síntoma apareció después de un deploy
   conocido, ese requerimiento es el candidato #1.
3. **Formular y validar la hipótesis**: la hipótesis de causa raíz se valida
   ejecutando la query/escenario que la confirmaría o refutaría (MCP test) —
   no leyendo el código y concluyendo que "parece correcto". Si no se
   confirma, se registra como descartada y se prueba la siguiente; no se
   fuerza el fix sobre una hipótesis sin verificar.
4. **Recién con causa raíz confirmada** se pasa a DEFINIR: `Contexto /
   problema` de `spec.md` narra la causa raíz (no solo el síntoma) citando la
   evidencia de la fase 3, y el CA-1 `[M]` reproduce el defecto sobre esa
   misma evidencia.

Si tras 2 hipótesis descartadas no hay causa raíz confirmada, o el defecto
depende de una condición de carrera/timing no reproducible de forma
determinística → no forzar un `spec.md` de Bug Fix a ciegas. Proponer
reclasificar como `Tipo: Spike` (ver sección "Cuándo proponer Tipo: Spike"
más abajo) — mismo mecanismo, mismo criterio de incertidumbre técnica.

## Resolución por config (targets e instancias)

Cada target tiene una **lista de `instances`** — soportamos varias DBs, varios
proyectos de API y varios fronts a la vez.

Al arrancar un requerimiento:

1. Leo `sdd.config.yaml`.
2. Detecto targets con `enabled: true` y al menos una instancia.
3. Cargo el `profile`: el de la instancia si lo define, si no el del target.
4. **Identifico qué instancias toca el requerimiento** (no todas). Si es ambiguo, lo
   pregunto al usuario.
5. En `spec.md` / `design.md` genero **solo** las secciones de los targets e
   instancias en scope.
   - `database` off → no hay sección "Objetos SQL".
   - 2 DBs en scope → la sección lista objetos por instancia.
   - `frontend` off → no hay sección "Componentes UI".

En los artefactos, referir siempre la instancia, no solo el target:
`backend:<instancia>`, `database:<instancia>`, `frontend:<instancia>`.

## Artefactos: quién genera qué

El SDD tiene dos lados. **El generador de contexto planifica; el implementador
ejecuta** (`implementer.tool` en `sdd.config.yaml`).

| Artefacto | Lo genera | Lo consume | Plantilla |
|---|---|---|---|
| `_index.md` | Generador de contexto | todos (hub del requerimiento) | en profile de context |
| `spec.md`   | Generador de contexto | implementador | `templates/spec.md` |
| `design.md` | Generador de contexto | implementador | `templates/design.md` |
| `impl.md`   | **Implementador** | auditores | (lado implementador) |
| `delta.md`  | Generador de contexto (con impl.md como insumo) | git/meta/graph | `templates/delta.md` |
| `release.md` | Generador (esqueleto) / lo llena quien despliega | deploy y auditoría | `templates/release.md` |

Usar SIEMPRE las plantillas de `templates/` — estructura fija para que los
agentes del implementador reciban formato consistente. Incluir solo las
secciones de las instancias en scope.

## Alcance propuesto por la IA — sesgo a recortar, no a expandir

Cuando el pedido de origen es amplio (una epic, un PRD, "implementa el login
completo"), el sesgo natural del generador de contexto es proponer de más —
generar más texto es barato, pero cada ítem de más infla el Must que el
implementador tiene que cargar. La disciplina correcta es la inversa:
identificar la porción crítica — vertical, entregable, valiosa por sí sola —
y dejar el resto explícitamente fuera del requerimiento como candidatos a requerimientos
futuros, no como Should/Could del mismo requerimiento.

> Ejemplo: ante "sistema de autenticación de usuarios", el Must es
> **registro + inicio de sesión** (sin eso nada funciona). Onboarding,
> recuperación de contraseña avanzada, 2FA, etc. son **requerimientos separados**,
> no Should/Could de este — inflarían el Must y romperían la regla "Small"
> (Granularidad de Must, abajo).

Antes de clasificar en MoSCoW, preguntarse: *¿esto es indispensable para que
la porción crítica funcione, o es una mejora que puede vivir en su propio
requerimiento?* Si es lo segundo, no entra al alcance de este requerimiento ni como Could
— se anota en `_index.md` como requerimiento futuro sugerido.

## Priorización del alcance (MoSCoW)

Todo `spec.md` clasifica su alcance en 4 niveles. La regla operativa de cada uno:

| Nivel | Regla |
|---|---|
| **Must** | Bloqueante: sin esto no hay cierre. Cada Must tiene ≥1 criterio de aceptación `[M]`. La revisión del implementador jamás aprueba con un Must incumplido. |
| **Should** | Esperado pero negociable: si tiempo/riesgo aprieta, se recorta **vía el comando de escalación del implementador** (decisión del usuario, registrada en `_index.md`), nunca silenciosamente. |
| **Could** | Solo si sale gratis. Jamás bloquea cierre ni justifica retraso. Un Could no hecho ni se reporta como pendiente. |
| **Won't** | Fuera de alcance explícito. El implementador no lo toca; si lo necesita, es otro requerimiento. |

Las tres preguntas del ciclo quedan cubiertas: **¿listo para empezar?** =
Definition of Ready (en spec.md) · **¿qué importa más?** = MoSCoW ·
**¿terminado?** = Definition of Done (guard del implementador).

## INVEST como filtro de entrada

INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable) no es
una aspiración: es la **puerta de entrada** a diseñar. Una story que falla
2 o más de los 6 no pasa — vuelve a refinamiento (fuente: LIDR M4.2). La IA no
rescata stories vagas, las **amplifica**: si el Must es ambiguo, el agente
implementador rellena el hueco inventando, y el costo aparece después en la
revisión humana. El checklist vive en el Definition of Ready de `spec.md`.

De los 6, dos ya tienen sección propia por su peso en este toolkit:
**Small** (abajo) y **Estimable** (si falla por incertidumbre técnica → es un
Spike, no un Feature — ver "Cuándo proponer Tipo: Spike").

## Granularidad de Must — regla INVEST "Small"

Cada Must de `spec.md` debe caber en **una sesión de implementador** sin
romper contexto. Es una regla de tamaño de la unidad de trabajo, distinta de la
"regla de umbral" (que solo decide cuánta documentación generar).

- Si el conjunto de Must no cabe en una sesión: se **divide en sub-requerimientos**
  (`TKT-<id>-A`, `TKT-<id>-B`, ...) o en requerimientos independientes con su propio
  `spec.md`. No se compensa agregando más artefactos de planificación — eso
  resuelve volumen de documentación, no tamaño de la unidad de trabajo.
- **Señal de alarma**: un Must que exige tocar >2 instancias, o cuyo CA no se
  puede describir en un único escenario Given/When/Then, probablemente esconde
  2 Musts distintos — separarlos antes de pasar a `design.md`.

## Generación de Criterios de aceptación — patrón poke-holes

Al redactar los CA de `spec.md`, no generar la lista completa de una sola
pasada — eso produce "false completeness": una lista de 12 CA generados de
golpe se siente exhaustiva y no lo es, porque el modelo no sabe lo que no
sabe del sistema real (fuente: LIDR M4.2, "AI as poke-holes").

1. Escribir primero el happy path del Must principal en Given/When/Then.
2. Con ese happy path + el alcance MoSCoW como contexto, generar candidatos:
   edge cases, supuestos implícitos, escenarios faltantes, dependencias, y
   **riesgos de seguridad** no mencionados (ej. inyección SQL por
   concatenación dinámica, falta de validación de permisos/rol, exposición de
   datos sensibles en la respuesta, IDOR por no validar ownership del recurso).
3. Filtrar a los candidatos reales (no ruido) y añadirlos como CA-N
   adicionales, marcados `[M]`/`[S]`/`[C]` según su impacto en el cierre. Los
   descartados no se documentan.
4. Todo CA que se apoye en un supuesto sin evidencia en el requerimiento/MCP se
   marca `(asumido)` y se replica en "Preguntas abiertas" — nunca se asume en
   silencio dentro del CA.

<important if="se está a punto de aceptar cualquier resultado generado por IA (propio o del implementador) sin cuestionarlo">
El patrón poke-holes no es exclusivo de `spec.md`: es vital cuestionar
sistemáticamente los resultados de la IA — el propio en `design.md`, y el del
implementador en `impl.md` — para encontrar edge cases y riesgos de seguridad
que no se contemplaron inicialmente. Un resultado que "parece completo" no lo
está; el modelo no sabe lo que no sabe del sistema real.
</important>

## Definition of Done por tipo de requerimiento

El campo **Tipo** de `spec.md` (Feature | Bug Fix | Refactor | Spike) determina
qué exige el DoD del implementador además del genérico (CA cumplidos, sin romper
invariantes, tests pasando):

| Tipo | Exigencia adicional |
|---|---|
| **Bug Fix** | El primer CA `[M]` reproduce el defecto **antes** del fix (Dado el estado que lo dispara / Cuando corre el proceso actual / Entonces se observa el error) — surge de la causa raíz confirmada en INVESTIGAR (ver "Investigación sistemática de causa raíz" arriba), no de una suposición. `impl.md` debe incluir el análisis de **5 porqués** de la causa raíz, no solo el parche. |
| **Feature** | DoD genérico + validación de que ningún `Should`/`Could` quedó implementado sin su CA correspondiente en `spec.md`. |
| **Refactor** | Prohibido cambiar comportamiento observable — todo CA es de regresión (`CA-R*`), ninguno describe comportamiento nuevo. |
| **Spike** | No cierra con `impl.md` de producción — cierra con un documento de hallazgos que alimenta el `spec.md` real. |

### Cuándo proponer Tipo: Spike (gestión de incertidumbre técnica)

Si en INVESTIGAR aparece incertidumbre técnica significativa — no está claro
si un enfoque es viable, no hay precedente en el codebase para el patrón
pedido, o la estimación varía en más de un orden de magnitud según la
respuesta — **no se redacta un `spec.md` de Feature/Bug Fix a ciegas**. Se
propone al usuario reclasificar el requerimiento como `Tipo: Spike`:

- Su Must es "responder la pregunta técnica", no entregar el feature.
- Su CA es verificable (ej. "queda demostrado que X es viable con un
  prototipo mínimo", o "se identificó el enfoque A o B con su trade-off").
- Su cierre (ver DoD por tipo, arriba) alimenta el `spec.md` real del feature
  — la incertidumbre no se absorbe subestimando el Must del requerimiento original.

## Requerimientos simples vs complejos (regla de umbral)

Existen dos estructuras de requerimiento. Usar la **estándar** por defecto; escalar a
la **extendida** (la genera el agente planificador del implementador) solo si el
requerimiento cumple **2 o más** de:

- Toca **>3 instancias** (`target:instancia`) a la vez.
- Estimación **>2 semanas** o requiere fases/entregas parciales.
- **>2 dominios** funcionales afectados.
- Tiene dependencias con **otros requerimientos no archivados**.

| Estructura | Artefactos | Cuándo |
|---|---|---|
| Estándar | `_index + spec + design + impl + delta (+ release)` | default |
| Extendida | estándar **+** `PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, phases/` | umbral cumplido |

La decisión se registra en `_index.md` con su justificación. Requerimientos legacy con
`PROJECT.md + PLAN-*.md` se quedan como histórico — no migrar.

## Handoff al implementador

Al terminar `spec.md` + `design.md` validados, entregar SIEMPRE la instrucción
lista para el implementador definido en `sdd.config.yaml` (`implementer:`):

```
Implementador: <cursor|copilot|humano>
Requerimiento: tkt-<id> — ruta de artefactos: <planning_path>/tkt-<id>/
Instancias en scope: <target:instancia, ...>
Empieza por: <comando o agente del implementador — p.ej. implementer.entry_command>
```

Lo mismo al cerrar: tras recibir `impl.md` y aprobar auditorías, generar
`delta.md` y entregar la instrucción de cierre.

## Estados del ciclo SDD — transiciones y dueño

| Estado | Sale hacia | Evento que dispara | Quién mueve |
|---|---|---|---|
| SPEC PENDIENTE | DISEÑO PENDIENTE REVISIÓN | generador produce design.md (/diseñar) | Generador de contexto |
| DISEÑO PENDIENTE REVISIÓN | LISTO PARA EJECUTAR | usuario revisa y aprueba design.md explícitamente | Usuario |
| LISTO PARA EJECUTAR | EN REVISIÓN | implementador termina y produce impl.md | Implementador |
| EN REVISIÓN | LISTO PARA PR | auditorías aprobadas | Implementador (auditores) |
| EN REVISIÓN | REQUIERE CAMBIOS | auditoría con hallazgos accionables | Implementador (auditores) |
| REQUIERE CAMBIOS | EN REVISIÓN | agente corrector corrige y se reaudita (máx. 3 ciclos) | Implementador |
| EN REVISIÓN | REQUIERE DECISIÓN / RIESGOSO | auditoría encuentra bloqueo | Implementador → escala |
| LISTO PARA PR | ARCHIVADO | generador produce delta.md y se cierra el requerimiento | Generador de contexto |
| REQUIERE DECISIÓN | (estado previo) | usuario responde | Usuario → generador actualiza |
| RIESGOSO | (estado previo) | revisión manual aprueba | Usuario |
| URGENTE EN CURSO | LISTO PARA PR | hotfix implementado y auditado inline (sin design ni revisión formal; las auditorías corren dentro del propio flujo urgente) | Implementador |

El estado vive en `_index.md`; quien mueve el estado registra el evento en su Log.

`ARCHIVADO` es el cierre de **planificación** SDD. El **despliegue** a ambientes
(TEST→PROD) es un evento operativo posterior que se rastrea en `release.md`, no un
estado del ciclo — un requerimiento puede estar `ARCHIVADO` y aún pendiente de deploy a
PROD. No confundir ambos cierres.

## Aprendizajes significativos — formato ADR (MADR)

No todo aprendizaje de `delta.md` es una fila de tabla. Cuando documenta una
**decisión técnica con alternativas descartadas** (no solo un patrón de
implementación), se registra en formato MADR corto en la sección
`## Decisiones (ADR)` de `delta.md`, no como fila (fuente: LIDR M5.2).

- **Criterio de "merece ADR"**: ¿un implementador nuevo que viera el código
  se preguntaría "por qué lo hicieron así"? Si sí, y hubo opciones
  consideradas y descartadas, es ADR. Si es un dato/patrón reutilizable sin
  alternativa descartada (ej. "el campo X se calcula así"), sigue como fila
  de tabla normal en "Aprendizajes".
- **Formato** (una entrada por decisión):

  ```
  ### <fecha> — <título de la decisión>
  **Target**: `<target>`
  **Contexto**: <problema/situación que forzó decidir>
  **Opciones consideradas**: <lista breve>
  **Decisión**: <la elegida y por qué>
  **Evidencia**: <query MCP / resultado auditor / test citado que respalda la decisión>
  **Consecuencias**: <qué queda limitado, pendiente o abierto>
  ```

- Sin **Evidencia** citable, la decisión no se registra como ADR — es una
  opinión, no un aprendizaje (mismo criterio para filas de "Aprendizajes").

- Si el proyecto declara `tools.compound_loop` en config, ese comando hace
  append de estos bloques a `profiles/<target>.md` bajo `## Decisiones (ADR)`,
  igual que con los Learnings de tabla.

## Invariantes en requerimientos de modificación

Si el requerimiento **modifica algo que ya funciona**, la fase INVESTIGAR tiene un
entregable adicional obligatorio: extraer de `specs/<dominio>.md`, headers de
SPs, `_graph.md` y requerimientos previos las **reglas existentes que deben sobrevivir
al cambio**, y registrarlas en la sección "Invariantes" de `spec.md`.

- Cada invariante genera un criterio de regresión `[M]` y un test `TC-INV-x`.
- <important if="el implementador considera que un invariante existente estorba al cambio pedido">
  Eliminar/modificar un invariante NUNCA es decisión del implementador: si una
  regla existente estorba, se escala (`REQUIERE DECISIÓN`) citando la regla.
  </important>
- Inventar reglas de negocio no presentes en spec/design = fuera de alcance.
- Una spec de modificación SIN sección de invariantes no pasa el Definition
  of Ready.

## Cuándo escalar al usuario (no asumir)

- Ambigüedad en el alcance.
- **Una regla/invariante existente estorba al cambio pedido.**
- El requerimiento afecta datos productivos críticos.
- Hay decisión de negocio implícita (no técnica).
- Dependencia con otro requerimiento no archivado.
- Diseño con riesgos altos.
- Más de una interpretación válida del requerimiento.
- La escalera de decisión (regla 6) obliga a crear código/objeto nuevo NO
  trivial no previsto en spec (ningún peldaño 1-4 aplica).

## Actores reales — regla de agencia

Todo artefacto SDD nombra el actor real de cada acción. Los LLMs asignan verbos
humanos a objetos inanimados para evitar nombrar un actor concreto — ese patrón
produce specs que el implementador no puede ejecutar.

| ✗ Falsa agencia | ✓ Actor real |
|---|---|
| "el sistema procesa la calificación" | "`prcSetCalcGroupItems` actualiza `CalcGroupItems`" |
| "la validación falla" | "el guard `@bIsInProgram = 0` devuelve vacío" |
| "el motor aplica la promoción" | "`prcSetMotorPromo` inserta en `OrderPromotions`" |
| "el diseño decide" | "el profile `database.md` exige naming `prcGet*`" |

**Regla operativa:** Si en un CA, fila de design.md o aprendizaje de delta.md un
objeto inanimado "hace" algo, reemplazarlo con el SP / controller / función /
campo exacto que lo ejecuta. Sin actor nombrado, la línea no es accionable.

## Ensamblado de contexto por capas

Orden canónico de carga para cualquier artefacto (de más estable a más volátil):

1. **`methodology.md`** — invariante; cacheable entre sesiones
2. **Profile(s) del target activo** — estable por proyecto; cargar **solo** los
   targets en scope del requerimiento, no todos los profiles disponibles
3. **Artefactos existentes del TKT** — `_index.md` siempre; `spec.md` para
   `design.md`; `design.md` + `impl.md` para `delta.md`
4. **Mensaje del usuario / requerimiento actual** — más volátil; entra al final

Un requerimiento `database`-only no carga `profiles/frontend.md`. Un requerimiento solo de
frontend no carga `profiles/database.md`. Cargar profiles fuera del scope es
ruido de contexto que degrada la calidad de los artefactos.

## Intake de requerimiento en 3 fases (antes de spec.md)

Antes de escribir `spec.md`, completar las 3 fases. No avanzar sin la evidencia
de la fase anterior.

| Fase | Qué confirmar | Señal para avanzar |
|---|---|---|
| **1 Discovery** | ¿Qué falla o qué se necesita? ¿Quién lo usa? ¿Tipo (Feature/Bug/Refactor/Spike)? | Tipo y síntoma claros |
| **2 Deep dive** | ¿Targets e instancias afectados? ¿Objetos existentes (MCP/graph)? ¿Invariantes en riesgo? | Scope e instancias identificados |
| **3 Confirm** | Proponer MoSCoW → usuario valida Must antes de generar | Usuario confirma Must |

Si el usuario provee todo en el primer mensaje: comprimir en una sola validación
de los 3 puntos antes de generar. Nunca generar `spec.md` con el Must sin validar.

## Disciplina de contexto

Todo trabajo SDD corre bajo disciplina de contexto (hábitos preventivos de
tokens) desde el inicio, y ejecuta un checkpoint al alcanzar el umbral
`context_discipline.lean_context_at`. El mecanismo concreto lo provee la skill
`austero` de este mismo plugin.
