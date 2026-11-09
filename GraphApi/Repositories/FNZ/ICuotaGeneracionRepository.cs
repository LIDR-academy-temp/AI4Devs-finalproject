using System.Data;

namespace GraphApi.Repositories.FNZ;

public sealed class CasaCuotaElegible
{
    public int CasaId { get; set; }
    public int UsuarioId { get; set; }
}

public sealed class CuentaFnzCatalogoRow
{
    public int CuentaId { get; set; }
    public string Nombre { get; set; } = "";
}

public sealed class CuentaFnzAdminRow
{
    public int CuentaId { get; set; }
    public string Nombre { get; set; } = "";
    public string Tipo { get; set; } = "";
    public decimal Saldo { get; set; }
    public int? ResponsableUsuarioId { get; set; }
}

public interface ICuotaGeneracionRepository
{
    Task<int> ContarCasasActivasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CasaCuotaElegible>> ListarCasasElegiblesAsync(CancellationToken ct = default);

    Task<bool> ExisteCuotaPeriodoAsync(int casaId, DateTime periodoInicio, IDbTransaction tx);

    Task<bool> CuentaExisteAsync(int cuentaId, CancellationToken ct = default);

    Task<IReadOnlyList<CuentaFnzCatalogoRow>> ListarCuentasActivasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CuentaFnzAdminRow>> ListarCuentasAdminAsync(CancellationToken ct = default);

    Task<CuentaFnzAdminRow?> ObtenerCuentaAsync(int cuentaId, CancellationToken ct = default);

    Task<int> InsertarCuentaAsync(
        string nombre, string tipo, decimal saldo, int? responsableUsuarioId, string correo, int userId, CancellationToken ct = default);

    Task<bool> ActualizarCuentaAsync(
        int cuentaId, string nombre, string tipo, decimal saldo, int? responsableUsuarioId, string correo, int userId, CancellationToken ct = default);

    Task<bool> SoftDeleteCuentaAsync(int cuentaId, string correo, int userId, CancellationToken ct = default);

    Task<int> ContarCuentasPorTipoAsync(string tipo, CancellationToken ct = default);

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
