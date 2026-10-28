using FluentValidation;

namespace GraphApi.Models.SGR.Auth;

public sealed class CambiarPasswordRequestValidator : AbstractValidator<CambiarPasswordRequest>
{
    public CambiarPasswordRequestValidator()
    {
        RuleFor(x => x.PasswordActual).NotEmpty();
        RuleFor(x => x.PasswordNueva)
            .NotEmpty()
            .MinimumLength(8)
            .WithMessage("La contraseña nueva debe tener al menos 8 caracteres.");
        RuleFor(x => x.PasswordNueva)
            .NotEqual(x => x.PasswordActual)
            .WithMessage("La contraseña nueva debe ser distinta de la actual.");
    }
}
