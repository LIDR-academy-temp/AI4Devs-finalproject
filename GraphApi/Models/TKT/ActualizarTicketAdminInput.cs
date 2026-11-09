using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class ActualizarTicketAdminInput
{
    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    [JsonPropertyName("categoria")]
    public string Categoria { get; set; } = string.Empty;

    [JsonPropertyName("prioridad")]
    public string? Prioridad { get; set; }
}
