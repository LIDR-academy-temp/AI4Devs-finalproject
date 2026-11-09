namespace GraphApi.Repositories.FNZ;

public sealed class TipoCuentaFnzRow
{
    public int TipoCuentaId { get; set; }
    public string Nombre { get; set; } = "";
    public string? Descripcion { get; set; }
}

public interface ITiposCuentaFnzRepository
{
    Task<bool> TablaDisponibleAsync(CancellationToken ct = default);

    Task<IReadOnlyList<TipoCuentaFnzRow>> ListarAsync(CancellationToken ct = default);

    Task<TipoCuentaFnzRow?> ObtenerAsync(int tipoCuentaId, CancellationToken ct = default);

    Task<bool> ExisteNombreAsync(string nombre, int? excluirId, CancellationToken ct = default);

    Task<int> InsertarAsync(string nombre, string? descripcion, string correo, int userId, CancellationToken ct = default);

    Task<bool> ActualizarAsync(int tipoCuentaId, string nombre, string? descripcion, string correo, int userId, CancellationToken ct = default);

    Task<bool> SoftDeleteAsync(int tipoCuentaId, string correo, int userId, CancellationToken ct = default);
}
