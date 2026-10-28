using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Catalogos
{
    [Authorize]
    [Route("Gestion/Reservas-Amenidades")]
    [RequireMenuAccess("Gestion/Reservas-Amenidades")]
    public class ReservasAmenidadesController : Controller
    {
        private readonly IGraphApiBackendService _backend;

        public ReservasAmenidadesController(IGraphApiBackendService backend)
        {
            _backend = backend;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(int? editId = null, int? areaId = null, bool soloActivas = false, int? filtroAreaId = null)
        {
            var model = await BuildPageAsync(editId, areaId, soloActivas: soloActivas, filtroAreaId: filtroAreaId);
            return View("~/Views/Catalogos/ReservasAmenidades.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(ReservaAmenidadFormViewModel form)
        {
            NormalizeForm(form);
            ValidateForm(form);

            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(formOverride: form);
                invalidPage.Error = "Revisa los campos marcados antes de guardar.";
                return View("~/Views/Catalogos/ReservasAmenidades.cshtml", invalidPage);
            }

            var isNew = form.ReservacionAreaID <= 0;

            try
            {
                await _backend.SaveReservaAmenidadAsync(form);

                var page = await BuildPageAsync();
                page.Message = isNew ? "Reserva de amenidad creada." : "Reserva de amenidad actualizada.";
                return View("~/Views/Catalogos/ReservasAmenidades.cshtml", page);
            }
            catch (Exception ex)
            {
                var page = await BuildPageAsync(formOverride: form);
                page.Error = ex.Message;
                return View("~/Views/Catalogos/ReservasAmenidades.cshtml", page);
            }
        }

        [HttpPost("Eliminar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int reservacionAreaId)
        {
            try
            {
                await _backend.DeleteReservaAmenidadAsync(reservacionAreaId);
                TempData["Message"] = "Reserva eliminada.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = ex.Message;
            }

            return RedirectToAction(nameof(Index));
        }

        private async Task<ReservaAmenidadPageViewModel> BuildPageAsync(int? editId = null, int? areaId = null, ReservaAmenidadFormViewModel? formOverride = null, bool soloActivas = false, int? filtroAreaId = null)
        {
            var reservasTask = _backend.GetReservasAmenidadesAsync();
            var areasTask = _backend.GetAreasComunesAsync();
            var usuariosTask = _backend.GetUsuariosAsync();
            var estadosTask = _backend.GetReservacionEstadosAsync();

            await Task.WhenAll(reservasTask, areasTask, usuariosTask, estadosTask);

            var items = reservasTask.Result
                .Select(CloneForEdit)
                .ToList();

            ComposePresentation(items);

            // apply UI filters before building the page
            var filteredItems = items.AsEnumerable();
            if (soloActivas)
            {
                filteredItems = filteredItems.Where(item => item.bEliminado != true);
            }
            if (filtroAreaId.HasValue && filtroAreaId.Value > 0)
            {
                filteredItems = filteredItems.Where(item => item.AreasComunesID == filtroAreaId.Value);
            }
            var displayItems = filteredItems
                .OrderByDescending(item => item.FechaInicio)
                .ToList();

            var allAreas = areasTask.Result
                .Where(item => item.AreasComunesID.HasValue && item.bEliminado != true)
                .OrderBy(item => item.AreasComunes)
                .ToList();

            var areas = allAreas
                .Where(item => item.RequiereReservacion == true)
                .ToList();

            var usuarios = usuariosTask.Result
                .Where(item => item.UsuarioID.HasValue && item.bEliminado != true && item.bActivoUsuario != false)
                .OrderBy(item => item.NombreUsuario)
                .ToList();

            var estados = estadosTask.Result
                .Where(item => item.ReservacionEstadoID > 0 && item.bEliminado != true)
                .OrderBy(item => GetEstadoSortKey(item.ReservacionEstado))
                .ThenBy(item => item.ReservacionEstadoID)
                .ToList();

            var form = formOverride is not null
                ? formOverride
                : editId.HasValue
                    ? items.FirstOrDefault(item => item.ReservacionAreaID == editId.Value) ?? new ReservaAmenidadFormViewModel { ReservacionAreaID = editId.Value }
                    : new ReservaAmenidadFormViewModel();

            if (formOverride is null)
            {
                if (form.AreasComunesID <= 0 && areaId.HasValue)
                {
                    form.AreasComunesID = areaId.Value;
                }

                var defaultAreaId = areas.Count == 1 ? areas[0].AreasComunesID : null;
                if (form.AreasComunesID <= 0 && defaultAreaId.HasValue)
                {
                    form.AreasComunesID = defaultAreaId.Value;
                }

                var defaultUsuarioId = usuarios.Count == 1 ? usuarios[0].UsuarioID : null;
                if (form.UsuarioID <= 0 && defaultUsuarioId.HasValue)
                {
                    form.UsuarioID = defaultUsuarioId.Value;
                }

                if (form.ReservacionEstadoID <= 0)
                {
                    form.ReservacionEstadoID = ResolveDefaultEstadoId(estados);
                }

                if (form.FechaInicio == default)
                {
                    form.FechaInicio = RoundUpToSlot(DateTime.Now.AddHours(1), 30);
                }

                if (form.FechaFin == default || form.FechaFin <= form.FechaInicio)
                {
                    form.FechaFin = form.FechaInicio.AddHours(2);
                }
            }

            ApplyLookups(form, areas, usuarios, estados);
            ComposePresentation(form, items);

            var page = new ReservaAmenidadPageViewModel
            {
                Items = displayItems,
                Form = form,
                AreasOptions = BuildAreaOptions(areas, form.AreasComunesID),
                UsuarioOptions = BuildUsuarioOptions(usuarios, form.UsuarioID),
                EstadoOptions = BuildEstadoOptions(estados, form.ReservacionEstadoID),
                FiltroAreaOptions = BuildFiltroAreaOptions(allAreas, filtroAreaId),
                Message = TempData["Message"] as string,
                Error = TempData["Error"] as string,
                Warning = BuildWarning(allAreas, usuarios, estados),
                PuedeGuardar = areas.Count > 0 && usuarios.Count > 0 && estados.Count > 0,
                TotalAmenidades = areas.Count,
                TotalEstados = estados.Count,
                TotalReservas = items.Count,
                SoloActivas = soloActivas,
                FiltroAreaId = filtroAreaId
            };

            if (!page.PuedeGuardar && string.IsNullOrWhiteSpace(page.Warning))
            {
                page.Warning = "Faltan catálogos para completar la reserva.";
            }

            return page;
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

        private void ValidateForm(ReservaAmenidadFormViewModel form)
        {
            if (form.AreasComunesID <= 0)
            {
                ModelState.AddModelError("Form.AreasComunesID", "Selecciona una amenidad.");
            }

            if (form.UsuarioID <= 0)
            {
                ModelState.AddModelError("Form.UsuarioID", "Selecciona un usuario responsable.");
            }

            if (form.ReservacionEstadoID <= 0)
            {
                ModelState.AddModelError("Form.ReservacionEstadoID", "Selecciona un estado de reserva.");
            }

            if (form.FechaFin <= form.FechaInicio)
            {
                ModelState.AddModelError("Form.FechaFin", "La fecha de fin debe ser mayor que la fecha de inicio.");
            }
        }

        private static void ApplyLookups(
            ReservaAmenidadFormViewModel form,
            IReadOnlyList<Web.Models.Admin.AreaComunFormViewModel> areas,
            IReadOnlyList<UsuarioLookupViewModel> usuarios,
            IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            var area = areas.FirstOrDefault(item => item.AreasComunesID == form.AreasComunesID);
            if (area is not null)
            {
                form.AreasComunes = area.AreasComunes;
                form.Capacidad = area.Capacidad;
                form.RequiereReservacion = area.RequiereReservacion;
            }

            var usuario = usuarios.FirstOrDefault(item => item.UsuarioID == form.UsuarioID);
            if (usuario is not null)
            {
                form.NombreUsuario = usuario.NombreUsuario;
                form.CorreoUsuario = usuario.CorreoUsuario;
            }

            var estado = estados.FirstOrDefault(item => item.ReservacionEstadoID == form.ReservacionEstadoID);
            if (estado is not null)
            {
                form.ReservacionEstado = estado.ReservacionEstado;
            }
        }

        private static void ComposePresentation(IReadOnlyList<ReservaAmenidadFormViewModel> items)
        {
            var groups = items.GroupBy(item => item.AreasComunesID).ToList();

            foreach (var item in items)
            {
                item.DuracionTexto = FormatDuration(item.FechaInicio, item.FechaFin);
                item.EstadoTemporal = ResolveTemporalState(item);
                item.EstadoTemporalClase = ResolveTemporalClass(item);

                var conflicts = groups
                    .Where(group => group.Key == item.AreasComunesID)
                    .SelectMany(group => group)
                    .Where(other => other.ReservacionAreaID != item.ReservacionAreaID && Overlaps(item.FechaInicio, item.FechaFin, other.FechaInicio, other.FechaFin))
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

        private static IReadOnlyList<SelectListItem> BuildAreaOptions(IReadOnlyList<Web.Models.Admin.AreaComunFormViewModel> areas, int selectedId)
        {
            return areas
                .Select(item => new SelectListItem
                {
                    Value = item.AreasComunesID?.ToString(),
                    Text = BuildAreaText(item),
                    Selected = item.AreasComunesID == selectedId
                })
                .ToList();
        }

        private static IReadOnlyList<SelectListItem> BuildUsuarioOptions(IReadOnlyList<UsuarioLookupViewModel> usuarios, int selectedId)
        {
            return usuarios
                .Where(item => item.UsuarioID.HasValue)
                .Select(item => new SelectListItem
                {
                    Value = item.UsuarioID!.Value.ToString(),
                    Text = string.IsNullOrWhiteSpace(item.DisplayText) ? $"Usuario {item.UsuarioID}" : item.DisplayText,
                    Selected = item.UsuarioID == selectedId
                })
                .ToList();
        }

        private static IReadOnlyList<SelectListItem> BuildEstadoOptions(IReadOnlyList<ReservacionEstadoLookupViewModel> estados, int selectedId)
        {
            return estados
                .Select(item => new SelectListItem
                {
                    Value = item.ReservacionEstadoID.ToString(),
                    Text = item.DisplayText,
                    Selected = item.ReservacionEstadoID == selectedId
                })
                .ToList();
        }

        private static IReadOnlyList<SelectListItem> BuildFiltroAreaOptions(
            IReadOnlyList<Web.Models.Admin.AreaComunFormViewModel> allAreas,
            int? selectedId)
        {
            var list = new List<SelectListItem>
            {
                new SelectListItem { Value = "", Text = "Todas las amenidades", Selected = !selectedId.HasValue }
            };

            list.AddRange(allAreas
                .Where(item => item.AreasComunesID.HasValue && item.bEliminado != true)
                .OrderBy(item => item.AreasComunes)
                .Select(item => new SelectListItem
                {
                    Value = item.AreasComunesID!.Value.ToString(),
                    Text = string.IsNullOrWhiteSpace(item.AreasComunes) ? $"Amenidad {item.AreasComunesID}" : item.AreasComunes,
                    Selected = item.AreasComunesID == selectedId
                }));

            return list;
        }

        private static string BuildAreaText(Web.Models.Admin.AreaComunFormViewModel item)
        {
            var label = string.IsNullOrWhiteSpace(item.AreasComunes)
                ? $"Amenidad {item.AreasComunesID ?? 0}"
                : item.AreasComunes;

            var capacityText = item.Capacidad.HasValue ? $"Cap. {item.Capacidad}" : "Sin capacidad";
            var reservationText = item.RequiereReservacion == true ? "Reserva requerida" : "Uso libre";
            return $"{label} · {capacityText} · {reservationText}";
        }

        private static string BuildWarning(
            IReadOnlyList<Web.Models.Admin.AreaComunFormViewModel> areas,
            IReadOnlyList<UsuarioLookupViewModel> usuarios,
            IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            var warnings = new List<string>();

            if (areas.Count == 0)
            {
                warnings.Add("No hay amenidades registradas. Crea una desde Áreas comunes para poder reservarla.");
            }
            else if (areas.All(item => item.RequiereReservacion != true))
            {
                warnings.Add("Ninguna amenidad está marcada como reservable. Revisa la configuración en Áreas comunes.");
            }

            if (usuarios.Count == 0)
            {
                warnings.Add("No hay usuarios activos disponibles para asignar la reserva.");
            }

            if (estados.Count == 0)
            {
                warnings.Add("No hay estados de reserva configurados.");
            }

            return string.Join(" ", warnings);
        }

        private static int ResolveDefaultEstadoId(IReadOnlyList<ReservacionEstadoLookupViewModel> estados)
        {
            if (estados.Count == 0)
            {
                return 0;
            }

            var pendiente = estados.FirstOrDefault(item => string.Equals(item.ReservacionEstado, "Pendiente", StringComparison.OrdinalIgnoreCase));
            return pendiente?.ReservacionEstadoID ?? estados[0].ReservacionEstadoID;
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
        {
            return startA < endB && endA > startB;
        }

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
    }
}