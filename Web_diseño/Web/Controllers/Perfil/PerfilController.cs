using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Web.Models.Residente;
using Web.Filters;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Perfil
{
    [Authorize]
    [Route("Gestion/Perfil")]
    [RequireMenuAccess("Gestion/Perfil")]
    public class PerfilController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public PerfilController(IGraphApiBackendService service)
        {
            _service = service;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var correo = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
            var perfil = await _service.GetPerfilByCorreoAsync(correo);

            // Cargar mascotas y automóviles del residente si es aplicable
            var usuarioId = CotoContext.GetUsuarioId(User);
            var mascotas = usuarioId > 0 ? await _service.GetMascotasByUsuarioAsync(usuarioId) : Array.Empty<MascotaFormViewModel>();
            var automoviles = usuarioId > 0 ? await _service.GetAutomovilesByUsuarioAsync(usuarioId) : Array.Empty<AutomovilFormViewModel>();

            var model = perfil ?? new PerfilViewModel
            {
                NombreUsuario = correo,
                CorreoUsuario = correo,
            };

            model.Message = TempData["Message"] as string;
            model.Error   = TempData["Error"] as string;
            model.MustChangePassword = TempData["MustChangePassword"] as string == "1"
                                       || model.bActualizarPassword;

            ViewData["ResidentMascotas"] = mascotas;
            ViewData["ResidentAutomoviles"] = automoviles;

            return View("~/Views/Perfil/Perfil.cshtml", model);
        }

        [HttpPost("ActualizarPerfil")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ActualizarPerfil(PerfilViewModel model)
        {
            if (model.UsuarioID is null or 0 || string.IsNullOrWhiteSpace(model.NombreUsuario))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            string? nuevoCorreo = null;
            if (!string.IsNullOrWhiteSpace(model.CorreoUsuario))
            {
                var correoTrimmed = model.CorreoUsuario.Trim();
                if (!correoTrimmed.Contains('@') || !correoTrimmed.Contains('.'))
                {
                    TempData["Error"] = "El correo electrónico no es válido.";
                    return RedirectToAction(nameof(Index));
                }
                var emailDuplicate = await _service.CheckEmailExistsAsync(correoTrimmed, model.UsuarioID);
                if (emailDuplicate)
                {
                    TempData["Error"] = "El correo electrónico ya está en uso por otro usuario.";
                    return RedirectToAction(nameof(Index));
                }
                nuevoCorreo = correoTrimmed;
            }

            await _service.UpdatePerfilAsync(model.UsuarioID.Value, model.NombreUsuario, model.TelefonoUsuario, model.FotoUrlUsuario, nuevoCorreo);
            TempData["Message"] = "Perfil actualizado.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("CambiarPassword")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarPassword(int usuarioId, CambiarPasswordViewModel model)
        {
            if (usuarioId == 0 || string.IsNullOrWhiteSpace(model.PasswordNuevo))
            {
                TempData["Error"] = "El usuario y la nueva contraseña son obligatorios.";
                return RedirectToAction(nameof(Index));
            }

            if (model.PasswordNuevo != model.PasswordConfirmar)
            {
                TempData["Error"] = "Las contraseñas no coinciden.";
                return RedirectToAction(nameof(Index));
            }

            if (model.PasswordNuevo.Length < 6)
            {
                TempData["Error"] = "La contraseña debe tener al menos 6 caracteres.";
                return RedirectToAction(nameof(Index));
            }

            await _service.CambiarPasswordAsync(usuarioId, model.PasswordNuevo);
            TempData["Message"] = "Contraseña actualizada correctamente.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("CrearMascota")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CrearMascota(MascotaFormViewModel model)
        {
            var usuarioId = CotoContext.GetUsuarioId(User);
            var nombreTrim = model.Nombre?.Trim() ?? string.Empty;
            if (usuarioId <= 0 || string.IsNullOrWhiteSpace(nombreTrim))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            if (nombreTrim.Length > 100 || !Regex.IsMatch(nombreTrim, @"^[\p{L}0-9 \.\,\-']+$"))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            model.Nombre = nombreTrim;
            model.UsuarioID = usuarioId;
            await _service.SaveMascotaAsync(model);

            TempData["Message"] = "Mascota guardada.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("EliminarMascota")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EliminarMascota(int mascotaId)
        {
            if (mascotaId <= 0)
            {
                TempData["Error"] = "Mascota inválida.";
                return RedirectToAction(nameof(Index));
            }

            await _service.DeleteMascotaAsync(mascotaId);
            TempData["Message"] = "Mascota eliminada.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("CrearAutomovil")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CrearAutomovil(AutomovilFormViewModel model)
        {
            var usuarioId = CotoContext.GetUsuarioId(User);
            // Early parse AutomovilID from form (non-JS clients may post edit to CrearAutomovil)
            try
            {
                if (Request.HasFormContentType)
                {
                    var earlyRaw = Request.Form["AutomovilID"].ToString();
                    if (string.IsNullOrWhiteSpace(earlyRaw)) earlyRaw = Request.Form["automovilId"].ToString();
                    if (!string.IsNullOrWhiteSpace(earlyRaw) && int.TryParse(earlyRaw, out var earlyParsed))
                    {
                        model.AutomovilID = earlyParsed;
                    }
                }
            }
            catch { }
            var placasTrim = model.Placas?.Trim() ?? string.Empty;
            if (usuarioId <= 0 || string.IsNullOrWhiteSpace(placasTrim))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            if (placasTrim.Length < 4 || placasTrim.Length > 10 || !Regex.IsMatch(placasTrim, @"^[A-Za-z0-9\- ]+$"))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            model.Placas = placasTrim;
            model.UsuarioID = usuarioId;
            await _service.SaveAutomovilAsync(model);

            TempData["Message"] = "Automóvil guardado.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("EditarAutomovil")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditarAutomovil(AutomovilFormViewModel model)
        {
            var usuarioId = CotoContext.GetUsuarioId(User);
            var placasTrim = model.Placas?.Trim() ?? string.Empty;
            if (usuarioId <= 0 || model.AutomovilID is null || model.AutomovilID == 0 || string.IsNullOrWhiteSpace(placasTrim))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            if (placasTrim.Length < 4 || placasTrim.Length > 10 || !Regex.IsMatch(placasTrim, @"^[A-Za-z0-9\- ]+$"))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            model.Placas = placasTrim;
            model.UsuarioID = usuarioId;
            await _service.SaveAutomovilAsync(model);

            TempData["Message"] = "Automóvil actualizado.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("EliminarAutomovil")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EliminarAutomovil(int automovilId)
        {
            if (automovilId <= 0)
            {
                TempData["Error"] = "Automóvil inválido.";
                return RedirectToAction(nameof(Index));
            }

            await _service.DeleteAutomovilAsync(automovilId);
            TempData["Message"] = "Automóvil eliminado.";
            return RedirectToAction(nameof(Index));
        }
    }
}
