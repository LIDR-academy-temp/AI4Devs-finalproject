using System.Data;

namespace GraphApi.Repositories.SGR;

public interface IRefreshTokenRepository
{
    Task InsertAsync(int usuarioId, string tokenHash, DateTime expiresUtc, string creadoPor, IDbTransaction? tx = null);
    Task<int?> FindUsuarioIdByHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<bool> RotateAsync(int usuarioId, string previousHash, string newHash, DateTime newExpiresUtc, string modificadoPor, IDbTransaction tx);
    Task<bool> RevokeAsync(string tokenHash, string modificadoPor, CancellationToken cancellationToken = default);

    Task RevokeAllForUsuarioAsync(int usuarioId, string modificadoPor, IDbTransaction tx);
}
