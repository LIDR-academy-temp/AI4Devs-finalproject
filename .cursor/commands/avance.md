# avance

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Revisa el estado actual de una o todas las tareas SDD y determina el siguiente paso válido.

No implementa cambios.

---

## Objetivo

Dar visibilidad del avance SDD:

- **Sin parámetro**: panorama de TODOS los requerimientos activos (no archivados)
- **Con requerimiento ID**: detalle de un requerimiento específico
- estado actual
- **graph de artefactos** (qué existe, qué falta)
- pendientes
- auditorías faltantes
- pruebas faltantes
- riesgos abiertos
- siguiente comando recomendado

---

## Entrada requerida — Graph

Carpeta base:

```txt
<RUTA_PLANNING>\
```

### Modo multi-requerimiento (sin parámetro)

1. Listar todas las carpetas `tkt-*` en `.planning/`.
2. Leer `_index.md` de cada una.
3. Filtrar: mostrar solo requerimientos NO archivados.
4. Ordenar por última actualización (más reciente primero).

### Modo requerimiento específico (con ID)

Leer `_index.md` del requerimiento indicado como fuente primaria de estado.

---

## Flujo obligatorio

1. Leer `_index.md` → estado actual y tabla Graph.
2. Verificar existencia física de cada artefacto (spec.md, design.md, `*PruebasUnitarias.sql`,
   impl.md, `TKT-<Numero>-APIS.md` si hubo endpoints, delta.md, release.md) y el estado de los
   sellos (`sdd-toolkit/tools/sello.py verificar`).
3. Comparar estado declarado vs artefactos existentes.
4. Revisar criterios de aceptación (si spec.md existe).
5. Revisar implementación (si impl.md existe).
6. Detectar inconsistencias o bloqueos.
7. Determinar siguiente comando válido.

---

## Mapa de estados

```txt
(sin spec)             → /explorar o /definir
SPEC PENDIENTE         → /diseñar
LISTO PARA EJECUTAR    → /ejecutar
EN REVISIÓN            → /revisar
LISTO PARA PR          → /completar
REQUIERE CAMBIOS       → /ejecutar
REQUIERE DECISIÓN      → pedir decisión del usuario
RIESGOSO               → revisión manual
ARCHIVADO              → sin acción
```

---

## Promoción de tkt-temp

Si la carpeta es `tkt-temp` y ya se conoce el ID real:

1. Renombrar carpeta `tkt-temp` → `tkt-<id>`
2. Actualizar títulos internos en todos los artefactos existentes
3. Actualizar `_index.md` (requerimiento, graph links)

---

## Validaciones obligatorias

Verificar:

- existencia de `_index.md`
- consistencia entre estado declarado y artefactos existentes
- criterios de aceptación (en spec.md)
- auditorías obligatorias (en impl.md)
- pruebas registradas
- documentación/contexto actualizado

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. `<RUTA_PLANNING>` no existe → indicar que no hay requerimientos SDD activos; no intentar leer carpetas.
2. Un requerimiento tiene estado inconsistente (declarado ARCHIVADO pero artefactos incompletos) → reportar la inconsistencia, no silenciarla.
3. Se detecta carpeta `tkt-temp` con ID real conocible → sugerir `/avance tkt-temp` para promover antes de reportar.

## Done-state

`/avance` está completo cuando se cumple todo:

- [ ] Todos los requerimientos no-archivados listados con estado actual y siguiente comando.
- [ ] Inconsistencias entre estado declarado y artefactos físicos detectadas y reportadas.
- [ ] Modo requerimiento específico: pendientes y bloqueos listados explícitamente.

## Reglas

- No implementar código.
- No modificar archivos productivos.
- No cambiar estados arbitrariamente.
- No aprobar requerimientos automáticamente.
- No ocultar pendientes.
- No ignorar hallazgos de auditoría.

---

## Resultado esperado

### Modo multi-requerimiento (sin parámetro)

```md
### Requerimientos activos SDD

| Requerimiento | Estado | Último cambio | Siguiente paso |
|--------|--------|---------------|----------------|
| tkt-<id> | <ESTADO> | yyyy-mm-dd | /<comando> |
| tkt-<id> | <ESTADO> | yyyy-mm-dd | /<comando> |

Total: X activos, Y archivados
```

### Modo requerimiento específico

```md
### Estado SDD — tkt-<id>

- Carpeta: `.planning/tkt-<id>/`
- Estado actual: `<ESTADO>`

### Graph de artefactos

| Artefacto | Existe | Estado |
|-----------|:------:|--------|
| _index.md | ✅/❌ | ... |
| spec.md | ✅/❌ | ... |
| design.md | ✅/❌ | ... |
| impl.md | ✅/❌ | ... |
| delta.md | ✅/❌ | ... |

### Dependencias

- <tkt-X: estado> (si hay)

### Checkpoint

<última acción registrada + qué falta para avanzar>

### Pendientes

- ...

### Siguiente paso recomendado

`/<comando>`

### Motivo

- ...
```
