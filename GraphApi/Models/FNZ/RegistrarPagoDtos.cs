using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class RegistrarPagoRequest
{
    [JsonPropertyName("montoPagado")]
    public decimal MontoPagado { get; set; }

    [JsonPropertyName("fechaPago")]
    public DateTime FechaPago { get; set; }

    [JsonPropertyName("metodoPago")]
    public string? MetodoPago { get; set; }

    [JsonPropertyName("referenciaPago")]
    public string ReferenciaPago { get; set; } = string.Empty;
}
