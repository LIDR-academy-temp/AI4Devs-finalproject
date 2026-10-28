using GraphApi.Models.USR.CuartaMascotas;

namespace GraphApi.Services.USR.CuartaMascotas;

public interface ICuartaMascotasService
{
    Task<IReadOnlyList<MascotaListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<MascotaListItemDto>> ListarPadronAsync(CancellationToken ct = default);
    Task<(int StatusCode, int? MascotaId, string? Error)> CrearAsync(MascotaCrearRequest req, string correo, int usuarioId, CancellationToken ct = default);
    Task<(int StatusCode, string? Error)> ActualizarAsync(int mascotaId, MascotaActualizarRequest req, string correo, int usuarioId, CancellationToken ct = default);
    Task<(int StatusCode, string? Error)> EliminarAsync(int mascotaId, string correo, int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<TipoMascotaDto>> ListarTiposAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RazaMascotaDto>> ListarRazasAsync(CancellationToken ct = default);
}
