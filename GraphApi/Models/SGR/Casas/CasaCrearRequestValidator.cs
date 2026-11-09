using FluentValidation;

namespace GraphApi.Models.SGR.Casas;

public sealed class CasaCrearRequestValidator : AbstractValidator<CasaCrearRequest>
{
    public CasaCrearRequestValidator()
    {
        RuleFor(x => x.CondominioId).GreaterThan(0);
        RuleFor(x => x.Direccion).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Numero).NotEmpty().MaximumLength(50);
        RuleFor(x => x.PropietarioUsuarioId).GreaterThan(0).When(x => x.PropietarioUsuarioId.HasValue);
    }
}
