[← index](_index.md) | [design →](design.md)

# spec.md — FE-039: Frontend: finanzas admin (pago, morosos, generar cuotas)

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`git-frontend`, `desarrollador-react`, `frontend-tester`, `auditor-codigo`)
> **Tipo:** Feature

## User story

Como Administrador, quiero buscar cuotas de un residente, registrar pagos, ver morosos y generar cuotas del período, para operar la cobranza (HU-FNZ-02, HU-FNZ-03, HU-FNZ-06).

## Contexto / problema

Backend: FNZ-BE-010 (`GET /FNZ/Cuotas?usuarioId=`), FNZ-BE-011 (`PATCH …/pago`), FNZ-BE-012 (`GET /Reports/Reportes/Morosos`), FNZ-BE-037 (`POST /FNZ/Cuotas/generar`). readme §6 Ticket 39. REST vía `apiClient` (FE-030). [specs/finanzas.md](../../specs/finanzas.md).

## Alcance (MoSCoW)

### Must
- Sección finanzas admin `(asumido)` `/admin/finanzas` con búsqueda residente/casa → tabla cuotas vía `GET /FNZ/Cuotas?usuarioId=`.
- Modal **Registrar pago**: monto precargado **read-only** (FNZ-BE-011), fecha, método, referencia; Zod; `PATCH /FNZ/Cuotas/{id}/pago`.
- `409` → "Cuota ya registrada como pagada" + refetch.
- Vista **Morosos**: `GET /Reports/Reportes/Morosos?mes=&anio=`; empty "Sin morosos en el período seleccionado."
- Form **Generar cuotas**: campos período, monto, vencimiento, cuenta; `POST /FNZ/Cuotas/generar`; muestra `{ creadas, omitidas }`.
- Estados carga/error/vacío en cada vista.
- Tests modal: éxito, 409, validación Zod.

### Should
- Selector mes/año compartido morosos/dashboard `(asumido)`.

### Could
- ninguno

### Won't
- Pasarela pago; PDF estado cuenta; GraphQL.

## Instancias en scope

| Target | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | `features/admin/finanzas/*` |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Monto pago = monto cuota (UI no editable Fase 1) | readme Ticket 39 |
| INV-2 | Sin reglas morosidad en cliente | FNZ-BE-012 |

## Criterios de aceptación

- [ ] **CA-1 [M]**: búsqueda residente muestra cuotas del API
- [ ] **CA-2 [M]**: modal pago válido → 204 y tabla refresca
- [ ] **CA-3 [M]**: modal pago cuota pagada → 409 y mensaje readme
- [ ] **CA-4 [M]**: morosos vacíos → empty state texto exacto
- [ ] **CA-5 [M]**: generar cuotas → resumen creadas/omitidas
- [ ] **CA-6 [M]**: Zod rechaza referencia vacía antes de PATCH

## Reutilización

- `apiClient`, patrones modal/form FE-030/FE-032.

## Definition of Ready

- [x] INVEST; backends documentados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Búsqueda residente sin endpoint dedicado | `(asumido)` reutilizar listado USR-BE-009 o input `usuarioId` manual demo |

## Preguntas abiertas

- UX búsqueda residente → **respondida `(asumido)`**: autocomplete sobre `GET /SGR/Usuarios?…` cuando exista USR-BE-009; mientras tanto input numérico `usuarioId` en dev.

## Quick Checks

- [x] OK
