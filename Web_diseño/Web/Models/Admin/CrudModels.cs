using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Web.Models.Admin
{
    public sealed class CondominioFormViewModel
    {
        public int? CondominioID { get; set; }

        [Required]
        [Display(Name = "Condominio")]
        public string NombreCondominio { get; set; } = string.Empty;

        [Display(Name = "Dirección")]
        public string? DireccionCondominio { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }
    }

    public sealed class CasaFormViewModel
    {
        public int? CasaID { get; set; }

        [Required]
        [Display(Name = "Condominio")]
        public int CondominioID { get; set; }

        [Required]
        [Display(Name = "Dirección")]
        public string DireccionCasa { get; set; } = string.Empty;

        [Display(Name = "Condominio")]
        public string? NombreCondominio { get; set; }

        [Display(Name = "Dirección del condominio")]
        public string? DireccionCondominio { get; set; }

        [Required]
        [Display(Name = "Número exterior")]
        public string NumeroExtCasa { get; set; } = string.Empty;

        [Display(Name = "Propietario")]
        public int? PropietarioUsuarioID { get; set; }

        [Display(Name = "Nombre del propietario")]
        public string? NombrePropietario { get; set; }

        [Display(Name = "Correo del propietario")]
        public string? CorreoPropietario { get; set; }

        [Display(Name = "Teléfono del propietario")]
        public string? TelefonoPropietario { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        // ── Nuevo usuario propietario (solo al crear) ─────────────────────────
        [Display(Name = "Crear nuevo usuario propietario")]
        public bool CrearNuevoUsuario { get; set; }

        [Display(Name = "Nombre completo")]
        public string? NuevoUsuarioNombre { get; set; }

        [Display(Name = "Correo electrónico")]
        [EmailAddress]
        public string? NuevoUsuarioCorreo { get; set; }

        [Display(Name = "Contraseña temporal")]
        public string? NuevoUsuarioPassword { get; set; }
    }

    public sealed class VisitaFormViewModel
    {
        public int? VisitaID { get; set; }

        [Required]
        [Display(Name = "Visitante")]
        public string VisitanteNombre { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Usuario visitado")]
        public int UsuarioVisitadoID { get; set; }

        [Display(Name = "Nombre del usuario visitado")]
        public string? UsuarioVisitadoNombre { get; set; }

        [Display(Name = "Casa")]
        public int? CasaID { get; set; }

        [Display(Name = "Casa seleccionada")]
        public string? CasaDescripcion { get; set; }

        [Required]
        [Display(Name = "Tipo de identificación")]
        public int TipoIdentificacionID { get; set; }

        [Display(Name = "Tipo de identificación")]
        public string? TipoIdentificacionNombre { get; set; }

        [Required]
        [Display(Name = "Número de identificación")]
        public string NumeroIdentificacion { get; set; } = string.Empty;

        [Display(Name = "Ruta del documento")]
        public string? RutaDocumento { get; set; }

        [Display(Name = "Documento")]
        public IFormFile? DocumentoArchivo { get; set; }

        [Required]
        [Display(Name = "Fecha de entrada")]
        public DateTime FechaEntrada { get; set; } = DateTime.Now;

        [Display(Name = "Fecha de salida")]
        public DateTime? FechaSalida { get; set; }

        [Display(Name = "Autorizado")]
        public bool Autorizado { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        // Display properties — computed by controller, not persisted
        public string EstadoTemporal { get; set; } = "Programada";
        public string EstadoTemporalClase { get; set; } = "badge-info";
    }

    public sealed class AreaComunFormViewModel
    {
        public int? AreasComunesID { get; set; }

        [Required]
        [Display(Name = "Área común")]
        public string AreasComunes { get; set; } = string.Empty;

        [Display(Name = "Descripción")]
        public string? DescripcionAreasComunes { get; set; }

        [Display(Name = "Capacidad")]
        public int? Capacidad { get; set; }

        [Display(Name = "Requiere reservación")]
        public bool RequiereReservacion { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }
    }

    public sealed class CondominiosPageViewModel
    {
        public IReadOnlyList<CondominioFormViewModel> Items { get; set; } = Array.Empty<CondominioFormViewModel>();
        public CondominioFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivos { get; set; }
        public int TotalActivos { get; set; }
    }

    public sealed class CasasPageViewModel
    {
        public IReadOnlyList<CasaFormViewModel> Items { get; set; } = Array.Empty<CasaFormViewModel>();
        public CasaFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> CondominioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> PropietarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> FiltroCondominioOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int? FiltroCondominioId { get; set; }
        public int TotalActivas { get; set; }
        // Perfil Condomino (para crear nuevo usuario)
        public int? PerfilCondominoId { get; set; }
        public string? NombrePerfilCondomino { get; set; }
        // Contraseña temporal mostrada tras creación exitosa
        public string? PasswordTemporal { get; set; }
        public string? EmailEnviado { get; set; }
    }

    public sealed class VisitasPageViewModel
    {
        public IReadOnlyList<VisitaFormViewModel> Items { get; set; } = Array.Empty<VisitaFormViewModel>();
        public VisitaFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> CasaOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> TipoIdentificacionOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloProximas { get; set; }
    }

    public sealed class PaseQrFormViewModel
    {
        public int? VisitaGeneradaID { get; set; }

        [Required]
        [Display(Name = "Visitante")]
        public string NombreVisitante { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Vecino visitado")]
        public int UsuarioVisitadoID { get; set; }

        [Display(Name = "Vecino visitado")]
        public string? NombreVisitado { get; set; }

        [Display(Name = "Correo del vecino")]
        public string? CorreoVisitado { get; set; }

        [Display(Name = "Casa")]
        public int? CasaID { get; set; }

        [Display(Name = "Dirección de la casa")]
        public string? DireccionCasa { get; set; }

        [Display(Name = "Número exterior")]
        public string? NumeroExtCasa { get; set; }

        [Required]
        [Display(Name = "Tipo de identificación")]
        public int TipoIdentificacionID { get; set; }

        [Display(Name = "Tipo de identificación")]
        public string? TipoIdentificacion { get; set; }

        [Required]
        [Display(Name = "Número de identificación")]
        public string NumeroIdentificacion { get; set; } = string.Empty;

        [Display(Name = "Ruta del documento")]
        public string? RutaDocumento { get; set; }

        [Display(Name = "Código QR")]
        public string CodigoQR { get; set; } = string.Empty;

        [Display(Name = "Fecha de emisión")]
        public DateTime? FechaEmision { get; set; } = DateTime.Now;

        [Display(Name = "Fecha de expiración")]
        public DateTime? FechaExpira { get; set; } = DateTime.Now.AddHours(4);

        [Display(Name = "Ya usado")]
        public bool bUsado { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        [Range(15, 10080)]
        [Display(Name = "Duración en minutos")]
        public int DuracionMinutos { get; set; } = 240;

        public string? ValidationUrl { get; set; }
        public string? WhatsAppUrl { get; set; }
        public string? QrImageDataUrl { get; set; }
        public string EstadoTexto { get; set; } = "Pendiente";
        public string EstadoClase { get; set; } = "badge-info";
    }

    public sealed class PaseQrPageViewModel
    {
        public IReadOnlyList<PaseQrFormViewModel> Items { get; set; } = Array.Empty<PaseQrFormViewModel>();
        public PaseQrFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> CasaOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> TipoIdentificacionOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloVigentes { get; set; }
        public int TotalVigentes { get; set; }
        public int TotalUsados { get; set; }
    }

    public sealed class PaseQrValidationViewModel
    {
        public string Codigo { get; set; } = string.Empty;
        public PaseQrFormViewModel? Pase { get; set; }
        public bool IsValid { get; set; }
        public bool IsExpired { get; set; }
        public bool IsUsed { get; set; }
        public bool IsDeleted { get; set; }
        public bool NotFound { get; set; }
        public string StatusTitulo { get; set; } = string.Empty;
        public string StatusMensaje { get; set; } = string.Empty;
        public string StatusClase { get; set; } = string.Empty;
        public string? ValidationUrl { get; set; }
        public string? WhatsAppUrl { get; set; }
    }

    public sealed class ReservaAmenidadFormViewModel
    {
        public int ReservacionAreaID { get; set; }

        [Display(Name = "Área común")]
        public int AreasComunesID { get; set; }

        [Display(Name = "Usuario")]
        public int UsuarioID { get; set; }

        [Display(Name = "Fecha de inicio")]
        public DateTime FechaInicio { get; set; }

        [Display(Name = "Fecha de fin")]
        public DateTime FechaFin { get; set; }

        [Display(Name = "Estado de la reserva")]
        public int ReservacionEstadoID { get; set; }

        public string? AreasComunes { get; set; }
        public string? NombreUsuario { get; set; }
        public string? CorreoUsuario { get; set; }
        public int? Capacidad { get; set; }
        public bool? RequiereReservacion { get; set; }
        public string? ReservacionEstado { get; set; }
        public string? Creado { get; set; }
        public string? Modificado { get; set; }
        public int? UsuarioCreacionID { get; set; }
        public int? UsuarioModificacionID { get; set; }
        public DateTime? FechaCreacion { get; set; }
        public DateTime? FechaModificacion { get; set; }
        public bool? bEliminado { get; set; }

        public string? DuracionTexto { get; set; }
        public bool TieneConflicto { get; set; }
        public string? ConflictoTexto { get; set; }
        public string EstadoTemporal { get; set; } = "Programada";
        public string EstadoTemporalClase { get; set; } = "badge-info";
    }

    public sealed class ReservaAmenidadPageViewModel
    {
        public IReadOnlyList<ReservaAmenidadFormViewModel> Items { get; set; } = Array.Empty<ReservaAmenidadFormViewModel>();
        public ReservaAmenidadFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> AreasOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> EstadoOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> FiltroAreaOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public string? Warning { get; set; }
        public bool PuedeGuardar { get; set; }
        public int TotalAmenidades { get; set; }
        public int TotalEstados { get; set; }
        public int TotalReservas { get; set; }
        public bool SoloActivas { get; set; }
        public int? FiltroAreaId { get; set; }
    }

    public sealed class ReservacionEstadoLookupViewModel
    {
        public int ReservacionEstadoID { get; set; }
        public string? ReservacionEstado { get; set; }
        public bool? bEliminado { get; set; }

        public string DisplayText => string.IsNullOrWhiteSpace(ReservacionEstado)
            ? $"Estado {ReservacionEstadoID}"
            : ReservacionEstado;
    }

    public sealed class AreasComunesPageViewModel
    {
        public IReadOnlyList<AreaComunFormViewModel> Items { get; set; } = Array.Empty<AreaComunFormViewModel>();
        public AreaComunFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int TotalActivas { get; set; }
    }

    public sealed class UsuarioLookupViewModel
    {
        public int? UsuarioID { get; set; }
        public string? NombreUsuario { get; set; }
        public string? CorreoUsuario { get; set; }
        public bool? bActivoUsuario { get; set; }
        public bool? bEliminado { get; set; }

        public string DisplayText => string.IsNullOrWhiteSpace(CorreoUsuario)
            ? (NombreUsuario ?? string.Empty)
            : $"{NombreUsuario} - {CorreoUsuario}";
    }

    public sealed class TipoIdentificacionLookupViewModel
    {
        public int? TipoIdentificacionID { get; set; }
        public string? TipoIdentificacion { get; set; }
        public bool? bEliminado { get; set; }
    }

    // ──────────────────────────────────────────────────────────
    // Finanzas — Cuentas
    // ──────────────────────────────────────────────────────────
    public sealed class CuentaFormViewModel
    {
        public int? CuentaID { get; set; }

        [Required]
        [Display(Name = "Nombre de cuenta")]
        public string Cuenta { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Tipo")]
        public string Tipo { get; set; } = string.Empty;

        [Display(Name = "Saldo")]
        public decimal Saldo { get; set; }

        [Display(Name = "Responsable")]
        public int? ResponsableUsuarioID { get; set; }

        [Display(Name = "Responsable")]
        public string? NombreResponsable { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }
    }

    public sealed class CuentasPageViewModel
    {
        public IReadOnlyList<CuentaFormViewModel> Items { get; set; } = Array.Empty<CuentaFormViewModel>();
        public CuentaFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> ResponsableOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int TotalActivas { get; set; }
    }

    // ──────────────────────────────────────────────────────────
    // Finanzas — Cuotas
    // ──────────────────────────────────────────────────────────
    public sealed class CuotaFormViewModel
    {
        public int? CuotaID { get; set; }

        [Required]
        [Display(Name = "Propietario")]
        public int UsuarioID { get; set; }

        [Display(Name = "Casa")]
        public int? CasaID { get; set; }

        [Required]
        [Display(Name = "Monto")]
        public decimal Monto { get; set; }

        [Required]
        [Display(Name = "Periodo inicio")]
        public DateTime PeriodoInicio { get; set; } = DateTime.Today.AddDays(1 - DateTime.Today.Day);

        [Required]
        [Display(Name = "Periodo fin")]
        public DateTime PeriodoFin { get; set; } = DateTime.Today.AddDays(1 - DateTime.Today.Day).AddMonths(1).AddDays(-1);

        [Required]
        [Display(Name = "Fecha vencimiento")]
        public DateTime FechaVencimiento { get; set; } = DateTime.Today.AddMonths(1);

        [Display(Name = "Pagado")]
        public bool Pagado { get; set; }

        [Display(Name = "Fecha de pago")]
        public DateTime? FechaPago { get; set; }

        [Display(Name = "Método de pago")]
        public string? MetodoPago { get; set; }

        [Display(Name = "Referencia de pago")]
        public string? ReferenciaPago { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        // display
        [Display(Name = "Propietario")]
        public string? NombrePropietario { get; set; }
        [Display(Name = "Casa")]
        public string? DireccionCasa { get; set; }
        [Display(Name = "Condominio")]
        public string? NombreCondominio { get; set; }
        public string EstadoCuota { get; set; } = string.Empty;
        public string EstadoCuotaClase { get; set; } = string.Empty;
    }

    public sealed class CuotasPageViewModel
    {
        public IReadOnlyList<CuotaFormViewModel> Items { get; set; } = Array.Empty<CuotaFormViewModel>();
        public CuotaFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> CasaOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloPendientes { get; set; }
        public int TotalPendientes { get; set; }
        public int TotalVencidas { get; set; }
    }

    // ──────────────────────────────────────────────────────────
    // Finanzas — TiposMovimiento lookup
    // ──────────────────────────────────────────────────────────
    public sealed class TipoMovimientoLookupViewModel
    {
        public int? TipoMovimientoID { get; set; }
        public string? TipoMovimiento { get; set; }
        public bool? bCargo { get; set; }
        public bool? bAbono { get; set; }
        public bool? bEliminado { get; set; }
    }

    // ──────────────────────────────────────────────────────────
    // Finanzas — Transacciones
    // ──────────────────────────────────────────────────────────
    public sealed class TransaccionFormViewModel
    {
        public int? TransaccionID { get; set; }

        [Required]
        [Display(Name = "Cuenta")]
        public int CuentaID { get; set; }

        [Required]
        [Display(Name = "Usuario")]
        public int UsuarioID { get; set; }

        [Required]
        [Display(Name = "Tipo de movimiento")]
        public int TipoMovimientoID { get; set; }

        [Display(Name = "Cargo")]
        public decimal? Cargo { get; set; }

        [Display(Name = "Abono")]
        public decimal? Abono { get; set; }

        [Display(Name = "Motivo")]
        public string? Motivo { get; set; }

        [Display(Name = "Eliminado")]
        public bool bEliminado { get; set; }

        // display
        [Display(Name = "Cuenta")]
        public string? NombreCuenta { get; set; }
        [Display(Name = "Tipo de cuenta")]
        public string? TipoCuenta { get; set; }
        [Display(Name = "Usuario")]
        public string? NombreUsuario { get; set; }
        [Display(Name = "Tipo de movimiento")]
        public string? TipoMovimiento { get; set; }
    }

    public sealed class TransaccionesPageViewModel
    {
        public IReadOnlyList<TransaccionFormViewModel> Items { get; set; } = Array.Empty<TransaccionFormViewModel>();
        public TransaccionFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> CuentaOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> TipoMovimientoOptions { get; set; } = Array.Empty<SelectListItem>();
        public IReadOnlyList<SelectListItem> FiltroCuentaOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int? FiltroCuentaId { get; set; }
        public int TotalActivas { get; set; }
    }

    // ─── Juntas ────────────────────────────────────────────────────────────────
    public sealed class JuntaFormViewModel
    {
        public int? JuntaID { get; set; }

        [Display(Name = "Título")]
        public string Titulo { get; set; } = string.Empty;

        [Display(Name = "Descripción")]
        public string? Descripcion { get; set; }

        [Display(Name = "Fecha programada")]
        public DateTime? FechaProgramada { get; set; }

        [Display(Name = "Ubicación")]
        public string? Ubicacion { get; set; }

        [Display(Name = "Activa")]
        public bool bActivo { get; set; } = true;
        public bool bEliminado { get; set; }
    }

    public sealed class JuntasPageViewModel
    {
        public IReadOnlyList<JuntaFormViewModel> Items { get; set; } = Array.Empty<JuntaFormViewModel>();
        public JuntaFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int TotalActivas { get; set; }
    }

    // ─── Calendario general ───────────────────────────────────────────────────
    public sealed class CalendarioViewModel
    {
        public IReadOnlyList<ReservaAmenidadFormViewModel> Reservas { get; set; } = Array.Empty<ReservaAmenidadFormViewModel>();
        public IReadOnlyList<JuntaFormViewModel>           Juntas   { get; set; } = Array.Empty<JuntaFormViewModel>();
        public string PageTitle { get; set; } = "Calendario";
        public string HomeHref { get; set; } = "/";
        public string HomeLabel { get; set; } = "Inicio";
    }

    // ─── Documentos / Archivos ────────────────────────────────────────────────
    public sealed class ArchivoFormViewModel
    {
        public int? ArchivoID { get; set; }

        [Display(Name = "Nombre")]
        public string Nombre { get; set; } = string.Empty;

        [Display(Name = "URL o ruta")]
        public string? Ruta { get; set; }

        [Display(Name = "Tipo de archivo")]
        public int? TipoArchivoID { get; set; }

        [Display(Name = "Tipo de archivo")]
        public string? TipoArchivo { get; set; }

        [Display(Name = "Privado")]
        public bool EsPrivado { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class ArchivosPageViewModel
    {
        public IReadOnlyList<ArchivoFormViewModel> Items { get; set; } = Array.Empty<ArchivoFormViewModel>();
        public ArchivoFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloPublicos { get; set; }
        public int TotalPublicos { get; set; }
    }

    // ─── Notificaciones Grupales ──────────────────────────────────────────────
    public sealed class NotificacionFormViewModel
    {
        public int? NotificacionID { get; set; }

        [Display(Name = "Usuario destino")]
        public int? UsuarioID { get; set; }

        [Display(Name = "Título")]
        public string Titulo { get; set; } = string.Empty;

        [Display(Name = "Mensaje")]
        public string? Mensaje { get; set; }

        [Display(Name = "Leída")]
        public bool Leido { get; set; }

        [Display(Name = "Fecha de creación")]
        public DateTime? FechaCreacionNotificacion { get; set; }

        [Display(Name = "Tipo de notificación")]
        public int? TipoNotificacionID { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class NotificacionesPageViewModel
    {
        public IReadOnlyList<NotificacionFormViewModel> Items { get; set; } = Array.Empty<NotificacionFormViewModel>();
        public NotificacionFormViewModel Form { get; set; } = new();
        public IReadOnlyList<SelectListItem> UsuarioOptions { get; set; } = Array.Empty<SelectListItem>();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloNoLeidas { get; set; }
        public int TotalNoLeidas { get; set; }
    }

    // ─── Perfil ───────────────────────────────────────────────────────────────
    public sealed class PerfilViewModel
    {
        public int? UsuarioID { get; set; }

        [Display(Name = "Nombre de usuario")]
        public string NombreUsuario { get; set; } = string.Empty;

        [Display(Name = "Correo electrónico")]
        public string CorreoUsuario { get; set; } = string.Empty;

        [Display(Name = "Teléfono")]
        public string? TelefonoUsuario { get; set; }

        [Display(Name = "Foto de perfil")]
        public string? FotoUrlUsuario { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
        public int? PerfilID { get; set; }
        public bool bAdministrador { get; set; }
        public bool bActualizarPassword { get; set; }
        public bool MustChangePassword { get; set; }
    }

    public sealed class CambiarPasswordViewModel
    {
        [Display(Name = "Contraseña actual")]
        public string PasswordActual { get; set; } = string.Empty;

        [Display(Name = "Nueva contraseña")]
        public string PasswordNuevo { get; set; } = string.Empty;

        [Display(Name = "Confirmar contraseña")]
        public string PasswordConfirmar { get; set; } = string.Empty;
    }

    // ─── Encuestas ────────────────────────────────────────────────────────────
    public sealed class EncuestaFormViewModel
    {
        public int? EncuestaID { get; set; }

        [Display(Name = "Título")]
        public string Titulo { get; set; } = string.Empty;

        [Display(Name = "Descripción")]
        public string? Descripcion { get; set; }

        [Display(Name = "Fecha de inicio")]
        public DateTime? FechaInicio { get; set; }

        [Display(Name = "Fecha de fin")]
        public DateTime? FechaFin { get; set; }

        [Display(Name = "Activa")]
        public bool bActivo { get; set; } = true;
        public bool bEliminado { get; set; }
    }

    public sealed class EncuestasPageViewModel
    {
        public IReadOnlyList<EncuestaFormViewModel> Items { get; set; } = Array.Empty<EncuestaFormViewModel>();
        public EncuestaFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
        public bool SoloActivas { get; set; }
        public int TotalActivas { get; set; }
    }

    public sealed class PreguntaFormViewModel
    {
        public int? PreguntaID { get; set; }
        public int? EncuestaID { get; set; }

        [Display(Name = "Pregunta")]
        public string Texto { get; set; } = string.Empty;

        [Display(Name = "Tipo de pregunta")]
        public int? TipoPreguntaID { get; set; }

        [Display(Name = "Orden")]
        public int? Orden { get; set; }

        [Display(Name = "Requerida")]
        public bool Requerida { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class OpcionPreguntaFormViewModel
    {
        public int? OpcionPreguntaID { get; set; }
        public int? PreguntaID { get; set; }

        [Display(Name = "Texto")]
        public string Texto { get; set; } = string.Empty;

        [Display(Name = "Valor")]
        public string? Valor { get; set; }

        [Display(Name = "Orden")]
        public int? Orden { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class EncuestaDetallePageViewModel
    {
        public EncuestaFormViewModel Encuesta { get; set; } = new();
        public IReadOnlyList<PreguntaFormViewModel> Preguntas { get; set; } = Array.Empty<PreguntaFormViewModel>();
        public IReadOnlyList<OpcionPreguntaFormViewModel> Opciones { get; set; } = Array.Empty<OpcionPreguntaFormViewModel>();
        public PreguntaFormViewModel FormPregunta { get; set; } = new();
        public OpcionPreguntaFormViewModel FormOpcion { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    // ─── Responder Encuesta (Residente) ──────────────────────────────────────
    public sealed class RespuestaEncuestaItemViewModel
    {
        public int PreguntaID { get; set; }
        public List<int> OpcionesSeleccionadas { get; set; } = new();
        public string? RespuestaTexto { get; set; }
    }

    public sealed class EncuestaResidenteItemViewModel
    {
        public EncuestaFormViewModel Encuesta { get; set; } = new();
        public bool YaRespondio { get; set; }
    }

    public sealed class EncuestasResidentePageViewModel
    {
        public IReadOnlyList<EncuestaResidenteItemViewModel> Items { get; set; } = Array.Empty<EncuestaResidenteItemViewModel>();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class EncuestaResponderViewModel
    {
        public EncuestaFormViewModel Encuesta { get; set; } = new();
        public IReadOnlyList<PreguntaFormViewModel> Preguntas { get; set; } = Array.Empty<PreguntaFormViewModel>();
        public IReadOnlyList<OpcionPreguntaFormViewModel> Opciones { get; set; } = Array.Empty<OpcionPreguntaFormViewModel>();
        public bool YaRespondio { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    // ─── Resultados Encuesta (Admin) ─────────────────────────────────────────
    public sealed class RespuestaRawViewModel
    {
        public int? RespuestaID { get; set; }
        public int? PreguntaID { get; set; }
        public int? UsuarioID { get; set; }
        public int? OpcionPreguntaID { get; set; }
        public string? RespuestaTexto { get; set; }
        public DateTime? FechaRespuesta { get; set; }
    }

    public sealed class ResultadoPreguntaViewModel
    {
        public int PreguntaID { get; set; }
        public string Texto { get; set; } = string.Empty;
        public int TipoPreguntaID { get; set; }
        public int Orden { get; set; }
        // Tipo 2/3: conteo por opcion
        public List<ResultadoOpcionViewModel> ConteoPorOpcion { get; set; } = new();
        // Tipo 1/5: lista de textos
        public List<string> Textos { get; set; } = new();
        // Tipo 4 (escala): promedio
        public double? PromedioEscala { get; set; }
        public int TotalRespuestas { get; set; }
    }

    public sealed class ResultadoOpcionViewModel
    {
        public int OpcionPreguntaID { get; set; }
        public string Texto { get; set; } = string.Empty;
        public int Conteo { get; set; }
        public double Porcentaje { get; set; }
    }

    public sealed class ResultadosEncuestaViewModel
    {
        public EncuestaFormViewModel Encuesta { get; set; } = new();
        public IReadOnlyList<ResultadoPreguntaViewModel> Preguntas { get; set; } = Array.Empty<ResultadoPreguntaViewModel>();
        public int TotalParticipantes { get; set; }
        public string? Error { get; set; }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────
    public sealed class DashboardViewModel    {
        public int CondominiosActivos { get; set; }
        public int CasasActivas { get; set; }
        public int VisitasHoy { get; set; }
        public int PasesVigentes { get; set; }
        public int ReservasProximas { get; set; }
        public int TicketsAbiertos { get; set; }
        public int EncuestasActivas { get; set; }
        public int CuotasPendientes { get; set; }
    }
}