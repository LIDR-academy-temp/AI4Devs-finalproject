using System.Data;
using GraphApi.Infrastructure;
using GraphApi.Models.WMS.CuartaAlmacen;
using GraphApi.Repositories.WMS;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.WMS.CuartaAlmacen;

public class CuartaAlmacenService(ICuartaAlmacenRepository repo, IDbConnection db) : ICuartaAlmacenService
{
    // ── Categorías ────────────────────────────────────────
    public Task<IReadOnlyList<CategoriaDto>> ListarCategoriasAsync() =>
        repo.ListarCategoriasAsync();

    public async Task<(CategoriaDto? Data, string? Code, int Status, string? Detail)> CrearCategoriaAsync(
        string nombre, string correoUsuario, int usuarioId)
    {
        var limpio = nombre.Trim();
        if (string.IsNullOrEmpty(limpio))
            return (null, "CAT_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la categoría es requerido.");

        var id = await repo.InsertCategoriaAsync(limpio, correoUsuario, usuarioId);
        return (new CategoriaDto(id, limpio), null, StatusCodes.Status201Created, null);
    }

    public async Task<(CategoriaDto? Data, string? Code, int Status, string? Detail)> ActualizarCategoriaAsync(
        int categoriaId, string nombre, string correoUsuario, int usuarioId)
    {
        var limpio = nombre.Trim();
        if (string.IsNullOrEmpty(limpio))
            return (null, "CAT_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la categoría es requerido.");

        var ok = await repo.UpdateCategoriaAsync(categoriaId, limpio, correoUsuario, usuarioId);
        if (!ok)
            return (null, "CAT_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Categoría no encontrada.");
        return (new CategoriaDto(categoriaId, limpio), null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCategoriaAsync(
        int categoriaId, string correoUsuario, int usuarioId)
    {
        var ok = await repo.SoftDeleteCategoriaAsync(categoriaId, correoUsuario, usuarioId);
        if (!ok)
            return (false, "CAT_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Categoría no encontrada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    // ── Artículos ─────────────────────────────────────────
    public Task<IReadOnlyList<ArticuloListItemDto>> ListarArticulosAsync() =>
        repo.ListarArticulosAsync();

    public Task<ArticuloDetalleDto?> ObtenerArticuloAsync(int articuloId) =>
        repo.ObtenerArticuloAsync(articuloId);

    public async Task<(int statusCode, int? articuloId, string? error)> CrearArticuloAsync(
        ArticuloCrearRequest req, string correoUsuario, int usuarioId)
    {
        if (string.IsNullOrWhiteSpace(req.Nombre))
            return (422, null, "El nombre del artículo es obligatorio.");

        if (req.Stock < 0)
            return (422, null, "El stock no puede ser negativo (INV-1).");

        if (req.StockMinimo < 0)
            return (422, null, "El stock mínimo no puede ser negativo.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var id = await repo.InsertArticuloAsync(req, correoUsuario, usuarioId, tx);
            tx.Commit();
            return (201, id, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(int statusCode, string? error)> ActualizarArticuloAsync(
        int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId)
    {
        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            if (!await repo.ExisteArticuloAsync(articuloId, tx))
            {
                tx.Rollback();
                return (404, "Artículo no encontrado.");
            }

            if (req.Stock.HasValue && req.Stock.Value < 0)
            {
                tx.Rollback();
                return (422, "El stock no puede ser negativo (INV-1).");
            }

            await repo.ActualizarArticuloAsync(articuloId, req, correoUsuario, usuarioId, tx);
            tx.Commit();
            return (204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(int statusCode, string? error)> EliminarArticuloAsync(
        int articuloId, string correoUsuario, int usuarioId)
    {
        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            if (!await repo.ExisteArticuloAsync(articuloId, tx))
            {
                tx.Rollback();
                return (404, "Artículo no encontrado.");
            }

            await repo.SoftDeleteArticuloAsync(articuloId, correoUsuario, usuarioId, tx);
            tx.Commit();
            return (204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Préstamos ─────────────────────────────────────────
    public Task<IReadOnlyList<PrestamoListItemDto>> ListarPrestamosAsync() =>
        repo.ListarPrestamosAsync();

    public Task<PrestamoListItemDto?> ObtenerPrestamoAsync(int prestamoId) =>
        repo.ObtenerPrestamoAsync(prestamoId);

    public async Task<(int statusCode, int? prestamoId, string? error)> PrestarAsync(
        PrestamoCrearRequest req, string correoUsuario, int usuarioId)
    {
        if (req.Cantidad <= 0)
            return (422, null, "La cantidad debe ser mayor a cero.");

        // Pre-calentar caché de schema antes de iniciar la transacción,
        // ya que HasColumn no puede ejecutar queries con una tx activa.
        if (db.State != ConnectionState.Open) db.Open();
        SqlSchemaCompat.WmsPrestamosTieneNotas(db);
        using var tx = db.BeginTransaction();
        try
        {
            // Verifica artículo
            if (!await repo.ExisteArticuloAsync(req.ArticuloId, tx))
            {
                tx.Rollback();
                return (404, null, "Artículo no encontrado.");
            }

            // INV-1: stock no puede quedar negativo
            var stock = await repo.ObtenerStockAsync(req.ArticuloId, tx);
            if (stock - req.Cantidad < 0)
            {
                tx.Rollback();
                return (409, null, $"Stock insuficiente. Stock actual: {stock}, solicitado: {req.Cantidad} (INV-1).");
            }

            // Baja stock + crea préstamo
            await repo.AjustarStockAsync(req.ArticuloId, -req.Cantidad, correoUsuario, usuarioId, tx);
            var id = await repo.InsertPrestamoAsync(req, correoUsuario, usuarioId, tx);
            tx.Commit();
            return (201, id, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(int statusCode, string? error)> DevolverAsync(
        int prestamoId, string correoUsuario, int usuarioId)
    {
        // Obtiene datos del préstamo antes de abrir la transacción
        var prestamo = await repo.ObtenerPrestamoAsync(prestamoId);
        if (prestamo is null || prestamo.Estado != "PRESTADO")
            return (404, "Préstamo no encontrado o ya devuelto.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            // Re-valida dentro de la transacción (evita TOCTOU)
            if (!await repo.EsPrestamoActivoAsync(prestamoId, tx))
            {
                tx.Rollback();
                return (404, "Préstamo no encontrado o ya devuelto.");
            }

            // INV-2: Restablece stock
            await repo.AjustarStockAsync(prestamo.ArticuloId, prestamo.Cantidad, correoUsuario, usuarioId, tx);
            await repo.DevolverPrestamoAsync(prestamoId, correoUsuario, usuarioId, tx);
            tx.Commit();
            return (204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }
}
