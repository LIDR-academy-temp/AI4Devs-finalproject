# FE-NAV-ENT1-001 — Ocultar menús NAV E/F/G (entrega 1)

[← spec](spec.md) | [design](design.md) | [impl](impl.md) | [delta](delta.md) | [release](release.md)

## Estado

**ARCHIVADO**

| Campo | Valor |
|-------|--------|
| Talla | S |
| Dominio | [[frontend]] · [[sgr]] |
| Rama | `feature/entrega-1-AFS` |
| Inventario SQL | [20261030_FE-NAV-ENT1-001_INVENTARIO_CAMBIOS.md](../../../SQL/20261030_FE-NAV-ENT1-001_INVENTARIO_CAMBIOS.md) |
| Entregables | [20261030_FE-NAV-ENT1-001_Entregables.md](../../20261030_FE-NAV-ENT1-001_Entregables.md) |

## Objetivo

Excluir del producto entrega 1 los ítems de sidebar de [[NAV-ROOT-001]] fases **E** (Reportes), **F** (BOT), **G** (Aviso general), con SDD completo y reversión documentada.

## Artefactos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | ✅ |
| Release | [release.md](release.md) | ✅ |

## Related

- [[NAV-ROOT-001]] — epic E→G pendiente; claves conservadas en manifest/DB-008
- [[PROD-RES-001]] — introduce `supplementApiNavWithManifest` (causa del re-inject)
- [[ENTREGA_MODULOS]] — sin BOT / BI / RPT UI

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-30 | Retro-SDD + impl | Usuario ocultó en BD; sidebar persistía por supplement |
| 2026-10-30 | ARCHIVADO | /revisar + /completar; docs + inventario + specs |

## Resumen final

- CA-1…CA-5 cumplidos en código y documentación.
- auditor-sql / auditor-codigo: **APROBADO** (ver impl.md).
