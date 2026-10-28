using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Dashboard.Resumen;

namespace GraphApi.Services.Dashboard.Resumen
{
    public sealed class ResumenDashboardService : IResumenDashboardService
    {
        private readonly IConnectionFactory _connectionFactory;

        public ResumenDashboardService(IConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<clResumenDashboard> GetResumenAsync(RequestContextData ctx)
        {
            using var db = _connectionFactory.Create(ctx.EnvironmentKey);

            const string sql = @"
SELECT
    (SELECT COUNT(*) FROM sgr.Condominios WITH (NOLOCK) WHERE bEliminado = 0) AS TotalCondominios,
    (SELECT COUNT(*) FROM sgr.Casas WITH (NOLOCK) WHERE bEliminado = 0) AS TotalCasas,
    (SELECT COUNT(*) FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 AND bActivoUsuario = 1) AS UsuariosActivos,
    (SELECT COUNT(*) FROM sgr.Usuarios WITH (NOLOCK) WHERE bEliminado = 0 AND bAdministrador = 1) AS Administradores,
    (SELECT COUNT(*) FROM vts.Visitas WITH (NOLOCK) WHERE bEliminado = 0 AND CAST(FechaEntrada AS date) = CAST(GETDATE() AS date)) AS VisitasHoy,
    (SELECT COUNT(*) FROM vts.Visitas WITH (NOLOCK) WHERE bEliminado = 0 AND FechaSalida IS NULL) AS VisitasAbiertas,
    (SELECT COUNT(*) FROM vts.ReservacionesArea ra WITH (NOLOCK)
      INNER JOIN vts.ReservacionesEstados re WITH (NOLOCK) ON re.ReservacionEstadoID = ra.ReservacionEstadoID
      WHERE ra.bEliminado = 0
        AND ra.FechaInicio <= GETDATE()
        AND ra.FechaFin >= GETDATE()
        AND re.ReservacionEstado NOT IN (N'Cancelada', N'Cancelado', N'Rechazada', N'Rechazado')) AS ReservacionesActivas,
    (SELECT COUNT(*) FROM tkt.Tickets t WITH (NOLOCK)
      INNER JOIN tkt.EstadosTickets e WITH (NOLOCK) ON e.EstadoTicketID = t.EstadoTicketID
      WHERE t.bEliminado = 0
        AND e.EstadoTicket NOT IN (N'Cerrado', N'Finalizado', N'Resuelto', N'Cancelado', N'Cancelada')) AS TicketsAbiertos,
    (SELECT COUNT(*) FROM fnz.Cuotas WITH (NOLOCK) WHERE bEliminado = 0 AND Pagado = 0) AS CuotasPendientes,
    (SELECT COUNT(*) FROM ntf.Notificaciones WITH (NOLOCK) WHERE bEliminado = 0 AND UsuarioID = @UsuarioID AND Leido = 0) AS NotificacionesNoLeidas,
    (SELECT COUNT(*) FROM jnt.Juntas WITH (NOLOCK) WHERE bEliminado = 0 AND bActivo = 1) AS JuntasActivas,
    (SELECT COUNT(*) FROM vts.AreasComunes WITH (NOLOCK) WHERE bEliminado = 0) AS AreasComunes,
    (SELECT COUNT(*) FROM anm.Anuncios WITH (NOLOCK)
      WHERE bEliminado = 0
        AND FechaPublicacion <= GETDATE()
        AND (VigenteHasta IS NULL OR VigenteHasta >= GETDATE())) AS AnunciosVigentes,
    (SELECT TOP 1 NombreCondominio FROM sgr.vsCasas WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY CasaID) AS NombreCondominio;

SELECT TOP 5
    VisitaGeneradaID,
    NombreVisitante,
    NombreVisitado,
    FechaEmision,
    FechaExpira,
    bUsado
FROM vts.vsVisitasGeneradas WITH (NOLOCK)
WHERE bEliminado = 0
ORDER BY FechaEmision DESC;

SELECT TOP 5
    TicketID,
    TituloTicket,
    NombreSolicitante,
    PrioridadTicket,
    EstadoTicket,
    FechaCreacionTicket,
    FechaCierre
FROM tkt.vsTickets WITH (NOLOCK)
WHERE bEliminado = 0
ORDER BY FechaCreacionTicket DESC;

SELECT TOP 5
    ReservacionAreaID,
    AreasComunes,
    NombreUsuario,
    FechaInicio,
    FechaFin,
    ReservacionEstado
FROM vts.vsReservacionesArea WITH (NOLOCK)
WHERE bEliminado = 0
ORDER BY FechaInicio DESC;";

            using var grid = await db.QueryMultipleAsync(sql, new { UsuarioID = ctx.UserId });

            var resumen = (await grid.ReadAsync<clResumenDashboard>()).Single();
            resumen.VisitasRecientes = (await grid.ReadAsync<clDashboardVisitaReciente>()).ToList();
            resumen.TicketsRecientes = (await grid.ReadAsync<clDashboardTicketReciente>()).ToList();
            resumen.ReservacionesRecientes = (await grid.ReadAsync<clDashboardReservacionReciente>()).ToList();

            return resumen;
        }
    }
}