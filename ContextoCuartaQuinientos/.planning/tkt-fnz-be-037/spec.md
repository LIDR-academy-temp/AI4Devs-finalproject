[← index](_index.md) | [design →](design.md)

# spec.md — FNZ-BE-037: Generar cuotas del período

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`implementer.tool` = cursor — `desarrollador-api`, `desarrollador-tdd`, `api-tester`, `auditor-codigo`)
> **Tipo:** Feature

## User story

Como Administrador, quiero generar las cuotas de un mes para todas las casas con ocupante vigente, para iniciar la cobranza sin duplicar filas (HU-FNZ-06).

## Contexto / problema

Sin generación masiva no hay cuotas para FNZ-BE-010/011 ni demo del núcleo (readme §5.0). readme §6 Ticket 37: `POST /FNZ/Cuotas/generar` con `{ anio, mes, monto, fechaVencimiento, cuentaId }`, una fila por casa con ocupante, idempotente por `(CasaID, PeriodoInicio)`. Fuentes: [specs/finanzas.md](../../specs/finanzas.md) HU-FNZ-06, INV-7; patrón similar [[tkt-fnz-be-010]].

## Alcance (MoSCoW)

### Must
- `POST /FNZ/Cuotas/generar` `[Authorize(Policy = "SoloAdministrador")]`.
- `PeriodoInicio` = día 1 del mes; `PeriodoFin` = último día del mes (calendario).
- Responsable `UsuarioID`: propietario vigente que habita la casa o, si no, arrendatario vigente (`sgr.CasaOcupantes`, `Vigente=1`).
- `INSERT … SELECT … WHERE NOT EXISTS` por `(CasaID, PeriodoInicio)`; transacción única.
- Respuesta `{ creadas, omitidas }`; `400` si `monto ≤ 0` o `fechaVencimiento` anterior al inicio del período.
- Tests: primera generación, segunda idempotente (0 creadas), casa sin ocupante omitida.

### Should
- Swagger 200/400/401/403.

### Could
- ninguno

### Won't
- UI (FE-039); recargos; pagos parciales (Non-goals FNZ).

## Instancias en scope

| Target:Instancia | Impacto |
|---|---|
| `database:CuartaQuinientos` | INSERT en `fnz.Cuotas` (sin DDL) |
| `backend:cuartaquinientos-api` | `CuotasController.Generar`, `FinanzasService.GenerarCuotasPeriodoAsync` |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Cuota ligada a `UsuarioID` y `CasaID` | `specs/finanzas.md` |
| INV-2 | Soft delete `bEliminado` en inserts = 0 | INV-G1 |
| INV-3 | Sin SP de negocio | ADR-001 |
| INV-4 | Identidad admin desde JWT | CLAUDE.md |

## Criterios de aceptación

- [ ] **CA-1 [M]**: **Dado** 3 casas con ocupante y catálogos OK **Cuando** Admin POST generar `{ anio, mes, monto, fechaVencimiento, cuentaId }` **Entonces** `creadas=3`, `omitidas=0`, filas con `Pagado=0`
- [ ] **CA-2 [M]**: **Dado** mismo período **Cuando** repite POST **Entonces** `creadas=0`, `omitidas=3`
- [ ] **CA-3 [M]**: **Dado** casa sin `CasaOcupantes` vigente **Cuando** genera **Entonces** esa casa no inserta y cuenta en `omitidas`
- [ ] **CA-4 [M]**: **Dado** `monto=0` **Cuando** POST **Entonces** `400 VALIDATION_ERROR` sin inserts
- [ ] **CA-5 [M]**: **Dado** `fechaVencimiento` antes del día 1 del período **Cuando** POST **Entonces** `400` sin inserts
- [ ] **CA-6 [M]**: **Dado** Residente **Cuando** POST **Entonces** `403`
- [ ] **CA-R1 [M]**: **Dado** generación exitosa **Cuando** consulta cuota **Entonces** `CuentaID` y montos coherentes con input

## Reutilización detectada

- `fnz.Cuotas`, `fnz.Cuentas`, `sgr.CasaOcupantes`, `sgr.Casas` → esquema DB-000/DB-001.
- `FinanzasService` / `CuotasController` → extender FNZ-BE-010 (peldaño 4).

## Definition of Ready

- [x] INVEST; bloqueos USR-BE-009 y DB-002 documentados en `_index.md`.

## Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Sin ocupantes tras USR-BE-009 incompleto | Alta | Orden FASE1_ROADMAP |
| `CuentaID` inválido | Media | FK + validación previa |

## Preguntas abiertas

- ¿Incluir casas con solo propietario no habitante? → **respondida**: readme Ticket 37 — arrendatario o propietario habitante.

## Quick Checks

- [x] Completos.
