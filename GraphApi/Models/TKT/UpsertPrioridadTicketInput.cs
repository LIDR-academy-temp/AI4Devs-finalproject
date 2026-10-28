using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class UpsertPrioridadTicketInput
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("orden")]
    public int? Orden { get; set; }
}
