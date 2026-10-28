using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class GenerarCuotasRequest
{
    [JsonPropertyName("anio")]
    public int Anio { get; set; }

    [JsonPropertyName("mes")]
    public int Mes { get; set; }

    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    [JsonPropertyName("fechaVencimiento")]
    public DateTime FechaVencimiento { get; set; }

    [JsonPropertyName("cuentaId")]
    public int? CuentaId { get; set; }
}

public sealed class GenerarCuotasResultDto
{
    [JsonPropertyName("creadas")]
    public int Creadas { get; set; }

    [JsonPropertyName("omitidas")]
    public int Omitidas { get; set; }
}
