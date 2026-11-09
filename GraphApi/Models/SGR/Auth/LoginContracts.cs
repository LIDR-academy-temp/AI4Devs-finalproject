using System.Text.Json.Serialization;

namespace GraphApi.Models.SGR.Auth;

public sealed class LoginRequest
{
    [JsonPropertyName("correo")]
    public string Correo { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginResponse
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("expira")]
    public DateTime Expira { get; set; }

    [JsonPropertyName("perfil")]
    public string Perfil { get; set; } = string.Empty;

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("requiereCambioPassword")]
    public bool RequiereCambioPassword { get; set; }
}

public sealed class CambiarPasswordRequest
{
    [JsonPropertyName("passwordActual")]
    public string PasswordActual { get; set; } = string.Empty;

    [JsonPropertyName("passwordNueva")]
    public string PasswordNueva { get; set; } = string.Empty;
}

public sealed class UserAuthRow
{
    public int UsuarioID { get; set; }
    public string Correo { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public bool bActivo { get; set; }
    public bool RequiereCambioPassword { get; set; }
    public string Perfil { get; set; } = string.Empty;
    public bool bAdministrador { get; set; }
    public int? CondominioID { get; set; }
}
