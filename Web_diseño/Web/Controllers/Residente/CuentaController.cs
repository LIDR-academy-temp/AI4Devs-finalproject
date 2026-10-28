using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Cuenta")]
    public sealed class CuentaController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public CuentaController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(bool soloPendientes = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context, soloPendientes);
            return View("~/Views/Residente/Cuenta/Index.cshtml", model);
        }

        private async Task<ResidentAccountPageViewModel> BuildPageAsync(ResidentPortalContextViewModel context, bool soloPendientes)
        {
            var currentUserName = CotoContext.GetNombreUsuario(User);
            var cuotasTask = _backend.GetCuotasAsync();
            var casasTask = _backend.GetCasasAsync();
            var condominiosTask = _backend.GetCondominiosAsync();

            await Task.WhenAll(cuotasTask, casasTask, condominiosTask);

            var casas = CotoContext.FilterCasas(casasTask.Result, context.SelectedCondominioId).ToList();
            var condominios = condominiosTask.Result.ToList();

            var casaById = casas
                .Where(item => item.CasaID.HasValue)
                .ToDictionary(item => item.CasaID!.Value);
            var condominioById = condominios
                .Where(item => item.CondominioID.HasValue)
                .ToDictionary(item => item.CondominioID!.Value);

            var allCuotas = cuotasTask.Result
                .Where(item => !item.bEliminado)
                .Where(item => context.SelectedCasaId.HasValue
                    ? item.CasaID == context.SelectedCasaId.Value
                    : item.UsuarioID == context.UsuarioId)
                .ToList();

            var now = DateTime.Now;
            ApplyDisplayAndState(allCuotas, casaById, condominioById, context, currentUserName, now);

            var saldoPendiente = allCuotas
                .Where(item => !item.Pagado)
                .Sum(item => item.Monto);

            var totalPagado = allCuotas
                .Where(item => item.Pagado)
                .Sum(item => item.Monto);

            var cuotasPendientes = allCuotas.Count(item => !item.Pagado);
            var cuotasVencidas = allCuotas.Count(item => !item.Pagado && item.FechaVencimiento != default && item.FechaVencimiento < now);
            var cuotasPagadas = allCuotas.Count(item => item.Pagado);

            var items = allCuotas
                .OrderBy(item => SortOrderForEstado(item.EstadoCuota))
                .ThenBy(item => item.FechaVencimiento == default ? DateTime.MaxValue : item.FechaVencimiento)
                .ToList();

            if (soloPendientes)
            {
                items = items.Where(item => !item.Pagado).ToList();
            }

            var proximoVencimientoItem = allCuotas
                .Where(item => !item.Pagado && item.FechaVencimiento != default)
                .OrderBy(item => item.FechaVencimiento)
                .FirstOrDefault();

            return new ResidentAccountPageViewModel
            {
                Context = context,
                Items = items,
                SoloPendientes = soloPendientes,
                SaldoPendiente = saldoPendiente,
                TotalPagado = totalPagado,
                CuotasPendientes = cuotasPendientes,
                CuotasVencidas = cuotasVencidas,
                CuotasPagadas = cuotasPagadas,
                ProximoVencimiento = proximoVencimientoItem?.FechaVencimiento,
                ProximoMonto = proximoVencimientoItem?.Monto,
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };
        }

        private static void ApplyDisplayAndState(
            IEnumerable<CuotaFormViewModel> items,
            IReadOnlyDictionary<int, CasaFormViewModel> casaById,
            IReadOnlyDictionary<int, CondominioFormViewModel> condominioById,
            ResidentPortalContextViewModel context,
            string currentUserName,
            DateTime now)
        {
            foreach (var item in items)
            {
                item.NombrePropietario = currentUserName;

                if (item.CasaID.HasValue && casaById.TryGetValue(item.CasaID.Value, out var casa))
                {
                    item.DireccionCasa = $"{casa.DireccionCasa} {casa.NumeroExtCasa}".Trim();
                    if (!string.IsNullOrWhiteSpace(casa.NombrePropietario))
                    {
                        item.NombrePropietario = casa.NombrePropietario;
                    }
                    if (casa.CondominioID > 0 && condominioById.TryGetValue(casa.CondominioID, out var condominio))
                    {
                        item.NombreCondominio = condominio.NombreCondominio;
                    }
                }
                else
                {
                    item.DireccionCasa = context.SelectedCasaLabel;
                    item.NombreCondominio = context.SelectedCondominioName;
                }

                if (item.Pagado)
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

        private IActionResult? GuardResidentContext(ResidentPortalContextViewModel context)
        {
            if (context.IsAdministrador)
            {
                return RedirectToAction("Index", "Home");
            }

            if (!context.IsResident || !context.HasAssignedProperties || context.RequiresPropertySelection || !context.HasActiveProperty)
            {
                if (TempData["Error"] is null && !string.IsNullOrWhiteSpace(context.StatusMessage))
                {
                    TempData["Error"] = context.StatusMessage;
                }

                return RedirectToAction("Index", "Acceso");
            }

            return null;
        }
    }
}