using FluentValidation;

namespace GraphApi.Models.FNZ;

public sealed class RegistrarPagoRequestValidator : AbstractValidator<RegistrarPagoRequest>
{
    public RegistrarPagoRequestValidator()
    {
        RuleFor(x => x.MontoPagado)
            .GreaterThan(0)
            .WithMessage("El monto debe ser mayor a cero");

        RuleFor(x => x.ReferenciaPago)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.MetodoPago)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.MetodoPago));

        RuleFor(x => x.FechaPago).NotEmpty();
    }
}
