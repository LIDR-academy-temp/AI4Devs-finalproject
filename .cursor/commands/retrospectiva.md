# retrospectiva

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Analiza todos los requerimientos cerrados y genera un reporte de tendencias del proceso SDD.

No implementa cambios. Solo lee y analiza.

---

## Objetivo

Cerrar el loop de mejora continua: identificar patrones, fricciones y oportunidades
de mejora en el proceso SDD a partir de datos reales de requerimientos cerrados.

---

## Entrada requerida

| Fuente | Qué leer |
|--------|----------|
| `<RUTA_GRAPH>` (`_graph.md`) | Lista de requerimientos, dominios, patrones registrados |
| `<RUTA_CONTEXTOS>/_sdd_evolution.md` | Métricas de proceso por requerimiento |
| `<RUTA_PLANNING>/tkt-*/\_index.md` | Estado y metadata de cada requerimiento (talla, fechas, estructura) |

Si `_sdd_evolution.md` no existe → indicar al usuario que debe cerrar al menos un requerimiento con `/completar` para tener datos.

---

## Flujo obligatorio

1. Leer `_graph.md` → tabla de requerimientos: cuántos ARCHIVADOS, EN PROGRESO, REQUIERE CAMBIOS.
2. Leer `_sdd_evolution.md` → tabla de métricas.
3. Para cada requerimiento ARCHIVADO: leer su `_index.md` → extraer talla, días, targets, ciclos de auditoría.
4. Calcular:
   - Dominios más activos (por frecuencia de requerimientos).
   - Talla promedio real vs. talla asignada (detección de mala estimación sistemática).
   - Agentes con más ciclos REQUIERE CAMBIOS (indica área de mejora en guardrails/profiles).
   - Tiempo promedio spec→cierre por talla (XS/S/M/L).
   - Ratio auditoría a la primera vs. ciclos correctivos.
5. Identificar los 3 requerimientos que más se desviaron del plan (días reales >> esperado por talla).
6. Comparar patrones de `_graph.md` con guardrails activos — ¿hay patrones recurrentes no cubiertos por ninguna regla?
7. Actualizar sección `## Tendencias` de `_sdd_evolution.md` con el análisis calculado.
8. Generar recomendaciones accionables (máx 5).

---

## Stop conditions — DETENTE aquí

1. `_graph.md` no existe o no tiene requerimientos ARCHIVADOS → no hay datos suficientes; indicar cuántos requerimientos cerrar mínimo.
2. `_sdd_evolution.md` no existe → pedir que se cierre al menos 1 requerimiento con `/completar`.
3. Menos de 3 requerimientos ARCHIVADOS → reportar solo lo disponible, sin tendencias estadísticamente válidas; marcarlo explícitamente.

---

## Formato del reporte

```md
### Retrospectiva SDD — <fecha>

**Período:** <fecha primer requerimiento> → <fecha último cierre>
**Requerimientos analizados:** <N> archivados · <M> en progreso

---

#### Salud del proceso

| Métrica | Valor | Referencia |
|---------|-------|------------|
| Tiempo promedio spec→cierre | X días | — |
| Auditoría aprobada a la 1ª | X% | Meta: >70% |
| Ciclos REQUIERE CAMBIOS promedio | X | Meta: <1 por requerimiento |
| Requerimientos bien dimensionados (talla vs días) | X% | — |

---

#### Dominios más activos

| Dominio | Requerimientos | Talla promedio |
|---------|---------|----------------|
| ...     | N       | M              |

---

#### Agentes con más fricciones

| Agente | Ciclos REQUIERE CAMBIOS | Causa más frecuente |
|--------|------------------------|---------------------|

---

#### Requerimientos fuera de estimación (top 3)

| TKT | Talla | Días reales | Factor | Causa probable |
|-----|-------|-------------|--------|----------------|

---

#### Patrones recurrentes sin guardrail

- <patrón detectado en múltiples requerimientos que no está cubierto por ninguna regla activa>

---

#### Recomendaciones

1. <acción concreta — qué profile/guardrail/agente actualizar y por qué>
2. ...
(máx 5)

---

#### Próximo paso sugerido

- Invocar `meta-sdd` con las recomendaciones anteriores para propagar a profiles/guardrails.
```

---

## Fase de cosecha (Harvest + Apply) — ejecutar después del reporte

Después del reporte de tendencias, y SOLO en `/retrospectiva` (nunca en `/completar`):

### Paso H1 — Identificar clusters maduros

Agrupar observaciones de `_sdd_evolution.md` por campo `Tema`. Listar clusters con:
- Cuenta de observaciones por `Tema` ≥ 3, O
- Cuenta ≥ 2 con al menos una marcada manualmente como madura.

### Paso H2 — Presentar lote al usuario

Formato de presentación (un bloque por cluster):

```md
### Propuesta de cosecha — Tema: <tag>

- Observaciones: #N, #M, #K (TKT-x, TKT-y, TKT-z)
- Patrón: <descripción del patrón en 1-2 líneas>
- Destino propuesto: <profiles/<target>.md § Pitfalls | templates/<file>.md | .cursor/rules/...>
- Cambio concreto: <qué texto agregar/modificar en ese destino>
```

Presentar el lote completo y esperar aprobación explícita del usuario. NO aplicar sin OK.

### Paso H3 — Aplicar aprobados

Por cada cluster aprobado por el usuario:

1. Editar el artefacto destino con el cambio concreto.
2. Añadir back-reference: `<!-- origen: _sdd_evolution obs #N (TKT-x, TKT-y) -->`.
3. Marcar cada observación origen en `_sdd_evolution.md`:
   `- Estado: APLICADA (retro <YYYY-MM-DD> → <destino>)`.

### Paso H4 — Reportar resultado

```md
### Cosecha — <fecha>
- Clusters presentados: N
- Aprobados y aplicados: M (listar Tema y destino)
- Rechazados: K (listar Tema y motivo si el usuario lo indicó)
- Observaciones marcadas APLICADA: total acumulado
```

## Reglas

- Solo analizar requerimientos con estado `ARCHIVADO` — los en progreso distorsionan promedios.
- No inventar datos: si una métrica no está en `_sdd_evolution.md`, reportar como "sin dato".
- Las recomendaciones deben ser accionables (qué archivo editar, qué regla agregar).
- No modificar artefactos de requerimientos — solo actualizar `_sdd_evolution.md` sección Tendencias.
- La cosecha (H1-H4) SOLO escribe en perfiles/plantillas/reglas SDD, nunca en artefactos de tickets.
- La aplicación requiere OK explícito del usuario: NUNCA aplicar en lote sin confirmación.
- Reporte previo ("no implementa cambios") aplica al análisis de tendencias; la cosecha aprobada puede editar destinos del landing map (perfiles, plantillas, reglas).
