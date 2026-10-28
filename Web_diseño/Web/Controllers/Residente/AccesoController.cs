using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Acceso")]
    public class AccesoController : Controller
    {
        private readonly IResidentPortalService _residentPortal;

        public AccesoController(IResidentPortalService residentPortal)
        {
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string? returnUrl = null, bool force = false)
        {
            if (CotoContext.GetIsAdministrador(User))
            {
                return RedirectToAction("Index", "Home");
            }

            var context = await _residentPortal.GetContextAsync(User);
            if (context.HasActiveProperty && !force)
            {
                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

                return RedirectToAction("Index", "Inicio");
            }

            var model = new ResidentAccessPageViewModel
            {
                Context = context,
                ReturnUrl = !string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl) ? returnUrl : null,
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Acceso/Index.cshtml", model);
        }
    }
}