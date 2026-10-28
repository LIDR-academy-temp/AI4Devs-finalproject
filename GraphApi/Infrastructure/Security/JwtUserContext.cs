using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace GraphApi.Infrastructure.Security;

public static class JwtUserContext
{
    public static bool TryGetUsuarioId(ClaimsPrincipal user, out int usuarioId)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return int.TryParse(sub, out usuarioId);
    }

    public static string? GetCorreo(ClaimsPrincipal user) =>
        user.FindFirstValue("correo");

    public static string? GetPerfil(ClaimsPrincipal user) =>
        user.FindFirstValue("perfil");

    public static bool EsAdministrador(ClaimsPrincipal user) =>
        user.HasClaim("perfil", "Administrador");
}
