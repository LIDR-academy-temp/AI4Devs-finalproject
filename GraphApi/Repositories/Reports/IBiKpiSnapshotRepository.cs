using GraphApi.Models.Reports;

namespace GraphApi.Repositories.Reports;

public interface IBiKpiSnapshotRepository
{
    Task<bool> ExistsAsync(int condominioId, DateOnly fecha, CancellationToken ct = default);

    Task InsertAsync(int condominioId, DateOnly fecha, BiKpiCalculatedRow row, CancellationToken ct = default);

    Task<IReadOnlyList<BiKpiSnapshotDto>> ListTendenciasAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default);

    Task<BiKpiCalculatedRow> CalculateAsync(int condominioId, DateOnly fecha, CancellationToken ct = default);

    Task<IReadOnlyList<int>> ListCondominioIdsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<FinanzasCuotaExportRow>> ListCuotasPagadasMesAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default);

    Task<IReadOnlyList<FinanzasTransaccionExportRow>> ListTransaccionesMesAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default);

    Task<IReadOnlyList<TicketPeriodoExportRow>> ListTicketsPeriodoAsync(
        int condominioId,
        DateTime inicio,
        DateTime finExclusive,
        CancellationToken ct = default);
}
