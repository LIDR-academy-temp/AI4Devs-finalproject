using System.Security.Claims;
using Web.Models.Admin;

namespace Web.Services;

public interface IPermissionService
{
    Task<bool> HasMenuAccessAsync(ClaimsPrincipal user, string ruta);
    Task<bool> HasActionAsync(ClaimsPrincipal user, string accion);
    Task<IReadOnlyList<PerfilMenuItemViewModel>> GetVisibleMenusAsync(ClaimsPrincipal user);
    void InvalidateCache(int perfilId);
}
