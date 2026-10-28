using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/PerfilPermisos")]
    [RequireMenuAccess("Admin/Permisos")]
    public class PerfilPermisosController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IPermissionService _permissions;

        public PerfilPermisosController(IGraphApiBackendService backend, IPermissionService permissions)
        {
            _backend = backend;
            _permissions = permissions;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int perfilId = 0)
        {
            var perfiles = await _backend.GetSgrPerfilesAsync();
            PerfilPermisosPageViewModel model;

            if (perfilId > 0)
            {
                var perfil   = perfiles.FirstOrDefault(p => p.PerfilID == perfilId);
                var menus    = await _backend.GetPerfilPermisosMenusAsync(perfilId);
                var botones  = await _backend.GetPerfilPermisosBotonAsync(perfilId);
                var todosMenus = await _backend.GetSgrMenusAsync();

                // Menús que ya tiene el perfil asignados
                var asignadosIds = new HashSet<int>(menus.Select(m => m.MenuID));
                var disponibles  = todosMenus
                    .Where(m => !asignadosIds.Contains(m.MenuID))
                    .OrderBy(m => m.PadreMenuID ?? m.MenuID)
                    .ThenBy(m => m.Orden)
                    .ToList();

                model = new PerfilPermisosPageViewModel
                {
                    PerfilID          = perfilId,
                    NombrePerfil      = perfil?.Perfil ?? string.Empty,
                    Menus             = menus,
                    Botones           = botones,
                    Perfiles          = perfiles,
                    MenusDisponibles  = disponibles,
                    Message           = TempData["Message"] as string,
                    Error             = TempData["Error"] as string,
                };
            }
            else
            {
                model = new PerfilPermisosPageViewModel
                {
                    Perfiles = perfiles,
                    Message  = TempData["Message"] as string,
                    Error    = TempData["Error"] as string,
                };
            }

            return View("~/Views/Admin/PerfilPermisos.cshtml", model);
        }

        [HttpPost("SetMenu")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetMenu(int perfilId, int menuId, bool bVisible)
        {
            try
            {
                await _backend.SetPerfilMenuVisibleAsync(perfilId, menuId, bVisible);
                _permissions.InvalidateCache(perfilId);
                TempData["Message"] = "Permiso de menú actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index), new { perfilId });
        }

        [HttpPost("AddMenu")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddMenu(int perfilId, int menuId)
        {
            try
            {
                await _backend.SetPerfilMenuVisibleAsync(perfilId, menuId, true);
                _permissions.InvalidateCache(perfilId);
                TempData["Message"] = "Módulo agregado al perfil.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index), new { perfilId });
        }

        [HttpPost("SetBoton")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetBoton(int perfilId, int menuBotonId, bool bActivo)
        {
            try
            {
                await _backend.SetPerfilMenuBotonActivoAsync(perfilId, menuBotonId, bActivo);
                _permissions.InvalidateCache(perfilId);
                TempData["Message"] = "Permiso de botón actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index), new { perfilId });
        }
    }
}
