using FluentValidation;

namespace GraphApi.Models.SGR.Navegacion;

public sealed class MenuCrearRequestValidator : AbstractValidator<MenuCrearRequest>
{
    public MenuCrearRequestValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Ruta).MaximumLength(250);
        RuleFor(x => x.Icono).MaximumLength(100);
        RuleFor(x => x.Orden).GreaterThanOrEqualTo(0);
    }
}

public sealed class MenuActualizarRequestValidator : AbstractValidator<MenuActualizarRequest>
{
    public MenuActualizarRequestValidator()
    {
        RuleFor(x => x.Titulo).MaximumLength(150).When(x => x.Titulo is not null);
        RuleFor(x => x.Ruta).MaximumLength(250).When(x => x.Ruta is not null);
        RuleFor(x => x.Icono).MaximumLength(100).When(x => x.Icono is not null);
        RuleFor(x => x.Orden).GreaterThanOrEqualTo(0).When(x => x.Orden is not null);
    }
}
