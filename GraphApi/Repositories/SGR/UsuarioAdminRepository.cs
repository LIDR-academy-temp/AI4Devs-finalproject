using System.Data;
using Dapper;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public sealed class UsuarioAdminRepository : IUsuarioAdminRepository
{
    private readonly IDbConnection _db;

    public UsuarioAdminRepository(IDbConnection db) => _db = db;

    public async Task<bool> ExisteCorreoAsync(string correo, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios WITH (NOLOCK)
                WHERE Correo = @Correo AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Correo = correo }, cancellationToken: ct));
        return v is 1;
    }

    public async Task<int?> ResolverPerfilIdAsync(string perfil, CancellationToken ct = default)
    {
        const string sql = """
            SELECT TOP (1) PerfilID FROM sgr.Perfiles WITH (NOLOCK)
            WHERE Nombre = @Perfil AND bEliminado = 0;
            """;
        return await _db.QuerySingleOrDefaultAsync<int?>(
            new CommandDefinition(sql, new { Perfil = perfil }, cancellationToken: ct));
    }

    public async Task<int> InsertUsuarioAsync(
        string nombre,
        string correo,
        string? telefono,
        int perfilId,
        string passwordHash,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO sgr.Usuarios
                (Correo, PerfilID, PasswordHash, Nombre, bActivo,
                 Telefono, Creado, UsuarioCreacionID, FechaCreacion, bEliminado, bActualizarPassword)
            VALUES
                (@Correo, @PerfilId, @Hash, @Nombre, 1,
                 @Telefono, @Creado, @CreadoPorId, SYSUTCDATETIME(), 0, 1);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            Correo = correo,
            PerfilId = perfilId,
            Hash = passwordHash,
            Nombre = nombre,
            Telefono = telefono,
            Creado = creadoCorreo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task<bool> CasaExisteAsync(int casaId, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Casas WITH (NOLOCK)
                WHERE CasaID = @CasaId AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { CasaId = casaId }, tx);
        return v is 1;
    }

    public async Task<bool> TienePropietarioVigenteAsync(int casaId, IDbTransaction tx)
    {
        if (await CasaOcupantesDisponibleAsync(tx))
        {
            const string sqlCo = """
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes WITH (NOLOCK)
                    WHERE CasaID = @CasaId AND TipoResidencia = N'Propietario'
                      AND Vigente = 1 AND bEliminado = 0) THEN 1 ELSE 0 END;
                """;
            var co = await _db.ExecuteScalarAsync<int>(sqlCo, new { CasaId = casaId }, tx);
            if (co is 1) return true;
        }

        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Casas WITH (NOLOCK)
                WHERE CasaID = @CasaId AND PropietarioUsuarioID IS NOT NULL AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { CasaId = casaId }, tx);
        return v is 1;
    }

    public async Task InsertCasaOcupanteAsync(
        int casaId,
        int usuarioId,
        string tipoResidencia,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO sgr.CasaOcupantes
                (CasaID, UsuarioID, TipoResidencia, FechaInicio, Vigente,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CasaId, @UsuarioId, @Tipo, CAST(SYSUTCDATETIME() AS DATE), 1,
                 @Creado, @CreadoPorId, SYSUTCDATETIME(), 0);
            """;

        await _db.ExecuteAsync(sql, new
        {
            CasaId = casaId,
            UsuarioId = usuarioId,
            Tipo = tipoResidencia,
            Creado = creadoCorreo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task ActualizarPropietarioCasaAsync(
        int casaId,
        int usuarioId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Casas
               SET PropietarioUsuarioID = @UsuarioId,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE CasaID = @CasaId AND bEliminado = 0;
            """;

        await _db.ExecuteAsync(sql, new
        {
            CasaId = casaId,
            UsuarioId = usuarioId,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);
    }

    public async Task<bool> CasaOcupantesDisponibleAsync(IDbTransaction tx)
    {
        const string sql = "SELECT CASE WHEN OBJECT_ID(N'sgr.CasaOcupantes', N'U') IS NOT NULL THEN 1 ELSE 0 END;";
        var v = await _db.ExecuteScalarAsync<int>(sql, transaction: tx);
        return v is 1;
    }

    public async Task<IReadOnlyList<UsuarioPadronItemDto>> ListarPadronAsync(
        string? perfil,
        bool? bActivo,
        bool incluirEliminados,
        CancellationToken ct = default)
    {
        var sql = """
            SELECT u.UsuarioID AS UsuarioId,
                   u.Nombre AS Nombre,
                   u.Correo AS Correo,
                   u.Telefono AS Telefono,
                   p.Nombre AS Perfil,
                   u.bActivo AS BActivo
            FROM sgr.Usuarios u WITH (NOLOCK)
            INNER JOIN sgr.Perfiles p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
            WHERE 1 = 1
            """;

        if (!incluirEliminados)
        {
            sql += " AND u.bEliminado = 0";
        }

        if (!string.IsNullOrWhiteSpace(perfil))
        {
            sql += " AND p.Nombre = @Perfil";
        }

        if (bActivo.HasValue)
        {
            sql += " AND u.bActivo = @BActivo";
        }

        sql += " ORDER BY u.Nombre;";

        var list = await _db.QueryAsync<UsuarioPadronItemDto>(
            new CommandDefinition(sql, new { Perfil = perfil, BActivo = bActivo }, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<bool> SetActivoAsync(
        int usuarioId,
        bool activo,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Usuarios
               SET bActivo = @Activo,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioId AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            UsuarioId = usuarioId,
            Activo = activo,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);

        return rows == 1;
    }

    public async Task<bool> SoftDeleteAsync(
        int usuarioId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Usuarios
               SET bEliminado = 1,
                   bActivo = 0,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioId AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            UsuarioId = usuarioId,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);

        return rows == 1;
    }

    public async Task<bool> ActualizarPerfilIdAsync(
        int usuarioId,
        int perfilId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Usuarios
               SET PerfilID = @PerfilId,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE UsuarioID = @UsuarioId AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            UsuarioId = usuarioId,
            PerfilId = perfilId,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);

        return rows == 1;
    }
}
