# FE-ADMIN-CAT-001 — CRUD catálogos admin (mascotas, almacén, visitas, vehículos)

## Estado

**ARCHIVADO**

fecha_spec: 2026-10-27 · fecha_cierre: 2026-10-27

## Graph

| Artefacto | Archivo | Comando | Estado |
|-----------|---------|---------|--------|
| Spec | [spec.md](spec.md) | /definir (ligero) | ✅ |
| Design | — | /diseñar | Omitido (patrón admin existente FE-PAT-002 / mascotas-vehículos) |
| Test SQL | — | /test | N/A |
| Impl | [impl.md](impl.md) | /ejecutar (retro) | ✅ |
| Delta | [delta.md](delta.md) | /completar | ✅ |

## Metadata

- requerimiento: FE-ADMIN-CAT-001
- slug: admin-catalog-crud
- size: L
- branch sugerida: `feature/fe-admin-cat-001-admin-catalog-crud`

## Depende de

- [[FE-CRUD-003]] (páginas admin base) · [[FE-PAT-002]] · [[FE-UX-003]] (toasts)

## Dominios

[[frontend]] · [[mascotas]] · [[almacen]] · [[visitas-areas]] · [[vehiculos]] · [[usuarios]]

## Related

- [specs/mascotas.md](../../specs/mascotas.md) · [specs/almacen.md](../../specs/almacen.md) · [specs/visitas-areas.md](../../specs/visitas-areas.md) · [specs/vehiculos.md](../../specs/vehiculos.md)
- [_graph.md](../../_graph.md)
- Implementación acumulada en la misma rama que [[FE-UX-006]] (documentación separada)

## Log

| Fecha | De | A | Comando | Nota |
|-------|----|---|---------|------|
| 2026-10-27 | — | ARCHIVADO | SDD ligero | Trazabilidad post-código del bloque admin catálogos |

## Resumen final

### Objetivo cumplido

- Pestañas **catálogo** en admin mascotas, almacén, visitas y vehículos con CRUD y recarga de combos del padrón.
- APIs REST admin (`SoloAdministrador`) para tipos/razas, categorías WMS, tipos identificación VTS, marcas/modelos USR.
- Padrón mascotas: acciones + alta admin alineada a vehículos.

### Pruebas ejecutadas

- Vitest Web: suite completa en verde (incl. páginas admin tocadas)
- `dotnet test`: pendiente si GraphApi bloquea DLL en local

### Documentación actualizada

- [delta.md](delta.md), dominios en `specs/`, [_graph.md](../../_graph.md), [_sdd_evolution.md](../../_sdd_evolution.md)
