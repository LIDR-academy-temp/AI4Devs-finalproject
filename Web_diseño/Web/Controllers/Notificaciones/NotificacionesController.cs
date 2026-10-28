using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Notificaciones
{
    [Authorize]
    [Route("Gestion/Notificaciones")]
    [RequireMenuAccess("Gestion/Notificaciones")]
    public class NotificacionesController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public NotificacionesController(IGraphApiBackendService service)
        {
            _service = service;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloNoLeidas = false)
        {
            var model = await BuildPageAsync(editId, soloNoLeidas: soloNoLeidas);
            return View("~/Views/Notificaciones/Notificaciones.cshtml", model);
        }

        [HttpPost("Save")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(NotificacionFormViewModel form, bool soloNoLeidas = false)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(form.Titulo))
            {
                TempData["Error"] = "El título es obligatorio.";
                return RedirectToAction(nameof(Index), new { editId = form.NotificacionID, soloNoLeidas });
            }

            if (form.FechaCreacionNotificacion == null || form.FechaCreacionNotificacion == default)
                form.FechaCreacionNotificacion = DateTime.UtcNow;

            await _service.SaveNotificacionAsync(form);
            TempData["Message"] = form.NotificacionID is null or 0 ? "Notificación creada." : "Notificación actualizada.";
            return RedirectToAction(nameof(Index), new { soloNoLeidas });
        }

        [HttpPost("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int notificacionId, bool soloNoLeidas = false)
        {
            await _service.DeleteNotificacionAsync(notificacionId);
            TempData["Message"] = "Notificación eliminada.";
            return RedirectToAction(nameof(Index), new { soloNoLeidas });
        }

        private async Task<NotificacionesPageViewModel> BuildPageAsync(int? editId = null, bool soloNoLeidas = false)
        {
            var all = (await _service.GetNotificacionesAsync())
                .Where(n => n.bEliminado == false)
                .ToList();

            int totalNoLeidas = all.Count(n => !n.Leido);

            var sorted = all
                .OrderBy(n => n.Leido ? 1 : 0)
                .ThenByDescending(n => n.FechaCreacionNotificacion)
                .ToList();

            if (soloNoLeidas)
                sorted = sorted.Where(n => !n.Leido).ToList();

            NotificacionFormViewModel form;
            if (editId.HasValue)
            {
                form = sorted.FirstOrDefault(n => n.NotificacionID == editId)
                       ?? all.FirstOrDefault(n => n.NotificacionID == editId)
                       ?? new NotificacionFormViewModel();
            }
            else
            {
                form = new NotificacionFormViewModel();
            }

            return new NotificacionesPageViewModel
            {
                Items = sorted,
                Form = form,
                SoloNoLeidas = soloNoLeidas,
                TotalNoLeidas = totalNoLeidas,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string
            };
        }
    }
}
