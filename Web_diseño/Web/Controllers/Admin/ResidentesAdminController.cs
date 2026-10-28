using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Residentes")]
    [RequireMenuAccess("Admin/Residentes")]
    public class ResidentesAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public ResidentesAdminController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items = await _backend.GetResidentesAsync();
            var model = new ResidentesAdminPageViewModel
            {
                Items = items,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                Form = editId.HasValue ? items.FirstOrDefault(r => r.UsuarioID == editId) != null
                    ? new ResidenteAdminFormViewModel
                    {
                        UsuarioID = items.First(r => r.UsuarioID == editId).UsuarioID,
                        Nombre = items.First(r => r.UsuarioID == editId).Nombre,
                        Correo = items.First(r => r.UsuarioID == editId).Correo,
                        bActivo = items.First(r => r.UsuarioID == editId).bActivo
                    } : new() : new()
            };
            return View("~/Views/Admin/Residentes.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(ResidenteAdminFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return RedirectToAction(nameof(Index));
            }
            try
            {
                await _backend.SaveResidenteAsync(form);
                TempData["Message"] = form.UsuarioID is null or 0 ? "Residente creado." : "Residente actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Error al guardar: {ex.Message}";
            }
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int usuarioId)
        {
            if (usuarioId <= 0)
            {
                TempData["Error"] = "Residente inválido.";
                return RedirectToAction(nameof(Index));
            }

            try
            {
                await _backend.DeleteResidenteAsync(usuarioId);
                TempData["Message"] = "Residente eliminado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }
    }
}