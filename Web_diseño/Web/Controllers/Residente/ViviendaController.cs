using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Vivienda")]
    public sealed class ViviendaController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public ViviendaController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context);
            return View("~/Views/Residente/Vivienda/Index.cshtml", model);
        }

        private async Task<ResidentPropertyPageViewModel> BuildPageAsync(ResidentPortalContextViewModel context)
        {
            var casasTask = _backend.GetCasasAsync();
            var condominiosTask = _backend.GetCondominiosAsync();

            await Task.WhenAll(casasTask, condominiosTask);

            var casas = casasTask.Result.ToList();
            var condominios = condominiosTask.Result.ToList();

            var activeProperty = context.Properties.FirstOrDefault(item => item.CasaId == context.SelectedCasaId);
            var activeCasa = casas.FirstOrDefault(item => item.CasaID == context.SelectedCasaId);
            var activeCondominio = condominios.FirstOrDefault(item => item.CondominioID == context.SelectedCondominioId)
                ?? (activeCasa is not null ? condominios.FirstOrDefault(item => item.CondominioID == activeCasa.CondominioID) : null);

            if (activeCasa is not null && string.IsNullOrWhiteSpace(activeCasa.NombreCondominio) && activeCondominio is not null)
            {
                activeCasa.NombreCondominio = activeCondominio.NombreCondominio;
                activeCasa.DireccionCondominio = activeCondominio.DireccionCondominio;
            }

            return new ResidentPropertyPageViewModel
            {
                Context = context,
                ActiveProperty = activeProperty,
                ActiveCasa = activeCasa,
                ActiveCondominio = activeCondominio,
                AvailableProperties = context.Properties,
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };
        }

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