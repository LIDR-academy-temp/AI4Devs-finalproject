using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Usuarios")]
    [RequireMenuAccess("Admin/Usuarios")]
    public class UsuariosAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IPermissionService _permissions;

        public UsuariosAdminController(IGraphApiBackendService backend, IPermissionService permissions)
        {
            _backend = backend;
            _permissions = permissions;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items    = await _backend.GetSgrUsuariosAsync();
            var perfiles = await _backend.GetSgrPerfilesAsync();
            var model = new SgrUsuariosPageViewModel
            {
                Items    = items,
                Perfiles = perfiles,
                Form     = editId.HasValue ? items.FirstOrDefault(u => u.UsuarioID == editId) ?? new() : new(),
                Message  = TempData["Message"] as string,
                Error    = TempData["Error"] as string,
            };
            return View("~/Views/Admin/Usuarios.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(SgrUsuarioFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Datos inválidos.";
                return RedirectToAction(nameof(Index));
            }
            try
            {
                if (!string.IsNullOrWhiteSpace(form.Correo))
                {
                    var emailDuplicate = await _backend.CheckEmailExistsAsync(form.Correo.Trim(), form.UsuarioID);
                    if (emailDuplicate)
                    {
                        TempData["Error"] = "El correo electrónico ya está en uso por otro usuario.";
                        return RedirectToAction(nameof(Index), new { editId = form.UsuarioID });
                    }
                    form.Correo = form.Correo.Trim();
                }

                await _backend.SaveSgrUsuarioAsync(form);
                // Invalidar cache del perfil anterior y nuevo
                if (form.PerfilID.HasValue)
                    _permissions.InvalidateCache(form.PerfilID.Value);
                TempData["Message"] = "Usuario actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index));
        }
    }
}
