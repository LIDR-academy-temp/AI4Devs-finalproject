using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.IO;
using System;
using System.Linq;
using Web.Filters;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Perfil")]
    [RequireMenuAccess("Residente/Perfil")]
    public sealed class PerfilController : Controller
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

            // Cargar mascotas y automóviles del residente
            var usuarioId = CotoContext.GetUsuarioId(User);
            var mascotas = usuarioId > 0 ? await _service.GetMascotasByUsuarioAsync(usuarioId) : Array.Empty<MascotaFormViewModel>();
            var automoviles = usuarioId > 0 ? await _service.GetAutomovilesByUsuarioAsync(usuarioId) : Array.Empty<AutomovilFormViewModel>();

            var model = perfil ?? new PerfilViewModel
            {
                NombreUsuario = correo,
                CorreoUsuario = correo,
            };

            model.Message = TempData["Message"] as string;
            model.Error = TempData["Error"] as string;
            model.MustChangePassword = TempData["MustChangePassword"] as string == "1"
                                       || model.bActualizarPassword;

            ViewData["ResidentMascotas"] = mascotas;
            ViewData["ResidentAutomoviles"] = automoviles;

            return View("~/Views/Residente/Perfil/Index.cshtml", model);
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

            // Validación adicional: longitud máxima y caracteres permitidos
            if (nombreTrim.Length > 100 || !Regex.IsMatch(nombreTrim, @"^[\p{L}0-9 \.\,\-']+$"))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            model.Nombre = nombreTrim;
            // Asegurar usuarioId viene del contexto
            model.UsuarioID = usuarioId;
            var cid = Guid.NewGuid().ToString();
            HttpContext.Items["cid"] = cid;
            var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
            Directory.CreateDirectory(logDir);
            var logPath = Path.Combine(logDir, "debug_mascota_post.log");
            System.IO.File.AppendAllText(logPath, $"{DateTime.UtcNow:O} | CID={cid} | MascotaID={model.MascotaID} | UsuarioID={model.UsuarioID}{Environment.NewLine}");

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
            var placasTrim = model.Placas?.Trim() ?? string.Empty;
            if (usuarioId <= 0 || string.IsNullOrWhiteSpace(placasTrim))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            // Validación adicional: longitud y caracteres permitidos en placas
            if (placasTrim.Length < 4 || placasTrim.Length > 10 || !Regex.IsMatch(placasTrim, @"^[A-Za-z0-9\- ]+$"))
            {
                TempData["Error"] = "Datos incompletos.";
                return RedirectToAction(nameof(Index));
            }

            model.Placas = placasTrim;
            model.UsuarioID = usuarioId;

            // Usar sólo AutomovilID explícito cuando venga en el form (o en alternativa 'automovilId').
            // Evitamos heurísticas peligrosas que buscaban por placas/modelo y podían actualizar filas equivocadas.
            try
            {
                int? explicitId = null;
                if (Request.HasFormContentType)
                {
                    var raw = Request.Form["AutomovilID"].ToString();
                    if (string.IsNullOrWhiteSpace(raw)) raw = Request.Form["automovilId"].ToString();
                    if (!string.IsNullOrWhiteSpace(raw) && int.TryParse(raw, out var parsed)) explicitId = parsed;
                }

                try
                {
                    if (explicitId.HasValue)
                    {
                        model.AutomovilID = explicitId;
                        var logDir4 = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                        var logPath4 = Path.Combine(logDir4, "debug_automovil_post.log");
                        System.IO.File.AppendAllText(logPath4, $"{DateTime.UtcNow:O} | UPDATE-USING-EXPLICIT-ID AutomovilID={model.AutomovilID} Modelo='{model.ModeloLibre}' Placas='{model.Placas}'{Environment.NewLine}");
                    }
                }
                catch { }

                // Guardar modelo: si AutomovilID tiene valor será un update, si no es create.
                var cid = Guid.NewGuid().ToString();
                HttpContext.Items["cid"] = cid;
                var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                Directory.CreateDirectory(logDir);
                var logPath = Path.Combine(logDir, "debug_automovil_post.log");
                System.IO.File.AppendAllText(logPath, $"{DateTime.UtcNow:O} | CID={cid} | AutomovilID={model.AutomovilID} | UsuarioID={model.UsuarioID}{Environment.NewLine}");

                await _service.SaveAutomovilAsync(model);
            }
            catch (Exception ex)
            {
                try { var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp"); var logPath = Path.Combine(logDir, "debug_automovil_post.log"); System.IO.File.AppendAllText(logPath, $"{DateTime.UtcNow:O} | SAVE-ERROR {ex.Message}{Environment.NewLine}"); } catch { }
            }
            TempData["Message"] = "Automóvil guardado.";
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("EditarAutomovil")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditarAutomovil(AutomovilFormViewModel model)
        {
            // Debug: capture incoming form and allow explicit form fallbacks (same behavior as CrearAutomovil)
            try
            {
                var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                Directory.CreateDirectory(logDir);
                var logPath = Path.Combine(logDir, "debug_automovil_post.log");
                var hdrs = string.Join(';', Request.Headers.Select(h => h.Key + "=" + h.Value));
                var meta = $"{DateTime.UtcNow:O} | INCOMING-EDIT {Request.Method} {Request.Path} ContentType={Request.ContentType} | Headers={hdrs}{Environment.NewLine}";
                System.IO.File.AppendAllText(logPath, meta);
                if (Request.HasFormContentType)
                {
                    var formItems = Request.Form.Select(kv => kv.Key + "=" + kv.Value);
                    var formLine = $"FORM-INCOMING-EDIT: {string.Join(';', formItems)}{Environment.NewLine}";
                    System.IO.File.AppendAllText(logPath, formLine);
                }

                var snapshot = $"{DateTime.UtcNow:O} | START-EDIT Model.AutomovilID={model.AutomovilID} ModeloLibre={model.ModeloLibre} Placas={model.Placas} UsuarioID={model.UsuarioID}{Environment.NewLine}";
                System.IO.File.AppendAllText(logPath, snapshot);
            }
            catch { }

            // Prefer posted form values when present (robust for non-JS or proxied posts)
            try
            {
                var logDir2 = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                Directory.CreateDirectory(logDir2);
                var logPath2 = Path.Combine(logDir2, "debug_automovil_post.log");
                var rawVal = Request.HasFormContentType ? Request.Form["AutomovilID"].ToString() : string.Empty;
                if (string.IsNullOrWhiteSpace(rawVal)) rawVal = Request.HasFormContentType ? Request.Form["automovilId"].ToString() : string.Empty;
                var rawModeloIncoming = Request.HasFormContentType ? Request.Form["ModeloLibre"].ToString() : string.Empty;
                var rawPlacasIncoming = Request.HasFormContentType ? Request.Form["Placas"].ToString() : string.Empty;
                if (!string.IsNullOrWhiteSpace(rawModeloIncoming)) model.ModeloLibre = rawModeloIncoming;
                if (!string.IsNullOrWhiteSpace(rawPlacasIncoming)) model.Placas = rawPlacasIncoming;
                System.IO.File.AppendAllText(logPath2, $"{DateTime.UtcNow:O} | RAW-FORM-EDIT AutomovilID='{rawVal}' | Model.AutomovilID='{model.AutomovilID}'{Environment.NewLine}");

                if ((model.AutomovilID == null || model.AutomovilID == 0) && !string.IsNullOrWhiteSpace(rawVal))
                {
                    if (int.TryParse(rawVal, out var parsedId))
                    {
                        model.AutomovilID = parsedId;
                        System.IO.File.AppendAllText(logPath2, $"{DateTime.UtcNow:O} | PARSED-FROM-FORM-EDIT AutomovilID={model.AutomovilID}{Environment.NewLine}");
                    }
                    else
                    {
                        System.IO.File.AppendAllText(logPath2, $"{DateTime.UtcNow:O} | PARSE-FAILED-EDIT AutomovilID='{rawVal}'{Environment.NewLine}");
                    }
                }
            }
            catch { }

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

            var cid = Guid.NewGuid().ToString();
            HttpContext.Items["cid"] = cid;
            var logDir3 = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
            Directory.CreateDirectory(logDir3);
            var logPath3 = Path.Combine(logDir3, "debug_automovil_post.log");
            System.IO.File.AppendAllText(logPath3, $"{DateTime.UtcNow:O} | CID={cid} (EDIT){Environment.NewLine}");

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