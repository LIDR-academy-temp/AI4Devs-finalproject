using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class UpsertCategoriaTicketInput
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;
}
