using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Visitas")]
    public sealed class VisitasController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;
        private readonly IWebHostEnvironment _env;

        public VisitasController(
            IGraphApiBackendService backend,
            IResidentPortalService residentPortal,
            IWebHostEnvironment env)
        {
            _backend = backend;
            _residentPortal = residentPortal;
            _env = env;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(bool soloProximas = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context, soloProximas);
            return View("~/Views/Residente/Visitas/Index.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Guardar([Bind(Prefix = "Form")] VisitaFormViewModel form, bool soloProximas = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            ForceResidentScope(form, context);

            if (form.DocumentoArchivo is not null && form.DocumentoArchivo.Length > 0)
            {
                var fileValidationError = ValidateDocumentoArchivo(form.DocumentoArchivo);
                if (!string.IsNullOrWhiteSpace(fileValidationError))
                {
                    var invalidPage = await BuildPageAsync(context, soloProximas, form);
                    invalidPage.Error = fileValidationError;
                    return View("~/Views/Residente/Visitas/Index.cshtml", invalidPage);
                }
            }

            ValidateResidentForm(form, context);
            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(context, soloProximas, form);
                invalidPage.Error = "Revisa los campos marcados antes de guardar la visita.";
                return View("~/Views/Residente/Visitas/Index.cshtml", invalidPage);
            }

            string? savedDocumentoPath = null;
            var previousDocumentoPath = form.RutaDocumento;

            try
            {
                if (form.DocumentoArchivo is not null && form.DocumentoArchivo.Length > 0)
                {
                    var savedDocumento = await SaveDocumentoAsync(form.DocumentoArchivo);
                    form.RutaDocumento = savedDocumento.RelativePath;
                    savedDocumentoPath = savedDocumento.FullPath;
                }

                await _backend.SaveVisitaAsync(form);
                TempData["Message"] = form.VisitaID is null or 0 ? "Visita registrada." : "Visita actualizada.";
                return RedirectToAction(nameof(Index), new { soloProximas });
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(savedDocumentoPath) && System.IO.File.Exists(savedDocumentoPath))
                {
                    System.IO.File.Delete(savedDocumentoPath);
                }

                form.RutaDocumento = previousDocumentoPath;
                var errorPage = await BuildPageAsync(context, soloProximas, form);
                errorPage.Error = ex.Message;
                return View("~/Views/Residente/Visitas/Index.cshtml", errorPage);
            }
        }

        [HttpPost("Cancelar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Cancelar(int visitaId, bool soloProximas = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var items = await LoadResidentVisitsAsync(context);
            var visit = items.FirstOrDefault(item => item.VisitaID == visitaId);
            if (visit is null)
            {
                TempData["Error"] = "Solo puedes cancelar visitas ligadas a tu vivienda activa.";
                return RedirectToAction(nameof(Index), new { soloProximas });
            }

            try
            {
                await _backend.DeleteVisitaAsync(visitaId);
                TempData["Message"] = "Visita cancelada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index), new { soloProximas });
        }

        private async Task<ResidentVisitPageViewModel> BuildPageAsync(
            ResidentPortalContextViewModel context,
            bool soloProximas,
            VisitaFormViewModel? formOverride = null)
        {
            var visitasTask = LoadResidentVisitsAsync(context);
            var tiposTask = _backend.GetTipoIdentificacionesAsync();

            await Task.WhenAll(visitasTask, tiposTask);

            var items = visitasTask.Result;
            if (soloProximas)
            {
                items = items
                    .Where(item => item.EstadoTemporal == "Programada" || item.EstadoTemporal == "Activa")
                    .ToList();
            }

            items = items
                .OrderBy(item => item.EstadoTemporal switch
                {
                    "Activa" => 0,
                    "Programada" => 1,
                    "Finalizada" => 2,
                    _ => 3
                })
                .ThenBy(item => item.EstadoTemporal == "Programada" ? item.FechaEntrada : default)
                .ThenByDescending(item => item.FechaEntrada)
                .ToList();

            var form = formOverride ?? new VisitaFormViewModel
            {
                UsuarioVisitadoID = context.UsuarioId,
                CasaID = context.SelectedCasaId,
                FechaEntrada = RoundUpToHour(DateTime.Now.AddHours(1)),
                FechaSalida = RoundUpToHour(DateTime.Now.AddHours(3)),
                Autorizado = true
            };

            ForceResidentScope(form, context);
            if (string.IsNullOrWhiteSpace(form.UsuarioVisitadoNombre))
            {
                form.UsuarioVisitadoNombre = CotoContext.GetNombreUsuario(User);
            }

            return new ResidentVisitPageViewModel
            {
                Context = context,
                Items = items,
                Form = form,
                TipoIdentificacionOptions = BuildTipoIdentificacionOptions(tiposTask.Result),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString(),
                SoloProximas = soloProximas,
                PuedeGuardar = tiposTask.Result.Any(),
                TotalVisitas = visitasTask.Result.Count,
                TotalProximas = visitasTask.Result.Count(item => item.EstadoTemporal == "Programada"),
                TotalActivas = visitasTask.Result.Count(item => item.EstadoTemporal == "Activa")
            };
        }

        private async Task<List<VisitaFormViewModel>> LoadResidentVisitsAsync(ResidentPortalContextViewModel context)
        {
            var casasTask = _backend.GetCasasAsync();
            var visitasTask = _backend.GetVisitasAsync();
            var tiposTask = _backend.GetTipoIdentificacionesAsync();

            await Task.WhenAll(casasTask, visitasTask, tiposTask);

            var casas = casasTask.Result.ToList();
            var tipos = tiposTask.Result.ToList();

            var items = visitasTask.Result
                .Where(item => item.UsuarioVisitadoID == context.UsuarioId)
                .Where(item => !context.SelectedCasaId.HasValue || item.CasaID == context.SelectedCasaId.Value)
                .ToList();

            ApplyDisplayData(items, casas, tipos, CotoContext.GetNombreUsuario(User));
            ApplyTemporalState(items);
            return items;
        }

        private void ForceResidentScope(VisitaFormViewModel form, ResidentPortalContextViewModel context)
        {
            form.UsuarioVisitadoID = context.UsuarioId;
            if (context.SelectedCasaId.HasValue)
            {
                form.CasaID = context.SelectedCasaId.Value;
            }

            form.Autorizado = true;
            form.bEliminado = false;
            form.UsuarioVisitadoNombre = CotoContext.GetNombreUsuario(User);
        }

        private void ValidateResidentForm(VisitaFormViewModel form, ResidentPortalContextViewModel context)
        {
            if (string.IsNullOrWhiteSpace(form.VisitanteNombre))
            {
                ModelState.AddModelError("Form.VisitanteNombre", "Indica el nombre del visitante.");
            }

            if (form.TipoIdentificacionID <= 0)
            {
                ModelState.AddModelError("Form.TipoIdentificacionID", "Selecciona un tipo de identificación.");
            }

            if (string.IsNullOrWhiteSpace(form.NumeroIdentificacion))
            {
                ModelState.AddModelError("Form.NumeroIdentificacion", "Captura el número de identificación.");
            }

            if (form.FechaEntrada <= DateTime.Now.AddMinutes(-1))
            {
                ModelState.AddModelError("Form.FechaEntrada", "La visita debe iniciar en una fecha futura.");
            }

            if (form.FechaSalida.HasValue && form.FechaSalida <= form.FechaEntrada)
            {
                ModelState.AddModelError("Form.FechaSalida", "La fecha de salida debe ser mayor que la entrada.");
            }

            if (context.SelectedCasaId.HasValue && form.CasaID != context.SelectedCasaId.Value)
            {
                ModelState.AddModelError("Form.CasaID", "La visita debe quedar ligada a la vivienda activa.");
            }
        }

        private static void ApplyTemporalState(IEnumerable<VisitaFormViewModel> items)
        {
            var now = DateTime.Now;
            foreach (var item in items)
            {
                if (item.bEliminado)
                {
                    item.EstadoTemporal = "Eliminada";
                    item.EstadoTemporalClase = "badge-danger";
                }
                else if (item.FechaEntrada > now)
                {
                    item.EstadoTemporal = "Programada";
                    item.EstadoTemporalClase = "badge-info";
                }
                else if (item.FechaSalida == null || item.FechaSalida > now)
                {
                    item.EstadoTemporal = "Activa";
                    item.EstadoTemporalClase = "badge-success";
                }
                else
                {
                    item.EstadoTemporal = "Finalizada";
                    item.EstadoTemporalClase = "badge-secondary";
                }
            }
        }

        private static void ApplyDisplayData(
            IEnumerable<VisitaFormViewModel> items,
            IReadOnlyList<CasaFormViewModel> casas,
            IReadOnlyList<TipoIdentificacionLookupViewModel> tipos,
            string currentUserName)
        {
            var casaById = casas.Where(item => item.CasaID.HasValue).ToDictionary(item => item.CasaID!.Value);
            var tipoById = tipos.Where(item => item.TipoIdentificacionID.HasValue).ToDictionary(item => item.TipoIdentificacionID!.Value);

            foreach (var item in items)
            {
                item.UsuarioVisitadoNombre = currentUserName;

                if (item.CasaID.HasValue && casaById.TryGetValue(item.CasaID.Value, out var casa))
                {
                    item.CasaDescripcion = BuildCasaLabel(casa);
                }

                if (item.TipoIdentificacionID > 0 && tipoById.TryGetValue(item.TipoIdentificacionID, out var tipo))
                {
                    item.TipoIdentificacionNombre = tipo.TipoIdentificacion;
                }
            }
        }

        private static IReadOnlyList<SelectListItem> BuildTipoIdentificacionOptions(IEnumerable<TipoIdentificacionLookupViewModel> tipos)
        {
            return tipos
                .OrderBy(item => item.TipoIdentificacion)
                .Select(item => new SelectListItem
                {
                    Value = item.TipoIdentificacionID?.ToString() ?? string.Empty,
                    Text = item.TipoIdentificacion ?? string.Empty
                })
                .ToList();
        }

        private static string BuildCasaLabel(CasaFormViewModel casa)
        {
            var parts = new List<string>();

            if (!string.IsNullOrWhiteSpace(casa.NombreCondominio))
            {
                parts.Add(casa.NombreCondominio);
            }

            var addressParts = new[] { casa.DireccionCasa, casa.NumeroExtCasa }
                .Where(part => !string.IsNullOrWhiteSpace(part));

            var address = string.Join(" ", addressParts);
            if (!string.IsNullOrWhiteSpace(address))
            {
                parts.Add(address);
            }

            return parts.Count == 0 ? $"Casa {casa.CasaID}" : string.Join(" | ", parts);
        }

        private string ValidateDocumentoArchivo(IFormFile archivo)
        {
            if (string.IsNullOrWhiteSpace(_env.WebRootPath))
            {
                return "No se pudo resolver la carpeta web para guardar el documento.";
            }

            var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png" };
            var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                return "Tipo de archivo no permitido.";
            }

            if (archivo.Length > 20 * 1024 * 1024)
            {
                return "El documento excede el límite de 20 MB.";
            }

            return string.Empty;
        }

        private async Task<(string RelativePath, string FullPath)> SaveDocumentoAsync(IFormFile archivo)
        {
            var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();
            var visitasFolder = Path.Combine(_env.WebRootPath!, "uploads", "visitas");
            Directory.CreateDirectory(visitasFolder);

            var safeName = $"{Guid.NewGuid():N}{extension}";
            var relativePath = Path.Combine("uploads", "visitas", safeName).Replace("\\", "/");
            var fullPath = Path.Combine(_env.WebRootPath!, relativePath);

            await using (var stream = System.IO.File.Create(fullPath))
            {
                await archivo.CopyToAsync(stream);
            }

            return (relativePath, fullPath);
        }

        private static DateTime RoundUpToHour(DateTime value)
        {
            var minutes = value.Minute == 0 && value.Second == 0 ? 0 : 60 - value.Minute;
            return new DateTime(value.Year, value.Month, value.Day, value.Hour, 0, 0, value.Kind).AddMinutes(minutes);
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