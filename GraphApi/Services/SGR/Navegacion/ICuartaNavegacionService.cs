using GraphApi.Models.SGR.Navegacion;

namespace GraphApi.Services.SGR.Navegacion;

public interface ICuartaNavegacionService
{
    Task<(IReadOnlyList<MenuNodoDto>? Data, string? Code, int Status, string? Detail)> ObtenerMenusUsuarioAsync(
        string? perfilClaim,
        CancellationToken ct = default);

    Task<IReadOnlyList<MenuAdminListItemDto>> ListarMenusAdminAsync(
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<MenuAdminListItemDto?> ObtenerMenuAdminAsync(int menuId, CancellationToken ct = default);

    Task<(MenuAdminListItemDto? Data, string? Code, int Status, string? Detail)> CrearMenuAsync(
        MenuCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(MenuAdminListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarMenuAsync(
        int menuId,
        MenuActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarMenuAsync(
        int menuId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<IReadOnlyList<PerfilAdminListItemDto>> ListarPerfilesAdminAsync(CancellationToken ct = default);

    Task<IReadOnlyList<PerfilMenuPermisoDto>?> ListarPermisosMenusAsync(int perfilId, CancellationToken ct = default);

    Task<(IReadOnlyList<PerfilMenuPermisoDto>? Data, string? Code, int Status, string? Detail)> ActualizarPermisosMenusAsync(
        int perfilId,
        PerfilMenuAsignacionRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);
}
