[← index](_index.md) | [← spec](spec.md)

# design.md — FE-038: Frontend: gestión de tickets (Admin)

> Consumido por: `desarrollador-react` → `frontend-tester` → `auditor-codigo`

## Estrategia técnica

Feature `src/features/admin/tickets/`: hooks REST (`useTicketsAdmin`, `useCambiarEstadoTicket`, `useAsignarTicket`, `useTrabajadores`, `useCatalogosTicket` reutilizado de FE-031). TanStack Query **no** — mismo patrón FE-031 (`useState`/`useEffect` + `apiClient`). Matriz `TRANSICIONES_PERMITIDAS` en `ticketTransitions.ts` espejo de readme §3.2 (solo UI; el API es autoridad).

### Escalera

| Capacidad | Peldaño | Objeto |
|---|---|---|
| HTTP autenticado | 3 | `apiClient` FE-030 |
| Listado/cambio/asignación | 3 | endpoints TKT-BE-016 |
| UI admin | 5 | `AdminTicketsPage`, `TicketsAdminTable`, `TicketDetailPanel` |

## frontend:cuartaquinientos-web

| Componente | Acción | API |
|---|---|---|
| `useTicketsAdmin(filtros)` | crear | `GET /TKT/Tickets` |
| `useCambiarEstadoTicket` | crear | `PATCH /TKT/Tickets/{id}/estado/{estadoId}` |
| `useAsignarTicket` | crear | `POST /TKT/TicketsUsuariosAsignados` |
| `useTrabajadores` | crear | `GET /SGR/Usuarios/trabajadores` (USR-BE-009) |
| `AdminTicketsPage` | crear | compone hooks + toast |
| Router | modificar | ruta admin protegida |

## Orden de implementación

| # | Paso | Verificación |
|---|------|--------------|
| 1 | Tipos + matriz transiciones | `tsc` |
| 2 | Hooks REST | tests mock |
| 3 | Tabla + detalle + toast | Vitest CA-1..5 |
| 4 | Rutas + build | `tsc` + `vite build` |

## Plan de pruebas

| Prueba | Cubre |
|---|---|
| `AdminTicketsTable.test.tsx` | CA-1, CA-5 |
| `TicketStateActions.test.tsx` | CA-2, CA-3 |
| `AsignarTrabajador.test.tsx` | CA-4 |

## Autoverificación

- [x] Sin Won't; pruebas negativas (422) incluidas.
