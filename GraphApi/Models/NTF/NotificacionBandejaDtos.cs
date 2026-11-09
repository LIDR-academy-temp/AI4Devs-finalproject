using System.Text.Json.Serialization;

namespace GraphApi.Models.NTF;

public sealed class NotificacionItemDto
{
    [JsonPropertyName("notificacionId")]
    public int NotificacionId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("mensaje")]
    public string Mensaje { get; set; } = string.Empty;

    [JsonPropertyName("tipo")]
    public string Tipo { get; set; } = string.Empty;

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }

    [JsonPropertyName("leida")]
    public bool Leida { get; set; }
}

public sealed class NotificacionBandejaResponse
{
    [JsonPropertyName("items")]
    public IReadOnlyList<NotificacionItemDto> Items { get; set; } = Array.Empty<NotificacionItemDto>();

    [JsonPropertyName("pagina")]
    public int Pagina { get; set; }

    [JsonPropertyName("tamano")]
    public int Tamano { get; set; }

    [JsonPropertyName("totalNoLeidas")]
    public int TotalNoLeidas { get; set; }
}

public sealed class AvisoGeneralRequest
{
    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("mensaje")]
    public string Mensaje { get; set; } = string.Empty;
}

public sealed class AvisoGeneralResponse
{
    [JsonPropertyName("destinatarios")]
    public int Destinatarios { get; set; }
}
