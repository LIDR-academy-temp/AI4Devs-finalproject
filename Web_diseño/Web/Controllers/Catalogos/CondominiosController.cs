using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/Condominios")]
    [RequireMenuAccess("Gestion/Condominios")]
    public class CondominiosController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public CondominiosController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivos = false)
        {
            var model = await BuildPageAsync(editId, soloActivos: soloActivos);
            return View("~/Views/Catalogos/Condominios.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(CondominioFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Catalogos/Condominios.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                await _backend.SaveCondominioAsync(form);
                TempData["Message"] = form.CondominioID is null or 0 ? "Condominio creado." : "Condominio actualizado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int condominioId)
        {
            try
            {
                await _backend.DeleteCondominioAsync(condominioId);
                TempData["Message"] = "Condominio eliminado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<CondominiosPageViewModel> BuildPageAsync(int? editId = null, CondominioFormViewModel? formOverride = null, bool soloActivos = false)
        {
            var all = await _backend.GetCondominiosAsync();

            int totalActivos = all.Count(item => item.bEliminado != true);

            var items = all
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenBy(item => item.NombreCondominio)
                .ToList();

            if (soloActivos)
            {
                items = items.Where(item => item.bEliminado != true).ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? items.FirstOrDefault(item => item.CondominioID == editId) ?? new CondominioFormViewModel { CondominioID = editId }
                    : new CondominioFormViewModel();
            }

            return new CondominiosPageViewModel
            {
                Items = items,
                Form = form,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloActivos = soloActivos,
                TotalActivos = totalActivos
            };
        }
    }
}