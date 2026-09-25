# TKT-BE-016 — Gestión de tickets por Administrador

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md)

- Estado: LISTO PARA EJECUTAR
- Estructura: estándar
- Dominio: [[tickets]] · [[notificaciones]] (esquemas `tkt`, `ntf`, lectura `sgr`)
- Targets en scope: `database:CuartaQuinientos` (lectura/escritura sobre objetos existentes), `backend:cuartaquinientos-api`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente `/ejecutar`) · delta.md (pendiente `/completar`) · release.md (pendiente deploy)
- Historia: HU-TKT-03 (readme §5, §6 Ticket 16)
- Fase: 1 · Estimación: 8 h ideales · Prioridad: Must-have
- Bloqueado por: [[TKT-BE-015]] ([index](../tkt-be-015/_index.md))
- Dependencias técnicas (heredadas): [[TKT-BE-001]] ([index](../tkt-be-001/_index.md); `ITicketService`, catálogos) · [[NTF-BE-013]] ([index](../tkt-ntf-be-013/_index.md); `INotificacionService`) · [[SETUP-000]] (políticas `SoloAdministrador` y `AdminOAsignado`)
- Relacionados: [[FE-038]] (UI de gestión) · [[BOT-BE-021]] (Fase 2, trabajador usa el mismo `PATCH` y `AdminOAsignado`) · [[DB-001]]
- Specs de dominio: [specs/tickets.md](../../specs/tickets.md) · [specs/notificaciones.md](../../specs/notificaciones.md) · Graph: [_graph.md](../../_graph.md)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — realineado a ADR-008 / Ticket 16: máquina de estados §3.2 (`422 INVALID_TRANSITION`), reapertura limpia `FechaCierre`, política `AdminOAsignado`, asignación solo a Trabajador activo (`422`), comentario de sistema `EsInterno = 1`. Estado: BORRADOR (design pendiente).
- 2026-09-24 — normalizado a plantillas SDD del toolkit (`templates/spec.md`, `templates/design.md`, `profiles/context.md`); design completado (orden de implementación, SQL de listado paginado, plan de pruebas por transición). Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — readme §3.2 confirma que toda transición (incluidas reapertura y cierre) notifica al solicitante con `TICKET_ESTADO` vía `INotificacionService`: se quita el `(asumido)`/pregunta abierta; CA-6/CA-7 e INV-2 lo verifican; `specs/tickets.md` alineado. Estado: LISTO PARA EJECUTAR.
