using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Contexto")]
    public class ContextoController : Controller
    {
        private readonly IResidentPortalService _residentPortal;

        public ContextoController(IResidentPortalService residentPortal)
        {
            _residentPortal = residentPortal;
        }

        [HttpPost("SeleccionarVivienda")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SeleccionarVivienda(int casaId, string? returnUrl = null)
        {
            if (CotoContext.GetIsAdministrador(User))
            {
                return RedirectToAction("Index", "Home");
            }

            var context = await _residentPortal.GetContextAsync(User);
            var selectedProperty = context.Properties.FirstOrDefault(item => item.CasaId == casaId);
            if (selectedProperty is null)
            {
                TempData["Error"] = "La vivienda seleccionada no pertenece a tu sesión actual.";
                return RedirectToAction("Index", "Acceso", new { returnUrl });
            }

            var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (authResult.Principal?.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
            {
                return RedirectToAction("Login", "Login", new { returnUrl });
            }

            var updatedClaims = identity.Claims
                .Where(item => item.Type != CotoContext.DisplayNameClaim
                    && item.Type != CotoContext.SelectedCondominioIdClaim
                    && item.Type != CotoContext.SelectedCondominioNameClaim
                    && item.Type != CotoContext.SelectedCasaIdClaim
                    && item.Type != CotoContext.SelectedCasaLabelClaim)
                .ToList();

            updatedClaims.Add(new Claim(CotoContext.DisplayNameClaim, selectedProperty.CondominioName));
            updatedClaims.Add(CotoContext.BuildSelectedCondominioIdClaim(selectedProperty.CondominioId));
            updatedClaims.Add(CotoContext.BuildSelectedCondominioNameClaim(selectedProperty.CondominioName));
            updatedClaims.Add(CotoContext.BuildSelectedCasaIdClaim(selectedProperty.CasaId));
            updatedClaims.Add(CotoContext.BuildSelectedCasaLabelClaim(selectedProperty.CasaLabel));

            var newIdentity = new ClaimsIdentity(
                updatedClaims,
                CookieAuthenticationDefaults.AuthenticationScheme,
                identity.NameClaimType,
                identity.RoleClaimType);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(newIdentity),
                authResult.Properties);

            TempData["Message"] = $"Vivienda activa: {selectedProperty.DisplayLabel}.";

            if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }

            return RedirectToAction("Index", "Inicio");
        }
    }
}