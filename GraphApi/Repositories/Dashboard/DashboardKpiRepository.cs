using System.Data;
using Dapper;

namespace GraphApi.Repositories.Dashboard;

public sealed class DashboardKpiRepository : IDashboardKpiRepository
{
    private readonly IDbConnection _db;

    public DashboardKpiRepository(IDbConnection db) => _db = db;

    public async Task<AdminKpiRaw> LoadAdminAsync(
        DateTime hoyLocal,
        DateTime periodoInicio,
        DateTime periodoFin,
        int condominioId,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM tkt.vsTickets WITH (NOLOCK)
             WHERE EstadoTicket = N'Nuevo';

            SELECT COUNT(*) FROM tkt.vsTickets WITH (NOLOCK)
             WHERE EstadoTicket = N'En seguimiento';

            SELECT COUNT(DISTINCT UsuarioID) FROM fnz.Cuotas WITH (NOLOCK)
             WHERE Pagado = 0 AND FechaVencimiento < @Hoy AND bEliminado = 0;

            SELECT ISNULL(SUM(CASE WHEN Pagado = 1 THEN Monto END), 0) AS MontoCobrado,
                   ISNULL(SUM(CASE WHEN Pagado = 0 THEN Monto END), 0) AS MontoPendiente
              FROM fnz.Cuotas WITH (NOLOCK)
             WHERE PeriodoInicio >= @Inicio AND PeriodoInicio < @Fin AND bEliminado = 0;

            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN o.CasaID IS NOT NULL THEN 1 ELSE 0 END) AS Ocupadas
              FROM sgr.Casas c WITH (NOLOCK)
              LEFT JOIN (
                    SELECT DISTINCT o.CasaID
                      FROM sgr.CasaOcupantes o WITH (NOLOCK)
                     WHERE o.Vigente = 1 AND o.bEliminado = 0
              ) o ON o.CasaID = c.CasaID
             WHERE c.CondominioID = @CondominioID AND c.bEliminado = 0;

            SELECT N'Otro' AS Canal, COUNT(*) AS Total
              FROM tkt.Tickets t WITH (NOLOCK)
             WHERE t.FechaCreacionTicket >= @Inicio AND t.FechaCreacionTicket < @Fin
               AND t.bEliminado = 0;
            """;

        await using var grid = await _db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    Hoy = hoyLocal,
                    Inicio = periodoInicio,
                    Fin = periodoFin,
                    CondominioID = condominioId,
                },
                cancellationToken: ct));

        var ticketsNuevos = await grid.ReadSingleAsync<int>();
        var ticketsEnSeguimiento = await grid.ReadSingleAsync<int>();
        var morososMes = await grid.ReadSingleAsync<int>();
        var montos = await grid.ReadSingleAsync<MontoMesRow>();
        var ocupacion = await grid.ReadSingleAsync<(int Total, int Ocupadas)>();
        var canales = (await grid.ReadAsync<CanalCountRow>()).ToList();

        return new AdminKpiRaw
        {
            TicketsNuevos = ticketsNuevos,
            TicketsEnSeguimiento = ticketsEnSeguimiento,
            MorososMes = morososMes,
            MontoCobrado = montos.MontoCobrado,
            MontoPendiente = montos.MontoPendiente,
            TotalCasas = ocupacion.Total,
            CasasOcupadas = ocupacion.Ocupadas,
            TicketsPorCanal = canales,
        };
    }

    public async Task<ResidenteKpiRaw> LoadResidenteAsync(
        int usuarioId,
        DateTime hoyLocal,
        DateTime periodoInicio,
        DateTime periodoFin,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM tkt.vsTickets WITH (NOLOCK)
             WHERE UsuarioSolicitanteID = @UsuarioID AND EstadoTicket <> N'Cerrado';

            SELECT TOP 1 Monto, FechaVencimiento, Pagado
              FROM fnz.Cuotas WITH (NOLOCK)
             WHERE UsuarioID = @UsuarioID
               AND PeriodoInicio >= @Inicio AND PeriodoInicio < @Fin
               AND bEliminado = 0
             ORDER BY FechaVencimiento;

            SELECT CAST(CASE WHEN EXISTS (
                SELECT 1 FROM fnz.Cuotas WITH (NOLOCK)
                 WHERE UsuarioID = @UsuarioID
                   AND Pagado = 0
                   AND FechaVencimiento < @Hoy
                   AND bEliminado = 0)
                THEN 1 ELSE 0 END AS BIT);

            SELECT COUNT(*)
              FROM ntf.Notificaciones AS n WITH (NOLOCK)
             WHERE n.UsuarioID = @UsuarioID
               AND n.bEliminado = 0
               AND NOT EXISTS (
                   SELECT 1 FROM ntf.NotificacionesVisualizadas AS v WITH (NOLOCK)
                    WHERE v.NotificacionID = n.NotificacionID
                      AND v.UsuarioID = @UsuarioID
                      AND v.bEliminado = 0);
            """;

        await using var grid = await _db.QueryMultipleAsync(
            new CommandDefinition(
                sql,
                new
                {
                    UsuarioID = usuarioId,
                    Hoy = hoyLocal,
                    Inicio = periodoInicio,
                    Fin = periodoFin,
                },
                cancellationToken: ct));

        var ticketsActivos = await grid.ReadSingleAsync<int>();
        var cuota = await grid.ReadFirstOrDefaultAsync<CuotaPeriodoRow>();
        var tieneVencida = await grid.ReadSingleAsync<bool>();
        var noLeidas = await grid.ReadSingleAsync<int>();

        return new ResidenteKpiRaw
        {
            TicketsActivos = ticketsActivos,
            CuotaPeriodo = cuota,
            TieneCuotaVencida = tieneVencida,
            NotificacionesNoLeidas = noLeidas,
        };
    }
}
