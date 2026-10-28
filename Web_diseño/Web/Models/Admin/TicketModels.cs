using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Web.Models.Admin
{
    public sealed class TicketBoardItemViewModel
    {
        public int? TicketID { get; set; }

        [Required]
        [Display(Name = "Título")]
        public string TituloTicket { get; set; } = string.Empty;

        [Display(Name = "Descripción")]
        public string? DescripcionTicket { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un solicitante.")]
        [Display(Name = "Solicitante")]
        public int UsuarioSolicitanteID { get; set; }

        [Display(Name = "Solicitante")]
        public string? NombreSolicitante { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona una prioridad.")]
        [Display(Name = "Prioridad")]
        public int PrioridadTicketID { get; set; }

        [Display(Name = "Prioridad")]
        public string? PrioridadTicket { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un estado.")]
        [Display(Name = "Estado")]
        public int EstadoTicketID { get; set; }

        [Display(Name = "Estado")]
        public string? EstadoTicket { get; set; }

        [Display(Name = "Fecha de creación")]
        public DateTime FechaCreacionTicket { get; set; } = DateTime.Now;

        [Display(Name = "Fecha de cierre")]
        public DateTime? FechaCierre { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        public int ComentariosCount { get; set; }
        public int AsignacionesCount { get; set; }
        public int AdjuntosCount { get; set; }
        public string? UltimoComentario { get; set; }
        public DateTime? UltimaActividad { get; set; }
        public string? UsuarioAsignado { get; set; }
        public int? UsuarioAsignadoID { get; set; }

        public bool EsAbierto => !EsCerrado && !EsResuelto;
        public bool EsCerrado => !string.IsNullOrWhiteSpace(EstadoTicket)
            && EstadoTicket.Contains("cerr", StringComparison.OrdinalIgnoreCase);
        public bool EsResuelto => !string.IsNullOrWhiteSpace(EstadoTicket)
            && (EstadoTicket.Contains("resuel", StringComparison.OrdinalIgnoreCase) || EstadoTicket.Contains("soluc", StringComparison.OrdinalIgnoreCase));
        public bool EnSeguimiento => EsAbierto && ComentariosCount > 0;

        public string EstadoTemporal => EsCerrado
            ? "Cerrado"
            : EsResuelto
                ? "Resuelto"
                : EnSeguimiento
                    ? "En seguimiento"
                    : "Abierto";

        public string EstadoTemporalClase => EsCerrado
            ? "badge-secondary"
            : EsResuelto
                ? "badge-success"
                : EnSeguimiento
                    ? "badge-info"
                    : "badge-warning";

        public string PrioridadClase => PrioridadTicket?.ToLowerInvariant() switch
        {
            "critica" or "crítica" => "badge-danger",
            "alta" => "badge-warning",
            "media" => "badge-info",
            "baja" => "badge-secondary",
            _ => "badge-primary"
        };

        public string Resumen => string.IsNullOrWhiteSpace(DescripcionTicket)
            ? TituloTicket
            : DescripcionTicket.Length > 130
                ? DescripcionTicket[..130] + "..."
                : DescripcionTicket;

        // --- Age / SLA helpers ---
        public TimeSpan AgeSpan => DateTime.UtcNow - FechaCreacionTicket;

        /// CSS badge class reflecting urgency (only meaningful for non-closed tickets).
        public string AgeClase => EsCerrado
            ? "badge-secondary"
            : AgeSpan.TotalHours < 24 ? "badge-success"
            : AgeSpan.TotalDays <= 3  ? "badge-warning"
            : "badge-danger";

        /// Short human-readable age string.
        public string AgeTexto => EsCerrado
            ? "Cerrado"
            : AgeSpan.TotalHours < 1   ? "< 1h"
            : AgeSpan.TotalHours < 24  ? $"{(int)AgeSpan.TotalHours}h"
            : AgeSpan.TotalDays  < 2   ? "1d"
            : $"{(int)AgeSpan.TotalDays}d";

        /// Sort weight for urgency ordering (lower = more urgent).
        public int UrgencyOrder =>
            EsCerrado ? 100
            : AgeSpan.TotalDays > 3 ? 0
            : AgeSpan.TotalDays > 1 ? 1
            : 2;
    }

    public sealed class TicketBoardCommentViewModel
    {
        public int? ComentarioTicketID { get; set; }
        public int TicketID { get; set; }
        public int UsuarioID { get; set; }
        public string? NombreUsuario { get; set; }
        public string? Comentario { get; set; }
        public DateTime FechaComentario { get; set; }
        public bool bEliminado { get; set; }

        public string FechaTexto => FechaComentario.ToString("dd/MM/yyyy HH:mm");
    }

    public sealed class TicketBoardAssignmentViewModel
    {
        public int? TicketsUsuariosAsignadosID { get; set; }
        public int TicketID { get; set; }
        public int UsuarioID { get; set; }
        public string? UsuarioAsignado { get; set; }
        public bool Terminado { get; set; }
        public bool bEliminado { get; set; }

        public string EstadoTexto => Terminado ? "Terminado" : "Activo";
        public string EstadoClase => Terminado ? "badge-success" : "badge-warning";
    }

    public sealed class TicketBoardAttachmentViewModel
    {
        public int DocumentoTicketID { get; set; }
        public int TicketID { get; set; }
        public int DocumentoID { get; set; }
        public string NombreArchivo { get; set; } = string.Empty;
        public string? RutaArchivo { get; set; }
        public string? TipoArchivo { get; set; }
        public bool EsPrivado { get; set; }
        public int? UsuarioCreacionID { get; set; }
        public string? CreadoPor { get; set; }
        public DateTime? FechaCreacion { get; set; }

        public string FechaTexto => FechaCreacion.HasValue
            ? FechaCreacion.Value.ToString("dd/MM/yyyy HH:mm")
            : "Sin fecha";

        public string? UrlArchivo => string.IsNullOrWhiteSpace(RutaArchivo)
            ? null
            : "/" + RutaArchivo.TrimStart('/');
    }

    public sealed class TicketBoardAttachmentFormViewModel
    {
        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un ticket.")]
        public int TicketID { get; set; }

        [Display(Name = "Archivo")]
        public IFormFile? Archivo { get; set; }

        public bool bEliminado { get; set; }
    }

    public sealed class TicketBoardStateLookupViewModel
    {
        public int EstadoTicketID { get; set; }
        public string? EstadoTicket { get; set; }
        public bool? bEliminado { get; set; }

        public string DisplayText => string.IsNullOrWhiteSpace(EstadoTicket)
            ? $"Estado {EstadoTicketID}"
            : EstadoTicket;
    }

    public sealed class TicketBoardPriorityLookupViewModel
    {
        public int PrioridadTicketID { get; set; }
        public string? PrioridadTicket { get; set; }
        public bool? bEliminado { get; set; }

        public string DisplayText => string.IsNullOrWhiteSpace(PrioridadTicket)
            ? $"Prioridad {PrioridadTicketID}"
            : PrioridadTicket;
    }

    public sealed class TicketBoardReplyViewModel
    {
        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un ticket.")]
        public int TicketID { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un usuario.")]
        [Display(Name = "Responder como")]
        public int UsuarioID { get; set; }

        [Required]
        [Display(Name = "Respuesta")]
        public string Comentario { get; set; } = string.Empty;

        [Display(Name = "Cambiar a estado")]
        public int? NuevoEstadoTicketID { get; set; }

        [Display(Name = "Cerrar ticket")]
        public bool CerrarTicket { get; set; }

        public bool bEliminado { get; set; }
    }

    public sealed class TicketBoardAssignmentFormViewModel
    {
        public int? TicketsUsuariosAsignadosID { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un ticket.")]
        public int TicketID { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Selecciona un usuario.")]
        [Display(Name = "Asignar a")]
        public int UsuarioID { get; set; }

        [Display(Name = "Terminado")]
        public bool Terminado { get; set; }

        public bool bEliminado { get; set; }
    }

    public sealed class TicketBoardFilterViewModel
    {
        [Display(Name = "Buscar")]
        public string? Search { get; set; }

        [Display(Name = "Estado")]
        public int? EstadoTicketID { get; set; }

        [Display(Name = "Prioridad")]
        public int? PrioridadTicketID { get; set; }

        [Display(Name = "Solicitante")]
        public int? UsuarioSolicitanteID { get; set; }

        [Display(Name = "Asignado")]
        public int? UsuarioAsignadoID { get; set; }

        [Display(Name = "Solo abiertos")]
        public bool SoloAbiertos { get; set; }

        [Display(Name = "Mis tickets")]
        public bool SoloMisTickets { get; set; }
    }

    public sealed class TicketBoardTimelineViewModel
    {
        public string Tipo { get; set; } = string.Empty;
        public string Titulo { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? Autor { get; set; }
        public DateTime Fecha { get; set; }
        public string IconoClase { get; set; } = "mdi mdi-comment-text-outline";
        public string BadgeClase { get; set; } = "badge-info";

        public string FechaTexto => Fecha.ToString("dd/MM/yyyy HH:mm");
    }

    public sealed class TicketBoardPageViewModel
    {
        public IReadOnlyList<TicketBoardItemViewModel> Items { get; set; } = Array.Empty<TicketBoardItemViewModel>();
        public TicketBoardItemViewModel Form { get; set; } = new();
        public TicketBoardItemViewModel? SelectedTicket { get; set; }
        public bool IsCreateMode { get; set; }
        public IReadOnlyList<TicketBoardTimelineViewModel> Timeline { get; set; } = Array.Empty<TicketBoardTimelineViewModel>();
        public TicketBoardReplyViewModel ReplyForm { get; set; } = new();
        public TicketBoardAssignmentFormViewModel AssignmentForm { get; set; } = new();
        public TicketBoardAttachmentFormViewModel AttachmentForm { get; set; } = new();
        public IReadOnlyList<TicketBoardAttachmentViewModel> Attachments { get; set; } = Array.Empty<TicketBoardAttachmentViewModel>();
        public TicketBoardFilterViewModel Filter { get; set; } = new();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> EstadoOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> PrioridadOptions { get; set; } = Array.Empty<SelectListItem>();
        public int TotalTickets { get; set; }
        public int TotalAbiertos { get; set; }
        public int TotalEnSeguimiento { get; set; }
        public int TotalResueltos { get; set; }
        public int TotalCerrados { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
        public string? Warning { get; set; }
        public bool PuedeGuardar { get; set; }
        public bool FocusDetail { get; set; }

        /// Username of the currently logged-in user (used to highlight/filter "my tickets").
        public string? CurrentUserName { get; set; }
    }
}