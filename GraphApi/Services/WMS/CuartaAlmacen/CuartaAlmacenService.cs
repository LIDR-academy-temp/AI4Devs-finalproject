using System.Data;
using GraphApi.Models.WMS.CuartaAlmacen;
using GraphApi.Repositories.WMS;

namespace GraphApi.Services.WMS.CuartaAlmacen;

public class CuartaAlmacenService(ICuartaAlmacenRepository repo, IDbConnection db) : ICuartaAlmacenService
{
    // ── Categorías ────────────────────────────────────────
    public Task<IReadOnlyList<CategoriaDto>> ListarCategoriasAsync() =>
        repo.ListarCategoriasAsync();

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

        db.Open();
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
        db.Open();
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
        db.Open();
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

        db.Open();
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

        db.Open();
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
