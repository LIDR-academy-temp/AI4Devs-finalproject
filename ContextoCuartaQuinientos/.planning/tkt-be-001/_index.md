# TKT-BE-001 — Backend: crear ticket (repositorio Dapper + servicio + REST)

[← Fase 1](../FASE1_ROADMAP.md) | [spec](spec.md) | [design](design.md)

- Estado: ARCHIVADO
- Estructura: estándar
- Dominio: [[tickets]] · [[notificaciones]] (esquemas `tkt`, `ntf`)
- Targets en scope: `database:CuartaQuinientos` (solo lectura/escritura sobre objetos existentes), `backend:cuartaquinientos-api`
- size: M
- Links: [spec.md](spec.md) · [design.md](design.md) · impl.md (pendiente `/ejecutar`) · delta.md (pendiente `/completar`) · release.md (pendiente deploy)
- Historia: HU-TKT-01, HU-BOT-02 (readme §5, §6 Ticket 1)
- Fase: 1 · Estimación: 5 h ideales · Prioridad: Alta
- Bloqueado por: [[USR-BE-007]] ([index](../tkt-usr-be-007/_index.md)), [[DB-002]] (catálogos sembrados), [[NTF-BE-013]] ([index](../tkt-ntf-be-013/_index.md); `INotificacionService`, puede desarrollarse en paralelo con un mock)
- Relacionados: [[TKT-BE-002]] (mutation GraphQL que reutiliza el servicio) · [[TKT-BE-015]] ([index](../tkt-be-015/_index.md)) · [[FE-031]] ([index](../tkt-fe-031/_index.md), vía TKT-BE-002) · [[TKT-BOT-003]] (Fase 2, cliente de `POST /TKT/Tickets`) · [[DB-000]] ([index](../tkt-db-000/_index.md)) · [[DB-001]]
- Specs de dominio: [specs/tickets.md](../../specs/tickets.md) · [specs/notificaciones.md](../../specs/notificaciones.md) · Graph: [_graph.md](../../_graph.md)

## Log

- 2026-09-23 — spec + design
- 2026-09-24 — readme revisado (ADR-008: nombres lógicos + DB-001/DB-002 nuevos). Revalidar `design.md` contra readme §3.2 y §6 antes de `/ejecutar`.
- 2026-09-24 — realineado a ADR-008 / Ticket 1: nombres §3.2 (`Titulo`, `Descripcion`, `bActivo`, `TipoNotificacion`), categoría requerida validada contra `tkt.CategoriasTicket`, canal siempre en Fase 1, `CasaID`/`CanalID`/`FechaCreacion` en INSERT, `[Authorize(Roles = "Residente")]`, 201 + `Location`, notificación en la misma transacción vía `INotificacionService`, lectura post-commit de `tkt.vsTickets`. Estado: LISTO PARA EJECUTAR.
- 2026-09-24 — normalizado a plantillas SDD del toolkit (`templates/spec.md`, `templates/design.md`, `profiles/context.md`). Estado: LISTO PARA EJECUTAR.
