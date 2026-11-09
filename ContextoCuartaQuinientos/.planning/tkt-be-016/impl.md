[← index](_index.md) | [← design](design.md)

# Impl: TKT-BE-016

- `GET /TKT/Tickets/admin`, `PATCH` estado/asignación vía `CuartaTicketAdminService`.
- Transiciones `TicketStatusTransitions`; notificaciones en transacción.
- Políticas `SoloAdministrador` / `AdminOAsignado`.
