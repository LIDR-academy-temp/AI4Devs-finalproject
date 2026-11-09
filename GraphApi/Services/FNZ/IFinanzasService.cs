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

    Task<IReadOnlyList<CuentaFnzCatalogoDto>> ListarCuentasCatalogoAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CuentaFnzAdminDto>> ListarCuentasAdminAsync(CancellationToken ct = default);

    Task<(CuentaFnzAdminDto? Data, string? Code, int Status, string? Detail)> CrearCuentaAdminAsync(
        CuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(CuentaFnzAdminDto? Data, string? Code, int Status, string? Detail)> ActualizarCuentaAdminAsync(
        int cuentaId, CuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCuentaAdminAsync(
        int cuentaId, string correo, int userId, CancellationToken ct = default);

    Task<IReadOnlyList<TipoCuentaFnzDto>> ListarTiposCuentaAdminAsync(CancellationToken ct = default);

    Task<(TipoCuentaFnzDto? Data, string? Code, int Status, string? Detail)> CrearTipoCuentaAdminAsync(
        TipoCuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(TipoCuentaFnzDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoCuentaAdminAsync(
        int tipoCuentaId, TipoCuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoCuentaAdminAsync(
        int tipoCuentaId, string correo, int userId, CancellationToken ct = default);

    Task<IReadOnlyList<TipoMovimientoFnzDto>> ListarTiposMovimientoAdminAsync(CancellationToken ct = default);

    Task<(TipoMovimientoFnzDto? Data, string? Code, int Status, string? Detail)> CrearTipoMovimientoAdminAsync(
        TipoMovimientoFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(TipoMovimientoFnzDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoMovimientoAdminAsync(
        int tipoMovimientoId, TipoMovimientoFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoMovimientoAdminAsync(
        int tipoMovimientoId, string correo, int userId, CancellationToken ct = default);

    Task<IReadOnlyList<PeriodoCuotasGeneradoDto>> ListarPeriodosGeneradosAdminAsync(CancellationToken ct = default);

    Task<IReadOnlyList<MovimientoFnzDto>> ListarMovimientosAdminAsync(CancellationToken ct = default);

    Task<(MovimientoFnzDto? Data, string? Code, int Status, string? Detail)> RegistrarMovimientoAdminAsync(
        RegistrarMovimientoFnzRequest request, int adminId, string adminCorreo, CancellationToken ct = default);

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

    Task<(MorasBatchResultDto? Data, string? Code, int Status, string? Detail)> AplicarMorasMorososAsync(
        AplicarMorasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(MorasBatchResultDto? Data, string? Code, int Status, string? Detail)> CondonarMorasMorososAsync(
        CondonarMorasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);
}
