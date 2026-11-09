using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Services.SGR.Usuarios;

public interface ICuartaUsuarioAdminService
{
    Task<(UsuarioCreadoDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        CrearUsuarioAdminRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<IReadOnlyList<UsuarioPadronItemDto>> ListarPadronAsync(
        string? perfil,
        bool? bActivo,
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> DesactivarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActivarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAdminExtrasAsync(
        int usuarioId,
        string? perfil,
        int? casaId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);
}
