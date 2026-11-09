# PROD-UX-001 — Cierre UX prod (pases QR, residentes, moras)

[← spec](spec.md) | [design](design.md) | [impl](impl.md) | [delta](delta.md) | [release](release.md)

| Campo | Valor |
|-------|--------|
| Estado | **ARCHIVADO** |
| Dominio | [[visitas-areas]] · [[usuarios]] · [[finanzas]] · [[dashboard]] · [[frontend]] |
| Rama | **`feature/entrega-2-AFS`** (única rama de trabajo; no crear ramas por ticket) |
| Inventario SQL | [20261030_PROD-UX-001_INVENTARIO_CAMBIOS.md](../../../SQL/20261030_PROD-UX-001_INVENTARIO_CAMBIOS.md) |

## Objetivo

Documentar y cerrar los cambios pedidos en operación publicada: admin **pases QR** (estado visible, patrón admin), **padrón residentes** (edición completa + casa/ocupante), **moras en lote**, fix **PUT /SGR/Usuarios/{id}** (transacción Dapper), y aclaración **ocupación** vs propietario en Casas.

## Artefactos

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Spec | [spec.md](spec.md) | ✅ |
| Design | [design.md](design.md) | ✅ |
| Impl | [impl.md](impl.md) | ✅ |
| Delta | [delta.md](delta.md) | ✅ |
| Release | [release.md](release.md) | ✅ |

## Log

| Fecha | Estado | Nota |
|-------|--------|------|
| 2026-10-30 | SPEC → ARCHIVADO | Retro-SDD post sesión prod; impl ya en rama `feature/entrega-2-AFS` |
