using FluentValidation;

namespace GraphApi.Models.ENC.Encuestas;

public sealed class EncuestaActualizarRequest
{
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
}

public sealed class EncuestaActualizarRequestValidator : AbstractValidator<EncuestaActualizarRequest>
{
    public EncuestaActualizarRequestValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Descripcion).MaximumLength(500);
    }
}

public sealed class PreguntaCrearRequestValidator : AbstractValidator<PreguntaCrearRequest>
{
    public PreguntaCrearRequestValidator()
    {
        RuleFor(x => x.Texto).NotEmpty().MaximumLength(500);
        RuleFor(x => x)
            .Must(x => x.TipoPreguntaId > 0 || !string.IsNullOrWhiteSpace(x.TipoPregunta))
            .WithMessage("Tipo de pregunta requerido");
    }
}

public sealed class PreguntaActualizarRequest
{
    public string Texto { get; set; } = "";
    public int TipoPreguntaId { get; set; }
    public string TipoPregunta { get; set; } = "";
    public int Orden { get; set; }
    public bool Requerida { get; set; }
}

public sealed class PreguntaActualizarRequestValidator : AbstractValidator<PreguntaActualizarRequest>
{
    public PreguntaActualizarRequestValidator()
    {
        RuleFor(x => x.Texto).NotEmpty().MaximumLength(500);
        RuleFor(x => x)
            .Must(x => x.TipoPreguntaId > 0 || !string.IsNullOrWhiteSpace(x.TipoPregunta))
            .WithMessage("Tipo de pregunta requerido");
    }
}

public sealed class OpcionActualizarRequest
{
    public string Texto { get; set; } = "";
    public string? Valor { get; set; }
    public int Orden { get; set; }
}

public sealed class OpcionActualizarRequestValidator : AbstractValidator<OpcionActualizarRequest>
{
    public OpcionActualizarRequestValidator()
    {
        RuleFor(x => x.Texto).NotEmpty().MaximumLength(200);
    }
}
