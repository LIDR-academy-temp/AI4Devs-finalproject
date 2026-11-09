﻿# diseñar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Genera una propuesta técnica basada en una spec SDD previamente refinada.

Este comando transforma una spec en un plan técnico ejecutable, pero todavía NO implementa cambios productivos.

---

## Objetivo

Convertir una spec refinada en:

- estrategia técnica
- propuesta de arquitectura
- impacto técnico
- archivos probables
- plan de implementación
- plan de pruebas
- riesgos
- validaciones
- orden de ejecución

---

## Entrada requerida — Graph

Debe existir la carpeta del requerimiento con:

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← con estado SPEC PENDIENTE
└── spec.md      ← especificación refinada
```

Leer `_index.md` primero para confirmar estado, luego `spec.md` para el detalle.

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado `SPEC PENDIENTE`.
2. Leer `spec.md` → validar criterios de aceptación.
3. Analizar arquitectura relacionada.
4. Analizar impacto técnico.
5. Detectar módulos afectados y dependencias.
6. Detectar riesgos.
7. Definir estrategia de implementación.
8. Definir estrategia de rollback si aplica.
9. Definir pruebas necesarias (shift-left, Unidad 7): matriz con Happy + **≥1 caso
   NEGATIVO/de error obligatorio** (`TC-ERR-x`), characterization si es Refactor, y
   **mutation en paths críticos** (lógica de negocio/financiera/gates). El humano
   define el *qué*; prohibido Test Theater. Esto se materializará en `/ejecutar`
   (fase PROBAR) desde `sdd-toolkit/templates/pruebas.sql`.
10. Definir agentes requeridos.
11. Crear `design.md` en la carpeta del requerimiento.
11.5. **Pasada adversarial obligatoria** — invocar la skill `/abogado-del-diablo`
    sobre el `design.md`: cuestionar la alternativa descartada, revisar la escalera de
    decisión (¿objeto nuevo que ya existe?), alimentar el Pre-mortem y detectar
    llamadores fuera del análisis de impacto. Es un paso del proceso, no opcional:
    encuentra modos de falla fuera de la vista del autor. La profundidad escala con la
    talla; nunca se salta. Las objeciones se acogen o se rebaten.
12. Actualizar `_index.md`: estado → `DISEÑO PENDIENTE REVISIÓN`, marcar design como Creado, agregar log.
    **El estado solo pasa a `LISTO PARA EJECUTAR` cuando el usuario revisa `design.md` y lo confirma explícitamente — el generador no hace esa transición automáticamente.**

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. `_index.md` no tiene estado `SPEC PENDIENTE` → indicar estado actual, no diseñar.
2. `spec.md` no tiene criterios de aceptación verificables → devolver a `/definir`.
3. Hay preguntas abiertas sobre Must `[M]` no resueltas → documentar en design como BLOQUEADO, no asumir respuesta.
4. El alcance requiere coordinar >2 instancias sin `planificador-requerimiento` → escalar antes de generar design.
5. Detectas un riesgo grave sin estrategia de rollback posible → documentar y esperar decisión del usuario; no continuar.

## Done-state

`/diseñar` está completo cuando se cumple todo:

- [ ] `design.md` creado con todos los campos obligatorios.
- [ ] Escalera de decisión definida por cada objeto SQL/API (peldaño 3/4/5).
- [ ] Plan de pruebas definido (T-SQL unitarias + API `.http` + QA si aplica) con ≥1 caso negativo (`TC-ERR-x`) y mutation en paths críticos.
- [ ] Pasada `/abogado-del-diablo` ejecutada; objeciones acogidas o rebatidas.
- [ ] Estrategia de rollback documentada (si el requerimiento modifica datos).
- [ ] `_index.md` actualizado a `DISEÑO PENDIENTE REVISIÓN` con log de estado. (La transición a `LISTO PARA EJECUTAR` requiere confirmación explícita del usuario.)
- [ ] Ninguna pregunta abierta sobre Must `[M]` sin respuesta.

## Agentes permitidos

Usar solo cuando aplique:

- planificador-requerimiento
- desarrollador-api
- desarrollador-sql
- desarrollador-flutter  ← si hay mobile en scope

NO ejecutar todavía:

- auditor-codigo
- auditor-sql
- auditor-flutter
- corrector-revision

---

## Formato obligatorio: design.md

Generar `design.md` siguiendo **exactamente** la plantilla canónica
[`sdd-toolkit/templates/design.md`](../../sdd-toolkit/templates/design.md) como
**fuente única de la estructura**. No se duplica el esqueleto aquí: si la plantilla
evoluciona, este comando la hereda sin editarse.

Esa plantilla incluye — y son obligatorios cuando aplican: Estrategia técnica con
**Escalera de decisión** (peldaño por capacidad), secciones por target en scope,
Orden de implementación con verificación por paso, **Plan de pruebas** (una fila
`TC-INV-x` por invariante + Ratio Testing Trophy + **Characterization/paridad solo
Refactor** + Triangulación + Mutation), Estrategia de rollback, Pre-mortem (solo
riesgo alto), Decisiones técnicas y Autoverificación antes del handoff.

### Selección de agentes (referencia al llenar la sección correspondiente)

- **Implementación:** `desarrollador-api` · `desarrollador-sql` · `desarrollador-flutter` (mobile)
- **Auditoría:** `auditor-sql` · `auditor-codigo` (SQL/C#/JS/Python) · `auditor-flutter` (Dart) · `corrector-revision`

---

## Actualización obligatoria: _index.md

Actualizar la tabla Graph:

```md
| Design | [design.md](design.md) | /diseñar | Creado |
```

Agregar al Log de estados:

```md
| yyyy-mm-dd | SPEC PENDIENTE | LISTO PARA EJECUTAR | /diseñar | Design creado |
```

Cambiar estado a:

```md
## Estado

LISTO PARA EJECUTAR
```

---

## Pasada adversarial — abogado del diablo

Paso **11.5 del flujo (obligatorio)**: `/abogado-del-diablo` reta el design antes del
cierre (detalle en la skill). Nunca se salta; profundidad según talla. También on-demand.

## Reglas

- No implementar código.
- No modificar archivos productivos.
- No ejecutar auditorías.
- No corregir bugs todavía.
- No generar PR.
- Mantener cambios mínimos.
- Respetar arquitectura existente.
- Detectar riesgos antes de implementar.
- Si el impacto es ambiguo, agregar preguntas abiertas.
- No aprobar automáticamente estrategias riesgosas.

---

## Resultado esperado

Responder con:

```md
### Propuesta generada

- Carpeta: `.planning/tkt-<id>/`
- Artefacto creado: `design.md`
- Estado: `LISTO PARA EJECUTAR`

### Impacto técnico

- ...

### Riesgos principales

- ...

### Agentes requeridos

- ...

### Siguiente comando

`/ejecutar`
```
