using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Tickets")]
    public sealed class TicketsController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IWebHostEnvironment _env;
        private readonly IResidentPortalService _residentPortal;

        public TicketsController(IGraphApiBackendService backend, IWebHostEnvironment env, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _env = env;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(
            [FromQuery] TicketBoardFilterViewModel filter,
            int? ticketId = null,
            bool newTicket = false,
            string? focus = null,
            string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var model = await BuildPageAsync(context, filter, ticketId, newTicket, focus, tab);
            ApplyTempDataMessages(model);
            return View("~/Views/Residente/Tickets/Index.cshtml", model);
        }

        [HttpPost("Guardar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Guardar(
            [Bind(Prefix = "Form")] TicketBoardItemViewModel form,
            [Bind(Prefix = "Filter")] TicketBoardFilterViewModel filter,
            bool newTicket = false,
            string? focus = null,
            string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            form.TicketID = null;
            form.UsuarioSolicitanteID = context.UsuarioId;
            form.FechaCreacionTicket = form.FechaCreacionTicket == default ? DateTime.UtcNow : form.FechaCreacionTicket;
            form.FechaCierre = null;
            form.bEliminado = false;

            if (!ModelState.IsValid)
            {
                var invalidPage = await BuildPageAsync(context, filter, null, true, focus, tab, formOverride: form);
                invalidPage.Error = "Revisa los campos obligatorios del ticket.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            try
            {
                var ticketId = await _backend.SaveTicketAsync(form);
                TempData["TicketMessage"] = "Ticket creado.";
                return RedirectToAction(nameof(Index), BuildRouteValues(filter, ticketId, false, "detail", NormalizeTab(tab)));
            }
            catch (Exception ex)
            {
                var errorPage = await BuildPageAsync(context, filter, null, true, focus, tab, formOverride: form);
                errorPage.Error = ex.Message;
                return View("~/Views/Residente/Tickets/Index.cshtml", errorPage);
            }
        }

        [HttpPost("Responder")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Responder(
            [Bind(Prefix = "ReplyForm")] TicketBoardReplyViewModel form,
            [Bind(Prefix = "Filter")] TicketBoardFilterViewModel filter,
            bool newTicket = false,
            string? focus = null,
            string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            form.UsuarioID = context.UsuarioId;

            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(form.Comentario))
            {
                var invalidPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, tab, replyOverride: form);
                invalidPage.Error = "Escribe una respuesta antes de enviarla.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            var residentSnapshot = await LoadResidentTicketSnapshotAsync(context, NormalizeTab(tab));
            var targetTicket = residentSnapshot.AccessibleTickets.FirstOrDefault(item => item.TicketID == form.TicketID);
            if (targetTicket is null)
            {
                TempData["TicketWarning"] = "Solo puedes responder tickets ligados a tu sesión residente.";
                return RedirectToAction(nameof(Index), BuildRouteValues(filter, null, false, focus, NormalizeTab(tab)));
            }

            try
            {
                await _backend.SaveTicketCommentAsync(form);

                if (form.CerrarTicket || form.NuevoEstadoTicketID.HasValue)
                {
                    var updatedTicket = CloneTicket(targetTicket);
                    updatedTicket.EstadoTicketID = form.NuevoEstadoTicketID ?? ResolveClosedStateId(residentSnapshot.States) ?? targetTicket.EstadoTicketID;
                    updatedTicket.EstadoTicket = residentSnapshot.States.FirstOrDefault(item => item.EstadoTicketID == updatedTicket.EstadoTicketID)?.EstadoTicket ?? targetTicket.EstadoTicket;

                    if (form.CerrarTicket || IsClosedState(updatedTicket.EstadoTicketID, residentSnapshot.States))
                    {
                        updatedTicket.FechaCierre = DateTime.UtcNow;
                    }

                    await _backend.SaveTicketAsync(updatedTicket);
                }

                TempData["TicketMessage"] = "Respuesta registrada.";
                return RedirectToAction(nameof(Index), BuildRouteValues(filter, form.TicketID, false, "detail", NormalizeTab(tab)));
            }
            catch (Exception ex)
            {
                var errorPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, tab, replyOverride: form);
                errorPage.Error = ex.Message;
                return View("~/Views/Residente/Tickets/Index.cshtml", errorPage);
            }
        }

        [HttpPost("Adjuntar")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Adjuntar(
            [Bind(Prefix = "AttachmentForm")] TicketBoardAttachmentFormViewModel form,
            [Bind(Prefix = "Filter")] TicketBoardFilterViewModel filter,
            bool newTicket = false,
            string? focus = null,
            string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var normalizedTab = NormalizeTab(tab);
            var residentSnapshot = await LoadResidentTicketSnapshotAsync(context, normalizedTab);
            var targetTicket = residentSnapshot.AccessibleTickets.FirstOrDefault(item => item.TicketID == form.TicketID);
            if (targetTicket is null)
            {
                TempData["TicketWarning"] = "Solo puedes adjuntar archivos a tickets ligados a tu sesión residente.";
                return RedirectToAction(nameof(Index), BuildRouteValues(filter, null, false, focus, normalizedTab));
            }

            if (!ModelState.IsValid || form.Archivo is null || form.Archivo.Length == 0)
            {
                var invalidPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, normalizedTab, attachmentOverride: form);
                invalidPage.Error = "Selecciona un archivo válido para adjuntar.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png" };
            var extension = Path.GetExtension(form.Archivo.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                var invalidPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, normalizedTab, attachmentOverride: form);
                invalidPage.Error = "Tipo de archivo no permitido.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            if (form.Archivo.Length > 20 * 1024 * 1024)
            {
                var invalidPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, normalizedTab, attachmentOverride: form);
                invalidPage.Error = "El archivo excede el límite de 20 MB.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            if (string.IsNullOrWhiteSpace(_env.WebRootPath))
            {
                var invalidPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, normalizedTab, attachmentOverride: form);
                invalidPage.Error = "No se pudo resolver la carpeta web para guardar el archivo.";
                return View("~/Views/Residente/Tickets/Index.cshtml", invalidPage);
            }

            string? fullPath = null;
            int? archivoId = null;

            try
            {
                var ticketFolder = Path.Combine(_env.WebRootPath, "uploads", "tickets", form.TicketID.ToString());
                Directory.CreateDirectory(ticketFolder);

                var safeName = $"{Guid.NewGuid():N}{extension}";
                var relativePath = Path.Combine("uploads", "tickets", form.TicketID.ToString(), safeName).Replace("\\", "/");
                fullPath = Path.Combine(_env.WebRootPath, relativePath);

                await using (var stream = System.IO.File.Create(fullPath))
                {
                    await form.Archivo.CopyToAsync(stream);
                }

                var displayName = Path.GetFileName(form.Archivo.FileName);
                archivoId = await _backend.SaveArchivoAsync(displayName, relativePath, null, false, false);
                if (!archivoId.HasValue || archivoId.Value <= 0)
                {
                    throw new InvalidOperationException("No se pudo registrar el archivo adjunto.");
                }

                await _backend.SaveTicketDocumentoAsync(form.TicketID, archivoId.Value, false);
                TempData["TicketMessage"] = "Adjunto agregado al ticket.";
                return RedirectToAction(nameof(Index), BuildRouteValues(filter, form.TicketID, false, "detail", normalizedTab));
            }
            catch (Exception ex)
            {
                if (archivoId.HasValue)
                {
                    try
                    {
                        await _backend.DeleteArchivoAsync(archivoId.Value);
                    }
                    catch
                    {
                    }
                }

                if (!string.IsNullOrWhiteSpace(fullPath) && System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                var errorPage = await BuildPageAsync(context, filter, form.TicketID, newTicket, focus, normalizedTab, attachmentOverride: form);
                errorPage.Error = ex.Message;
                return View("~/Views/Residente/Tickets/Index.cshtml", errorPage);
            }
        }

        private async Task<TicketBoardPageViewModel> BuildPageAsync(
            ResidentPortalContextViewModel context,
            TicketBoardFilterViewModel filter,
            int? ticketId,
            bool newTicket,
            string? focus,
            string? tab,
            TicketBoardItemViewModel? formOverride = null,
            TicketBoardReplyViewModel? replyOverride = null,
            TicketBoardAttachmentFormViewModel? attachmentOverride = null)
        {
            filter ??= new TicketBoardFilterViewModel();
            var normalizedTab = NormalizeTab(tab);
            var residentSnapshot = await LoadResidentTicketSnapshotAsync(context, normalizedTab);

            var filteredTickets = ApplyFilters(residentSnapshot.AccessibleTickets, filter)
                .OrderBy(item => item.UrgencyOrder)
                .ThenByDescending(item => item.UltimaActividad ?? item.FechaCreacionTicket)
                .ToList();

            var selectedTicket = ResolveSelectedTicket(filteredTickets, ticketId, newTicket);

            IReadOnlyList<TicketBoardTimelineViewModel> timeline = Array.Empty<TicketBoardTimelineViewModel>();
            IReadOnlyList<TicketBoardAttachmentViewModel> selectedAttachments = Array.Empty<TicketBoardAttachmentViewModel>();

            if (selectedTicket?.TicketID is int selectedTicketId && selectedTicketId > 0)
            {
                residentSnapshot.CommentsByTicket.TryGetValue(selectedTicketId, out var ticketComments);
                residentSnapshot.AttachmentsByTicket.TryGetValue(selectedTicketId, out var ticketAttachments);

                selectedAttachments = ticketAttachments ?? new List<TicketBoardAttachmentViewModel>();
                timeline = BuildTimeline(selectedTicket, ticketComments ?? new List<TicketBoardCommentViewModel>(), selectedAttachments, residentSnapshot.UserNameById);
            }

            var form = formOverride ?? BuildBlankTicketForm(context.UsuarioId, residentSnapshot.States, residentSnapshot.Priorities);
            var replyForm = replyOverride ?? BuildReplyForm(selectedTicket, context.UsuarioId, residentSnapshot.States);
            var attachmentForm = attachmentOverride ?? BuildAttachmentForm(selectedTicket);

            var page = new TicketBoardPageViewModel
            {
                Items = filteredTickets,
                SelectedTicket = selectedTicket,
                IsCreateMode = newTicket,
                Timeline = timeline,
                Form = form,
                ReplyForm = replyForm,
                AttachmentForm = attachmentForm,
                Attachments = selectedAttachments,
                Filter = filter,
                EstadoOptions = BuildSelectList(residentSnapshot.States, item => item.EstadoTicketID, item => item.DisplayText),
                PrioridadOptions = BuildSelectList(residentSnapshot.Priorities, item => item.PrioridadTicketID, item => item.DisplayText),
                TotalTickets = filteredTickets.Count,
                TotalAbiertos = filteredTickets.Count(item => item.EsAbierto),
                TotalEnSeguimiento = filteredTickets.Count(item => item.EnSeguimiento),
                TotalResueltos = filteredTickets.Count(item => item.EsResuelto),
                TotalCerrados = filteredTickets.Count(item => item.EsCerrado),
                FocusDetail = string.Equals(focus, "detail", StringComparison.OrdinalIgnoreCase),
                PuedeGuardar = residentSnapshot.States.Any() && residentSnapshot.Priorities.Any(),
                CurrentUserName = CotoContext.GetNombreUsuario(User),
                Warning = selectedTicket is null && !newTicket && filteredTickets.Count == 0
                    ? "No hay tickets que coincidan con los filtros actuales para esta bandeja."
                    : null
            };

            ViewData["ResidentTicketTab"] = normalizedTab;
            ViewData["ResidentContextDisplay"] = context.SelectedPropertyDisplay;

            return page;
        }

        private async Task<ResidentTicketSnapshot> LoadResidentTicketSnapshotAsync(ResidentPortalContextViewModel context, string tab)
        {
            var ticketsTask = _backend.GetTicketsAsync();
            var statesTask = _backend.GetEstadosTicketsAsync();
            var prioritiesTask = _backend.GetPrioridadTicketsAsync();
            var commentsTask = _backend.GetComentariosTicketsAsync();
            var assignmentsTask = _backend.GetTicketsUsuariosAsignadosAsync();
            var attachmentsTask = _backend.GetTicketAttachmentsAsync();
            var usersTask = _backend.GetUsuariosAsync();

            await Task.WhenAll(ticketsTask, statesTask, prioritiesTask, commentsTask, assignmentsTask, attachmentsTask, usersTask);

            var tickets = ticketsTask.Result.ToList();
            var states = statesTask.Result.ToList();
            var priorities = prioritiesTask.Result.ToList();
            var comments = commentsTask.Result.ToList();
            var assignments = assignmentsTask.Result.ToList();
            var attachments = attachmentsTask.Result.ToList();
            var users = usersTask.Result.ToList();

            var userNameById = users
                .Where(item => item.UsuarioID.HasValue)
                .ToDictionary(item => item.UsuarioID!.Value, item => item.NombreUsuario ?? $"Usuario {item.UsuarioID}");

            var commentsByTicket = comments
                .Where(item => item.TicketID > 0)
                .GroupBy(item => item.TicketID)
                .ToDictionary(group => group.Key, group => group.OrderBy(item => item.FechaComentario).ThenBy(item => item.ComentarioTicketID).ToList());

            var assignmentsByTicket = assignments
                .Where(item => item.TicketID > 0)
                .GroupBy(item => item.TicketID)
                .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.TicketsUsuariosAsignadosID ?? 0).ToList());

            foreach (var attachment in attachments)
            {
                attachment.CreadoPor = ResolveUserName(attachment.UsuarioCreacionID, userNameById);
            }

            var attachmentsByTicket = attachments
                .Where(item => item.TicketID > 0)
                .GroupBy(item => item.TicketID)
                .ToDictionary(group => group.Key, group => group.OrderByDescending(item => item.FechaCreacion ?? DateTime.MinValue).ThenByDescending(item => item.DocumentoTicketID).ToList());

            EnrichTickets(tickets, commentsByTicket, assignmentsByTicket, attachmentsByTicket, userNameById);

            var accessibleTickets = tickets.Where(item => item.UsuarioSolicitanteID == context.UsuarioId || item.UsuarioAsignadoID == context.UsuarioId);
            accessibleTickets = tab == "assigned"
                ? accessibleTickets.Where(item => item.UsuarioAsignadoID == context.UsuarioId)
                : accessibleTickets.Where(item => item.UsuarioSolicitanteID == context.UsuarioId);

            return new ResidentTicketSnapshot(
                accessibleTickets.ToList(),
                states,
                priorities,
                commentsByTicket,
                attachmentsByTicket,
                userNameById);
        }

        private static IEnumerable<TicketBoardItemViewModel> ApplyFilters(IEnumerable<TicketBoardItemViewModel> tickets, TicketBoardFilterViewModel filter)
        {
            var query = tickets;

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var search = filter.Search.Trim();
                query = query.Where(item =>
                    Contains(item.TituloTicket, search) ||
                    Contains(item.DescripcionTicket, search) ||
                    Contains(item.NombreSolicitante, search) ||
                    Contains(item.PrioridadTicket, search) ||
                    Contains(item.EstadoTicket, search) ||
                    Contains(item.UsuarioAsignado, search));
            }

            if (filter.EstadoTicketID.HasValue)
            {
                query = query.Where(item => item.EstadoTicketID == filter.EstadoTicketID.Value);
            }

            if (filter.PrioridadTicketID.HasValue)
            {
                query = query.Where(item => item.PrioridadTicketID == filter.PrioridadTicketID.Value);
            }

            if (filter.SoloAbiertos)
            {
                query = query.Where(item => item.EsAbierto);
            }

            return query;
        }

        private static bool Contains(string? value, string search)
            => !string.IsNullOrWhiteSpace(value) && value.Contains(search, StringComparison.OrdinalIgnoreCase);

        private static TicketBoardItemViewModel? ResolveSelectedTicket(IReadOnlyList<TicketBoardItemViewModel> filteredTickets, int? ticketId, bool newTicket)
        {
            if (newTicket)
            {
                return null;
            }

            if (ticketId.HasValue)
            {
                return filteredTickets.FirstOrDefault(item => item.TicketID == ticketId.Value);
            }

            return filteredTickets.FirstOrDefault();
        }

        private static void EnrichTickets(
            IReadOnlyList<TicketBoardItemViewModel> tickets,
            IReadOnlyDictionary<int, List<TicketBoardCommentViewModel>> commentsByTicket,
            IReadOnlyDictionary<int, List<TicketBoardAssignmentViewModel>> assignmentsByTicket,
            IReadOnlyDictionary<int, List<TicketBoardAttachmentViewModel>> attachmentsByTicket,
            IReadOnlyDictionary<int, string> userNameById)
        {
            foreach (var ticket in tickets)
            {
                if (!ticket.TicketID.HasValue)
                {
                    continue;
                }

                var ticketId = ticket.TicketID.Value;
                commentsByTicket.TryGetValue(ticketId, out var ticketComments);
                assignmentsByTicket.TryGetValue(ticketId, out var ticketAssignments);
                attachmentsByTicket.TryGetValue(ticketId, out var ticketAttachments);

                ticket.ComentariosCount = ticketComments?.Count ?? 0;
                ticket.AsignacionesCount = ticketAssignments?.Count ?? 0;
                ticket.AdjuntosCount = ticketAttachments?.Count ?? 0;

                var lastComment = ticketComments?.OrderByDescending(item => item.FechaComentario).FirstOrDefault();
                ticket.UltimoComentario = lastComment?.Comentario;
                ticket.UltimaActividad = MaxDate(ticket.FechaCreacionTicket, ticket.FechaCierre, lastComment?.FechaComentario);

                var currentAssignment = ticketAssignments?.FirstOrDefault();
                if (currentAssignment is not null)
                {
                    ticket.UsuarioAsignadoID = currentAssignment.UsuarioID;
                    ticket.UsuarioAsignado = ResolveUserName(currentAssignment.UsuarioID, userNameById);
                }
                else if (ticket.UsuarioSolicitanteID > 0 && userNameById.TryGetValue(ticket.UsuarioSolicitanteID, out var solicitanteNombre))
                {
                    ticket.UsuarioAsignado = solicitanteNombre;
                }
            }
        }

        private static TicketBoardItemViewModel CloneTicket(TicketBoardItemViewModel source)
        {
            return new TicketBoardItemViewModel
            {
                TicketID = source.TicketID,
                TituloTicket = source.TituloTicket,
                DescripcionTicket = source.DescripcionTicket,
                UsuarioSolicitanteID = source.UsuarioSolicitanteID,
                NombreSolicitante = source.NombreSolicitante,
                PrioridadTicketID = source.PrioridadTicketID,
                PrioridadTicket = source.PrioridadTicket,
                EstadoTicketID = source.EstadoTicketID,
                EstadoTicket = source.EstadoTicket,
                FechaCreacionTicket = source.FechaCreacionTicket,
                FechaCierre = source.FechaCierre,
                bEliminado = source.bEliminado,
                ComentariosCount = source.ComentariosCount,
                AsignacionesCount = source.AsignacionesCount,
                AdjuntosCount = source.AdjuntosCount,
                UltimoComentario = source.UltimoComentario,
                UltimaActividad = source.UltimaActividad,
                UsuarioAsignado = source.UsuarioAsignado,
                UsuarioAsignadoID = source.UsuarioAsignadoID
            };
        }

        private static TicketBoardItemViewModel BuildBlankTicketForm(
            int usuarioId,
            IReadOnlyList<TicketBoardStateLookupViewModel> states,
            IReadOnlyList<TicketBoardPriorityLookupViewModel> priorities)
        {
            return new TicketBoardItemViewModel
            {
                UsuarioSolicitanteID = usuarioId,
                EstadoTicketID = ResolveNewStateId(states) ?? states.FirstOrDefault()?.EstadoTicketID ?? 0,
                PrioridadTicketID = priorities.FirstOrDefault()?.PrioridadTicketID ?? 0,
                FechaCreacionTicket = DateTime.UtcNow,
                FechaCierre = null,
                bEliminado = false
            };
        }

        private static TicketBoardReplyViewModel BuildReplyForm(
            TicketBoardItemViewModel? selectedTicket,
            int usuarioId,
            IReadOnlyList<TicketBoardStateLookupViewModel> states)
        {
            return new TicketBoardReplyViewModel
            {
                TicketID = selectedTicket?.TicketID ?? 0,
                UsuarioID = usuarioId,
                NuevoEstadoTicketID = selectedTicket?.EstadoTicketID ?? ResolveNewStateId(states),
                CerrarTicket = selectedTicket?.EsCerrado ?? false,
                bEliminado = false
            };
        }

        private static IReadOnlyList<TicketBoardTimelineViewModel> BuildTimeline(
            TicketBoardItemViewModel ticket,
            IReadOnlyList<TicketBoardCommentViewModel> comments,
            IReadOnlyList<TicketBoardAttachmentViewModel> attachments,
            IReadOnlyDictionary<int, string> userNameById)
        {
            var timeline = new List<TicketBoardTimelineViewModel>
            {
                new()
                {
                    Tipo = "Apertura",
                    Titulo = "Ticket abierto",
                    Descripcion = ticket.DescripcionTicket,
                    Autor = ticket.NombreSolicitante,
                    Fecha = ticket.FechaCreacionTicket,
                    IconoClase = "mdi mdi-plus-circle-outline",
                    BadgeClase = "badge-info"
                }
            };

            foreach (var comment in comments.OrderBy(item => item.FechaComentario))
            {
                timeline.Add(new TicketBoardTimelineViewModel
                {
                    Tipo = "Respuesta",
                    Titulo = "Seguimiento / respuesta",
                    Descripcion = comment.Comentario,
                    Autor = ResolveUserName(comment.UsuarioID, userNameById),
                    Fecha = comment.FechaComentario,
                    IconoClase = "mdi mdi-message-text-outline",
                    BadgeClase = comment.UsuarioID == ticket.UsuarioSolicitanteID ? "badge-secondary" : "badge-primary"
                });
            }

            foreach (var attachment in attachments.OrderBy(item => item.FechaCreacion ?? ticket.FechaCreacionTicket).ThenBy(item => item.DocumentoTicketID))
            {
                timeline.Add(new TicketBoardTimelineViewModel
                {
                    Tipo = "Adjunto",
                    Titulo = "Archivo adjunto",
                    Descripcion = string.IsNullOrWhiteSpace(attachment.TipoArchivo)
                        ? attachment.NombreArchivo
                        : $"{attachment.NombreArchivo} · {attachment.TipoArchivo}",
                    Autor = attachment.CreadoPor ?? ResolveUserName(attachment.UsuarioCreacionID, userNameById),
                    Fecha = attachment.FechaCreacion ?? ticket.FechaCreacionTicket,
                    IconoClase = "mdi mdi-paperclip",
                    BadgeClase = "badge-dark"
                });
            }

            if (ticket.FechaCierre.HasValue)
            {
                timeline.Add(new TicketBoardTimelineViewModel
                {
                    Tipo = ticket.EsResuelto ? "Resolucion" : "Cierre",
                    Titulo = ticket.EsResuelto ? "Ticket resuelto" : "Ticket cerrado",
                    Descripcion = ticket.EstadoTicket,
                    Autor = ticket.UsuarioAsignado ?? ticket.NombreSolicitante,
                    Fecha = ticket.FechaCierre.Value,
                    IconoClase = "mdi mdi-check-circle-outline",
                    BadgeClase = "badge-success"
                });
            }

            return timeline.OrderBy(item => item.Fecha).ToList();
        }

        private static TicketBoardAttachmentFormViewModel BuildAttachmentForm(TicketBoardItemViewModel? selectedTicket)
        {
            return new TicketBoardAttachmentFormViewModel
            {
                TicketID = selectedTicket?.TicketID ?? 0,
                bEliminado = false
            };
        }

        private static IReadOnlyList<SelectListItem> BuildSelectList<T>(
            IEnumerable<T> items,
            Func<T, int> valueSelector,
            Func<T, string> textSelector)
        {
            return items.Select(item => new SelectListItem
            {
                Value = valueSelector(item).ToString(),
                Text = textSelector(item)
            }).ToList();
        }

        private static string ResolveUserName(int? userId, IReadOnlyDictionary<int, string> userNameById)
        {
            if (!userId.HasValue || userId.Value <= 0)
            {
                return "Sin usuario";
            }

            return userNameById.TryGetValue(userId.Value, out var userName)
                ? userName
                : $"Usuario {userId.Value}";
        }

        private static DateTime? MaxDate(params DateTime?[] values)
        {
            var validValues = values.Where(value => value.HasValue).Select(value => value!.Value).ToList();
            return validValues.Count == 0 ? null : validValues.Max();
        }

        private static int? ResolveNewStateId(IReadOnlyList<TicketBoardStateLookupViewModel> states)
            => FindStateId(states, "nuevo", "abierto", "pendiente");

        private static int? ResolveClosedStateId(IReadOnlyList<TicketBoardStateLookupViewModel> states)
            => FindStateId(states, "cerrado", "resuelto", "solucionado");

        private static bool IsClosedState(int? estadoTicketId, IReadOnlyList<TicketBoardStateLookupViewModel> states)
        {
            if (!estadoTicketId.HasValue)
            {
                return false;
            }

            var stateName = states.FirstOrDefault(item => item.EstadoTicketID == estadoTicketId.Value)?.EstadoTicket ?? string.Empty;
            return stateName.Contains("cerr", StringComparison.OrdinalIgnoreCase)
                || stateName.Contains("resuel", StringComparison.OrdinalIgnoreCase)
                || stateName.Contains("soluc", StringComparison.OrdinalIgnoreCase);
        }

        private static int? FindStateId(IReadOnlyList<TicketBoardStateLookupViewModel> states, params string[] keywords)
        {
            foreach (var keyword in keywords)
            {
                var match = states.FirstOrDefault(item =>
                    !string.IsNullOrWhiteSpace(item.EstadoTicket) &&
                    item.EstadoTicket.Contains(keyword, StringComparison.OrdinalIgnoreCase));

                if (match is not null)
                {
                    return match.EstadoTicketID;
                }
            }

            return states.FirstOrDefault()?.EstadoTicketID;
        }

        private static string NormalizeTab(string? tab)
            => string.Equals(tab, "assigned", StringComparison.OrdinalIgnoreCase) ? "assigned" : "created";

        private object BuildRouteValues(TicketBoardFilterViewModel filter, int? ticketId, bool newTicket, string? focus, string tab)
        {
            return new
            {
                ticketId,
                newTicket,
                focus,
                tab,
                search = filter.Search,
                estadoTicketID = filter.EstadoTicketID,
                prioridadTicketID = filter.PrioridadTicketID,
                soloAbiertos = filter.SoloAbiertos
            };
        }

        private void ApplyTempDataMessages(TicketBoardPageViewModel model)
        {
            if (TempData.TryGetValue("TicketMessage", out var messageValue))
            {
                model.Message = messageValue?.ToString();
            }

            if (TempData.TryGetValue("TicketWarning", out var warningValue))
            {
                model.Warning = warningValue?.ToString();
            }
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

        private sealed record ResidentTicketSnapshot(
            IReadOnlyList<TicketBoardItemViewModel> AccessibleTickets,
            IReadOnlyList<TicketBoardStateLookupViewModel> States,
            IReadOnlyList<TicketBoardPriorityLookupViewModel> Priorities,
            IReadOnlyDictionary<int, List<TicketBoardCommentViewModel>> CommentsByTicket,
            IReadOnlyDictionary<int, List<TicketBoardAttachmentViewModel>> AttachmentsByTicket,
            IReadOnlyDictionary<int, string> UserNameById);
    }
}