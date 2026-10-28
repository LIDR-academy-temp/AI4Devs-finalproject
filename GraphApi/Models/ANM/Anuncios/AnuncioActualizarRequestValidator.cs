using FluentValidation;

namespace GraphApi.Models.ANM.Anuncios;

public sealed class AnuncioActualizarRequestValidator : AbstractValidator<AnuncioActualizarRequest>
{
    public AnuncioActualizarRequestValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty()
            .MaximumLength(200)
            .When(x => x.Titulo is not null);

        RuleFor(x => x.Contenido)
            .NotEmpty()
            .MaximumLength(50_000)
            .When(x => x.Contenido is not null);

        RuleFor(x => x.TipoAnuncio)
            .NotEmpty()
            .MaximumLength(100)
            .When(x => x.TipoAnuncio is not null);
    }
}
