using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using QRCoder;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/Pase-QR")]
    [RequireMenuAccess("Gestion/Pase-QR")]
    public class PaseQrController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public PaseQrController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, bool soloVigentes = false)
        {
            var model = await BuildPageAsync(editId, soloVigentes: soloVigentes);
            return View("~/Views/Catalogos/PaseQr.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(PaseQrFormViewModel form)
        {
            NormalizeForm(form);

            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(formOverride: form);
                invalidPage.Error = "Revisa los campos marcados antes de guardar.";
                return View("~/Views/Catalogos/PaseQr.cshtml", invalidPage);
            }

            var isNew = !form.VisitaGeneradaID.HasValue || form.VisitaGeneradaID.Value == 0;

            try
            {
                await _backend.SavePaseQrAsync(form);

                var page = await BuildPageAsync(formOverride: form);
                page.Message = isNew ? "Pase QR generado." : "Pase QR actualizado.";
                return View("~/Views/Catalogos/PaseQr.cshtml", page);
            }
            catch (Exception ex)
            {
                var page = await BuildPageAsync(formOverride: form);
                page.Error = ex.Message;
                return View("~/Views/Catalogos/PaseQr.cshtml", page);
            }
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int paseQrId)
        {
            try
            {
                await _backend.DeletePaseQrAsync(paseQrId);
                TempData["Message"] = "Pase QR eliminado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        [AllowAnonymous]
        [HttpGet("Validar/{codigo?}")]
        public async Task<IActionResult> Validar(string? codigo = null)
        {
            var normalizedCodigo = NormalizeValidationCode(codigo);
            var pase = await _backend.GetPaseQrByCodeAsync(normalizedCodigo);
            var model = BuildValidationModel(normalizedCodigo, pase);
            return View("~/Views/Catalogos/PaseQrValidar.cshtml", model);
        }

        private async Task<PaseQrPageViewModel> BuildPageAsync(int? editId = null, PaseQrFormViewModel? formOverride = null, bool soloVigentes = false)
        {
            var selectedCondominioId = CotoContext.GetSelectedCondominioId(User);
            var pasesTask = _backend.GetPasesQrAsync();
            var casasTask = _backend.GetCasasAsync();
            var usuariosTask = _backend.GetUsuariosAsync();
            var tiposTask = _backend.GetTipoIdentificacionesAsync();

            await Task.WhenAll(pasesTask, casasTask, usuariosTask, tiposTask);

            var items = pasesTask.Result
                .Select(CloneForPresentation)
                .ToList();

            var casas = CotoContext.FilterCasas(casasTask.Result, selectedCondominioId).ToList();

            if (selectedCondominioId.HasValue)
            {
                var casaIds = CotoContext.GetCasaIdsForSelectedCondominio(casasTask.Result, selectedCondominioId);
                items = items
                    .Where(item => item.CasaID.HasValue && casaIds.Contains(item.CasaID.Value))
                    .ToList();
            }

            foreach (var item in items)
            {
                ComposePresentation(item, includeQrImage: false);
            }

            var now = DateTime.Now;
            int totalVigentes = items.Count(item =>
                item.bEliminado != true &&
                item.bUsado != true &&
                item.FechaExpira.HasValue &&
                item.FechaExpira.Value > now);

            int totalUsados = items.Count(item => item.bUsado == true);

            // sort: vigentes first (by expiry asc), then vencidos/usados/eliminados
            items = items
                .OrderBy(item => item.bEliminado ? 3 : item.bUsado == true ? 2 : item.FechaExpira.HasValue && item.FechaExpira.Value < now ? 1 : 0)
                .ThenBy(item => item.FechaExpira)
                .ToList();

            if (soloVigentes)
            {
                items = items
                    .Where(item =>
                        item.bEliminado != true &&
                        item.bUsado != true &&
                        item.FechaExpira.HasValue &&
                        item.FechaExpira.Value > now)
                    .ToList();
            }

            var form = formOverride;
            if (form is null)
            {
                form = editId.HasValue
                    ? items.FirstOrDefault(item => item.VisitaGeneradaID == editId) ?? new PaseQrFormViewModel { VisitaGeneradaID = editId }
                    : new PaseQrFormViewModel();
            }

            if (form.FechaEmision is null || form.FechaEmision.Value.Year < 2000)
            {
                form.FechaEmision = DateTime.Now;
            }

            if (form.FechaExpira is null || form.FechaExpira.Value <= form.FechaEmision.Value)
            {
                form.FechaExpira = form.FechaEmision.Value.AddMinutes(form.DuracionMinutos > 0 ? form.DuracionMinutos : 240);
            }

            form.DuracionMinutos = ResolveDurationMinutes(form.FechaEmision, form.FechaExpira);

            ComposePresentation(form);

            return new PaseQrPageViewModel
            {
                Items = items,
                Form = form,
                CasaOptions = BuildCasaOptions(casas),
                UsuarioOptions = BuildUsuarioOptions(usuariosTask.Result),
                TipoIdentificacionOptions = BuildTipoIdentificacionOptions(tiposTask.Result),
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                SoloVigentes = soloVigentes,
                TotalVigentes = totalVigentes,
                TotalUsados = totalUsados
            };
        }

        private PaseQrValidationViewModel BuildValidationModel(string? codigo, PaseQrFormViewModel? pase)
        {
            var validationModel = new PaseQrValidationViewModel
            {
                Codigo = codigo ?? string.Empty,
                Pase = pase
            };

            if (string.IsNullOrWhiteSpace(codigo))
            {
                validationModel.StatusTitulo = "Valida un pase QR";
                validationModel.StatusMensaje = "Escanea el código o escribe el token para revisar si sigue vigente.";
                validationModel.StatusClase = "cq-qr-public--neutral";
                return validationModel;
            }

            if (pase is null)
            {
                validationModel.StatusTitulo = "QR no válido";
                validationModel.StatusMensaje = "No encontramos un pase con ese código.";
                validationModel.StatusClase = "cq-qr-public--invalid";
                validationModel.NotFound = true;
                return validationModel;
            }

            ComposePresentation(pase, includeQrImage: false);
            validationModel.ValidationUrl = pase.ValidationUrl;
            validationModel.WhatsAppUrl = pase.WhatsAppUrl;

            var now = DateTime.Now;
            validationModel.IsDeleted = pase.bEliminado;
            validationModel.IsUsed = pase.bUsado;
            validationModel.IsExpired = pase.FechaExpira.HasValue && pase.FechaExpira.Value < now;

            if (validationModel.IsDeleted)
            {
                validationModel.StatusTitulo = "QR eliminado";
                validationModel.StatusMensaje = "Este pase ya fue dado de baja y no debe usarse.";
                validationModel.StatusClase = "cq-qr-public--invalid";
            }
            else if (validationModel.IsUsed)
            {
                validationModel.StatusTitulo = "QR ya usado";
                validationModel.StatusMensaje = "Este pase ya fue registrado como utilizado.";
                validationModel.StatusClase = "cq-qr-public--warning";
            }
            else if (validationModel.IsExpired)
            {
                validationModel.StatusTitulo = "QR vencido";
                validationModel.StatusMensaje = "La ventana de acceso ya expiró.";
                validationModel.StatusClase = "cq-qr-public--invalid";
            }
            else
            {
                validationModel.IsValid = true;
                validationModel.StatusTitulo = "Pase válido";
                validationModel.StatusMensaje = "El pase está vigente y puede usarse.";
                validationModel.StatusClase = "cq-qr-public--valid";
            }

            return validationModel;
        }

        private static string NormalizeValidationCode(string? codigo)
        {
            if (string.IsNullOrWhiteSpace(codigo))
            {
                return string.Empty;
            }

            var value = Uri.UnescapeDataString(codigo.Trim());

            if (Uri.TryCreate(value, UriKind.Absolute, out var absoluteUri))
            {
                if (absoluteUri.AbsolutePath.Contains("Validar", StringComparison.OrdinalIgnoreCase))
                {
                    var queryCode = TryGetQueryValue(absoluteUri.Query, "codigo") ?? TryGetQueryValue(absoluteUri.Query, "code");
                    if (!string.IsNullOrWhiteSpace(queryCode))
                    {
                        return queryCode;
                    }

                    var pathCode = TryExtractCodeFromPath(absoluteUri.AbsolutePath);
                    if (!string.IsNullOrWhiteSpace(pathCode))
                    {
                        return pathCode;
                    }
                }

                return value;
            }

            if (value.Contains('/'))
            {
                var questionMarkIndex = value.IndexOf('?', StringComparison.Ordinal);
                var pathPart = questionMarkIndex >= 0 ? value[..questionMarkIndex] : value;
                var queryPart = questionMarkIndex >= 0 ? value[(questionMarkIndex + 1)..] : string.Empty;

                if (pathPart.Contains("Validar", StringComparison.OrdinalIgnoreCase))
                {
                    var queryCode = TryGetQueryValue(queryPart, "codigo") ?? TryGetQueryValue(queryPart, "code");
                    if (!string.IsNullOrWhiteSpace(queryCode))
                    {
                        return queryCode;
                    }

                    var pathCode = TryExtractCodeFromPath(pathPart);
                    if (!string.IsNullOrWhiteSpace(pathCode))
                    {
                        return pathCode;
                    }
                }
            }

            return value;
        }

        private static string TryExtractCodeFromPath(string path)
        {
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            for (var index = 0; index < segments.Length; index++)
            {
                if (segments[index].Equals("Validar", StringComparison.OrdinalIgnoreCase))
                {
                    return index + 1 < segments.Length
                        ? Uri.UnescapeDataString(segments[index + 1])
                        : string.Empty;
                }
            }

            return string.Empty;
        }

        private static string? TryGetQueryValue(string query, string key)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return null;
            }

            var trimmedQuery = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmedQuery))
            {
                return null;
            }

            foreach (var pair in trimmedQuery.Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var parts = pair.Split('=', 2);
                if (!parts[0].Equals(key, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty;
            }

            return null;
        }

        private void NormalizeForm(PaseQrFormViewModel form)
        {
            var fechaEmision = form.FechaEmision.HasValue && form.FechaEmision.Value.Year >= 2000
                ? form.FechaEmision.Value
                : DateTime.Now;

            var duration = form.DuracionMinutos > 0 ? form.DuracionMinutos : 240;
            var fechaExpira = form.FechaExpira.HasValue && form.FechaExpira.Value > fechaEmision
                ? form.FechaExpira.Value
                : fechaEmision.AddMinutes(duration);

            form.FechaEmision = fechaEmision;
            form.FechaExpira = fechaExpira;
            form.DuracionMinutos = ResolveDurationMinutes(form.FechaEmision, form.FechaExpira);

            if (string.IsNullOrWhiteSpace(form.CodigoQR))
            {
                form.CodigoQR = Guid.NewGuid().ToString("N");
            }
        }

        private void ComposePresentation(PaseQrFormViewModel form, bool includeQrImage = true)
        {
            form.DuracionMinutos = ResolveDurationMinutes(form.FechaEmision, form.FechaExpira);

            if (!string.IsNullOrWhiteSpace(form.CodigoQR))
            {
                form.ValidationUrl = BuildValidationUrl(form.CodigoQR);
                form.QrImageDataUrl = includeQrImage ? BuildQrImageDataUrl(form.ValidationUrl) : string.Empty;
                form.WhatsAppUrl = BuildWhatsAppUrl(form, form.ValidationUrl);
            }

            if (form.bEliminado)
            {
                form.EstadoTexto = "Eliminado";
                form.EstadoClase = "badge-secondary";
            }
            else if (form.bUsado)
            {
                form.EstadoTexto = "Usado";
                form.EstadoClase = "badge-warning";
            }
            else if (form.FechaExpira.HasValue && form.FechaExpira.Value < DateTime.Now)
            {
                form.EstadoTexto = "Vencido";
                form.EstadoClase = "badge-danger";
            }
            else
            {
                form.EstadoTexto = "Vigente";
                form.EstadoClase = "badge-success";
            }
        }

        private string BuildValidationUrl(string codigoQr)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return $"{baseUrl}/Gestion/Pase-QR/Validar/{Uri.EscapeDataString(codigoQr)}";
        }

        private static string BuildQrImageDataUrl(string? validationUrl)
        {
            if (string.IsNullOrWhiteSpace(validationUrl))
            {
                return string.Empty;
            }

            using var qrGenerator = new QRCodeGenerator();
            using var qrData = qrGenerator.CreateQrCode(validationUrl, QRCodeGenerator.ECCLevel.Q);
            var png = new PngByteQRCode(qrData);
            var bytes = png.GetGraphic(20);
            return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
        }

        private static string BuildWhatsAppUrl(PaseQrFormViewModel form, string validationUrl)
        {
            var parts = new List<string>
            {
                "Pase QR residencial",
                $"Visitante: {form.NombreVisitante}",
                !string.IsNullOrWhiteSpace(form.NombreVisitado) ? $"Vecino: {form.NombreVisitado}" : string.Empty,
                !string.IsNullOrWhiteSpace(form.DireccionCasa) ? $"Casa: {form.DireccionCasa} {form.NumeroExtCasa}".Trim() : string.Empty,
                form.FechaExpira.HasValue ? $"Vence: {form.FechaExpira:dd/MM/yyyy HH:mm}" : string.Empty,
                $"Validar: {validationUrl}"
            }
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToList();

            var message = string.Join(Environment.NewLine, parts);
            return $"https://wa.me/?text={Uri.EscapeDataString(message)}";
        }

        private static int ResolveDurationMinutes(DateTime? fechaEmision, DateTime? fechaExpira)
        {
            if (!fechaEmision.HasValue || !fechaExpira.HasValue)
            {
                return 240;
            }

            var totalMinutes = (int)Math.Round((fechaExpira.Value - fechaEmision.Value).TotalMinutes);
            return totalMinutes > 0 ? totalMinutes : 240;
        }

        private static PaseQrFormViewModel CloneForPresentation(PaseQrFormViewModel source)
        {
            return new PaseQrFormViewModel
            {
                VisitaGeneradaID = source.VisitaGeneradaID,
                NombreVisitante = source.NombreVisitante,
                UsuarioVisitadoID = source.UsuarioVisitadoID,
                NombreVisitado = source.NombreVisitado,
                CorreoVisitado = source.CorreoVisitado,
                CasaID = source.CasaID,
                DireccionCasa = source.DireccionCasa,
                NumeroExtCasa = source.NumeroExtCasa,
                TipoIdentificacionID = source.TipoIdentificacionID,
                TipoIdentificacion = source.TipoIdentificacion,
                NumeroIdentificacion = source.NumeroIdentificacion,
                RutaDocumento = source.RutaDocumento,
                CodigoQR = source.CodigoQR,
                FechaEmision = source.FechaEmision,
                FechaExpira = source.FechaExpira,
                bUsado = source.bUsado,
                bEliminado = source.bEliminado,
                DuracionMinutos = source.DuracionMinutos
            };
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
    }
}