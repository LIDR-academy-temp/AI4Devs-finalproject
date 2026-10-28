using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Admin
{
    [Authorize]
    [Route("Admin/Menus")]
    [RequireMenuAccess("Admin/Menus")]
    public class MenusAdminController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public MenusAdminController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null)
        {
            var items = await _backend.GetSgrMenusAdminAsync();
            var form  = editId.HasValue
                ? items.FirstOrDefault(m => m.MenuID == editId) ?? new SgrMenuAdminViewModel()
                : new SgrMenuAdminViewModel();

            var model = new SgrMenusAdminPageViewModel
            {
                Items   = items,
                Form    = form,
                Message = TempData["Message"]?.ToString(),
                Error   = TempData["Error"]?.ToString(),
            };
            return View("~/Views/Admin/Menus.cshtml", model);
        }

        [HttpPost("Save")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(SgrMenuAdminViewModel form)
        {
            if (string.IsNullOrWhiteSpace(form.TituloMenu))
            {
                TempData["Error"] = "El título es obligatorio.";
                return RedirectToAction(nameof(Index), new { editId = form.MenuID });
            }

            await _backend.SaveSgrMenuAsync(form);
            TempData["Message"] = form.MenuID is null or 0 ? "Menú creado." : "Menú actualizado.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int menuId)
        {
            await _backend.DeleteSgrMenuAsync(menuId);
            TempData["Message"] = "Menú eliminado.";
            return RedirectToAction(nameof(Index));
        }
    }
}
