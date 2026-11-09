using System.Text.Json.Serialization;

namespace GraphApi.Models.ARC.CuartaArchivos;

public sealed class ArchivoListItemDto
{
    [JsonPropertyName("archivoId")]
    public int ArchivoId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("ruta")]
    public string Ruta { get; set; } = "";

    [JsonPropertyName("tipoArchivoId")]
    public int? TipoArchivoId { get; set; }

    [JsonPropertyName("tipoArchivo")]
    public string TipoArchivo { get; set; } = "";

    [JsonPropertyName("esPrivado")]
    public bool EsPrivado { get; set; }

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }
}

public sealed class TipoArchivoItemDto
{
    [JsonPropertyName("tipoArchivoId")]
    public int TipoArchivoId { get; set; }

    [JsonPropertyName("tipoArchivo")]
    public string TipoArchivo { get; set; } = "";
}

public sealed class SubirArchivoRequest
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("tipoArchivo")]
    public string TipoArchivo { get; set; } = "";

    [JsonPropertyName("esPrivado")]
    public bool EsPrivado { get; set; }
}

public sealed class TipoArchivoUpsertRequest
{
    [JsonPropertyName("tipoArchivo")]
    public string TipoArchivo { get; set; } = "";
}

public sealed class ActualizarArchivoRequest
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("tipoArchivo")]
    public string TipoArchivo { get; set; } = "";

    [JsonPropertyName("esPrivado")]
    public bool EsPrivado { get; set; }
}
