using System.Data;
using Dapper;
using GraphApi.Models.ANM.Anuncios;

namespace GraphApi.Repositories.ANM;

public sealed class CuartaAnunciosRepository : ICuartaAnunciosRepository
{
    private readonly IDbConnection _db;

    public CuartaAnunciosRepository(IDbConnection db) => _db = db;

    private const string SelectBase = """
        SELECT v.AnuncioID AS AnuncioId,
               v.Titulo,
               v.Contenido,
               v.FechaPublicacion,
               v.VigenteHasta,
               v.TipoAnuncio,
               CASE WHEN EXISTS (
                   SELECT 1 FROM anm.LogVisualizacionAnuncios L WITH (NOLOCK)
                   WHERE L.AnuncioID = v.AnuncioID AND L.UsuarioID = @UsuarioId AND L.bEliminado = 0
               ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS Visto
        FROM anm.vsAnuncios v WITH (NOLOCK)
        WHERE v.bEliminado = 0
        """;

    public async Task<IReadOnlyList<AnuncioListItemDto>> ListarAsync(
        int usuarioId,
        bool incluirNoVigentes,
        CancellationToken ct = default)
    {
        var sql = SelectBase;
        if (!incluirNoVigentes)
        {
            sql += """
                 AND v.FechaPublicacion <= SYSUTCDATETIME()
                 AND (v.VigenteHasta IS NULL OR CAST(v.VigenteHasta AS date) >= CAST(SYSUTCDATETIME() AS date))
                """;
        }

        sql += " ORDER BY v.FechaPublicacion DESC;";

        var list = await _db.QueryAsync<AnuncioListItemDto>(
            new CommandDefinition(sql, new { UsuarioId = usuarioId }, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<AnuncioListItemDto?> ObtenerAsync(
        int anuncioId,
        int usuarioId,
        bool soloVigentes,
        CancellationToken ct = default)
    {
        var sql = SelectBase + " AND v.AnuncioID = @AnuncioId";
        if (soloVigentes)
        {
            sql += """
                 AND v.FechaPublicacion <= SYSUTCDATETIME()
                 AND (v.VigenteHasta IS NULL OR CAST(v.VigenteHasta AS date) >= CAST(SYSUTCDATETIME() AS date))
                """;
        }

        return await _db.QueryFirstOrDefaultAsync<AnuncioListItemDto>(
            new CommandDefinition(sql, new { UsuarioId = usuarioId, AnuncioId = anuncioId }, cancellationToken: ct));
    }

    public async Task<bool> AnuncioVigenteAsync(int anuncioId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM anm.vsAnuncios v WITH (NOLOCK)
                WHERE v.AnuncioID = @Id AND v.bEliminado = 0
                  AND v.FechaPublicacion <= SYSUTCDATETIME()
                  AND (v.VigenteHasta IS NULL OR CAST(v.VigenteHasta AS date) >= CAST(SYSUTCDATETIME() AS date))
            ) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Id = anuncioId }, cancellationToken: ct)) is 1;
    }

    public async Task<int?> ResolverTipoIdAsync(string tipoAnuncio, IDbTransaction tx)
    {
        const string sql = """
            SELECT TOP 1 TipoAnuncioID FROM anm.TiposAnuncio WITH (NOLOCK)
            WHERE TipoAnuncio = @Nombre AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int?>(sql, new { Nombre = tipoAnuncio.Trim() }, tx);
    }

    public async Task<int> InsertAsync(
        string titulo,
        string contenido,
        int tipoAnuncioId,
        DateTime? vigenteHasta,
        string correo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO anm.Anuncios (Titulo, Contenido, FechaPublicacion, VigenteHasta, TipoAnuncioID,
                Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES (@Titulo, @Contenido, SYSUTCDATETIME(), @VigenteHasta, @TipoAnuncioId,
                @Correo, @UsuarioId, SYSUTCDATETIME(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            Titulo = titulo,
            Contenido = contenido,
            VigenteHasta = vigenteHasta,
            TipoAnuncioId = tipoAnuncioId,
            Correo = correo,
            UsuarioId = usuarioId,
        }, tx);
    }

    public async Task<bool> UpdateAsync(
        int anuncioId,
        string? titulo,
        string? contenido,
        int? tipoAnuncioId,
        DateTime? vigenteHasta,
        bool actualizarVigenteHasta,
        string correo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE anm.Anuncios SET
                Titulo = COALESCE(@Titulo, Titulo),
                Contenido = COALESCE(@Contenido, Contenido),
                TipoAnuncioID = COALESCE(@TipoAnuncioId, TipoAnuncioID),
                VigenteHasta = CASE WHEN @ActualizarVigenteHasta = 1 THEN @VigenteHasta ELSE VigenteHasta END,
                Modificado = @Correo,
                UsuarioModificacionID = @UsuarioId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE AnuncioID = @Id AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(sql, new
        {
            Id = anuncioId,
            Titulo = titulo,
            Contenido = contenido,
            TipoAnuncioId = tipoAnuncioId,
            VigenteHasta = vigenteHasta,
            ActualizarVigenteHasta = actualizarVigenteHasta ? 1 : 0,
            Correo = correo,
            UsuarioId = usuarioId,
        }, tx);
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int anuncioId, string correo, int usuarioId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE anm.Anuncios SET bEliminado = 1, Modificado = @Correo,
                UsuarioModificacionID = @UsuarioId, FechaModificacion = SYSUTCDATETIME()
            WHERE AnuncioID = @Id AND bEliminado = 0;
            """;
        return await _db.ExecuteAsync(sql, new { Id = anuncioId, Correo = correo, UsuarioId = usuarioId }, tx) > 0;
    }

    public async Task MarcarVistoAsync(int anuncioId, int usuarioId, string correo, IDbTransaction tx)
    {
        const string sql = """
            IF NOT EXISTS (
                SELECT 1 FROM anm.LogVisualizacionAnuncios WITH (UPDLOCK, HOLDLOCK)
                WHERE AnuncioID = @AnuncioId AND UsuarioID = @UsuarioId AND bEliminado = 0
            )
            INSERT INTO anm.LogVisualizacionAnuncios (AnuncioID, UsuarioID, Medio, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES (@AnuncioId, @UsuarioId, N'WEB', @Correo, @UsuarioId, SYSUTCDATETIME(), 0);
            """;
        await _db.ExecuteAsync(sql, new { AnuncioId = anuncioId, UsuarioId = usuarioId, Correo = correo }, tx);
    }

    public async Task<IReadOnlyList<TipoAnuncioItemDto>> ListarTiposAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT TipoAnuncioID AS TipoAnuncioId, TipoAnuncio
            FROM anm.TiposAnuncio WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY TipoAnuncio;
            """;
        var list = await _db.QueryAsync<TipoAnuncioItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<int> InsertTipoAsync(string tipoAnuncio, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO anm.TiposAnuncio
                (TipoAnuncio, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.TipoAnuncioID
            VALUES
                (@TipoAnuncio, @Correo, @AdminId, SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { TipoAnuncio = tipoAnuncio, Correo = correo, AdminId = adminId }, transaction: tx));
    }

    public async Task<bool> UpdateTipoAsync(int tipoAnuncioId, string tipoAnuncio, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE anm.TiposAnuncio
            SET TipoAnuncio = @TipoAnuncio,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE TipoAnuncioID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(sql,
                new { Id = tipoAnuncioId, TipoAnuncio = tipoAnuncio, Correo = correo, AdminId = adminId },
                transaction: tx));
        return n > 0;
    }

    public async Task<bool> SoftDeleteTipoAsync(int tipoAnuncioId, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE anm.TiposAnuncio
            SET bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE TipoAnuncioID = @Id AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { Id = tipoAnuncioId, Correo = correo, AdminId = adminId }, transaction: tx));
        return n > 0;
    }

    public async Task<int> ContarAnunciosPorTipoIdAsync(int tipoAnuncioId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM anm.Anuncios WITH (NOLOCK)
            WHERE TipoAnuncioID = @Id AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Id = tipoAnuncioId }, cancellationToken: ct));
    }
}
