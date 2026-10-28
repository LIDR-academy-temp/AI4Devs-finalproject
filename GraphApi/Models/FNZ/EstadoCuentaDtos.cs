using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class EstadoCuentaDto
{
    [JsonPropertyName("cuotas")]
    public IReadOnlyList<CuotaEstadoDto> Cuotas { get; set; } = [];

    [JsonPropertyName("totalPendiente")]
    public decimal TotalPendiente { get; set; }

    [JsonPropertyName("totalVencido")]
    public decimal TotalVencido { get; set; }
}

public sealed class CuotaEstadoDto
{
    [JsonPropertyName("cuotaId")]
    public int CuotaId { get; set; }

    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }

    [JsonPropertyName("direccion")]
    public string? Direccion { get; set; }

    [JsonPropertyName("numero")]
    public string? Numero { get; set; }

    [JsonPropertyName("cuentaId")]
    public int? CuentaId { get; set; }

    [JsonPropertyName("cuenta")]
    public string? Cuenta { get; set; }

    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    [JsonPropertyName("montoPagado")]
    public decimal MontoPagado { get; set; }

    [JsonPropertyName("periodoInicio")]
    public DateTime PeriodoInicio { get; set; }

    [JsonPropertyName("periodoFin")]
    public DateTime PeriodoFin { get; set; }

    [JsonPropertyName("fechaVencimiento")]
    public DateTime FechaVencimiento { get; set; }

    [JsonPropertyName("fechaPago")]
    public DateTime? FechaPago { get; set; }

    [JsonPropertyName("metodoPago")]
    public string? MetodoPago { get; set; }

    [JsonPropertyName("referenciaPago")]
    public string? ReferenciaPago { get; set; }

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    [JsonPropertyName("esVencida")]
    public bool EsVencida { get; set; }
}
