using System.Data;

namespace GraphApi.Repositories.TKT;

public interface ITicketCatalogoRepository
{
    Task<int> ResolveEstadoIdAsync(string estado, IDbTransaction tx);

    Task<int> ResolvePrioridadIdAsync(string prioridad, IDbTransaction tx);

    Task<int?> ResolveCategoriaIdAsync(string categoria, IDbTransaction tx);

    Task<int> ResolveCanalIdAsync(string canal, IDbTransaction tx);

    Task<IReadOnlyList<GraphApi.Models.TKT.CatalogoItemDto>> ListarCategoriasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<GraphApi.Models.TKT.CatalogoItemDto>> ListarEstadosAsync(CancellationToken ct = default);
}
