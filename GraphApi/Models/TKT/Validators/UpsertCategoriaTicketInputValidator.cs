using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class UpsertCategoriaTicketInputValidator : AbstractValidator<UpsertCategoriaTicketInput>
{
    public UpsertCategoriaTicketInputValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
    }
}
