using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Mascotas")]
    [RequireMenuAccess("Admin/Mascotas")]
    public class MascotasAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public MascotasAdminController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items = await _backend.GetMascotasAdminAsync();
            var usuarios = await _backend.GetUsuariosAsync();
            var model = new MascotasAdminPageViewModel
            {
                Items = items,
                Usuarios = usuarios,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                Form = editId.HasValue ? items.FirstOrDefault(m => m.MascotaID == editId) != null
                    ? new MascotaAdminFormViewModel
                    {
                        MascotaID = items.First(m => m.MascotaID == editId).MascotaID,
                        UsuarioID = items.First(m => m.MascotaID == editId).UsuarioID,
                        NombreMascota = items.First(m => m.MascotaID == editId).NombreMascota,
                        RazaLibre = items.First(m => m.MascotaID == editId).RazaLibre
                    } : new() : new()
            };
            return View("~/Views/Admin/Mascotas.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(MascotaAdminFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Datos inválidos.";
                return RedirectToAction(nameof(Index));
            }
            try
            {
                await _backend.SaveMascotaAdminAsync(form);
                TempData["Message"] = form.MascotaID is null or 0 ? "Mascota creada." : "Mascota actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int mascotaId)
        {
            if (mascotaId <= 0)
            {
                TempData["Error"] = "Mascota inválida.";
                return RedirectToAction(nameof(Index));
            }

            try
            {
                await _backend.DeleteMascotaAsync(mascotaId);
                TempData["Message"] = "Mascota eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }
    }
}