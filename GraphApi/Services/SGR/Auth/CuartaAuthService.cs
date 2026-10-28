using System.Security.Cryptography;
using System.Text;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Auth;
using GraphApi.Repositories.SGR;
using BC = BCrypt.Net.BCrypt;

namespace GraphApi.Services.SGR.Auth;

public sealed class CuartaAuthService : ICuartaAuthService
{
    /// <summary>Hash BCrypt valido para comparacion de tiempo constante cuando no hay usuario.</summary>
    private const string DummyPasswordHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private const int RefreshDays = 14;
    private const int AccessMinutesDefault = 60;

    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IJwtTokenService _jwt;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<CuartaAuthService> _logger;

    public CuartaAuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IJwtTokenService jwt,
        IUnitOfWork uow,
        ILogger<CuartaAuthService> logger)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _jwt = jwt;
        _uow = uow;
        _logger = logger;
    }

    public async Task<(LoginResponse? Ok, string? RefreshPlain, string? ErrorCode, int Status)> LoginAsync(
        LoginRequest request, string clientIp, CancellationToken ct = default)
    {
        var user = await _users.FindByCorreoAsync(request.Correo.Trim(), ct);
        var hashToVerify = user?.PasswordHash ?? DummyPasswordHash;
        var passwordOk = VerifyPassword(request.Password, hashToVerify);

        if (user is null || !user.bActivo || !passwordOk)
        {
            _logger.LogWarning("Login fallido para {Correo} desde {Ip}", request.Correo, clientIp);
            return (null, null, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized);
        }

        var (token, expiraUtc) = _jwt.CreateAccessToken(user, AccessMinutesDefault);
        var refreshPlain = CreateRefreshPlainToken();
        var refreshHash = HashRefreshToken(refreshPlain);

        await _refreshTokens.InsertAsync(
            user.UsuarioID,
            refreshHash,
            DateTime.UtcNow.AddDays(RefreshDays),
            user.Correo);

        _logger.LogInformation("Login exitoso UsuarioID={UsuarioId} Perfil={Perfil} Ip={Ip}",
            user.UsuarioID, user.Perfil, clientIp);

        var response = new LoginResponse
        {
            Token = token,
            Expira = expiraUtc,
            Perfil = user.Perfil,
            Nombre = user.Nombre,
            RequiereCambioPassword = user.RequiereCambioPassword
        };

        return (response, refreshPlain, null, StatusCodes.Status200OK);
    }

    public async Task<(LoginResponse? Ok, string? ErrorCode, int Status, string? NewRefreshPlain)> RefreshAsync(
        string? refreshPlain, string clientIp, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshPlain))
        {
            return (null, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
        }

        var hash = HashRefreshToken(refreshPlain);
        var usuarioId = await _refreshTokens.FindUsuarioIdByHashAsync(hash, ct);
        if (usuarioId is null)
        {
            return (null, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
        }

        var user = await _users.FindByIdAsync(usuarioId.Value, ct);
        if (user is null || !user.bActivo)
        {
            return (null, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
        }

        var newPlain = CreateRefreshPlainToken();
        var newHash = HashRefreshToken(newPlain);

        var tx = _uow.BeginTransaction();
        try
        {
            var rotated = await _refreshTokens.RotateAsync(
                user.UsuarioID, hash, newHash, DateTime.UtcNow.AddDays(RefreshDays), user.Correo, tx);

            if (!rotated)
            {
                _uow.Rollback();
                return (null, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
            }

            _uow.Commit();
        }
        catch
        {
            _uow.Rollback();
            throw;
        }

        var (token, expiraUtc) = _jwt.CreateAccessToken(user, AccessMinutesDefault);
        var response = new LoginResponse
        {
            Token = token,
            Expira = expiraUtc,
            Perfil = user.Perfil,
            Nombre = user.Nombre,
            RequiereCambioPassword = user.RequiereCambioPassword
        };

        return (response, null, StatusCodes.Status200OK, newPlain);
    }

    public async Task LogoutAsync(string? refreshPlain, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshPlain)) return;
        var hash = HashRefreshToken(refreshPlain);
        await _refreshTokens.RevokeAsync(hash, "logout", ct);
    }

    public async Task<(bool Ok, string? ErrorCode, int Status, string? Detail)> CambiarPasswordAsync(
        int usuarioId,
        CambiarPasswordRequest request,
        CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(usuarioId, ct);
        if (user is null || !user.bActivo)
        {
            return (false, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
        }

        if (!VerifyPassword(request.PasswordActual, user.PasswordHash))
        {
            return (false, "INVALID_CURRENT_PASSWORD", StatusCodes.Status400BadRequest,
                "La contraseña actual no es correcta");
        }

        if (request.PasswordActual == request.PasswordNueva)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "La contraseña nueva debe ser distinta de la actual.");
        }

        var newHash = BC.HashPassword(request.PasswordNueva);
        var tx = _uow.BeginTransaction();
        try
        {
            var updated = await _users.UpdatePasswordAsync(usuarioId, newHash, user.Correo, tx);
            if (!updated)
            {
                _uow.Rollback();
                return (false, "INVALID_CREDENTIALS", StatusCodes.Status401Unauthorized, null);
            }

            await _refreshTokens.RevokeAllForUsuarioAsync(usuarioId, user.Correo, tx);
            _uow.Commit();
        }
        catch
        {
            _uow.Rollback();
            throw;
        }

        _logger.LogInformation("Contraseña actualizada UsuarioID={UsuarioId}", usuarioId);
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public string CreateRefreshPlainToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    public string HashRefreshToken(string plain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plain));
        return Convert.ToHexString(bytes);
    }

    private static bool VerifyPassword(string password, string stored)
    {
        if (stored.StartsWith("$2", StringComparison.Ordinal))
        {
            try { return BC.Verify(password, stored); }
            catch { return false; }
        }

        return stored == password;
    }

}
