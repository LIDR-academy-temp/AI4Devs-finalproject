using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Perfiles")]
    [RequireMenuAccess("Admin/Perfiles")]
    public class PerfilesAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IPermissionService _permissions;

        public PerfilesAdminController(IGraphApiBackendService backend, IPermissionService permissions)
        {
            _backend = backend;
            _permissions = permissions;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items = await _backend.GetSgrPerfilesAsync();
            var model = new SgrPerfilesPageViewModel
            {
                Items   = items,
                Form    = editId.HasValue ? items.FirstOrDefault(p => p.PerfilID == editId) ?? new() : new(),
                Message = TempData["Message"] as string,
                Error   = TempData["Error"] as string,
            };
            return View("~/Views/Admin/Perfiles.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(SgrPerfilFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Datos inválidos.";
                return RedirectToAction(nameof(Index));
            }
            try
            {
                await _backend.SaveSgrPerfilAsync(form);
                TempData["Message"] = form.PerfilID is null or 0 ? "Perfil creado." : "Perfil actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        [RequireAction("perfiles.eliminar")]
        public async Task<IActionResult> Delete(int perfilId)
        {
            try
            {
                await _backend.DeleteSgrPerfilAsync(perfilId);
                _permissions.InvalidateCache(perfilId);
                TempData["Message"] = "Perfil eliminado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index));
        }
    }
}
