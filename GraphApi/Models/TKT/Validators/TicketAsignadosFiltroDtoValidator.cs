using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class TicketAsignadosFiltroDtoValidator : AbstractValidator<TicketAsignadosFiltroDto>
{
    public TicketAsignadosFiltroDtoValidator()
    {
        RuleFor(x => x.Pagina).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Tamano).InclusiveBetween(1, 100);
    }
}
