# completar

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Cierra, documenta y archiva una tarea SDD terminada.

Este comando prepara el requerimiento para PR, handoff o trazabilidad futura.

No implementa cambios nuevos.

---

## Objetivo

Cerrar formalmente el ciclo SDD asegurando:

- trazabilidad
- documentación mínima
- auditorías registradas
- decisiones técnicas registradas
- evidencia de validación
- estado final consistente
- **Delta del sistema documentado**
- **Source of truth actualizado** (specs/)
- **Knowledge graph actualizado** (_graph.md)

---

## Entrada requerida — Graph

Debe existir la carpeta del requerimiento con:

```txt
<RUTA_PLANNING>\tkt-<id>\
├── _index.md    ← con estado LISTO PARA PR
├── spec.md      ← especificación original
├── design.md    ← diseño técnico
└── impl.md      ← implementación + verificación
```

Leer todos los artefactos para generar el cierre completo.

---

## Flujo obligatorio

1. Leer `_index.md` → validar estado `LISTO PARA PR`.
1.5. **Frescura de la revisión:** hash actual de cada objeto por MCP y
   `python sdd-toolkit/tools/sello.py verificar --tkt-dir <carpeta> --fase revisar --obj <schema.objeto>=<HASH> ...`.
   `VIEJO` → algo cambió después de aprobar: estado → `EN REVISIÓN` (log) y correr `/revisar`.
   `SIN SELLO` → si `Tipo: URGENTE` (hotfix, no pasa por `/revisar`) continuar y anotarlo en el log;
   si no, avisar y pedir confirmación explícita.
2. Leer `spec.md` → criterios de aceptación.
3. Leer `design.md` → plan técnico.
4. Leer `impl.md` → implementación y verificación.
5. Confirmar auditorías aprobadas.
6. Confirmar pruebas ejecutadas.
7. Confirmar documentación/contexto actualizado.
8. **Crear `delta.md`** (qué cambió en el sistema).
8.5. **Ejecutar `compound_loop`** si está configurado en `sdd.config.yaml → tools.compound_loop`:
    ```
    python sdd-toolkit/tools/compound_loop.py --req REQ-<id> --date <fecha>
    ```
    El script vuelca `## Aprendizajes` y `## Decisiones (ADR)` del delta.md a los profiles activos,
    y actualiza `_index.md` (→ ARCHIVADO) y `_graph.md`. Si no está configurado, ejecutar los pasos
    9–11 manualmente.
9. **Merge a `specs/`** — aplicar los deltas al spec del dominio correspondiente.
10. **Actualizar `_graph.md`** — registrar requerimiento, dominios, conexiones, patrones.
11. **Actualizar `_index.md`** con resumen final y estado ARCHIVADO.
12. **Si hay endpoints API o frontend modificados** → preparar y mostrar el mensaje de commit listo para copiar:
    ```
    TKT-<id>: <descripcion concisa del cambio>
    ```
    El commit y push lo ejecuta el desarrollador manualmente. Razón: los cambios se suben en el momento que el equipo decide.
    **Opcional:** si el usuario pide explícitamente "haz el push":
    - Backend/SQL → invocar `git-api` Modo 2 (commit + push).
    - Frontend → invocar `git-frontend` Modo 2.
    - Mobile → invocar `git-mobile` Modo 2 (commit + push).
    Nunca por defecto.

    **Condición:** Si el requerimiento afecta API / frontend / mobile → ejecutar el bloque git correspondiente cuando el usuario lo pida.

    **Inmediatamente después del push exitoso** (Modo 2) → invocar automáticamente el Modo 4 del agente git correspondiente:
    - `git-api` Modo 4 / `git-frontend` Modo 4 / `git-mobile` Modo 4

    para generar la **descripción del PR lista para copiar**
    tomada de `delta.md`: título, base branch, qué se hizo, endpoints/componentes afectados,
    cómo probar, riesgo y rollback. No crear el PR — solo generar el texto.
13. **Post-deploy smoke** (si el SQL ya fue deployado via MCP):
    - Ejecutar 1 query de validación simple por objeto deployado (ej: `SELECT TOP 1` de vista, `EXEC` con params de prueba).
    - Si falla → documentar en `impl.md` como riesgo residual.
14. **Registrar métricas del requerimiento** en `_sdd_evolution.md`:
    - Ruta: `<RUTA_CONTEXTOS>/_sdd_evolution.md`.
    - Si no existe → crearlo desde la plantilla `sdd-toolkit/templates/_sdd_evolution.md` antes de agregar la fila.
    - Agregar una fila en la tabla `## Métricas de proceso` con:
      fecha cierre · TKT · dominio(s) · talla (`size` de `_index.md`) · días desde creación de spec.md
      (ver Log de `_index.md`) · targets en scope · si la auditoría aprobó a la primera ·
      ciclos de `REQUIERE CAMBIOS` · resultado de tests T-SQL (Passed/Failed o N/A) ·
      estructura usada (estándar/extendida).
15. **Invocar `meta-sdd` obligatoriamente** → analizar si este requerimiento reveló patrones nuevos que requieran actualizar rules/comandos/agentes. Documentar resultado en `_index.md` (aunque no haya patrones nuevos: registrar "Sin patrones nuevos detectados").
16. Preparar requerimiento para PR o archivo.
16.5. **Canario:** si `design.md` declaró «Sondas canario», copiarlas a la sección
    «Canario» del `release.md` (base / T+1h / T+1d / umbral / veredicto) para quien despliegue.
17. **`release.md` (esqueleto)** — si hay piezas desplegables: generar el esqueleto desde
    `sdd-toolkit/templates/release.md` en este mismo turno (piezas en orden, rollback ejecutable,
    sección Canario del paso 16.5). Fechas, ambientes, smoke y mediciones canario los llena quien
    despliega (regla `pipeline-release.md`). Sin piezas desplegables → no generarlo.

---

## Estados permitidos

Cambiar estado final en `_index.md` a:

```txt
ARCHIVADO
LISTO PARA PR
```

---

## Reopen post-ARCHIVADO (addon / corrección)

Cuando un REQ ARCHIVADO reabre con trabajo adicional (corrección, addon, ronda extra):

1. Cambiar estado en `_index.md` a `LISTO PARA PR` — no crear un hub nuevo.
2. Crear `correcciones-<fecha>.md` en la carpeta del REQ como spec de la ronda.
3. Ejecutar flujo normal (`/ejecutar` → `/revisar`).
4. Al cerrar: agregar sección `## Ronda N` en el `delta.md` existente — no crear delta nuevo.
5. **No marcar el hub como ARCHIVADO** hasta que el delta consolidado incluya todas las rondas cerradas.
6. Registrar en `_sdd_evolution.md` como sub-cierre: usar sufijo `add-on <fecha>` o `ronda N` en la fila de métricas.

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. `_index.md` no tiene estado `LISTO PARA PR` → indicar estado actual; no cerrar ni generar delta.
2. `impl.md` no existe → no hay implementación verificada; devolver a `/ejecutar`.
3. Hay criterios Must `[M]` sin marcar como verificados en `impl.md` → no archivar.
4. `auditor-sql` o `auditor-codigo` no aparecen como APROBADO en `impl.md` → no archivar.
5. El merge a `specs/` requeriría modificar objetos que no están en `delta.md` → registrar inconsistencia y pedir confirmación.

## Done-state

`/completar` está completo cuando se cumple todo:

- [ ] `delta.md` creado con comportamientos agregados/modificados/eliminados.
- [ ] `specs/<dominio>.md` actualizado con los deltas del requerimiento.
- [ ] `_graph.md` actualizado con entrada del requerimiento (dominios, objetos, patrones).
- [ ] `_index.md` en estado **ARCHIVADO** con log de cierre y resumen final.
- [ ] `meta-sdd` invocado y resultado registrado en `_index.md`.
- [ ] Métricas registradas en `_sdd_evolution.md` (creado desde template si no existía).
- [ ] `compound_loop` ejecutado (o pasos 9–11 manuales si no está configurado).
- [ ] Mensaje de commit generado y copiable (si hay cambios en API o frontend).
- [ ] Descripción de PR generada desde `delta.md` y copiable (si se hizo push).

## Reglas

- No implementar código.
- No modificar lógica funcional.
- No ampliar alcance.
- No aprobar tareas con auditorías fallidas.
- No archivar tareas incompletas.
- No archivar si faltan criterios de aceptación.
- No archivar si hay `REQUIERE CAMBIOS`.
- No archivar si hay `RIESGOSO`.

---

## Formato obligatorio: delta.md

```md
# Delta: tkt-<id>-<slug>

> [← index](_index.md) | [← impl](impl.md)

Documentar qué comportamiento cambió respecto al estado anterior del sistema.
Solo incluir secciones que apliquen.

## Comportamiento agregado

- ...

## Comportamiento modificado

- (Antes): ...
- (Después): ...

## Comportamiento eliminado

- ...

## Objetos SQL afectados

| Objeto | Tipo | Acción |
|--------|------|--------|
| esquema.nombre | SP/Vista/Tabla/Función | Creado/Modificado/Eliminado |

## Endpoints API afectados

| Endpoint | Verbo | Acción |
|----------|-------|--------|
| Dominio/Controller/Action | GET/POST/DEL | Creado/Modificado/Eliminado |

## Para el reviewer

Resumen ejecutivo para quien revise el PR:
- **Qué se hizo**: <1 oración>
- **Por qué**: <requerimiento/motivo>
- **Riesgo**: <bajo/medio/alto + justificación breve>
- **Qué probar**: <cómo verificar que funciona>
- **Rollback**: <cómo revertir si falla>
```

---

## Actualización obligatoria: _index.md

Actualizar la tabla Graph:

```md
| Delta | [delta.md](delta.md) | /completar | Creado |
```

Agregar sección de resumen final:

```md
## Resumen final

### Objetivo cumplido
- ...

### Archivos modificados
- ...

### Auditorías finales
- auditor-sql:
- auditor-codigo:

### Correcciones automáticas aplicadas
- ...

### Pruebas ejecutadas
- T-SQL (`tester-sql`): X/Y passed / No aplica
- C# xUnit (`dotnet test`): PASS / FAIL / No aplica
- API `.http` (`api-tester`): PASS / FAIL / No aplica

### Riesgos residuales
- ...

### Decisiones técnicas relevantes
- ...

### Documentación actualizada
- ...
```

Agregar al Log de estados:

```md
| yyyy-mm-dd | LISTO PARA PR | ARCHIVADO | /completar | Cierre completo, delta documentado |
```

Cambiar estado a:

```md
## Estado

ARCHIVADO
```

---

## Merge a specs/ (Source of Truth)

Ruta: `<RUTA_SPECS>\`

Para cada dominio tocado en `delta.md`:

1. Determinar el dominio funcional del requerimiento (ej: `sales`, `customers`, `wms`, `auth`, `commissions`).
2. Si `specs/<dominio>.md` no existe → crearlo con la plantilla base (ver abajo).
3. Si ya existe → leer el spec actual.
4. Aplicar los deltas:
   - `ADDED` → agregar nuevas secciones/objetos al spec.
   - `MODIFIED` → actualizar las secciones existentes con el nuevo comportamiento.
   - `REMOVED` → eliminar o marcar como deprecado.
5. Agregar entrada en `## Changelog` del spec con fecha, requerimiento y resumen.

### Plantilla base para specs/<dominio>.md

```md
# <Dominio> — System Spec

Source of truth del comportamiento actual del sistema en el dominio <dominio>.

## Objetos SQL

| Objeto | Tipo | Descripción |
|--------|------|-------------|

## Endpoints API

| Endpoint | Verbo | Descripción |
|----------|-------|-------------|

## Reglas de negocio

- ...

## Changelog

| Fecha | Requerimiento | Cambio |
|-------|--------|--------|
```

### Reglas del merge

- **Solo hechos verificados** — no inventar objetos que no estén en el delta.
- **Comportamiento actual** — el spec refleja el estado POST-cambio, no el historial completo.
- **Conciso** — solo lo relevante para entender el comportamiento vigente.
- El spec NO es un changelog; el changelog es una tabla al final para trazabilidad.

---

## Actualización de _graph.md (Knowledge Graph)

Ruta: `<RUTA_GRAPH>`

Si `_graph.md` no existe → crearlo con la plantilla base (ver abajo).

Agregar una entrada por el requerimiento que se cierra:

```md
### [[TKT-<id>]]: <titulo breve>

- **Estado**: ARCHIVADO
- **Dominios**: [[dominio1]], [[dominio2]]
- **Objetos clave**: <objeto1>, <objeto2>
- **Patrones**: <patron aplicado si hubo> (ej: SP masivo, CRUD API, dual-path)
- **Relacionado con**: [[TKT-otro]] (si aplica)
- **Fecha cierre**: yyyy-mm-dd
```

Si hubo decisión técnica no obvia, agregar fila en la sección **Decisiones Técnicas**:

```md
| yyyy-mm-dd | [[TKT-<id>]] | <decisión adoptada> | <alternativa descartada> | <motivo> |
```

Criterio: ¿Si alguien rehace esto desde cero, cometería el mismo error? → agregar. Si es decisión trivial → omitir.

Actualizar la tabla de dominios si el dominio es nuevo:

```md
| [[<dominio>]] | [[TKT-<id>]] | yyyy-mm-dd |
```

### Plantilla base para _graph.md

```md
# Knowledge Graph — SDD

Índice maestro de todos los requerimientos procesados por SDD.
Conecta dominios, patrones y dependencias cross-requerimiento.

## Dominios

| Dominio | Requerimientos | Última actualización |
|---------|---------|---------------------|

## Patrones recurrentes

| Patrón | Requerimientos que lo usan | Notas |
|--------|--------------------:|-------|

## Requerimientos

<!-- Cada requerimiento cerrado agrega su sección aquí -->
```

### Reglas del graph

- Una entrada por requerimiento al cerrar.
- Siempre incluir dominios y objetos clave para búsqueda futura.
- Si se detecta conexión con requerimientos anteriores, agregar bidireccional (en ambos).
- Los patrones se registran solo si aportan valor (no patrones triviales).
- **Links**: formato híbrido `[[wikilink]]` + `[texto](ruta.md)` con `/` (ver regla en `00_sdd_flujo.mdc`).
- **Rutas**: relativas desde `_graph.md` (ej: `specs/ventas.md`, `.planning/tkt-X/spec.md`).
- **NUNCA** usar `\` en rutas.

---

## Resultado esperado

Responder con:

```md
### Cierre SDD completado

- Carpeta: `.planning/tkt-<id>/`
- Artefacto creado: `delta.md`
- Estado final: `ARCHIVADO`

### Graph completo

| Artefacto | Estado |
|-----------|--------|
| _index.md | ARCHIVADO |
| spec.md | Completo |
| design.md | Completo |
| impl.md | Completo |
| delta.md | Completo |

### Resultado

- Objetivo cumplido
- Auditorías aprobadas
- Delta documentado
- specs/<dominio>.md actualizado
- _graph.md actualizado
- Listo para PR o referencia futura

### Riesgos residuales

- ...

### Próximo paso sugerido

- Crear PR
- Deploy QA
- Deploy Staging
- Deploy Producción
```
