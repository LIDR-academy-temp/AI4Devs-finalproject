using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class TicketDetalleDto
{
    [JsonPropertyName("ticketId")]
    public int TicketId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    [JsonPropertyName("estado")]
    public string Estado { get; set; } = string.Empty;

    [JsonPropertyName("prioridad")]
    public string Prioridad { get; set; } = string.Empty;

    [JsonPropertyName("categoria")]
    public string? Categoria { get; set; }

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }

    [JsonPropertyName("fechaCierre")]
    public DateTime? FechaCierre { get; set; }
}

public sealed class ComentarioTicketDto
{
    [JsonPropertyName("comentarioTicketId")]
    public int ComentarioTicketId { get; set; }

    [JsonPropertyName("comentario")]
    public string Comentario { get; set; } = string.Empty;

    [JsonPropertyName("fechaComentario")]
    public DateTime FechaComentario { get; set; }

    [JsonPropertyName("autorNombre")]
    public string AutorNombre { get; set; } = string.Empty;

    [JsonPropertyName("esInterno")]
    public bool EsInterno { get; set; }
}

public sealed class CrearComentarioTicketInput
{
    [JsonPropertyName("comentario")]
    public string Comentario { get; set; } = string.Empty;

    [JsonPropertyName("esInterno")]
    public bool EsInterno { get; set; }
}
