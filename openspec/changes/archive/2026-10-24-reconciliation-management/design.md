# Design

## Context

Existen la API con autenticación y la tabla `reconciliations` del readme §3 (`config` y `stats` como JSON, `status` como enum). Este change crea el módulo de conciliaciones y las primeras pantallas de negocio; los módulos de importación y motor se colgarán de él.

## Goals / Non-Goals

**Goals:**
- CRUD mínimo (crear, listar, detalle) con validaciones y aislamiento por empresa.
- Máquina de estados explícita y reutilizable por el motor.
- Listado y wizard paso 1 en el frontend con la estructura de rutas definitiva.

**Non-Goals:**
- Editar o borrar conciliaciones (no está en las HU del MVP).
- Ejecutar el motor o calcular `stats` (change `matching-engine-core`).
- Subida de archivos (change `file-import-and-column-mapping`).

## Decisions

1. **`config` como JSON tipado con DTO y valores por defecto aplicados en el servicio**, no en la BD. Permite añadir parámetros (p. ej. comisión por marca en E3) sin migración. Alternativa descartada: columnas individuales; cada parámetro nuevo exige migración.
2. **Máquina de estados como función pura `assertTransition(from, to)`** en el servicio de conciliaciones, única vía para cambiar `status`. Alternativa descartada: actualizar `status` libremente desde cada módulo; aparecerían estados inconsistentes al fallar el motor.
3. **Paginación por offset (`page`, `pageSize` máx. 100)** con respuesta `{ items, total, page, pageSize }`. Alternativa descartada: cursor; innecesario para cientos de conciliaciones por empresa.
4. **Filtro de período por solapamiento** (`periodStart ≤ to AND periodEnd ≥ from`). Alternativa descartada: contención estricta; ocultaría conciliaciones que cruzan el rango.
5. **Porcentaje conciliado leído de `stats.matchedPercent`**, nulo hasta la primera ejecución. Alternativa descartada: calcularlo en el listado con agregaciones; coste innecesario en cada carga.
6. **Frontend: rutas `/reconciliations` y `/reconciliations/new` (wizard) y `/reconciliations/:id`** con TanStack Query para listado y detalle. El wizard se implementa como estado local por pasos; en este change solo el paso 1 crea la conciliación y navega al detalle.

## Risks / Trade-offs

- [Parámetros en JSON sin validación en BD] → DTO con class-validator y lectura siempre a través de un tipo con defaults; test de esquema.
- [Estados que el motor necesite y no estén previstos] → la máquina de estados es una tabla; añadir una transición es trivial y queda testeada.

## Open Questions

- Si CLOSED debe exigir que no queden pendientes sin excepción (propuesta: no en el MVP; CLOSED es un candado manual).
