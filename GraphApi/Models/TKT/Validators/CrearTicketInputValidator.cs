using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class CrearTicketInputValidator : AbstractValidator<CrearTicketInput>
{
    public CrearTicketInputValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Descripcion).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.Categoria).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Prioridad)
            .Must(p => p is null || new[] { "Baja", "Media", "Alta", "Crítica" }.Contains(p))
            .WithMessage("Prioridad inválida");
        RuleFor(x => x.Canal)
            .Must(c => c is null || new[] { "WEB", "TELEGRAM" }.Contains(c))
            .WithMessage("Canal inválido");
    }
}
