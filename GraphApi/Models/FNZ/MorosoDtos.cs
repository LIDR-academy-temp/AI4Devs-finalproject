using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class MorosoDto
{
    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("casa")]
    public string? Casa { get; set; }

    [JsonPropertyName("cuotasVencidas")]
    public int CuotasVencidas { get; set; }

    [JsonPropertyName("totalAdeudado")]
    public decimal TotalAdeudado { get; set; }
}

public sealed class MorososQuery
{
    public int? Mes { get; set; }

    public int? Anio { get; set; }
}
