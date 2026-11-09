using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class PrioridadCatalogoItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("orden")]
    public int? Orden { get; set; }
}
