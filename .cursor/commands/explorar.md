# explorar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Investiga, analiza y evalúa una idea, problema o hipótesis ANTES de comprometerse a una spec SDD formal.

Este comando es para pensar, no para planear ni implementar.

---

## Objetivo

Dar espacio estructurado para:

- investigar viabilidad técnica
- comparar enfoques alternativos
- analizar código existente relacionado
- entender dependencias antes de definir alcance
- clarificar ambigüedades del requerimiento
- evaluar riesgo antes de comprometer recursos

---

## Cuándo usar

- Requerimiento ambiguo donde no es claro qué construir
- Necesitas entender cómo funciona algo existente antes de proponer cambios
- Múltiples enfoques posibles y quieres compararlos
- Investigación técnica (¿se puede? ¿cómo funciona? ¿qué impacto tiene?)
- El usuario dice "investiga", "analiza", "explora", "compara opciones"

---

## Cuándo NO usar

- El requerimiento ya es claro → ir directo a `/definir`
- Ya existe spec → usar `/avance` para ver estado
- Es un fix trivial → usar `07_guard_planear` directo

---

## Reglas

- No crear spec formal.
- No crear carpeta `tkt-*` en `.planning/`.
- No implementar código.
- No modificar archivos productivos.
- No ejecutar auditorías.
- No cambiar estados SDD.
- Sí leer código, tablas, SPs, vistas, APIs existentes.
- Sí consultar archivos de contexto del proyecto.
- Sí ejecutar queries de lectura (SELECT) para entender datos.
- Sí usar agentes en modo read-only (`auditor-codigo`, `auditor-sql`).

---

## Flujo sugerido (flexible)

No es obligatorio seguir todos los pasos. Adaptar al tipo de exploración:

1. Entender el problema o pregunta.
2. **Leer contexto cross-requerimiento**:
   - Buscar `<RUTA_CONTEXTOS>\specs\<dominio>.md` → estado actual del sistema en dominios relevantes.
   - Buscar `<RUTA_GRAPH>` → requerimientos previos en el mismo dominio, patrones usados, conexiones.
   - Esto evita re-investigar cosas ya documentadas.
3. Identificar código/objetos relacionados.
4. Leer y analizar lo existente.
5. Si aplica, comparar enfoques.
6. Documentar hallazgos.
7. Recomendar siguiente paso.

---

## Salida esperada

Responder con formato libre pero estructurado:

```md
### Exploración: <título corto>

**Pregunta / Hipótesis**
- ...

**Hallazgos**
- ...

**Código/Objetos analizados**
- ...

**Opciones identificadas**

| Opción | Pros | Contras | Riesgo |
|--------|------|---------|--------|
| A: ... | ...  | ...     | Bajo   |
| B: ... | ...  | ...     | Medio  |

**Recomendación**
- ...

**Siguiente paso**
- `/definir` si la idea está clara
- `/explorar` más profundo si falta contexto
- Descartar si no es viable
```

---

## Persistencia (opcional)

Si la exploración produce hallazgos valiosos que deben sobrevivir la conversación:

- Guardar en: `<RUTA_PLANNING>\_exploraciones\<slug>.md`
- Formato libre, no es spec formal
- Puede referenciarse después desde `/definir`

Si la exploración es efímera (solo para decidir en el momento), no guardar nada.
