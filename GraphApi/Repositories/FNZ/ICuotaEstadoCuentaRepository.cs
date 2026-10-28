namespace GraphApi.Repositories.FNZ;

public sealed class CuotaEstadoCuentaRow
{
    public int CuotaId { get; set; }
    public int? CasaId { get; set; }
    public string? Direccion { get; set; }
    public string? Numero { get; set; }
    public int? CuentaId { get; set; }
    public string? Cuenta { get; set; }
    public decimal Monto { get; set; }
    public decimal MontoPagado { get; set; }
    public DateTime PeriodoInicio { get; set; }
    public DateTime PeriodoFin { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public bool Pagado { get; set; }
    public DateTime? FechaPago { get; set; }
    public string? MetodoPago { get; set; }
    public string? ReferenciaPago { get; set; }
}

public interface ICuotaEstadoCuentaRepository
{
    Task<IReadOnlyList<CuotaEstadoCuentaRow>> ListarPorUsuarioAsync(int usuarioId, CancellationToken ct = default);
}
