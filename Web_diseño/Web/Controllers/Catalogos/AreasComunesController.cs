using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/AreasComunes")]
    [RequireMenuAccess("Gestion/AreasComunes")]
    public class AreasComunesController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public AreasComunesController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false)
        {
            var model = await BuildPageAsync(editId, soloActivas: soloActivas);
            return View("~/Views/Catalogos/AreasComunes.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(AreaComunFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Catalogos/AreasComunes.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                await _backend.SaveAreaComunAsync(form);
                TempData["Message"] = form.AreasComunesID is null or 0 ? "Area común creada." : "Area común actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int areaComunId)
        {
            try
            {
                await _backend.DeleteAreaComunAsync(areaComunId);
                TempData["Message"] = "Area común eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<AreasComunesPageViewModel> BuildPageAsync(int? editId = null, AreaComunFormViewModel? formOverride = null, bool soloActivas = false)
        {
            var all = await _backend.GetAreasComunesAsync();

            int totalActivas = all.Count(item => item.bEliminado != true);

            var items = all
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenBy(item => item.AreasComunes)
                .ToList();

            if (soloActivas)
            {
                items = items.Where(item => item.bEliminado != true).ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? items.FirstOrDefault(item => item.AreasComunesID == editId) ?? new AreaComunFormViewModel { AreasComunesID = editId }
                    : new AreaComunFormViewModel();
            }

            return new AreasComunesPageViewModel
            {
                Items = items,
                Form = form,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloActivas = soloActivas,
                TotalActivas = totalActivas
            };
        }
    }
}