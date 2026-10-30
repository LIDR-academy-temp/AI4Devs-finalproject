using FluentValidation;

namespace GraphApi.Models.FNZ;

public sealed class AplicarMorasRequestValidator : AbstractValidator<AplicarMorasRequest>
{
    public AplicarMorasRequestValidator()
    {
        RuleFor(x => x.MontoMora).GreaterThan(0).WithMessage("El monto de mora debe ser mayor a cero.");
        RuleFor(x => x.Residentes).NotNull().Must(r => r!.Count > 0)
            .WithMessage("Seleccione al menos un moroso.");
        RuleForEach(x => x.Residentes!).ChildRules(r =>
        {
            r.RuleFor(x => x.UsuarioId).GreaterThan(0);
        });
        RuleFor(x => x).Must(q => q.Mes is null == (q.Anio is null))
            .WithMessage("Mes y año deben enviarse juntos o omitirse ambos.");
        RuleFor(x => x.Mes).InclusiveBetween(1, 12).When(x => x.Mes is not null);
        RuleFor(x => x.Anio).InclusiveBetween(2000, 2100).When(x => x.Anio is not null);
    }
}
