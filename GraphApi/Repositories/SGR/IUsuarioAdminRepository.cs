using System.Data;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Repositories.SGR;

public interface IUsuarioAdminRepository
{
    Task<bool> ExisteCorreoAsync(string correo, CancellationToken ct = default);

    Task<int?> ResolverPerfilIdAsync(string perfil, CancellationToken ct = default);

    Task<int> InsertUsuarioAsync(
        string nombre,
        string correo,
        string? telefono,
        int perfilId,
        string passwordHash,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx);

    Task<bool> CasaExisteAsync(int casaId, IDbTransaction tx);

    Task<bool> TienePropietarioVigenteAsync(int casaId, IDbTransaction tx);

    Task<bool> TieneCasaOcupanteVigenteAsync(int casaId, int usuarioId, IDbTransaction tx);

    Task InsertCasaOcupanteAsync(
        int casaId,
        int usuarioId,
        string tipoResidencia,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx);

    Task ActualizarPropietarioCasaAsync(int casaId, int usuarioId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);

    Task<bool> CasaOcupantesDisponibleAsync(IDbTransaction tx);

    Task<IReadOnlyList<UsuarioPadronItemDto>> ListarPadronAsync(
        string? perfil,
        bool? bActivo,
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<bool> SetActivoAsync(int usuarioId, bool activo, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);

    Task<bool> SoftDeleteAsync(int usuarioId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);

    Task<bool> ActualizarPerfilIdAsync(int usuarioId, int perfilId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);
}
