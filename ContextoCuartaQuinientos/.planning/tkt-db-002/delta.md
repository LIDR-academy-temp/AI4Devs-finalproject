[← index](_index.md) | [← impl](impl.md)

# delta.md — DB-002

**ADDED**

- Catálogos `sgr.Perfiles`, `tkt.EstadosTickets`, `tkt.PrioridadesTicket`, `ntf.TiposNotificacion` (MERGE idempotente).
- Admin `admin@local` (password vía `AdminPasswordHash` sqlcmd).

**NOTA**

- En hub MCP: seeds core + admin aplicados; bloques que dependen de tablas ausentes (`CategoriasTicket`, `fnz.*` completo) omitidos hasta DB-000 completo.
