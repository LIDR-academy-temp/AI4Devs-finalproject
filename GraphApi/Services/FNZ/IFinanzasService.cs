using GraphApi.Models.FNZ;

namespace GraphApi.Services.FNZ;

public interface IFinanzasService
{
    Task<EstadoCuentaDto> ObtenerEstadoCuentaAsync(int usuarioId, CancellationToken ct = default);

    Task<(GenerarCuotasResultDto? Data, string? Code, int Status, string? Detail)> GenerarCuotasPeriodoAsync(
        GenerarCuotasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarPagoAsync(
        int cuotaId,
        RegistrarPagoRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<IReadOnlyList<MorosoDto>> ObtenerMorososAsync(
        int? mes,
        int? anio,
        CancellationToken ct = default);
}
