namespace GraphApi.Repositories.Dashboard;

public sealed class AdminKpiRaw
{
    public int TicketsNuevos { get; init; }
    public int TicketsEnSeguimiento { get; init; }
    public int MorososMes { get; init; }
    public decimal MontoCobrado { get; init; }
    public decimal MontoPendiente { get; init; }
    public int TotalCasas { get; init; }
    public int CasasOcupadas { get; init; }
    public IReadOnlyList<CanalCountRow> TicketsPorCanal { get; init; } = Array.Empty<CanalCountRow>();
}

public sealed class CanalCountRow
{
    public string Canal { get; init; } = "";
    public int Total { get; init; }
}

public sealed class ResidenteKpiRaw
{
    public int TicketsActivos { get; init; }
    public CuotaPeriodoRow? CuotaPeriodo { get; init; }
    public bool TieneCuotaVencida { get; init; }
    public int NotificacionesNoLeidas { get; init; }
}

public sealed class MontoMesRow
{
    public decimal MontoCobrado { get; init; }
    public decimal MontoPendiente { get; init; }
}

public sealed class CuotaPeriodoRow
{
    public decimal Monto { get; init; }
    public DateTime FechaVencimiento { get; init; }
    public bool Pagado { get; init; }
}

public interface IDashboardKpiRepository
{
    Task<AdminKpiRaw> LoadAdminAsync(
        DateTime hoyLocal,
        DateTime periodoInicio,
        DateTime periodoFin,
        int condominioId,
        CancellationToken ct = default);

    Task<ResidenteKpiRaw> LoadResidenteAsync(
        int usuarioId,
        DateTime hoyLocal,
        DateTime periodoInicio,
        DateTime periodoFin,
        CancellationToken ct = default);
}
