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

    Task<(MascotaListItemDto? Mascota, string? Code, int Status, string? Detail)> CrearParaUsuarioAsync(
        MascotaCrearAdminRequest req, string correoAdmin, int adminUserId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarComoAdminAsync(
        int mascotaId, MascotaActualizarRequest req, string correoAdmin, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarComoAdminAsync(
        int mascotaId, string correoAdmin, CancellationToken ct = default);

    Task<(TipoMascotaDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoMascota, int adminId, string correo, CancellationToken ct = default);

    Task<(TipoMascotaDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoMascotaId, string tipoMascota, int adminId, string correo, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoMascotaId, int adminId, string correo, CancellationToken ct = default);

    Task<(RazaMascotaDto? Data, string? Code, int Status, string? Detail)> CrearRazaAsync(
        int tipoMascotaId, string razaMascota, int adminId, string correo, CancellationToken ct = default);

    Task<(RazaMascotaDto? Data, string? Code, int Status, string? Detail)> ActualizarRazaAsync(
        int razaMascotaId, int tipoMascotaId, string razaMascota, int adminId, string correo, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarRazaAsync(
        int razaMascotaId, int adminId, string correo, CancellationToken ct = default);
}
