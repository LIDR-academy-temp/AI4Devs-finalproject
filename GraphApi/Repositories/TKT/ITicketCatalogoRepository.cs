using System.Data;
using GraphApi.Models.TKT;

namespace GraphApi.Repositories.TKT;

public interface ITicketCatalogoRepository
{
    Task<int> ResolveEstadoIdAsync(string estado, IDbTransaction tx);

    Task<int?> ResolvePrioridadIdAsync(string prioridad, IDbTransaction tx);

    Task<int?> ResolveCategoriaIdAsync(string categoria, IDbTransaction tx);

    Task<int?> ResolveCanalIdAsync(string canal, IDbTransaction tx);

    Task<IReadOnlyList<CatalogoItemDto>> ListarCategoriasAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CatalogoItemDto>> ListarEstadosAsync(CancellationToken ct = default);

    Task<IReadOnlyList<PrioridadCatalogoItemDto>> ListarPrioridadesAsync(CancellationToken ct = default);

    Task<int> InsertCategoriaAsync(string nombre, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> UpdateCategoriaAsync(int id, string nombre, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> SoftDeleteCategoriaAsync(int id, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> ExistsTicketsConCategoriaAsync(int categoriaId, IDbTransaction? tx = null);

    Task<int> InsertPrioridadAsync(string nombre, int? orden, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> UpdatePrioridadAsync(int id, string nombre, int? orden, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> SoftDeletePrioridadAsync(int id, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> ExistsTicketsConPrioridadAsync(int prioridadId, IDbTransaction? tx = null);
}
