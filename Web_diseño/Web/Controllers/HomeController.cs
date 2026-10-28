using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using Web.Models;
using Web.Services;

namespace Web.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly IGraphApiBackendService _service;
        private readonly IResidentPortalService _residentPortal;

        public HomeController(
            ILogger<HomeController> logger,
            IGraphApiBackendService service,
            IResidentPortalService residentPortal)
        {
            _logger = logger;
            _service = service;
            _residentPortal = residentPortal;
        }

        public async Task<IActionResult> Index()
        {
            var usuarioId = CotoContext.GetUsuarioId(User);
            if (!CotoContext.GetIsAdministrador(User) && await _residentPortal.HasResidentPropertiesAsync(usuarioId))
            {
                return RedirectToAction("Index", "Inicio", new { area = "" });
            }

            try
            {
                var dashboard = await _service.GetDashboardSummaryAsync();
                return View(dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Dashboard summary failed; showing empty counters.");
                return View(new Web.Models.Admin.DashboardViewModel());
            }
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}

