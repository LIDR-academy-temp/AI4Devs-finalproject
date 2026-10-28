using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Automoviles")]
    [RequireMenuAccess("Admin/Automoviles")]
    public class AutomovilesAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public AutomovilesAdminController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items = await _backend.GetAutomovilesAdminAsync();
            var usuarios = await _backend.GetUsuariosAsync();
            var model = new AutomovilesAdminPageViewModel
            {
                Items = items,
                Usuarios = usuarios,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                Form = editId.HasValue ? items.FirstOrDefault(a => a.AutomovilID == editId) != null
                    ? new AutomovilAdminFormViewModel
                    {
                        AutomovilID = items.First(a => a.AutomovilID == editId).AutomovilID,
                        UsuarioID = items.First(a => a.AutomovilID == editId).UsuarioID,
                        ModeloLibre = items.First(a => a.AutomovilID == editId).ModeloLibre,
                        Placas = items.First(a => a.AutomovilID == editId).Placas
                    } : new() : new()
            };
            return View("~/Views/Admin/Automoviles.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(AutomovilAdminFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Datos inválidos.";
                return RedirectToAction(nameof(Index));
            }
            try
            {
                await _backend.SaveAutomovilAdminAsync(form);
                TempData["Message"] = form.AutomovilID is null or 0 ? "Automóvil creado." : "Automóvil actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int automovilId)
        {
            if (automovilId <= 0)
            {
                TempData["Error"] = "Automóvil inválido.";
                return RedirectToAction(nameof(Index));
            }

            try
            {
                await _backend.DeleteAutomovilAsync(automovilId);
                TempData["Message"] = "Automóvil eliminado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }
    }
}