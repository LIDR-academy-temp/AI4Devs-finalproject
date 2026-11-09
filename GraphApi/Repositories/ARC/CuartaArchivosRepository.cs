using System.Data;
using Dapper;
using GraphApi.Models.ARC.CuartaArchivos;

namespace GraphApi.Repositories.ARC;

public sealed class CuartaArchivosRepository : ICuartaArchivosRepository
{
    private readonly IDbConnection _db;
    public CuartaArchivosRepository(IDbConnection db) => _db = db;

    public async Task<IReadOnlyList<ArchivoListItemDto>> ListarAsync(string? tipoArchivo, CancellationToken ct = default)
    {
        var sql = """
            SELECT a.ArchivoID  AS ArchivoId,
                   a.Nombre,
                   a.Ruta,
                   a.TipoArchivoID AS TipoArchivoId,
                   a.TipoArchivo,
                   a.EsPrivado,
                   a.FechaCreacion
            FROM arc.vsArchivos a
            WHERE a.bEliminado = 0
            """ + (string.IsNullOrWhiteSpace(tipoArchivo) ? "" : "\nAND a.TipoArchivo = @TipoArchivo") +
            "\nORDER BY a.FechaCreacion DESC;";

        var list = await _db.QueryAsync<ArchivoListItemDto>(
            new CommandDefinition(sql,
                string.IsNullOrWhiteSpace(tipoArchivo) ? null : new { TipoArchivo = tipoArchivo },
                cancellationToken: ct));
        return list.ToList();
    }

    public async Task<IReadOnlyList<TipoArchivoItemDto>> ListarTiposAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT TipoArchivoID AS TipoArchivoId, TipoArchivo
            FROM arc.TiposArchivo WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY TipoArchivo;
            """;
        var list = await _db.QueryAsync<TipoArchivoItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<ArchivoListItemDto?> ObtenerAsync(int archivoId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT a.ArchivoID  AS ArchivoId,
                   a.Nombre,
                   a.Ruta,
                   a.TipoArchivoID AS TipoArchivoId,
                   a.TipoArchivo,
                   a.EsPrivado,
                   a.FechaCreacion
            FROM arc.vsArchivos a
            WHERE a.ArchivoID = @ArchivoId AND a.bEliminado = 0;
            """;
        return await _db.QueryFirstOrDefaultAsync<ArchivoListItemDto>(
            new CommandDefinition(sql, new { ArchivoId = archivoId }, cancellationToken: ct));
    }

    public async Task<int?> ResolverTipoArchivoIdAsync(string tipoArchivo, IDbTransaction? tx = null)
    {
        const string sql = "SELECT TOP 1 TipoArchivoID FROM arc.TiposArchivo WITH (NOLOCK) WHERE TipoArchivo = @TipoArchivo AND bEliminado = 0;";
        var id = await _db.QueryFirstOrDefaultAsync<int?>(
            new CommandDefinition(sql, new { TipoArchivo = tipoArchivo }, transaction: tx));
        return id;
    }

    public async Task<int> InsertArchivoAsync(
        string nombre,
        string ruta,
        int tipoArchivoId,
        bool esPrivado,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO arc.Archivos
                (Nombre, Ruta, TipoArchivoID, EsPrivado,
                 Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                 FechaCreacion, FechaModificacion, bEliminado)
            OUTPUT INSERTED.ArchivoID
            VALUES
                (@Nombre, @Ruta, @TipoArchivoId, @EsPrivado,
                 @Correo, @Correo, @AdminId, @AdminId,
                 SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql,
                new { Nombre = nombre, Ruta = ruta, TipoArchivoId = tipoArchivoId, EsPrivado = esPrivado, Correo = correo, AdminId = adminId },
                transaction: tx));
    }

    public async Task<bool> UpdateArchivoAsync(
        int archivoId,
        string nombre,
        int tipoArchivoId,
        bool esPrivado,
        string correo,
        int adminId,
        IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE arc.Archivos
            SET Nombre = @Nombre,
                TipoArchivoID = @TipoArchivoId,
                EsPrivado = @EsPrivado,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE ArchivoID = @ArchivoId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql,
                new
                {
                    ArchivoId = archivoId,
                    Nombre = nombre,
                    TipoArchivoId = tipoArchivoId,
                    EsPrivado = esPrivado,
                    Correo = correo,
                    AdminId = adminId,
                },
                transaction: tx));
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int archivoId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE arc.Archivos
            SET bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE ArchivoID = @ArchivoId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { ArchivoId = archivoId, Correo = correo, AdminId = adminId }, transaction: tx));
        return rows > 0;
    }

    public async Task<int> InsertTipoAsync(string tipoArchivo, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO arc.TiposArchivo
                (TipoArchivo, Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                 FechaCreacion, FechaModificacion, bEliminado)
            OUTPUT INSERTED.TipoArchivoID
            VALUES
                (@TipoArchivo, @Correo, @Correo, @AdminId, @AdminId,
                 SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql,
                new { TipoArchivo = tipoArchivo, Correo = correo, AdminId = adminId },
                transaction: tx));
    }

    public async Task<bool> UpdateTipoAsync(int tipoArchivoId, string tipoArchivo, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE arc.TiposArchivo
            SET TipoArchivo = @TipoArchivo,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE TipoArchivoID = @TipoArchivoId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql,
                new { TipoArchivoId = tipoArchivoId, TipoArchivo = tipoArchivo, Correo = correo, AdminId = adminId },
                transaction: tx));
        return rows > 0;
    }

    public async Task<bool> SoftDeleteTipoAsync(int tipoArchivoId, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE arc.TiposArchivo
            SET bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE TipoArchivoID = @TipoArchivoId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(
            new CommandDefinition(sql,
                new { TipoArchivoId = tipoArchivoId, Correo = correo, AdminId = adminId },
                transaction: tx));
        return rows > 0;
    }

    public async Task InsertLogVisualizacionAsync(int archivoId, int usuarioId, string correo, string? medio, string? ip, string? ua, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO arc.LogVisualizacionArchivos
                (ArchivoID, UsuarioID, Medio, IPOrigen, UserAgent,
                 Creado, Modificado, UsuarioCreacionID, UsuarioModificacionID,
                 FechaCreacion, FechaModificacion, bEliminado)
            VALUES
                (@ArchivoId, @UsuarioId, @Medio, @Ip, @Ua,
                 @Correo, @Correo, @UsuarioId, @UsuarioId,
                 SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
            """;
        await _db.ExecuteAsync(
            new CommandDefinition(sql,
                new { ArchivoId = archivoId, UsuarioId = usuarioId, Medio = medio, Ip = ip, Ua = ua, Correo = correo },
                transaction: tx));
    }
}
