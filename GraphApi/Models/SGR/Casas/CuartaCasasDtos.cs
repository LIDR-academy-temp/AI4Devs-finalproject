using System.Text.Json.Serialization;

namespace GraphApi.Models.SGR.Casas;

public sealed class CondominioItemDto
{
    [JsonPropertyName("condominioId")]
    public int CondominioId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("direccion")]
    public string? Direccion { get; set; }
}

public sealed class CasaListItemDto
{
    [JsonPropertyName("casaId")]
    public int CasaId { get; set; }

    [JsonPropertyName("condominioId")]
    public int CondominioId { get; set; }

    [JsonPropertyName("condominioNombre")]
    public string? CondominioNombre { get; set; }

    [JsonPropertyName("direccion")]
    public string? Direccion { get; set; }

    [JsonPropertyName("numero")]
    public string? Numero { get; set; }

    [JsonPropertyName("propietarioUsuarioId")]
    public int? PropietarioUsuarioId { get; set; }

    [JsonPropertyName("propietarioNombre")]
    public string? PropietarioNombre { get; set; }
}

public sealed class CasaCrearRequest
{
    [JsonPropertyName("condominioId")]
    public int CondominioId { get; set; }

    [JsonPropertyName("direccion")]
    public string Direccion { get; set; } = string.Empty;

    [JsonPropertyName("numero")]
    public string Numero { get; set; } = string.Empty;

    [JsonPropertyName("propietarioUsuarioId")]
    public int? PropietarioUsuarioId { get; set; }
}

public sealed class CasaActualizarRequest
{
    [JsonPropertyName("direccion")]
    public string? Direccion { get; set; }

    [JsonPropertyName("numero")]
    public string? Numero { get; set; }

    [JsonPropertyName("propietarioUsuarioId")]
    public int? PropietarioUsuarioId { get; set; }
}
