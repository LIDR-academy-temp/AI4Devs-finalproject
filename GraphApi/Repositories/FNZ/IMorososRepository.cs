namespace GraphApi.Repositories.FNZ;

public interface IMorososRepository
{
    bool TieneColumnaMontoMora { get; }

    Task<IReadOnlyList<MorosoRow>> ListarMorososAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        CancellationToken ct = default);

    Task<(int Actualizadas, int Omitidas)> AplicarMorasAsync(
        decimal montoMora,
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        IReadOnlyList<MorosoMorasTargetRow>? residentes,
        string modificadoCorreo,
        int modificadoPorId,
        CancellationToken ct = default);

    Task<int> CondonarMorasAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        IReadOnlyList<MorosoMorasTargetRow>? residentes,
        string modificadoCorreo,
        int modificadoPorId,
        CancellationToken ct = default);
}

public sealed class MorosoRow
{
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Casa { get; set; }
    public int? CasaId { get; set; }
    public int CuotasVencidas { get; set; }
    public int MorasAplicadas { get; set; }
    public decimal TotalMora { get; set; }
    public decimal TotalAdeudado { get; set; }
}

public sealed class MorosoMorasTargetRow
{
    public int UsuarioId { get; set; }
    public int? CasaId { get; set; }
}
