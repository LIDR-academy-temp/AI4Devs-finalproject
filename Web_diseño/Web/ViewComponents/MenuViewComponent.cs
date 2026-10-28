using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.ViewComponents;

public sealed class MenuViewComponent : ViewComponent
{
    private readonly IPermissionService _permissions;
    private readonly IResidentPortalService _residentPortal;

    public MenuViewComponent(IPermissionService permissions, IResidentPortalService residentPortal)
    {
        _permissions = permissions;
        _residentPortal = residentPortal;
    }

    public async Task<IViewComponentResult> InvokeAsync()
    {
        var menus = await _permissions.GetVisibleMenusAsync(HttpContext.User);
        var model = await _residentPortal.BuildMenuAsync(HttpContext.User, menus);
        return View(model);
    }
}
