using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Notificaciones")]
    public sealed class NotificacionesController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public NotificacionesController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var normalizedTab = NormalizeTab(tab);
            var allNotifications = await LoadResidentNotificationsAsync(context.UsuarioId);
            var filtered = normalizedTab == "all"
                ? allNotifications
                : allNotifications.Where(item => !item.Leido).ToList();

            var model = new ResidentNotificationInboxViewModel
            {
                Context = context,
                Items = filtered,
                Tab = normalizedTab,
                TotalUnread = allNotifications.Count(item => !item.Leido),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Notificaciones/Index.cshtml", model);
        }

        [HttpGet("{notificacionId:int}")]
        public async Task<IActionResult> Detail(int notificacionId, string? tab = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var normalizedTab = NormalizeTab(tab);
            var allNotifications = await LoadResidentNotificationsAsync(context.UsuarioId);
            var notification = allNotifications.FirstOrDefault(item => item.NotificacionID == notificacionId);
            if (notification is null)
            {
                TempData["Error"] = "La notificación solicitada no está disponible para tu sesión.";
                return Redirect($"/Residente/Notificaciones?tab={normalizedTab}");
            }

            var markedAsRead = false;
            if (!notification.Leido && notification.UsuarioID == context.UsuarioId)
            {
                var updatedNotification = new NotificacionFormViewModel
                {
                    NotificacionID = notification.NotificacionID,
                    UsuarioID = notification.UsuarioID,
                    Titulo = notification.Titulo,
                    Mensaje = notification.Mensaje,
                    Leido = true,
                    FechaCreacionNotificacion = notification.FechaCreacionNotificacion ?? DateTime.UtcNow,
                    TipoNotificacionID = notification.TipoNotificacionID,
                    bEliminado = notification.bEliminado
                };

                await _backend.SaveNotificacionAsync(updatedNotification);
                notification = updatedNotification;
                markedAsRead = true;
            }

            var model = new ResidentNotificationDetailViewModel
            {
                Context = context,
                Notification = notification,
                IsGlobal = !notification.UsuarioID.HasValue || notification.UsuarioID.Value <= 0,
                MarkedAsRead = markedAsRead,
                BackTab = normalizedTab,
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Notificaciones/Detail.cshtml", model);
        }

        private async Task<List<NotificacionFormViewModel>> LoadResidentNotificationsAsync(int usuarioId)
        {
            return (await _backend.GetNotificacionesAsync())
                .Where(item => !item.bEliminado
                    && (item.UsuarioID == usuarioId || !item.UsuarioID.HasValue || item.UsuarioID.Value <= 0))
                .OrderBy(item => item.Leido ? 1 : 0)
                .ThenByDescending(item => item.FechaCreacionNotificacion)
                .ToList();
        }

        private static string NormalizeTab(string? tab)
            => string.Equals(tab, "all", StringComparison.OrdinalIgnoreCase) ? "all" : "unread";

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