# Entrega módulos — Web (sin BOT / IA / BI)

> Hub de planificación post-Fase 1. Fase 1 cerrada: [FASE1_CIERRE.md](FASE1_CIERRE.md).

## Objetivo

Demostrable en **SPA React**: los **12 dominios operativos** del readme (15 módulos menos BOT, IA y BI/RPT avanzado).

**DoD por módulo:** listar + alta + edición + baja lógica; vacío/carga/error; roles readme; API JWT (sin legacy en FE).

## Catálogo SDD (spec + design)

| Orden ejecución | Módulo | Backend | Frontend | Estado SDD |
|----------------:|--------|---------|----------|------------|
| 0 | Shell | — | [FE-SHELL-001](tkt-fe-shell-001/_index.md) | **ARCHIVADO** ✓ |
| 1 | USR padrón | USR-BE-009 (F1) | [FE-041](tkt-fe-041/_index.md) | **ARCHIVADO** ✓ |
| 1b | USR casas | [USR-BE-010](tkt-usr-be-010/_index.md) | [FE-042](tkt-fe-042/_index.md) | **ARCHIVADO** ✓ |
| 2 | ANM | [ANM-BE-027](tkt-anm-be-027/_index.md) | [FE-043](tkt-fe-043/_index.md) | **ARCHIVADO** ✓ |
| 3 | ENC | [ENC-BE-024](tkt-enc-be-024/_index.md) | [FE-044](tkt-fe-044/_index.md) | **ARCHIVADO** ✓ |
| 4 | ARC | [ARC-BE-028](tkt-arc-be-028/_index.md) | [FE-045](tkt-fe-045/_index.md) | **ARCHIVADO** ✓ |
| 5 | JNT | [JNT-BE-025](tkt-jnt-be-025/_index.md) | [FE-046](tkt-fe-046/_index.md) | **ARCHIVADO** ✓ |
| 6 | VTS | [VTS-BE-026](tkt-vts-be-026/_index.md) | [FE-047](tkt-fe-047/_index.md) | **ARCHIVADO** ✓ |
| 7a | VEH | [VEH-BE-018](tkt-veh-be-018/_index.md) | [FE-048](tkt-fe-048/_index.md) | **ARCHIVADO** ✓ |
| 7b | MAS | [MAS-BE-017](tkt-mas-be-017/_index.md) | [FE-049](tkt-fe-049/_index.md) | **ARCHIVADO** ✓ |
| 8 | WMS | [WMS-BE-029](tkt-wms-be-029/_index.md) | [FE-050](tkt-fe-050/_index.md) | **ARCHIVADO** ✓ |
| — | TKT, FNZ, NTF, Dashboard | Fase 1 | Fase 1 | Mantener |
| — | Nav E/F/G off | — | [FE-NAV-ENT1-001](tkt-fe-nav-ent1-001/_index.md) | **ARCHIVADO** ✓ |

## Orden recomendado de `/ejecutar`

1. Confirmar **ANM-BE-027** → **FE-043**
2. **ENC-BE-024** → **FE-044**
3. **ARC-BE-028** → **FE-045** *(antes o en paralelo con JNT)*
4. **JNT-BE-025** → **FE-046**
5. **VTS-BE-026** → **FE-047**
6. **VEH-BE-018** → **FE-048** · **MAS-BE-017** → **FE-049** (paralelo posible)
7. **WMS-BE-029** (+ `SQL/DB-005_wms_schema.sql`) → **FE-050**
8. ~~Cerrar **FE-042**~~ — **ARCHIVADO** (2026-10-22)

## Scripts SQL de diseño

| Script | Módulo | Estado |
|--------|--------|--------|
| DB-003 | ANM tipos | Hecho |
| DB-004 | ENC/ARC/VTS seeds | Hecho |
| DB-005 | WMS schema | Hecho |
| DB-007 | Menús SGR SPA | Hecho — ver [tkt-db-006-sgr-menus](tkt-db-006-sgr-menus/_index.md) |

## Criterios transversales

- [x] Sidebar con placeholders → `implemented: true` por FE (manifest + catálogo).
- [x] Ninguna pantalla nueva usa rutas `*/legacy` (grep `Web/src` 2026-10-30; solo redirecciones compat documentadas).
- [x] Smoke por módulo — suite xUnit/Vitest + smoke prod admin/residente ([PULIR_01](../PULIR_01_PROD_REPO.md) §1.5, 2026-10-30).

## Cierre entrega 2 (académica)

**2026-10-30:** catálogo 12 dominios + Fase 1 **ARCHIVADO**; nav E/F/G fuera. Pendiente: Typeform — ver [PULIR_ENTREGA_2.md](../PULIR_ENTREGA_2.md).
