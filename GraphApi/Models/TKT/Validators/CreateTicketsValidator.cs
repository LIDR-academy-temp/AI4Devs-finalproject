using FluentValidation;
using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Models.TKT.Validators
{
    public class CreateTicketsValidator : AbstractValidator<clCreateTickets>
    {
        public CreateTicketsValidator()
        {
            RuleFor(x => x.TituloTicket)
                .NotEmpty().WithMessage("TituloTicket es obligatorio.")
                .MaximumLength(200).WithMessage("TituloTicket no puede superar 200 caracteres.");

            RuleFor(x => x.DescripcionTicket)
                .MaximumLength(2000).WithMessage("DescripcionTicket no puede superar 2000 caracteres.")
                .When(x => x.DescripcionTicket != null);

            RuleFor(x => x.UsuarioSolicitanteID)
                .GreaterThan(0).WithMessage("UsuarioSolicitanteID debe ser mayor que 0.");

            RuleFor(x => x.PrioridadTicketID)
                .GreaterThan(0).WithMessage("PrioridadTicketID debe ser mayor que 0.");

            RuleFor(x => x.EstadoTicketID)
                .GreaterThan(0).WithMessage("EstadoTicketID debe ser mayor que 0.");

            RuleFor(x => x.FechaCreacionTicket)
                .NotEmpty().WithMessage("FechaCreacionTicket es obligatoria.");

            RuleFor(x => x.FechaCierre)
                .GreaterThan(x => x.FechaCreacionTicket)
                .WithMessage("FechaCierre debe ser posterior a FechaCreacionTicket.")
                .When(x => x.FechaCierre.HasValue);
        }
    }
}
