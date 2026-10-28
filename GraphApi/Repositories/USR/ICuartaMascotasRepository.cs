using System.Data;
using GraphApi.Models.USR.CuartaMascotas;

namespace GraphApi.Repositories.USR;

public interface ICuartaMascotasRepository
{
    Task<IReadOnlyList<MascotaListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<MascotaListItemDto>> ListarPadronAsync(CancellationToken ct = default);
    Task<bool> ExisteMascotaAsync(int mascotaId, int usuarioId);
    Task<int> InsertAsync(MascotaCrearRequest req, string correo, int usuarioId, IDbTransaction tx);
    Task<bool> ActualizarAsync(int mascotaId, MascotaActualizarRequest req, string correo, IDbTransaction tx);
    Task<bool> SoftDeleteAsync(int mascotaId, string correo, IDbTransaction tx);
    Task<IReadOnlyList<TipoMascotaDto>> ListarTiposAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RazaMascotaDto>> ListarRazasAsync(CancellationToken ct = default);
}
