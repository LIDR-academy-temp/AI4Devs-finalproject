using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.USR.CuartaAutomoviles;

namespace GraphApi.Repositories.USR;

public sealed class CuartaAutomovilesRepository(IDbConnection db) : ICuartaAutomovilesRepository
{
    private AutomovilListSql? _list;
    private AutomovilListSql List => _list ??= AutomovilListSql.Create(db);

    public async Task<IReadOnlyList<AutomovilListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default)
    {
        var sql = List.SelectFrom + """
            WHERE  a.UsuarioID  = @UsuarioId
              AND  a.bEliminado = 0
            ORDER BY a.AutomovilID DESC
            """;
        var result = await db.QueryAsync<AutomovilListItemDto>(sql, new { UsuarioId = usuarioId });
        return result.AsList();
    }

    public async Task<IReadOnlyList<AutomovilListItemDto>> ListarPadronAsync(CancellationToken ct = default)
    {
        var sql = List.SelectFrom + """
            WHERE  a.bEliminado = 0
            ORDER BY a.AutomovilID DESC
            """;
        var result = await db.QueryAsync<AutomovilListItemDto>(sql);
        return result.AsList();
    }

    public async Task<IReadOnlyList<AutomovilListItemDto>> BuscarPorPlacasAsync(string placas, CancellationToken ct = default)
    {
        var sql = List.SelectFrom + """
            WHERE  a.Placas LIKE '%' + @Placas + '%'
              AND  a.bEliminado = 0
            ORDER BY a.AutomovilID DESC
            """;
        var result = await db.QueryAsync<AutomovilListItemDto>(sql, new { Placas = placas });
        return result.AsList();
    }

    public async Task<bool> ExistePlacaAsync(string placas, int? excludeId, IDbTransaction tx)
    {
        const string sql = """
            SELECT COUNT(1) FROM usr.Automoviles
            WHERE Placas = @Placas AND bEliminado = 0
              AND (@ExcludeId IS NULL OR AutomovilID <> @ExcludeId)
            """;
        var count = await db.ExecuteScalarAsync<int>(sql, new { Placas = placas, ExcludeId = excludeId }, tx);
        return count > 0;
    }

    public async Task<int> InsertAsync(AutomovilCrearRequest req, string correo, int usuarioId, IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO usr.Automoviles
                (UsuarioID, MarcaID, ModeloID, ModeloLibre, Placas, Color,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@UsuarioId, @MarcaId, @ModeloId, @ModeloLibre, @Placas, @Color,
                 @Correo, @UsuarioId, GETUTCDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;
        return await db.ExecuteScalarAsync<int>(sql,
            new { UsuarioId = usuarioId, req.MarcaId, req.ModeloId, req.ModeloLibre, req.Placas, req.Color, Correo = correo }, tx);
    }

    public async Task<bool> ActualizarAsync(int automovilId, AutomovilActualizarRequest req, string correo, IDbTransaction tx)
    {
        const string sql = """
            UPDATE usr.Automoviles SET
                MarcaID    = COALESCE(@MarcaId,    MarcaID),
                ModeloID   = COALESCE(@ModeloId,   ModeloID),
                ModeloLibre= COALESCE(@ModeloLibre, ModeloLibre),
                Placas     = COALESCE(@Placas,     Placas),
                Color      = COALESCE(@Color,      Color),
                Modificado = @Correo,
                FechaModificacion = GETUTCDATE()
            WHERE AutomovilID = @AutomovilId AND bEliminado = 0
            """;
        var rows = await db.ExecuteAsync(sql,
            new { AutomovilId = automovilId, req.MarcaId, req.ModeloId, req.ModeloLibre, req.Placas, req.Color, Correo = correo }, tx);
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int automovilId, string correo, IDbTransaction tx)
    {
        const string sql = """
            UPDATE usr.Automoviles SET
                bEliminado = 1,
                Modificado = @Correo,
                FechaModificacion = GETUTCDATE()
            WHERE AutomovilID = @AutomovilId AND bEliminado = 0
            """;
        var rows = await db.ExecuteAsync(sql, new { AutomovilId = automovilId, Correo = correo }, tx);
        return rows > 0;
    }

    public async Task<bool> EsDuenioAsync(int automovilId, int usuarioId)
    {
        const string sql = "SELECT COUNT(1) FROM usr.Automoviles WHERE AutomovilID = @AutomovilId AND UsuarioID = @UsuarioId AND bEliminado = 0";
        var count = await db.ExecuteScalarAsync<int>(sql, new { AutomovilId = automovilId, UsuarioId = usuarioId });
        return count > 0;
    }

    public async Task<bool> ExisteActivoAsync(int automovilId, CancellationToken ct = default)
    {
        const string sql = "SELECT COUNT(1) FROM usr.Automoviles WHERE AutomovilID = @AutomovilId AND bEliminado = 0";
        var count = await db.ExecuteScalarAsync<int>(sql, new { AutomovilId = automovilId });
        return count > 0;
    }

    public async Task<bool> UsuarioActivoAsync(int usuarioId, CancellationToken ct = default)
    {
        var (_, _, activo) = SqlSchemaCompat.UsuarioColumns(db);
        var sql = $"""
            SELECT COUNT(1) FROM sgr.Usuarios
            WHERE UsuarioID = @UsuarioId AND {activo} = 1 AND bEliminado = 0
            """;
        var count = await db.ExecuteScalarAsync<int>(sql, new { UsuarioId = usuarioId });
        return count > 0;
    }

    public async Task<IReadOnlyList<MarcaDto>> ListarMarcasAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT MarcaID AS MarcaId, Marca FROM usr.Marcas WHERE bEliminado = 0 ORDER BY Marca";
        var result = await db.QueryAsync<MarcaDto>(sql);
        return result.AsList();
    }

    public async Task<IReadOnlyList<ModeloDto>> ListarModelosAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT ModeloID AS ModeloId, Modelo, MarcaID AS MarcaId FROM usr.Modelos WHERE bEliminado = 0 ORDER BY Modelo";
        var result = await db.QueryAsync<ModeloDto>(sql);
        return result.AsList();
    }

    public async Task<int> InsertMarcaAsync(string marca, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO usr.Marcas
                (Marca, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.MarcaID
            VALUES (@marca, @correo, @adminId, GETDATE(), 0);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new { marca, correo, adminId }, tx);
    }

    public async Task<bool> UpdateMarcaAsync(int marcaId, string marca, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE usr.Marcas SET
                Marca = @marca,
                Modificado = @correo,
                UsuarioModificacionID = @adminId,
                FechaModificacion = GETDATE()
            WHERE MarcaID = @marcaId AND bEliminado = 0;
            """;
        var n = await db.ExecuteAsync(sql, new { marcaId, marca, correo, adminId }, tx);
        return n > 0;
    }

    public async Task<bool> SoftDeleteMarcaAsync(int marcaId, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE usr.Marcas SET
                bEliminado = 1,
                Modificado = @correo,
                UsuarioModificacionID = @adminId,
                FechaModificacion = GETDATE()
            WHERE MarcaID = @marcaId AND bEliminado = 0;
            """;
        var n = await db.ExecuteAsync(sql, new { marcaId, correo, adminId }, tx);
        return n > 0;
    }

    public async Task<bool> ExisteMarcaActivaAsync(int marcaId, CancellationToken ct = default)
    {
        const string sql = "SELECT COUNT(1) FROM usr.Marcas WHERE MarcaID = @marcaId AND bEliminado = 0;";
        var n = await db.ExecuteScalarAsync<int>(sql, new { marcaId });
        return n > 0;
    }

    public async Task<int> InsertModeloAsync(int marcaId, string modelo, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            INSERT INTO usr.Modelos
                (MarcaID, Modelo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.ModeloID
            VALUES (@marcaId, @modelo, @correo, @adminId, GETDATE(), 0);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new { marcaId, modelo, correo, adminId }, tx);
    }

    public async Task<bool> UpdateModeloAsync(int modeloId, int marcaId, string modelo, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE usr.Modelos SET
                MarcaID = @marcaId,
                Modelo = @modelo,
                Modificado = @correo,
                UsuarioModificacionID = @adminId,
                FechaModificacion = GETDATE()
            WHERE ModeloID = @modeloId AND bEliminado = 0;
            """;
        var n = await db.ExecuteAsync(sql, new { modeloId, marcaId, modelo, correo, adminId }, tx);
        return n > 0;
    }

    public async Task<bool> SoftDeleteModeloAsync(int modeloId, string correo, int adminId, IDbTransaction? tx = null)
    {
        const string sql = """
            UPDATE usr.Modelos SET
                bEliminado = 1,
                Modificado = @correo,
                UsuarioModificacionID = @adminId,
                FechaModificacion = GETDATE()
            WHERE ModeloID = @modeloId AND bEliminado = 0;
            """;
        var n = await db.ExecuteAsync(sql, new { modeloId, correo, adminId }, tx);
        return n > 0;
    }

    private sealed class AutomovilListSql
    {
        public required string SelectFrom { get; init; }

        public static AutomovilListSql Create(IDbConnection db)
        {
            SqlSchemaCompat.EnsureOpen(db);
            var (nombre, correo, _) = SqlSchemaCompat.UsuarioColumns(db);
            var numeroCasa = SqlSchemaCompat.CasaNumeroSelect(db);
            var casaJoin = SqlSchemaCompat.CasaPorUsuarioJoin(db, "a.UsuarioID");

            var selectFrom = $"""
                SELECT a.AutomovilID  AS AutomovilId,
                       a.UsuarioID    AS UsuarioId,
                       {nombre}       AS NombreUsuario,
                       {correo}       AS CorreoUsuario,
                       a.MarcaID      AS MarcaId,
                       m.Marca,
                       a.ModeloID     AS ModeloId,
                       mo.Modelo,
                       a.ModeloLibre,
                       a.Placas,
                       a.Color,
                       {numeroCasa}   AS NumeroCasa
                FROM   usr.Automoviles a
                JOIN   sgr.Usuarios    u  ON u.UsuarioID = a.UsuarioID
                LEFT JOIN usr.Marcas   m  ON m.MarcaID   = a.MarcaID
                LEFT JOIN usr.Modelos  mo ON mo.ModeloID  = a.ModeloID
                {casaJoin}
                """;

            return new AutomovilListSql { SelectFrom = selectFrom };
        }
    }
}
