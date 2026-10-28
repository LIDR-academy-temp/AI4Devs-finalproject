using System.Data;

namespace GraphApi.Repositories.FNZ;

public sealed class CasaCuotaElegible
{
    public int CasaId { get; set; }
    public int UsuarioId { get; set; }
}

public interface ICuotaGeneracionRepository
{
    Task<int> ContarCasasActivasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CasaCuotaElegible>> ListarCasasElegiblesAsync(CancellationToken ct = default);

    Task<bool> ExisteCuotaPeriodoAsync(int casaId, DateTime periodoInicio, IDbTransaction tx);

    Task<bool> CuentaExisteAsync(int cuentaId, CancellationToken ct = default);

    Task<bool> InsertarCuotaAsync(
        int casaId,
        int usuarioId,
        int? cuentaId,
        decimal monto,
        DateTime periodoInicio,
        DateTime periodoFin,
        DateTime fechaVencimiento,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx);
}
