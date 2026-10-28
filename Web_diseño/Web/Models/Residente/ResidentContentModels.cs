using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;

namespace Web.Models.Residente
{
    public sealed class ResidentDocumentListPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<ArchivoFormViewModel> Items { get; set; } = Array.Empty<ArchivoFormViewModel>();
        public IReadOnlyList<string> Categories { get; set; } = Array.Empty<string>();
        public string? Search { get; set; }
        public string? Category { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentDocumentDetailViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public ArchivoFormViewModel Document { get; set; } = new();
        public IReadOnlyList<ArchivoFormViewModel> RelatedDocuments { get; set; } = Array.Empty<ArchivoFormViewModel>();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentNotificationInboxViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<NotificacionFormViewModel> Items { get; set; } = Array.Empty<NotificacionFormViewModel>();
        public string Tab { get; set; } = "unread";
        public int TotalUnread { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentNotificationDetailViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public NotificacionFormViewModel Notification { get; set; } = new();
        public bool IsGlobal { get; set; }
        public bool MarkedAsRead { get; set; }
        public string BackTab { get; set; } = "unread";
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentSurveyListPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<EncuestaResidenteItemViewModel> Items { get; set; } = Array.Empty<EncuestaResidenteItemViewModel>();
        public int PendingCount { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentSurveyDetailViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public EncuestaFormViewModel Encuesta { get; set; } = new();
        public IReadOnlyList<PreguntaFormViewModel> Preguntas { get; set; } = Array.Empty<PreguntaFormViewModel>();
        public IReadOnlyList<OpcionPreguntaFormViewModel> Opciones { get; set; } = Array.Empty<OpcionPreguntaFormViewModel>();
        public bool YaRespondio { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentPropertyPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public ResidentPropertyOptionViewModel? ActiveProperty { get; set; }
        public CasaFormViewModel? ActiveCasa { get; set; }
        public CondominioFormViewModel? ActiveCondominio { get; set; }
        public IReadOnlyList<ResidentPropertyOptionViewModel> AvailableProperties { get; set; } = Array.Empty<ResidentPropertyOptionViewModel>();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentAccountPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<CuotaFormViewModel> Items { get; set; } = Array.Empty<CuotaFormViewModel>();
        public bool SoloPendientes { get; set; }
        public decimal SaldoPendiente { get; set; }
        public decimal TotalPagado { get; set; }
        public int CuotasPendientes { get; set; }
        public int CuotasVencidas { get; set; }
        public int CuotasPagadas { get; set; }
        public DateTime? ProximoVencimiento { get; set; }
        public decimal? ProximoMonto { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentReservationPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<ReservaAmenidadFormViewModel> Items { get; set; } = Array.Empty<ReservaAmenidadFormViewModel>();
        public ReservaAmenidadFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> AreasOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> EstadoOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public string? Warning { get; set; }
        public bool PuedeGuardar { get; set; }
        public bool SoloProximas { get; set; }
        public int TotalAmenidades { get; set; }
        public int TotalReservas { get; set; }
        public int TotalProximas { get; set; }
        public int TotalEnCurso { get; set; }
    }

    public sealed class ResidentVisitPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<VisitaFormViewModel> Items { get; set; } = Array.Empty<VisitaFormViewModel>();
        public VisitaFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> TipoIdentificacionOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloProximas { get; set; }
        public bool PuedeGuardar { get; set; }
        public int TotalVisitas { get; set; }
        public int TotalProximas { get; set; }
        public int TotalActivas { get; set; }
    }

    public sealed class ResidentPassPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<PaseQrFormViewModel> Items { get; set; } = Array.Empty<PaseQrFormViewModel>();
        public PaseQrFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> TipoIdentificacionOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloVigentes { get; set; }
        public bool PuedeGuardar { get; set; }
        public int TotalVigentes { get; set; }
        public int TotalUsados { get; set; }
    }
}