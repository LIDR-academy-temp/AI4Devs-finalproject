using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.WMS.CuartaAlmacen;

namespace GraphApi.Repositories.WMS;

public class CuartaAlmacenRepository(IDbConnection db) : ICuartaAlmacenRepository
{
    private const string ArticulosListSql = """
        SELECT a.ArticuloID AS ArticuloId,
               a.Nombre,
               a.CategoriaID AS CategoriaId,
               c.Nombre AS Categoria,
               a.Stock,
               a.StockMinimo,
               CASE WHEN a.Stock < a.StockMinimo THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS BajoMinimo,
               a.Ubicacion
        FROM wms.Articulos a
        LEFT JOIN wms.CategoriasArticulo c ON c.CategoriaID = a.CategoriaID AND c.bEliminado = 0
        """;

    private const string ArticulosDetalleSql = """
        SELECT a.ArticuloID AS ArticuloId,
               a.Nombre,
               a.CategoriaID AS CategoriaId,
               c.Nombre AS Categoria,
               a.Stock,
               a.StockMinimo,
               CASE WHEN a.Stock < a.StockMinimo THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS BajoMinimo,
               a.Ubicacion,
               a.FechaCreacion,
               a.FechaModificacion
        FROM wms.Articulos a
        LEFT JOIN wms.CategoriasArticulo c ON c.CategoriaID = a.CategoriaID AND c.bEliminado = 0
        """;

    private string PrestamosListSql()
    {
        var notas = SqlSchemaCompat.PrestamosNotasSelect(db, "p");
        if (SqlSchemaCompat.HasView(db, "sgr", "vsUsuarios"))
        {
            var legacyAliases = SqlSchemaCompat.ViewHasColumn(db, "sgr", "vsUsuarios", "NombreUsuario");
            if (legacyAliases)
            {
                return $"""
                    SELECT p.PrestamoID AS PrestamoId,
                           p.ArticuloID AS ArticuloId,
                           a.Nombre AS NombreArticulo,
                           p.UsuarioID AS UsuarioId,
                           u.NombreUsuario AS NombreUsuario,
                           u.CorreoUsuario AS CorreoUsuario,
                           p.Cantidad,
                           p.FechaPrestamo,
                           p.FechaDevolucion,
                           p.Estado,
                           {notas}
                    FROM wms.Prestamos p
                    INNER JOIN wms.Articulos a ON a.ArticuloID = p.ArticuloID
                    INNER JOIN sgr.vsUsuarios u ON u.UsuarioID = p.UsuarioID
                    """;
            }

            return $"""
                SELECT p.PrestamoID AS PrestamoId,
                       p.ArticuloID AS ArticuloId,
                       a.Nombre AS NombreArticulo,
                       p.UsuarioID AS UsuarioId,
                       u.Nombre AS NombreUsuario,
                       u.Correo AS CorreoUsuario,
                       p.Cantidad,
                       p.FechaPrestamo,
                       p.FechaDevolucion,
                       p.Estado,
                       {notas}
                FROM wms.Prestamos p
                INNER JOIN wms.Articulos a ON a.ArticuloID = p.ArticuloID
                INNER JOIN sgr.vsUsuarios u ON u.UsuarioID = p.UsuarioID
                """;
        }

        var (nombre, correo, _) = SqlSchemaCompat.UsuarioColumns(db, "u");
        return $"""
            SELECT p.PrestamoID AS PrestamoId,
                   p.ArticuloID AS ArticuloId,
                   a.Nombre AS NombreArticulo,
                   p.UsuarioID AS UsuarioId,
                   {nombre} AS NombreUsuario,
                   {correo} AS CorreoUsuario,
                   p.Cantidad,
                   p.FechaPrestamo,
                   p.FechaDevolucion,
                   p.Estado,
                   {notas}
            FROM wms.Prestamos p
            INNER JOIN wms.Articulos a ON a.ArticuloID = p.ArticuloID
            INNER JOIN sgr.Usuarios u ON u.UsuarioID = p.UsuarioID
            """;
    }

    private static void EnsureWmsPrestamos(IDbConnection connection)
    {
        SqlSchemaCompat.EnsureWmsOrThrow(connection);
        if (!SqlSchemaCompat.WmsPrestamosDisponible(connection))
            throw new InvalidOperationException(
                "La tabla wms.Prestamos no existe. Ejecute SQL/DB-005_wms_schema.sql o SQL/DB-005_wms_prestamos_notas.sql.");
    }

    private IDbConnection ConnectionFor(IDbTransaction? tx)
        => tx?.Connection ?? db;

    // ── Categorías ────────────────────────────────────────
    public async Task<IReadOnlyList<CategoriaDto>> ListarCategoriasAsync()
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return [];

        const string sql = """
            SELECT CategoriaID AS CategoriaId, Nombre
            FROM   wms.CategoriasArticulo
            WHERE  bEliminado = 0
            ORDER  BY Nombre
            """;
        var rows = await db.QueryAsync<CategoriaDto>(sql);
        return rows.AsList();
    }

    public async Task<int> InsertCategoriaAsync(string nombre, string correoUsuario, int usuarioId, IDbTransaction? tx = null)
    {
        SqlSchemaCompat.EnsureWmsOrThrow(db);
        var conn = ConnectionFor(tx);
        const string sql = """
            INSERT INTO wms.CategoriasArticulo
                (Nombre, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.CategoriaID
            VALUES (@nombre, @correoUsuario, @usuarioId, GETDATE(), 0);
            """;
        return await conn.ExecuteScalarAsync<int>(sql, new { nombre, correoUsuario, usuarioId }, tx);
    }

    public async Task<bool> UpdateCategoriaAsync(int categoriaId, string nombre, string correoUsuario, int usuarioId, IDbTransaction? tx = null)
    {
        SqlSchemaCompat.EnsureWmsOrThrow(db);
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.CategoriasArticulo SET
                Nombre = @nombre,
                Modificado = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion = GETDATE()
            WHERE CategoriaID = @categoriaId AND bEliminado = 0;
            """;
        var n = await conn.ExecuteAsync(sql, new { categoriaId, nombre, correoUsuario, usuarioId }, tx);
        return n > 0;
    }

    public async Task<bool> SoftDeleteCategoriaAsync(int categoriaId, string correoUsuario, int usuarioId, IDbTransaction? tx = null)
    {
        SqlSchemaCompat.EnsureWmsOrThrow(db);
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.CategoriasArticulo SET
                bEliminado = 1,
                Modificado = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion = GETDATE()
            WHERE CategoriaID = @categoriaId AND bEliminado = 0;
            """;
        var n = await conn.ExecuteAsync(sql, new { categoriaId, correoUsuario, usuarioId }, tx);
        return n > 0;
    }

    public async Task<bool> ExisteCategoriaActivaAsync(int categoriaId, CancellationToken ct = default)
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return false;
        const string sql = "SELECT COUNT(1) FROM wms.CategoriasArticulo WHERE CategoriaID = @categoriaId AND bEliminado = 0;";
        var n = await db.ExecuteScalarAsync(sql, new { categoriaId });
        return SqlSchemaCompat.ScalarToInt32(n) > 0;
    }

    // ── Artículos ─────────────────────────────────────────
    public async Task<IReadOnlyList<ArticuloListItemDto>> ListarArticulosAsync()
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return [];

        var sql = ArticulosListSql + " WHERE a.bEliminado = 0 ORDER BY a.Nombre";
        var rows = await db.QueryAsync<ArticuloListItemDto>(sql);
        return rows.AsList();
    }

    public async Task<ArticuloDetalleDto?> ObtenerArticuloAsync(int articuloId)
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return null;

        var sql = ArticulosDetalleSql + " WHERE a.ArticuloID = @articuloId AND a.bEliminado = 0";
        return await db.QueryFirstOrDefaultAsync<ArticuloDetalleDto>(sql, new { articuloId });
    }

    public async Task<bool> ExisteArticuloAsync(int articuloId, IDbTransaction? tx = null)
    {
        var conn = ConnectionFor(tx);
        const string sql = "SELECT COUNT(1) FROM wms.Articulos WHERE ArticuloID = @articuloId AND bEliminado = 0";
        var n = await conn.ExecuteScalarAsync(sql, new { articuloId }, tx);
        return SqlSchemaCompat.ScalarToInt32(n) > 0;
    }

    public async Task<int> InsertArticuloAsync(ArticuloCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            INSERT INTO wms.Articulos
                (Nombre, CategoriaID, Stock, StockMinimo, Ubicacion,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.ArticuloID
            VALUES
                (@Nombre, @CategoriaId, @Stock, @StockMinimo, @Ubicacion,
                 @correoUsuario, @usuarioId, GETDATE(), 0)
            """;
        return await conn.ExecuteScalarAsync<int>(sql,
            new { req.Nombre, req.CategoriaId, req.Stock, req.StockMinimo, req.Ubicacion, correoUsuario, usuarioId }, tx);
    }

    public async Task ActualizarArticuloAsync(int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.Articulos SET
                Nombre              = COALESCE(@Nombre, Nombre),
                CategoriaID         = COALESCE(@CategoriaId, CategoriaID),
                Stock               = COALESCE(@Stock, Stock),
                StockMinimo         = COALESCE(@StockMinimo, StockMinimo),
                Ubicacion           = COALESCE(@Ubicacion, Ubicacion),
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE ArticuloID = @articuloId AND bEliminado = 0
            """;
        await conn.ExecuteAsync(sql,
            new { req.Nombre, req.CategoriaId, req.Stock, req.StockMinimo, req.Ubicacion, correoUsuario, usuarioId, articuloId }, tx);
    }

    public async Task SoftDeleteArticuloAsync(int articuloId, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.Articulos SET
                bEliminado          = 1,
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE ArticuloID = @articuloId
            """;
        await conn.ExecuteAsync(sql, new { articuloId, correoUsuario, usuarioId }, tx);
    }

    // ── Stock ─────────────────────────────────────────────
    public async Task<int> ObtenerStockAsync(int articuloId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = "SELECT Stock FROM wms.Articulos WHERE ArticuloID = @articuloId AND bEliminado = 0";
        return SqlSchemaCompat.ScalarToInt32(await conn.ExecuteScalarAsync(sql, new { articuloId }, tx));
    }

    public async Task AjustarStockAsync(int articuloId, int delta, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.Articulos SET
                Stock               = Stock + @delta,
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE ArticuloID = @articuloId AND bEliminado = 0
            """;
        await conn.ExecuteAsync(sql, new { articuloId, delta, correoUsuario, usuarioId }, tx);
    }

    // ── Préstamos ─────────────────────────────────────────
    public async Task<IReadOnlyList<PrestamoListItemDto>> ListarPrestamosAsync()
    {
        if (!SqlSchemaCompat.WmsDisponible(db) || !SqlSchemaCompat.WmsPrestamosDisponible(db))
            return [];

        var sql = PrestamosListSql() + " WHERE p.bEliminado = 0 ORDER BY p.FechaPrestamo DESC";
        var rows = await db.QueryAsync<PrestamoListItemDto>(sql);
        return rows.AsList();
    }

    public async Task<PrestamoListItemDto?> ObtenerPrestamoAsync(int prestamoId)
    {
        if (!SqlSchemaCompat.WmsDisponible(db) || !SqlSchemaCompat.WmsPrestamosDisponible(db))
            return null;

        var sql = PrestamosListSql() + " WHERE p.PrestamoID = @prestamoId AND p.bEliminado = 0";
        return await db.QueryFirstOrDefaultAsync<PrestamoListItemDto>(sql, new { prestamoId });
    }

    public async Task<bool> EsPrestamoActivoAsync(int prestamoId, IDbTransaction? tx = null)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            SELECT COUNT(1) FROM wms.Prestamos
            WHERE  PrestamoID = @prestamoId AND Estado = N'PRESTADO' AND bEliminado = 0
            """;
        var n = await conn.ExecuteScalarAsync(sql, new { prestamoId }, tx);
        return SqlSchemaCompat.ScalarToInt32(n) > 0;
    }

    public async Task<int> InsertPrestamoAsync(PrestamoCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);

        // La caché de schema debe estar pre-calentada antes de iniciar la tx
        // (ver PrestarAsync en el servicio). Aquí solo se consume el valor cacheado.
        var tieneNotas = SqlSchemaCompat.WmsPrestamosTieneNotas(db);

        if (tieneNotas)
        {
            const string sql = """
                INSERT INTO wms.Prestamos
                    (ArticuloID, UsuarioID, Cantidad, FechaPrestamo, Estado, Notas,
                     Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                OUTPUT INSERTED.PrestamoID
                VALUES
                    (@ArticuloId, @PrestamoUsuarioId, @Cantidad, GETDATE(), N'PRESTADO', @Notas,
                     @correoUsuario, @adminUsuarioId, GETDATE(), 0)
                """;
            var raw = await conn.ExecuteScalarAsync(sql,
                new { req.ArticuloId, PrestamoUsuarioId = req.UsuarioId, req.Cantidad, req.Notas, correoUsuario, adminUsuarioId = usuarioId }, tx);
            return SqlSchemaCompat.ScalarToInt32(raw);
        }

        const string sqlSinNotas = """
            INSERT INTO wms.Prestamos
                (ArticuloID, UsuarioID, Cantidad, FechaPrestamo, Estado,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.PrestamoID
            VALUES
                (@ArticuloId, @PrestamoUsuarioId, @Cantidad, GETDATE(), N'PRESTADO',
                 @correoUsuario, @adminUsuarioId, GETDATE(), 0)
            """;
        var id = await conn.ExecuteScalarAsync(sqlSinNotas,
            new { req.ArticuloId, PrestamoUsuarioId = req.UsuarioId, req.Cantidad, correoUsuario, adminUsuarioId = usuarioId }, tx);
        return SqlSchemaCompat.ScalarToInt32(id);
    }

    public async Task DevolverPrestamoAsync(int prestamoId, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = """
            UPDATE wms.Prestamos SET
                Estado              = N'DEVUELTO',
                FechaDevolucion     = GETDATE(),
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE PrestamoID = @prestamoId
            """;
        await conn.ExecuteAsync(sql, new { prestamoId, correoUsuario, usuarioId }, tx);
    }

    public async Task<int> ObtenerCantidadPrestamoAsync(int prestamoId, IDbTransaction tx)
    {
        var conn = ConnectionFor(tx);
        const string sql = "SELECT Cantidad FROM wms.Prestamos WHERE PrestamoID = @prestamoId";
        return SqlSchemaCompat.ScalarToInt32(await conn.ExecuteScalarAsync(sql, new { prestamoId }, tx));
    }
}
