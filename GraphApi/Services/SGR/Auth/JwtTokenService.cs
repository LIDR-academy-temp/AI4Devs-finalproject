using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GraphApi.Models.Security.AuthService;
using GraphApi.Models.SGR.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace GraphApi.Services.SGR.Auth;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly clJwtSettings _settings;

    public JwtTokenService(IOptions<clJwtSettings> options) => _settings = options.Value;

    public (string Token, DateTime ExpiraUtc) CreateAccessToken(UserAuthRow user, int accessMinutes)
    {
        var utcNow = DateTime.UtcNow;
        var expira = utcNow.AddMinutes(accessMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UsuarioID.ToString()),
            new("correo", user.Correo),
            new("nombre", user.Nombre),
            new("perfil", user.Perfil),
            new("bAdministrador", user.bAdministrador ? "true" : "false"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (user.CondominioID is int condominioId)
        {
            claims.Add(new Claim("condominioId", condominioId.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: utcNow,
            expires: expira,
            signingCredentials: creds);

        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (token, expira);
    }
}
