using System.Data;

namespace GraphApi.Repositories.FNZ;

public sealed class CuotaPagoRow
{
    public int CuotaId { get; set; }
    public int UsuarioId { get; set; }
    public int? CuentaId { get; set; }
    public decimal Monto { get; set; }
    public decimal MontoMora { get; set; }
    public bool Pagado { get; set; }
    public DateTime PeriodoInicio { get; set; }
}

public interface ICuotaPagoRepository
{
    bool TieneColumnaCuentaId { get; }

    Task<CuotaPagoRow?> ObtenerConBloqueoAsync(int cuotaId, IDbTransaction tx);

    Task<int> MarcarPagadaAsync(
        int cuotaId,
        DateTime fechaPago,
        decimal montoPagado,
        string? metodoPago,
        string referenciaPago,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx);

    Task<int> InsertarTransaccionPagoAsync(
        int cuentaId,
        int usuarioId,
        decimal montoPagado,
        string motivo,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx);

    Task<int?> ObtenerPrimeraCuentaIdAsync(CancellationToken ct = default, IDbTransaction? tx = null);

    Task<int> AsignarCuentaCuotaAsync(int cuotaId, int cuentaId, IDbTransaction tx);
}
