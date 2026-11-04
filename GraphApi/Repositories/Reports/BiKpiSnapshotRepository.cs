using System.Data;
using Dapper;
using GraphApi.Models.Reports;

namespace GraphApi.Repositories.Reports;

public sealed class BiKpiSnapshotRepository : IBiKpiSnapshotRepository
{
    private readonly IDbConnection _db;

    public BiKpiSnapshotRepository(IDbConnection db) => _db = db;

    public async Task<bool> ExistsAsync(int condominioId, DateOnly fecha, CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(1) FROM bi.KpiSnapshots WITH (NOLOCK)
             WHERE CondominioID = @CondominioId AND Fecha = @Fecha AND bEliminado = 0;
            """;
        var n = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { CondominioId = condominioId, Fecha = fecha }, cancellationToken: ct));
        return n > 0;
    }

    public async Task InsertAsync(int condominioId, DateOnly fecha, BiKpiCalculatedRow row, CancellationToken ct = default)
    {
        const string sql = """
            INSERT INTO bi.KpiSnapshots
                (CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, TiempoMedioResolucionHoras,
                 IngresosMXN, EgresosMXN, ResidentesMorosos, CasasTotales, CasasOcupadas,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CondominioId, @Fecha, @TicketsAbiertos, @TicketsCerrados, @TiempoMedioResolucionHoras,
                 @IngresosMXN, @EgresosMXN, @ResidentesMorosos, @CasasTotales, @CasasOcupadas,
                 N'sistema-bi', 0, SYSUTCDATETIME(), 0);
            """;
        await _db.ExecuteAsync(
            new CommandDefinition(
                sql,
                new
                {
                    CondominioId = condominioId,
                    Fecha = fecha,
                    row.TicketsAbiertos,
                    row.TicketsCerrados,
                    row.TiempoMedioResolucionHoras,
                    row.IngresosMXN,
                    row.EgresosMXN,
                    row.ResidentesMorosos,
                    row.CasasTotales,
                    row.CasasOcupadas,
                },
                cancellationToken: ct));
    }

    public async Task<IReadOnlyList<BiKpiSnapshotDto>> ListTendenciasAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default)
    {
        var desde = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-meses));
        const string sql = """
            SELECT Fecha AS Fecha,
                   TicketsAbiertos,
                   TicketsCerrados,
                   TiempoMedioResolucionHoras,
                   IngresosMXN,
                   EgresosMXN,
                   ResidentesMorosos,
                   CasasTotales,
                   CasasOcupadas
              FROM bi.KpiSnapshots WITH (NOLOCK)
             WHERE CondominioID = @CondominioId
               AND bEliminado = 0
               AND Fecha >= @Desde
             ORDER BY Fecha ASC;
            """;
        var rows = await _db.QueryAsync<BiKpiSnapshotDto>(
            new CommandDefinition(
                sql,
                new { CondominioId = condominioId, Desde = desde },
                cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<BiKpiCalculatedRow> CalculateAsync(int condominioId, DateOnly fecha, CancellationToken ct = default)
    {
        var inicioMes = new DateOnly(fecha.Year, fecha.Month, 1);
        var finExclusive = fecha.ToDateTime(TimeOnly.MinValue).AddDays(1);
        var inicioPeriodo = inicioMes.ToDateTime(TimeOnly.MinValue);
        const string sql = """
            SELECT COUNT(*) FROM tkt.Tickets t WITH (NOLOCK)
              INNER JOIN tkt.EstadosTickets e WITH (NOLOCK) ON e.EstadoTicketID = t.EstadoTicketID
             WHERE t.bEliminado = 0
               AND t.FechaCreacionTicket < @Fin
               AND e.EstadoTicket NOT IN (N'Cerrado', N'Finalizado', N'Resuelto', N'Cancelado', N'Cancelada')
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = t.UsuarioSolicitanteID AND co.Vigente = 1 AND co.bEliminado = 0);

            SELECT COUNT(*) FROM tkt.Tickets t WITH (NOLOCK)
             WHERE t.bEliminado = 0
               AND t.FechaCierre IS NOT NULL
               AND t.FechaCierre >= @Inicio AND t.FechaCierre < @Fin
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = t.UsuarioSolicitanteID AND co.Vigente = 1 AND co.bEliminado = 0);

            SELECT ISNULL(AVG(CAST(DATEDIFF(HOUR, t.FechaCreacionTicket, t.FechaCierre) AS DECIMAL(18,2))), 0)
              FROM tkt.Tickets t WITH (NOLOCK)
             WHERE t.bEliminado = 0
               AND t.FechaCierre IS NOT NULL
               AND t.FechaCierre >= @Inicio AND t.FechaCierre < @Fin
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = t.UsuarioSolicitanteID AND co.Vigente = 1 AND co.bEliminado = 0);

            SELECT ISNULL(SUM(c.Monto), 0) FROM fnz.Cuotas c WITH (NOLOCK)
              INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
             WHERE c.bEliminado = 0 AND c.Pagado = 1
               AND c.FechaPago >= @Inicio AND c.FechaPago < @Fin;

            SELECT ISNULL(SUM(tr.Cargo), 0) FROM fnz.Transacciones tr WITH (NOLOCK)
             WHERE tr.bEliminado = 0
               AND tr.FechaCreacion >= @Inicio AND tr.FechaCreacion < @Fin
               AND tr.Cargo IS NOT NULL
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = tr.UsuarioID AND co.Vigente = 1 AND co.bEliminado = 0);

            SELECT COUNT(DISTINCT c.UsuarioID) FROM fnz.Cuotas c WITH (NOLOCK)
              INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
             WHERE c.bEliminado = 0 AND c.Pagado = 0 AND c.FechaVencimiento < @InicioDate;

            SELECT COUNT(*) AS Total,
                   SUM(CASE WHEN o.CasaID IS NOT NULL THEN 1 ELSE 0 END) AS Ocupadas
              FROM sgr.Casas c WITH (NOLOCK)
              LEFT JOIN (
                    SELECT DISTINCT o.CasaID
                      FROM sgr.CasaOcupantes o WITH (NOLOCK)
                     WHERE o.Vigente = 1 AND o.bEliminado = 0
              ) o ON o.CasaID = c.CasaID
             WHERE c.CondominioID = @CondominioId AND c.bEliminado = 0;
            """;

        var p = new
        {
            Inicio = inicioPeriodo,
            Fin = finExclusive,
            InicioDate = fecha,
            CondominioId = condominioId,
        };

        await using var grid = await _db.QueryMultipleAsync(new CommandDefinition(sql, p, cancellationToken: ct));
        var abiertos = await grid.ReadSingleAsync<int>();
        var cerrados = await grid.ReadSingleAsync<int>();
        var tiempo = await grid.ReadSingleAsync<decimal>();
        var ingresos = await grid.ReadSingleAsync<decimal>();
        var egresos = await grid.ReadSingleAsync<decimal>();
        var morosos = await grid.ReadSingleAsync<int>();
        var ocup = await grid.ReadSingleAsync<(int Total, int Ocupadas)>();

        return new BiKpiCalculatedRow
        {
            TicketsAbiertos = abiertos,
            TicketsCerrados = cerrados,
            TiempoMedioResolucionHoras = tiempo,
            IngresosMXN = ingresos,
            EgresosMXN = egresos,
            ResidentesMorosos = morosos,
            CasasTotales = ocup.Total,
            CasasOcupadas = ocup.Ocupadas,
        };
    }

    public async Task<IReadOnlyList<int>> ListCondominioIdsAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT CondominioID FROM sgr.Condominios WITH (NOLOCK) WHERE bEliminado = 0 ORDER BY CondominioID;
            """;
        var ids = await _db.QueryAsync<int>(new CommandDefinition(sql, cancellationToken: ct));
        return ids.ToList();
    }

    public async Task<IReadOnlyList<FinanzasCuotaExportRow>> ListCuotasPagadasMesAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT c.CuotaID, u.NombreUsuario, c.Monto, c.FechaPago, c.MetodoPago
              FROM fnz.Cuotas c WITH (NOLOCK)
              INNER JOIN sgr.Usuarios u WITH (NOLOCK) ON u.UsuarioID = c.UsuarioID
              INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
             WHERE c.bEliminado = 0 AND c.Pagado = 1
               AND c.FechaPago >= @Inicio AND c.FechaPago < @Fin
             ORDER BY c.FechaPago;
            """;
        var rows = await _db.QueryAsync<FinanzasCuotaExportRow>(
            new CommandDefinition(sql, new { CondominioId = condominioId, Inicio = inicio, Fin = finExclusive }, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<FinanzasTransaccionExportRow>> ListTransaccionesMesAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT t.TransaccionID, c.Cuenta, u.NombreUsuario, tm.TipoMovimiento, t.Cargo, t.Abono, t.FechaCreacion
              FROM fnz.Transacciones t WITH (NOLOCK)
              INNER JOIN fnz.Cuentas c WITH (NOLOCK) ON c.CuentaID = t.CuentaID
              INNER JOIN sgr.Usuarios u WITH (NOLOCK) ON u.UsuarioID = t.UsuarioID
              INNER JOIN fnz.TiposMovimiento tm WITH (NOLOCK) ON tm.TipoMovimientoID = t.TipoMovimientoID
             WHERE t.bEliminado = 0
               AND t.FechaCreacion >= @Inicio AND t.FechaCreacion < @Fin
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = t.UsuarioID AND co.Vigente = 1 AND co.bEliminado = 0)
             ORDER BY t.FechaCreacion;
            """;
        var rows = await _db.QueryAsync<FinanzasTransaccionExportRow>(
            new CommandDefinition(sql, new { CondominioId = condominioId, Inicio = inicio, Fin = finExclusive }, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<TicketPeriodoExportRow>> ListTicketsPeriodoAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT v.TicketID, v.TituloTicket, v.NombreSolicitante, v.PrioridadTicket, v.EstadoTicket,
                   v.FechaCreacionTicket, v.FechaCierre
              FROM tkt.vsTickets v WITH (NOLOCK)
             WHERE v.bEliminado = 0
               AND v.FechaCreacionTicket >= @Inicio AND v.FechaCreacionTicket < @Fin
               AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = v.UsuarioSolicitanteID AND co.Vigente = 1 AND co.bEliminado = 0)
             ORDER BY v.FechaCreacionTicket DESC;
            """;
        var rows = await _db.QueryAsync<TicketPeriodoExportRow>(
            new CommandDefinition(sql, new { CondominioId = condominioId, Inicio = inicio, Fin = finExclusive }, cancellationToken: ct));
        return rows.ToList();
    }
}
