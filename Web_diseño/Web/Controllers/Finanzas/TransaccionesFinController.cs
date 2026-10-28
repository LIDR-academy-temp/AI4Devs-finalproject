using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Finanzas
{
    [Authorize]
    [Route("Finanzas/Transacciones")]
    [RequireMenuAccess("Finanzas/Transacciones")]
    public class TransaccionesFinController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public TransaccionesFinController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false, int? filtroCuentaId = null)
        {
            var model = await BuildPageAsync(editId, soloActivas: soloActivas, filtroCuentaId: filtroCuentaId);
            return View("~/Views/Finanzas/Transacciones.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(TransaccionFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Finanzas/Transacciones.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                await _backend.SaveTransaccionAsync(form);
                TempData["Message"] = form.TransaccionID is null or 0 ? "Transacción creada." : "Transacción actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int transaccionId)
        {
            try
            {
                await _backend.DeleteTransaccionAsync(transaccionId);
                TempData["Message"] = "Transacción eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<TransaccionesPageViewModel> BuildPageAsync(
            int? editId = null,
            TransaccionFormViewModel? formOverride = null,
            bool soloActivas = false,
            int? filtroCuentaId = null)
        {
            var transTask = _backend.GetTransaccionesAsync();
            var cuentasTask = _backend.GetCuentasAsync();
            var usuariosTask = _backend.GetUsuariosAsync();
            var tiposTask = _backend.GetTiposMovimientoAsync();

            await Task.WhenAll(transTask, cuentasTask, usuariosTask, tiposTask);

            var all = transTask.Result.ToList();
            var cuentas = cuentasTask.Result.Where(c => c.bEliminado != true).ToList();
            var usuarios = usuariosTask.Result.ToList();
            var tipos = tiposTask.Result.ToList();

            int totalActivas = all.Count(item => item.bEliminado != true);

            var items = all
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenByDescending(item => item.TransaccionID)
                .ToList();

            if (soloActivas)
            {
                items = items.Where(item => item.bEliminado != true).ToList();
            }

            if (filtroCuentaId.HasValue && filtroCuentaId.Value > 0)
            {
                items = items.Where(item => item.CuentaID == filtroCuentaId.Value).ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? all.FirstOrDefault(item => item.TransaccionID == editId) ?? new TransaccionFormViewModel { TransaccionID = editId }
                    : new TransaccionFormViewModel();
            }

            var cuentaOptions = cuentas
                .OrderBy(c => c.Cuenta)
                .Select(c => new SelectListItem
                {
                    Value = c.CuentaID?.ToString() ?? string.Empty,
                    Text = $"{c.Cuenta} ({c.Tipo})",
                    Selected = c.CuentaID == form.CuentaID
                })
                .ToList();

            var usuarioOptions = usuarios
                .OrderBy(u => u.NombreUsuario)
                .Select(u => new SelectListItem
                {
                    Value = u.UsuarioID?.ToString() ?? string.Empty,
                    Text = u.NombreUsuario ?? string.Empty,
                    Selected = u.UsuarioID == form.UsuarioID
                })
                .ToList();

            var tipoMovOptions = tipos
                .Select(t => new SelectListItem
                {
                    Value = t.TipoMovimientoID?.ToString() ?? string.Empty,
                    Text = t.TipoMovimiento ?? string.Empty,
                    Selected = t.TipoMovimientoID == form.TipoMovimientoID
                })
                .ToList();

            var filtroCuentaOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "", Text = "Todas las cuentas", Selected = !filtroCuentaId.HasValue }
            };
            filtroCuentaOptions.AddRange(cuentas
                .OrderBy(c => c.Cuenta)
                .Select(c => new SelectListItem
                {
                    Value = c.CuentaID?.ToString() ?? string.Empty,
                    Text = $"{c.Cuenta} ({c.Tipo})",
                    Selected = c.CuentaID == filtroCuentaId
                }));

            return new TransaccionesPageViewModel
            {
                Items = items,
                Form = form,
                CuentaOptions = cuentaOptions,
                UsuarioOptions = usuarioOptions,
                TipoMovimientoOptions = tipoMovOptions,
                FiltroCuentaOptions = filtroCuentaOptions,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloActivas = soloActivas,
                FiltroCuentaId = filtroCuentaId,
                TotalActivas = totalActivas
            };
        }
    }
}
