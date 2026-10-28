using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class AdminTicketItemDto
{
    [JsonPropertyName("ticketId")]
    public int TicketId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    [JsonPropertyName("prioridad")]
    public string Prioridad { get; set; } = string.Empty;

    [JsonPropertyName("categoria")]
    public string? Categoria { get; set; }

    [JsonPropertyName("solicitante")]
    public string Solicitante { get; set; } = string.Empty;

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }
}

public sealed class AsignarTicketRequest
{
    [JsonPropertyName("ticketId")]
    public int TicketId { get; set; }

    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }
}

public sealed class TrabajadorItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;
}
