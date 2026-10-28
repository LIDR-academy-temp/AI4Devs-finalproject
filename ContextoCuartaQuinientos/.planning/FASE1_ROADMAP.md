# Fase 1 — SDD por ticket (Entrega 2)

> **Cierre:** 2026-10-16 — todos los tickets **ARCHIVADO**. Resumen: [FASE1_CIERRE.md](FASE1_CIERRE.md).

> Hub de planificación. Contrato académico: `readme.md` §5.0 + §6.

| Orden | Ticket | Carpeta SDD | Estado SDD | Bloqueado por |
|------:|--------|-------------|------------|---------------|
| 0 | [SETUP-000](tkt-setup-000/_index.md) | [tkt-setup-000](tkt-setup-000/_index.md) | ARCHIVADO | — |
| 1 | [DB-000](tkt-db-000/_index.md) | [tkt-db-000](tkt-db-000/_index.md) | ARCHIVADO | — |
| 2 | [DB-001](tkt-db-001/_index.md) | [tkt-db-001](tkt-db-001/_index.md) | ARCHIVADO | DB-000 |
| 3 | [DB-002](tkt-db-002/_index.md) | [tkt-db-002](tkt-db-002/_index.md) | ARCHIVADO | DB-001 |
| 4 | [USR-BE-007](tkt-usr-be-007/_index.md) | [tkt-usr-be-007](tkt-usr-be-007/_index.md) | ARCHIVADO | SETUP-000, DB-001, DB-002 |
| 5 | [FE-030](tkt-fe-030/_index.md) | [tkt-fe-030](tkt-fe-030/_index.md) | ARCHIVADO | USR-BE-007 |
| 6 | [USR-BE-036](tkt-usr-be-036/_index.md) | [tkt-usr-be-036](tkt-usr-be-036/_index.md) | ARCHIVADO | USR-BE-007, FE-030 |
| 7 | [USR-BE-008](tkt-usr-be-008/_index.md) (HU-USR-02) | [tkt-usr-be-008](tkt-usr-be-008/_index.md) | ARCHIVADO | USR-BE-007 |
| 8 | [USR-BE-009](tkt-usr-be-009/_index.md) | [tkt-usr-be-009](tkt-usr-be-009/_index.md) | ARCHIVADO | USR-BE-007 |
| 9 | [NTF-BE-013](tkt-ntf-be-013/_index.md) | [tkt-ntf-be-013](tkt-ntf-be-013/_index.md) | ARCHIVADO | USR-BE-007 |
| 10 | [TKT-BE-001](tkt-be-001/_index.md) | [tkt-be-001](tkt-be-001/_index.md) | ARCHIVADO | USR-BE-007, DB-002, NTF-BE-013 |
| 11 | [TKT-BE-002](tkt-be-002/_index.md) | [tkt-be-002](tkt-be-002/_index.md) | ARCHIVADO | TKT-BE-001 |
| 12 | [TKT-BE-015](tkt-be-015/_index.md) | [tkt-be-015](tkt-be-015/_index.md) | ARCHIVADO | TKT-BE-001 |
| 13 | [TKT-BE-016](tkt-be-016/_index.md) | [tkt-be-016](tkt-be-016/_index.md) | ARCHIVADO | TKT-BE-015 |
| 14 | [FE-031](tkt-fe-031/_index.md) | [tkt-fe-031](tkt-fe-031/_index.md) | ARCHIVADO | FE-030, TKT-BE-002, TKT-BE-015 |
| 15 | [FE-038](tkt-fe-038/_index.md) | [tkt-fe-038](tkt-fe-038/_index.md) | ARCHIVADO | FE-030, TKT-BE-016 |
| 16 | [FNZ-BE-037](tkt-fnz-be-037/_index.md) | [tkt-fnz-be-037](tkt-fnz-be-037/_index.md) | ARCHIVADO | USR-BE-009, DB-002 |
| 17 | [FNZ-BE-010](tkt-fnz-be-010/_index.md) | [tkt-fnz-be-010](tkt-fnz-be-010/_index.md) | ARCHIVADO | USR-BE-007 |
| 18 | [FNZ-BE-011](tkt-fnz-be-011/_index.md) | [tkt-fnz-be-011](tkt-fnz-be-011/_index.md) | ARCHIVADO | FNZ-BE-010, NTF-BE-013 |
| 19 | [FNZ-BE-012](tkt-fnz-be-012/_index.md) | [tkt-fnz-be-012](tkt-fnz-be-012/_index.md) | ARCHIVADO | FNZ-BE-010 |
| 20 | [FE-032](tkt-fe-032/_index.md) | [tkt-fe-032](tkt-fe-032/_index.md) | ARCHIVADO | FE-030, FNZ-BE-010 |
| 21 | [FE-039](tkt-fe-039/_index.md) | [tkt-fe-039](tkt-fe-039/_index.md) | ARCHIVADO | FE-030, FNZ-BE-011, FNZ-BE-012, FNZ-BE-037 |
| 22 | [DASH-BE-014](tkt-dash-be-014/_index.md) | [tkt-dash-be-014](tkt-dash-be-014/_index.md) | ARCHIVADO | USR-BE-007, FNZ-BE-010, NTF-BE-013 |
| 23 | [FE-040](tkt-fe-040/_index.md) | [tkt-fe-040](tkt-fe-040/_index.md) | ARCHIVADO | FE-030, DASH-BE-014, NTF-BE-013 |

**Documentos de entrada (gate SDD):** `readme.md` + `specs/` + `INICIO_IMPLEMENTACION.md` + SQL DB-000.

**Siguiente:** Fase 2 o smoke E2E (`GraphApi` + `Web` + BD local); ver [FASE1_CIERRE.md](FASE1_CIERRE.md).
