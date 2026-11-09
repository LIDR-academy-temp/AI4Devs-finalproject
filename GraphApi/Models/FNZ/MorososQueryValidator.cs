using FluentValidation;

namespace GraphApi.Models.FNZ;

public sealed class MorososQueryValidator : AbstractValidator<MorososQuery>
{
    public MorososQueryValidator()
    {
        RuleFor(x => x)
            .Must(q => (q.Mes is null && q.Anio is null) || (q.Mes is not null && q.Anio is not null))
            .WithMessage("mes y anio deben enviarse juntos o omitirse ambos");

        When(x => x.Mes is not null && x.Anio is not null, () =>
        {
            RuleFor(x => x.Mes!.Value).InclusiveBetween(1, 12);
            RuleFor(x => x.Anio!.Value).GreaterThanOrEqualTo(2024);
        });
    }
}
