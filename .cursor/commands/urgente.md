# urgente

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Fix urgente de producción con trazabilidad SDD mínima.

Salta diseño y revisión formal. Documenta SIEMPRE.

---

## Objetivo

Resolver un problema en producción lo más rápido posible sin perder trazabilidad.

Genera: `_index.md` + `spec.md` (mínimo) + `impl.md` + `delta.md` — todo en un solo flujo.

---

## Cuándo usar

- Bug en producción que necesita fix inmediato
- El usuario dice "urgente", "producción", "se cayó", "hotfix"
- No hay tiempo para el flujo completo `/definir → /diseñar → /ejecutar`

---

## Cuándo NO usar

- El problema no es urgente → usar flujo SDD normal
- Es una feature nueva → `/definir`
- No se entiende el problema → `/explorar`

---

## Flujo obligatorio (todo en un paso)

1. Entender el problema (1-2 oraciones).
2. Crear carpeta `tkt-<id>` (o `tkt-hotfix-<slug>` si no hay ID).
3. Crear `_index.md` con estado `URGENTE EN CURSO`.
4. Crear `spec.md` mínimo (solo problema + fix esperado + criterio de éxito).
5. Leer `specs/<dominio>.md` y `_graph.md` si existen (contexto rápido).
6. **Implementar el fix** — auditoría automática aplica igual.
7. Crear `impl.md` con lo que se hizo.
8. Crear `delta.md` con lo que cambió.
9. Actualizar `_index.md` → estado `LISTO PARA PR`.
10. **Tras apagar el fuego, correr `/completar`** para fundir el hotfix al
    source-of-truth: merge a `specs/`, actualizar `_graph.md` e invocar `meta-sdd`.
    Un hotfix que no pasa por `/completar` queda fuera del conocimiento del sistema.

No crear `design.md` — se omite por urgencia.

---

## Formato: spec.md (mínimo hotfix)

```md
# Hotfix: tkt-<id>-<slug>

> [← index](_index.md)

## Problema

<qué está pasando en producción>

## Fix esperado

<qué debe pasar después del fix>

## Criterio de éxito

- [ ] <una línea verificable>
```

---

## Formato: _index.md (hotfix)

```md
# tkt-<id>-<slug>

## Estado

URGENTE EN CURSO

## Tipo

URGENTE

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /urgente | Creado (mínimo) |
| Design | — | — | Omitido (urgente) |
| Impl | [impl.md](impl.md) | /urgente | Creado |
| Delta | [delta.md](delta.md) | /urgente | Creado |

## Metadata

- requerimiento: tkt-<id>
- slug: <slug>
- tipo: URGENTE
- created: yyyy-mm-dd
- updated: yyyy-mm-dd

## Log de estados

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| yyyy-mm-dd | — | URGENTE EN CURSO | /urgente | Fix urgente producción |
| yyyy-mm-dd | URGENTE EN CURSO | LISTO PARA PR | /urgente | Fix aplicado |
```

---

## Auditoría

La auditoría automática (auditor-sql + auditor-codigo, y `auditor-seguridad`
si hay endpoints o SQL con input externo) aplica igual que en `/ejecutar`.
Un hotfix toca producción: es donde MENOS se puede saltar la auditoría.

Si la auditoría encuentra problemas críticos → corregir antes de cerrar.
Si encuentra problemas menores → documentar en `impl.md` como deuda técnica.

---

## Reglas

- Siempre crear los 4 artefactos (_index, spec, impl, delta).
- Nunca saltarse el delta — es la trazabilidad mínima.
- Auditoría aplica igual.
- Si el fix es más complejo de lo esperado → escalar con `/escalar` o convertir a flujo SDD normal.

---

## Resultado esperado

```md
### Urgente completado — tkt-<id>

- Carpeta: `.planning/tkt-<id>/`
- Artefactos: _index.md + spec.md + impl.md + delta.md
- Estado: LISTO PARA PR
- Design: omitido (urgente)

### Delta

- <resumen de 1-2 líneas de lo que cambió>

### Siguiente paso

- Crear PR
- Deploy urgente
- Correr `/completar` para fundir el hotfix al source-of-truth (specs/_graph/meta-sdd)
```
