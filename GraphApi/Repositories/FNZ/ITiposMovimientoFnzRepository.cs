namespace GraphApi.Repositories.FNZ;

public sealed class TipoMovimientoFnzRow
{
    public int TipoMovimientoId { get; set; }
    public string TipoMovimiento { get; set; } = "";
    public bool BCargo { get; set; }
    public bool BAbono { get; set; }
}

public interface ITiposMovimientoFnzRepository
{
    Task<bool> TablaDisponibleAsync(CancellationToken ct = default);

    Task<IReadOnlyList<TipoMovimientoFnzRow>> ListarAsync(CancellationToken ct = default);

    Task<TipoMovimientoFnzRow?> ObtenerAsync(int tipoMovimientoId, CancellationToken ct = default);

    Task<TipoMovimientoFnzRow?> ObtenerPorNombreAsync(string nombre, CancellationToken ct = default);

    Task<bool> ExisteNombreAsync(string nombre, int? excluirId, CancellationToken ct = default);

    Task<int> ContarTransaccionesAsync(int tipoMovimientoId, CancellationToken ct = default);

    Task<int> InsertarAsync(
        string nombre, bool bCargo, bool bAbono, string correo, int userId, CancellationToken ct = default);

    Task<bool> ActualizarAsync(
        int tipoMovimientoId, string nombre, bool bCargo, bool bAbono, string correo, int userId,
        CancellationToken ct = default);

    Task<bool> SoftDeleteAsync(int tipoMovimientoId, string correo, int userId, CancellationToken ct = default);
}
