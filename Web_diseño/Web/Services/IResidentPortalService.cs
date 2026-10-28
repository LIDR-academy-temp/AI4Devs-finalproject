using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;

namespace Web.Services
{
    public interface IResidentPortalService
    {
        Task<bool> HasResidentPropertiesAsync(int usuarioId);
        Task<IReadOnlyList<ResidentPropertyOptionViewModel>> GetResidentPropertiesAsync(int usuarioId);
        Task<ResidentPortalContextViewModel> GetContextAsync(ClaimsPrincipal user);
        Task<ResidentHomePageViewModel> GetHomeAsync(ClaimsPrincipal user);
        Task<ResidentMenuViewModel> BuildMenuAsync(ClaimsPrincipal user, IReadOnlyList<PerfilMenuItemViewModel> permissionMenus);
    }
}