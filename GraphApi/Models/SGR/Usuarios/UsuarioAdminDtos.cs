using System.Text.Json.Serialization;

namespace GraphApi.Models.SGR.Usuarios;

public sealed class CrearUsuarioAdminRequest
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("correo")]
    public string Correo { get; set; } = string.Empty;

    [JsonPropertyName("telefono")]
    public string? Telefono { get; set; }

    [JsonPropertyName("perfil")]
    public string Perfil { get; set; } = "Residente";

    [JsonPropertyName("casaId")]
    public int? CasaId { get; set; }
}

public sealed class UsuarioCreadoDto
{
    [JsonPropertyName("usuarioId")]
    public int UsuarioId { get; set; }

    [JsonPropertyName("passwordTemporal")]
    public string PasswordTemporal { get; set; } = string.Empty;
}

public sealed class UsuarioPadronItemDto
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

    [JsonPropertyName("bActivo")]
    public bool BActivo { get; set; }
}
