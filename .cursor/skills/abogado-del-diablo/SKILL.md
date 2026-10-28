---
name: abogado-del-diablo
description: Pensamiento adversarial en dos modos. (A) Pasada SDD sobre spec/design/suite de pruebas — reta supuestos, marca (asumido), busca el contraejemplo y el modo de falla; se invoca por defecto en /definir, /diseñar y la fase TEST. (B) Análisis crítico antes de modificar código existente (Cerca de Chesterton) — investiga por qué existe una decisión, cuestiona la hipótesis y la verifica con un subagente independiente. Overlay Claude Code — la portable del plugin es el resumen corto en sdd-methodology-plugin/skills/abogado-del-diablo.
disable-model-invocation: false
allowed-tools: [Read, Grep, Glob, Bash, Task, Agent, Edit, Write]
metadata:
  trigger: "abogado del diablo, valida mi idea, ¿por qué hace esto?, ¿esto es un bug?, debería cambiar, cambiar comportamiento, parece incorrecto, comportamiento extraño, ¿seguro que?, antes de modificar, investigar primero, revisar antes"
---

# Abogado del Diablo

> **Host overlay (Claude Code).** Cuestiona; no reescribe artefactos ni edita código
> durante el análisis. Su salida son objeciones o un veredicto accionable; el autor
> decide qué acoger. Respeta la disciplina de `05_sdd_comunicacion` / `austero`.
>
> **Cerca de Chesterton:** *"No derribes una cerca hasta saber por qué la pusieron."*
> Todo comportamiento existente se presume intencional hasta que la evidencia demuestre
> lo contrario. Tu trabajo no es confirmar la hipótesis del usuario — es intentar
> refutarla, incluida la tuya propia.

`[abogado ON]`

```
$ARGUMENTS
```

## Elegir modo

| Situación | Modo |
|-----------|------|
| Paso del flujo SDD: `/definir` (spec), `/diseñar` (design), fase TEST (suite), o "valida mi idea/propuesta" | **A — Pasada SDD** |
| "¿por qué hace esto?", "¿es un bug?", cambiar comportamiento de código existente, Bug Fix en INVESTIGAR | **B — Antes de modificar código** |

Ambos comparten las **Reglas de oro** y la **Verificación adversarial** (5.5).

---

## Reglas de oro (activas todo el tiempo)

1. No editar código ni artefactos en la fase de análisis.
2. No inventar razones históricas sin evidencia.
3. Separar siempre: **hecho** · **inferencia** · **especulación**. Marcar `(asumido)` lo no evidenciado.
4. Tratar el comportamiento existente como **potencialmente intencional** hasta demostrar lo contrario.
5. Buscar activamente evidencia que **contradiga** tu hipótesis preferida.
6. Sin evidencia suficiente, decirlo explícitamente — nunca reemplazar incertidumbre con narrativa plausible.
7. **Falsabilidad:** antes de recomendar, enuncia la observación concreta que probaría que tu
   recomendación es **incorrecta** — y ve a buscarla.
8. **Calibración:** la confianza está topada por tu mejor evidencia. Confirmada → hasta `alto`.
   Probable → tope `medio`. Especulativa → tope `bajo`.
9. **No inventar fricción:** si no hay objeción real, decirlo en una línea.

## Antes de objetar — cargar historia del dominio

Para el dominio activo, leer (escala con la talla; si no existen, seguir):
1. `_sdd_evolution.md` → `## Observaciones de evolución`: entradas del mismo dominio/objeto.
   Citarlas como evidencia dura ("obs #N de TKT-x ya documentó esto").
2. `## Pitfalls comunes` y `## Learnings (acumulado)` del perfil (`sdd-toolkit/profiles/<target>.md`).
3. Memoria del proyecto si existe (casos reales, gotchas de entorno).

---

## Modo A — Pasada SDD

**Paso integral, no opcional:** paso 12.5 de `/definir`, 11.5 de `/diseñar` y paso 8 de la
fase TEST. Nunca se salta; la profundidad escala con la talla (trivial = pasada rápida y
"sin objeciones"; grande o con invariantes = completa). On-demand en cualquier fase.

### En /definir — retar el QUÉ
1. Cada criterio de aceptación: ¿mide algo verificable o es un adjetivo? happy path → edge case → supuesto oculto → gap.
2. Marca `(asumido)` toda afirmación sin evidencia en el requerimiento o en MCP.
3. Bug Fix: ¿la causa raíz está confirmada con evidencia, o es todavía un síntoma? (si hay duda → Modo B).
4. ¿Qué invariante NO listado podría romperse? Propón los `INV-x` faltantes.
5. El contraejemplo: un caso real donde el criterio, tal como está escrito, falla.
6. Historia: ¿alguna obs/pitfall del dominio aplica? Citarla.

### En /diseñar — retar el CÓMO
1. ¿Cuál es la alternativa más fuerte descartada y por qué NO se eligió? Si no está justificada, objétala.
2. Escalera de decisión: ¿algún objeto NUEVO que ya existe o se resuelve con cambio mínimo (peldaño 2-4)?
3. Pre-mortem: si esto falla en PROD, ¿causa más probable? Alimenta la sección Pre-mortem.
4. ¿Qué prueba FALTA para que un cambio erróneo pase inadvertido? (Mutation de `18_guard_tdd`).
5. Regresión: ¿qué llamador del objeto no aparece en el análisis de impacto?
6. Historia: ¿alguna obs/pitfall aplica al diseño? Citarla con nº de obs y TKT.

### En la fase TEST — retar el suite
1. ¿Algún caso pasa con una implementación **equivocada**? (aserto débil, `Expected` tautológico) → reforzarlo.
2. ¿Hay ≥1 negativo real (entrada inválida, borde de dominio), no solo happy path?
3. ¿Algún caso nuevo sale PASS antes de implementar? → no prueba nada.
4. ¿Los fixtures dependen de datos "existentes" en TEST (recargados por API, catálogo distinto a PROD)?
5. ¿Qué mutante (WHERE, operador, umbral) sobreviviría al suite?

### Formato de salida (Modo A)

```
[abogado del diablo · <definir|diseñar|test|propuesta>]
1. [Crítica|Alta|Media] <objeción> → <qué revisar/cambiar>
...
Veredicto: <N objeciones sustantivas — o "sin objeciones sustantivas">
```

Máximo **5 objeciones**, ordenadas por severidad, cada una accionable. Solo lo sustantivo
(rompe un invariante, invalida un criterio), no preferencias de estilo.

---

## Modo B — Antes de modificar código existente

### Árbol de profundidad

| Señal | Acción |
|-------|--------|
| Cambio trivial con evidencia obvia (typo, doc desactualizada) | **Modo rápido** → solo Fases 2-3-5 |
| Comportamiento no documentado, sin tests, >6 meses sin tocar | **Profundo** → todas las fases |
| SP/función crítica de negocio (comisiones, pedidos, inventario, precios) | **Profundo obligatorio** + Fase 5.5 |
| Requerimiento activo en `<RUTA_PLANNING>` para este código | Leer `spec.md` y `design.md` antes de la Fase 1 |

Si hay duda entre modos: **profundo**.

### Fase 1 — Reconstruir el contexto

Leer antes de opinar: archivo (o sección con `offset`/`limit` si >100 líneas), puntos de
entrada (quién llama y con qué), consumidores del retorno/efecto, contratos públicos
(DTOs, schemas, APIs), tests existentes (sobre todo los que cubren lo cuestionado),
comentarios, config relacionada y el síntoma concreto que motivó la pregunta.

**Git, en este orden** (`git blame` no prueba intención — ver siempre el commit completo):

```bash
git log --all -- <archivo>
git log -S"<fragmento>" --all
git log -G"<patrón>" --all
git blame <archivo>
git show <commit>
git diff <commit>~1 <commit> -- <archivo>
```

**Si es un Stored Procedure (T-SQL):**
- ¿Existe igual en `<MCP_TEST>` y `<MCP_PROD>`? (cuerpo, catálogos y config pueden diferir entre entornos).
- ¿Hay un sucesor "V2"/sufijo de versión?
- ¿Forma parte de un pipeline? (qué lo llama y qué llama él).
- `#temp`/`@table` que dependan de la transacción externa; `SET NOCOUNT ON`; `TRY/CATCH` con `ROLLBACK`; `NOLOCK` ¿intencional?

### Fase 2 — ¿Por qué se hizo así?

| Nivel | Criterio |
|-------|----------|
| **Confirmada** | Evidencia directa: código, tests, docs, comentarios, ticket, commit message |
| **Probable** | Consistente con arquitectura y comportamiento, sin declaración explícita |
| **Especulativa** | Técnicamente posible, sin evidencia suficiente |

Por explicación: evidencia a favor · en contra · archivos/commits · cómo verificarla · confianza.

### Fase 3 — Cuestionar el cambio

- **Encuadre:** ¿es la pregunta correcta o un síntoma? ¿la hipótesis asume algo no verificado? ¿qué observación probaría que mi recomendación está mal, y la busqué?
- **Comportamiento actual:** ¿error o protección intencional? ¿requisito de negocio no documentado? ¿consumidores o tests que dependen de él?
- **Riesgo:** compatibilidad hacia atrás · concurrencia/reintentos/ejecución parcial · seguridad/auditoría · ¿causa raíz o síntoma? · ¿qué pasa si no cambiamos nada? · ¿cambio más pequeño y reversible? · ¿test que falle antes y pase después?
- **SQL/SP:** plan de ejecución · índices que dependan del orden/tipo del resultado · contexto transaccional (rollback en cascada) · jobs/batch que dependan del comportamiento · validación previa en `<MCP_TEST>` · ¿riesgo financiero (comisiones, precios, inventario)?

### Fase 4 — Diagnóstico diferencial

Al menos **tres hipótesis** antes de elegir causa raíz:

| # | Hipótesis | A favor | En contra | Verificación necesaria | Riesgo si la asumimos | Confianza |
|---|-----------|---------|-----------|------------------------|-----------------------|-----------|

### Fase 5 — Veredicto (antes de cualquier edición)

```
### VEREDICTO — Abogado del Diablo
Comportamiento observado: <solo hechos verificables>
Evidencia encontrada: <archivos · funciones · tests · commits · docs>
Razones originales posibles: <tabla Confirmada / Probable / Especulativa>
Hipótesis alternativas: <resumen Fase 4>
Argumento CONTRA el cambio: ...
Argumento A FAVOR del cambio: ...
Riesgos y regresiones: <consumidores · contratos · bordes · impacto financiero>
Alternativas: No modificar | Agregar test | Instrumentar | Cambio mínimo | Refactorizar | Revertir
Recomendación: Mantener | Investigar más | Instrumentar | Cambio mínimo | Refactorizar | Revertir
Confianza: alto | medio | bajo — por qué
Plan de verificación: 1. <comando/test concreto> 2. ...
```

Sin evidencia de la intención original, decirlo: **"No se encontró evidencia suficiente para
determinar la intención original."**

### Modo rápido (casos triviales)

```
EVIDENCIA: <una línea>
RIESGO: <ninguno / bajo / describir>
RECOMENDACIÓN: <cambio mínimo / no cambiar>
```

Si aparece complejidad inesperada → escalar a profundo.

### Fase 6 — Implementación (solo si el usuario la autoriza tras leer el veredicto)

Cambio **mínimo** (sin refactor oportunista), conservar lo no relacionado, test que **falle
antes** del cambio, correr tests y reportar, revisar el diff, señalar evidencia sin verificar
y riesgos residuales. SP: verificar primero en `<MCP_TEST>` y anotar
`-- ✓ MCP [<entorno>] → <resultado>`; confirmar con el usuario antes de PROD. Dentro de un
requerimiento SDD, la implementación es del implementador (`/ejecutar`), no de esta skill.

---

## Fase 5.5 — Verificación adversarial independiente (ambos modos)

El escepticismo auto-reportado no basta: un abogado del diablo real es **independiente**.

**Activar cuando:** SP/función de comisiones, precios, inventario o pedidos · cambio en PROD
irreversible o difícil de revertir · recomendación `alto` sobre evidencia solo `Probable`.

**Cómo:** subagente `Explore` (o `general-purpose`) con mandato de **destruir** la recomendación:

```
Tu único objetivo es REFUTAR esta recomendación: <recomendación>.
Contexto: <archivo/SP/artefacto + evidencia clave>.
Busca: consumidores que se rompan, un requisito de negocio que justifique el
comportamiento actual, un test que dependa de él, un caso de concurrencia o
rollback que la propuesta ignore. Asume que está mal y demuéstralo.
Devuelve: refutaciones concretas con archivo:marcador, o "no encontré refutación".
```

- ≥1 refutación con evidencia → reabrir Fase 4 / la objeción, degradar confianza.
- "no encontré refutación" → subir un escalón la confianza y anotarlo:
  `Verificación adversarial: superada (subagente no halló refutación)`.

Alto riesgo con presupuesto: 3 refutadores con lentes distintas (correctness · impacto
financiero · concurrencia) y exigir mayoría.

## Condiciones de parada (evitar rabbit-hole)

Entregar cuando ocurra lo primero: las 3 hipótesis convergen con evidencia Confirmada · ya
revisaste archivo + consumidores + tests + git sin evidencia nueva · dos búsquedas git
(`-S`/`-G`) seguidas no aportan · el costo de seguir supera el riesgo del cambio. Sin
conclusión firme → `Investigar más` con el siguiente paso concreto.
