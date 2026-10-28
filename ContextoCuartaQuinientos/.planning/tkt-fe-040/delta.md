[← index](_index.md) | [← impl](impl.md)

# delta.md — FE-040

## Resumen del cambio

Inicio `/` con KPIs según `tipo` del API; campana de notificaciones en `AppShell` (badge + marcar leída).

## Objetos creados / modificados

| Target:Instancia | Objeto | Acción |
|---|---|---|
| frontend:cuartaquinientos-web | `features/dashboard/*`, `features/notifications/*` | NUEVO |
| frontend:cuartaquinientos-web | `AppShell`, `HomePage` | MODIFICADO |
| frontend:cuartaquinientos-web | `PrivateRoute`, `AdminRoute` | MODIFICADO |

## Invariantes verificados

| Invariante | Test | Resultado |
|---|---|---|
| INV-1 (tipo API) | `HomePage.test` | ✅ |
| INV-2 (leído backend) | `NotificationBell.test` | ✅ |

## Desviaciones vs design.md

Hooks inline en `NotificationBell` (sin `useNotificaciones` separado).

## Specs de dominio

- `specs/dashboard.md` — UI inicio.
- `specs/notificaciones.md` — campana header.

## Actualización de _graph.md

- [[FE-040]] cierra HU-DASH-01/02 + bandeja HU-NTF-01/02 en web.
