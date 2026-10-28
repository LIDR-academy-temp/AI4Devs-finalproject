# analizar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Verifica consistencia cruzada entre `spec.md` y `design.md` **antes** de
implementar. No implementa nada, no corrige nada — solo detecta
inconsistencias y las reporta.

---

## Por qué existe

`design.md` incluye su propia sección "Autoverificación antes del handoff",
pero la corre el mismo Claude que acaba de escribir `spec.md` y `design.md` en
la misma sesión — mismo autor revisando su propio trabajo, el punto ciego
clásico. `/analizar` es la misma verificación corrida como un paso
**independiente**: idealmente en una sesión/chat nueva de Cursor (contexto
fresco, sin haber visto la redacción de `spec.md`/`design.md`), o al menos
como un paso explícito separado en el tiempo de la escritura.

---

## Cuándo usar

- Siempre que el requerimiento sea de complejidad media/alta, o toque invariantes.
- Opcional (no bloqueante) en requerimientos triviales de una sola instancia y sin
  invariantes — usar criterio, no ejecutar por rutina si el requerimiento es un
  cambio de una línea.
- **Nunca** en `/urgente` — el hotfix ya omite `design.md` por diseño.

---

## Entrada requerida — Graph

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← con estado LISTO PARA EJECUTAR
├── spec.md      ← especificación validada
└── design.md    ← diseño técnico
```

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado `LISTO PARA EJECUTAR`.
2. Leer `spec.md` completo (Alcance MoSCoW, Invariantes, Criterios de
   aceptación, Reutilización detectada).
3. Leer `design.md` completo (Escalera de decisión, secciones por target,
   Plan de pruebas, Decisiones técnicas, Autoverificación).
3.5. Si existe `*PruebasUnitarias.sql`: comparar sus IDs y `Expected` con la matriz «Plan de
   pruebas» de `design.md` (fila sin bloque, bloque sin fila o `Expected` distinto = INCONSISTENTE).
4. Ejecutar las 3 verificaciones obligatorias (ver abajo).
5. Si todo pasa → reportar `CONSISTENTE`, no tocar el estado del requerimiento
   (sigue `LISTO PARA EJECUTAR`), sugerir `/ejecutar`.
6. Si algo falla → reportar `INCONSISTENTE` con el detalle exacto de cada
   hallazgo, **no** implementar el fix, sugerir volver a `/diseñar` (o a
   `/definir` si el problema está en `spec.md`).
7. Agregar entrada al Log de `_index.md` con el resultado (sin cambiar el
   campo `## Estado`).

---

## Verificaciones obligatorias

### 1. Cobertura de Must → Criterios de aceptación

Para cada ítem de `spec.md` → `## Alcance (MoSCoW)` → `### Must`:
- ¿Existe al menos un CA marcado `[M]` en `## Criterios de aceptación` que lo
  cubra explícitamente?
- Si un Must no tiene CA `[M]` correspondiente → hallazgo bloqueante.

### 2. Invariantes → TC-INV-x

Para cada fila de `spec.md` → `## Invariantes` (`INV-1`, `INV-2`, ...):
- ¿Existe su CA de regresión `CA-R*` `[M]` en `spec.md`?
- ¿Existe su fila `TC-INV-x` correspondiente en `design.md` → `## Plan de
  pruebas`?
- Si falta cualquiera de los dos → hallazgo bloqueante (un invariante sin
  `TC-INV-x` es exactamente el escenario que la regla de invariantes de
  `methodology.md` quiere prevenir).

### 3. Won't vs implementado

Para cada ítem de `spec.md` → `### Won't`:
- ¿Aparece ese objeto/capacidad implementado en alguna sección
  `database:<instancia>` / `backend:<instancia>` / `frontend:<instancia>` de
  `design.md`?
- Si aparece → hallazgo bloqueante (alcance implementado que el propio spec
  marcó como explícitamente fuera de alcance).

### 4. (complementaria) Checklist de Autoverificación sin marcar

- Si `design.md` → `## Autoverificación antes del handoff` tiene algún ítem
  sin marcar `[x]` → hallazgo, listar cuáles.

---

## Stop conditions — DETENTE aquí

1. `_index.md` no tiene estado `LISTO PARA EJECUTAR` → indicar estado actual,
   no analizar.
2. `design.md` no existe → no hay nada que analizar; devolver a `/diseñar`.
3. `spec.md` no tiene `## Alcance (MoSCoW)` o `## Criterios de aceptación`
   legibles → reportar `BLOQUEADO POR CONTEXTO`, no inventar estructura.

## Done-state

`/analizar` está completo cuando se cumple todo:

- [ ] Las 4 verificaciones corridas contra el contenido real de ambos
      artefactos (no contra una suposición de lo que deberían decir).
- [ ] Cada hallazgo cita la fila/ítem exacto de `spec.md` o `design.md`.
- [ ] `_index.md` tiene una entrada de Log con el resultado.
- [ ] Ningún archivo fue modificado salvo el Log de `_index.md`.

## Reglas

- No implementar código ni modificar `spec.md`/`design.md`.
- No inventar Must, invariantes ni CA que no estén escritos — solo verificar
  lo que ya existe.
- No aprobar con hallazgos bloqueantes pendientes.
- No repetir esta verificación más de una vez por versión de `design.md` — si
  ya se corrió y `design.md` no cambió, remitir al resultado anterior en el
  Log en vez de rehacer el análisis.

---

## Resultado esperado

```md
### Análisis de consistencia — tkt-<id>

- Carpeta: `.planning/tkt-<id>/`
- Resultado: CONSISTENTE / INCONSISTENTE

### Cobertura Must → CA
- [x] / [ ] por cada Must

### Invariantes → TC-INV-x
- [x] / [ ] por cada INV-x

### Won't vs implementado
- Sin colisiones / lista de colisiones

### Autoverificación (design.md)
- Todo marcado / ítems sin marcar

### Siguiente paso
`/ejecutar` (si CONSISTENTE) o `/diseñar` (si INCONSISTENTE, con el detalle de qué corregir)
```
