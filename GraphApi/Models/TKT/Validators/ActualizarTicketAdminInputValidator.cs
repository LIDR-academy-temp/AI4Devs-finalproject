using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class ActualizarTicketAdminInputValidator : AbstractValidator<ActualizarTicketAdminInput>
{
    public ActualizarTicketAdminInputValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Descripcion).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Categoria).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Prioridad)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.Prioridad));
    }
}
