using Dapper;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GraphApi.Infrastructure;
using GraphApi.Models.Security.AuthService;
using BC = BCrypt.Net.BCrypt;

namespace GraphApi.Services.Security.AuthService
{
    public class AuthService : IAuthService
    {
        private readonly clJwtSettings _objJwtSettings;
        private readonly IDbConnection _objDb;
        private readonly ILogger<AuthService> _logger;

        private readonly string _colCorreo;
        private readonly string _colActivo;
        private readonly string _colPassword;

        public AuthService(
            IOptions<clJwtSettings> objJwtOptions,
            IDbConnection objDbConnection,
            ILogger<AuthService> logger)
        {
            _objJwtSettings = objJwtOptions.Value;
            _objDb = objDbConnection;
            _logger = logger;
            // ADR-008: detectar schema pre/post DB-001 en construcción.
            var (_, correo, activo) = SqlSchemaCompat.UsuarioColumns(objDbConnection, "u");
            _colCorreo  = correo.Replace("u.", "");
            _colActivo  = activo.Replace("u.", "");
            _colPassword = SqlSchemaCompat.HasColumn(objDbConnection, "sgr", "Usuarios", "Password")
                ? "Password" : "PasswordUsuario";
        }

        public async Task<clAuthServiceResponse> Authenticate(clAuthServiceRequest objAuthServiceRequest)
        {
            // 1) Buscar usuario activo por correo en sgr.Usuarios (ADR-008: columnas dinámicas).
            var sSql = $@"
                SELECT {_colCorreo} AS NombreUsuario, {_colPassword} AS Password
                FROM sgr.Usuarios (NOLOCK)
                WHERE {_colCorreo} = @NombreUsuario
                  AND {_colActivo} = 1
                  AND bEliminado = 0;
            ";

            var vUser = await _objDb.QuerySingleOrDefaultAsync<clAuthServiceRequest>(
                sSql,
                new { NombreUsuario = objAuthServiceRequest.NombreUsuario }
            );

            // 2) Validar existencia y contraseña
            bool validCredentials = false;
            if (vUser != null)
            {
                var stored = vUser.Password ?? string.Empty;
                // Si el hash empieza con $2 es BCrypt; si no, comparar en texto plano
                if (stored.StartsWith("$2"))
                {
                    try { validCredentials = BC.Verify(objAuthServiceRequest.Password, stored); }
                    catch { validCredentials = false; }
                }
                else
                {
                    validCredentials = stored == objAuthServiceRequest.Password;
                }
            }

            if (!validCredentials)
            {
                _logger.LogWarning("Failed login attempt for user {Username}", objAuthServiceRequest.NombreUsuario);
                throw new UnauthorizedAccessException("Invalido Usuario o Password");
            }

            // 3) Crear claims
            var vClaims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, objAuthServiceRequest.NombreUsuario),
                new Claim("role", "Admin"),            // o rol dinámico si lo guardas en la tabla
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // 4) Generar token
            var vKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_objJwtSettings.Key));
            var vCreds = new SigningCredentials(vKey, SecurityAlgorithms.HmacSha256);
            // 2) Fecha “ahora” en UTC para el token
            var vUtcNow = DateTime.UtcNow;
            var vUtcExp = vUtcNow.AddMinutes(_objJwtSettings.DurationInMinutes);

            // 3) Generar el JWT con fechas UTC
            var vJwt = new JwtSecurityToken(
                issuer: _objJwtSettings.Issuer,
                audience: _objJwtSettings.Audience,
                claims: vClaims,
                notBefore: vUtcNow,
                expires: vUtcExp,
                signingCredentials: vCreds
            );
            var vTokenString = new JwtSecurityTokenHandler().WriteToken(vJwt);

            // 4) Convertir UTC → hora local
            var vLocalExp = TimeZoneInfo.ConvertTimeFromUtc(vUtcExp, TimeZoneInfo.Local);

            // 5) Devolver resultado
            return new clAuthServiceResponse
            {
                Token = vTokenString,
                Expires = vLocalExp
            };
        }
    }
}

