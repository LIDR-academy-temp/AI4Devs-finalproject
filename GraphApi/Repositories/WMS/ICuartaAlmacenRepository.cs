using System.Data;
using GraphApi.Models.WMS.CuartaAlmacen;

namespace GraphApi.Repositories.WMS;

public interface ICuartaAlmacenRepository
{
    // ── Categorías ────────────────────────────────────────
    Task<IReadOnlyList<CategoriaDto>> ListarCategoriasAsync();
    Task<int> InsertCategoriaAsync(string nombre, string correoUsuario, int usuarioId, IDbTransaction? tx = null);
    Task<bool> UpdateCategoriaAsync(int categoriaId, string nombre, string correoUsuario, int usuarioId, IDbTransaction? tx = null);
    Task<bool> SoftDeleteCategoriaAsync(int categoriaId, string correoUsuario, int usuarioId, IDbTransaction? tx = null);
    Task<bool> ExisteCategoriaActivaAsync(int categoriaId, CancellationToken ct = default);

    // ── Artículos ─────────────────────────────────────────
    Task<IReadOnlyList<ArticuloListItemDto>> ListarArticulosAsync();
    Task<ArticuloDetalleDto?> ObtenerArticuloAsync(int articuloId);
    Task<bool> ExisteArticuloAsync(int articuloId, IDbTransaction? tx = null);
    Task<int> InsertArticuloAsync(ArticuloCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx);
    Task ActualizarArticuloAsync(int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId, IDbTransaction tx);
    Task SoftDeleteArticuloAsync(int articuloId, string correoUsuario, int usuarioId, IDbTransaction tx);

    // ── Stock (transaccional) ─────────────────────────────
    Task<int> ObtenerStockAsync(int articuloId, IDbTransaction tx);
    Task AjustarStockAsync(int articuloId, int delta, string correoUsuario, int usuarioId, IDbTransaction tx);

    // ── Préstamos ─────────────────────────────────────────
    Task<IReadOnlyList<PrestamoListItemDto>> ListarPrestamosAsync();
    Task<PrestamoListItemDto?> ObtenerPrestamoAsync(int prestamoId);
    Task<bool> EsPrestamoActivoAsync(int prestamoId, IDbTransaction? tx = null);
    Task<int> InsertPrestamoAsync(PrestamoCrearRequest req, string correoUsuario, int usuarioId, IDbTransaction tx);
    Task DevolverPrestamoAsync(int prestamoId, string correoUsuario, int usuarioId, IDbTransaction tx);
    Task<int> ObtenerCantidadPrestamoAsync(int prestamoId, IDbTransaction tx);
}
