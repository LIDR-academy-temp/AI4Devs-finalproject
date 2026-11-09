using FluentValidation;

namespace GraphApi.Models.ENC.Encuestas;

public sealed class EncuestaCrearRequestValidator : AbstractValidator<EncuestaCrearRequest>
{
    public EncuestaCrearRequestValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Descripcion).MaximumLength(500);
        RuleForEach(x => x.Preguntas).ChildRules(p =>
        {
            p.RuleFor(x => x.Texto).NotEmpty().MaximumLength(500);
            p.RuleFor(x => x)
                .Must(x => x.TipoPreguntaId > 0 || !string.IsNullOrWhiteSpace(x.TipoPregunta))
                .WithMessage("Tipo de pregunta requerido");
        });
    }
}

public sealed class EncuestaResponderRequestValidator : AbstractValidator<EncuestaResponderRequest>
{
    public EncuestaResponderRequestValidator()
    {
        RuleFor(x => x.Respuestas).NotEmpty();
    }
}
