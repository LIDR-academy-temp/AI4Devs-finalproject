using FluentValidation;
using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Models.TKT.Validators
{
    public class UpdateTicketsValidator : AbstractValidator<clUpdateTickets>
    {
        public UpdateTicketsValidator()
        {
            RuleFor(x => x.TicketID)
                .NotNull().WithMessage("TicketID es obligatorio para actualizar.")
                .GreaterThan(0).WithMessage("TicketID debe ser mayor que 0.");

            RuleFor(x => x.TituloTicket)
                .MaximumLength(200).WithMessage("TituloTicket no puede superar 200 caracteres.")
                .When(x => x.TituloTicket != null);

            RuleFor(x => x.DescripcionTicket)
                .MaximumLength(2000).WithMessage("DescripcionTicket no puede superar 2000 caracteres.")
                .When(x => x.DescripcionTicket != null);

            RuleFor(x => x.EstadoTicketID)
                .GreaterThan(0).WithMessage("EstadoTicketID debe ser mayor que 0.")
                .When(x => x.EstadoTicketID.HasValue);
        }
    }
}
