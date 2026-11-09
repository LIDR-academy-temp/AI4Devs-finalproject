# escalar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Formaliza un handoff manual cuando una tarea SDD queda bloqueada por riesgo, ambigüedad o falta de contexto.

No implementa cambios. Solo documenta el bloqueo y prepara la información para revisión humana.

---

## Cuándo usar

- Auditoría devolvió **RIESGOSO** y no hay corrección clara
- Decisión funcional/negocio que el agente no puede tomar
- Falta contexto esencial que solo el usuario o un DBA puede proveer
- Conflicto entre requerimientos o reglas
- Cambio destructivo que requiere aprobación explícita
- Integración externa con riesgo de side-effects en producción

---

## Entrada requerida

Spec del requerimiento (si existe):

```txt
<RUTA_PLANNING>\tkt-<id>\spec.md
```

O contexto del bloqueo actual si no hay spec formal.

---

## Flujo obligatorio

1. Identificar el motivo exacto del bloqueo.
2. Documentar qué se intentó y por qué falló.
3. Listar opciones conocidas (si las hay).
4. Indicar qué información o decisión se necesita.
5. Actualizar spec si existe (estado → `REQUIERE DECISIÓN` o `RIESGOSO`).
6. Presentar resumen al usuario.

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. El motivo del bloqueo no está claramente definido → pedir al usuario que lo concrete; no escalar un bloqueo vago.
2. El bloqueo es resoluble con información ya disponible en el contexto → resolver directamente; no escalar innecesariamente.
3. Ya existe un escalamiento previo para el mismo bloqueo en `_index.md` → referenciar el anterior en lugar de duplicar.

## Done-state

`/escalar` está completo cuando se cumple todo:

- [ ] Motivo del bloqueo documentado con suficiente detalle para que el usuario pueda decidir sin preguntar más.
- [ ] Al menos 1 opción identificada con riesgos (idealmente 2-3).
- [ ] Estado del requerimiento actualizado a `REQUIERE DECISIÓN` o `RIESGOSO` en `_index.md` con log.
- [ ] Información específica que el usuario debe proveer claramente listada.

## Reglas

- No tomar decisiones de negocio.
- No ejecutar cambios riesgosos sin aprobación.
- No inventar soluciones cuando falta contexto.
- No aprobar automáticamente.
- No bloquear innecesariamente (solo escalar cuando realmente se necesite).

---

## Resultado esperado

```md
### Escalamiento SDD

- Requerimiento: tkt-<id>
- Motivo: RIESGOSO / REQUIERE DECISIÓN / FALTA CONTEXTO
- Spec: `<ruta>` (o "sin spec formal")

### Bloqueo

- Descripción del problema:
- Qué se intentó:
- Por qué no se puede continuar:

### Opciones identificadas

1. ...
2. ...
3. (riesgos de cada una)

### Información necesaria

- ...

### Acción requerida del usuario

- Elegir opción
- Proveer contexto faltante
- Aprobar riesgo explícitamente
- Consultar con DBA / equipo

### Siguiente paso tras decisión

`/ejecutar` o `/revisar` según el estado
```
