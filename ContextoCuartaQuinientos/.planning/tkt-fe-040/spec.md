[← index](_index.md) | [design →](design.md)

# spec.md — FE-040: Frontend: dashboard y bandeja de notificaciones

> Generado por: **generador de contexto SDD**
> Consumido por: implementador (`git-frontend`, `desarrollador-react`, `frontend-tester`, `auditor-codigo`)
> **Tipo:** Feature

## User story

Como usuario autenticado, quiero ver mi página de inicio (KPIs o resumen personal) y gestionar notificaciones con badge de no leídas, para enterarme de eventos sin revisar cada módulo (HU-DASH-01/02, HU-NTF-01/02).

## Contexto / problema

DASH-BE-014: `GET /Dashboard/Resumen?mes=&anio=` devuelve `ResumenAdmin` o `ResumenResidente` según `tipo` (sin lógica de rol en cliente). NTF-BE-013: `GET /NTF/Notificaciones`, `PATCH …/{id}/leida`, campo `totalNoLeidas`. readme §6 Ticket 40. Fuentes: [specs/dashboard.md](../../specs/dashboard.md), [specs/notificaciones.md](../../specs/notificaciones.md).

## Alcance (MoSCoW)

### Must
- Ruta inicio `(asumido)` `/` o `/inicio` post-login.
- `useDashboardResumen` → render `ResumenAdminCards` o `ResumenResidenteCards` según `data.tipo` (sin `if (rol)` en cliente).
- Campana header: badge `totalNoLeidas` desde listado notificaciones o resumen residente `(asumido)` fuente única `GET /NTF/Notificaciones` pagina=1.
- Bandeja/dropdown: lista notificaciones; marcar leída → `PATCH /NTF/Notificaciones/{id}/leida` y decrementar badge.
- Estados vacío/carga/error en dashboard y bandeja.
- Tests: render Admin vs Residente mock `tipo`; badge actualiza al marcar leída.

### Should
- Enlace desde aviso cuota vencida a FE-032 `(asumido)`.

### Could
- ninguno

### Won't
- Aviso general HU-NTF-03; envío Telegram; GraphQL dashboard.

## Instancias en scope

| Target | Impacto |
|---|---|
| `frontend:cuartaquinientos-web` | `features/dashboard`, `features/notifications`, shell header |

## Invariantes

| # | Regla | Fuente |
|---|---|---|
| INV-1 | Shape del dashboard lo decide API (`tipo`) | DASH-BE-014 |
| INV-2 | Leído = `NotificacionesVisualizadas` (backend) | `specs/notificaciones.md` |

## Criterios de aceptación

- [ ] **CA-1 [M]**: payload `tipo=ADMIN` → solo tarjetas admin
- [ ] **CA-2 [M]**: payload `tipo=RESIDENTE` → resumen personal + aviso vencida si `avisoVencida`
- [ ] **CA-3 [M]**: badge muestra `totalNoLeidas`
- [ ] **CA-4 [M]**: marcar leída reduce badge sin recargar página completa
- [ ] **CA-5 [M]**: error API → UI error + reintentar

## Reutilización

- `apiClient` FE-030; contratos DASH-BE-014 y NTF-BE-013.

## Definition of Ready

- [x] INVEST.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Doble fetch resumen + notificaciones | Compartir hook badge |

## Preguntas abiertas

- Últimas notificaciones en dashboard HU-DASH-02 → **respondida**: bandeja NTF cubre HU-NTF-01; dashboard usa contador del resumen + bandeja.

## Quick Checks

- [x] OK
