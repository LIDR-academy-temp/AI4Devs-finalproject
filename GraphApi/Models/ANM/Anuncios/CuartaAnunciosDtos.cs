using System.Text.Json.Serialization;

namespace GraphApi.Models.ANM.Anuncios;

public sealed class AnuncioListItemDto
{
    [JsonPropertyName("anuncioId")]
    public int AnuncioId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("contenido")]
    public string Contenido { get; set; } = string.Empty;

    [JsonPropertyName("fechaPublicacion")]
    public DateTime FechaPublicacion { get; set; }

    [JsonPropertyName("vigenteHasta")]
    public DateTime? VigenteHasta { get; set; }

    [JsonPropertyName("tipoAnuncio")]
    public string? TipoAnuncio { get; set; }

    [JsonPropertyName("visto")]
    public bool Visto { get; set; }
}

public sealed class AnuncioCrearRequest
{
    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("contenido")]
    public string Contenido { get; set; } = string.Empty;

    [JsonPropertyName("tipoAnuncio")]
    public string TipoAnuncio { get; set; } = string.Empty;

    [JsonPropertyName("vigenteHasta")]
    public DateTime? VigenteHasta { get; set; }
}

public sealed class AnuncioActualizarRequest
{
    [JsonPropertyName("titulo")]
    public string? Titulo { get; set; }

    [JsonPropertyName("contenido")]
    public string? Contenido { get; set; }

    [JsonPropertyName("tipoAnuncio")]
    public string? TipoAnuncio { get; set; }

    [JsonPropertyName("vigenteHasta")]
    public DateTime? VigenteHasta { get; set; }

    /// <summary>True cuando el JSON incluye la propiedad vigenteHasta (incluso null).</summary>
    [JsonIgnore]
    public bool VigenteHastaEspecificado { get; set; }
}

public sealed class TipoAnuncioItemDto
{
    [JsonPropertyName("tipoAnuncioId")]
    public int TipoAnuncioId { get; set; }

    [JsonPropertyName("tipoAnuncio")]
    public string TipoAnuncio { get; set; } = string.Empty;
}

public sealed class TipoAnuncioUpsertRequest
{
    [JsonPropertyName("tipoAnuncio")]
    public string TipoAnuncio { get; set; } = string.Empty;
}
