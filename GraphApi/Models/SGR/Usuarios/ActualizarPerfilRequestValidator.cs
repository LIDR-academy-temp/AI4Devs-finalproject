using FluentValidation;

namespace GraphApi.Models.SGR.Usuarios;

public sealed class ActualizarPerfilRequestValidator : AbstractValidator<ActualizarPerfilRequest>
{
    public ActualizarPerfilRequestValidator()
    {
        RuleFor(x => x.Correo)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.Telefono)
            .Matches(@"^\d{7,15}$")
            .When(x => !string.IsNullOrWhiteSpace(x.Telefono))
            .WithMessage("El teléfono debe contener solo dígitos (7 a 15).");

        RuleFor(x => x.Nombre)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.Nombre));
    }
}
