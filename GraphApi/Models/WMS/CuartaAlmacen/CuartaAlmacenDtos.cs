namespace GraphApi.Models.WMS.CuartaAlmacen;

// ── Artículos ─────────────────────────────────────────────
public record ArticuloListItemDto(
    int ArticuloId,
    string Nombre,
    int? CategoriaId,
    string? Categoria,
    int Stock,
    int StockMinimo,
    bool BajoMinimo,
    string? Ubicacion
);

public record ArticuloDetalleDto(
    int ArticuloId,
    string Nombre,
    int? CategoriaId,
    string? Categoria,
    int Stock,
    int StockMinimo,
    bool BajoMinimo,
    string? Ubicacion,
    DateTime? FechaCreacion,
    DateTime? FechaModificacion
);

public record CategoriaDto(int CategoriaId, string Nombre);

public record CategoriaUpsertRequest(string Nombre);

public record ArticuloCrearRequest(
    string Nombre,
    int? CategoriaId,
    int Stock,
    int StockMinimo,
    string? Ubicacion
);

public record ArticuloActualizarRequest(
    string? Nombre,
    int? CategoriaId,
    int? Stock,
    int? StockMinimo,
    string? Ubicacion
);

// ── Préstamos ─────────────────────────────────────────────
public record PrestamoListItemDto(
    int PrestamoId,
    int ArticuloId,
    string NombreArticulo,
    int UsuarioId,
    string? NombreUsuario,
    string? CorreoUsuario,
    int Cantidad,
    DateTime FechaPrestamo,
    DateTime? FechaDevolucion,
    string Estado,
    string? Notas
);

public record PrestamoCrearRequest(
    int ArticuloId,
    int UsuarioId,
    int Cantidad,
    string? Notas
);
