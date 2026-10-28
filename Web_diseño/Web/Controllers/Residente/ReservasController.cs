using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Reservas")]
    public sealed class ReservasController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public ReservasController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(bool soloProximas = false, int? areaId = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context, soloProximas, areaId);
            return View("~/Views/Residente/Reservas/Index.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Guardar(
            [Bind(Prefix = "Form")] ReservaAmenidadFormViewModel form,
            bool soloProximas = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var snapshot = await LoadSnapshotAsync(context);
            NormalizeForm(form);
            form.UsuarioID = context.UsuarioId;
            if (form.ReservacionEstadoID <= 0)
            {
                form.ReservacionEstadoID = ResolveDefaultEstadoId(snapshot.Estados);
            }

            ApplyLookups(form, snapshot.Areas, snapshot.Estados, CotoContext.GetNombreUsuario(User), User.FindFirstValue(ClaimTypes.Name));
            ComposePresentation(form, snapshot.AllReservations);
            ValidateForm(form, snapshot.Areas, snapshot.Estados);

            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(context, soloProximas, form.AreasComunesID > 0 ? form.AreasComunesID : null, form);
                invalidPage.Error = "Revisa los campos marcados antes de guardar la reserva.";
                return View("~/Views/Residente/Reservas/Index.cshtml", invalidPage);
            }

            try
            {
                await _backend.SaveReservaAmenidadAsync(form);
                TempData["Message"] = "Reserva registrada.";
                return RedirectToAction(nameof(Index), new { soloProximas });
            }
            catch (Exception ex)
            {
                var page = await BuildPageAsync(context, soloProximas, form.AreasComunesID > 0 ? form.AreasComunesID : null, form);
                page.Error = ex.Message;
                return View("~/Views/Residente/Reservas/Index.cshtml", page);
            }
        }

        [HttpPost("Cancelar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Cancelar(int reservacionAreaId, bool soloProximas = false)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var snapshot = await LoadSnapshotAsync(context);
            var target = snapshot.UserReservations.FirstOrDefault(item => item.ReservacionAreaID == reservacionAreaId);
            if (target is null)
            {
                TempData["Error"] = "Solo puedes cancelar reservas ligadas a tu usuario residente.";
                return RedirectToAction(nameof(Index), new { soloProximas });
            }

            try
            {
                var cancelStateId = ResolveCancelStateId(snapshot.Estados);
                if (cancelStateId > 0)
                {
                    var updated = CloneForEdit(target);
                    updated.ReservacionEstadoID = cancelStateId;
                    updated.UsuarioID = context.UsuarioId;
                    updated.bEliminado = false;
                    await _backend.SaveReservaAmenidadAsync(updated);
                }
                else
                {
                    await _backend.DeleteReservaAmenidadAsync(reservacionAreaId);
                }

                TempData["Message"] = "Reserva cancelada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index), new { soloProximas });
        }

        private async Task<ResidentReservationPageViewModel> BuildPageAsync(
            ResidentPortalContextViewModel context,
            bool soloProximas,
            int? areaId = null,
            ReservaAmenidadFormViewModel? formOverride = null)
        {
            var snapshot = await LoadSnapshotAsync(context);
            var now = DateTime.Now;

            var items = snapshot.UserReservations
                .OrderBy(item => item.FechaFin < now ? 1 : 0)
                .ThenBy(item => item.FechaInicio)
                .ToList();

            if (soloProximas)
            {
                items = items.Where(item => item.FechaFin >= now).ToList();
            }

            var form = formOverride ?? new ReservaAmenidadFormViewModel
            {
                UsuarioID = context.UsuarioId,
                FechaInicio = RoundUpToSlot(DateTime.Now.AddHours(1), 30),
                FechaFin = RoundUpToSlot(DateTime.Now.AddHours(3), 30),
                ReservacionEstadoID = ResolveDefaultEstadoId(snapshot.Estados)
            };

            if (form.AreasComunesID <= 0 && areaId.HasValue)
            {
                form.AreasComunesID = areaId.Value;
            }

            if (form.AreasComunesID <= 0 && snapshot.Areas.Count == 1)
            {
                form.AreasComunesID = snapshot.Areas[0].AreasComunesID ?? 0;
            }

            ApplyLookups(form, snapshot.Areas, snapshot.Estados, CotoContext.GetNombreUsuario(User), User.FindFirstValue(ClaimTypes.Name));
            ComposePresentation(form, snapshot.AllReservations);

            return new ResidentReservationPageViewModel
            {
                Context = context,
                Items = items,
                Form = form,
                AreasOptions = BuildAreaOptions(snapshot.Areas, form.AreasComunesID),
                EstadoOptions = BuildEstadoOptions(snapshot.Estados, form.ReservacionEstadoID),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString(),
                Warning = BuildWarning(snapshot.Areas, snapshot.Estados),
                PuedeGuardar = snapshot.Areas.Count > 0 && snapshot.Estados.Count > 0,
                SoloProximas = soloProximas,
                TotalAmenidades = snapshot.Areas.Count,
                TotalReservas = snapshot.UserReservations.Count,
                TotalProximas = snapshot.UserReservations.Count(item => item.FechaFin >= now),
                TotalEnCurso = snapshot.UserReservations.Count(item => item.FechaInicio <= now && item.FechaFin >= now)
            };
        }

        private async Task<ReservationSnapshot> LoadSnapshotAsync(ResidentPortalContextViewModel context)
        {
            var reservasTask = _backend.GetReservasAmenidadesAsync();
            var areasTask = _backend.GetAreasComunesAsync();
            var estadosTask = _backend.GetReservacionEstadosAsync();

            await Task.WhenAll(reservasTask, areasTask, estadosTask);

            var allReservations = reservasTask.Result
                .Where(item => item.bEliminado != true)
                .Select(CloneForEdit)
                .ToList();

            var areas = areasTask.Result
                .Where(item => item.AreasComunesID.HasValue && item.bEliminado != true && item.RequiereReservacion)
                .OrderBy(item => item.AreasComunes)
                .ToList();

            var estados = estadosTask.Result
                .Where(item => item.ReservacionEstadoID > 0 && item.bEliminado != true)
                .OrderBy(item => GetEstadoSortKey(item.ReservacionEstado))
                .ThenBy(item => item.ReservacionEstadoID)
                .ToList();

            var userReservations = allReservations
                .Where(item => item.UsuarioID == context.UsuarioId)
                .ToList();

            ComposePresentation(userReservations, allReservations);

            return new ReservationSnapshot(allReservations, userReservations, areas, estados);
        }

        private void NormalizeForm(ReservaAmenidadFormViewModel form)
        {
            if (form.FechaInicio == default)
            {
                form.FechaInicio = RoundUpToSlot(DateTime.Now.AddHours(1), 30);
            }

            if (form.FechaFin == default)
            {
                form.FechaFin = form.FechaInicio.AddHours(2);
            }
        }

        private void ValidateForm(
            ReservaAmenidadFormViewModel form,
            IReadOnlyList<AreaComunFormViewModel> areas,
            IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            if (form.AreasComunesID <= 0)
            {
                ModelState.AddModelError("Form.AreasComunesID", "Selecciona una amenidad.");
            }
            else if (!areas.Any(item => item.AreasComunesID == form.AreasComunesID))
            {
                ModelState.AddModelError("Form.AreasComunesID", "La amenidad seleccionada no está disponible para reservar.");
            }

            if (form.ReservacionEstadoID <= 0)
            {
                ModelState.AddModelError("Form.ReservacionEstadoID", "Selecciona un estado de reserva.");
            }
            else if (!estados.Any(item => item.ReservacionEstadoID == form.ReservacionEstadoID))
            {
                ModelState.AddModelError("Form.ReservacionEstadoID", "El estado seleccionado no está disponible.");
            }

            if (form.FechaFin <= form.FechaInicio)
            {
                ModelState.AddModelError("Form.FechaFin", "La fecha de fin debe ser mayor que la fecha de inicio.");
            }
        }

        private static void ApplyLookups(
            ReservaAmenidadFormViewModel form,
            IReadOnlyList<AreaComunFormViewModel> areas,
            IReadOnlyList<ReservacionEstadoLookupViewModel> estados,
            string currentUserName,
            string? currentUserEmail)
        {
            var area = areas.FirstOrDefault(item => item.AreasComunesID == form.AreasComunesID);
            if (area is not null)
            {
                form.AreasComunes = area.AreasComunes;
                form.Capacidad = area.Capacidad;
                form.RequiereReservacion = area.RequiereReservacion;
            }

            form.NombreUsuario = currentUserName;
            form.CorreoUsuario = currentUserEmail;

            var estado = estados.FirstOrDefault(item => item.ReservacionEstadoID == form.ReservacionEstadoID);
            if (estado is not null)
            {
                form.ReservacionEstado = estado.ReservacionEstado;
            }
        }

        private static void ComposePresentation(IReadOnlyList<ReservaAmenidadFormViewModel> userReservations, IReadOnlyList<ReservaAmenidadFormViewModel> allReservations)
        {
            foreach (var item in userReservations)
            {
                item.DuracionTexto = FormatDuration(item.FechaInicio, item.FechaFin);
                item.EstadoTemporal = ResolveTemporalState(item);
                item.EstadoTemporalClase = ResolveTemporalClass(item);

                var conflicts = allReservations
                    .Where(other => other.AreasComunesID == item.AreasComunesID && other.ReservacionAreaID != item.ReservacionAreaID)
                    .Where(other => Overlaps(item.FechaInicio, item.FechaFin, other.FechaInicio, other.FechaFin))
                    .ToList();

                item.TieneConflicto = conflicts.Count > 0;
                item.ConflictoTexto = item.TieneConflicto
                    ? $"Se cruza con {conflicts.Count} reserva(s) en la misma amenidad."
                    : null;
            }
        }

        private static void ComposePresentation(ReservaAmenidadFormViewModel form, IReadOnlyList<ReservaAmenidadFormViewModel> items)
        {
            form.DuracionTexto = FormatDuration(form.FechaInicio, form.FechaFin);
            form.EstadoTemporal = ResolveTemporalState(form);
            form.EstadoTemporalClase = ResolveTemporalClass(form);

            var conflicts = items
                .Where(item => item.AreasComunesID == form.AreasComunesID && item.ReservacionAreaID != form.ReservacionAreaID)
                .Where(item => Overlaps(form.FechaInicio, form.FechaFin, item.FechaInicio, item.FechaFin))
                .ToList();

            form.TieneConflicto = conflicts.Count > 0;
            form.ConflictoTexto = form.TieneConflicto
                ? $"Hay {conflicts.Count} reserva(s) que se cruzan con este horario."
                : null;
        }

        private static IReadOnlyList<SelectListItem> BuildAreaOptions(IReadOnlyList<AreaComunFormViewModel> areas, int selectedId)
        {
            return areas.Select(item => new SelectListItem
            {
                Value = item.AreasComunesID?.ToString(),
                Text = BuildAreaText(item),
                Selected = item.AreasComunesID == selectedId
            }).ToList();
        }

        private static IReadOnlyList<SelectListItem> BuildEstadoOptions(IReadOnlyList<ReservacionEstadoLookupViewModel> estados, int selectedId)
        {
            return estados.Select(item => new SelectListItem
            {
                Value = item.ReservacionEstadoID.ToString(),
                Text = item.DisplayText,
                Selected = item.ReservacionEstadoID == selectedId
            }).ToList();
        }

        private static string BuildAreaText(AreaComunFormViewModel item)
        {
            var label = string.IsNullOrWhiteSpace(item.AreasComunes)
                ? $"Amenidad {item.AreasComunesID ?? 0}"
                : item.AreasComunes;

            var capacityText = item.Capacidad.HasValue ? $"Cap. {item.Capacidad}" : "Sin capacidad";
            return $"{label} · {capacityText}";
        }

        private static string? BuildWarning(
            IReadOnlyList<AreaComunFormViewModel> areas,
            IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            var warnings = new List<string>();

            if (areas.Count == 0)
            {
                warnings.Add("No hay amenidades reservables registradas todavía.");
            }

            if (estados.Count == 0)
            {
                warnings.Add("No hay estados de reserva configurados.");
            }

            return warnings.Count == 0 ? null : string.Join(" ", warnings);
        }

        private static int ResolveDefaultEstadoId(IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            var pending = estados.FirstOrDefault(item => string.Equals(item.ReservacionEstado, "Pendiente", StringComparison.OrdinalIgnoreCase));
            if (pending is not null)
            {
                return pending.ReservacionEstadoID;
            }

            var confirmed = estados.FirstOrDefault(item => string.Equals(item.ReservacionEstado, "Confirmada", StringComparison.OrdinalIgnoreCase));
            return confirmed?.ReservacionEstadoID ?? estados.FirstOrDefault()?.ReservacionEstadoID ?? 0;
        }

        private static int ResolveCancelStateId(IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            var canceled = estados.FirstOrDefault(item => string.Equals(item.ReservacionEstado, "Cancelada", StringComparison.OrdinalIgnoreCase));
            return canceled?.ReservacionEstadoID ?? 0;
        }

        private static string ResolveTemporalState(ReservaAmenidadFormViewModel item)
        {
            var now = DateTime.Now;
            if (item.FechaFin < now)
            {
                return "Finalizada";
            }

            if (item.FechaInicio > now)
            {
                return "Programada";
            }

            return "En curso";
        }

        private static string ResolveTemporalClass(ReservaAmenidadFormViewModel item)
        {
            var now = DateTime.Now;
            if (item.FechaFin < now)
            {
                return "badge-secondary";
            }

            if (item.FechaInicio > now)
            {
                return "badge-info";
            }

            return "badge-success";
        }

        private static string FormatDuration(DateTime start, DateTime end)
        {
            var minutes = Math.Max(1, (int)Math.Round((end - start).TotalMinutes));
            if (minutes % 60 == 0)
            {
                return $"{minutes / 60} h";
            }

            return $"{minutes} min";
        }

        private static bool Overlaps(DateTime startA, DateTime endA, DateTime startB, DateTime endB)
            => startA < endB && endA > startB;

        private static DateTime RoundUpToSlot(DateTime value, int minutes)
        {
            var slot = Math.Max(1, minutes);
            var ticks = TimeSpan.FromMinutes(slot).Ticks;
            return new DateTime(((value.Ticks + ticks - 1) / ticks) * ticks, value.Kind);
        }

        private static ReservaAmenidadFormViewModel CloneForEdit(ReservaAmenidadFormViewModel source)
        {
            return new ReservaAmenidadFormViewModel
            {
                ReservacionAreaID = source.ReservacionAreaID,
                AreasComunesID = source.AreasComunesID,
                UsuarioID = source.UsuarioID,
                FechaInicio = source.FechaInicio,
                FechaFin = source.FechaFin,
                ReservacionEstadoID = source.ReservacionEstadoID,
                AreasComunes = source.AreasComunes,
                NombreUsuario = source.NombreUsuario,
                CorreoUsuario = source.CorreoUsuario,
                Capacidad = source.Capacidad,
                RequiereReservacion = source.RequiereReservacion,
                ReservacionEstado = source.ReservacionEstado,
                Creado = source.Creado,
                Modificado = source.Modificado,
                UsuarioCreacionID = source.UsuarioCreacionID,
                UsuarioModificacionID = source.UsuarioModificacionID,
                FechaCreacion = source.FechaCreacion,
                FechaModificacion = source.FechaModificacion,
                bEliminado = source.bEliminado
            };
        }

        private static string GetEstadoSortKey(string? estado)
        {
            return string.IsNullOrWhiteSpace(estado)
                ? "zzzzzz"
                : estado switch
                {
                    "Pendiente" => "aaaaaa",
                    "Confirmada" => "baaaaa",
                    "Finalizada" => "caaaaa",
                    "Cancelada" => "daaaaa",
                    _ => estado
                };
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

        private sealed record ReservationSnapshot(
            IReadOnlyList<ReservaAmenidadFormViewModel> AllReservations,
            IReadOnlyList<ReservaAmenidadFormViewModel> UserReservations,
            IReadOnlyList<AreaComunFormViewModel> Areas,
            IReadOnlyList<ReservacionEstadoLookupViewModel> Estados);
    }
}