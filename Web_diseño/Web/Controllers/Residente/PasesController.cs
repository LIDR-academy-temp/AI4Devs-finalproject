using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using QRCoder;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Pases")]
    public sealed class PasesController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public PasesController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(bool soloVigentes = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context, soloVigentes);
            return View("~/Views/Residente/Pases/Index.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Guardar([Bind(Prefix = "Form")] PaseQrFormViewModel form, bool soloVigentes = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            NormalizeForm(form, context);
            ValidateResidentForm(form, context);

            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(context, soloVigentes, form);
                invalidPage.Error = "Revisa los campos marcados antes de guardar el pase.";
                return View("~/Views/Residente/Pases/Index.cshtml", invalidPage);
            }

            var isNew = !form.VisitaGeneradaID.HasValue || form.VisitaGeneradaID.Value == 0;

            try
            {
                await _backend.SavePaseQrAsync(form);

                var page = await BuildPageAsync(context, soloVigentes, form);
                page.Message = isNew ? "Pase QR generado." : "Pase QR actualizado.";
                return View("~/Views/Residente/Pases/Index.cshtml", page);
            }
            catch (Exception ex)
            {
                var page = await BuildPageAsync(context, soloVigentes, form);
                page.Error = ex.Message;
                return View("~/Views/Residente/Pases/Index.cshtml", page);
            }
        }

        [HttpPost("Cancelar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Cancelar(int paseQrId, bool soloVigentes = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var items = await LoadResidentPassesAsync(context);
            var target = items.FirstOrDefault(item => item.VisitaGeneradaID == paseQrId);
            if (target is null)
            {
                TempData["Error"] = "Solo puedes cancelar pases ligados a tu vivienda activa.";
                return RedirectToAction(nameof(Index), new { soloVigentes });
            }

            try
            {
                await _backend.DeletePaseQrAsync(paseQrId);
                TempData["Message"] = "Pase QR cancelado.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index), new { soloVigentes });
        }

        private async Task<ResidentPassPageViewModel> BuildPageAsync(
            ResidentPortalContextViewModel context,
            bool soloVigentes,
            PaseQrFormViewModel? formOverride = null)
        {
            var itemsTask = LoadResidentPassesAsync(context);
            var tiposTask = _backend.GetTipoIdentificacionesAsync();

            await Task.WhenAll(itemsTask, tiposTask);

            var items = itemsTask.Result;
            var now = DateTime.Now;

            if (soloVigentes)
            {
                items = items
                    .Where(item => item.bEliminado != true && item.bUsado != true && item.FechaExpira.HasValue && item.FechaExpira.Value > now)
                    .ToList();
            }

            var form = formOverride ?? new PaseQrFormViewModel();
            NormalizeForm(form, context);
            ComposePresentation(form);

            return new ResidentPassPageViewModel
            {
                Context = context,
                Items = items,
                Form = form,
                TipoIdentificacionOptions = BuildTipoIdentificacionOptions(tiposTask.Result),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString(),
                SoloVigentes = soloVigentes,
                PuedeGuardar = tiposTask.Result.Any(),
                TotalVigentes = itemsTask.Result.Count(item => item.EstadoTexto == "Vigente"),
                TotalUsados = itemsTask.Result.Count(item => item.bUsado)
            };
        }

        private async Task<List<PaseQrFormViewModel>> LoadResidentPassesAsync(ResidentPortalContextViewModel context)
        {
            var pasesTask = _backend.GetPasesQrAsync();
            var casasTask = _backend.GetCasasAsync();

            await Task.WhenAll(pasesTask, casasTask);

            var casaById = casasTask.Result
                .Where(item => item.CasaID.HasValue)
                .ToDictionary(item => item.CasaID!.Value);

            var items = pasesTask.Result
                .Select(CloneForPresentation)
                .Where(item => item.UsuarioVisitadoID == context.UsuarioId)
                .Where(item => !context.SelectedCasaId.HasValue || item.CasaID == context.SelectedCasaId.Value)
                .ToList();

            foreach (var item in items)
            {
                if (item.CasaID.HasValue && casaById.TryGetValue(item.CasaID.Value, out var casa))
                {
                    item.DireccionCasa = casa.DireccionCasa;
                    item.NumeroExtCasa = casa.NumeroExtCasa;
                }

                item.NombreVisitado = CotoContext.GetNombreUsuario(User);
                ComposePresentation(item, includeQrImage: false);
            }

            return items
                .OrderBy(item => item.bEliminado ? 3 : item.bUsado ? 2 : item.FechaExpira.HasValue && item.FechaExpira.Value < DateTime.Now ? 1 : 0)
                .ThenBy(item => item.FechaExpira)
                .ToList();
        }

        private void NormalizeForm(PaseQrFormViewModel form, ResidentPortalContextViewModel context)
        {
            form.UsuarioVisitadoID = context.UsuarioId;
            form.NombreVisitado = CotoContext.GetNombreUsuario(User);
            if (context.SelectedCasaId.HasValue)
            {
                form.CasaID = context.SelectedCasaId.Value;
                form.DireccionCasa ??= context.SelectedCasaLabel;
            }

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
            form.bEliminado = false;
            form.bUsado = false;

            if (string.IsNullOrWhiteSpace(form.CodigoQR))
            {
                form.CodigoQR = Guid.NewGuid().ToString("N");
            }
        }

        private void ValidateResidentForm(PaseQrFormViewModel form, ResidentPortalContextViewModel context)
        {
            if (string.IsNullOrWhiteSpace(form.NombreVisitante))
            {
                ModelState.AddModelError("Form.NombreVisitante", "Indica el nombre del visitante.");
            }

            if (form.TipoIdentificacionID <= 0)
            {
                ModelState.AddModelError("Form.TipoIdentificacionID", "Selecciona un tipo de identificación.");
            }

            if (string.IsNullOrWhiteSpace(form.NumeroIdentificacion))
            {
                ModelState.AddModelError("Form.NumeroIdentificacion", "Captura el número de identificación.");
            }

            if (!form.FechaEmision.HasValue)
            {
                ModelState.AddModelError("Form.FechaEmision", "Define cuándo inicia la ventana del pase.");
            }

            if (!form.FechaExpira.HasValue || form.FechaExpira <= form.FechaEmision)
            {
                ModelState.AddModelError("Form.FechaExpira", "La expiración debe ser mayor que la emisión.");
            }

            if (context.SelectedCasaId.HasValue && form.CasaID != context.SelectedCasaId.Value)
            {
                ModelState.AddModelError("Form.CasaID", "El pase debe quedar ligado a la vivienda activa.");
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