using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class UpsertPrioridadTicketInputValidator : AbstractValidator<UpsertPrioridadTicketInput>
{
    public UpsertPrioridadTicketInputValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Orden)
            .InclusiveBetween(1, 99)
            .When(x => x.Orden.HasValue);
    }
}
