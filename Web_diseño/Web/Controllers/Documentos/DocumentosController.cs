using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Documentos
{
    [Authorize]
    [Route("Gestion/Documentos")]
    [RequireMenuAccess("Gestion/Documentos")]
    public class DocumentosController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public DocumentosController(IGraphApiBackendService service)
        {
            _service = service;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloPublicos = false)
        {
            var model = await BuildPageAsync(editId, soloPublicos: soloPublicos);
            return View("~/Views/Documentos/Documentos.cshtml", model);
        }

        [HttpPost("Save")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(ArchivoFormViewModel form, bool soloPublicos = false)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(form.Nombre))
            {
                TempData["Error"] = "El nombre es obligatorio.";
                return RedirectToAction(nameof(Index), new { editId = form.ArchivoID, soloPublicos });
            }

            await _service.SaveDocumentoAsync(form);
            TempData["Message"] = form.ArchivoID is null or 0 ? "Documento creado." : "Documento actualizado.";
            return RedirectToAction(nameof(Index), new { soloPublicos });
        }

        [HttpPost("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int archivoId, bool soloPublicos = false)
        {
            await _service.DeleteArchivoAsync(archivoId);
            TempData["Message"] = "Documento eliminado.";
            return RedirectToAction(nameof(Index), new { soloPublicos });
        }

        private async Task<ArchivosPageViewModel> BuildPageAsync(int? editId = null, bool soloPublicos = false)
        {
            var all = (await _service.GetAllArchivosAsync())
                .Where(a => a.bEliminado == false)
                .ToList();

            int totalPublicos = all.Count(a => !a.EsPrivado);

            var sorted = all
                .OrderBy(a => a.EsPrivado ? 1 : 0)
                .ThenBy(a => a.Nombre)
                .ToList();

            if (soloPublicos)
                sorted = sorted.Where(a => !a.EsPrivado).ToList();

            ArchivoFormViewModel form;
            if (editId.HasValue)
            {
                form = sorted.FirstOrDefault(a => a.ArchivoID == editId)
                       ?? all.FirstOrDefault(a => a.ArchivoID == editId)
                       ?? new ArchivoFormViewModel();
            }
            else
            {
                form = new ArchivoFormViewModel();
            }

            return new ArchivosPageViewModel
            {
                Items = sorted,
                Form = form,
                SoloPublicos = soloPublicos,
                TotalPublicos = totalPublicos,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string
            };
        }
    }
}