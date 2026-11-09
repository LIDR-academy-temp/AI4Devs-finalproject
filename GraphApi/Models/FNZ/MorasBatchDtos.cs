using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class MorosoMorasTargetDto
{
    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }

    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }
}

public sealed class AplicarMorasRequest
{
    [JsonPropertyName("montoMora")]
    public decimal MontoMora { get; set; }

    [JsonPropertyName("mes")]
    public int? Mes { get; set; }

    [JsonPropertyName("anio")]
    public int? Anio { get; set; }

    [JsonPropertyName("residentes")]
    public List<MorosoMorasTargetDto>? Residentes { get; set; }
}

public sealed class MorasBatchResultDto
{
    [JsonPropertyName("actualizadas")]
    public int Actualizadas { get; set; }

    [JsonPropertyName("omitidas")]
    public int Omitidas { get; set; }
}

public sealed class CondonarMorasRequest
{
    [JsonPropertyName("mes")]
    public int? Mes { get; set; }

    [JsonPropertyName("anio")]
    public int? Anio { get; set; }

    [JsonPropertyName("residentes")]
    public List<MorosoMorasTargetDto>? Residentes { get; set; }
}
