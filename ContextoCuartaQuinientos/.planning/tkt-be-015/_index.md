# TKT-BE-015 — Consultar mis tickets (residente)

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md)

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: [[tickets]] (esquema `tkt`)
- Targets en scope: `database:CuartaQuinientos` (solo lectura), `backend:cuartaquinientos-api`
- size: S
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente `/ejecutar`) · delta.md (pendiente `/completar`) · release.md (pendiente deploy)
- Historia: HU-TKT-02 (readme §5, §6 Ticket 15)
- Fase: 1 · Estimación: 5 h ideales · Prioridad: Must-have
- Bloqueado por: [[TKT-BE-001]] ([index](../tkt-be-001/_index.md); service base de tickets)
- Relacionados: [[TKT-BE-016]] ([index](../tkt-be-016/_index.md); lo tiene como bloqueante) · [[FE-031]] ([index](../tkt-fe-031/_index.md); consumidor web) · [[TKT-BOT-003]] (Fase 2, "Ver mis tickets") · [[DB-001]] (amplía `tkt.vsTickets`)
- Specs de dominio: [specs/tickets.md](../../specs/tickets.md) · Graph: [_graph.md](../../_graph.md)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — Revisión final de Entrega 1: estado corregido a BORRADOR; el contrato del ticket se actualizó en readme §6.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (`templates/spec.md`, `templates/design.md`, `profiles/context.md`); spec y design completados desde readme §6 Ticket 15. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — readme §6 Ticket 15 agrega los catálogos `GET /TKT/CategoriasTicket` y `GET /TKT/EstadosTickets` (`[Authorize]`, cualquier perfil, `200 [{ id, nombre }]`, `bEliminado = 0`, orden por nombre): Must + CA-11..CA-13 en spec; endpoints, escalera, orden y pruebas en design. Desbloquea [[FE-031]]. Estado: LISTO PARA EJECUTAR.
