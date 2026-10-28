using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Calendario
{
    [Authorize]
    [Route("Gestion/Calendario")]
    [RequireMenuAccess("Gestion/Calendario")]
    public class CalendarioController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public CalendarioController(IGraphApiBackendService service)
        {
            _service = service;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var reservasTask = _service.GetReservasAmenidadesAsync();
            var juntasTask   = _service.GetJuntasAsync();

            await Task.WhenAll(reservasTask, juntasTask);

            var model = new CalendarioViewModel
            {
                Reservas = (await reservasTask)
                    .Where(r => r.bEliminado != true)
                    .ToList(),
                Juntas = (await juntasTask)
                    .Where(j => !j.bEliminado && j.FechaProgramada.HasValue)
                    .ToList()
            };

            return View("~/Views/Calendario/Calendario.cshtml", model);
        }
    }
}
