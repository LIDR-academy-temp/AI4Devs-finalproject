using System.Data;
using GraphApi.Models.USR.CuartaAutomoviles;

namespace GraphApi.Repositories.USR;

public interface ICuartaAutomovilesRepository
{
    Task<IReadOnlyList<AutomovilListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<AutomovilListItemDto>> ListarPadronAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AutomovilListItemDto>> BuscarPorPlacasAsync(string placas, CancellationToken ct = default);
    Task<bool> ExisteActivoAsync(int automovilId, CancellationToken ct = default);
    Task<bool> UsuarioActivoAsync(int usuarioId, CancellationToken ct = default);
    Task<bool> ExistePlacaAsync(string placas, int? excludeId, IDbTransaction tx);
    Task<int> InsertAsync(AutomovilCrearRequest req, string correo, int usuarioId, IDbTransaction tx);
    Task<bool> ActualizarAsync(int automovilId, AutomovilActualizarRequest req, string correo, IDbTransaction tx);
    Task<bool> SoftDeleteAsync(int automovilId, string correo, IDbTransaction tx);
    Task<bool> EsDuenioAsync(int automovilId, int usuarioId);
    Task<IReadOnlyList<MarcaDto>> ListarMarcasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ModeloDto>> ListarModelosAsync(CancellationToken ct = default);
}
