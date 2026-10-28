using System.Data;
using GraphApi.Models.USR.CuartaMascotas;

namespace GraphApi.Repositories.USR;

public interface ICuartaMascotasRepository
{
    Task<IReadOnlyList<MascotaListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default);
    Task<IReadOnlyList<MascotaListItemDto>> ListarPadronAsync(CancellationToken ct = default);
    Task<bool> ExisteMascotaAsync(int mascotaId, int usuarioId);
    Task<bool> ExisteMascotaActivaAsync(int mascotaId, CancellationToken ct = default);
    Task<bool> UsuarioActivoAsync(int usuarioId, CancellationToken ct = default);
    Task<int> InsertAsync(MascotaCrearRequest req, string correo, int usuarioId, IDbTransaction tx);
    Task<bool> ActualizarAsync(int mascotaId, MascotaActualizarRequest req, string correo, IDbTransaction tx);
    Task<bool> SoftDeleteAsync(int mascotaId, string correo, IDbTransaction tx);
    Task<IReadOnlyList<TipoMascotaDto>> ListarTiposAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RazaMascotaDto>> ListarRazasAsync(CancellationToken ct = default);
    Task<int> InsertTipoAsync(string tipoMascota, string correo, int adminId, IDbTransaction? tx = null);
    Task<bool> UpdateTipoAsync(int tipoMascotaId, string tipoMascota, string correo, int adminId, IDbTransaction? tx = null);
    Task<bool> SoftDeleteTipoAsync(int tipoMascotaId, string correo, int adminId, IDbTransaction? tx = null);
    Task<int> InsertRazaAsync(int tipoMascotaId, string razaMascota, string correo, int adminId, IDbTransaction? tx = null);
    Task<bool> UpdateRazaAsync(int razaMascotaId, int tipoMascotaId, string razaMascota, string correo, int adminId, IDbTransaction? tx = null);
    Task<bool> SoftDeleteRazaAsync(int razaMascotaId, string correo, int adminId, IDbTransaction? tx = null);
    Task<bool> ExisteTipoActivoAsync(int tipoMascotaId, CancellationToken ct = default);
}
