using System.Text.Json.Serialization;

namespace GraphApi.Models.SGR.Usuarios;

public sealed class PerfilDto
{
    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("correo")]
    public string Correo { get; set; } = string.Empty;

    [JsonPropertyName("telefono")]
    public string? Telefono { get; set; }

    [JsonPropertyName("perfil")]
    public string Perfil { get; set; } = string.Empty;

    [JsonPropertyName("unidad")]
    public string? Unidad { get; set; }

    [JsonPropertyName("condominio")]
    public string? Condominio { get; set; }

    [JsonPropertyName("requiereReLogin")]
    public bool RequiereReLogin { get; set; }
}

public sealed class ActualizarPerfilRequest
{
    [JsonPropertyName("correo")]
    public string Correo { get; set; } = string.Empty;

    [JsonPropertyName("telefono")]
    public string? Telefono { get; set; }

    [JsonPropertyName("nombre")]
    public string? Nombre { get; set; }

    [JsonPropertyName("perfil")]
    public string? Perfil { get; set; }

    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }
}
