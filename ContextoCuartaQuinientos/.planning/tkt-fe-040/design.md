[← index](_index.md) | [← spec](spec.md)

# design.md — FE-040: Frontend: dashboard y bandeja

## Estrategia técnica

- `DashboardHomePage`: `useDashboardResumen()` → switch por `data.tipo` a componentes presentacionales.
- `NotificationBell` en layout FE-030: `useNotificaciones()` + `useMarcarLeida()`; estado `totalNoLeidas` local sincronizado con respuesta GET.
- Sin Zustand para datos servidor.

## frontend:cuartaquinientos-web

| Componente | API |
|---|---|
| `ResumenAdminCards` | campos de `GET /Dashboard/Resumen` |
| `ResumenResidenteCards` | idem |
| `NotificationDropdown` | `GET /NTF/Notificaciones` |
| `useMarcarLeida` | `PATCH /NTF/Notificaciones/{id}/leida` |

## Orden

1. Tipos DTO → 2. Hooks → 3. Cards + bell → 4. Integrar layout → 5. Tests → 6. build

## Plan de pruebas

`DashboardHomePage.test.tsx` (CA-1,2); `NotificationBell.test.tsx` (CA-3,4).

## Autoverificación

- [x] Sin lógica rol en cliente; pruebas incluidas.
