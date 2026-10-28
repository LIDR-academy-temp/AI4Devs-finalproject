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

    private const string PrestamosListSql = """
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
               p.Notas
        FROM wms.Prestamos p
        INNER JOIN wms.Articulos a ON a.ArticuloID = p.ArticuloID
        INNER JOIN sgr.Usuarios u ON u.UsuarioID = p.UsuarioID
        """;

    private static void EnsureWms(IDbConnection connection)
    {
        if (!SqlSchemaCompat.WmsDisponible(connection))
            throw new InvalidOperationException(
                "El esquema WMS no está desplegado. Ejecute SQL/DB-005_wms_schema.sql en la base CuartaQuinientos.");
    }

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
        EnsureWms(db);
        const string sql = "SELECT COUNT(1) FROM wms.Articulos WHERE ArticuloID = @articuloId AND bEliminado = 0";
        var n = await db.ExecuteScalarAsync<int>(sql, new { articuloId }, tx);
        return n > 0;
    }

    public async Task<int> InsertArticuloAsync(ArticuloCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = """
            INSERT INTO wms.Articulos
                (Nombre, CategoriaID, Stock, StockMinimo, Ubicacion,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.ArticuloID
            VALUES
                (@Nombre, @CategoriaId, @Stock, @StockMinimo, @Ubicacion,
                 @correoUsuario, @usuarioId, GETDATE(), 0)
            """;
        return await db.ExecuteScalarAsync<int>(sql,
            new { req.Nombre, req.CategoriaId, req.Stock, req.StockMinimo, req.Ubicacion, correoUsuario, usuarioId }, tx);
    }

    public async Task ActualizarArticuloAsync(int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
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
        await db.ExecuteAsync(sql,
            new { req.Nombre, req.CategoriaId, req.Stock, req.StockMinimo, req.Ubicacion, correoUsuario, usuarioId, articuloId }, tx);
    }

    public async Task SoftDeleteArticuloAsync(int articuloId, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = """
            UPDATE wms.Articulos SET
                bEliminado          = 1,
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE ArticuloID = @articuloId
            """;
        await db.ExecuteAsync(sql, new { articuloId, correoUsuario, usuarioId }, tx);
    }

    // ── Stock ─────────────────────────────────────────────
    public async Task<int> ObtenerStockAsync(int articuloId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = "SELECT Stock FROM wms.Articulos WHERE ArticuloID = @articuloId AND bEliminado = 0";
        return await db.ExecuteScalarAsync<int>(sql, new { articuloId }, tx);
    }

    public async Task AjustarStockAsync(int articuloId, int delta, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = """
            UPDATE wms.Articulos SET
                Stock               = Stock + @delta,
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE ArticuloID = @articuloId AND bEliminado = 0
            """;
        await db.ExecuteAsync(sql, new { articuloId, delta, correoUsuario, usuarioId }, tx);
    }

    // ── Préstamos ─────────────────────────────────────────
    public async Task<IReadOnlyList<PrestamoListItemDto>> ListarPrestamosAsync()
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return [];

        var sql = PrestamosListSql + " WHERE p.bEliminado = 0 ORDER BY p.FechaPrestamo DESC";
        var rows = await db.QueryAsync<PrestamoListItemDto>(sql);
        return rows.AsList();
    }

    public async Task<PrestamoListItemDto?> ObtenerPrestamoAsync(int prestamoId)
    {
        if (!SqlSchemaCompat.WmsDisponible(db))
            return null;

        var sql = PrestamosListSql + " WHERE p.PrestamoID = @prestamoId AND p.bEliminado = 0";
        return await db.QueryFirstOrDefaultAsync<PrestamoListItemDto>(sql, new { prestamoId });
    }

    public async Task<bool> EsPrestamoActivoAsync(int prestamoId, IDbTransaction? tx = null)
    {
        EnsureWms(db);
        const string sql = """
            SELECT COUNT(1) FROM wms.Prestamos
            WHERE  PrestamoID = @prestamoId AND Estado = N'PRESTADO' AND bEliminado = 0
            """;
        var n = await db.ExecuteScalarAsync<int>(sql, new { prestamoId }, tx);
        return n > 0;
    }

    public async Task<int> InsertPrestamoAsync(PrestamoCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = """
            INSERT INTO wms.Prestamos
                (ArticuloID, UsuarioID, Cantidad, FechaPrestamo, Estado, Notas,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.PrestamoID
            VALUES
                (@ArticuloId, @UsuarioId, @Cantidad, GETDATE(), N'PRESTADO', @Notas,
                 @correoUsuario, @usuarioId, GETDATE(), 0)
            """;
        return await db.ExecuteScalarAsync<int>(sql,
            new { req.ArticuloId, req.UsuarioId, req.Cantidad, req.Notas, correoUsuario, usuarioId }, tx);
    }

    public async Task DevolverPrestamoAsync(int prestamoId, string correoUsuario, int usuarioId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = """
            UPDATE wms.Prestamos SET
                Estado              = N'DEVUELTO',
                FechaDevolucion     = GETDATE(),
                Modificado          = @correoUsuario,
                UsuarioModificacionID = @usuarioId,
                FechaModificacion   = GETDATE()
            WHERE PrestamoID = @prestamoId
            """;
        await db.ExecuteAsync(sql, new { prestamoId, correoUsuario, usuarioId }, tx);
    }

    public async Task<int> ObtenerCantidadPrestamoAsync(int prestamoId, IDbTransaction tx)
    {
        EnsureWms(db);
        const string sql = "SELECT Cantidad FROM wms.Prestamos WHERE PrestamoID = @prestamoId";
        return await db.ExecuteScalarAsync<int>(sql, new { prestamoId }, tx);
    }
}
