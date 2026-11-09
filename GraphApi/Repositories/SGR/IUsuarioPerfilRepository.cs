using System.Data;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public interface IUsuarioPerfilRepository
{
    Task<PerfilDto?> ObtenerAsync(int usuarioId, CancellationToken ct = default);

    Task<bool> ExisteCorreoOtroUsuarioAsync(int usuarioId, string correo, CancellationToken ct = default);

    Task<bool> ActualizarAsync(
        int usuarioId,
        string correo,
        string? telefono,
        string? nombre,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx);
}
