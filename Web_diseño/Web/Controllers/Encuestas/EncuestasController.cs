using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Encuestas
{
    [Authorize]
    [Route("Gestion/Encuestas")]
    [RequireMenuAccess("Gestion/Encuestas")]
    public class EncuestasController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public EncuestasController(IGraphApiBackendService service)
        {
            _service = service;
        }

        // ─── Listado principal ───────────────────────────────────────────────
        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false)
        {
            var model = await BuildPageAsync(editId, soloActivas);
            return View("~/Views/Encuestas/Encuestas.cshtml", model);
        }

        [HttpPost("Save")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(EncuestaFormViewModel form, bool soloActivas = false)
        {
            if (string.IsNullOrWhiteSpace(form.Titulo))
            {
                TempData["Error"] = "El título es obligatorio.";
                return RedirectToAction(nameof(Index), new { editId = form.EncuestaID, soloActivas });
            }

            await _service.SaveEncuestaAsync(form);
            TempData["Message"] = form.EncuestaID is null or 0 ? "Encuesta creada." : "Encuesta actualizada.";
            return RedirectToAction(nameof(Index), new { soloActivas });
        }

        [HttpPost("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int encuestaId, bool soloActivas = false)
        {
            await _service.DeleteEncuestaAsync(encuestaId);
            TempData["Message"] = "Encuesta eliminada.";
            return RedirectToAction(nameof(Index), new { soloActivas });
        }

        // ─── Detalle (preguntas + opciones) ──────────────────────────────────
        [HttpGet("Detalle/{encuestaId:int}")]
        public async Task<IActionResult> Detalle(int encuestaId, int? editPreguntaId = null, int? editOpcionId = null)
        {
            var model = await BuildDetalleAsync(encuestaId, editPreguntaId, editOpcionId);
            if (model is null) return RedirectToAction(nameof(Index));
            return View("~/Views/Encuestas/EncuestaDetalle.cshtml", model);
        }

        [HttpPost("SavePregunta")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SavePregunta(PreguntaFormViewModel form)
        {
            if (string.IsNullOrWhiteSpace(form.Texto) || form.EncuestaID is null or 0)
            {
                TempData["Error"] = "Texto y encuesta son obligatorios.";
                return RedirectToAction(nameof(Detalle), new { encuestaId = form.EncuestaID ?? 0 });
            }

            await _service.SavePreguntaAsync(form);
            TempData["Message"] = form.PreguntaID is null or 0 ? "Pregunta creada." : "Pregunta actualizada.";
            return RedirectToAction(nameof(Detalle), new { encuestaId = form.EncuestaID });
        }

        [HttpPost("DeletePregunta")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeletePregunta(int preguntaId, int encuestaId)
        {
            await _service.DeletePreguntaAsync(preguntaId);
            TempData["Message"] = "Pregunta eliminada.";
            return RedirectToAction(nameof(Detalle), new { encuestaId });
        }

        [HttpPost("SaveOpcion")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SaveOpcion(OpcionPreguntaFormViewModel form, int encuestaId)
        {
            if (string.IsNullOrWhiteSpace(form.Texto) || form.PreguntaID is null or 0)
            {
                TempData["Error"] = "Texto y pregunta son obligatorios.";
                return RedirectToAction(nameof(Detalle), new { encuestaId });
            }

            await _service.SaveOpcionAsync(form);
            TempData["Message"] = form.OpcionPreguntaID is null or 0 ? "Opción creada." : "Opción actualizada.";
            return RedirectToAction(nameof(Detalle), new { encuestaId });
        }

        [HttpPost("DeleteOpcion")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteOpcion(int opcionId, int encuestaId)
        {
            await _service.DeleteOpcionAsync(opcionId);
            TempData["Message"] = "Opción eliminada.";
            return RedirectToAction(nameof(Detalle), new { encuestaId });
        }

        // ─── Resultados ──────────────────────────────────────────────────────
        [HttpGet("Resultados/{encuestaId:int}")]
        public async Task<IActionResult> Resultados(int encuestaId)
        {
            var model = await _service.GetResultadosEncuestaAsync(encuestaId);
            if (model.Error is not null)
                return View("~/Views/Encuestas/ResultadosEncuesta.cshtml", model);
            return View("~/Views/Encuestas/ResultadosEncuesta.cshtml", model);
        }

        // ─── Helpers ─────────────────────────────────────────────────────────
        private async Task<EncuestasPageViewModel> BuildPageAsync(int? editId, bool soloActivas)
        {
            var all = (await _service.GetEncuestasAsync())
                .Where(e => e.bEliminado == false)
                .ToList();

            int totalActivas = all.Count(e => e.bActivo);

            var sorted = all
                .OrderBy(e => e.bActivo ? 0 : 1)
                .ThenBy(e => e.FechaInicio)
                .ToList();

            if (soloActivas)
                sorted = sorted.Where(e => e.bActivo).ToList();

            var form = editId.HasValue
                ? sorted.FirstOrDefault(e => e.EncuestaID == editId) ?? all.FirstOrDefault(e => e.EncuestaID == editId) ?? new EncuestaFormViewModel()
                : new EncuestaFormViewModel();

            return new EncuestasPageViewModel
            {
                Items = sorted,
                Form = form,
                SoloActivas = soloActivas,
                TotalActivas = totalActivas,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string
            };
        }

        private async Task<EncuestaDetallePageViewModel?> BuildDetalleAsync(int encuestaId, int? editPreguntaId, int? editOpcionId)
        {
            var encuestaTask = _service.GetEncuestasAsync();
            var preguntasTask = _service.GetPreguntasAsync(encuestaId);
            var opcionesTask = _service.GetOpcionesAsync(encuestaId);

            await Task.WhenAll(encuestaTask, preguntasTask, opcionesTask);

            var encuesta = (await encuestaTask).FirstOrDefault(e => e.EncuestaID == encuestaId);
            if (encuesta is null) return null;

            var preguntas = (await preguntasTask)
                .Where(p => p.EncuestaID == encuestaId && p.bEliminado == false)
                .OrderBy(p => p.Orden)
                .ToList();

            var preguntaIds = preguntas.Select(p => p.PreguntaID).ToHashSet();
            var opciones = (await opcionesTask)
                .Where(o => preguntaIds.Contains(o.PreguntaID) && o.bEliminado == false)
                .OrderBy(o => o.Orden)
                .ToList();

            var formPregunta = editPreguntaId.HasValue
                ? preguntas.FirstOrDefault(p => p.PreguntaID == editPreguntaId) ?? new PreguntaFormViewModel { EncuestaID = encuestaId }
                : new PreguntaFormViewModel { EncuestaID = encuestaId };

            var formOpcion = editOpcionId.HasValue
                ? opciones.FirstOrDefault(o => o.OpcionPreguntaID == editOpcionId) ?? new OpcionPreguntaFormViewModel()
                : new OpcionPreguntaFormViewModel();

            return new EncuestaDetallePageViewModel
            {
                Encuesta = encuesta,
                Preguntas = preguntas,
                Opciones = opciones,
                FormPregunta = formPregunta,
                FormOpcion = formOpcion,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string
            };
        }
    }
}
