using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class CrearTicketAdminInputValidator : AbstractValidator<CrearTicketAdminInput>
{
    public CrearTicketAdminInputValidator()
    {
        RuleFor(x => x.UsuarioSolicitanteId).GreaterThan(0);
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Descripcion).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Categoria).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Prioridad)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.Prioridad));
        RuleFor(x => x.Canal)
            .Must(c => c is null || new[] { "WEB", "TELEGRAM" }.Contains(c))
            .WithMessage("Canal inválido");
    }
}
