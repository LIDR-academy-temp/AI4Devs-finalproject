namespace GraphApi.Repositories.FNZ;

public interface IMorososRepository
{
    Task<IReadOnlyList<MorosoRow>> ListarMorososAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        CancellationToken ct = default);
}

public sealed class MorosoRow
{
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Casa { get; set; }
    public int CuotasVencidas { get; set; }
    public decimal TotalAdeudado { get; set; }
}
