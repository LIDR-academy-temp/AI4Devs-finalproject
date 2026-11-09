using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Services.SGR.Usuarios;

public interface IUsuarioPerfilService
{
    Task<(PerfilDto? Data, string? Code, int Status, string? Detail)> ObtenerAsync(
        int id,
        int callerId,
        bool callerEsAdmin,
        CancellationToken ct = default);

    Task<(PerfilDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int id,
        ActualizarPerfilRequest request,
        int callerId,
        bool callerEsAdmin,
        string callerCorreo,
        CancellationToken ct = default);
}
