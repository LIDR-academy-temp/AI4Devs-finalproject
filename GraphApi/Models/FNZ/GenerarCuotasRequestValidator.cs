using FluentValidation;

namespace GraphApi.Models.FNZ;

public sealed class GenerarCuotasRequestValidator : AbstractValidator<GenerarCuotasRequest>
{
    public GenerarCuotasRequestValidator()
    {
        RuleFor(x => x.Anio).InclusiveBetween(2000, 2100);
        RuleFor(x => x.Mes).InclusiveBetween(1, 12);
        RuleFor(x => x.Monto).GreaterThan(0);
        RuleFor(x => x.FechaVencimiento).NotEmpty();
    }
}
