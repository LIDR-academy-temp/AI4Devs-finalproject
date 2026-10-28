using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Finanzas
{
    [Authorize]
    [Route("Finanzas/Cuotas")]
    [RequireMenuAccess("Finanzas/Cuotas")]
    public class CuotasFinController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public CuotasFinController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloPendientes = false)
        {
            var model = await BuildPageAsync(editId, soloPendientes: soloPendientes);
            return View("~/Views/Finanzas/Cuotas.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(CuotaFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Finanzas/Cuotas.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                await _backend.SaveCuotaAsync(form);
                TempData["Message"] = form.CuotaID is null or 0 ? "Cuota creada." : "Cuota actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int cuotaId)
        {
            try
            {
                await _backend.DeleteCuotaAsync(cuotaId);
                TempData["Message"] = "Cuota eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<CuotasPageViewModel> BuildPageAsync(int? editId = null, CuotaFormViewModel? formOverride = null, bool soloPendientes = false)
        {
            var selectedCondominioId = CotoContext.GetSelectedCondominioId(User);
            var cuotasTask = _backend.GetCuotasAsync();
            var casasTask = _backend.GetCasasAsync();
            var condominiosTask = _backend.GetCondominiosAsync();
            var usuariosTask = _backend.GetUsuariosAsync();

            await Task.WhenAll(cuotasTask, casasTask, condominiosTask, usuariosTask);

            var casas = CotoContext.FilterCasas(casasTask.Result, selectedCondominioId).ToList();
            var condominios = condominiosTask.Result.ToList();
            var usuarios = usuariosTask.Result.ToList();

            // build lookup maps
            var casaById = casas
                .Where(item => item.CasaID.HasValue)
                .ToDictionary(item => item.CasaID!.Value);
            var condominioById = condominios
                .Where(item => item.CondominioID.HasValue)
                .ToDictionary(item => item.CondominioID!.Value);
            var usuarioById = usuarios
                .Where(item => item.UsuarioID.HasValue)
                .ToDictionary(item => item.UsuarioID!.Value);

            var allCuotas = cuotasTask.Result.ToList();

            // scope to condominio when selected
            if (selectedCondominioId.HasValue)
            {
                var casaIdsEnCondo = casas
                    .Where(c => c.CondominioID == selectedCondominioId.Value)
                    .Select(c => c.CasaID)
                    .ToHashSet();
                allCuotas = allCuotas
                    .Where(q => !q.CasaID.HasValue || casaIdsEnCondo.Contains(q.CasaID))
                    .ToList();
            }

            var now = DateTime.Now;
            int totalPendientes = allCuotas.Count(q => q.bEliminado != true && q.Pagado != true);
            int totalVencidas = allCuotas.Count(q => q.bEliminado != true && q.Pagado != true && q.FechaVencimiento != default && q.FechaVencimiento < now);

            // apply display data
            ApplyDisplayAndState(allCuotas, casaById, condominioById, usuarioById, now);

            // filters
            var items = allCuotas
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenBy(item => SortOrderForEstado(item.EstadoCuota))
                .ThenBy(item => item.FechaVencimiento)
                .ToList();

            if (soloPendientes)
            {
                items = items.Where(item => item.bEliminado != true && item.Pagado != true).ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? allCuotas.FirstOrDefault(item => item.CuotaID == editId) ?? new CuotaFormViewModel { CuotaID = editId }
                    : new CuotaFormViewModel();
            }

            var casaOptions = new List<SelectListItem>
            {
                new SelectListItem { Value = "", Text = "Sin casa" }
            };
            casaOptions.AddRange(casas
                .OrderBy(c => c.NombreCondominio)
                .ThenBy(c => c.DireccionCasa)
                .Select(c => new SelectListItem
                {
                    Value = c.CasaID?.ToString() ?? string.Empty,
                    Text = $"{c.NombreCondominio} — {c.DireccionCasa} {c.NumeroExtCasa}".Trim(),
                    Selected = c.CasaID == form.CasaID
                }));

            var usuarioOptions = usuarios
                .OrderBy(u => u.NombreUsuario)
                .Select(u => new SelectListItem
                {
                    Value = u.UsuarioID?.ToString() ?? string.Empty,
                    Text = u.NombreUsuario ?? string.Empty,
                    Selected = u.UsuarioID == form.UsuarioID
                })
                .ToList();

            return new CuotasPageViewModel
            {
                Items = items,
                Form = form,
                CasaOptions = casaOptions,
                UsuarioOptions = usuarioOptions,
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloPendientes = soloPendientes,
                TotalPendientes = totalPendientes,
                TotalVencidas = totalVencidas
            };
        }

        private static void ApplyDisplayAndState(
            IEnumerable<CuotaFormViewModel> items,
            Dictionary<int, CasaFormViewModel> casaById,
            Dictionary<int, CondominioFormViewModel> condominioById,
            Dictionary<int, UsuarioLookupViewModel> usuarioById,
            DateTime now)
        {
            foreach (var item in items)
            {
                if (item.UsuarioID > 0 && usuarioById.TryGetValue(item.UsuarioID, out var usuario))
                {
                    item.NombrePropietario = usuario.NombreUsuario;
                }

                if (item.CasaID.HasValue && casaById.TryGetValue(item.CasaID.Value, out var casa))
                {
                    item.DireccionCasa = $"{casa.DireccionCasa} {casa.NumeroExtCasa}".Trim();
                    if (casa.CondominioID > 0 && condominioById.TryGetValue(casa.CondominioID, out var condo))
                    {
                        item.NombreCondominio = condo.NombreCondominio;
                    }
                }

                if (item.bEliminado)
                {
                    item.EstadoCuota = "Eliminada";
                    item.EstadoCuotaClase = "badge badge-secondary";
                }
                else if (item.Pagado)
                {
                    item.EstadoCuota = "Pagada";
                    item.EstadoCuotaClase = "badge badge-success";
                }
                else if (item.FechaVencimiento != default && item.FechaVencimiento < now)
                {
                    item.EstadoCuota = "Vencida";
                    item.EstadoCuotaClase = "badge badge-danger";
                }
                else
                {
                    item.EstadoCuota = "Pendiente";
                    item.EstadoCuotaClase = "badge badge-warning";
                }
            }
        }

        private static int SortOrderForEstado(string estado) => estado switch
        {
            "Vencida" => 0,
            "Pendiente" => 1,
            "Pagada" => 2,
            _ => 3
        };
    }
}
