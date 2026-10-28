using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Finanzas
{
    [Authorize]
    [Route("Finanzas/Cuentas")]
    [RequireMenuAccess("Finanzas/Cuentas")]
    public class CuentasFinController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public CuentasFinController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false)
        {
            var model = await BuildPageAsync(editId, soloActivas: soloActivas);
            return View("~/Views/Finanzas/Cuentas.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(CuentaFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Finanzas/Cuentas.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                await _backend.SaveCuentaAsync(form);
                TempData["Message"] = form.CuentaID is null or 0 ? "Cuenta creada." : "Cuenta actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int cuentaId)
        {
            try
            {
                await _backend.DeleteCuentaAsync(cuentaId);
                TempData["Message"] = "Cuenta eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<CuentasPageViewModel> BuildPageAsync(int? editId = null, CuentaFormViewModel? formOverride = null, bool soloActivas = false)
        {
            var cuentasTask = _backend.GetCuentasAsync();
            var usuariosTask = _backend.GetUsuariosAsync();

            await Task.WhenAll(cuentasTask, usuariosTask);

            var all = cuentasTask.Result;
            var usuarios = usuariosTask.Result;

            // apply display
            var usuarioById = usuarios
                .Where(item => item.UsuarioID.HasValue)
                .ToDictionary(item => item.UsuarioID!.Value);

            foreach (var c in all)
            {
                if (c.ResponsableUsuarioID.HasValue && usuarioById.TryGetValue(c.ResponsableUsuarioID.Value, out var u))
                {
                    c.NombreResponsable = u.NombreUsuario;
                }
            }

            int totalActivas = all.Count(item => item.bEliminado != true);

            var items = all
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenBy(item => item.Cuenta)
                .ToList();

            if (soloActivas)
            {
                items = items.Where(item => item.bEliminado != true).ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? all.FirstOrDefault(item => item.CuentaID == editId) ?? new CuentaFormViewModel { CuentaID = editId }
                    : new CuentaFormViewModel();
            }

            var responsableOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "", Text = "Sin responsable" }
            };
            responsableOptions.AddRange(usuarios
                .OrderBy(item => item.NombreUsuario)
                .Select(item => new SelectListItem
                {
                    Value = item.UsuarioID?.ToString() ?? string.Empty,
                    Text = item.NombreUsuario ?? string.Empty,
                    Selected = item.UsuarioID == form.ResponsableUsuarioID
                }));

            return new CuentasPageViewModel
            {
                Items = items,
                Form = form,
                ResponsableOptions = responsableOptions,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloActivas = soloActivas,
                TotalActivas = totalActivas
            };
        }
    }
}
