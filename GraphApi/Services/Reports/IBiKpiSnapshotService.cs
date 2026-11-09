using GraphApi.Models.Reports;

namespace GraphApi.Services.Reports;

public interface IBiKpiSnapshotService
{
    Task EnsureDailySnapshotsAsync(CancellationToken ct = default);

    Task EnsureSnapshotAsync(int condominioId, DateOnly fecha, CancellationToken ct = default);

    Task<IReadOnlyList<BiKpiSnapshotDto>> GetTendenciasAsync(int condominioId, int meses, CancellationToken ct = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportBiPdfAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportBiExcelAsync(
        int condominioId,
        int meses,
        CancellationToken ct = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportFinanzasMesAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportTicketsPeriodoAsync(
        int condominioId,
        int mes,
        int anio,
        string formato,
        CancellationToken ct = default);
}
