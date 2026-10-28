using System.Text.Json.Serialization;

namespace GraphApi.Models.TKT;

public sealed class TicketAsignadosFiltroDto
{
    public bool? Terminado { get; set; }
    public int? EstadoTicketId { get; set; }
    public int Pagina { get; set; } = 1;
    public int Tamano { get; set; } = 20;
}

public sealed class TicketFiltroDto
{
    public int? EstadoTicketId { get; set; }
    public int? CategoriaTicketId { get; set; }
    public int Pagina { get; set; } = 1;
    public int Tamano { get; set; } = 20;
}

public sealed class MiTicketItemDto
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

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }
}

public sealed class PaginaDto<T>
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("pagina")]
    public int Pagina { get; set; }

    [JsonPropertyName("items")]
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
}

public sealed class CatalogoItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;
}
