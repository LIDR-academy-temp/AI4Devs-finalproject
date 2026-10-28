namespace GraphApi.Models.Dashboard.Resumen
{
    public sealed class clResumenDashboard
    {
        public string? NombreCondominio { get; set; }
        public int TotalCondominios { get; set; }
        public int TotalCasas { get; set; }
        public int UsuariosActivos { get; set; }
        public int Administradores { get; set; }
        public int VisitasHoy { get; set; }
        public int VisitasAbiertas { get; set; }
        public int ReservacionesActivas { get; set; }
        public int TicketsAbiertos { get; set; }
        public int CuotasPendientes { get; set; }
        public int NotificacionesNoLeidas { get; set; }
        public int JuntasActivas { get; set; }
        public int AreasComunes { get; set; }
        public int AnunciosVigentes { get; set; }
        public IReadOnlyList<clDashboardVisitaReciente> VisitasRecientes { get; set; } = Array.Empty<clDashboardVisitaReciente>();
        public IReadOnlyList<clDashboardTicketReciente> TicketsRecientes { get; set; } = Array.Empty<clDashboardTicketReciente>();
        public IReadOnlyList<clDashboardReservacionReciente> ReservacionesRecientes { get; set; } = Array.Empty<clDashboardReservacionReciente>();
    }

    public sealed class clDashboardVisitaReciente
    {
        public int VisitaGeneradaID { get; set; }
        public string NombreVisitante { get; set; } = default!;
        public string NombreVisitado { get; set; } = default!;
        public DateTime FechaEmision { get; set; }
        public DateTime? FechaExpira { get; set; }
        public bool bUsado { get; set; }
    }

    public sealed class clDashboardTicketReciente
    {
        public int TicketID { get; set; }
        public string TituloTicket { get; set; } = default!;
        public string NombreSolicitante { get; set; } = default!;
        public string PrioridadTicket { get; set; } = default!;
        public string EstadoTicket { get; set; } = default!;
        public DateTime FechaCreacionTicket { get; set; }
        public DateTime? FechaCierre { get; set; }
    }

    public sealed class clDashboardReservacionReciente
    {
        public int ReservacionAreaID { get; set; }
        public string AreasComunes { get; set; } = default!;
        public string NombreUsuario { get; set; } = default!;
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string ReservacionEstado { get; set; } = default!;
    }
}