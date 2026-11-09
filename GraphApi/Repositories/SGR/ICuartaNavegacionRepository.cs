using System.Data;
using GraphApi.Models.SGR.Navegacion;

namespace GraphApi.Repositories.SGR;

public interface ICuartaNavegacionRepository
{
    Task<int?> ResolverPerfilIdAsync(string perfil, CancellationToken ct = default);

    Task<bool> PerfilExisteAsync(int perfilId, CancellationToken ct = default);

    Task<IReadOnlyList<PerfilAdminListItemDto>> ListarPerfilesAdminAsync(CancellationToken ct = default);

    Task<IReadOnlyList<MenuPerfilRow>> ListarMenusPorPerfilAsync(int perfilId, CancellationToken ct = default);

    Task<IReadOnlyList<MenuAdminListItemDto>> ListarMenusAdminAsync(
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<MenuAdminListItemDto?> ObtenerMenuAdminAsync(int menuId, CancellationToken ct = default);

    Task<bool> MenuExisteAsync(int menuId, IDbTransaction tx);

    Task<int> InsertMenuAsync(
        MenuCrearRequest request,
        string creadoCorreo,
        int usuarioId,
        IDbTransaction tx);

    Task<bool> ActualizarMenuAsync(
        int menuId,
        MenuActualizarRequest request,
        string modificadoCorreo,
        int usuarioId,
        IDbTransaction tx);

    Task<bool> SoftDeleteMenuAsync(int menuId, string modificadoCorreo, int usuarioId, IDbTransaction tx);

    Task<IReadOnlyList<PerfilMenuPermisoDto>> ListarPermisosMenusPerfilAsync(int perfilId, CancellationToken ct = default);

    Task<int> ContarMenusExistentesAsync(IReadOnlyCollection<int> menuIds, IDbTransaction tx);

    Task SincronizarPerfilMenusAsync(
        int perfilId,
        IReadOnlyList<PerfilMenuAsignacionItemRequest> menus,
        string correo,
        int usuarioId,
        IDbTransaction tx);

    Task<IReadOnlyList<MenuPerfilPermisoDto>> ListarPermisosPerfilesMenuAsync(int menuId, CancellationToken ct = default);

    Task<int> ContarPerfilesExistentesAsync(IReadOnlyCollection<int> perfilIds, IDbTransaction tx);

    Task SincronizarMenuPerfilesAsync(
        int menuId,
        IReadOnlyList<MenuPerfilAsignacionItemRequest> perfiles,
        string correo,
        int usuarioId,
        IDbTransaction tx);

    Task<int> InsertPerfilAsync(
        string nombre,
        string? descripcion,
        bool bAdministrador,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> UpdatePerfilAsync(
        int perfilId,
        string nombre,
        string? descripcion,
        bool bAdministrador,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> SoftDeletePerfilAsync(int perfilId, string correo, int adminId, IDbTransaction tx);

    Task<int> ContarUsuariosConPerfilAsync(int perfilId, CancellationToken ct = default);
}
