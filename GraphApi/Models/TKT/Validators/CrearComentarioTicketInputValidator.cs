using FluentValidation;

namespace GraphApi.Models.TKT.Validators;

public sealed class CrearComentarioTicketInputValidator : AbstractValidator<CrearComentarioTicketInput>
{
    public CrearComentarioTicketInputValidator()
    {
        RuleFor(x => x.Comentario)
            .Must(c => !string.IsNullOrWhiteSpace(c))
            .WithMessage("Comentario requerido")
            .MaximumLength(2000);
    }
}
