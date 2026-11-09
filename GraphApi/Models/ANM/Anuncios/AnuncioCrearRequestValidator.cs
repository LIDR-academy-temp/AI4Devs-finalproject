using FluentValidation;

namespace GraphApi.Models.ANM.Anuncios;

public sealed class AnuncioCrearRequestValidator : AbstractValidator<AnuncioCrearRequest>
{
    public AnuncioCrearRequestValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Contenido).NotEmpty().MaximumLength(50_000);
        RuleFor(x => x.TipoAnuncio).NotEmpty().MaximumLength(100);
    }
}
