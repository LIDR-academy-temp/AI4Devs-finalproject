using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;

namespace GraphApi.Services.TKT;

public sealed class CuartaTicketQueryService : ICuartaTicketQueryService
{
    private readonly ICuartaTicketQueryRepository _query;
    private readonly ITicketCatalogoRepository _catalogos;

    public CuartaTicketQueryService(ICuartaTicketQueryRepository query, ITicketCatalogoRepository catalogos)
    {
        _query = query;
        _catalogos = catalogos;
    }

    public Task<PaginaDto<MiTicketItemDto>> GetMisTicketsAsync(
        int usuarioId,
        TicketFiltroDto filtro,
        CancellationToken ct = default) =>
        _query.GetMisTicketsAsync(usuarioId, filtro, ct);

    public Task<IReadOnlyList<CatalogoItemDto>> ListarCategoriasAsync(CancellationToken ct = default) =>
        _catalogos.ListarCategoriasAsync(ct);

    public Task<IReadOnlyList<CatalogoItemDto>> ListarEstadosAsync(CancellationToken ct = default) =>
        _catalogos.ListarEstadosAsync(ct);
}
