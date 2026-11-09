using System.Data;
using Dapper;

namespace GraphApi.Repositories.SGR;

public sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IDbConnection _db;

    public RefreshTokenRepository(IDbConnection db) => _db = db;

    public async Task InsertAsync(int usuarioId, string tokenHash, DateTime expiresUtc, string creadoPor, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO sgr.RefreshTokens
                (UsuarioID, Token, FechaExpira, Revocado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@UsuarioID, @Token, @FechaExpira, 0, @Creado, @UsuarioID, SYSUTCDATETIME(), 0);
            """;

        await _db.ExecuteAsync(sql, new
        {
            UsuarioID = usuarioId,
            Token = tokenHash,
            FechaExpira = expiresUtc,
            Creado = creadoPor
        }, tx);
    }

    public async Task<int?> FindUsuarioIdByHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (1) UsuarioID
            FROM sgr.RefreshTokens WITH (NOLOCK)
            WHERE Token = @Token
              AND Revocado = 0
              AND bEliminado = 0
              AND FechaExpira > SYSUTCDATETIME();
            """;

        return await _db.QuerySingleOrDefaultAsync<int?>(
            new CommandDefinition(sql, new { Token = tokenHash }, cancellationToken: cancellationToken));
    }

    public async Task<bool> RotateAsync(int usuarioId, string previousHash, string newHash, DateTime newExpiresUtc, string modificadoPor, IDbTransaction tx)
    {
        const string updateSql = """
            UPDATE sgr.RefreshTokens
               SET Revocado = 1,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @UsuarioID,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE Token = @PreviousHash
               AND Revocado = 0
               AND bEliminado = 0
               AND FechaExpira > SYSUTCDATETIME();
            """;

        var rows = await _db.ExecuteAsync(updateSql, new
        {
            Modificado = modificadoPor,
            UsuarioID = usuarioId,
            PreviousHash = previousHash
        }, tx);

        if (rows != 1) return false;

        await InsertAsync(usuarioId, newHash, newExpiresUtc, modificadoPor, tx);
        return true;
    }

    public async Task<bool> RevokeAsync(string tokenHash, string modificadoPor, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE sgr.RefreshTokens
               SET Revocado = 1,
                   Modificado = @Modificado,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE Token = @Token
               AND Revocado = 0
               AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Token = tokenHash, Modificado = modificadoPor }, cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task RevokeAllForUsuarioAsync(int usuarioId, string modificadoPor, IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.RefreshTokens
               SET Revocado = 1,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @UsuarioID,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioID
               AND Revocado = 0
               AND bEliminado = 0;
            """;

        await _db.ExecuteAsync(sql, new
        {
            UsuarioID = usuarioId,
            Modificado = modificadoPor,
        }, tx);
    }
}
