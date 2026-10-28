using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using Web.Models.Admin;
using Web.Models.Residente;

namespace Web.Services
{
    public sealed class ResidentPortalService : IResidentPortalService
    {
        private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

        private readonly IGraphApiBackendService _backend;
        private readonly IMemoryCache _cache;

        public ResidentPortalService(IGraphApiBackendService backend, IMemoryCache cache)
        {
            _backend = backend;
            _cache = cache;
        }

        public async Task<bool> HasResidentPropertiesAsync(int usuarioId)
        {
            return (await GetResidentPropertiesAsync(usuarioId)).Count > 0;
        }

        public async Task<IReadOnlyList<ResidentPropertyOptionViewModel>> GetResidentPropertiesAsync(int usuarioId)
        {
            if (usuarioId <= 0)
            {
                return Array.Empty<ResidentPropertyOptionViewModel>();
            }

            var cacheKey = $"resident-properties:{usuarioId}";
            if (_cache.TryGetValue(cacheKey, out IReadOnlyList<ResidentPropertyOptionViewModel>? cachedProperties)
                && cachedProperties is not null)
            {
                return cachedProperties;
            }

            var casasTask = _backend.GetCasasAsync();
            var condominiosTask = _backend.GetCondominiosAsync();
            await Task.WhenAll(casasTask, condominiosTask);

            var condominios = condominiosTask.Result
                .Where(item => !item.bEliminado && item.CondominioID.HasValue)
                .ToDictionary(item => item.CondominioID!.Value);

            var properties = casasTask.Result
                .Where(item => !item.bEliminado
                    && item.CasaID.HasValue
                    && item.PropietarioUsuarioID == usuarioId
                    && condominios.ContainsKey(item.CondominioID))
                .Select(item =>
                {
                    var condominio = condominios[item.CondominioID];

                    return new ResidentPropertyOptionViewModel
                    {
                        CondominioId = item.CondominioID,
                        CondominioName = condominio.NombreCondominio,
                        CondominioAddress = condominio.DireccionCondominio,
                        CasaId = item.CasaID!.Value,
                        CasaLabel = BuildCasaLabel(item)
                    };
                })
                .OrderBy(item => item.CondominioName)
                .ThenBy(item => item.CasaLabel)
                .ToList();

            _cache.Set(cacheKey, properties, CacheDuration);
            return properties;
        }

        public async Task<ResidentPortalContextViewModel> GetContextAsync(ClaimsPrincipal user)
        {
            var usuarioId = CotoContext.GetUsuarioId(user);
            var isAdministrador = CotoContext.GetIsAdministrador(user);
            var selectedCondominioId = CotoContext.GetSelectedCondominioId(user);
            var selectedCondominioName = CotoContext.GetSelectedCondominioName(user);
            var selectedCasaId = CotoContext.GetSelectedCasaId(user);
            var selectedCasaLabel = CotoContext.GetSelectedCasaLabel(user);

            var context = new ResidentPortalContextViewModel
            {
                UsuarioId = usuarioId,
                IsAdministrador = isAdministrador,
                SelectedCondominioId = selectedCondominioId,
                SelectedCondominioName = selectedCondominioName,
                SelectedCasaId = selectedCasaId,
                SelectedCasaLabel = selectedCasaLabel
            };

            if (isAdministrador)
            {
                return context;
            }

            var properties = (await GetResidentPropertiesAsync(usuarioId)).ToList();
            context.Properties = properties;
            context.IsResident = properties.Count > 0;

            if (properties.Count == 0)
            {
                context.StatusTitle = "Sin vivienda vinculada";
                context.StatusMessage = "Tu usuario no tiene una casa asignada como propietario. Solicita a administración que vincule tu vivienda para habilitar el portal residente.";
                return context;
            }

            var selectedProperty = ResolveSelectedProperty(properties, selectedCondominioId, selectedCasaId);

            if (selectedProperty is null)
            {
                context.RequiresPropertySelection = true;
                context.StatusTitle = "Selecciona una vivienda";
                context.StatusMessage = "Tu sesión ya está autenticada, pero necesitas elegir cuál vivienda quieres administrar en este momento.";
                return context;
            }

            context.SelectedCondominioId = selectedProperty.CondominioId;
            context.SelectedCondominioName = selectedProperty.CondominioName;
            context.SelectedCasaId = selectedProperty.CasaId;
            context.SelectedCasaLabel = selectedProperty.CasaLabel;
            context.RequiresPropertySelection = false;
            return context;
        }

        public async Task<ResidentHomePageViewModel> GetHomeAsync(ClaimsPrincipal user)
        {
            var context = await GetContextAsync(user);
            var home = new ResidentHomePageViewModel
            {
                Context = context,
                Message = context.HasActiveProperty ? null : context.StatusMessage
            };

            if (!context.IsResident || !context.HasActiveProperty)
            {
                return home;
            }

            var badgeSnapshot = await GetBadgeSnapshotAsync(context);
            var pendingSurveys = await GetPendingSurveyCountAsync(context.UsuarioId);

            home.PendingSurveys = pendingSurveys;
            home.Badges = new List<ResidentShellBadgeViewModel>
            {
                new()
                {
                    Label = "Notificaciones",
                    Count = badgeSnapshot.UnreadNotifications,
                    Icon = "mdi-bell-ring-outline",
                    ToneClass = "info"
                },
                new()
                {
                    Label = "Tickets abiertos",
                    Count = badgeSnapshot.OpenTickets,
                    Icon = "mdi-lifebuoy",
                    ToneClass = "warning",
                    Href = "/Residente/Tickets?tab=created"
                },
                new()
                {
                    Label = "Cuotas pendientes",
                    Count = badgeSnapshot.PendingPayments,
                    Icon = "mdi-cash-clock",
                    ToneClass = "danger",
                    Href = "/Residente/Cuenta"
                },
                new()
                {
                    Label = "Viviendas",
                    Count = context.Properties.Count,
                    Icon = "mdi-home-city-outline",
                    ToneClass = "primary",
                    Href = "/Residente/Vivienda"
                }
            };

            return home;
        }

        public async Task<ResidentMenuViewModel> BuildMenuAsync(ClaimsPrincipal user, IReadOnlyList<PerfilMenuItemViewModel> permissionMenus)
        {
            var context = await GetContextAsync(user);
            var menu = new ResidentMenuViewModel
            {
                PermissionMenus = context.IsResident && context.HasActiveProperty
                    ? permissionMenus
                    : context.IsResident
                        ? Array.Empty<PerfilMenuItemViewModel>()
                        : permissionMenus,
                ResidentContext = context.IsResident ? context : null
            };

            if (!context.IsResident || !context.HasActiveProperty)
            {
                return menu;
            }

            var badgeSnapshot = await GetBadgeSnapshotAsync(context);
            menu.Badges = new List<ResidentShellBadgeViewModel>
            {
                new()
                {
                    Label = "Sin leer",
                    Count = badgeSnapshot.UnreadNotifications,
                    Icon = "mdi-bell-outline",
                    ToneClass = "info",
                    Href = "/Residente/Notificaciones?tab=unread"
                },
                new()
                {
                    Label = "Tickets",
                    Count = badgeSnapshot.OpenTickets,
                    Icon = "mdi-lifebuoy",
                    ToneClass = "warning",
                    Href = "/Residente/Tickets?tab=created"
                },
                new()
                {
                    Label = "Cuotas",
                    Count = badgeSnapshot.PendingPayments,
                    Icon = "mdi-cash-clock",
                    ToneClass = "danger",
                    Href = "/Residente/Cuenta"
                }
            };

            return menu;
        }

        private static ResidentPropertyOptionViewModel? ResolveSelectedProperty(
            IReadOnlyList<ResidentPropertyOptionViewModel> properties,
            int? selectedCondominioId,
            int? selectedCasaId)
        {
            if (selectedCasaId.HasValue)
            {
                var selectedByCasa = properties.FirstOrDefault(item => item.CasaId == selectedCasaId.Value);
                if (selectedByCasa is not null)
                {
                    return selectedByCasa;
                }
            }

            if (selectedCondominioId.HasValue)
            {
                var sameCondominio = properties
                    .Where(item => item.CondominioId == selectedCondominioId.Value)
                    .ToList();

                if (sameCondominio.Count == 1)
                {
                    return sameCondominio[0];
                }
            }

            return properties.Count == 1 ? properties[0] : null;
        }

        private async Task<ResidentBadgeSnapshot> GetBadgeSnapshotAsync(ResidentPortalContextViewModel context)
        {
            var selectedCasaId = context.SelectedCasaId.GetValueOrDefault();
            var cacheKey = $"resident-badges:{context.UsuarioId}:{selectedCasaId}";
            if (_cache.TryGetValue(cacheKey, out ResidentBadgeSnapshot cachedSnapshot))
            {
                return cachedSnapshot;
            }

            var notificationsTask = _backend.GetNotificacionesAsync();
            var ticketsTask = _backend.GetTicketsAsync();
            var assignmentsTask = _backend.GetTicketsUsuariosAsignadosAsync();
            var cuotasTask = _backend.GetCuotasAsync();

            await Task.WhenAll(notificationsTask, ticketsTask, assignmentsTask, cuotasTask);

            var unreadNotifications = notificationsTask.Result.Count(item => item.UsuarioID == context.UsuarioId && !item.Leido && !item.bEliminado);

            var activeAssignedTicketIds = assignmentsTask.Result
                .Where(item => item.UsuarioID == context.UsuarioId && !item.Terminado && !item.bEliminado)
                .Select(item => item.TicketID)
                .ToHashSet();

            var openTickets = ticketsTask.Result.Count(item =>
                item.TicketID.HasValue
                && !item.bEliminado
                && !item.EsCerrado
                && !item.EsResuelto
                && (item.UsuarioSolicitanteID == context.UsuarioId || activeAssignedTicketIds.Contains(item.TicketID.Value)));

            var pendingPayments = cuotasTask.Result.Count(item =>
                !item.bEliminado
                && !item.Pagado
                && (context.SelectedCasaId.HasValue ? item.CasaID == context.SelectedCasaId.Value : item.UsuarioID == context.UsuarioId));

            var snapshot = new ResidentBadgeSnapshot(unreadNotifications, openTickets, pendingPayments);
            _cache.Set(cacheKey, snapshot, CacheDuration);
            return snapshot;
        }

        private async Task<int> GetPendingSurveyCountAsync(int usuarioId)
        {
            var cacheKey = $"resident-surveys:{usuarioId}";
            if (_cache.TryGetValue(cacheKey, out int cachedCount))
            {
                return cachedCount;
            }

            var encuestas = await _backend.GetEncuestasAsync();
            var activeSurveyIds = encuestas
                .Where(item => item.EncuestaID.HasValue && item.bActivo && !item.bEliminado)
                .Select(item => item.EncuestaID!.Value)
                .ToList();

            var pendingChecks = activeSurveyIds.Select(async encuestaId =>
                !await _backend.EncuestaYaRespondidaAsync(encuestaId, usuarioId));

            var results = await Task.WhenAll(pendingChecks);
            var pendingCount = results.Count(item => item);
            _cache.Set(cacheKey, pendingCount, CacheDuration);
            return pendingCount;
        }

        private static string BuildCasaLabel(CasaFormViewModel casa)
        {
            var direccion = casa.DireccionCasa?.Trim() ?? string.Empty;
            var numero = casa.NumeroExtCasa?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(direccion))
            {
                return string.IsNullOrWhiteSpace(numero) ? $"Casa {casa.CasaID}" : numero;
            }

            return string.IsNullOrWhiteSpace(numero)
                ? direccion
                : $"{direccion} {numero}";
        }

        private readonly record struct ResidentBadgeSnapshot(int UnreadNotifications, int OpenTickets, int PendingPayments);
    }
}