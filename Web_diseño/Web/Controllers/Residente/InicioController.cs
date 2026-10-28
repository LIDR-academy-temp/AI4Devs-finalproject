using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Inicio")]
    public class InicioController : Controller
    {
        private readonly IResidentPortalService _residentPortal;

        public InicioController(IResidentPortalService residentPortal)
        {
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            if (CotoContext.GetIsAdministrador(User))
            {
                return RedirectToAction("Index", "Home");
            }

            var model = await _residentPortal.GetHomeAsync(User);
            model.Message ??= TempData["Message"]?.ToString();
            model.Error ??= TempData["Error"]?.ToString();

            if (!model.Context.IsResident || !model.Context.HasAssignedProperties || model.Context.RequiresPropertySelection)
            {
                return RedirectToAction("Index", "Acceso");
            }

            return View("~/Views/Residente/Inicio/Index.cshtml", model);
        }
    }
}