using System.Data;
using Dapper;
using GraphApi.Models.SGR.Auth;

namespace GraphApi.Repositories.SGR;

public sealed class UserRepository : IUserRepository
{
    private readonly IDbConnection _db;
    private readonly bool _logical;

    public UserRepository(IDbConnection db)
    {
        _db = db;
        _logical = DetectLogicalColumns(db);
    }

    private static bool DetectLogicalColumns(IDbConnection db)
    {
        try
        {
            return db.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.columns c
                INNER JOIN sys.tables t ON t.object_id = c.object_id
                INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                WHERE s.name = N'sgr' AND t.name = N'Usuarios' AND c.name = N'Correo';
                """) == 1;
        }
        catch
        {
            return false;
        }
    }

    public async Task<UserAuthRow?> FindByCorreoAsync(string correo, CancellationToken cancellationToken = default)
    {
        var sql = BuildSelectSql("WHERE u.Correo = @Correo AND u.bEliminado = 0");
        if (!_logical)
        {
            sql = sql.Replace("u.Correo = @Correo", "u.CorreoUsuario = @Correo", StringComparison.Ordinal);
        }

        return await _db.QuerySingleOrDefaultAsync<UserAuthRow>(
            new CommandDefinition(sql, new { Correo = correo }, cancellationToken: cancellationToken));
    }

    public async Task<UserAuthRow?> FindByIdAsync(int usuarioId, CancellationToken cancellationToken = default)
    {
        var sql = BuildSelectSql("WHERE u.UsuarioID = @UsuarioID AND u.bEliminado = 0");
        return await _db.QuerySingleOrDefaultAsync<UserAuthRow>(
            new CommandDefinition(sql, new { UsuarioID = usuarioId }, cancellationToken: cancellationToken));
    }

    public async Task<bool> UpdatePasswordAsync(
        int usuarioId,
        string passwordHash,
        string modificadoPor,
        IDbTransaction tx)
    {
        var col = _logical ? "PasswordHash" : "PasswordUsuario";
        var sql = $"""
            UPDATE sgr.Usuarios
               SET {col} = @PasswordHash,
                   bActualizarPassword = 0,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @UsuarioID,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioID
               AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            UsuarioID = usuarioId,
            PasswordHash = passwordHash,
            Modificado = modificadoPor,
        }, tx);

        return rows == 1;
    }

    private string BuildSelectSql(string whereClause)
    {
        if (_logical)
        {
            return $"""
                SELECT u.UsuarioID,
                       u.Correo,
                       u.PasswordHash,
                       u.Nombre,
                       u.bActivo AS bActivo,
                       u.bActualizarPassword AS RequiereCambioPassword,
                       p.Nombre AS Perfil,
                       p.bAdministrador,
                       c.CondominioID AS CondominioID
                FROM sgr.Usuarios AS u WITH (NOLOCK)
                INNER JOIN sgr.Perfiles AS p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
                OUTER APPLY (
                    SELECT TOP (1) ca.CondominioID
                    FROM sgr.Casas AS ca WITH (NOLOCK)
                    WHERE ca.PropietarioUsuarioID = u.UsuarioID AND ca.bEliminado = 0
                    ORDER BY ca.CasaID
                ) AS c
                {whereClause};
                """;
        }

        return $"""
            SELECT u.UsuarioID,
                   u.CorreoUsuario AS Correo,
                   u.PasswordUsuario AS PasswordHash,
                   u.NombreUsuario AS Nombre,
                   u.bActivoUsuario AS bActivo,
                   u.bActualizarPassword AS RequiereCambioPassword,
                   p.Perfil AS Perfil,
                   p.bAdministrador,
                   c.CondominioID AS CondominioID
            FROM sgr.Usuarios AS u WITH (NOLOCK)
            INNER JOIN sgr.Perfiles AS p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
            OUTER APPLY (
                SELECT TOP (1) ca.CondominioID
                FROM sgr.Casas AS ca WITH (NOLOCK)
                WHERE ca.PropietarioUsuarioID = u.UsuarioID AND ca.bEliminado = 0
                ORDER BY ca.CasaID
            ) AS c
            {whereClause};
            """;
    }
}
