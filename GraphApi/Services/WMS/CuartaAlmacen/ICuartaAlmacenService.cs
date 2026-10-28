using GraphApi.Models.WMS.CuartaAlmacen;

namespace GraphApi.Services.WMS.CuartaAlmacen;

public interface ICuartaAlmacenService
{
    // ── Categorías ────────────────────────────────────────
    Task<IReadOnlyList<CategoriaDto>> ListarCategoriasAsync();
    Task<(CategoriaDto? Data, string? Code, int Status, string? Detail)> CrearCategoriaAsync(string nombre, string correoUsuario, int usuarioId);
    Task<(CategoriaDto? Data, string? Code, int Status, string? Detail)> ActualizarCategoriaAsync(int categoriaId, string nombre, string correoUsuario, int usuarioId);
    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCategoriaAsync(int categoriaId, string correoUsuario, int usuarioId);

    // ── Artículos ─────────────────────────────────────────
    Task<IReadOnlyList<ArticuloListItemDto>> ListarArticulosAsync();
    Task<ArticuloDetalleDto?> ObtenerArticuloAsync(int articuloId);
    Task<(int statusCode, int? articuloId, string? error)> CrearArticuloAsync(ArticuloCrearRequest req, string correoUsuario, int usuarioId);
    Task<(int statusCode, string? error)> ActualizarArticuloAsync(int articuloId, ArticuloActualizarRequest req, string correoUsuario, int usuarioId);
    Task<(int statusCode, string? error)> EliminarArticuloAsync(int articuloId, string correoUsuario, int usuarioId);

    // ── Préstamos ─────────────────────────────────────────
    Task<IReadOnlyList<PrestamoListItemDto>> ListarPrestamosAsync();
    Task<PrestamoListItemDto?> ObtenerPrestamoAsync(int prestamoId);
    Task<(int statusCode, int? prestamoId, string? error)> PrestarAsync(PrestamoCrearRequest req, string correoUsuario, int usuarioId);
    Task<(int statusCode, string? error)> DevolverAsync(int prestamoId, string correoUsuario, int usuarioId);
}
