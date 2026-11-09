namespace GraphApi.Repositories.FNZ;

using System.Data;

public sealed class PeriodoCuotasGeneradoRow
{
    public DateTime PeriodoInicio { get; set; }
    public int CuotasGeneradas { get; set; }
    public int Casas { get; set; }
    public decimal MontoUnitario { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public DateTime GeneradoEn { get; set; }
    public string? CuentaNombre { get; set; }
}

public sealed class MovimientoFnzRow
{
    public int TransaccionId { get; set; }
    public int CuentaId { get; set; }
    public string CuentaNombre { get; set; } = "";
    public string TipoMovimiento { get; set; } = "";
    public decimal? Cargo { get; set; }
    public decimal? Abono { get; set; }
    public string? Motivo { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public interface ITransaccionesFnzRepository
{
    Task<IReadOnlyList<PeriodoCuotasGeneradoRow>> ListarPeriodosGeneradosAsync(CancellationToken ct = default);

    Task<IReadOnlyList<MovimientoFnzRow>> ListarMovimientosAdminAsync(int take, CancellationToken ct = default);

    Task<int> InsertarMovimientoAsync(
        int cuentaId,
        int usuarioId,
        int tipoMovimientoId,
        decimal? cargo,
        decimal? abono,
        string motivo,
        string correo,
        int creadoPorId,
        IDbTransaction tx);

    Task<bool> AjustarSaldoCuentaAsync(int cuentaId, decimal deltaSaldo, IDbTransaction tx);
}
