namespace GraphApi.Models.ENC.Encuestas;

public sealed class EncuestaListItemDto
{
    public int EncuestaId { get; set; }
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public bool Activa { get; set; }
    public bool YaParticipo { get; set; }
}

public sealed class TipoPreguntaItemDto
{
    public int TipoPreguntaId { get; set; }
    public string TipoPregunta { get; set; } = "";
}

public sealed class OpcionPreguntaDto
{
    public int OpcionPreguntaId { get; set; }
    public string Texto { get; set; } = "";
    public string? Valor { get; set; }
    public int Orden { get; set; }
}

public sealed class PreguntaDetalleDto
{
    public int PreguntaId { get; set; }
    public string Texto { get; set; } = "";
    public string TipoPregunta { get; set; } = "";
    public int Orden { get; set; }
    public bool Requerida { get; set; }
    public IReadOnlyList<OpcionPreguntaDto> Opciones { get; set; } = Array.Empty<OpcionPreguntaDto>();
}

public sealed class EncuestaDetalleDto
{
    public int EncuestaId { get; set; }
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public bool Activa { get; set; }
    public bool YaParticipo { get; set; }
    public IReadOnlyList<PreguntaDetalleDto> Preguntas { get; set; } = Array.Empty<PreguntaDetalleDto>();
}

public sealed class OpcionCrearRequest
{
    public string Texto { get; set; } = "";
    public string? Valor { get; set; }
    public int Orden { get; set; }
}

public sealed class PreguntaCrearRequest
{
    public string Texto { get; set; } = "";
    public int TipoPreguntaId { get; set; }
    public string TipoPregunta { get; set; } = "";
    public int Orden { get; set; }
    public bool Requerida { get; set; }
    public List<OpcionCrearRequest>? Opciones { get; set; }
}

public sealed class EncuestaCrearRequest
{
    public string Titulo { get; set; } = "";
    public string? Descripcion { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public List<PreguntaCrearRequest> Preguntas { get; set; } = new();
}

public sealed class RespuestaItemRequest
{
    public int PreguntaId { get; set; }
    public int? OpcionPreguntaId { get; set; }
    public string? RespuestaTexto { get; set; }
}

public sealed class EncuestaResponderRequest
{
    public List<RespuestaItemRequest> Respuestas { get; set; } = new();
}

public sealed class ResultadoOpcionDto
{
    public int OpcionPreguntaId { get; set; }
    public string Texto { get; set; } = "";
    public int Conteo { get; set; }
    public decimal Porcentaje { get; set; }
}

public sealed class ResultadoPreguntaDto
{
    public int PreguntaId { get; set; }
    public string Texto { get; set; } = "";
    public string TipoPregunta { get; set; } = "";
    public IReadOnlyList<ResultadoOpcionDto> Opciones { get; set; } = Array.Empty<ResultadoOpcionDto>();
    public IReadOnlyList<string> RespuestasTexto { get; set; } = Array.Empty<string>();
}

public sealed class EncuestaResultadosDto
{
    public int EncuestaId { get; set; }
    public string Titulo { get; set; } = "";
    public int TotalParticipantes { get; set; }
    public IReadOnlyList<ResultadoPreguntaDto> Preguntas { get; set; } = Array.Empty<ResultadoPreguntaDto>();
}
