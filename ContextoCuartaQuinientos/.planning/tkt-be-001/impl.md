[← index](_index.md) | [← design](design.md)

# Impl: TKT-BE-001

- `CuartaTicketService.CrearTicketAsync`: catálogos por nombre, INSERT `tkt.Tickets`, `INotificacionService.NotificarAdministradoresAsync` en misma transacción, lectura `vsTickets` post-commit.
- `POST /TKT/Tickets` (`[Authorize(Roles = Residente)]`) + `CrearTicketInputValidator`.
- Tests: `CrearTicketInputValidatorTests`, `CuartaTicketServiceTests`.
