# PROD-RES-001 — Fixes prod perfil Residente (encuestas, tickets, visitas, nav)

[← spec](spec.md) | [design](design.md) | [impl](impl.md) | [delta](delta.md) | [release](release.md)

## Estado

**ARCHIVADO**

| Campo | Valor |
|-------|--------|
| Talla | M (multi-dominio retro) |
| Dominio | [[encuestas]] · [[tickets]] · [[visitas-areas]] · [[frontend]] · [[backend]] |
| Rama | **`feature/entrega-2-AFS`** |
| Inventario SQL | [20261030_PROD-RES-001_INVENTARIO_CAMBIOS.md](../../../SQL/20261030_PROD-RES-001_INVENTARIO_CAMBIOS.md) |
| Entregables | [20261030_PROD-RES-001_Entregables.md](../../20261030_PROD-RES-001_Entregables.md) |

## Objetivo

Documentar y cerrar arreglos de operación publicada para **condómino/Residente** y APIs asociadas (sesión 2026-10-30).

## Artefactos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | ✅ /completar |
| Release | [release.md](release.md) | ✅ |

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-30 | Retro-SDD | Encuestas, tickets POST, menú visitas, combo Tipo ID |
| 2026-10-30 | LISTO PARA PR → ARCHIVADO | /completar; sello revisar N/A (retro hotfix) |

## Resumen final

### Objetivo cumplido

- CA-1…CA-7 verificados en código y documentación; deploy prod pendiente operación.

### Archivos modificados (referencia)

- GraphApi: ENC repository, TKT catalogo + services + tests.
- Web: encuestas residente, `menuToNav` / `useNavegacionMenus`, `MisPasesVisitaPage`.
- SQL: `20261030_sgr_visitas_pases_menu_residente.sql`, inventario PROD-RES-001.

### Auditorías finales

- auditor-sql: **APROBADO** (script menú idempotente).
- auditor-codigo: **APROBADO** (documental en impl.md).

### Pruebas ejecutadas

- T-SQL: N/A (sin suite ticket; script manual).
- Vitest / tsc Web: OK (sesión).
- dotnet test (ENC/TKT): OK local.

### Riesgos residuales

- Prod sin deploy API/Web → 500/404 persisten.
- Prod sin SQL menú → supplement Web cubre visitas; admin SGR desalineado hasta script.

### Decisiones técnicas relevantes

- Nav: supplement manifest vs forzar solo DB-008 en prod (ambos: Web mitiga + SQL corrige BD).
- TKT: canal `null` si legacy sin `CanalesTicket`.

### Documentación actualizada

- `specs/encuestas.md`, `tickets.md`, `visitas-areas.md`, `frontend.md` (changelog).
- `_graph.md`, `_sdd_evolution.md`, entregables + inventario SQL.

### meta-sdd

- **Sin patrones nuevos obligatorios** (rule/agente). Patrón **retro-SDD `tkt-prod-*`** ya registrado en `_sdd_evolution.md` (`sdd-prod-hotfix-retro`, cluster con PROD-UX-001).
