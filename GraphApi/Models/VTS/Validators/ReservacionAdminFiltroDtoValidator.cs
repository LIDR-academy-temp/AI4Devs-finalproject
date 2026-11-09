using FluentValidation;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Models.VTS.Validators;

public sealed class ReservacionAdminFiltroDtoValidator : AbstractValidator<ReservacionAdminFiltroDto>
{
    public ReservacionAdminFiltroDtoValidator()
    {
        RuleFor(x => x.Pagina).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Tamano).InclusiveBetween(1, 100);
        RuleFor(x => x.AreaComunId).GreaterThan(0).When(x => x.AreaComunId.HasValue);
        RuleFor(x => x.Hasta)
            .GreaterThan(x => x.Desde!.Value)
            .When(x => x.Desde.HasValue && x.Hasta.HasValue);
    }
}
