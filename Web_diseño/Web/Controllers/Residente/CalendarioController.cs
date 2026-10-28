using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Calendario")]
    public sealed class CalendarioController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public CalendarioController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
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

            var reservasTask = _backend.GetReservasAmenidadesAsync();
            var juntasTask = _backend.GetJuntasAsync();

            await Task.WhenAll(reservasTask, juntasTask);

            var model = new CalendarioViewModel
            {
                Reservas = reservasTask.Result
                    .Where(item => item.bEliminado != true && item.UsuarioID == context.UsuarioId)
                    .OrderBy(item => item.FechaInicio)
                    .ToList(),
                Juntas = juntasTask.Result
                    .Where(item => !item.bEliminado && item.FechaProgramada.HasValue)
                    .OrderBy(item => item.FechaProgramada)
                    .ToList(),
                PageTitle = "Mi calendario",
                HomeHref = "/Residente/Inicio",
                HomeLabel = "Portal residente"
            };

            return View("~/Views/Calendario/Calendario.cshtml", model);
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