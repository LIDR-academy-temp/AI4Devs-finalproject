using FluentValidation;

namespace GraphApi.Models.SGR.Casas;

public sealed class CasaActualizarRequestValidator : AbstractValidator<CasaActualizarRequest>
{
    public CasaActualizarRequestValidator()
    {
        RuleFor(x => x.Direccion)
            .NotEmpty()
            .When(x => x.Direccion is not null)
            .MaximumLength(200);
        RuleFor(x => x.Numero)
            .NotEmpty()
            .When(x => x.Numero is not null)
            .MaximumLength(50);
        RuleFor(x => x.PropietarioUsuarioId)
            .GreaterThan(0)
            .When(x => x.PropietarioUsuarioId.HasValue);
    }
}
