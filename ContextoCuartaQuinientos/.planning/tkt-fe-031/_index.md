# FE-031 — Frontend: mis tickets (listar y crear)

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md)

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[tickets]] (consumo web del dominio `tkt`)
- Targets en scope: `frontend:cuartaquinientos-web` (consume `backend:cuartaquinientos-api`, sin cambios en backend)
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente `/ejecutar`) · delta.md (pendiente `/completar`) · release.md (pendiente deploy)
- Historia: HU-TKT-01, HU-TKT-02 (readme §5, §6 Ticket 31)
- Fase: 1 · Estimación: 8 h ideales · Prioridad: Must-have
- Bloqueado por: [[FE-030]] ([index](../tkt-fe-030/_index.md); shell, `AuthProvider`, `apiClient`, Apollo) · [[TKT-BE-002]] (mutation GraphQL `crearTicket`) · [[TKT-BE-015]] ([index](../tkt-be-015/_index.md); `GET /TKT/Tickets/mis`, `GET /TKT/CategoriasTicket`, `GET /TKT/EstadosTickets`)
- Relacionados: [[TKT-BE-001]] ([index](../tkt-be-001/_index.md); servicio que hay detrás de la mutation) · [[FE-038]] (misma necesidad de catálogos en la UI de administración) · [[TKT-BOT-003]] (también consume `GET /TKT/CategoriasTicket`)
- Specs de dominio: [specs/tickets.md](../../specs/tickets.md) · Graph: [_graph.md](../../_graph.md)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — realineado a ADR-008 / Ticket 31: creación vía mutation GraphQL `crearTicket` (TKT-BE-002, no TKT-BE-001), listado `GET /TKT/Tickets/mis` (TKT-BE-015), AC de doble envío y estados vacío/carga/error. Estado: BORRADOR.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (`templates/spec.md`, `templates/design.md`, `profiles/context.md`); design completado. Estado: REQUIERE DECISIÓN (fuente de catálogos para el select de categoría y el filtro por estado sin ticket dueño en §6).
- 2026-09-24 — decisión resuelta en readme §6 Ticket 15: TKT-BE-015 (ya dependencia) provee `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets`; se elimina el bloqueo y se agrega CA-14. TanStack Query eliminado: REST vía `Web/src/shared/lib/apiClient.ts` (FE-030) + hooks React, GraphQL vía Apollo; `ProtectedRoute` → `PrivateRoute` (FE-030). Estado: LISTO PARA EJECUTAR.
