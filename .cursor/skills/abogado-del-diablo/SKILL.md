---
name: abogado-del-diablo
description: Pasada adversarial sobre el requerimiento o el diseño SDD. Reta supuestos, marca afirmaciones sin evidencia como (asumido), busca el contraejemplo y el modo de falla más fuerte antes de comprometer spec.md o design.md. Se invoca por defecto en /definir y /diseñar (gated por tamaño de ticket). Overlay Claude Code — la portable del plugin es el resumen corto en sdd-methodology-plugin/skills/abogado-del-diablo.
disable-model-invocation: false
allowed-tools: [Read, Grep, Glob, Bash, Task]
---

# Abogado del Diablo — Pasada adversarial

> **Host overlay (Claude Code).** No implementa ni reescribe artefactos: los
> **cuestiona**. Su salida son objeciones accionables; el autor decide qué acoger.
> Respeta la disciplina de `05_sdd_comunicacion` / `austero` (directo, sin relleno).

`[abogado ON]`

## Cuándo corre (paso integral, no opcional)

- **Obligatorio** dentro del proceso: paso 12.5 de `/definir` (sobre `spec.md`) y paso
  11.5 de `/diseñar` (sobre `design.md`). Es parte del flujo, no un extra.
- **Nunca se salta.** La profundidad escala con la talla del ticket: en un cambio
  trivial hace una pasada rápida y reporta "sin objeciones"; en uno grande o con
  invariantes, la pasada completa. Existe para encontrar lo que el autor no ve.
- On-demand además: invocar `/abogado-del-diablo` en cualquier fase.

## Antes de objetar — cargar historia del dominio

Para el dominio activo del ticket, leer:
1. `_sdd_evolution.md` del proyecto — sección `## Observaciones de evolución`: buscar
   entradas con el mismo dominio/objeto/tag. Citar las relevantes como evidencia dura
   ("obs #N de TKT-x ya documentó esto").
2. Sección `## Pitfalls comunes` del perfil del target (`sdd-toolkit/profiles/<target>.md`).
3. Sección `## Learnings (acumulado)` del mismo perfil.

Si no existe `_sdd_evolution.md` o el perfil, omitir este paso y seguir.
Esta lectura escala con la talla: trivial = una pasada rápida; grande = lectura completa.

## En /definir — retar el QUÉ

1. Cada criterio de aceptación: ¿mide algo verificable o es un adjetivo? Poke-holes:
   happy path → edge case → supuesto oculto → gap.
2. Marca `(asumido)` toda afirmación sin evidencia en el requerimiento o en MCP.
3. Bug Fix: ¿la causa raíz está confirmada con evidencia, o es todavía un síntoma?
4. ¿Qué invariante NO listado podría romperse? Propón los `INV-x` faltantes.
5. El contraejemplo: un caso real donde el criterio, tal como está escrito, falla.
6. Historia: ¿alguna obs/pitfall del dominio cargada arriba aplica a este spec? Citarla.

## En /diseñar — retar el CÓMO

1. Estrategia elegida: ¿cuál es la alternativa más fuerte descartada y por qué NO se
   eligió? Si no está justificada en el design, objétala.
2. Escalera de decisión: ¿algún objeto NUEVO que en realidad ya existe o se resuelve
   con cambio mínimo (peldaño 2-4)?
3. Pre-mortem: si esto falla en PROD, ¿cuál es la causa más probable? Alimenta la
   sección Pre-mortem del design.
4. ¿Qué prueba FALTA para que un cambio erróneo pase inadvertido? (conecta con la
   sección Mutation de `18_guard_tdd`).
5. Regresión: ¿qué llamador del objeto no aparece en el análisis de impacto?
6. Historia: ¿alguna obs/pitfall del dominio (cargada en "Antes de objetar") aplica
   al diseño propuesto? Citarla con número de obs y TKT de origen.

## Reglas de la pasada

- Máximo **5 objeciones**, ordenadas por severidad. Cada una accionable (qué revisar
  o cambiar), no una queja abstracta.
- **No reescribir** el artefacto: solo objetar. El autor lo acoge o lo rebate.
- Si no hay objeción real: decirlo en una línea. **No inventar fricción** — eso
  también entorpece.
- Distinguir objeción sustantiva (rompe un invariante, invalida un criterio) de
  preferencia de estilo; reportar solo lo sustantivo.

## Formato de salida

```
[abogado del diablo · <definir|diseñar>]
1. [Alta] <objeción> → <qué revisar/cambiar>
2. [Media] <objeción> → <acción>
...
Veredicto: <N objeciones sustantivas — o "sin objeciones sustantivas">
```
