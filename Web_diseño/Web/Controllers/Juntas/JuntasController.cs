using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Juntas
{
    [Authorize]
    [Route("Gestion/Juntas")]
    [RequireMenuAccess("Gestion/Juntas")]
    public class JuntasController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public JuntasController(IGraphApiBackendService service)
        {
            _service = service;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false)
        {
            var model = await BuildPageAsync(editId, soloActivas: soloActivas);
            return View("~/Views/Juntas/Juntas.cshtml", model);
        }

        [HttpPost("Save")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(JuntaFormViewModel form, bool soloActivas = false)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(form.Titulo))
            {
                TempData["Error"] = "El título es obligatorio.";
                return RedirectToAction(nameof(Index), new { editId = form.JuntaID, soloActivas });
            }

            await _service.SaveJuntaAsync(form);
            TempData["Message"] = form.JuntaID is null or 0 ? "Junta creada." : "Junta actualizada.";
            return RedirectToAction(nameof(Index), new { soloActivas });
        }

        [HttpPost("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int juntaId, bool soloActivas = false)
        {
            await _service.DeleteJuntaAsync(juntaId);
            TempData["Message"] = "Junta eliminada.";
            return RedirectToAction(nameof(Index), new { soloActivas });
        }

        private async Task<JuntasPageViewModel> BuildPageAsync(int? editId = null, bool soloActivas = false)
        {
            var items = (await _service.GetJuntasAsync())
                .Where(j => j.bEliminado == false)
                .ToList();

            int totalActivas = items.Count(j => j.bActivo);

            var sorted = items
                .OrderBy(j => j.bActivo ? 0 : 1)
                .ThenBy(j => j.FechaProgramada)
                .ToList();

            if (soloActivas)
                sorted = sorted.Where(j => j.bActivo).ToList();

            JuntaFormViewModel form;
            if (editId.HasValue)
            {
                form = sorted.FirstOrDefault(j => j.JuntaID == editId)
                       ?? items.FirstOrDefault(j => j.JuntaID == editId)
                       ?? new JuntaFormViewModel();
            }
            else
            {
                form = new JuntaFormViewModel();
            }

            return new JuntasPageViewModel
            {
                Items = sorted,
                Form = form,
                SoloActivas = soloActivas,
                TotalActivas = totalActivas,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string
            };
        }
    }
}
