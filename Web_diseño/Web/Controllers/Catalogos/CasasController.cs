using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/Casas")]
    [RequireMenuAccess("Gestion/Casas")]
    public class CasasController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IEmailService _email;

        public CasasController(IGraphApiBackendService backend, IEmailService email)
        {
            _backend = backend;
            _email   = email;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloActivas = false, int? filtroCondominioId = null)
        {
            var model = await BuildPageAsync(editId, soloActivas: soloActivas, filtroCondominioId: filtroCondominioId);
            return View("~/Views/Catalogos/Casas.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(CasaFormViewModel form)
        {
            // Si se va a crear usuario nuevo, validar sus campos antes del ModelState general
            var crearUsuario = form.CrearNuevoUsuario
                               && form.CasaID is null or 0;

            if (crearUsuario)
            {
                if (string.IsNullOrWhiteSpace(form.NuevoUsuarioNombre))
                    ModelState.AddModelError(nameof(form.NuevoUsuarioNombre), "El nombre es obligatorio.");
                if (string.IsNullOrWhiteSpace(form.NuevoUsuarioCorreo))
                    ModelState.AddModelError(nameof(form.NuevoUsuarioCorreo), "El correo es obligatorio.");
                if (string.IsNullOrWhiteSpace(form.NuevoUsuarioPassword))
                    ModelState.AddModelError(nameof(form.NuevoUsuarioPassword), "La contraseña temporal es obligatoria.");
            }

            if (!ModelState.IsValid)
            {
                return View("~/Views/Catalogos/Casas.cshtml", await BuildPageAsync(formOverride: form));
            }

            try
            {
                if (crearUsuario)
                {
                    // Obtener (o crear) el perfil CONDOMINO automáticamente
                    var perfilId = await _backend.EnsurePerfilCondominoAsync();

                    var nuevoUsuarioId = await _backend.CreateUsuarioCondominoAsync(
                        form.NuevoUsuarioCorreo!.Trim(),
                        form.NuevoUsuarioNombre!.Trim(),
                        form.NuevoUsuarioPassword!,
                        perfilId);

                    form.PropietarioUsuarioID = nuevoUsuarioId;

                    // Enviar correo de bienvenida con contraseña temporal
                    try
                    {
                        var loginUrl = $"{Request.Scheme}://{Request.Host}/Login/Login";
                        var htmlBody = $"""
                            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
                              <h2 style="color:#1976d2">Bienvenido a Cuarta Quinientos</h2>
                              <p>Hola <strong>{form.NuevoUsuarioNombre!.Trim()}</strong>,</p>
                              <p>Se ha creado tu cuenta de residente. Usa los siguientes datos para iniciar sesión:</p>
                              <table style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;background:#f5f5f5;width:100%">
                                <tr><td><strong>Correo:</strong></td><td>{form.NuevoUsuarioCorreo!.Trim()}</td></tr>
                                <tr><td><strong>Contraseña temporal:</strong></td><td style="font-size:1.2em;font-weight:bold;color:#d32f2f">{form.NuevoUsuarioPassword}</td></tr>
                              </table>
                              <p style="margin-top:16px">Al ingresar por primera vez, el sistema te pedirá que cambies tu contraseña.</p>
                              <a href="{loginUrl}" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px">Iniciar sesión</a>
                              <hr style="margin-top:32px">
                              <small style="color:#888">Este mensaje fue generado automáticamente. No respondas a este correo.</small>
                            </div>
                            """;
                        await _email.SendAsync(
                            form.NuevoUsuarioCorreo!.Trim(),
                            form.NuevoUsuarioNombre!.Trim(),
                            "Tu acceso a Cuarta Quinientos",
                            htmlBody);
                        TempData["EmailEnviado"] = form.NuevoUsuarioCorreo!.Trim();
                    }
                    catch
                    {
                        // Email falla silenciosamente — mostrar contraseña en pantalla
                        TempData["PasswordTemporal"] = form.NuevoUsuarioPassword;
                    }
                }

                await _backend.SaveCasaAsync(form);
                TempData["Message"] = form.CasaID is null or 0
                    ? (crearUsuario ? $"Casa y usuario '{form.NuevoUsuarioCorreo}' creados." : "Casa creada.")
                    : "Casa actualizada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int casaId)
        {
            try
            {
                await _backend.DeleteCasaAsync(casaId);
                TempData["Message"] = "Casa eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<CasasPageViewModel> BuildPageAsync(int? editId = null, CasaFormViewModel? formOverride = null, bool soloActivas = false, int? filtroCondominioId = null)
        {
            var selectedCondominioId = CotoContext.GetSelectedCondominioId(User);
            var casasTask       = _backend.GetCasasAsync();
            var condominiosTask = _backend.GetCondominiosAsync();
            var usuariosTask    = _backend.GetUsuariosAsync();
            var perfilesTask    = _backend.GetSgrPerfilesAsync();

            await Task.WhenAll(casasTask, condominiosTask, usuariosTask, perfilesTask);

            var items = CotoContext.FilterCasas(casasTask.Result, selectedCondominioId).ToList();
            var condominios = CotoContext.FilterCondominios(condominiosTask.Result, selectedCondominioId).ToList();
            var usuarios = usuariosTask.Result.ToList();

            // Buscar perfil Condomino
            var perfilCondomino = perfilesTask.Result.FirstOrDefault(p =>
                p.Perfil.Equals("CONDOMINO", StringComparison.OrdinalIgnoreCase));

            ApplyDisplayData(items, condominios, usuarios);

            int totalActivas = items.Count(item => item.bEliminado != true);

            // Apply UI filters
            if (soloActivas)
            {
                items = items.Where(item => item.bEliminado != true).ToList();
            }

            if (filtroCondominioId.HasValue && filtroCondominioId.Value > 0)
            {
                items = items.Where(item => item.CondominioID == filtroCondominioId.Value).ToList();
            }

            // Sort: active first, then by condominio name + address
            items = items
                .OrderBy(item => item.bEliminado ? 1 : 0)
                .ThenBy(item => item.NombreCondominio)
                .ThenBy(item => item.DireccionCasa)
                .ThenBy(item => item.NumeroExtCasa)
                .ToList();

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? items.FirstOrDefault(item => item.CasaID == editId) ?? new CasaFormViewModel { CasaID = editId }
                    : new CasaFormViewModel();
            }

            if (selectedCondominioId.HasValue && form.CondominioID <= 0)
            {
                form.CondominioID = selectedCondominioId.Value;
            }

            return new CasasPageViewModel
            {
                Items = items,
                Form = form,
                CondominioOptions = CotoContext.BuildCondominioOptions(condominios, selectedCondominioId),
                PropietarioOptions = BuildUsuarioOptions(usuarios),
                FiltroCondominioOptions = BuildFiltroCondominioOptions(condominios, filtroCondominioId),
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloActivas = soloActivas,
                FiltroCondominioId = filtroCondominioId,
                TotalActivas = totalActivas,
                PerfilCondominoId = perfilCondomino?.PerfilID,
                NombrePerfilCondomino = perfilCondomino?.Perfil,
                PasswordTemporal = TempData["PasswordTemporal"] as string,
                EmailEnviado = TempData["EmailEnviado"] as string
            };
        }

        private static IReadOnlyList<SelectListItem> BuildFiltroCondominioOptions(
            IReadOnlyList<CondominioFormViewModel> condominios,
            int? selectedId)
        {
            var list = new List<SelectListItem>
            {
                new SelectListItem { Value = "", Text = "Todos los condominios", Selected = !selectedId.HasValue }
            };

            list.AddRange(condominios
                .Where(item => item.CondominioID.HasValue)
                .OrderBy(item => item.NombreCondominio)
                .Select(item => new SelectListItem
                {
                    Value = item.CondominioID!.Value.ToString(),
                    Text = item.NombreCondominio,
                    Selected = item.CondominioID == selectedId
                }));

            return list;
        }

        private static void ApplyDisplayData(
            IEnumerable<CasaFormViewModel> items,
            IReadOnlyList<CondominioFormViewModel> condominios,
            IReadOnlyList<UsuarioLookupViewModel> usuarios)
        {
            var condominioById = condominios
                .Where(item => item.CondominioID.HasValue)
                .ToDictionary(item => item.CondominioID!.Value);

            var usuarioById = usuarios
                .Where(item => item.UsuarioID.HasValue)
                .ToDictionary(item => item.UsuarioID!.Value);

            foreach (var item in items)
            {
                if (item.CondominioID > 0 && condominioById.TryGetValue(item.CondominioID, out var condominio))
                {
                    item.NombreCondominio = condominio.NombreCondominio;
                    item.DireccionCondominio = condominio.DireccionCondominio;
                }

                if (item.PropietarioUsuarioID.HasValue && usuarioById.TryGetValue(item.PropietarioUsuarioID.Value, out var usuario))
                {
                    item.NombrePropietario = usuario.NombreUsuario;
                    item.CorreoPropietario = usuario.CorreoUsuario;
                }
            }
        }

        private static IReadOnlyList<SelectListItem> BuildUsuarioOptions(IEnumerable<UsuarioLookupViewModel> usuarios)
        {
            return usuarios
                .OrderBy(item => item.NombreUsuario)
                .Select(item => new SelectListItem
                {
                    Value = item.UsuarioID?.ToString() ?? string.Empty,
                    Text = string.IsNullOrWhiteSpace(item.CorreoUsuario)
                        ? item.NombreUsuario ?? string.Empty
                        : $"{item.NombreUsuario} - {item.CorreoUsuario}"
                })
                .ToList();
        }

        private static string BuildCondominioLabel(CondominioFormViewModel condominio)
        {
            if (string.IsNullOrWhiteSpace(condominio.DireccionCondominio))
            {
                return condominio.NombreCondominio;
            }

            return $"{condominio.NombreCondominio} - {condominio.DireccionCondominio}";
        }
    }
}