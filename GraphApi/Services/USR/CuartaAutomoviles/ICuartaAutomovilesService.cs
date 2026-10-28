using GraphApi.Models.USR.CuartaAutomoviles;

namespace GraphApi.Services.USR.CuartaAutomoviles;

public interface ICuartaAutomovilesService
{
    Task<IReadOnlyList<AutomovilListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<AutomovilListItemDto>> ListarPadronAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AutomovilListItemDto>> BuscarPorPlacasAsync(string placas, CancellationToken ct = default);
    Task<IReadOnlyList<MarcaDto>> ListarMarcasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ModeloDto>> ListarModelosAsync(CancellationToken ct = default);
    Task<(AutomovilListItemDto? Auto, string? Code, int Status, string? Detail)> CrearAsync(AutomovilCrearRequest req, string correo, int usuarioId, CancellationToken ct = default);
    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(int automovilId, AutomovilActualizarRequest req, string correo, int usuarioId, CancellationToken ct = default);
    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(int automovilId, string correo, int usuarioId, CancellationToken ct = default);
    Task<(AutomovilListItemDto? Auto, string? Code, int Status, string? Detail)> CrearParaUsuarioAsync(
        AutomovilCrearAdminRequest req, string correoAdmin, int adminUserId, CancellationToken ct = default);
    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarComoAdminAsync(
        int automovilId, AutomovilActualizarRequest req, string correoAdmin, CancellationToken ct = default);
    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarComoAdminAsync(
        int automovilId, string correoAdmin, CancellationToken ct = default);
}
