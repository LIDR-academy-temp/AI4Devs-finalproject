using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/Visitas")]
    [RequireMenuAccess("Gestion/Visitas")]
    public class VisitasController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IWebHostEnvironment _env;

        public VisitasController(IGraphApiBackendService backend, IWebHostEnvironment env)
        {
            _backend = backend;
            _env = env;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloProximas = false)
        {
            var model = await BuildPageAsync(editId, soloProximas: soloProximas);
            return View("~/Views/Catalogos/Visitas.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(VisitaFormViewModel form)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Catalogos/Visitas.cshtml", await BuildPageAsync(formOverride: form));
            }

            if (form.DocumentoArchivo is not null && form.DocumentoArchivo.Length > 0)
            {
                var fileValidationError = ValidateDocumentoArchivo(form.DocumentoArchivo);
                if (!string.IsNullOrWhiteSpace(fileValidationError))
                {
                    var invalidPage = await BuildPageAsync(formOverride: form);
                    invalidPage.Error = fileValidationError;
                    return View("~/Views/Catalogos/Visitas.cshtml", invalidPage);
                }
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
                TempData["Message"] = form.VisitaID is null or 0 ? "Visita creada." : "Visita actualizada.";
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(savedDocumentoPath) && System.IO.File.Exists(savedDocumentoPath))
                {
                    System.IO.File.Delete(savedDocumentoPath);
                }

                form.RutaDocumento = previousDocumentoPath;
                var errorPage = await BuildPageAsync(formOverride: form);
                errorPage.Error = ex.Message;
                return View("~/Views/Catalogos/Visitas.cshtml", errorPage);
            }
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int visitaId)
        {
            try
            {
                await _backend.DeleteVisitaAsync(visitaId);
                TempData["Message"] = "Visita eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<VisitasPageViewModel> BuildPageAsync(int? editId = null, VisitaFormViewModel? formOverride = null, bool soloProximas = false)
        {
            var selectedCondominioId = CotoContext.GetSelectedCondominioId(User);
            var visitasTask = _backend.GetVisitasAsync();
            var casasTask = _backend.GetCasasAsync();
            var usuariosTask = _backend.GetUsuariosAsync();
            var tiposTask = _backend.GetTipoIdentificacionesAsync();

            await Task.WhenAll(visitasTask, casasTask, usuariosTask, tiposTask);

            var casas = CotoContext.FilterCasas(casasTask.Result, selectedCondominioId).ToList();
            var items = visitasTask.Result.ToList();
            var usuarios = usuariosTask.Result.ToList();
            var tipos = tiposTask.Result.ToList();

            if (selectedCondominioId.HasValue)
            {
                var casaIds = CotoContext.GetCasaIdsForSelectedCondominio(casasTask.Result, selectedCondominioId);
                items = items
                    .Where(item => item.CasaID.HasValue && casaIds.Contains(item.CasaID.Value))
                    .ToList();
            }

            ApplyDisplayData(items, casas, usuarios, tipos);
            ApplyTemporalState(items);

            if (soloProximas)
            {
                items = items
                    .Where(item => item.EstadoTemporal == "Programada" || item.EstadoTemporal == "Activa")
                    .ToList();
            }

            // Sort: upcoming soonest first, then active, then finalizada most recent
            items = items
                .OrderBy(item => item.EstadoTemporal switch
                {
                    "Activa"      => 0,
                    "Programada"  => 1,
                    "Finalizada"  => 2,
                    _             => 3
                })
                .ThenBy(item => item.EstadoTemporal == "Programada" ? item.FechaEntrada : default)
                .ThenByDescending(item => item.FechaEntrada)
                .ToList();

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? items.FirstOrDefault(item => item.VisitaID == editId) ?? new VisitaFormViewModel { VisitaID = editId }
                    : new VisitaFormViewModel();
            }

            return new VisitasPageViewModel
            {
                Items = items,
                Form = form,
                CasaOptions = BuildCasaOptions(casas),
                UsuarioOptions = BuildUsuarioOptions(usuarios),
                TipoIdentificacionOptions = BuildTipoIdentificacionOptions(tipos),
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloProximas = soloProximas
            };
        }

        private static void ApplyTemporalState(IEnumerable<VisitaFormViewModel> items)
        {
            var now = DateTime.Now;
            foreach (var item in items)
            {
                if (item.bEliminado)
                {
                    item.EstadoTemporal      = "Eliminada";
                    item.EstadoTemporalClase = "badge-danger";
                }
                else if (item.FechaEntrada > now)
                {
                    item.EstadoTemporal      = "Programada";
                    item.EstadoTemporalClase = "badge-info";
                }
                else if (item.FechaSalida == null || item.FechaSalida > now)
                {
                    item.EstadoTemporal      = "Activa";
                    item.EstadoTemporalClase = "badge-success";
                }
                else
                {
                    item.EstadoTemporal      = "Finalizada";
                    item.EstadoTemporalClase = "badge-secondary";
                }
            }
        }

        private static void ApplyDisplayData(
            IEnumerable<VisitaFormViewModel> items,
            IReadOnlyList<CasaFormViewModel> casas,
            IReadOnlyList<UsuarioLookupViewModel> usuarios,
            IReadOnlyList<TipoIdentificacionLookupViewModel> tipos)
        {
            var casaById = casas
                .Where(item => item.CasaID.HasValue)
                .ToDictionary(item => item.CasaID!.Value);

            var usuarioById = usuarios
                .Where(item => item.UsuarioID.HasValue)
                .ToDictionary(item => item.UsuarioID!.Value);

            var tipoById = tipos
                .Where(item => item.TipoIdentificacionID.HasValue)
                .ToDictionary(item => item.TipoIdentificacionID!.Value);

            foreach (var item in items)
            {
                if (item.UsuarioVisitadoID > 0 && usuarioById.TryGetValue(item.UsuarioVisitadoID, out var usuario))
                {
                    item.UsuarioVisitadoNombre = usuario.DisplayText;
                }

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

        private static IReadOnlyList<SelectListItem> BuildCasaOptions(IEnumerable<CasaFormViewModel> casas)
        {
            return casas
                .Where(item => item.CasaID.HasValue)
                .OrderBy(item => item.NombreCondominio)
                .ThenBy(item => item.DireccionCasa)
                .Select(item => new SelectListItem
                {
                    Value = item.CasaID?.ToString() ?? string.Empty,
                    Text = BuildCasaLabel(item)
                })
                .ToList();
        }

        private static IReadOnlyList<SelectListItem> BuildUsuarioOptions(IEnumerable<UsuarioLookupViewModel> usuarios)
        {
            return usuarios
                .OrderBy(item => item.NombreUsuario)
                .Select(item => new SelectListItem
                {
                    Value = item.UsuarioID?.ToString() ?? string.Empty,
                    Text = item.DisplayText
                })
                .ToList();
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

            if (!string.IsNullOrWhiteSpace(casa.NombrePropietario))
            {
                parts.Add($"Prop. {casa.NombrePropietario}");
            }

            return parts.Count == 0
                ? $"Casa {casa.CasaID}"
                : string.Join(" | ", parts);
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
    }
}